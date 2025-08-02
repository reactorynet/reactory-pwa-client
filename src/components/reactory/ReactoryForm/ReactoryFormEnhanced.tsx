/**
 * Enhanced ReactoryForm Component with Error Handling
 * Phase 1.2: Error Handling Enhancement
 * 
 * This component integrates comprehensive error handling with the existing ReactoryForm
 * functionality, providing better user experience and error recovery.
 */

import React, { useCallback, useEffect } from 'react';
import Reactory from '@reactory/reactory-core';
import { useReactory } from '@reactory/client-core/api/ApiProvider';

// Import existing ReactoryForm
import { ReactoryForm } from './ReactoryForm';

// Import enhanced error handling
import ReactoryFormErrorBoundary from './ErrorBoundary';
import { useErrorHandling } from './hooks/useErrorHandling';
import { logError, getErrorStats } from './errorLogging';
import { builtInRecoveryStrategies } from './hooks/useErrorHandling';

// Import enhanced types
import { ReactoryComponentError } from './types-v2';

// ============================================================================
// ENHANCED FORM PROPS
// ============================================================================

interface ReactoryFormEnhancedProps extends Reactory.Client.IReactoryFormProps<unknown> {
  /** Error handling configuration */
  errorHandling?: {
    /** Whether to enable error boundary */
    enableErrorBoundary?: boolean;
    /** Whether to enable automatic retry */
    enableAutoRetry?: boolean;
    /** Whether to enable error recovery */
    enableErrorRecovery?: boolean;
    /** Maximum number of retries */
    maxRetries?: number;
    /** Retry delay in milliseconds */
    retryDelay?: number;
    /** Whether to show technical details */
    showTechnicalDetails?: boolean;
    /** Custom error messages */
    errorMessages?: {
      default?: string;
      network?: string;
      validation?: string;
      runtime?: string;
      unknown?: string;
    };
    /** Custom error handler */
    onError?: (error: ReactoryComponentError) => void;
    /** Custom retry handler */
    onRetry?: (error: ReactoryComponentError) => Promise<void>;
    /** Custom recovery handler */
    onRecovery?: (error: ReactoryComponentError) => Promise<boolean>;
    /** Whether to enable error reporting */
    enableErrorReporting?: boolean;
    /** Error context for debugging */
    context?: Record<string, any>;
  };
  /** Error boundary configuration */
  errorBoundary?: {
    /** Custom error fallback component */
    fallback?: React.ComponentType<any>;
    /** Maximum number of retries */
    maxRetries?: number;
    /** Retry delay in milliseconds */
    retryDelay?: number;
    /** Whether to show technical details */
    showTechnicalDetails?: boolean;
    /** Custom error handler */
    onError?: (error: ReactoryComponentError) => void;
    /** Custom retry handler */
    onRetry?: () => void;
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
  };
}

// ============================================================================
// ENHANCED FORM COMPONENT
// ============================================================================

