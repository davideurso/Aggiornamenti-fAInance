import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { fbAuth, fbDb } from "../firebase/client";
import { currentFainanceDeviceId } from "../security/deviceSessions";

export type TechnicalLogCategory =
  | "AUTH_SUCCESS"
  | "AUTH_FAILURE"
  | "SYNC_ERROR"
  | "RESTORE_VERSION"
  | "RESTORE_TRASH"
  | "PLAN_CHANGED"
  | "ADMIN_ACTION"
  | "AI_FAILURE"
  | "UPLOAD_ERROR"
  | "DOWNLOAD_ERROR"
  | "BACKUP_CREATED"
  | "BACKUP_ERROR";

export interface TechnicalLogInput {
  category: TechnicalLogCategory;
  operation: string;
  result?: "success" | "failure" | "warning";
  severity?: "info" | "warning" | "error";
  errorCode?: string;
  metadata?: Record<string, unknown>;
  appVersion?: string;
}

const PREAUTH_QUEUE_KEY = "fainance_technical_logs_preauth_v1";

function safeScalar(value: unknown): string | number | boolean | null {
  if (value == null) return null;
  if (typeof value === "boolean" || typeof value === "number") return value;
  return String(value).slice(0, 300);
}

function sanitizeMetadata(input: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.entries(input || {}).slice(0, 20).forEach(([key, value]) => {
    const cleanKey = String(key || "").slice(0, 60);
    if (!cleanKey || /password|token|secret|authorization|credential/i.test(cleanKey)) return;
    if (Array.isArray(value)) out[cleanKey] = value.slice(0, 10).map(safeScalar);
    else if (value && typeof value === "object") out[cleanKey] = "[object]";
    else out[cleanKey] = safeScalar(value);
  });
  return out;
}

function environmentName(): string {
  try {
    const projectId = String((fbDb as any)?.app?.options?.projectId || "");
    return /test/i.test(projectId) ? "test" : "production";
  } catch {
    return "unknown";
  }
}

export async function writeTechnicalLog(input: TechnicalLogInput): Promise<void> {
  const user = fbAuth.currentUser;
  if (!user?.uid) return;
  const now = new Date().toISOString();
  await addDoc(collection(fbDb, "technicalLogs"), {
    uid: user.uid,
    deviceId: currentFainanceDeviceId(),
    category: input.category,
    operation: String(input.operation || "unknown").slice(0, 100),
    result: input.result || (input.severity === "error" ? "failure" : "success"),
    severity: input.severity || "info",
    errorCode: String(input.errorCode || "").slice(0, 120),
    metadata: sanitizeMetadata(input.metadata),
    appVersion: String(input.appVersion || "2.0 Test").slice(0, 60),
    environment: environmentName(),
    createdAtIso: now,
    createdAtMs: Date.now(),
    createdAt: serverTimestamp(),
  });
}

export function queuePreAuthTechnicalLog(input: Omit<TechnicalLogInput, "category"> & { category: "AUTH_FAILURE" }): void {
  try {
    const previous = JSON.parse(localStorage.getItem(PREAUTH_QUEUE_KEY) || "[]");
    const next = (Array.isArray(previous) ? previous : []).slice(-9);
    next.push({
      category: "AUTH_FAILURE",
      operation: String(input.operation || "login").slice(0, 100),
      result: "failure",
      severity: "warning",
      errorCode: String(input.errorCode || "").slice(0, 120),
      metadata: sanitizeMetadata(input.metadata),
      queuedAt: new Date().toISOString(),
    });
    localStorage.setItem(PREAUTH_QUEUE_KEY, JSON.stringify(next));
  } catch {
    // best effort only
  }
}

export async function flushQueuedPreAuthTechnicalLogs(): Promise<void> {
  if (!fbAuth.currentUser?.uid) return;
  let rows: any[] = [];
  try {
    rows = JSON.parse(localStorage.getItem(PREAUTH_QUEUE_KEY) || "[]");
    if (!Array.isArray(rows) || !rows.length) return;
  } catch {
    return;
  }
  let completed = 0;
  for (const row of rows.slice(-10)) {
    try {
      await writeTechnicalLog({
        category: "AUTH_FAILURE",
        operation: String(row.operation || "login"),
        result: "failure",
        severity: "warning",
        errorCode: String(row.errorCode || ""),
        metadata: { ...(row.metadata || {}), queuedAt: row.queuedAt || "" },
      });
      completed += 1;
    } catch {
      break;
    }
  }
  if (completed === rows.slice(-10).length) {
    try { localStorage.removeItem(PREAUTH_QUEUE_KEY); } catch {}
  }
}
