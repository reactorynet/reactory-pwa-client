/**
 * Centralized State Management Store for ReactoryForm
 * Phase 1.3: State Management Refactoring
 * 
 * This hook provides a centralized state management system with
 * immutability, persistence, debugging, and migration capabilities.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ReactoryFormState } from '../types-v2';

// ============================================================================
// STATE STORE CONFIGURATION
// ============================================================================

interface StateStoreConfig {
  /** Whether to enable persistence */
  enablePersistence?: boolean;
  /** Storage key for persistence */
  storageKey?: string;
  /** Whether to enable debugging */
  enableDebugging?: boolean;
  /** Maximum history size for debugging */
  maxHistorySize?: number;
  /** Whether to enable immutability checks */
  enableImmutabilityChecks?: boolean;
  /** Whether to enable performance monitoring */
  enablePerformanceMonitoring?: boolean;
  /** State version for migration */
  stateVersion?: string;
}

// ============================================================================
// STATE STORE STATE
// ============================================================================

interface StateStoreState {
  /** Current state */
  state: ReactoryFormState;
  /** State history for debugging */
  history: ReactoryFormState[];
  /** Performance metrics */
  performance: {
    updateCount: number;
    lastUpdateTime: number;
    averageUpdateTime: number;
    totalUpdateTime: number;
  };
  /** Debug information */
  debug: {
    isEnabled: boolean;
    historySize: number;
    lastAction: string;
    stateSize: number;
  };
}

// ============================================================================
// STATE STORE RESULT
// ============================================================================

interface StateStoreResult {
  /** Current state */
  state: ReactoryFormState;
  /** Update state function */
  setState: (updates: Partial<ReactoryFormState>) => void;
  /** Reset state to initial */
  resetState: () => void;
  /** Get state selector */
  useSelector: <T>(selector: (state: ReactoryFormState) => T) => T;
  /** Debug information */
  debug: {
    history: ReactoryFormState[];
    performance: StateStoreState['performance'];
    stateSize: number;
    exportState: () => string;
    importState: (stateData: string) => void;
  };
  /** Persistence utilities */
  persistence: {
    save: () => void;
    load: () => void;
    clear: () => void;
    isEnabled: boolean;
  };
  /** Migration utilities */
  migration: {
    migrate: (targetVersion: string) => void;
    getVersion: () => string;
    isMigrationNeeded: () => boolean;
  };
}

// ============================================================================
// STATE STORE HOOK
// ============================================================================

