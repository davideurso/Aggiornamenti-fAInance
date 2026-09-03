type CacheEntry<T> = { value: T; updatedAt: number; staleAt: number };

class FainanceCache {
  private readonly values = new Map<string, CacheEntry<unknown>>();
  private readonly listeners = new Map<string, Set<() => void>>();

  get<T>(key: string): T | undefined {
    return this.values.get(key)?.value as T | undefined;
  }

  isStale(key: string): boolean {
    const entry = this.values.get(key);
    return !entry || Date.now() >= entry.staleAt;
  }

  set<T>(key: string, value: T, maxAgeMs = 60_000): void {
    const now = Date.now();
    this.values.set(key, { value, updatedAt: now, staleAt: now + maxAgeMs });
    this.emit(key);
  }

  invalidate(key: string): void {
    const entry = this.values.get(key);
    if (entry) this.values.set(key, { ...entry, staleAt: 0 });
    this.emit(key);
  }

  remove(key: string): void {
    this.values.delete(key);
    this.emit(key);
  }

  clear(): void {
    const keys = Array.from(this.values.keys());
    this.values.clear();
    keys.forEach((key) => this.emit(key));
  }

  subscribe(key: string, listener: () => void): () => void {
    const set = this.listeners.get(key) || new Set<() => void>();
    set.add(listener);
    this.listeners.set(key, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(key);
    };
  }

  private emit(key: string): void {
    this.listeners.get(key)?.forEach((listener) => listener());
  }
}

export const appCache = new FainanceCache();
