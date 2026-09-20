import {
  collection,
  doc,
  getDocFromCache,
  getDocFromServer,
  getDocsFromServer,
  onSnapshot,
  setDoc,
  waitForPendingWrites,
  type Unsubscribe,
} from "firebase/firestore";
import { Preferences } from "@capacitor/preferences";
import { fbDb } from "../firebase/client";
import { fainanceExpandAccountCloudDataV5 } from "./accountCloudCodec";
import {
  isExplicitSyncTombstone,
  syncRecordTime,
  syncTombstoneTime,
} from "./syncAlgorithms";
import {
  buildMovementDiffV2,
  ensureStableMovementIds,
  movementRawId,
  movementRecordId,
  type MovementKind,
} from "./movementSyncCleanPolicy";

export type { MovementKind } from "./movementSyncCleanPolicy";

export type MovementRecordV2 = {
  schemaVersion: 2;
  uid: string;
  kind: MovementKind;
  recordId: string;
  deleted: boolean;
  payload: any | null;
  updatedAtMs: number;
  deletedAtMs: number;
  mutationId: string;
};

export type MovementWatchMeta = {
  fromCache: boolean;
  hasPendingWrites: boolean;
};

export type MovementSyncV2Status = {
  active: boolean;
  reason: string;
};

export type MigrationProgress = {
  done: number;
  total: number;
};

const COLLECTION = "movementsV2";
const META_DOC = "movementsV2Clean";
const LOCAL_ACTIVE_PREFIX = "fainance_movements_v2_clean_active_";

function localActiveKey(uid: string): string {
  return `${LOCAL_ACTIVE_PREFIX}${uid}`;
}

export function isMovementSyncV2LocallyActive(uid: string): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(localActiveKey(uid)) === "1";
  } catch (_error) {
    return false;
  }
}

async function isMovementSyncV2DeviceAcknowledged(uid: string): Promise<boolean> {
  if (isMovementSyncV2LocallyActive(uid)) return true;
  try {
    const result = await Preferences.get({ key: localActiveKey(uid) });
    return result.value === "1";
  } catch (_error) {
    return false;
  }
}

async function saveLocalActiveMarker(uid: string): Promise<void> {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(localActiveKey(uid), "1");
  } catch (_error) {}
  try {
    await Preferences.set({ key: localActiveKey(uid), value: "1" });
  } catch (_error) {}
}

export async function acknowledgeMovementSyncV2Device(uidValue: string): Promise<void> {
  const uid = String(uidValue || "").trim();
  if (uid) await saveLocalActiveMarker(uid);
}

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (_error) {}
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function hash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function docId(kind: MovementKind, recordId: string): string {
  const readable = encodeURIComponent(recordId)
    .replace(/%/g, "_")
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .slice(0, 120);
  return `${kind}_${readable}_${hash(recordId)}`;
}

function movementCollection(uid: string) {
  return collection(fbDb, "users", uid, COLLECTION);
}

function movementRef(uid: string, kind: MovementKind, recordId: string) {
  return doc(movementCollection(uid), docId(kind, recordId));
}

function metaRef(uid: string) {
  return doc(fbDb, "users", uid, "syncMeta", META_DOC);
}

export function ensureMovementIds(kind: MovementKind, value: any[]): any[] {
  return ensureStableMovementIds(kind, value);
}

function markerState(snapshot: any): string {
  if (!snapshot || !snapshot.exists || !snapshot.exists()) return "";
  const data: any = snapshot.data() || {};
  if (Number(data.schemaVersion || 0) < 2) return "";
  return String(data.state || "");
}