export const ReactoryFormEnhanced: React.FC<ReactoryFormEnhancedProps> = (props) => {
  const {
    errorHandling = {},
    errorBoundary = {},
    ...formProps
  } = props;

  const reactory = useReactory();
  const { debug, warning, error } = reactory;

  // ============================================================================
  // ERROR HANDLING SETUP
  // ============================================================================

  const errorHandlingConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    enableAutoRetry: true,
    enableErrorRecovery: true,
    enableErrorReporting: true,
    context: {
      formId: formProps.formId,
      mode: formProps.mode,
      componentName: 'ReactoryFormEnhanced',
    },
    recoveryStrategies: [
      builtInRecoveryStrategies.refreshPage,
      builtInRecoveryStrategies.clearStorage,
      builtInRecoveryStrategies.resetForm,
    ],
    ...errorHandling,
  };

  const {
    error: currentError,
    hasError,
    isRetrying,
    isRecovering,
    retryCount,
    errorHistory,
    severity,
    userMessage,
    technicalMessage,
    context,
    handleError,
    retry,
    recover,
    clearError,
    getErrorStats,
    reset,
  } = useErrorHandling(errorHandlingConfig);

  // ============================================================================
  // ERROR HANDLERS
  // ============================================================================

  const handleFormError = useCallback((error: Error | ReactoryComponentError, context?: Record<string, any>) => {
    debug('ReactoryFormEnhanced: Handling error', { error, context });
    
    // Log error
    if ('errorType' in error) {
      logError(error);
    } else {
      logError({
        errorType: 'runtime',
        error,
        context: { ...context, source: 'ReactoryFormEnhanced' },
        timestamp: new Date(),
        userMessage: 'An unexpected error occurred in the form.',
      });
    }

    // Handle error through hook
    handleError(error, context);
  }, [debug, handleError]);

  const handleRetry = useCallback(async () => {
    debug('ReactoryFormEnhanced: Retrying form operation');
    await retry();
  }, [debug, retry]);

  const handleRecovery = useCallback(async () => {
    debug('ReactoryFormEnhanced: Attempting error recovery');
    const recovered = await recover();
    
    if (recovered) {
      debug('ReactoryFormEnhanced: Error recovery successful');
    } else {
      debug('ReactoryFormEnhanced: Error recovery failed');
    }
    
    return recovered;
  }, [debug, recover]);

  const handleErrorClear = useCallback(() => {
    debug('ReactoryFormEnhanced: Clearing error state');
    clearError();
  }, [debug, clearError]);

  // ============================================================================
  // ERROR BOUNDARY HANDLERS
  // ============================================================================

  const handleBoundaryError = useCallback((error: ReactoryComponentError) => {
    debug('ReactoryFormEnhanced: Error boundary caught error', { error });
    
    // Log error
    logError(error);
    
    // Handle through error handling hook
    handleFormError(error);
    
    // Call custom error handler if provided
    if (errorBoundary.onError) {
      errorBoundary.onError(error);
    }
  }, [debug, handleFormError, errorBoundary.onError]);

  const handleBoundaryRetry = useCallback(() => {
    debug('ReactoryFormEnhanced: Error boundary retry triggered');
    
    // Clear error state
    clearError();
    
    // Call custom retry handler if provided
    if (errorBoundary.onRetry) {
      errorBoundary.onRetry();
    }
  }, [debug, clearError, errorBoundary.onRetry]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Log error statistics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (errorHistory.length > 0) {
        const stats = getErrorStats();
        debug('ReactoryFormEnhanced: Error statistics', stats);
      }
    }, 60000); // Log every minute

    return () => clearInterval(interval);
  }, [errorHistory.length, getErrorStats, debug]);

  // Auto-recovery for certain error types
  useEffect(() => {
    if (hasError && currentError && errorHandlingConfig.enableErrorRecovery) {
      const autoRecoveryTypes = ['network', 'runtime'];
      
      if (autoRecoveryTypes.includes(currentError.errorType)) {
        const timer = setTimeout(() => {
          handleRecovery();
        }, 5000); // Auto-recovery after 5 seconds

        return () => clearTimeout(timer);
      }
    }
  }, [hasError, currentError, errorHandlingConfig.enableErrorRecovery, handleRecovery]);

  // ============================================================================
  // ERROR BOUNDARY CONFIGURATION
  // ============================================================================

  const errorBoundaryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    showTechnicalDetails: false,
    componentName: 'ReactoryFormEnhanced',
    enableErrorReporting: true,
    context: {
      formId: formProps.formId,
      mode: formProps.mode,
      componentName: 'ReactoryFormEnhanced',
    },
    errorMessages: {
      default: 'Something went wrong with the form. Please try again.',
      network: 'Network connection issue. Please check your internet connection and try again.',
      validation: 'Form validation error. Please check your input and try again.',
      runtime: 'An unexpected error occurred. Please refresh the page and try again.',
      unknown: 'Something went wrong. Please try again.',
    },
    onError: handleBoundaryError,
    onRetry: handleBoundaryRetry,
    ...errorBoundary,
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // If error boundary is disabled, render form directly
  if (!errorHandlingConfig.enableErrorBoundary) {
    return (
      <ReactoryForm
        {...formProps}
        onError={handleFormError}
      />
    );
  }

  // Render with error boundary
  return (
    <ReactoryFormErrorBoundary {...errorBoundaryConfig}>
      <ReactoryForm
        {...formProps}
        onError={handleFormError}
      />
    </ReactoryFormErrorBoundary>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default ReactoryFormEnhanced;
export type { ReactoryFormEnhancedProps }; 