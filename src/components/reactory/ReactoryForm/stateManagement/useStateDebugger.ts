/**
 * State Debugging Tools for ReactoryForm
 * Phase 1.3: State Management Refactoring
 * 
 * This hook provides comprehensive debugging tools for state management
 * including history tracking, performance monitoring, and state analysis.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ReactoryFormState } from '../types-v2';

// ============================================================================
// DEBUGGER CONFIGURATION
// ============================================================================

interface StateDebuggerConfig {
  /** Whether debugging is enabled */
  enabled?: boolean;
  /** Maximum history size */
  maxHistorySize?: number;
  /** Whether to track performance metrics */
  trackPerformance?: boolean;
  /** Whether to track state changes */
  trackChanges?: boolean;
  /** Whether to enable state validation */
  enableValidation?: boolean;
  /** Whether to enable state compression */
  enableCompression?: boolean;
  /** Debug log level */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// ============================================================================
// DEBUGGER STATE
// ============================================================================

interface StateDebuggerState {
  /** State history */
  history: ReactoryFormState[];
  /** Performance metrics */
  performance: {
    totalUpdates: number;
    averageUpdateTime: number;
    lastUpdateTime: number;
    totalUpdateTime: number;
    slowestUpdate: number;
    fastestUpdate: number;
  };
  /** State change tracking */
  changes: Array<{
    timestamp: number;
    action: string;
    changes: string[];
    stateSize: number;
    duration: number;
  }>;
  /** Validation results */
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    lastValidated: number;
  };
  /** Debug statistics */
  statistics: {
    totalStateSize: number;
    averageStateSize: number;
    largestStateSize: number;
    smallestStateSize: number;
    compressionRatio: number;
  };
}

// ============================================================================
// DEBUGGER RESULT
// ============================================================================

interface StateDebuggerResult {
  /** Current debug state */
  debugState: StateDebuggerState;
  /** Track state change */
  trackChange: (action: string, newState: ReactoryFormState, duration?: number) => void;
  /** Get state history */
  getHistory: () => ReactoryFormState[];
  /** Get performance metrics */
  getPerformance: () => StateDebuggerState['performance'];
  /** Get state statistics */
  getStatistics: () => StateDebuggerState['statistics'];
  /** Validate state */
  validateState: (state: ReactoryFormState) => StateDebuggerState['validation'];
  /** Export debug data */
  exportDebugData: () => string;
  /** Import debug data */
  importDebugData: (data: string) => void;
  /** Clear debug data */
  clearDebugData: () => void;
  /** Get state diff */
  getStateDiff: (oldState: ReactoryFormState, newState: ReactoryFormState) => string[];
  /** Compress state */
  compressState: (state: ReactoryFormState) => string;
  /** Decompress state */
  decompressState: (compressed: string) => ReactoryFormState;
  /** Debug utilities */
  utils: {
    log: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
    time: (label: string) => void;
    timeEnd: (label: string) => void;
  };
}

// ============================================================================
// DEBUGGER HOOK
// ============================================================================

