import { readWithDeadline } from "../utils/readDeadline";
import {
  collection,
  doc,
  getDocFromCache,
  getDocFromServer,
  getDocsFromServer,
  onSnapshot,
  setDoc,
  runTransaction,
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
  let serverMarkerReadFailed = false;
  try {
    const serverMarker = await readWithDeadline(getDocFromServer(metaRef(uid)));
    const serverState = markerState(serverMarker);
    if (serverState) state = serverState;
  } catch (_error) {
    serverMarkerReadFailed = true;
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

  // Unknown server state is not evidence of an empty/new account. Retry later;
  // never overwrite an existing migration marker after a failed metadata read.
  if (serverMarkerReadFailed && !state)
    return { active: false, reason: "status-check-unavailable" };

  // Existing local movements mean this is a legacy account. Do not block the
  // app: it stays on the old path while the background migrator is prepared.
  if ((localExpenses || []).length || (localIncomes || []).length) {
    return { active: false, reason: "legacy-migration-required" };
  }

  const legacySnap = await readWithDeadline(getDocFromServer(doc(fbDb, "userData", uid))).catch(() => null as any);
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
    // Early V2 records used clientUpdatedAtMs/writtenAtMs and noncanonical
    // document paths. Preserve their latest version when tombstoning them.
    updatedAtMs: Number(raw.updatedAtMs ?? Math.max(
      Number(raw.clientUpdatedAtMs || 0), Number(raw.writtenAtMs || 0))),
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
  const server = await readWithDeadline(getDocsFromServer(movementCollection(uid)));
  const actual: MovementRecordV2[] = [];
  server.docs.forEach((row) => {
    const record = normalizeRecord(row.data());
    if (record && record.uid === uid) actual.push(record);
  });
  return migrationRecordsAlreadyRepresentedV2(expected, actual);
}

// Only in-flight LOCAL intents are overlaid, scoped to one account and record.
// Firestore remains the durable offline queue and the source of remote changes.
const pendingRecordsV2 = new Map<string, Map<string, { record: MovementRecordV2; committed: boolean }>>();
const pendingObserversV2 = new Map<string, Set<() => void>>();

function pendingForV2(uid: string) {
  let pending = pendingRecordsV2.get(uid);
  if (!pending) { pending = new Map(); pendingRecordsV2.set(uid, pending); }
  return pending;
}

function notifyPendingV2(uid: string) {
  pendingObserversV2.get(uid)?.forEach(emit => emit());
}

function overlayPendingMovementRecordsV2(uid: string, records: MovementRecordV2[], meta: MovementWatchMeta) {
  const pending = pendingRecordsV2.get(uid);
  if (!pending?.size) return records;
  const combined = new Map(records.map(record => [record.recordId, record]));
  pending.forEach((entry, id) => {
    const remote = combined.get(id);
    // A local echo is not a server acknowledgement. Retire the overlay only
    // after BOTH the write promise and an authoritative snapshot confirm it.
    if (entry.committed && !meta.fromCache && !meta.hasPendingWrites && remote &&
        (remote.mutationId === entry.record.mutationId ||
         remote.updatedAtMs > entry.record.updatedAtMs || remote.deleted)) {
      pending.delete(id);
    } else {
      combined.set(id, entry.record);
    }
  });
  if (!pending.size) pendingRecordsV2.delete(uid);
  return [...combined.values()];
}

export function watchMovementSyncV2(
  uidValue: string,
  listener: (records: MovementRecordV2[], meta: MovementWatchMeta) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const uid = String(uidValue || "").trim();
  if (!uid) return () => undefined;
  let latest: MovementRecordV2[] | null = null;
  const byDocument = new Map<string, MovementRecordV2>();
  let latestMeta: MovementWatchMeta = { fromCache: true, hasPendingWrites: true };
  const emit = () => {
    if (latest) listener(overlayPendingMovementRecordsV2(uid, latest, latestMeta), latestMeta);
  };
  const observers = pendingObserversV2.get(uid) || new Set<() => void>();
  pendingObserversV2.set(uid, observers);
  observers.add(emit);
  const unsubscribe = onSnapshot(
    movementCollection(uid),
    { includeMetadataChanges: true },
    (snapshot) => {
      // QuerySnapshot.docs decodes every payload on every acknowledgement.
      // Keep the authoritative document map and decode only actual changes.
      // Key by physical document ID so historical paths remain distinct.
      if (typeof snapshot.docChanges === 'function') {
        snapshot.docChanges({ includeMetadataChanges: true }).forEach(change => {
          if (change.type === 'removed') byDocument.delete(change.doc.id);
          else {
            const record = normalizeRecord(change.doc.data());
            if (record && record.uid === uid) byDocument.set(change.doc.id, record);
            else byDocument.delete(change.doc.id);
          }
        });
      } else {
        byDocument.clear();
        snapshot.docs.forEach(row => {
          const record = normalizeRecord(row.data());
          if (record && record.uid === uid) byDocument.set(row.id || row.ref?.path || record.recordId, record);
        });
      }
      latest = [...byDocument.values()];
      latestMeta = {
        fromCache: snapshot.metadata.fromCache === true,
        hasPendingWrites: snapshot.metadata.hasPendingWrites === true,
      };
      emit();
    },
    (error) => onError?.(error),
  );
  return () => {
    observers.delete(emit);
    if (!observers.size) pendingObserversV2.delete(uid);
    unsubscribe();
  };
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
  // Register the whole intent before the first Firestore local echo can arrive.
  const pending = pendingForV2(uid);
  writes.forEach(record => pending.set(record.recordId, { record, committed: false }));
  writes.forEach((record) => {
    let operation: Promise<void>;
    try { operation = setDoc(movementRef(uid, record.kind, record.recordId), record); }
    catch (error) { operation = Promise.reject(error); }
    operation.then(() => {
      const entry = pending.get(record.recordId);
      if (entry?.record.mutationId === record.mutationId) entry.committed = true;
      notifyPendingV2(uid);
    }, (error) => {
      const entry = pending.get(record.recordId);
      if (entry?.record.mutationId === record.mutationId) pending.delete(record.recordId);
      notifyPendingV2(uid);
      onError?.(error);
    });
  });
  return writes.length;
}

export async function readMovementSetsV2(uidValue: string): Promise<{ expenses: any[]; incomes: any[] }> {
  const uid = String(uidValue || '').trim();
  if (!uid) throw new Error('SYNC_V2_NO_ACCOUNT');
  const snapshot = await readWithDeadline(getDocsFromServer(movementCollection(uid)));
  const records = snapshot.docs.map(row => normalizeRecord(row.data()))
    .filter((record): record is MovementRecordV2 => !!record && record.uid === uid);
  return movementStateFromV2(records);
}

function canonicalMovementPayloadV2(value: any): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}

