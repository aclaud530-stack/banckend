/**
 * In-memory cache store fallback for when Redis is unavailable
 * This provides a simple, non-persistent cache for the application
 */

interface CacheEntry {
  value: string;
  expiresAt?: number;
}

class MemoryStore {
  private cache = new Map<string, CacheEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  /**
   * Set a value in memory cache
   */
  set(key: string, value: string, ttl?: number): void {
    let expiresAt: number | undefined;
    if (ttl) {
      expiresAt = Date.now() + ttl * 1000;
    }
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Get a value from memory cache
   */
  get(key: string): string | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Delete a key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      memory: process.memoryUsage().heapUsed,
    };
  }

  /**
   * Periodic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      let cleaned = 0;
      const now = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt && now > entry.expiresAt) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        // Optionally log cleanup stats in development
      }
    }, 60000); // Run every minute
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Singleton instance
let memoryStore: MemoryStore | null = null;

export const getMemoryStore = (): MemoryStore => {
  if (!memoryStore) {
    memoryStore = new MemoryStore();
  }
  return memoryStore;
};

export const destroyMemoryStore = (): void => {
  if (memoryStore) {
    memoryStore.destroy();
    memoryStore = null;
  }
};