export async function movementSyncV2AccountStatus(
  uidValue: string,
  localExpenses: any[],
  localIncomes: any[],
  localTombstones?: any,
): Promise<MovementSyncV2Status> {
  const uid = String(uidValue || "").trim();
  if (!uid) return { active: false, reason: "no-user" };

  const deviceAcknowledged = await isMovementSyncV2DeviceAcknowledged(uid);

  // The local marker is only an offline activation aid. While online, the cloud
  // marker remains authoritative and tells us whether this account was clean or
  // migrated. Earlier builds returned immediately on the local marker, which
  // made migrated accounts appear as "account Test pulito".
  const cachedMarker = await getDocFromCache(metaRef(uid)).catch(() => null as any);
  let state = markerState(cachedMarker);
  try {
    const serverMarker = await getDocFromServer(metaRef(uid));
    const serverState = markerState(serverMarker);
    if (serverState) state = serverState;
  } catch (_error) {
    // Offline/unavailable: keep the cached state, then fall back to the
    // account-scoped device acknowledgement below.
  }

  if (state === "enabled-clean" || state === "enabled-migrated") {
    const hasLegacyLocal = (localExpenses || []).length > 0 || (localIncomes || []).length > 0;
    if (state === "enabled-migrated" && hasLegacyLocal && !deviceAcknowledged) {
      try {
        const alreadyRepresented = await legacySnapshotAlreadyRepresentedOnServerV2(
          uid,
          localExpenses || [],
          localIncomes || [],
          localTombstones,
        );
        if (!alreadyRepresented) return { active: false, reason: "device-catchup-required" };
      } catch (_error) {
        return { active: false, reason: "status-check-unavailable" };
      }
    }
    await saveLocalActiveMarker(uid);
    return {
      active: true,
      reason: state === "enabled-migrated"
        ? "migrated"
        : "clean",
    };
  }

  // If this exact UID was already acknowledged on this device, keep Sync V2
  // active while offline, but do not pretend it is a clean account. The next
  // online check will recover the authoritative cloud state/reason.
  if (deviceAcknowledged) {
    return { active: true, reason: "local-marker-offline" };
  }

  if (state === "migrating") {
    // A previous app session may have already copied every legacy movement and
    // been closed before it could write the final marker. Confirm the server
    // state first: if everything is already represented, finish the cutover
    // immediately instead of starting another full migration pass.
    try {
      const alreadyRepresented = await legacySnapshotAlreadyRepresentedOnServerV2(
        uid,
        localExpenses || [],
        localIncomes || [],
        localTombstones,
      );
      if (alreadyRepresented) {
        await completeMovementSyncV2Migration(uid);
        return { active: true, reason: "migrated-server-confirmed" };
      }
    } catch (_error) {
      return { active: false, reason: "status-check-unavailable" };
    }
    return { active: false, reason: "migration-running" };
  }

  // Existing local movements mean this is a legacy account. Do not block the
  // app: it stays on the old path while the background migrator is prepared.
  if ((localExpenses || []).length || (localIncomes || []).length) {
    return { active: false, reason: "legacy-migration-required" };
  }

  const legacySnap = await getDocFromServer(doc(fbDb, "userData", uid)).catch(() => null as any);
  if (!legacySnap) return { active: false, reason: "status-check-unavailable" };
  if (legacySnap.exists()) {
    const expanded: any = await fainanceExpandAccountCloudDataV5(legacySnap.data() || {});
    if ((expanded.expenses || []).length || (expanded.incomes || []).length) {
      return { active: false, reason: "legacy-migration-required" };
    }
  }

  const now = Date.now();
  await setDoc(
    metaRef(uid),
    {
      schemaVersion: 2,
      state: "enabled-clean",
      enabledAtMs: now,
      enabledAt: new Date(now).toISOString(),
    },
    { merge: true },
  );
  await waitForPendingWrites(fbDb);
  await saveLocalActiveMarker(uid);
  return { active: true, reason: "new-clean-account" };
}

// Kept for backwards compatibility with earlier clean-only builds.
export const cleanMovementSyncV2Status = movementSyncV2AccountStatus;

function normalizeRecord(raw: any): MovementRecordV2 | null {
  if (!raw || typeof raw !== "object") return null;
  const uid = String(raw.uid || "");
  const kind: MovementKind = raw.kind === "income" ? "income" : "expense";
  const recordId = String(raw.recordId || "");
  if (!uid || !recordId) return null;
  return {
    schemaVersion: 2,
    uid,
    kind,
    recordId,
    deleted: raw.deleted === true,
    payload: raw.deleted === true ? null : raw.payload,
    updatedAtMs: Number(raw.updatedAtMs || 0),
    deletedAtMs: Number(raw.deletedAtMs || 0),
    mutationId: String(raw.mutationId || ""),
  };
}

export function migrationRecordsAlreadyRepresentedV2(
  expectedRecords: MovementRecordV2[],
  actualRecords: MovementRecordV2[],
): boolean {
  const actual = new Map<string, MovementRecordV2>();
  (actualRecords || []).forEach((record) => {
    if (!record || !record.recordId) return;
    const previous = actual.get(record.recordId);
    if (!previous || Number(record.updatedAtMs || 0) >= Number(previous.updatedAtMs || 0)) {
      actual.set(record.recordId, record);
    }
  });
  return (expectedRecords || []).every((expected) => {
    const found = actual.get(expected.recordId);
    return !!found && Number(found.updatedAtMs || 0) >= Number(expected.updatedAtMs || 0);
  });
}

async function legacySnapshotAlreadyRepresentedOnServerV2(
  uid: string,
  expensesValue: any[],
  incomesValue: any[],
  tombstonesValue: any,
): Promise<boolean> {
  const expected = buildLegacyMigrationRecordsV2(uid, expensesValue, incomesValue, tombstonesValue);
  if (!expected.length) return true;
  const server = await getDocsFromServer(movementCollection(uid));
  const actual: MovementRecordV2[] = [];
  server.docs.forEach((row) => {
    const record = normalizeRecord(row.data());
    if (record && record.uid === uid) actual.push(record);
  });
  return migrationRecordsAlreadyRepresentedV2(expected, actual);
}

