import { useState, useCallback, useRef, useEffect } from 'react';

// Types for intelligent caching
interface CacheItem<T = any> {
  data: T | string; // Can be original data or compressed string
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  size: number;
  compressed: boolean;
  tags: string[];
}

interface CacheConfig {
  maxSize: number; // MB
  maxAge: number; // milliseconds
  compressionThreshold: number; // bytes
  enableCompression: boolean;
  enableLRU: boolean;
  enableTags: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  itemCount: number;
  compressionRatio: number;
}

interface UseIntelligentCacheResult<T> {
  get: (key: string) => T | null;
  set: (key: string, data: T, options?: { tags?: string[]; ttl?: number }) => void;
  has: (key: string) => boolean;
  delete: (key: string) => void;
  clear: () => void;
  invalidateByTag: (tag: string) => void;
  prefetch: (key: string, fetcher: () => Promise<T>) => Promise<void>;
  stats: CacheStats;
  compress: (data: T) => string;
  decompress: (compressedData: string) => T;
}

/**
 * Intelligent caching hook with compression, LRU eviction, and tag-based invalidation
 */
export function useIntelligentCache<T = any>(
  config: Partial<CacheConfig> = {}
): UseIntelligentCacheResult<T> {
  const defaultConfig: CacheConfig = {
    maxSize: 50, // 50MB
    maxAge: 5 * 60 * 1000, // 5 minutes
    compressionThreshold: 1024, // 1KB
    enableCompression: true,
    enableLRU: true,
    enableTags: true,
    ...config
  };

  const [stats, setStats] = useState<CacheStats>({
    hits: 0,
    misses: 0,
    size: 0,
    itemCount: 0,
    compressionRatio: 1.0
  });

  const cacheRef = useRef<Map<string, CacheItem<T>>>(new Map());
  const accessOrderRef = useRef<string[]>([]);

  // Compression utilities
  const compress = useCallback((data: T): string => {
    if (!defaultConfig.enableCompression) {
      return JSON.stringify(data);
    }

    const jsonString = JSON.stringify(data);
    
    // Simple compression: remove whitespace and quotes where possible
    let compressed = jsonString.replace(/\s+/g, '');
    
    // More aggressive compression for large data
    if (compressed.length > defaultConfig.compressionThreshold) {
      compressed = compressed.replace(/"/g, '');
    }

    return compressed;
  }, [defaultConfig.enableCompression, defaultConfig.compressionThreshold]);

  const decompress = useCallback((compressedData: string): T => {
    if (!defaultConfig.enableCompression) {
      return JSON.parse(compressedData);
    }

    // Simple decompression: restore basic structure
    let decompressed = compressedData.replace(/([{,])/g, '$1 ').replace(/}/g, ' }');
    
    // Restore quotes if they were removed
    if (!decompressed.includes('"')) {
      decompressed = decompressed.replace(/(\w+):/g, '"$1":');
      decompressed = decompressed.replace(/:\s*([^,}\s]+)/g, ':"$1"');
    }

    return JSON.parse(decompressed);
  }, [defaultConfig.enableCompression]);

  // LRU eviction
  const evictLRU = useCallback(() => {
    if (!defaultConfig.enableLRU || accessOrderRef.current.length === 0) return;

    const lruKey = accessOrderRef.current[0];
    const item = cacheRef.current.get(lruKey);
    
    if (item) {
      cacheRef.current.delete(lruKey);
      accessOrderRef.current.shift();
      
      setStats(prev => ({
        ...prev,
        size: prev.size - item.size,
        itemCount: prev.itemCount - 1
      }));
    }
  }, [defaultConfig.enableLRU]);

  // Update access order for LRU
  const updateAccessOrder = useCallback((key: string) => {
    if (!defaultConfig.enableLRU) return;

    const index = accessOrderRef.current.indexOf(key);
    if (index > -1) {
      accessOrderRef.current.splice(index, 1);
    }
    accessOrderRef.current.push(key);
  }, [defaultConfig.enableLRU]);

  // Check if cache is full
  const isCacheFull = useCallback((newItemSize: number): boolean => {
    const currentSizeMB = stats.size / (1024 * 1024);
    return currentSizeMB + (newItemSize / (1024 * 1024)) > defaultConfig.maxSize;
  }, [stats.size, defaultConfig.maxSize]);

  // Cleanup expired items
  const cleanupExpired = useCallback(() => {
    const now = Date.now();
    const expiredKeys: string[] = [];

    cacheRef.current.forEach((item, key) => {
      if (now > item.expiresAt) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      const item = cacheRef.current.get(key);
      if (item) {
        cacheRef.current.delete(key);
        const index = accessOrderRef.current.indexOf(key);
        if (index > -1) {
          accessOrderRef.current.splice(index, 1);
        }
        
        setStats(prev => ({
          ...prev,
          size: prev.size - item.size,
          itemCount: prev.itemCount - 1
        }));
      }
    });
  }, []);

  // Get item from cache
  const get = useCallback((key: string): T | null => {
    cleanupExpired();
    
    const item = cacheRef.current.get(key);
    if (!item) {
      setStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      cacheRef.current.delete(key);
      setStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    // Update access order for LRU
    updateAccessOrder(key);
    
    // Update access count
    item.accessCount++;
    
    setStats(prev => ({ ...prev, hits: prev.hits + 1 }));
    
    return item.compressed ? decompress(item.data as string) : (item.data as T);
  }, [cleanupExpired, updateAccessOrder, decompress]);

  // Set item in cache
  const set = useCallback((
    key: string, 
    data: T, 
    options: { tags?: string[]; ttl?: number } = {}
  ) => {
    const { tags = [], ttl = defaultConfig.maxAge } = options;
    
    // Compress data if enabled and above threshold
    const originalData = JSON.stringify(data);
    const shouldCompress = defaultConfig.enableCompression && 
                          originalData.length > defaultConfig.compressionThreshold;
    
    const processedData = shouldCompress ? compress(data) : data;
    const dataSize = shouldCompress ? 
      (processedData as string).length : 
      originalData.length;

    // Check if cache is full and evict if necessary
    while (isCacheFull(dataSize) && accessOrderRef.current.length > 0) {
      evictLRU();
    }

    const item: CacheItem<T> = {
      data: processedData,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      accessCount: 0,
      size: dataSize,
      compressed: shouldCompress,
      tags: defaultConfig.enableTags ? tags : []
    };

    cacheRef.current.set(key, item);
    updateAccessOrder(key);

    setStats(prev => ({
      ...prev,
      size: prev.size + dataSize,
      itemCount: prev.itemCount + 1,
      compressionRatio: shouldCompress ? 
        (processedData as string).length / originalData.length : 
        prev.compressionRatio
    }));
  }, [
    defaultConfig.enableCompression, 
    defaultConfig.compressionThreshold, 
    defaultConfig.maxAge, 
    defaultConfig.enableTags,
    compress, 
    isCacheFull, 
    evictLRU, 
    updateAccessOrder
  ]);

  // Check if item exists
  const has = useCallback((key: string): boolean => {
    cleanupExpired();
    return cacheRef.current.has(key);
  }, [cleanupExpired]);

  // Delete item
  const deleteItem = useCallback((key: string) => {
    const item = cacheRef.current.get(key);
    if (item) {
      cacheRef.current.delete(key);
      const index = accessOrderRef.current.indexOf(key);
      if (index > -1) {
        accessOrderRef.current.splice(index, 1);
      }
      
      setStats(prev => ({
        ...prev,
        size: prev.size - item.size,
        itemCount: prev.itemCount - 1
      }));
    }
  }, []);

  // Clear all items
  const clear = useCallback(() => {
    cacheRef.current.clear();
    accessOrderRef.current = [];
    setStats({
      hits: 0,
      misses: 0,
      size: 0,
      itemCount: 0,
      compressionRatio: 1.0
    });
  }, []);

  // Invalidate by tag
  const invalidateByTag = useCallback((tag: string) => {
    if (!defaultConfig.enableTags) return;

    const keysToDelete: string[] = [];
    
    cacheRef.current.forEach((item, key) => {
      if (item.tags.includes(tag)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => deleteItem(key));
  }, [defaultConfig.enableTags, deleteItem]);

  // Prefetch data
  const prefetch = useCallback(async (key: string, fetcher: () => Promise<T>) => {
    if (has(key)) return; // Already cached

    try {
      const data = await fetcher();
      set(key, data);
    } catch (error) {
      console.warn('Prefetch failed for key:', key, error);
    }
  }, [has, set]);

  // Periodic cleanup
  useEffect(() => {
    const interval = setInterval(cleanupExpired, 60000); // Cleanup every minute
    return () => clearInterval(interval);
  }, [cleanupExpired]);

  return {
    get,
    set,
    has,
    delete: deleteItem,
    clear,
    invalidateByTag,
    prefetch,
    stats,
    compress,
    decompress
  };
} 