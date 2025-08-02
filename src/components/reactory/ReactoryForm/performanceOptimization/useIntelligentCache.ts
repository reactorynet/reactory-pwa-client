/**
 * Intelligent Cache Hook for ReactoryForm
 * Phase 1.4: Performance Optimization
 * 
 * This hook provides intelligent caching capabilities with automatic
 * invalidation, prefetching, compression, and offline support.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  compressed: boolean;
  tags: string[];
}

export interface CacheConfig {
  maxSize?: number; // Maximum cache size in bytes
  maxAge?: number; // Maximum age in milliseconds
  maxItems?: number; // Maximum number of items
  enableCompression?: boolean;
  enableOffline?: boolean;
  enablePrefetching?: boolean;
  compressionThreshold?: number; // Minimum size to compress
  cleanupInterval?: number;
  prefetchDelay?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  totalSize: number;
  itemCount: number;
  hitRate: number;
  averageAccessTime: number;
  compressionRatio: number;
}

export interface CacheResult<T = any> {
  data: T | null;
  isCached: boolean;
  isLoading: boolean;
  error: Error | null;
  stats: CacheStats;
  get: (key: string) => T | null;
  set: (key: string, data: T, options?: CacheSetOptions) => void;
  has: (key: string) => boolean;
  delete: (key: string) => boolean;
  clear: () => void;
  prefetch: (keys: string[]) => void;
  invalidateByTag: (tag: string) => void;
  getStats: () => CacheStats;
  compress: () => void;
  decompress: () => void;
}

export interface CacheSetOptions {
  ttl?: number; // Time to live in milliseconds
  tags?: string[];
  priority?: 'low' | 'normal' | 'high';
  compress?: boolean;
}

// ============================================================================
// INTELLIGENT CACHE HOOK
// ============================================================================

export const useIntelligentCache = <T = any>(
  config: CacheConfig = {}
): CacheResult<T> => {
  const {
    maxSize = 50 * 1024 * 1024, // 50MB
    maxAge = 5 * 60 * 1000, // 5 minutes
    maxItems = 1000,
    enableCompression = true,
    enableOffline = true,
    enablePrefetching = true,
    compressionThreshold = 1024, // 1KB
    cleanupInterval = 30000, // 30 seconds
    prefetchDelay = 1000 // 1 second
  } = config;

  // Refs
  const cacheRef = useRef<Map<string, CacheItem<T>>>(new Map());
  const statsRef = useRef<CacheStats>({
    hits: 0,
    misses: 0,
    totalSize: 0,
    itemCount: 0,
    hitRate: 0,
    averageAccessTime: 0,
    compressionRatio: 0
  });
  const prefetchQueueRef = useRef<Set<string>>(new Set());
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();

  // State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Calculate item size
   */
  const calculateItemSize = useCallback((data: any): number => {
    try {
      const serialized = JSON.stringify(data);
      return new Blob([serialized]).size;
    } catch {
      return 0;
    }
  }, []);

  /**
   * Compress data
   */
  const compressData = useCallback((data: any): { data: any; compressed: boolean } => {
    if (!enableCompression) return { data, compressed: false };

    try {
      const serialized = JSON.stringify(data);
      if (serialized.length < compressionThreshold) {
        return { data, compressed: false };
      }

      // Simple compression using base64 (in real implementation, use proper compression)
      const compressed = btoa(serialized);
      return { data: compressed, compressed: true };
    } catch {
      return { data, compressed: false };
    }
  }, [enableCompression, compressionThreshold]);

  /**
   * Decompress data
   */
  const decompressData = useCallback((data: any, compressed: boolean): any => {
    if (!compressed) return data;

    try {
      const decompressed = atob(data as string);
      return JSON.parse(decompressed);
    } catch {
      return data;
    }
  }, []);

  /**
   * Check if item is expired
   */
  const isExpired = useCallback((item: CacheItem<T>): boolean => {
    return Date.now() > item.expiresAt;
  }, []);

  /**
   * Update cache statistics
   */
  const updateStats = useCallback(() => {
    const stats = statsRef.current;
    const total = stats.hits + stats.misses;
    stats.hitRate = total > 0 ? stats.hits / total : 0;
    stats.itemCount = cacheRef.current.size;
    stats.totalSize = Array.from(cacheRef.current.values()).reduce(
      (total, item) => total + item.size,
      0
    );
  }, []);

  /**
   * Cleanup expired items
   */
  const cleanupExpired = useCallback(() => {
    const now = Date.now();
    let deletedCount = 0;
    let deletedSize = 0;

    for (const [key, item] of cacheRef.current.entries()) {
      if (isExpired(item)) {
        deletedSize += item.size;
        cacheRef.current.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} expired cache items (${deletedSize} bytes)`);
      updateStats();
    }
  }, [isExpired, updateStats]);

  /**
   * Evict least recently used items
   */
  const evictLRU = useCallback(() => {
    const items = Array.from(cacheRef.current.entries());
    items.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    let deletedSize = 0;
    const targetSize = maxSize * 0.8; // Evict until 80% of max size

    for (const [key, item] of items) {
      if (statsRef.current.totalSize - deletedSize <= targetSize) break;
      
      deletedSize += item.size;
      cacheRef.current.delete(key);
    }

    if (deletedSize > 0) {
      console.log(`Evicted ${deletedSize} bytes from cache`);
      updateStats();
    }
  }, [maxSize, updateStats]);

  /**
   * Save to localStorage for offline support
   */
  const saveToStorage = useCallback(() => {
    if (!enableOffline) return;

    try {
      const cacheData = Array.from(cacheRef.current.entries());
      const serialized = JSON.stringify(cacheData);
      localStorage.setItem('reactory-cache', serialized);
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }, [enableOffline]);

  /**
   * Load from localStorage for offline support
   */
  const loadFromStorage = useCallback(() => {
    if (!enableOffline) return;

    try {
      const serialized = localStorage.getItem('reactory-cache');
      if (serialized) {
        const cacheData = JSON.parse(serialized);
        cacheRef.current = new Map(cacheData);
        updateStats();
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }, [enableOffline, updateStats]);

  // ============================================================================
  // CACHE OPERATIONS
  // ============================================================================

  /**
   * Get item from cache
   */
  const get = useCallback((key: string): T | null => {
    const startTime = globalThis.performance.now();
    
    const item = cacheRef.current.get(key);
    if (!item) {
      statsRef.current.misses++;
      updateStats();
      return null;
    }

    if (isExpired(item)) {
      cacheRef.current.delete(key);
      statsRef.current.misses++;
      updateStats();
      return null;
    }

    // Update access statistics
    item.accessCount++;
    item.lastAccessed = Date.now();
    statsRef.current.hits++;

    const accessTime = globalThis.performance.now() - startTime;
    statsRef.current.averageAccessTime = 
      (statsRef.current.averageAccessTime * (statsRef.current.hits - 1) + accessTime) / statsRef.current.hits;

    updateStats();

    // Decompress if necessary
    return decompressData(item.data, item.compressed);
  }, [isExpired, updateStats, decompressData]);

  /**
   * Set item in cache
   */
  const set = useCallback((key: string, data: T, options: CacheSetOptions = {}): void => {
    const {
      ttl = maxAge,
      tags = [],
      priority = 'normal',
      compress = enableCompression
    } = options;

    // Check cache size limits
    if (cacheRef.current.size >= maxItems) {
      evictLRU();
    }

    // Compress data if needed
    const { data: processedData, compressed } = compressData(data);
    const size = calculateItemSize(processedData);

    // Check size limits
    if (size > maxSize) {
      console.warn(`Cache item too large: ${size} bytes`);
      return;
    }

    // Create cache item
    const item: CacheItem<T> = {
      data: processedData,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      size,
      compressed,
      tags
    };

    // Add to cache
    cacheRef.current.set(key, item);
    updateStats();

    // Save to storage for offline support
    if (enableOffline) {
      saveToStorage();
    }
  }, [maxAge, maxItems, maxSize, enableCompression, enableOffline, compressData, calculateItemSize, evictLRU, updateStats, saveToStorage]);

  /**
   * Check if key exists in cache
   */
  const has = useCallback((key: string): boolean => {
    const item = cacheRef.current.get(key);
    return item !== undefined && !isExpired(item);
  }, [isExpired]);

  /**
   * Delete item from cache
   */
  const deleteItem = useCallback((key: string): boolean => {
    const item = cacheRef.current.get(key);
    if (item) {
      statsRef.current.totalSize -= item.size;
      cacheRef.current.delete(key);
      updateStats();
      return true;
    }
    return false;
  }, [updateStats]);

  /**
   * Clear all cache
   */
  const clear = useCallback(() => {
    cacheRef.current.clear();
    statsRef.current = {
      hits: 0,
      misses: 0,
      totalSize: 0,
      itemCount: 0,
      hitRate: 0,
      averageAccessTime: 0,
      compressionRatio: 0
    };
  }, []);

  /**
   * Prefetch items
   */
  const prefetch = useCallback((keys: string[]) => {
    if (!enablePrefetching) return;

    keys.forEach(key => {
      if (!has(key)) {
        prefetchQueueRef.current.add(key);
      }
    });

    // Process prefetch queue after delay
    setTimeout(() => {
      prefetchQueueRef.current.forEach(key => {
        // In a real implementation, this would trigger data fetching
        console.log(`Prefetching: ${key}`);
      });
      prefetchQueueRef.current.clear();
    }, prefetchDelay);
  }, [enablePrefetching, has, prefetchDelay]);

  /**
   * Invalidate items by tag
   */
  const invalidateByTag = useCallback((tag: string) => {
    let deletedCount = 0;
    
    for (const [key, item] of cacheRef.current.entries()) {
      if (item.tags.includes(tag)) {
        cacheRef.current.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`Invalidated ${deletedCount} items with tag: ${tag}`);
      updateStats();
    }
  }, [updateStats]);

  /**
   * Get cache statistics
   */
  const getStats = useCallback((): CacheStats => {
    return { ...statsRef.current };
  }, []);

  /**
   * Compress all cache items
   */
  const compress = useCallback(() => {
    let compressedCount = 0;
    let totalSaved = 0;

    for (const [key, item] of cacheRef.current.entries()) {
      if (!item.compressed && item.size > compressionThreshold) {
        const { data: compressedData, compressed } = compressData(item.data);
        const newSize = calculateItemSize(compressedData);
        
        if (compressed && newSize < item.size) {
          item.data = compressedData;
          item.compressed = true;
          item.size = newSize;
          compressedCount++;
          totalSaved += item.size - newSize;
        }
      }
    }

    if (compressedCount > 0) {
      console.log(`Compressed ${compressedCount} items, saved ${totalSaved} bytes`);
      updateStats();
    }
  }, [compressionThreshold, compressData, calculateItemSize, updateStats]);

  /**
   * Decompress all cache items
   */
  const decompress = useCallback(() => {
    let decompressedCount = 0;

    for (const [key, item] of cacheRef.current.entries()) {
      if (item.compressed) {
        item.data = decompressData(item.data, true);
        item.compressed = false;
        item.size = calculateItemSize(item.data);
        decompressedCount++;
      }
    }

    if (decompressedCount > 0) {
      console.log(`Decompressed ${decompressedCount} items`);
      updateStats();
    }
  }, [decompressData, calculateItemSize, updateStats]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load cache from storage on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Setup cleanup interval
  useEffect(() => {
    cleanupTimeoutRef.current = setInterval(cleanupExpired, cleanupInterval);

    return () => {
      if (cleanupTimeoutRef.current) {
        clearInterval(cleanupTimeoutRef.current);
      }
    };
  }, [cleanupExpired, cleanupInterval]);

  // Save to storage periodically
  useEffect(() => {
    if (!enableOffline) return;

    const saveInterval = setInterval(saveToStorage, 30000); // Save every 30 seconds

    return () => {
      clearInterval(saveInterval);
    };
  }, [enableOffline, saveToStorage]);

  return {
    data: null, // This would be the current data in a real implementation
    isCached: false,
    isLoading,
    error,
    stats: getStats(),
    get,
    set,
    has,
    delete: deleteItem,
    clear,
    prefetch,
    invalidateByTag,
    getStats,
    compress,
    decompress
  };
}; 