export const useStateDebugger = (
  config: StateDebuggerConfig = {}
): StateDebuggerResult => {
  const {
    enabled = true,
    maxHistorySize = 100,
    trackPerformance = true,
    trackChanges = true,
    enableValidation = true,
    enableCompression = false,
    logLevel = 'info',
  } = config;

  // Debug state
  const [debugState, setDebugState] = useState<StateDebuggerState>({
    history: [],
    performance: {
      totalUpdates: 0,
      averageUpdateTime: 0,
      lastUpdateTime: 0,
      totalUpdateTime: 0,
      slowestUpdate: 0,
      fastestUpdate: Infinity,
    },
    changes: [],
    validation: {
      isValid: true,
      errors: [],
      warnings: [],
      lastValidated: 0,
    },
    statistics: {
      totalStateSize: 0,
      averageStateSize: 0,
      largestStateSize: 0,
      smallestStateSize: Infinity,
      compressionRatio: 0,
    },
  });

  // Refs for timing
  const timersRef = useRef<Map<string, number>>(new Map());
  const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Calculate state size
   */
  const calculateStateSize = useCallback((state: ReactoryFormState): number => {
    return JSON.stringify(state).length;
  }, []);

  /**
   * Validate state structure
   */
  const validateStateStructure = useCallback((state: any): { isValid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!state || typeof state !== 'object') {
      errors.push('State must be an object');
      return { isValid: false, errors, warnings };
    }

    // Required fields
    const requiredFields = ['loading', 'forms', 'uiFramework', 'isValid'];
    requiredFields.forEach(field => {
      if (!(field in state)) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Type checks
    if (typeof state.loading !== 'boolean') {
      errors.push('loading must be a boolean');
    }

    if (!Array.isArray(state.forms)) {
      errors.push('forms must be an array');
    }

    if (typeof state.uiFramework !== 'string') {
      errors.push('uiFramework must be a string');
    }

    if (typeof state.isValid !== 'boolean') {
      errors.push('isValid must be a boolean');
    }

    // Optional field checks
    if (state.metadata && typeof state.metadata !== 'object') {
      warnings.push('metadata should be an object');
    }

    if (state.lastValidated && !(state.lastValidated instanceof Date)) {
      warnings.push('lastValidated should be a Date object');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, []);

  /**
   * Get state diff
   */
  const getStateDiff = useCallback((oldState: ReactoryFormState, newState: ReactoryFormState): string[] => {
    const changes: string[] = [];
    const allKeys = new Set([...Object.keys(oldState), ...Object.keys(newState)]);

    allKeys.forEach(key => {
      if (oldState[key] !== newState[key]) {
        changes.push(key);
      }
    });

    return changes;
  }, []);

  /**
   * Compress state (simple base64 for now)
   */
  const compressState = useCallback((state: ReactoryFormState): string => {
    if (!enableCompression) {
      return JSON.stringify(state);
    }
    return btoa(JSON.stringify(state));
  }, [enableCompression]);

  /**
   * Decompress state
   */
  const decompressState = useCallback((compressed: string): ReactoryFormState => {
    if (!enableCompression) {
      return JSON.parse(compressed);
    }
    return JSON.parse(atob(compressed));
  }, [enableCompression]);

  /**
   * Update statistics
   */
  const updateStatistics = useCallback((state: ReactoryFormState) => {
    const stateSize = calculateStateSize(state);
    const compressedSize = compressState(state).length;
    const compressionRatio = compressedSize / stateSize;

    setDebugState(prev => ({
      ...prev,
      statistics: {
        totalStateSize: prev.statistics.totalStateSize + stateSize,
        averageStateSize: (prev.statistics.totalStateSize + stateSize) / (prev.performance.totalUpdates + 1),
        largestStateSize: Math.max(prev.statistics.largestStateSize, stateSize),
        smallestStateSize: Math.min(prev.statistics.smallestStateSize, stateSize),
        compressionRatio,
      },
    }));
  }, [calculateStateSize, compressState]);

  // ============================================================================
  // DEBUG FUNCTIONS
  // ============================================================================

  /**
   * Track state change
   */
  const trackChange = useCallback((action: string, newState: ReactoryFormState, duration: number = 0) => {
    if (!enabled) return;

    const timestamp = Date.now();
    const stateSize = calculateStateSize(newState);
    const changes = debugState.history.length > 0 
      ? getStateDiff(debugState.history[debugState.history.length - 1], newState)
      : [];

    // Update history
    setDebugState(prev => {
      const newHistory = [...prev.history, newState];
      if (newHistory.length > maxHistorySize) {
        newHistory.splice(0, newHistory.length - maxHistorySize);
      }

      // Update performance metrics
      const newPerformance = { ...prev.performance };
      if (trackPerformance && duration > 0) {
        newPerformance.totalUpdates += 1;
        newPerformance.lastUpdateTime = duration;
        newPerformance.totalUpdateTime += duration;
        newPerformance.averageUpdateTime = newPerformance.totalUpdateTime / newPerformance.totalUpdates;
        newPerformance.slowestUpdate = Math.max(newPerformance.slowestUpdate, duration);
        newPerformance.fastestUpdate = Math.min(newPerformance.fastestUpdate, duration);
      }

      // Update changes tracking
      const newChanges = trackChanges 
        ? [...prev.changes, { timestamp, action, changes, stateSize, duration }]
        : prev.changes;

      return {
        ...prev,
        history: newHistory,
        performance: newPerformance,
        changes: newChanges,
      };
    });

    // Update statistics
    updateStatistics(newState);
  }, [enabled, maxHistorySize, trackPerformance, trackChanges, debugState.history, getStateDiff, calculateStateSize, updateStatistics]);

  /**
   * Validate state
   */
  const validateState = useCallback((state: ReactoryFormState) => {
    if (!enableValidation) {
      return { isValid: true, errors: [], warnings: [], lastValidated: Date.now() };
    }

    const validation = validateStateStructure(state);
    const lastValidated = Date.now();

    setDebugState(prev => ({
      ...prev,
      validation: {
        ...validation,
        lastValidated,
      },
    }));

    return { ...validation, lastValidated };
  }, [enableValidation, validateStateStructure]);

  /**
   * Get history
   */
  const getHistory = useCallback(() => {
    return debugState.history;
  }, [debugState.history]);

  /**
   * Get performance
   */
  const getPerformance = useCallback(() => {
    return debugState.performance;
  }, [debugState.performance]);

  /**
   * Get statistics
   */
  const getStatistics = useCallback(() => {
    return debugState.statistics;
  }, [debugState.statistics]);

  /**
   * Export debug data
   */
  const exportDebugData = useCallback((): string => {
    return JSON.stringify({
      debugState,
      timestamp: Date.now(),
      version: '1.0.0',
    }, null, 2);
  }, [debugState]);

  /**
   * Import debug data
   */
  const importDebugData = useCallback((data: string) => {
    try {
      const parsedData = JSON.parse(data);
      if (parsedData.debugState) {
        setDebugState(parsedData.debugState);
      }
    } catch (error) {
      console.error('Failed to import debug data:', error);
    }
  }, []);

  /**
   * Clear debug data
   */
  const clearDebugData = useCallback(() => {
    setDebugState({
      history: [],
      performance: {
        totalUpdates: 0,
        averageUpdateTime: 0,
        lastUpdateTime: 0,
        totalUpdateTime: 0,
        slowestUpdate: 0,
        fastestUpdate: Infinity,
      },
      changes: [],
      validation: {
        isValid: true,
        errors: [],
        warnings: [],
        lastValidated: 0,
      },
      statistics: {
        totalStateSize: 0,
        averageStateSize: 0,
        largestStateSize: 0,
        smallestStateSize: Infinity,
        compressionRatio: 0,
      },
    });
  }, []);

  // ============================================================================
  // LOGGING UTILITIES
  // ============================================================================

  const log = useCallback((message: string, data?: any) => {
    if (logLevels[logLevel] <= logLevels.info) {
      console.log(`[StateDebugger] ${message}`, data);
    }
  }, [logLevel]);

  const warn = useCallback((message: string, data?: any) => {
    if (logLevels[logLevel] <= logLevels.warn) {
      console.warn(`[StateDebugger] ${message}`, data);
    }
  }, [logLevel]);

  const error = useCallback((message: string, data?: any) => {
    if (logLevels[logLevel] <= logLevels.error) {
      console.error(`[StateDebugger] ${message}`, data);
    }
  }, [logLevel]);

  const time = useCallback((label: string) => {
    timersRef.current.set(label, performance.now());
  }, []);

  const timeEnd = useCallback((label: string) => {
    const startTime = timersRef.current.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      log(`${label}: ${duration.toFixed(2)}ms`);
      timersRef.current.delete(label);
    }
  }, [log]);

  // ============================================================================
  // RETURN OBJECT
  // ============================================================================

  return {
    debugState,
    trackChange,
    getHistory,
    getPerformance,
    getStatistics,
    validateState,
    exportDebugData,
    importDebugData,
    clearDebugData,
    getStateDiff,
    compressState,
    decompressState,
    utils: {
      log,
      warn,
      error,
      time,
      timeEnd,
    },
  };
}; 