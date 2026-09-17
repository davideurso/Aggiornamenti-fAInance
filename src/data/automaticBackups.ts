import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { fbDb } from "../firebase/client";
import { fainanceCompressAccountDataV5 } from "./accountCloudCodec";
import { writeTechnicalLog } from "../observability/technicalLogs";

const BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MAX_BACKUPS = 12;
const MAX_FIRESTORE_PAYLOAD_BYTES = 850_000;

function backupMarker(uid: string): string { return `fainance_auto_backup_last_at_${uid}`; }

export interface AutomaticBackupInput {
  uid: string;
  snapshot: unknown;
  reason: string;
  appVersion?: string;
  force?: boolean;
}

async function pruneOldBackups(uid: string): Promise<void> {
  const base = collection(fbDb, "users", uid, "backups");
  const snap = await getDocs(query(base, orderBy("createdAtMs", "desc"), limit(30)));
  const rows = snap.docs;
  if (rows.length <= MAX_BACKUPS) return;
  await Promise.all(rows.slice(MAX_BACKUPS).flatMap((row) => [
    deleteDoc(row.ref).catch(() => undefined),
    deleteDoc(doc(fbDb, "accountBackupMetadata", row.id)).catch(() => undefined),
  ]));
}

export async function createAutomaticAccountBackup(input: AutomaticBackupInput): Promise<boolean> {
  const uid = String(input.uid || "");
  if (!uid) return false;
  const now = Date.now();
  try {
    const last = Number(localStorage.getItem(backupMarker(uid)) || 0);
    if (!input.force && last && now - last < BACKUP_INTERVAL_MS) return false;
  } catch {}

  try {
    const compressed = await fainanceCompressAccountDataV5({
      schema: 1,
      uid,
      reason: String(input.reason || "automatic"),
      snapshot: input.snapshot,
      savedAt: new Date(now).toISOString(),
    });
    if (Number(compressed.compressedBytes || 0) > MAX_FIRESTORE_PAYLOAD_BYTES) {
      await writeTechnicalLog({
        category: "BACKUP_ERROR",
        operation: "automatic-backup",
        result: "failure",
        severity: "warning",
        errorCode: "BACKUP_TOO_LARGE",
        metadata: { compressedBytes: Number(compressed.compressedBytes || 0) },
      }).catch(() => undefined);
      return false;
    }

    const id = `b_${now}_${Math.random().toString(36).slice(2, 8)}`;
    const payloadRef = doc(fbDb, "users", uid, "backups", id);
    const metadataRef = doc(fbDb, "accountBackupMetadata", id);
    const createdAtIso = new Date(now).toISOString();
    await setDoc(payloadRef, {
      id,
      uid,
      schemaVersion: 1,
      encoding: compressed.encoding,
      payload: compressed.value,
      rawBytes: Number(compressed.rawBytes || 0),
      compressedBytes: Number(compressed.compressedBytes || 0),
      reason: String(input.reason || "automatic"),
      appVersion: String(input.appVersion || "2.0 Test"),
      createdAtIso,
      createdAtMs: now,
      createdAt: serverTimestamp(),
    });
    await setDoc(metadataRef, {
      id,
      uid,
      reason: String(input.reason || "automatic"),
      appVersion: String(input.appVersion || "2.0 Test"),
      rawBytes: Number(compressed.rawBytes || 0),
      compressedBytes: Number(compressed.compressedBytes || 0),
      createdAtIso,
      createdAtMs: now,
      createdAt: serverTimestamp(),
    });
    try { localStorage.setItem(backupMarker(uid), String(now)); } catch {}
    pruneOldBackups(uid).catch(() => undefined);
    writeTechnicalLog({
      category: "BACKUP_CREATED",
      operation: "automatic-backup",
      metadata: { reason: String(input.reason || "automatic"), compressedBytes: Number(compressed.compressedBytes || 0) },
    }).catch(() => undefined);
    return true;
  } catch (error: any) {
    writeTechnicalLog({
      category: "BACKUP_ERROR",
      operation: "automatic-backup",
      result: "failure",
      severity: "error",
      errorCode: String(error?.code || error?.message || "BACKUP_ERROR").slice(0, 120),
    }).catch(() => undefined);
    return false;
  }
}
