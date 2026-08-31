import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import { adminDb } from "./firebase";
import type { AdminAuditEntry, AdminUserMetadata, BackupMetadataEntry, PublicAppConfig, TechnicalLogEntry } from "./types";

const USERS = "adminUserMetadata";
const CONFIG = "systemConfig";
const AUDIT = "adminAudit";
const PROFILES = "users";
const USERNAMES = "usernames";

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 24;

async function writeAdminTechnicalLog(actorUid: string, action: string, metadata: Record<string, unknown> = {}): Promise<void> {
  const ref = doc(collection(adminDb, "technicalLogs"));
  await setDoc(ref, {
    uid: actorUid,
    deviceId: "admin-web",
    category: "ADMIN_ACTION",
    operation: action,
    result: "success",
    severity: "info",
    errorCode: "",
    environment: "admin",
    appVersion: "fAInance Admin",
    metadata,
    createdAtIso: new Date().toISOString(),
    createdAtMs: Date.now(),
    createdAt: serverTimestamp(),
  });
}

function normalizeUsername(value: unknown): string {
  return String(value ?? "").trim();
}

function usernameLookupKey(value: unknown): string {
  return normalizeUsername(value).toLocaleLowerCase("en-US");
}

export function validateAdminUsername(value: unknown): string | null {
  const username = normalizeUsername(value);
  if (username.length < USERNAME_MIN_LENGTH) return "USERNAME_TOO_SHORT";
  if (username.length > USERNAME_MAX_LENGTH) return "USERNAME_TOO_LONG";
  if (!/^[A-Za-z0-9._-]+$/.test(username)) return "USERNAME_INVALID_CHARACTERS";
  if (!/[A-Za-z0-9]/.test(username)) return "USERNAME_INVALID";
  return null;
}

export async function listRecentUsers(maxResults = 500): Promise<AdminUserMetadata[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.trunc(maxResults)));
  const q = query(collection(adminDb, USERS), orderBy("lastSeenAt", "desc"), limit(safeLimit));
  const snap = await getDocs(q);
  return snap.docs.map((item) => ({ uid: item.id, ...item.data() } as AdminUserMetadata));
}

export async function readPublicConfig(): Promise<PublicAppConfig> {
  const snap = await getDoc(doc(adminDb, CONFIG, "public"));
  return snap.exists() ? (snap.data() as PublicAppConfig) : {};
}

export async function assignUsernameToUser(
  user: AdminUserMetadata,
  rawUsername: string,
  actorUid: string,
  actorEmail: string
): Promise<AdminUserMetadata> {
  const validation = validateAdminUsername(rawUsername);
  if (validation) throw new Error(validation);

  const username = normalizeUsername(rawUsername);
  const usernameLower = usernameLookupKey(username);
  const previousLower = usernameLookupKey(user.usernameLower || user.username || "");
  const nowIso = new Date().toISOString();

  await runTransaction(adminDb, async (transaction) => {
    const newUsernameRef = doc(adminDb, USERNAMES, usernameLower);
    const newUsernameSnap = await transaction.get(newUsernameRef);

    if (newUsernameSnap.exists()) {
      const ownerUid = String(newUsernameSnap.data().uid || "");
      if (ownerUid && ownerUid !== user.uid) {
        throw new Error("USERNAME_TAKEN");
      }
    }

    if (previousLower && previousLower !== usernameLower) {
      const previousRef = doc(adminDb, USERNAMES, previousLower);
      const previousSnap = await transaction.get(previousRef);
      if (previousSnap.exists() && String(previousSnap.data().uid || "") === user.uid) {
        transaction.delete(previousRef);
      }
    }

    transaction.set(newUsernameRef, {
      uid: user.uid,
      username,
      usernameLower,
      assignedBy: actorUid,
      updatedAt: serverTimestamp()
    }, { merge: true });

    transaction.set(doc(adminDb, PROFILES, user.uid), {
      username,
      usernameLower,
      updatedAt: nowIso
    }, { merge: true });

    transaction.set(doc(adminDb, USERS, user.uid), {
      username,
      usernameLower,
      profileUpdatedAt: serverTimestamp(),
      indexedAt: serverTimestamp()
    }, { merge: true });
  });

  const auditRef = doc(collection(adminDb, AUDIT));
  await setDoc(auditRef, {
    actorUid,
    actorEmail,
    action: "user.username.update",
    targetType: "user",
    targetId: user.uid,
    createdAt: serverTimestamp(),
    metadata: {
      previousUsername: user.username || null,
      username,
      usernameLower
    }
  });
  await writeAdminTechnicalLog(actorUid, "user.username.update", { targetUid: user.uid, usernameLower });

  return {
    ...user,
    username,
    usernameLower,
    profileUpdatedAt: new Date()
  };
}

