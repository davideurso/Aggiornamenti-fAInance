// Recovery copies have a separate durable quota; canonical app data stays in place.
const snapshotKeys = /^user_.+_account_recovery_complete(?:_previous)?_v1$/;
const cache = new Map<string, string>();
const deletedKeys = new Set<string>();
let database: IDBDatabase | null = null;
let initialization: Promise<void> | null = null;
let queue: Promise<void> = Promise.resolve();

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fainance-recovery-snapshots-v1', 1);
    let expired = false;
    const timer = setTimeout(() => { expired = true; reject(new Error('RECOVERY_STORE_UNAVAILABLE')); }, 4000);
    request.onupgradeneeded = () => request.result.createObjectStore('snapshots');
    request.onerror = () => { clearTimeout(timer); reject(request.error); };
    request.onsuccess = () => {
      clearTimeout(timer);
      if (expired) { request.result.close(); return; }
      const db = request.result;
      db.onversionchange = () => { db.close(); if (database === db) database = null; };
      resolve(db);
    };
  });
}

function writeVerified(entries: Array<[string, string]>, rotatePreviousKey?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!database) { reject(new Error('RECOVERY_STORE_UNAVAILABLE')); return; }
    const transaction = database.transaction('snapshots', 'readwrite');
    const store = transaction.objectStore('snapshots');
    let mismatch = false;
    const write = () => {
      try {
        entries.forEach(([key, value]) => {
          store.put(value, key);
          const check = store.get(key);
          check.onsuccess = () => { if (check.result !== value) { mismatch = true; transaction.abort(); } };
        });
      } catch (_error) { transaction.abort(); }
    };
    if (rotatePreviousKey) {
      // Read the latest durable generation in the same transaction, even if
      // another tab has saved since this tab initialized its synchronous cache.
      const current = store.get(entries[0][0]);
      current.onsuccess = () => {
        if (typeof current.result === 'string') {
          const index = entries.findIndex(([key]) => key === rotatePreviousKey);
          if (index >= 0) entries[index] = [rotatePreviousKey, current.result];
          else entries.push([rotatePreviousKey, current.result]);
        }
        write();
      };
    } else write();
    transaction.oncomplete = () => { entries.forEach(([key, value]) => cache.set(key, value)); resolve(); };
    transaction.onabort = transaction.onerror = () => reject(new Error(mismatch ? 'RECOVERY_VERIFY_FAILED' : 'RECOVERY_WRITE_FAILED'));
  });
}

export function initializeRecoverySnapshots(): Promise<void> {
  if (initialization) return initialization;
  initialization = (async () => {
    try {
      database = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = database!.transaction('snapshots', 'readonly');
        const cursor = transaction.objectStore('snapshots').openCursor();
        cursor.onsuccess = () => {
          const row = cursor.result;
          if (!row) return;
          if (typeof row.key === 'string' && snapshotKeys.test(row.key) && typeof row.value === 'string') cache.set(row.key, row.value);
          row.continue();
        };
        transaction.oncomplete = () => resolve();
        transaction.onabort = transaction.onerror = () => reject(new Error('RECOVERY_READ_FAILED'));
      });
      const legacy: Array<[string, string]> = [];
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (!key || !snapshotKeys.test(key)) continue;
        const raw = localStorage.getItem(key);
        if (raw !== null) legacy.push([key, raw]);
      }
      // Persist and read back every byte before releasing either legacy copy.
      if (legacy.length) await writeVerified(legacy);
      legacy.forEach(([key, raw]) => { if (localStorage.getItem(key) === raw) localStorage.removeItem(key); });
    } catch (_error) {
      // A failed migration never removes a legacy copy or prevents app startup.
      console.warn('RECOVERY_STORE_UNAVAILABLE');
    }
  })();
  return initialization;
}

export function readRecoverySnapshot(key: string): string | null {
  if (deletedKeys.has(key)) return null;
  // A legacy copy retained after a failed migration remains authoritative.
  return localStorage.getItem(key) ?? cache.get(key) ?? null;
}

export function persistRecoverySnapshot(currentKey: string, previousKey: string, value: string): Promise<void> {
  if (!snapshotKeys.test(currentKey) || !snapshotKeys.test(previousKey)) return Promise.reject(new Error('RECOVERY_KEY_INVALID'));
  const operation = queue.then(async () => {
    if (deletedKeys.has(currentKey) || deletedKeys.has(previousKey)) throw new Error('RECOVERY_ACCOUNT_DELETED');
    await initializeRecoverySnapshots();
    const previous = readRecoverySnapshot(currentKey);
    const legacyCurrent = localStorage.getItem(currentKey), legacyPrevious = localStorage.getItem(previousKey);
    if (!database) {
      // Keep the original fallback when IndexedDB is unavailable; never erase data.
      if (previous) localStorage.setItem(previousKey, previous);
      localStorage.setItem(currentKey, value);
      return;
    }
    const entries: Array<[string, string]> = [[currentKey, value]];
    if (previous) entries.push([previousKey, previous]);
    await writeVerified(entries, legacyCurrent === null ? previousKey : undefined);
    if (legacyCurrent !== null && localStorage.getItem(currentKey) === legacyCurrent) localStorage.removeItem(currentKey);
    if (previous && legacyPrevious !== null && localStorage.getItem(previousKey) === legacyPrevious) localStorage.removeItem(previousKey);
  });
  queue = operation.catch(() => {});
  return operation;
}

// Called only by the existing confirmed account-deletion flow, never by quota recovery.
export function clearRecoverySnapshots(uid: string): Promise<void> {
  if (!uid) return Promise.reject(new Error('RECOVERY_KEY_INVALID'));
  const keys = ['user_' + uid + '_account_recovery_complete_v1', 'user_' + uid + '_account_recovery_complete_previous_v1'];
  keys.forEach(key => { deletedKeys.add(key); cache.delete(key); });
  const operation = queue.then(async () => {
    await initializeRecoverySnapshots();
    keys.forEach(key => localStorage.removeItem(key));
    if (!database) throw new Error('RECOVERY_STORE_UNAVAILABLE');
    await new Promise<void>((resolve, reject) => {
      const transaction = database!.transaction('snapshots', 'readwrite');
      const store = transaction.objectStore('snapshots');
      keys.forEach(key => {
        store.delete(key);
        const check = store.get(key);
        check.onsuccess = () => { if (check.result !== undefined) transaction.abort(); };
      });
      transaction.oncomplete = () => { keys.forEach(key => cache.delete(key)); resolve(); };
      transaction.onabort = transaction.onerror = () => reject(new Error('RECOVERY_DELETE_FAILED'));
    });
  });
  queue = operation.catch(() => {});
  return operation;
}
