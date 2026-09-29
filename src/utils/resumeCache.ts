// Use an existing persisted document; an absent cache entry is not proof that
// the server document is absent. Live read failures must still reach the caller.
export async function readExistingCachedDocument<T extends { exists(): boolean }>(
  readCache: () => Promise<T>, readLive: () => Promise<T>
): Promise<T> {
  try {
    const cached = await readCache();
    if (cached.exists()) return cached;
  } catch (_) { /* Cache unavailable: retain the normal server read. */ }
  return readLive();
}

// Firestore does not await async snapshot callbacks. Keep cached and refreshed
// account merges in order so a slow cache merge cannot overwrite newer data.
export function serializeSnapshotHandler<T>(apply: (value: T) => Promise<void>) {
  let tail = Promise.resolve();
  return (value: T): Promise<void> => {
    const next = tail.then(() => apply(value));
    tail = next.catch(() => undefined);
    return next;
  };
}

const resumeTabs = new Set([
  'home', 'spese', 'history', 'more', 'share', 'shopping', 'tools', 'stats',
  'consulenteAI', 'budget', 'goals', 'patrimonio', 'appunti', 'alerts', 'settings'
]);
export function restoreResumeTab(storage: Pick<Storage, 'getItem'>, key: string): string {
  try {
    const value = storage.getItem(key) || '';
    return resumeTabs.has(value) ? value : 'home';
  } catch (_) { return 'home'; }
}

export function needsCategoryRecovery(categories: any[], expenses: any[], isRecovered: (category: any) => boolean): boolean {
  if (categories.some(isRecovered)) return true;
  const ids = new Set(categories.filter(Boolean).map(category => String(category.id)));
  return expenses.some(row => row && row.catId !== undefined && row.catId !== null &&
    String(row.catId) !== '' && !ids.has(String(row.catId)));
}

const checkpointKey = 'resume_checkpoint_v1';
export function writeResumeCheckpoint(storage: Pick<Storage, 'getItem' | 'setItem'>, uid: string, keys: string[]): void {
  if (!uid) return;
  try {
    const prefix = 'user_' + uid + '_';
    // Record which local fields were present after successful hydration.
    // Do not duplicate the financial data or turn the checkpoint into a backup.
    const present = keys.filter(key => storage.getItem(prefix + key) !== null);
    storage.setItem(prefix + checkpointKey, JSON.stringify({version: 1, uid, keys: present}));
  } catch (_) { /* Storage full: retain the normal startup path. */ }
}
export function hasResumeCheckpoint(storage: Pick<Storage, 'getItem'>, uid: string): boolean {
  if (!uid) return false;
  try {
    const prefix = 'user_' + uid + '_';
    const checkpoint = JSON.parse(storage.getItem(prefix + checkpointKey) || 'null');
    if (checkpoint?.version !== 1 || checkpoint.uid !== uid || !Array.isArray(checkpoint.keys) || !checkpoint.keys.length) return false;
    return checkpoint.keys.every((key: unknown) => {
      if (typeof key !== 'string' || !key || key.length > 100) return false;
      const raw = storage.getItem(prefix + key);
      if (raw === null) return false;
      JSON.parse(raw);
      return true;
    });
  } catch (_) { return false; }
}