function sameMovementVersionV2(a: MovementRecordV2 | null, b: MovementRecordV2 | null): boolean {
  if (!a || !b) return a === b;
  return a.uid === b.uid && a.kind === b.kind && a.recordId === b.recordId &&
    a.deleted === b.deleted && a.updatedAtMs === b.updatedAtMs &&
    a.mutationId === b.mutationId && canonicalMovementPayloadV2(a.payload) === canonicalMovementPayloadV2(b.payload);
}

/**
 * Explicit bulk changes require online V2 activation. Normal offline edits and
 * the original migration/catch-up code stay unchanged. There is no global epoch,
 * recovery suppression, hard delete, or automatic cloud rollback.
 * Each small transaction guards every known record before writing. A large
 * operation is resumable by user retry, NOT atomic across all records.
 */
// Only movement writes are relevant to a movement replacement. Unrelated backup
// and telemetry writes can keep the global Firestore queue busy for minutes.
// Wait for authoritative metadata, without dropping or bypassing local intents.
// Cancellation is safe here: this operation has not started any mutation yet.
async function waitForMovementWritesV2(uid: string, selected: MovementKind[],
  progress: ((done: number, total: number, phase?: string) => void) | undefined,
  stillOwner: () => boolean, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let off: Unsubscribe | undefined;
    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      off?.();
      clearInterval(timer);
      signal?.removeEventListener('abort', abort);
      error ? reject(error) : resolve();
    };
    const abort = () => finish(new Error('SYNC_V2_CANCELLED_BEFORE_WRITES'));
    const timer = setInterval(() => {
      if (!stillOwner()) finish(new Error('SYNC_V2_ACCOUNT_CHANGED'));
      else if (typeof navigator !== 'undefined' && navigator.onLine === false)
        finish(new Error('SYNC_V2_ONLINE_REQUIRED'));
    }, 1000);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    progress?.(0, 0, 'pending');
    try {
      off = onSnapshot(movementCollection(uid), { includeMetadataChanges: true }, snapshot => {
        if (settled) return;
        if (!stillOwner()) { finish(new Error('SYNC_V2_ACCOUNT_CHANGED')); return; }
        const pending = snapshot.docs.filter(row => row.metadata?.hasPendingWrites === true).length;
        progress?.(pending, 0, 'pending');
        // A cache-only view must never authorize a destructive operation.
        if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites && pending === 0)
          finish();
      }, finish);
      if (settled) off();
    } catch (error) { finish(error); }
  });
}

