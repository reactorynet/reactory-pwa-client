import { useState, useCallback, useRef, useEffect } from 'react';

// Types for data prefetching
interface PrefetchItem<T = any> {
  key: string;
  fetcher: () => Promise<T>;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface PrefetchConfig {
  maxConcurrent: number;
  retryDelay: number;
  maxRetries: number;
  enableBehavioral: boolean;
  enablePriority: boolean;
  enableTiming: boolean;
  prefetchDelay: number;
}

interface PrefetchStats {
  queued: number;
  completed: number;
  failed: number;
  inProgress: number;
  successRate: number;
}

interface UseDataPrefetchingResult<T> {
  prefetch: (key: string, fetcher: () => Promise<T>, priority?: 'high' | 'medium' | 'low') => void;
  cancel: (key: string) => void;
  clear: () => void;
  getStats: () => PrefetchStats;
  isPrefetching: (key: string) => boolean;
  trackUserAction: (action: string, context?: any) => void;
}

/**
 * Data prefetching hook with behavioral analysis, priority queuing, and timing optimization
 */
export function useDataPrefetching<T = any>(
  config: Partial<PrefetchConfig> = {}
): UseDataPrefetchingResult<T> {
  const defaultConfig: PrefetchConfig = {
    maxConcurrent: 3,
    retryDelay: 1000,
    maxRetries: 3,
    enableBehavioral: true,
    enablePriority: true,
    enableTiming: true,
    prefetchDelay: 100,
    ...config
  };

  const [stats, setStats] = useState<PrefetchStats>({
    queued: 0,
    completed: 0,
    failed: 0,
    inProgress: 0,
    successRate: 0
  });

  const queueRef = useRef<PrefetchItem<T>[]>([]);
  const inProgressRef = useRef<Set<string>>(new Set());
  const userActionsRef = useRef<Array<{ action: string; context?: any; timestamp: number }>>([]);
  const actionPatternsRef = useRef<Map<string, string[]>>(new Map());

  // Priority order for sorting
  const priorityOrder = { high: 3, medium: 2, low: 1 };

  // Sort queue by priority
  const sortQueue = useCallback(() => {
    if (!defaultConfig.enablePriority) return;

    queueRef.current.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, sort by timestamp (FIFO)
      return a.timestamp - b.timestamp;
    });
  }, [defaultConfig.enablePriority]);

  // Process queue
  const processQueue = useCallback(async () => {
    if (inProgressRef.current.size >= defaultConfig.maxConcurrent) return;

    const availableSlots = defaultConfig.maxConcurrent - inProgressRef.current.size;
    const itemsToProcess = queueRef.current.splice(0, availableSlots);

    for (const item of itemsToProcess) {
      if (inProgressRef.current.has(item.key)) continue;

      inProgressRef.current.add(item.key);
      setStats(prev => ({ ...prev, inProgress: prev.inProgress + 1, queued: prev.queued - 1 }));

      // Process item with retry logic
      processItem(item);
    }
  }, [defaultConfig.maxConcurrent]);

  // Process individual item
  const processItem = useCallback(async (item: PrefetchItem<T>) => {
    try {
      await item.fetcher();
      
      setStats(prev => ({
        ...prev,
        completed: prev.completed + 1,
        inProgress: prev.inProgress - 1,
        successRate: (prev.completed + 1) / (prev.completed + 1 + prev.failed)
      }));
    } catch (error) {
      console.warn('Prefetch failed for key:', item.key, error);
      
      if (item.retryCount < item.maxRetries) {
        item.retryCount++;
        item.timestamp = Date.now() + defaultConfig.retryDelay;
        
        // Re-add to queue for retry
        queueRef.current.push(item);
        setStats(prev => ({ ...prev, queued: prev.queued + 1 }));
      } else {
        setStats(prev => ({
          ...prev,
          failed: prev.failed + 1,
          inProgress: prev.inProgress - 1,
          successRate: prev.completed / (prev.completed + prev.failed + 1)
        }));
      }
    } finally {
      inProgressRef.current.delete(item.key);
    }
  }, [defaultConfig.retryDelay]);

  // Add item to queue
  const addToQueue = useCallback((item: PrefetchItem<T>) => {
    // Check if already in queue or in progress
    const isAlreadyQueued = queueRef.current.some(q => q.key === item.key);
    const isInProgress = inProgressRef.current.has(item.key);
    
    if (isAlreadyQueued || isInProgress) return;

    queueRef.current.push(item);
    setStats(prev => ({ ...prev, queued: prev.queued + 1 }));
    
    sortQueue();
    processQueue();
  }, [sortQueue, processQueue]);

  // Prefetch with delay
  const prefetchWithDelay = useCallback((
    key: string, 
    fetcher: () => Promise<T>, 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ) => {
    if (!defaultConfig.enableTiming) {
      addToQueue({ key, fetcher, priority, timestamp: Date.now(), retryCount: 0, maxRetries: defaultConfig.maxRetries });
      return;
    }

    setTimeout(() => {
      addToQueue({ key, fetcher, priority, timestamp: Date.now(), retryCount: 0, maxRetries: defaultConfig.maxRetries });
    }, defaultConfig.prefetchDelay);
  }, [defaultConfig.enableTiming, defaultConfig.prefetchDelay, defaultConfig.maxRetries, addToQueue]);

  // Behavioral prefetching
  const analyzeUserBehavior = useCallback((action: string, context?: any) => {
    if (!defaultConfig.enableBehavioral) return;

    const now = Date.now();
    const recentActions = userActionsRef.current.filter(
      a => now - a.timestamp < 30000 // Last 30 seconds
    );

    // Track action patterns
    const pattern = recentActions.map(a => a.action).join('->');
    if (!actionPatternsRef.current.has(pattern)) {
      actionPatternsRef.current.set(pattern, []);
    }

    // Predict next likely actions based on patterns
    const predictedActions = predictNextActions(action, context);
    
    // Prefetch data for predicted actions
    predictedActions.forEach(prediction => {
      if (prediction.prefetchKey && prediction.fetcher) {
        prefetchWithDelay(prediction.prefetchKey, prediction.fetcher, prediction.priority);
      }
    });
  }, [defaultConfig.enableBehavioral, prefetchWithDelay]);

  // Predict next actions based on current action and context
  const predictNextActions = useCallback((action: string, context?: any) => {
    const predictions: Array<{ prefetchKey?: string; fetcher?: () => Promise<any>; priority: 'high' | 'medium' | 'low' }> = [];

    // Simple prediction logic based on action patterns
    switch (action) {
      case 'field-focus':
        if (context?.fieldId === 'email') {
          predictions.push({
            prefetchKey: 'email-validation',
            fetcher: () => Promise.resolve({ valid: true }),
            priority: 'high'
          });
          predictions.push({
            prefetchKey: 'email-suggestions',
            fetcher: () => Promise.resolve([]),
            priority: 'medium'
          });
        }
        break;
      
      case 'form-navigation':
        predictions.push({
          prefetchKey: 'form-validation',
          fetcher: () => Promise.resolve({ valid: false, errors: [] }),
          priority: 'high'
        });
        break;
      
      case 'field-blur':
        if (context?.fieldId) {
          predictions.push({
            prefetchKey: `${context.fieldId}-validation`,
            fetcher: () => Promise.resolve({ valid: true }),
            priority: 'medium'
          });
        }
        break;
    }

    return predictions;
  }, []);

  // Main prefetch function
  const prefetch = useCallback((
    key: string, 
    fetcher: () => Promise<T>, 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ) => {
    prefetchWithDelay(key, fetcher, priority);
  }, [prefetchWithDelay]);

  // Cancel prefetch
  const cancel = useCallback((key: string) => {
    // Remove from queue
    queueRef.current = queueRef.current.filter(item => item.key !== key);
    
    // Remove from in progress (will be cleaned up when it completes)
    inProgressRef.current.delete(key);
    
    setStats(prev => ({ ...prev, queued: Math.max(0, prev.queued - 1) }));
  }, []);

  // Clear all prefetches
  const clear = useCallback(() => {
    queueRef.current = [];
    inProgressRef.current.clear();
    userActionsRef.current = [];
    actionPatternsRef.current.clear();
    
    setStats({
      queued: 0,
      completed: 0,
      failed: 0,
      inProgress: 0,
      successRate: 0
    });
  }, []);

  // Get current stats
  const getStats = useCallback((): PrefetchStats => {
    return {
      ...stats,
      queued: queueRef.current.length,
      inProgress: inProgressRef.current.size
    };
  }, [stats]);

  // Check if item is being prefetched
  const isPrefetching = useCallback((key: string): boolean => {
    return inProgressRef.current.has(key) || queueRef.current.some(item => item.key === key);
  }, []);

  // Track user action for behavioral analysis
  const trackUserAction = useCallback((action: string, context?: any) => {
    userActionsRef.current.push({ action, context, timestamp: Date.now() });
    
    // Keep only recent actions (last 100)
    if (userActionsRef.current.length > 100) {
      userActionsRef.current = userActionsRef.current.slice(-100);
    }
    
    analyzeUserBehavior(action, context);
  }, [analyzeUserBehavior]);

  // Process queue periodically
  useEffect(() => {
    const interval = setInterval(processQueue, 100); // Check queue every 100ms
    return () => clearInterval(interval);
  }, [processQueue]);

  return {
    prefetch,
    cancel,
    clear,
    getStats,
    isPrefetching,
    trackUserAction
  };
} 