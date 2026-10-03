import { collection, deleteDoc, doc, getDocFromServer, getDocs, getDocsFromServer, limit, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { fbDb } from "../firebase/client";
import { fainanceCompressAccountDataV5, fainanceExpandAccountCloudDataV5 } from "./accountCloudCodec";
import { writeTechnicalLog } from "../observability/technicalLogs";

const BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MAX_BACKUPS = 12;
const MAX_FIRESTORE_PAYLOAD_BYTES = 850_000;
const USER_STATE_AUTHORITY_V6_REASON = "user-state-authority-v6";

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
  const snap = await getDocs(query(base, orderBy("createdAtMs", "desc"), limit(40)));
  const rows = snap.docs;
  const authorityRows = rows.filter((row) => String((row.data() || {}).reason || "") === USER_STATE_AUTHORITY_V6_REASON);
  const regularRows = rows.filter((row) => String((row.data() || {}).reason || "") !== USER_STATE_AUTHORITY_V6_REASON);
  const toDelete = authorityRows.slice(2).concat(regularRows.slice(MAX_BACKUPS));
  if (!toDelete.length) return;
  await Promise.all(toDelete.flatMap((row) => [
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

export interface UserStateAuthorityBackupV6Input {
  uid: string;
  authority: any;
  appVersion?: string;
}

async function decodeBackupSnapshot(row: any): Promise<any | null> {
  try {
    const data = row && typeof row === "object" ? row : {};
    if (String(data.encoding || "") !== "gzip-base64-json-v1") return null;
    if (!data.payload) return null;
    const expanded: any = await fainanceExpandAccountCloudDataV5({
      accountDataCompressedV5: String(data.payload || ""),
      accountDataCompressionV5: String(data.encoding || ""),
    });
    const snapshot =
      expanded && expanded.snapshot && typeof expanded.snapshot === "object"
        ? expanded.snapshot
        : null;
    return snapshot;
  } catch {
    return null;
  }
}

export async function saveUserStateAuthorityBackupV6(
  input: UserStateAuthorityBackupV6Input
): Promise<{ id: string; authority: any; createdAtMs: number }> {
  const uid = String(input.uid || "");
  if (!uid) throw new Error("USER_STATE_AUTHORITY_V6_UID_MISSING");
  const authority =
    input.authority && typeof input.authority === "object"
      ? input.authority
      : null;
  if (!authority) throw new Error("USER_STATE_AUTHORITY_V6_INVALID");

  const now = Date.now();
  const reason = USER_STATE_AUTHORITY_V6_REASON;
  const compressed = await fainanceCompressAccountDataV5({
    schema: 1,
    uid,
    reason,
    snapshot: authority,
    savedAt: new Date(now).toISOString(),
  });
  if (Number(compressed.compressedBytes || 0) > MAX_FIRESTORE_PAYLOAD_BYTES) {
    throw new Error("USER_STATE_AUTHORITY_V6_TOO_LARGE");
  }

  const id = `usa6_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const payloadRef = doc(fbDb, "users", uid, "backups", id);
  const metadataRef = doc(fbDb, "accountBackupMetadata", id);
  const createdAtIso = new Date(now).toISOString();

  // IMPORTANT: exact same Firestore document shape as the already verified
  // automatic backup flow. This avoids depending on new top-level fields or
  // custom backup document schemas that existing rules may reject.
  await setDoc(payloadRef, {
    id,
    uid,
    schemaVersion: 1,
    encoding: compressed.encoding,
    payload: compressed.value,
    rawBytes: Number(compressed.rawBytes || 0),
    compressedBytes: Number(compressed.compressedBytes || 0),
    reason,
    appVersion: String(input.appVersion || "2.1.7"),
    createdAtIso,
    createdAtMs: now,
    createdAt: serverTimestamp(),
  });

  // Metadata is useful for diagnostics/admin but must never make the user-state
  // write fail after the private payload has already been acknowledged.
  await setDoc(metadataRef, {
    id,
    uid,
    reason,
    appVersion: String(input.appVersion || "2.1.7"),
    rawBytes: Number(compressed.rawBytes || 0),
    compressedBytes: Number(compressed.compressedBytes || 0),
    createdAtIso,
    createdAtMs: now,
    createdAt: serverTimestamp(),
  }).catch(() => undefined);

  pruneOldBackups(uid).catch(() => undefined);
  return { id, authority, createdAtMs: now };
}

export async function readUserStateAuthorityBackupV6ById(
  uid: string,
  backupId: string
): Promise<any | null> {
  const safeUid = String(uid || "");
  const safeId = String(backupId || "");
  if (!safeUid || !safeId) return null;
  const snap = await getDocFromServer(doc(fbDb, "users", safeUid, "backups", safeId));
  if (!snap.exists()) return null;
  const row: any = snap.data() || {};
  if (String(row.uid || "") !== safeUid) return null;
  if (String(row.reason || "") !== USER_STATE_AUTHORITY_V6_REASON) return null;
  return await decodeBackupSnapshot(row);
}

export async function readLatestUserStateAuthorityBackupV6(
  uid: string,
  preferServer = true
): Promise<{ id: string; authority: any; createdAtMs: number } | null> {
  const safeUid = String(uid || "");
  if (!safeUid) return null;
  const q = query(
    collection(fbDb, "users", safeUid, "backups"),
    orderBy("createdAtMs", "desc"),
    limit(24)
  );
  let snap: any;
  try {
    snap = preferServer ? await getDocsFromServer(q) : await getDocs(q);
  } catch (error) {
    if (!preferServer) throw error;
    snap = await getDocs(q);
  }

  for (const row of snap.docs || []) {
    const data: any = row.data ? row.data() : {};
    if (String(data.reason || "") !== USER_STATE_AUTHORITY_V6_REASON) continue;
    const authority = await decodeBackupSnapshot(data);
    if (!authority) continue;
    return {
      id: String(row.id || data.id || ""),
      authority,
      createdAtMs: Number(data.createdAtMs || 0),
    };
  }
  return null;
}