export const useStateStore = (
  initialState: ReactoryFormState,
  config: StateStoreConfig = {}
): StateStoreResult => {
  const {
    enablePersistence = true,
    storageKey = 'reactory-form-state',
    enableDebugging = true,
    maxHistorySize = 50,
    enableImmutabilityChecks = true,
    enablePerformanceMonitoring = true,
    stateVersion = '1.0.0',
  } = config;

  // State management
  const [state, setStateInternal] = useState<ReactoryFormState>(initialState);
  const [history, setHistory] = useState<ReactoryFormState[]>([]);
  const [performance, setPerformance] = useState({
    updateCount: 0,
    lastUpdateTime: 0,
    averageUpdateTime: 0,
    totalUpdateTime: 0,
  });

  // Refs for tracking
  const lastActionRef = useRef<string>('');
  const updateStartTimeRef = useRef<number>(0);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Deep freeze object for immutability checks
   */
  const deepFreeze = useCallback((obj: any): any => {
    if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
      Object.freeze(obj);
      Object.keys(obj).forEach(key => {
        deepFreeze(obj[key]);
      });
    }
    return obj;
  }, []);

  /**
   * Calculate state size
   */
  const calculateStateSize = useCallback((state: ReactoryFormState): number => {
    return JSON.stringify(state).length;
  }, []);

  /**
   * Validate state structure
   */
  const validateState = useCallback((state: any): boolean => {
    return (
      typeof state === 'object' &&
      typeof state.loading === 'boolean' &&
      Array.isArray(state.forms) &&
      typeof state.uiFramework === 'string' &&
      typeof state.isValid === 'boolean'
    );
  }, []);

  /**
   * Create state diff
   */
  const createStateDiff = useCallback((oldState: ReactoryFormState, newState: ReactoryFormState): string[] => {
    const changes: string[] = [];
    Object.keys(newState).forEach(key => {
      if (oldState[key] !== newState[key]) {
        changes.push(key);
      }
    });
    return changes;
  }, []);

  // ============================================================================
  // PERSISTENCE FUNCTIONS
  // ============================================================================

  /**
   * Save state to storage
   */
  const saveToStorage = useCallback(() => {
    if (!enablePersistence) return;

    try {
      const stateData = {
        state,
        version: stateVersion,
        timestamp: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(stateData));
    } catch (error) {
      console.warn('Failed to save state to storage:', error);
    }
  }, [state, enablePersistence, storageKey, stateVersion]);

  /**
   * Load state from storage
   */
  const loadFromStorage = useCallback(() => {
    if (!enablePersistence) return;

    try {
      const storedData = localStorage.getItem(storageKey);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (validateState(parsedData.state)) {
          setStateInternal(parsedData.state);
          return true;
        }
      }
    } catch (error) {
      console.warn('Failed to load state from storage:', error);
    }
    return false;
  }, [enablePersistence, storageKey, validateState]);

  /**
   * Clear stored state
   */
  const clearStorage = useCallback(() => {
    if (!enablePersistence) return;

    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear state from storage:', error);
    }
  }, [enablePersistence, storageKey]);

  // ============================================================================
  // MIGRATION FUNCTIONS
  // ============================================================================

  /**
   * Migrate state to target version
   */
  const migrateState = useCallback((targetVersion: string) => {
    const currentVersion = stateVersion;
    
    if (currentVersion === targetVersion) {
      return;
    }

    // Simple migration logic - can be extended
    const migratedState = { ...state } as ReactoryFormState;
    
    // Add missing fields for newer versions
    if (targetVersion === '1.0.0') {
      if (!('isValid' in migratedState)) {
        (migratedState as any).isValid = true;
      }
      if (!('lastValidated' in migratedState)) {
        (migratedState as any).lastValidated = new Date();
      }
      if (!('lastModified' in migratedState)) {
        (migratedState as any).lastModified = new Date();
      }
      if (!('metadata' in migratedState)) {
        (migratedState as any).metadata = {};
      }
    }

    setStateInternal(migratedState);
  }, [state, stateVersion]);

  /**
   * Check if migration is needed
   */
  const isMigrationNeeded = useCallback(() => {
    try {
      const storedData = localStorage.getItem(storageKey);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        return parsedData.version !== stateVersion;
      }
    } catch (error) {
      console.warn('Failed to check migration status:', error);
    }
    return false;
  }, [storageKey, stateVersion]);

  // ============================================================================
  // STATE UPDATE FUNCTION
  // ============================================================================

  const setState = useCallback((updates: Partial<ReactoryFormState>) => {
    const startTime = globalThis.performance.now();
    lastActionRef.current = 'setState';

    // Validate updates
    if (enableImmutabilityChecks) {
      const testState = { ...state, ...updates };
      if (!validateState(testState)) {
        console.error('Invalid state update:', updates);
        return;
      }
    }

    // Create new state
    const newState = { ...state, ...updates };

    // Update state
    setStateInternal(newState);

    // Update history
    if (enableDebugging) {
      setHistory(prevHistory => {
        const newHistory = [...prevHistory, state];
        if (newHistory.length > maxHistorySize) {
          return newHistory.slice(-maxHistorySize);
        }
        return newHistory;
      });
    }

    // Update performance metrics
    if (enablePerformanceMonitoring) {
      const endTime = globalThis.performance.now();
      const updateTime = endTime - startTime;
      
      setPerformance(prev => ({
        updateCount: prev.updateCount + 1,
        lastUpdateTime: updateTime,
        averageUpdateTime: (prev.totalUpdateTime + updateTime) / (prev.updateCount + 1),
        totalUpdateTime: prev.totalUpdateTime + updateTime,
      }));
    }

    // Save to storage
    if (enablePersistence) {
      saveToStorage();
    }
  }, [
    state,
    enableImmutabilityChecks,
    validateState,
    enableDebugging,
    maxHistorySize,
    enablePerformanceMonitoring,
    enablePersistence,
    saveToStorage,
  ]);

  // ============================================================================
  // RESET FUNCTION
  // ============================================================================

  const resetState = useCallback(() => {
    lastActionRef.current = 'resetState';
    setStateInternal(initialState);
    setHistory([]);
    setPerformance({
      updateCount: 0,
      lastUpdateTime: 0,
      averageUpdateTime: 0,
      totalUpdateTime: 0,
    });
  }, [initialState]);

  // ============================================================================
  // SELECTOR FUNCTION
  // ============================================================================

  const useSelector = useCallback(<T,>(selector: (state: ReactoryFormState) => T): T => {
    return selector(state);
  }, [state]);

  // ============================================================================
  // DEBUG FUNCTIONS
  // ============================================================================

  const exportState = useCallback((): string => {
    return JSON.stringify({
      state,
      version: stateVersion,
      timestamp: Date.now(),
      debug: {
        historySize: history.length,
        performance,
        lastAction: lastActionRef.current,
      },
    }, null, 2);
  }, [state, stateVersion, history, performance]);

  const importState = useCallback((stateData: string) => {
    try {
      const parsedData = JSON.parse(stateData);
      if (validateState(parsedData.state)) {
        setStateInternal(parsedData.state);
        lastActionRef.current = 'importState';
      }
    } catch (error) {
      console.error('Failed to import state:', error);
    }
  }, [validateState]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load state from storage on mount
  useEffect(() => {
    if (enablePersistence) {
      loadFromStorage();
    }
  }, [enablePersistence, loadFromStorage]);

  // Check for migration on mount
  useEffect(() => {
    if (enablePersistence && isMigrationNeeded()) {
      migrateState(stateVersion);
    }
  }, [enablePersistence, isMigrationNeeded, migrateState, stateVersion]);

  // ============================================================================
  // RETURN OBJECT
  // ============================================================================

  return {
    state,
    setState,
    resetState,
    useSelector,
    debug: {
      history,
      performance,
      stateSize: calculateStateSize(state),
      exportState,
      importState,
    },
    persistence: {
      save: saveToStorage,
      load: loadFromStorage,
      clear: clearStorage,
      isEnabled: enablePersistence,
    },
    migration: {
      migrate: migrateState,
      getVersion: () => stateVersion,
      isMigrationNeeded,
    },
  };
}; 