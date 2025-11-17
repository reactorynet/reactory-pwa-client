import { useState, useCallback, useRef, useEffect } from 'react';

// Types for offline support
interface OfflineData<T = any> {
  data: T;
  timestamp: number;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  maxRetries: number;
}

interface SyncOperation<T = any> {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  key: string;
  data: T;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
  retryCount: number;
  maxRetries: number;
}

interface OfflineConfig {
  enableOfflineStorage: boolean;
  enableSyncQueue: boolean;
  enableConflictResolution: boolean;
  maxRetries: number;
  retryDelay: number;
  syncInterval: number;
  storageKey: string;
}

interface OfflineStats {
  storedItems: number;
  pendingSyncs: number;
  syncedItems: number;
  failedSyncs: number;
  lastSyncTime: number;
  isOnline: boolean;
}

interface UseOfflineSupportResult<T> {
  storeOffline: (key: string, data: T) => void;
  getOfflineData: (key: string) => T | null;
  addToSyncQueue: (operation: Omit<SyncOperation<T>, 'timestamp' | 'retryCount'>) => void;
  syncData: () => Promise<void>;
  resolveConflict: (localData: T, serverData: T) => T;
  getStats: () => OfflineStats;
  clearOfflineData: () => void;
  isOnline: boolean;
}

/**
 * Offline support hook with data storage, sync queue, and conflict resolution
 */
