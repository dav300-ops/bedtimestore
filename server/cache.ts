import { config } from './config';

interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
  version: string;
}

class CacheManager {
  private store = new Map<string, CacheEntry>();
  private readonly maxEntries = 500;
  private hits = 0;
  private misses = 0;

  private buildKey(key: string): string {
    return `${config.appVersion}:${key}`;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt || entry.version !== config.appVersion) {
        this.store.delete(key);
      }
    }
  }

  public get<T>(rawKey: string): T | null {
    const key = this.buildKey(rawKey);
    const entry = this.store.get(key);

    if (!entry) {
      this.misses++;
      if (config.isDev) {
        console.log(`[Cache MISS] ${rawKey}`);
      }
      return null;
    }

    if (Date.now() > entry.expiresAt || entry.version !== config.appVersion) {
      this.store.delete(key);
      this.misses++;
      if (config.isDev) {
        console.log(`[Cache EXPIRED] ${rawKey}`);
      }
      return null;
    }

    // Refresh insertion order for O(1) LRU behavior
    this.store.delete(key);
    this.store.set(key, entry);

    this.hits++;
    if (config.isDev) {
      console.log(`[Cache HIT] ${rawKey} (TTL remaining: ${Math.round((entry.expiresAt - Date.now()) / 1000)}s)`);
    }
    return entry.value as T;
  }

  public set<T>(rawKey: string, value: T, customTtlMs?: number): void {
    const key = this.buildKey(rawKey);
    const ttl = customTtlMs || config.cacheTtlMs;

    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      this.pruneExpired();
      if (this.store.size >= this.maxEntries) {
        const oldestKey = this.store.keys().next().value;
        if (oldestKey !== undefined) {
          this.store.delete(oldestKey);
        }
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      version: config.appVersion,
    });
    if (config.isDev) {
      console.log(`[Cache SET] ${rawKey} (TTL: ${Math.round(ttl / 1000)}s)`);
    }
  }

  public del(rawKey: string): void {
    const key = this.buildKey(rawKey);
    this.store.delete(key);
    if (config.isDev) {
      console.log(`[Cache DEL] ${rawKey}`);
    }
  }

  public delete(rawKey: string): void {
    this.del(rawKey);
  }

  public invalidatePrefix(prefix: string): void {
    const fullPrefix = `${config.appVersion}:${prefix}`;
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(fullPrefix)) {
        this.store.delete(key);
        count++;
      }
    }
    if (config.isDev) {
      console.log(`[Cache INVALIDATE] Cleared ${count} entries matching prefix "${prefix}"`);
    }
  }

  public clear(): { clearedCount: number } {
    const count = this.store.size;
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    console.log(`[Cache CLEAR] Cleared all ${count} entries.`);
    return { clearedCount: count };
  }

  public getStats() {
    return {
      entriesCount: this.store.size,
      hits: this.hits,
      misses: this.misses,
      ttlMs: config.cacheTtlMs,
      ttlSeconds: Math.round(config.cacheTtlMs / 1000),
      appVersion: config.appVersion,
      environment: config.env,
    };
  }
}

export const appCache = new CacheManager();
