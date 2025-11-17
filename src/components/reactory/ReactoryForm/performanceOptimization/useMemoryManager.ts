/**
 * Memory Manager Hook for ReactoryForm
 * Phase 1.4: Performance Optimization
 * 
 * This hook provides comprehensive memory management capabilities
 * including memory monitoring, leak detection, and cleanup utilities.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usedHeapSize: number;
  totalHeapSize: number;
  heapSizeLimit: number;
}

export interface MemoryLeak {
  type: 'event_listener' | 'timer' | 'subscription' | 'closure' | 'unknown';
  description: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
  count: number;
}

export interface MemoryStats {
  currentUsage: number;
  peakUsage: number;
  averageUsage: number;
  usagePercentage: number;
  leakCount: number;
  cleanupCount: number;
  lastCleanup: number;
  memoryPressure: 'low' | 'medium' | 'high';
}

export interface MemoryManagerConfig {
  enabled?: boolean;
  monitorInterval?: number;
  leakDetectionThreshold?: number;
  memoryPressureThreshold?: number;
  autoCleanup?: boolean;
  enableLeakDetection?: boolean;
  enablePressureMonitoring?: boolean;
}

export interface MemoryManagerResult {
  memoryInfo: MemoryInfo;
  memoryStats: MemoryStats;
  leaks: MemoryLeak[];
  isMemoryPressure: boolean;
  getMemoryInfo: () => MemoryInfo;
  getMemoryStats: () => MemoryStats;
  detectLeaks: () => MemoryLeak[];
  cleanup: () => void;
  forceGarbageCollection: () => void;
  monitorMemoryPressure: () => void;
  addCleanupFunction: (fn: () => void, id?: string) => void;
  removeCleanupFunction: (id: string) => void;
  getMemoryUsage: () => number;
  isMemoryUsageHigh: () => boolean;
}

// ============================================================================
// MEMORY MANAGER HOOK
// ============================================================================

export const useMemoryManager = (
  config: MemoryManagerConfig = {}
): MemoryManagerResult => {
  const {
    enabled = true,
    monitorInterval = 5000,
    leakDetectionThreshold = 10 * 1024 * 1024, // 10MB
    memoryPressureThreshold = 80, // 80%
    autoCleanup = true,
    enableLeakDetection = true,
    enablePressureMonitoring = true
  } = config;

  // Refs
  const memoryHistoryRef = useRef<number[]>([]);
  const cleanupFunctionsRef = useRef<Map<string, () => void>>(new Map());
  const leakHistoryRef = useRef<MemoryLeak[]>([]);
  const monitoringIntervalRef = useRef<NodeJS.Timeout>();
  const lastCleanupRef = useRef<number>(0);

  // State
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo>({
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
    usedHeapSize: 0,
    totalHeapSize: 0,
    heapSizeLimit: 0
  });

  const [memoryStats, setMemoryStats] = useState<MemoryStats>({
    currentUsage: 0,
    peakUsage: 0,
    averageUsage: 0,
    usagePercentage: 0,
    leakCount: 0,
    cleanupCount: 0,
    lastCleanup: 0,
    memoryPressure: 'low'
  });

  const [leaks, setLeaks] = useState<MemoryLeak[]>([]);
  const [isMemoryPressure, setIsMemoryPressure] = useState<boolean>(false);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Get current memory information
   */
  const getMemoryInfo = useCallback((): MemoryInfo => {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usedHeapSize: memory.usedJSHeapSize,
        totalHeapSize: memory.totalJSHeapSize,
        heapSizeLimit: memory.jsHeapSizeLimit
      };
    }

    // Fallback for environments without performance.memory
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      usedHeapSize: 0,
      totalHeapSize: 0,
      heapSizeLimit: 0
    };
  }, []);

  /**
   * Calculate memory usage percentage
   */
  const calculateUsagePercentage = useCallback((info: MemoryInfo): number => {
    if (info.jsHeapSizeLimit === 0) return 0;
    return (info.usedJSHeapSize / info.jsHeapSizeLimit) * 100;
  }, []);

  /**
   * Determine memory pressure level
   */
  const getMemoryPressure = useCallback((percentage: number): 'low' | 'medium' | 'high' => {
    if (percentage < 50) return 'low';
    if (percentage < 80) return 'medium';
    return 'high';
  }, []);

  /**
   * Update memory statistics
   */
  const updateMemoryStats = useCallback((info: MemoryInfo) => {
    const usagePercentage = calculateUsagePercentage(info);
    const pressure = getMemoryPressure(usagePercentage);

    // Update history
    memoryHistoryRef.current.push(info.usedJSHeapSize);
    if (memoryHistoryRef.current.length > 100) {
      memoryHistoryRef.current.shift();
    }

    // Calculate statistics
    const currentUsage = info.usedJSHeapSize;
    const peakUsage = Math.max(...memoryHistoryRef.current);
    const averageUsage = memoryHistoryRef.current.reduce((sum, usage) => sum + usage, 0) / memoryHistoryRef.current.length;

    setMemoryStats(prev => ({
      currentUsage,
      peakUsage,
      averageUsage,
      usagePercentage,
      leakCount: prev.leakCount,
      cleanupCount: prev.cleanupCount,
      lastCleanup: prev.lastCleanup,
      memoryPressure: pressure
    }));

    // Check for memory pressure
    setIsMemoryPressure(usagePercentage > memoryPressureThreshold);
  }, [calculateUsagePercentage, getMemoryPressure, memoryPressureThreshold]);

  /**
   * Detect memory leaks
   */
  const detectLeaks = useCallback((): MemoryLeak[] => {
    if (!enableLeakDetection) return [];

    const detectedLeaks: MemoryLeak[] = [];
    const currentTime = Date.now();

    // Check for event listeners (simplified detection)
    const eventListeners = document.querySelectorAll('*');
    if (eventListeners.length > 1000) {
      detectedLeaks.push({
        type: 'event_listener',
        description: `High number of DOM elements with potential event listeners: ${eventListeners.length}`,
        timestamp: currentTime,
        severity: 'medium',
        count: eventListeners.length
      });
    }

    // Check for timers (simplified detection)
    // This is a simplified check - in real implementation you'd track timer IDs
    const mockTimerCount = 50; // Mock timer count for testing
    if (mockTimerCount > 100) {
      detectedLeaks.push({
        type: 'timer',
        description: `High number of active timers detected`,
        timestamp: currentTime,
        severity: 'high',
        count: mockTimerCount
      });
    }

    // Check for memory usage spikes
    const recentUsage = memoryHistoryRef.current.slice(-10);
    if (recentUsage.length >= 10) {
      const averageUsage = recentUsage.reduce((sum, usage) => sum + usage, 0) / recentUsage.length;
      const currentUsage = recentUsage[recentUsage.length - 1];
      
      if (currentUsage > averageUsage * 1.5) {
        detectedLeaks.push({
          type: 'unknown',
          description: `Memory usage spike detected: ${Math.round(currentUsage / 1024 / 1024)}MB`,
          timestamp: currentTime,
          severity: 'medium',
          count: 1
        });
      }
    }

    // Update leak history
    leakHistoryRef.current = [...leakHistoryRef.current, ...detectedLeaks];
    if (leakHistoryRef.current.length > 50) {
      leakHistoryRef.current = leakHistoryRef.current.slice(-50);
    }

    setLeaks(detectedLeaks);
    return detectedLeaks;
  }, [enableLeakDetection]);

  /**
   * Perform memory cleanup
   */
  const cleanup = useCallback(() => {
    console.log('🧹 Performing memory cleanup...');

    // Execute cleanup functions
    let executedCount = 0;
    cleanupFunctionsRef.current.forEach((cleanupFn, id) => {
      try {
        cleanupFn();
        executedCount++;
      } catch (error) {
        console.warn(`Failed to execute cleanup function ${id}:`, error);
      }
    });

    // Clear memory history if too large
    if (memoryHistoryRef.current.length > 200) {
      memoryHistoryRef.current = memoryHistoryRef.current.slice(-100);
    }

    // Clear old leaks
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    leakHistoryRef.current = leakHistoryRef.current.filter(
      leak => leak.timestamp > oneHourAgo
    );

    // Update statistics
    setMemoryStats(prev => ({
      ...prev,
      cleanupCount: prev.cleanupCount + 1,
      lastCleanup: Date.now()
    }));

    console.log(`✅ Memory cleanup completed. Executed ${executedCount} cleanup functions.`);
  }, []);

  /**
   * Force garbage collection (if available)
   */
  const forceGarbageCollection = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
      console.log('🗑️ Forced garbage collection');
    } else {
      console.log('⚠️ Garbage collection not available in this environment');
    }
  }, []);

  /**
   * Monitor memory pressure
   */
  const monitorMemoryPressure = useCallback(() => {
    const info = getMemoryInfo();
    const usagePercentage = calculateUsagePercentage(info);

    if (usagePercentage > memoryPressureThreshold) {
      console.warn(`⚠️ High memory pressure detected: ${usagePercentage.toFixed(1)}%`);
      
      if (autoCleanup) {
        cleanup();
      }
    }
  }, [getMemoryInfo, calculateUsagePercentage, memoryPressureThreshold, autoCleanup, cleanup]);

  /**
   * Add cleanup function
   */
  const addCleanupFunction = useCallback((fn: () => void, id?: string) => {
    const cleanupId = id || `cleanup_${Date.now()}_${Math.random()}`;
    cleanupFunctionsRef.current.set(cleanupId, fn);
    return cleanupId;
  }, []);

  /**
   * Remove cleanup function
   */
  const removeCleanupFunction = useCallback((id: string) => {
    return cleanupFunctionsRef.current.delete(id);
  }, []);

  /**
   * Get current memory usage
   */
  const getMemoryUsage = useCallback((): number => {
    const info = getMemoryInfo();
    return info.usedJSHeapSize;
  }, [getMemoryInfo]);

  /**
   * Check if memory usage is high
   */
  const isMemoryUsageHigh = useCallback((): boolean => {
    const usagePercentage = calculateUsagePercentage(memoryInfo);
    return usagePercentage > memoryPressureThreshold;
  }, [memoryInfo, calculateUsagePercentage, memoryPressureThreshold]);

  /**
   * Get memory statistics
   */
  const getMemoryStats = useCallback((): MemoryStats => {
    return memoryStats;
  }, [memoryStats]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Memory monitoring
  useEffect(() => {
    if (!enabled) return;

    const monitorMemory = () => {
      const info = getMemoryInfo();
      setMemoryInfo(info);
      updateMemoryStats(info);

      if (enablePressureMonitoring) {
        monitorMemoryPressure();
      }

      if (enableLeakDetection) {
        detectLeaks();
      }
    };

    // Initial monitoring
    monitorMemory();

    // Setup monitoring interval
    monitoringIntervalRef.current = setInterval(monitorMemory, monitorInterval);

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, [
    enabled,
    monitorInterval,
    enablePressureMonitoring,
    enableLeakDetection,
    getMemoryInfo,
    updateMemoryStats,
    monitorMemoryPressure,
    detectLeaks
  ]);

  // Auto cleanup on memory pressure
  useEffect(() => {
    if (!enabled || !autoCleanup) return;

    if (isMemoryPressure) {
      const timeout = setTimeout(() => {
        cleanup();
      }, 1000); // Delay cleanup by 1 second

      return () => clearTimeout(timeout);
    }
  }, [enabled, autoCleanup, isMemoryPressure, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Execute all cleanup functions on unmount
      cleanupFunctionsRef.current.forEach((cleanupFn, id) => {
        try {
          cleanupFn();
        } catch (error) {
          console.warn(`Failed to execute cleanup function ${id} on unmount:`, error);
        }
      });

      // Clear monitoring interval
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, []);

  return {
    memoryInfo,
    memoryStats,
    leaks,
    isMemoryPressure,
    getMemoryInfo,
    getMemoryStats,
    detectLeaks,
    cleanup,
    forceGarbageCollection,
    monitorMemoryPressure,
    addCleanupFunction,
    removeCleanupFunction,
    getMemoryUsage,
    isMemoryUsageHigh
  };
}; 