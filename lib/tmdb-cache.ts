/**
 * Shared in-memory LRU cache for TMDb API responses.
 * 10-minute TTL, max 500 entries, automatic eviction.
 */

export interface CacheEntry<T> {
  data: T;
  expires: number;
}

export class LruCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(ttlMs: number = 10 * 60 * 1000, maxSize: number = 500) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Evict expired entries
    if (entry.expires <= Date.now()) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  set(key: string, data: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Shared instances for different response types
export const tmdbSearchCache = new LruCache<{ results: unknown[]; total_pages: number; page: number }>();
export const tmdbPopularCache = new LruCache<{ results: unknown[]; total_pages: number; page: number }>();
