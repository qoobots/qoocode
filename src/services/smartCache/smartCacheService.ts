/**
 * Smart Cache Service
 * Intelligent caching strategy with LRU eviction and priority management
 */

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  createdAt: number;
  accessedAt: number;
  size: number;
  priority: 'high' | 'medium' | 'low';
  ttl?: number;
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

export interface SmartCacheOptions {
  maxSize: number;
  maxAge: number;
  defaultTtl: number;
  enableCompression: boolean;
  enableStats: boolean;
}

export interface CachePolicy {
  priority?: 'high' | 'medium' | 'low';
  ttl?: number;
  tags?: string[];
}

type CacheCallback = (key: string, value: unknown) => void;

export class SmartCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private options: SmartCacheOptions;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    maxSize: 0,
    hitRate: 0
  };
  private accessOrder: string[] = [];
  private listeners: Map<string, CacheCallback[]> = new Map();
  private cleanupTimer: NodeJS.Timeout | undefined;

  constructor(options?: Partial<SmartCacheOptions>) {
    this.options = {
      maxSize: 50 * 1024 * 1024, // 50MB default
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      defaultTtl: 60 * 60 * 1000, // 1 hour
      enableCompression: false,
      enableStats: true,
      ...options
    };
    this.stats.maxSize = this.options.maxSize;
    this.startCleanupTimer();
  }

  /**
   * Set a value in cache
   */
  public set(key: string, value: T, policy?: CachePolicy): void {
    const now = Date.now();
    const size = this.calculateSize(value);
    
    // Remove existing entry if updating
    if (this.cache.has(key)) {
      this.remove(key);
    }

    // Check if we need to evict
    while (this.stats.size + size > this.options.maxSize && this.cache.size > 0) {
      this.evictOne();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      accessedAt: now,
      size,
      priority: policy?.priority || 'medium',
      ttl: policy?.ttl || this.options.defaultTtl,
      tags: policy?.tags
    };

    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.stats.size += size;
  }

  /**
   * Get a value from cache
   */
  public get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.recordMiss();
      return undefined;
    }

    // Check TTL
    if (entry.ttl && Date.now() - entry.createdAt > entry.ttl) {
      this.remove(key);
      this.recordMiss();
      return undefined;
    }

    // Update access time and order
    entry.accessedAt = Date.now();
    this.updateAccessOrder(key);
    this.recordHit();
    
    return entry.value;
  }

  /**
   * Get entry metadata
   */
  public getEntry(key: string): CacheEntry<T> | undefined {
    return this.cache.get(key);
  }

  /**
   * Check if key exists and is valid
   */
  public has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (entry.ttl && Date.now() - entry.createdAt > entry.ttl) {
      this.remove(key);
      return false;
    }
    
    return true;
  }

  /**
   * Remove a specific entry
   */
  public remove(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.size -= entry.size;
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      return true;
    }
    return false;
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.size = 0;
  }

  /**
   * Evict entries by priority (lowest first)
   */
  public evictByPriority(): number {
    const priorities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
    let evicted = 0;

    for (const priority of priorities) {
      const toEvict = Array.from(this.cache.values())
        .filter(e => e.priority === priority)
        .sort((a, b) => a.accessedAt - b.accessedAt);

      for (const entry of toEvict) {
        if (this.stats.size <= this.options.maxSize * 0.8) break;
        this.remove(entry.key);
        this.stats.evictions++;
        evicted++;
      }
    }

    return evicted;
  }

  /**
   * Evict entries by tag
   */
  public evictByTag(tag: string): number {
    const toEvict = Array.from(this.cache.values())
      .filter(e => e.tags?.includes(tag));

    let evicted = 0;
    for (const entry of toEvict) {
      this.remove(entry.key);
      this.stats.evictions++;
      evicted++;
    }

    return evicted;
  }

  /**
   * Evict oldest entries
   */
  public evictOldest(count: number): number {
    const sorted = Array.from(this.cache.values())
      .sort((a, b) => a.accessedAt - b.accessedAt);
    
    let evicted = 0;
    for (let i = 0; i < Math.min(count, sorted.length); i++) {
      this.remove(sorted[i].key);
      this.stats.evictions++;
      evicted++;
    }

    return evicted;
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return {
      ...this.stats,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? this.stats.hits / (this.stats.hits + this.stats.misses) 
        : 0
    };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: this.stats.size,
      maxSize: this.stats.maxSize,
      hitRate: 0
    };
  }

  /**
   * Get all keys
   */
  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  public get size(): number {
    return this.cache.size;
  }

  /**
   * Add change listener
   */
  public onChange(key: string, callback: CacheCallback): void {
    const listeners = this.listeners.get(key) || [];
    listeners.push(callback);
    this.listeners.set(key, listeners);
  }

  /**
   * Remove change listener
   */
  public offChange(key: string, callback: CacheCallback): void {
    const listeners = this.listeners.get(key);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Serialize cache for persistence
   */
  public serialize(): string {
    const data = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      value: entry.value,
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      size: entry.size,
      priority: entry.priority,
      ttl: entry.ttl,
      tags: entry.tags
    }));
    return JSON.stringify(data);
  }

  /**
   * Deserialize cache from persistence
   */
  public deserialize(json: string): void {
    try {
      const data = JSON.parse(json);
      this.clear();
      
      for (const item of data) {
        this.cache.set(item.key, {
          ...item,
          value: item.value as T
        });
        this.stats.size += item.size;
      }
    } catch (error) {
      console.error('Failed to deserialize cache:', error);
    }
  }

  /**
   * Evict one entry using LRU strategy
   */
  private evictOne(): void {
    // Find oldest entry with lowest priority
    const candidates = Array.from(this.cache.values())
      .filter(e => e.priority !== 'high')
      .sort((a, b) => {
        // Prefer lower priority, then older access
        const priorityOrder = { low: 0, medium: 1, high: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.accessedAt - b.accessedAt;
      });

    if (candidates.length > 0) {
      this.remove(candidates[0].key);
      this.stats.evictions++;
    }
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Calculate size of value
   */
  private calculateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length * 2; // Approximate UTF-16 size
    } catch {
      return 0;
    }
  }

  /**
   * Record cache hit
   */
  private recordHit(): void {
    if (this.options.enableStats) {
      this.stats.hits++;
    }
  }

  /**
   * Record cache miss
   */
  private recordMiss(): void {
    if (this.options.enableStats) {
      this.stats.misses++;
    }
  }

  /**
   * Start cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, 60 * 1000); // Every minute
  }

  /**
   * Remove expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    this.cache.forEach((entry, key) => {
      if (entry.ttl && now - entry.createdAt > entry.ttl) {
        toRemove.push(key);
      }
    });

    toRemove.forEach(key => this.remove(key));
  }

  /**
   * Dispose the cache
   */
  public dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
    this.listeners.clear();
  }
}

// Factory for creating typed caches
export function createSmartCache<T>(options?: Partial<SmartCacheOptions>): SmartCache<T> {
  return new SmartCache<T>(options);
}

// Singleton instances for common use cases
let responseCache: SmartCache | null = null;
let documentCache: SmartCache | null = null;
let apiCache: SmartCache | null = null;

export function getResponseCache(): SmartCache {
  if (!responseCache) {
    responseCache = new SmartCache({ maxSize: 100 * 1024 * 1024 }); // 100MB
  }
  return responseCache;
}

export function getDocumentCache(): SmartCache {
  if (!documentCache) {
    documentCache = new SmartCache({ maxSize: 50 * 1024 * 1024 }); // 50MB
  }
  return documentCache;
}

export function getApiCache(): SmartCache {
  if (!apiCache) {
    apiCache = new SmartCache({ maxSize: 200 * 1024 * 1024 }); // 200MB
  }
  return apiCache;
}