export async function replaceMovementSetsV2(
  uidValue: string,
  replacements: { expense?: any[]; income?: any[] },
  progress?: (done: number, total: number, phase?: string) => void,
  stillOwner: () => boolean = () => true,
  signal?: AbortSignal,
): Promise<{ expense?: any[]; income?: any[] }> {
  const uid = String(uidValue || '').trim();
  if (!uid || (typeof navigator !== 'undefined' && navigator.onLine === false))
    throw new Error('SYNC_V2_ONLINE_REQUIRED');
  const selected = (['expense', 'income'] as MovementKind[]).filter(kind =>
    Object.prototype.hasOwnProperty.call(replacements, kind));
  if (!selected.length) return {};
  progress?.(0, 0, 'checking');
  const marker = await readWithDeadline(getDocFromServer(metaRef(uid)));
  if (!['enabled-clean', 'enabled-migrated'].includes(markerState(marker)))
    throw new Error('SYNC_V2_NOT_ACTIVE');
  const target: Partial<Record<MovementKind, any[]>> = {};
  const desired = new Map<string, MovementRecordV2>();
  for (const kind of selected) {
    if (!Array.isArray(replacements[kind])) throw new Error('SYNC_V2_INVALID_REPLACEMENT');
    // JSON backups already have this representation. CSV preview rows can carry
    // undefined optional fields, which Firestore rejects; serialize them before
    // planning ANY transaction, without changing the movement's identity.
    const rows = ensureMovementIds(kind, replacements[kind]!).map(row =>
      row && typeof row === 'object' ? JSON.parse(JSON.stringify(row)) : row);
    target[kind] = rows;
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('SYNC_V2_INVALID_ROW');
      const record = activeRecord(uid, kind, row);
      if (!record || desired.has(record.recordId)) throw new Error('SYNC_V2_DUPLICATE_OR_MISSING_ID');
      desired.set(record.recordId, record);
    }
  }
  await waitForMovementWritesV2(uid, selected, progress, stillOwner, signal);
  if (!stillOwner()) throw new Error('SYNC_V2_ACCOUNT_CHANGED');
  if (signal?.aborted) throw new Error('SYNC_V2_CANCELLED_BEFORE_WRITES');
  progress?.(0, 0, 'reading');
  const snapshot = await readWithDeadline(getDocsFromServer(movementCollection(uid)));
  const before = new Map<string, MovementRecordV2>();
  const beforeRefs = new Map<string, ReturnType<typeof movementRef>>();
  snapshot.docs.forEach(row => {
    const record = normalizeRecord(row.data());
    if (record && record.uid === uid) {
      if (before.has(record.recordId)) throw new Error('SYNC_V2_AMBIGUOUS_SERVER_ID');
      before.set(record.recordId, record);
      // Historical documents may predate the current path encoding. The actual
      // snapshot ref is authoritative; recomputing it would read a missing doc
      // and falsely report a concurrent edit (or leave an old movement alive).
      if (row.ref) beforeRefs.set(record.recordId, row.ref);
    }
  });
  // An explicit backup replacement can restore business data, but must NEVER
  // revive the tombstoned document. Restore it as a new movement and retain
  // record-local provenance. No global migration/recovery marker is changed.
  // Reuse a previously committed restoration when retrying a partial operation.
  for (const [id, record] of [...desired]) {
    if (!before.get(id)?.deleted) continue;
    const aliases = [...before.values()].filter(existing =>
      !existing.deleted && existing.kind === record.kind &&
      existing.payload?.syncV2RestoredFromRecordId === id);
    if (aliases.length > 1) throw new Error('SYNC_V2_AMBIGUOUS_RESTORE');
    const previousRestore = aliases[0];
    const restoredId = previousRestore ? movementRawId(record.kind, previousRestore.payload) : `restored_${randomId()}`;
    const restoredRow = {
      ...record.payload,
      id: restoredId,
      syncV2RestoredFromRecordId: id,
      syncV2RestoredAtMs: previousRestore?.payload?.syncV2RestoredAtMs || Date.now(),
    };
    const restored = activeRecord(uid, record.kind, restoredRow)!;
    if (desired.has(restored.recordId) || before.get(restored.recordId)?.deleted)
      throw new Error('SYNC_V2_RESTORE_ID_COLLISION');
    desired.delete(id);
    desired.set(restored.recordId, restored);
    target[record.kind] = target[record.kind]!.map(row =>
      movementRecordId(record.kind, row) === id ? restoredRow : row);
  }
  const planned = new Map(desired);
  before.forEach(record => {
    if (selected.includes(record.kind) && !record.deleted && !desired.has(record.recordId))
      planned.set(record.recordId, deletedRecord(uid, record.kind, record.recordId));
  });
  // Do not write unchanged rows. Retry after a partial failure is idempotent.
  const writes = [...planned.values()].filter(record => {
    const existing = before.get(record.recordId);
    return !existing || existing.deleted !== record.deleted ||
      canonicalMovementPayloadV2(existing.payload) !== canonicalMovementPayloadV2(record.payload);
  });
  let completed = 0;
  const failures: unknown[] = [];
  if (signal?.aborted) throw new Error('SYNC_V2_CANCELLED_BEFORE_WRITES');
  progress?.(0, writes.length, 'writing');
  // Bound each atomic group well below Firestore's transaction limits. Read
  // every document and check all expected versions before staging any write.
  // This reduces per-transaction network overhead without bypassing conflicts.
  const groups: MovementRecordV2[][] = [];
  for (let index = 0; index < writes.length; index += 8) groups.push(writes.slice(index, index + 8));
  await runWithConcurrency(groups, 8, async group => {
    if (failures.length) return;
    try {
      if (!stillOwner()) throw new Error('SYNC_V2_ACCOUNT_CHANGED');
      await runTransaction(fbDb, async transaction => {
        if (!stillOwner()) throw new Error('SYNC_V2_ACCOUNT_CHANGED');
        const results = await Promise.allSettled(group.map(async record => {
          const ref = beforeRefs.get(record.recordId) || movementRef(uid, record.kind, record.recordId);
          return { record, ref, snapshot: await transaction.get(ref) };
        }));
        const guarded: { record: MovementRecordV2; ref: ReturnType<typeof movementRef>; actual: MovementRecordV2 | null }[] = [];
        for (const result of results) {
          if (result.status === 'rejected') throw result.reason;
          const { record, ref, snapshot } = result.value;
          const actual = snapshot.exists() ? normalizeRecord(snapshot.data()) : null;
          const expected = before.get(record.recordId) || null;
          if (!sameMovementVersionV2(actual, expected)) throw new Error('SYNC_V2_CONCURRENT_EDIT');
          guarded.push({ record, ref, actual });
        }
        if (!stillOwner()) throw new Error('SYNC_V2_ACCOUNT_CHANGED');
        for (const { record, ref, actual } of guarded) {
          transaction.set(ref, {
            ...record,
            updatedAtMs: Math.max(record.updatedAtMs, Number(actual?.updatedAtMs || 0) + 1),
            deletedAtMs: record.deleted ? Math.max(record.deletedAtMs, Number(actual?.updatedAtMs || 0) + 1) : 0,
          });
        }
      });
      completed += group.length;
      progress?.(completed, writes.length, 'writing');
    } catch (error) { failures.push(error); }
  });
  if (failures.length) {
    const error = new Error(`SYNC_V2_PARTIAL_OPERATION:${completed}/${writes.length}`);
    Object.assign(error, { completed, total: writes.length, cause: failures[0] });
    throw error;
  }
  if (!stillOwner()) throw new Error('SYNC_V2_ACCOUNT_CHANGED');
  progress?.(completed, writes.length, 'verifying');
  const verified = await readWithDeadline(getDocsFromServer(movementCollection(uid)));
  const active = new Map<string, MovementRecordV2>();
  verified.docs.forEach(row => {
    const record = normalizeRecord(row.data());
    if (record && record.uid === uid && !record.deleted && selected.includes(record.kind))
      active.set(record.recordId, record);
  });
  // Preserve concurrent additions from other devices and report the conflict.
  // Never expand a deletion to records created after the initial server read.
  if (active.size !== desired.size || [...desired].some(([id, record]) =>
    !active.has(id) || canonicalMovementPayloadV2(active.get(id)!.payload) !== canonicalMovementPayloadV2(record.payload)))
    throw new Error('SYNC_V2_CONCURRENT_EDIT_OR_VERIFY_FAILED');
  return target;
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

