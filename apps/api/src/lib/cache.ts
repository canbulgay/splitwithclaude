/**
 * In-memory cache implementation for balance calculations
 * Using Map for simplicity - can be replaced with Redis in production
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class InMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Set a value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
    };
    this.cache.set(key, entry);
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): number {
    let deletedCount = 0;
    const regex = new RegExp(pattern.replace('*', '.*'));
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let cleanedCount = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }
}

// Singleton cache instance
export const cache = new InMemoryCache();

// Cache key generators
export const CacheKeys = {
  groupBalances: (groupId: string) => `balances:group:${groupId}`,
  userBalances: (userId: string) => `balances:user:${userId}`,
  userGroupBalances: (userId: string, groupId: string) => `balances:user:${userId}:group:${groupId}`,
  settlementSuggestions: (groupId: string) => `settlements:suggestions:${groupId}`,
  expenseCount: (groupId: string) => `expenses:count:${groupId}`,
  expenseTotal: (groupId: string) => `expenses:total:${groupId}`,
};

// Cache invalidation helpers
export const CacheInvalidation = {
  /**
   * Invalidate all balance-related cache for a group
   */
  invalidateGroupBalances: (groupId: string) => {
    cache.deletePattern(`balances:*:group:${groupId}`);
    cache.deletePattern(`balances:group:${groupId}`);
    cache.delete(CacheKeys.settlementSuggestions(groupId));
    cache.delete(CacheKeys.expenseCount(groupId));
    cache.delete(CacheKeys.expenseTotal(groupId));
  },

  /**
   * Invalidate balance cache for a specific user
   */
  invalidateUserBalances: (userId: string) => {
    cache.deletePattern(`balances:user:${userId}*`);
  },

  /**
   * Invalidate cache when expense is created/updated/deleted
   */
  invalidateExpenseCache: (groupId: string, userIds: string[]) => {
    // Invalidate group balances
    CacheInvalidation.invalidateGroupBalances(groupId);
    
    // Invalidate user balances for all affected users
    userIds.forEach(userId => {
      CacheInvalidation.invalidateUserBalances(userId);
    });
  },

  /**
   * Invalidate cache when settlement is created/updated
   */
  invalidateSettlementCache: (fromUserId: string, toUserId: string, groupIds: string[]) => {
    // Invalidate user balances
    CacheInvalidation.invalidateUserBalances(fromUserId);
    CacheInvalidation.invalidateUserBalances(toUserId);
    
    // Invalidate group balances for affected groups
    groupIds.forEach(groupId => {
      CacheInvalidation.invalidateGroupBalances(groupId);
    });
  },
};

// Cache statistics for monitoring
export const CacheStats = {
  getStats: () => ({
    size: cache.size(),
    hitRate: 0, // Would need to track hits/misses to calculate
    memory: process.memoryUsage(),
  }),
  
  cleanup: () => cache.cleanup(),
  clear: () => cache.clear(),
};

export default cache;