export function useOfflineSupport<T = any>(
  config: Partial<OfflineConfig> = {}
): UseOfflineSupportResult<T> {
  const defaultConfig: OfflineConfig = {
    enableOfflineStorage: true,
    enableSyncQueue: true,
    enableConflictResolution: true,
    maxRetries: 3,
    retryDelay: 1000,
    syncInterval: 30000, // 30 seconds
    storageKey: 'offline-data',
    ...config
  };

  const [stats, setStats] = useState<OfflineStats>({
    storedItems: 0,
    pendingSyncs: 0,
    syncedItems: 0,
    failedSyncs: 0,
    lastSyncTime: 0,
    isOnline: navigator.onLine
  });

  const offlineStorageRef = useRef<Map<string, OfflineData<T>>>(new Map());
  const syncQueueRef = useRef<SyncOperation<T>[]>([]);
  const isOnlineRef = useRef<boolean>(navigator.onLine);

  // Check online status
  const updateOnlineStatus = useCallback(() => {
    const wasOnline = isOnlineRef.current;
    isOnlineRef.current = navigator.onLine;
    
    if (!wasOnline && isOnlineRef.current) {
      // Came back online, trigger sync
      syncData();
    }
    
    setStats(prev => ({ ...prev, isOnline: isOnlineRef.current }));
  }, []);

  // Store data for offline use
  const storeOffline = useCallback((key: string, data: T) => {
    if (!defaultConfig.enableOfflineStorage) return;

    const offlineData: OfflineData<T> = {
      data,
      timestamp: Date.now(),
      syncStatus: 'pending',
      retryCount: 0,
      maxRetries: defaultConfig.maxRetries
    };

    offlineStorageRef.current.set(key, offlineData);
    
    // Persist to localStorage
    try {
      const storageData = JSON.stringify(Array.from(offlineStorageRef.current.entries()));
      localStorage.setItem(defaultConfig.storageKey, storageData);
    } catch (error) {
      console.warn('Failed to persist offline data:', error);
    }

    setStats(prev => ({ ...prev, storedItems: offlineStorageRef.current.size }));
  }, [defaultConfig.enableOfflineStorage, defaultConfig.maxRetries, defaultConfig.storageKey]);

  // Get offline data
  const getOfflineData = useCallback((key: string): T | null => {
    if (!defaultConfig.enableOfflineStorage) return null;

    const offlineData = offlineStorageRef.current.get(key);
    if (!offlineData) return null;

    // Check if data is still valid (not too old)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - offlineData.timestamp > maxAge) {
      offlineStorageRef.current.delete(key);
      return null;
    }

    return offlineData.data;
  }, [defaultConfig.enableOfflineStorage]);

  // Add operation to sync queue
  const addToSyncQueue = useCallback((operation: Omit<SyncOperation<T>, 'timestamp' | 'retryCount'>) => {
    if (!defaultConfig.enableSyncQueue) return;

    const syncOperation: SyncOperation<T> = {
      ...operation,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: defaultConfig.maxRetries
    };

    syncQueueRef.current.push(syncOperation);
    setStats(prev => ({ ...prev, pendingSyncs: syncQueueRef.current.length }));
  }, [defaultConfig.enableSyncQueue, defaultConfig.maxRetries]);

  // Resolve conflicts between local and server data
  const resolveConflict = useCallback((localData: T, serverData: T): T => {
    if (!defaultConfig.enableConflictResolution) {
      // Default: server wins
      return serverData;
    }

    // Simple conflict resolution based on timestamp
    // In a real implementation, this would be more sophisticated
    if (typeof localData === 'object' && typeof serverData === 'object') {
      const localTimestamp = (localData as any).timestamp || 0;
      const serverTimestamp = (serverData as any).timestamp || 0;
      
      return serverTimestamp > localTimestamp ? serverData : localData;
    }

    // For non-object data, server wins
    return serverData;
  }, [defaultConfig.enableConflictResolution]);

  // Sync data with server
  const syncData = useCallback(async (): Promise<void> => {
    if (!isOnlineRef.current || syncQueueRef.current.length === 0) return;

    const operationsToSync = [...syncQueueRef.current];
    syncQueueRef.current = [];

    setStats(prev => ({ ...prev, pendingSyncs: 0 }));

    for (const operation of operationsToSync) {
      try {
        // Simulate server sync
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            // Simulate 90% success rate
            if (Math.random() > 0.1) {
              resolve(true);
            } else {
              reject(new Error('Sync failed'));
            }
          }, 100);
        });

        // Mark as synced
        const offlineData = offlineStorageRef.current.get(operation.key);
        if (offlineData) {
          offlineData.syncStatus = 'synced';
        }

        setStats(prev => ({ 
          ...prev, 
          syncedItems: prev.syncedItems + 1,
          lastSyncTime: Date.now()
        }));

      } catch (error) {
        console.warn('Sync operation failed:', operation, error);
        
        // Retry logic
        if (operation.retryCount < operation.maxRetries) {
          operation.retryCount++;
          operation.timestamp = Date.now() + defaultConfig.retryDelay;
          syncQueueRef.current.push(operation);
        } else {
          // Mark as failed
          const offlineData = offlineStorageRef.current.get(operation.key);
          if (offlineData) {
            offlineData.syncStatus = 'failed';
          }

          setStats(prev => ({ ...prev, failedSyncs: prev.failedSyncs + 1 }));
        }
      }
    }

    setStats(prev => ({ ...prev, pendingSyncs: syncQueueRef.current.length }));
  }, [defaultConfig.retryDelay]);

  // Clear all offline data
  const clearOfflineData = useCallback(() => {
    offlineStorageRef.current.clear();
    syncQueueRef.current = [];
    
    try {
      localStorage.removeItem(defaultConfig.storageKey);
    } catch (error) {
      console.warn('Failed to clear offline data:', error);
    }

    setStats(prev => ({
      ...prev,
      storedItems: 0,
      pendingSyncs: 0,
      syncedItems: 0,
      failedSyncs: 0
    }));
  }, [defaultConfig.storageKey]);

  // Get current stats
  const getStats = useCallback((): OfflineStats => {
    return {
      ...stats,
      storedItems: offlineStorageRef.current.size,
      pendingSyncs: syncQueueRef.current.length,
      isOnline: isOnlineRef.current
    };
  }, [stats]);

  // Load offline data from localStorage on mount
  useEffect(() => {
    if (!defaultConfig.enableOfflineStorage) return;

    try {
      const storedData = localStorage.getItem(defaultConfig.storageKey);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        offlineStorageRef.current = new Map(parsedData);
        setStats(prev => ({ ...prev, storedItems: offlineStorageRef.current.size }));
      }
    } catch (error) {
      console.warn('Failed to load offline data:', error);
    }
  }, [defaultConfig.enableOfflineStorage, defaultConfig.storageKey]);

  // Set up online/offline event listeners
  useEffect(() => {
    const handleOnline = () => updateOnlineStatus();
    const handleOffline = () => updateOnlineStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateOnlineStatus]);

  // Periodic sync when online
  useEffect(() => {
    if (!defaultConfig.enableSyncQueue) return;

    const interval = setInterval(() => {
      if (isOnlineRef.current && syncQueueRef.current.length > 0) {
        syncData();
      }
    }, defaultConfig.syncInterval);

    return () => clearInterval(interval);
  }, [defaultConfig.enableSyncQueue, defaultConfig.syncInterval, syncData]);

  return {
    storeOffline,
    getOfflineData,
    addToSyncQueue,
    syncData,
    resolveConflict,
    getStats,
    clearOfflineData,
    isOnline: isOnlineRef.current
  };
} 