function movementPayloadWithCanonicalRecordId(record: MovementRecordV2): any {
  const source = record && record.payload;
  if (!source || typeof source !== "object") return source;

  // The Firestore V2 recordId is the authoritative identity of the movement.
  // Older/corrupted recurring occurrences can have a payload whose id is missing
  // or no longer matches that stored recordId (for example after category/method
  // fields disappeared). If we hydrate that payload as-is, editing it writes a new
  // V2 document instead of updating the existing one, so the corrupted row appears
  // impossible to modify. Reattach only the canonical id; all business fields stay
  // untouched and healthy records are returned exactly as they are.
  const storedRecordId = String(record.recordId || "");
  const expectedPrefix = `${record.kind}:`;
  if (!storedRecordId.startsWith(expectedPrefix)) return source;

  const currentRecordId = movementRecordId(record.kind, source);
  if (currentRecordId === storedRecordId) return source;

  const canonicalRawId = storedRecordId.slice(expectedPrefix.length);
  if (!canonicalRawId) return source;
  return { ...source, id: canonicalRawId };
}

export function movementStateFromV2(records: MovementRecordV2[]) {
  const expenses: any[] = [];
  const incomes: any[] = [];
  (records || [])
    .filter((record) => record && !record.deleted && record.payload)
    .sort((a, b) => Number(b.updatedAtMs || 0) - Number(a.updatedAtMs || 0))
    .forEach((record) => {
      const payload = movementPayloadWithCanonicalRecordId(record);
      if (record.kind === "income") incomes.push(payload);
      else expenses.push(payload);
    });
  return { expenses, incomes };
}