export function watchMovementSyncV2(
  uidValue: string,
  listener: (records: MovementRecordV2[], meta: MovementWatchMeta) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const uid = String(uidValue || "").trim();
  if (!uid) return () => undefined;
  return onSnapshot(
    movementCollection(uid),
    { includeMetadataChanges: true },
    (snapshot) => {
      const records: MovementRecordV2[] = [];
      snapshot.docs.forEach((row) => {
        const record = normalizeRecord(row.data());
        if (record && record.uid === uid) records.push(record);
      });
      listener(records, {
        fromCache: snapshot.metadata.fromCache === true,
        hasPendingWrites: snapshot.metadata.hasPendingWrites === true,
      });
    },
    (error) => onError?.(error),
  );
}

function activeRecord(uid: string, kind: MovementKind, item: any): MovementRecordV2 | null {
  const prepared = ensureStableMovementIds(kind, [item])[0];
  const recordId = movementRecordId(kind, prepared);
  if (!recordId) return null;
  const now = Date.now();
  return {
    schemaVersion: 2,
    uid,
    kind,
    recordId,
    deleted: false,
    payload: { ...prepared },
    updatedAtMs: now,
    deletedAtMs: 0,
    mutationId: randomId(),
  };
}

function deletedRecord(uid: string, kind: MovementKind, recordId: string): MovementRecordV2 {
  const now = Date.now();
  return {
    schemaVersion: 2,
    uid,
    kind,
    recordId,
    deleted: true,
    payload: null,
    updatedAtMs: now,
    deletedAtMs: now,
    mutationId: randomId(),
  };
}

export function writeMovementDiffV2(
  uidValue: string,
  kind: MovementKind,
  currentValue: any[],
  nextValue: any[],
  onError?: (error: unknown) => void,
): number {
  const uid = String(uidValue || "").trim();
  if (!uid) return 0;

  const current = ensureMovementIds(kind, currentValue || []);
  const next = ensureMovementIds(kind, nextValue || []);
  const diff = buildMovementDiffV2(kind, current, next);
  const writes: MovementRecordV2[] = [];
  diff.forEach((entry) => {
    if (entry.deleted) {
      writes.push(deletedRecord(uid, kind, entry.recordId));
      return;
    }
    const record = activeRecord(uid, kind, entry.payload);
    if (record) writes.push(record);
  });
  writes.forEach((record) => {
    setDoc(movementRef(uid, record.kind, record.recordId), record).catch((error) => {
      onError?.(error);
    });
  });
  return writes.length;
}

function migrationActiveRecord(uid: string, kind: MovementKind, item: any): MovementRecordV2 | null {
  const prepared = ensureStableMovementIds(kind, [item])[0];
  const recordId = movementRecordId(kind, prepared);
  if (!recordId) return null;
  const sourceTime = Math.max(1, Number(syncRecordTime(prepared) || 0));
  return {
    schemaVersion: 2,
    uid,
    kind,
    recordId,
    deleted: false,
    payload: { ...prepared },
    updatedAtMs: sourceTime,
    deletedAtMs: 0,
    mutationId: `migration:${recordId}:${sourceTime}`,
  };
}

function migrationDeletedRecord(uid: string, kind: MovementKind, recordId: string, deletedAtMs: number): MovementRecordV2 {
  const time = Math.max(1, Number(deletedAtMs || 0));
  return {
    schemaVersion: 2,
    uid,
    kind,
    recordId,
    deleted: true,
    payload: null,
    updatedAtMs: time,
    deletedAtMs: time,
    mutationId: `migration-delete:${recordId}:${time}`,
  };
}

export function buildLegacyMigrationRecordsV2(
  uidValue: string,
  expensesValue: any[],
  incomesValue: any[],
  tombstonesValue: any,
): MovementRecordV2[] {
  const uid = String(uidValue || "").trim();
  if (!uid) return [];
  const selected: Record<string, MovementRecordV2> = {};

  (["expense", "income"] as MovementKind[]).forEach((kind) => {
    const source = kind === "expense" ? expensesValue : incomesValue;
    ensureStableMovementIds(kind, source || []).forEach((item) => {
      const record = migrationActiveRecord(uid, kind, item);
      if (!record) return;
      const previous = selected[record.recordId];
      if (!previous || record.updatedAtMs >= previous.updatedAtMs) selected[record.recordId] = record;
    });
  });

  const tombstones = tombstonesValue && typeof tombstonesValue === "object" ? tombstonesValue : {};
  Object.keys(tombstones).forEach((recordId) => {
    if (!recordId.startsWith("expense:") && !recordId.startsWith("income:")) return;
    const value = tombstones[recordId];
    if (!isExplicitSyncTombstone(value)) return;
    const deletedAtMs = Number(syncTombstoneTime(value) || 0);
    if (!deletedAtMs) return;
    const kind: MovementKind = recordId.startsWith("income:") ? "income" : "expense";
    const previous = selected[recordId];
    if (!previous || deletedAtMs >= previous.updatedAtMs) {
      selected[recordId] = migrationDeletedRecord(uid, kind, recordId, deletedAtMs);
    }
  });

  return Object.values(selected).sort((a, b) => a.recordId.localeCompare(b.recordId));
}