export async function savePublicConfig(
  patch: PublicAppConfig,
  actorUid: string,
  actorEmail: string
): Promise<void> {
  await setDoc(
    doc(adminDb, CONFIG, "public"),
    { ...patch, updatedAt: new Date().toISOString(), updatedBy: actorUid },
    { merge: true }
  );

  const auditRef = doc(collection(adminDb, AUDIT));
  await setDoc(auditRef, {
    actorUid,
    actorEmail,
    action: "systemConfig.update",
    targetType: "systemConfig",
    targetId: "public",
    createdAt: serverTimestamp(),
    metadata: { keys: Object.keys(patch) }
  });

  await writeAdminTechnicalLog(actorUid, "systemConfig.update", { keys: Object.keys(patch) });
}

export async function publishImportantCommunication(
  input: { title: string; message: string; severity: string; targetPlan: string; environment: string },
  actorUid: string,
  actorEmail: string
): Promise<string> {
  const title = String(input.title || "").trim().slice(0, 120);
  const message = String(input.message || "").trim().slice(0, 1200);
  if (!title || !message) throw new Error("Titolo e messaggio sono obbligatori.");
  if (input.environment !== "test") throw new Error("Le comunicazioni di questo pacchetto sono abilitate solo in Test.");
  const ref = doc(collection(adminDb, "adminCommunications"));
  await setDoc(ref, {
    title,
    message,
    severity: ["info", "success", "warning", "critical"].includes(input.severity) ? input.severity : "info",
    targetPlan: ["all", "free", "base", "premium"].includes(input.targetPlan) ? input.targetPlan : "all",
    environment: "test",
    status: "published",
    deliveryStatus: "queued",
    createdBy: actorUid,
    createdByEmail: actorEmail,
    createdAtIso: new Date().toISOString(),
    createdAtMs: Date.now(),
    createdAt: serverTimestamp(),
  });
  const auditRef = doc(collection(adminDb, AUDIT));
  await setDoc(auditRef, {
    actorUid,
    actorEmail,
    action: "communication.publish",
    targetType: "adminCommunication",
    targetId: ref.id,
    createdAt: serverTimestamp(),
    metadata: { severity: input.severity, targetPlan: input.targetPlan, environment: "test" },
  });
  await writeAdminTechnicalLog(actorUid, "communication.publish", { communicationId: ref.id, targetPlan: input.targetPlan });
  return ref.id;
}

export async function listRecentAudit(maxResults = 100): Promise<AdminAuditEntry[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.trunc(maxResults)));
  const q = query(collection(adminDb, AUDIT), orderBy("createdAt", "desc"), limit(safeLimit));
  const snap = await getDocs(q);
  return snap.docs.map((item) => ({ id: item.id, ...item.data() } as AdminAuditEntry));
}


export async function listRecentTechnicalLogs(maxResults = 250): Promise<TechnicalLogEntry[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.trunc(maxResults)));
  const q = query(collection(adminDb, "technicalLogs"), orderBy("createdAtMs", "desc"), limit(safeLimit));
  const snap = await getDocs(q);
  return snap.docs.map((item) => ({ id: item.id, ...item.data() } as TechnicalLogEntry));
}

export async function listRecentBackupMetadata(maxResults = 250): Promise<BackupMetadataEntry[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.trunc(maxResults)));
  const q = query(collection(adminDb, "accountBackupMetadata"), orderBy("createdAtMs", "desc"), limit(safeLimit));
  const snap = await getDocs(q);
  return snap.docs.map((item) => ({ id: item.id, ...item.data() } as BackupMetadataEntry));
}
