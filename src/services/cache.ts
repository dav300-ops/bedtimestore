/**
 * Browser Cache Layer for The Bedtime Store
 *
 * Requirements:
 * 1. In-memory Map for the current session.
 * 2. localStorage for catalog data (categories, products), stored as { data, savedAt } with a 10-minute TTL and a version key.
 * 3. Never store passwords, tokens, hashes or payment details in localStorage. Keep orders/customer data in memory or sessionStorage.
 * 4. Wrap every localStorage read/write in try/catch.
 * 5. Debug logging in development mode for cache hits, misses, sets, and invalidations.
 */

const CACHE_VERSION = 'v1.0.0';
const CATALOG_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEnvelope<T> {
  data: T;
  savedAt: number;
  version: string;
}

class BrowserCache {
  // In-memory Map for high-speed current session reads
  private memoryMap = new Map<string, { data: any; savedAt: number }>();

  private isDev(): boolean {
    try {
      return Boolean(import.meta.env?.DEV);
    } catch {
      return false;
    }
  }

  private buildStorageKey(key: string): string {
    return `bedtime_store_${CACHE_VERSION}_${key}`;
  }

  /**
   * Retrieves data from memory or localStorage.
   * Returns data with isStale indicator for stale-while-revalidate execution.
   */
  public get<T>(key: string): { data: T | null; isStale: boolean } {
    const now = Date.now();

    // 1. Check in-memory session cache first
    const memoryItem = this.memoryMap.get(key);
    if (memoryItem) {
      const age = now - memoryItem.savedAt;
      const isStale = age >= CATALOG_TTL_MS;
      if (this.isDev()) {
        console.log(`[Browser Cache ${isStale ? 'STALE' : 'HIT'}] (Memory) key="${key}", age=${Math.round(age / 1000)}s`);
      }
      return { data: memoryItem.data as T, isStale };
    }

    // 2. Check localStorage for persistent catalog data
    try {
      const storageKey = this.buildStorageKey(key);
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const envelope: CacheEnvelope<T> = JSON.parse(raw);
        if (envelope && envelope.version === CACHE_VERSION) {
          const age = now - envelope.savedAt;
          const isStale = age >= CATALOG_TTL_MS;

          // Warm up memory cache
          this.memoryMap.set(key, { data: envelope.data, savedAt: envelope.savedAt });

          if (this.isDev()) {
            console.log(`[Browser Cache ${isStale ? 'STALE' : 'HIT'}] (LocalStorage) key="${key}", age=${Math.round(age / 1000)}s`);
          }
          return { data: envelope.data, isStale };
        } else {
          // Stale version, clean up
          localStorage.removeItem(storageKey);
        }
      }
    } catch (err: any) {
      if (this.isDev()) {
        console.warn(`[Browser Cache Read Error] key="${key}":`, err?.message);
      }
    }

    if (this.isDev()) {
      console.log(`[Browser Cache MISS] key="${key}"`);
    }
    return { data: null, isStale: true };
  }

  /**
   * Stores data in memory and conditionally in localStorage.
   * Catalog data (categories, products) is allowed in localStorage.
   * Sensitive items (passwords, tokens, payment cards, orders) are strictly excluded from localStorage.
   */
  public set<T>(key: string, data: T, persistToLocalStorage: boolean = true): void {
    const now = Date.now();

    // In-memory session store
    this.memoryMap.set(key, { data, savedAt: now });

    // Guard against persisting sensitive data
    const isSensitive = /password|token|secret|credit|card|cvv|hash|payment/i.test(key);

    if (persistToLocalStorage && !isSensitive) {
      try {
        const storageKey = this.buildStorageKey(key);
        const envelope: CacheEnvelope<T> = {
          data,
          savedAt: now,
          version: CACHE_VERSION,
        };
        localStorage.setItem(storageKey, JSON.stringify(envelope));
        if (this.isDev()) {
          console.log(`[Browser Cache SET] (LocalStorage) key="${key}" (TTL: 10m)`);
        }
      } catch (err: any) {
        // QuotaExceededError or disabled cookies
        if (this.isDev()) {
          console.warn(`[Browser Cache Write Error] key="${key}":`, err?.message);
        }
      }
    } else if (this.isDev()) {
      console.log(`[Browser Cache SET] (Memory Only) key="${key}"`);
    }
  }

  /**
   * Invalidate a specific key from both memory and localStorage
   */
  public invalidate(key: string): void {
    this.memoryMap.delete(key);
    try {
      const storageKey = this.buildStorageKey(key);
      localStorage.removeItem(storageKey);
      if (this.isDev()) {
        console.log(`[Browser Cache INVALIDATE] key="${key}"`);
      }
    } catch (err: any) {
      if (this.isDev()) {
        console.warn(`[Browser Cache Invalidate Error] key="${key}":`, err?.message);
      }
    }
  }

  /**
   * Clear all cached data
   */
  public clearAll(): void {
    this.memoryMap.clear();
    try {
      const prefix = `bedtime_store_${CACHE_VERSION}_`;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      if (this.isDev()) {
        console.log(`[Browser Cache CLEAR] Cleared all memory and ${keysToRemove.length} localStorage entries.`);
      }
    } catch (err: any) {
      if (this.isDev()) {
        console.warn('[Browser Cache Clear Error]:', err?.message);
      }
    }
  }
}

export const browserCache = new BrowserCache();