function errorCode(error: any): string {
  return String(error?.code || "").toLowerCase();
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  async function runner() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      await worker(items[index]);
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, () => runner());
  await Promise.all(workers);
}

export async function migrateLegacyMovementSnapshotV2(
  uidValue: string,
  expensesValue: any[],
  incomesValue: any[],
  tombstonesValue: any,
  options?: {
    announceMigration?: boolean;
    onProgress?: (progress: MigrationProgress) => void;
  },
): Promise<{ total: number }> {
  const uid = String(uidValue || "").trim();
  if (!uid) return { total: 0 };
  const records = buildLegacyMigrationRecordsV2(uid, expensesValue, incomesValue, tombstonesValue);
  const announce = options?.announceMigration !== false;
  const startedAtMs = Date.now();

  if (announce) {
    await setDoc(metaRef(uid), {
      schemaVersion: 2,
      state: "migrating",
      migrationStartedAtMs: startedAtMs,
      migrationUpdatedAtMs: startedAtMs,
    }, { merge: true });
  }

  // Resume safely: do not rewrite records that are already present on the
  // server with the same or a newer version. This makes an interrupted
  // migration continue from the real server state instead of restarting from 0.
  const serverBefore = await getDocsFromServer(movementCollection(uid));
  const actualBefore = new Map<string, MovementRecordV2>();
  serverBefore.docs.forEach((row) => {
    const record = normalizeRecord(row.data());
    if (record && record.uid === uid) actualBefore.set(record.recordId, record);
  });
  const pendingRecords = records.filter((expected) => {
    const found = actualBefore.get(expected.recordId);
    return !found || Number(found.updatedAtMs || 0) < Number(expected.updatedAtMs || 0);
  });

  let done = 0;
  options?.onProgress?.({ done: 0, total: pendingRecords.length });
  await runWithConcurrency(pendingRecords, 12, async (record) => {
    try {
      await setDoc(movementRef(uid, record.kind, record.recordId), record);
    } catch (error: any) {
      // The rules reject a migration write when a newer V2 update/tombstone is
      // already present. That is expected and means the user's live action won.
      const code = errorCode(error);
      if (code.indexOf("permission-denied") < 0 && code.indexOf("failed-precondition") < 0) throw error;
    }
    done += 1;
    if (done === pendingRecords.length || done % 25 === 0) options?.onProgress?.({ done, total: pendingRecords.length });
  });

  await waitForPendingWrites(fbDb);

  // One server read verifies that every legacy state is represented by the same
  // or a newer V2 state. No historical recovery is ever run after cutover.
  const server = await getDocsFromServer(movementCollection(uid));
  const actual = new Map<string, MovementRecordV2>();
  server.docs.forEach((row) => {
    const record = normalizeRecord(row.data());
    if (record && record.uid === uid) actual.set(record.recordId, record);
  });
  const missing = records.filter((expected) => {
    const found = actual.get(expected.recordId);
    return !found || Number(found.updatedAtMs || 0) < Number(expected.updatedAtMs || 0);
  });
  if (missing.length) {
    throw new Error(`MOVEMENT_V2_MIGRATION_VERIFY_FAILED:${missing.length}`);
  }
  return { total: records.length };
}

export async function completeMovementSyncV2Migration(uidValue: string): Promise<void> {
  const uid = String(uidValue || "").trim();
  if (!uid) return;
  const now = Date.now();
  await setDoc(metaRef(uid), {
    schemaVersion: 2,
    state: "enabled-migrated",
    migrationCompletedAtMs: now,
    migrationCompletedAt: new Date(now).toISOString(),
    migrationUpdatedAtMs: now,
  }, { merge: true });
  await waitForPendingWrites(fbDb);
  await saveLocalActiveMarker(uid);
}

export function movementStateFromV2(records: MovementRecordV2[]) {
  const expenses: any[] = [];
  const incomes: any[] = [];
  (records || [])
    .filter((record) => record && !record.deleted && record.payload)
    .sort((a, b) => Number(b.updatedAtMs || 0) - Number(a.updatedAtMs || 0))
    .forEach((record) => {
      if (record.kind === "income") incomes.push(record.payload);
      else expenses.push(record.payload);
    });
  return { expenses, incomes };
}
