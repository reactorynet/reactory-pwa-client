/**
 * Enhanced Error Handling Hook for ReactoryForm
 * Phase 1.2: Error Handling Enhancement
 * 
 * This hook provides comprehensive error handling capabilities including
 * error tracking, retry mechanisms, error recovery, and user-friendly error messages.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ReactoryComponentError } from '../types-v2';

// ============================================================================
// ERROR HANDLING STATE
// ============================================================================

interface ErrorHandlingState {
  /** Current error */
  error: ReactoryComponentError | null;
  /** Error history */
  errorHistory: ReactoryComponentError[];
  /** Whether a retry is in progress */
  isRetrying: boolean;
  /** Retry count for current error */
  retryCount: number;
  /** Whether error recovery is in progress */
  isRecovering: boolean;
  /** Recovery strategies attempted */
  recoveryStrategies: string[];
  /** Error context */
  context: Record<string, any>;
  /** Error severity */
  severity: 'error' | 'warning' | 'info';
  /** User-friendly error message */
  userMessage: string;
  /** Technical error message */
  technicalMessage: string;
  /** Error timestamp */
  timestamp: Date;
}

// ============================================================================
// ERROR HANDLING OPTIONS
// ============================================================================

interface ErrorHandlingOptions {
  /** Maximum number of retries */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Whether to enable automatic retry */
  enableAutoRetry?: boolean;
  /** Whether to enable error recovery */
  enableErrorRecovery?: boolean;
  /** Custom error handler */
  onError?: (error: ReactoryComponentError) => void;
  /** Custom retry handler */
  onRetry?: (error: ReactoryComponentError) => Promise<void>;
  /** Custom recovery handler */
  onRecovery?: (error: ReactoryComponentError) => Promise<boolean>;
  /** Error context for debugging */
  context?: Record<string, any>;
  /** Component name for error reporting */
  componentName?: string;
  /** Whether to enable error reporting */
  enableErrorReporting?: boolean;
  /** Custom error messages */
  errorMessages?: {
    default?: string;
    network?: string;
    validation?: string;
    runtime?: string;
    unknown?: string;
  };
  /** Recovery strategies */
  recoveryStrategies?: Array<{
    name: string;
    handler: (error: ReactoryComponentError) => Promise<boolean>;
    priority: number;
  }>;
}

// ============================================================================
// ERROR HANDLING RESULT
// ============================================================================

interface ErrorHandlingResult {
  /** Current error state */
  error: ReactoryComponentError | null;
  /** Whether there is an active error */
  hasError: boolean;
  /** Whether a retry is in progress */
  isRetrying: boolean;
  /** Whether error recovery is in progress */
  isRecovering: boolean;
  /** Retry count for current error */
  retryCount: number;
  /** Error history */
  errorHistory: ReactoryComponentError[];
  /** Error severity */
  severity: 'error' | 'warning' | 'info';
  /** User-friendly error message */
  userMessage: string;
  /** Technical error message */
  technicalMessage: string;
  /** Error context */
  context: Record<string, any>;
  /** Handle a new error */
  handleError: (error: Error | ReactoryComponentError, context?: Record<string, any>) => void;
  /** Retry the current error */
  retry: () => Promise<void>;
  /** Attempt error recovery */
  recover: () => Promise<boolean>;
  /** Clear the current error */
  clearError: () => void;
  /** Get error statistics */
  getErrorStats: () => {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    averageRecoveryTime: number;
  };
  /** Reset error handling state */
  reset: () => void;
}

// ============================================================================
// ERROR HANDLING HOOK
// ============================================================================

