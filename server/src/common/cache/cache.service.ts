import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtlSeconds = 300; // 5 minutes default

  /**
   * Retrieve an item from the cache. Returns null if missing or expired.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set an item with a TTL (in seconds).
   */
  set<T>(
    key: string,
    value: T,
    ttlSeconds: number = this.defaultTtlSeconds,
  ): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Get cached item or compute, store, and return if missing/expired.
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = this.defaultTtlSeconds,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    if (value !== undefined && value !== null) {
      this.set(key, value, ttlSeconds);
    }
    return value;
  }

  /**
   * Delete a specific cache key.
   */
  del(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Invalidate all keys that begin with the specified prefix.
   */
  delByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    if (count > 0) {
      this.logger.debug(
        `Invalidated ${count} cache entries with prefix: "${prefix}"`,
      );
    }
    return count;
  }

  /**
   * Flush all items from the cache.
   */
  flush(): void {
    this.store.clear();
    this.logger.debug('Cache completely flushed.');
  }

  /**
   * Get current cache store size.
   */
  size(): number {
    return this.store.size;
  }
}