export const useErrorHandling = (options: ErrorHandlingOptions = {}): ErrorHandlingResult => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    enableAutoRetry = true,
    enableErrorRecovery = true,
    onError,
    onRetry,
    onRecovery,
    context: initialContext = {},
    componentName = 'ReactoryForm',
    enableErrorReporting = false,
    errorMessages = {},
    recoveryStrategies = [],
  } = options;

  // State
  const [state, setState] = useState<ErrorHandlingState>({
    error: null,
    errorHistory: [],
    isRetrying: false,
    retryCount: 0,
    isRecovering: false,
    recoveryStrategies: [],
    context: initialContext,
    severity: 'error',
    userMessage: '',
    technicalMessage: '',
    timestamp: new Date(),
  });

  // Refs
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const recoveryTimeoutRef = useRef<NodeJS.Timeout>();

  // ============================================================================
  // ERROR ANALYSIS METHODS
  // ============================================================================

  const getErrorType = useCallback((error: Error): ReactoryComponentError['errorType'] => {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('http')) {
      return 'network';
    }
    if (message.includes('validation') || message.includes('schema') || message.includes('form')) {
      return 'validation';
    }
    if (name.includes('type') || name.includes('reference')) {
      return 'runtime';
    }
    return 'unknown';
  }, []);

  const getErrorSeverity = useCallback((error: Error): 'error' | 'warning' | 'info' => {
    const type = getErrorType(error);
    
    switch (type) {
      case 'network':
        return 'warning'; // Network errors might be temporary
      case 'validation':
        return 'error'; // Validation errors are critical
      case 'runtime':
        return 'error'; // Runtime errors are critical
      default:
        return 'error';
    }
  }, [getErrorType]);

  const getUserMessage = useCallback((error: Error): string => {
    const type = getErrorType(error);

    switch (type) {
      case 'network':
        return errorMessages.network || 'Network connection issue. Please check your internet connection and try again.';
      case 'validation':
        return errorMessages.validation || 'Form validation error. Please check your input and try again.';
      case 'runtime':
        return errorMessages.runtime || 'An unexpected error occurred. Please refresh the page and try again.';
      default:
        return errorMessages.default || errorMessages.unknown || 'Something went wrong. Please try again.';
    }
  }, [getErrorType, errorMessages]);

  const getTechnicalMessage = useCallback((error: Error): string => {
    return `${error.name}: ${error.message}`;
  }, []);

  // ============================================================================
  // ERROR HANDLING METHODS
  // ============================================================================

  const createEnhancedError = useCallback((
    error: Error | ReactoryComponentError,
    context?: Record<string, any>
  ): ReactoryComponentError => {
    if ('errorType' in error) {
      return error;
    }

    return {
      errorType: getErrorType(error),
      error,
      context: {
        ...state.context,
        ...context,
        componentName,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date(),
      userMessage: getUserMessage(error),
    };
  }, [getErrorType, getUserMessage, state.context, componentName]);

  const handleError = useCallback((
    error: Error | ReactoryComponentError,
    context?: Record<string, any>
  ): void => {
    const enhancedError = createEnhancedError(error, context);
    const severity = getErrorSeverity(enhancedError.error);
    const userMessage = getUserMessage(enhancedError.error);
    const technicalMessage = getTechnicalMessage(enhancedError.error);

    setState(prevState => ({
      ...prevState,
      error: enhancedError,
      errorHistory: [...prevState.errorHistory, enhancedError],
      retryCount: 0,
      severity,
      userMessage,
      technicalMessage,
      timestamp: new Date(),
    }));

    // Call custom error handler
    if (onError) {
      onError(enhancedError);
    }

    // Report error if enabled
    if (enableErrorReporting) {
      reportError(enhancedError);
    }

    // Auto-retry for network errors if enabled
    if (enableAutoRetry && enhancedError.errorType === 'network') {
      setTimeout(() => {
        retry();
      }, retryDelay);
    }
  }, [
    createEnhancedError,
    getErrorSeverity,
    getUserMessage,
    getTechnicalMessage,
    onError,
    enableErrorReporting,
    enableAutoRetry,
    retryDelay,
  ]);

  const retry = useCallback(async (): Promise<void> => {
    if (!state.error || state.isRetrying || state.retryCount >= maxRetries) {
      return;
    }

    setState(prevState => ({
      ...prevState,
      isRetrying: true,
    }));

    try {
      // Call custom retry handler
      if (onRetry) {
        await onRetry(state.error);
      }

      // Clear error after successful retry
      setTimeout(() => {
        setState(prevState => ({
          ...prevState,
          error: null,
          isRetrying: false,
          retryCount: prevState.retryCount + 1,
        }));
      }, retryDelay);
    } catch (retryError) {
      setState(prevState => ({
        ...prevState,
        isRetrying: false,
        retryCount: prevState.retryCount + 1,
      }));

      // Handle retry error
      handleError(retryError as Error, { retryAttempt: state.retryCount + 1 });
    }
  }, [state.error, state.isRetrying, state.retryCount, maxRetries, onRetry, retryDelay, handleError]);

  const recover = useCallback(async (): Promise<boolean> => {
    if (!state.error || state.isRecovering) {
      return false;
    }

    setState(prevState => ({
      ...prevState,
      isRecovering: true,
    }));

    try {
      // Try custom recovery handler first
      if (onRecovery) {
        const recovered = await onRecovery(state.error);
        if (recovered) {
          setState(prevState => ({
            ...prevState,
            error: null,
            isRecovering: false,
            recoveryStrategies: [...prevState.recoveryStrategies, 'custom'],
          }));
          return true;
        }
      }

      // Try built-in recovery strategies
      const sortedStrategies = [...recoveryStrategies].sort((a, b) => b.priority - a.priority);
      
      for (const strategy of sortedStrategies) {
        try {
          const recovered = await strategy.handler(state.error);
          if (recovered) {
            setState(prevState => ({
              ...prevState,
              error: null,
              isRecovering: false,
              recoveryStrategies: [...prevState.recoveryStrategies, strategy.name],
            }));
            return true;
          }
        } catch (strategyError) {
          console.warn(`Recovery strategy ${strategy.name} failed:`, strategyError);
        }
      }

      // No recovery strategy worked
      setState(prevState => ({
        ...prevState,
        isRecovering: false,
      }));

      return false;
    } catch (recoveryError) {
      setState(prevState => ({
        ...prevState,
        isRecovering: false,
      }));

      // Handle recovery error
      handleError(recoveryError as Error, { recoveryAttempt: true });
      return false;
    }
  }, [state.error, state.isRecovering, onRecovery, recoveryStrategies, handleError]);

  const clearError = useCallback((): void => {
    setState(prevState => ({
      ...prevState,
      error: null,
      isRetrying: false,
      isRecovering: false,
      retryCount: 0,
    }));
  }, []);

  const reset = useCallback((): void => {
    setState({
      error: null,
      errorHistory: [],
      isRetrying: false,
      retryCount: 0,
      isRecovering: false,
      recoveryStrategies: [],
      context: initialContext,
      severity: 'error',
      userMessage: '',
      technicalMessage: '',
      timestamp: new Date(),
    });
  }, [initialContext]);

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  const getErrorStats = useCallback(() => {
    const totalErrors = state.errorHistory.length;
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    let totalRecoveryTime = 0;
    let recoveryCount = 0;

    state.errorHistory.forEach(error => {
      // Count by type
      errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1;
      
      // Count by severity
      const severity = getErrorSeverity(error.error);
      errorsBySeverity[severity] = (errorsBySeverity[severity] || 0) + 1;
    });

    const averageRecoveryTime = recoveryCount > 0 ? totalRecoveryTime / recoveryCount : 0;

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      averageRecoveryTime,
    };
  }, [state.errorHistory, getErrorSeverity]);

  const reportError = useCallback((error: ReactoryComponentError): void => {
    // In a real application, this would send the error to an error reporting service
    console.log('Error reported:', {
      error,
      stats: getErrorStats(),
      context: state.context,
    });
  }, [getErrorStats, state.context]);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      // Clear timeouts on unmount
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // RETURN RESULT
  // ============================================================================

  return {
    error: state.error,
    hasError: !!state.error,
    isRetrying: state.isRetrying,
    isRecovering: state.isRecovering,
    retryCount: state.retryCount,
    errorHistory: state.errorHistory,
    severity: state.severity,
    userMessage: state.userMessage,
    technicalMessage: state.technicalMessage,
    context: state.context,
    handleError,
    retry,
    recover,
    clearError,
    getErrorStats,
    reset,
  };
};

// ============================================================================
// BUILT-IN RECOVERY STRATEGIES
// ============================================================================

export const builtInRecoveryStrategies = {
  /** Refresh the page */
  refreshPage: {
    name: 'refreshPage',
    handler: async (error: ReactoryComponentError): Promise<boolean> => {
      if (error.errorType === 'network') {
        window.location.reload();
        return true;
      }
      return false;
    },
    priority: 1,
  },

  /** Clear local storage and retry */
  clearStorage: {
    name: 'clearStorage',
    handler: async (error: ReactoryComponentError): Promise<boolean> => {
      if (error.errorType === 'runtime') {
        localStorage.clear();
        sessionStorage.clear();
        return true;
      }
      return false;
    },
    priority: 2,
  },

  /** Reset form state */
  resetForm: {
    name: 'resetForm',
    handler: async (error: ReactoryComponentError): Promise<boolean> => {
      if (error.errorType === 'validation') {
        // This would be implemented by the form component
        return true;
      }
      return false;
    },
    priority: 3,
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export default useErrorHandling;
export type { ErrorHandlingOptions, ErrorHandlingResult }; 