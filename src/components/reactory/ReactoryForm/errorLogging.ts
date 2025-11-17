/**
 * Enhanced Error Logging Utility for ReactoryForm
 * Phase 1.2: Error Handling Enhancement
 * 
 * This utility provides comprehensive error logging capabilities including
 * error categorization, performance tracking, and user analytics.
 */

import { ReactoryComponentError } from './types-v2';

// ============================================================================
// ERROR LOGGING CONFIGURATION
// ============================================================================

interface ErrorLoggingConfig {
  /** Whether error logging is enabled */
  enabled: boolean;
  /** Log level for error reporting */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** Whether to include stack traces */
  includeStackTraces: boolean;
  /** Whether to include user context */
  includeUserContext: boolean;
  /** Whether to include performance metrics */
  includePerformanceMetrics: boolean;
  /** Maximum number of errors to keep in memory */
  maxErrorHistory: number;
  /** Error reporting endpoint */
  reportingEndpoint?: string;
  /** Custom error formatter */
  formatter?: (error: ReactoryComponentError) => any;
  /** Error filters */
  filters?: Array<(error: ReactoryComponentError) => boolean>;
}

// ============================================================================
// ERROR LOGGING STATE
// ============================================================================

interface ErrorLoggingState {
  /** Error history */
  errorHistory: ReactoryComponentError[];
  /** Performance metrics */
  performanceMetrics: {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    averageRecoveryTime: number;
    lastErrorTime: Date | null;
  };
  /** User context */
  userContext: Record<string, any>;
  /** Session information */
  sessionInfo: {
    sessionId: string;
    startTime: Date;
    userAgent: string;
    url: string;
  };
}

// ============================================================================
// ERROR LOGGING CLASS
// ============================================================================

export class ReactoryFormErrorLogger {
  private config: ErrorLoggingConfig;
  private state: ErrorLoggingState;
  private sessionId: string;

  constructor(config: Partial<ErrorLoggingConfig> = {}) {
    this.config = {
      enabled: true,
      logLevel: 'error',
      includeStackTraces: true,
      includeUserContext: true,
      includePerformanceMetrics: true,
      maxErrorHistory: 100,
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.state = {
      errorHistory: [],
      performanceMetrics: {
        totalErrors: 0,
        errorsByType: {},
        errorsBySeverity: {},
        averageRecoveryTime: 0,
        lastErrorTime: null,
      },
      userContext: this.getUserContext(),
      sessionInfo: {
        sessionId: this.sessionId,
        startTime: new Date(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
    };
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUserContext(): Record<string, any> {
    if (!this.config.includeUserContext) {
      return {};
    }

    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      online: navigator.onLine,
    };
  }

  // ============================================================================
  // ERROR LOGGING METHODS
  // ============================================================================

  /**
   * Log an error with enhanced context
   */
  logError(error: ReactoryComponentError): void {
    if (!this.config.enabled) {
      return;
    }

    // Apply filters
    if (this.config.filters && this.config.filters.some(filter => !filter(error))) {
      return;
    }

    // Add to error history
    this.state.errorHistory.push(error);
    if (this.state.errorHistory.length > this.config.maxErrorHistory) {
      this.state.errorHistory.shift();
    }

    // Update performance metrics
    this.updatePerformanceMetrics(error);

    // Format error for logging
    const formattedError = this.formatError(error);

    // Log based on level
    this.logByLevel(formattedError);

    // Report error if endpoint is configured
    if (this.config.reportingEndpoint) {
      this.reportError(formattedError);
    }
  }

  /**
   * Log multiple errors
   */
  logErrors(errors: ReactoryComponentError[]): void {
    errors.forEach(error => this.logError(error));
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.state.errorHistory = [];
    this.resetPerformanceMetrics();
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      ...this.state.performanceMetrics,
      errorHistory: this.state.errorHistory,
      sessionInfo: this.state.sessionInfo,
      userContext: this.state.userContext,
    };
  }

  /**
   * Export error data
   */
  exportErrorData(): string {
    return JSON.stringify({
      sessionInfo: this.state.sessionInfo,
      userContext: this.state.userContext,
      performanceMetrics: this.state.performanceMetrics,
      errorHistory: this.state.errorHistory,
      exportTime: new Date().toISOString(),
    }, null, 2);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private updatePerformanceMetrics(error: ReactoryComponentError): void {
    const metrics = this.state.performanceMetrics;

    // Update total errors
    metrics.totalErrors++;

    // Update errors by type
    metrics.errorsByType[error.errorType] = (metrics.errorsByType[error.errorType] || 0) + 1;

    // Update errors by severity (if available)
    const severity = this.getErrorSeverity(error);
    metrics.errorsBySeverity[severity] = (metrics.errorsBySeverity[severity] || 0) + 1;

    // Update last error time
    metrics.lastErrorTime = new Date();

    // Calculate average recovery time (if recovery time is available)
    if (error.context?.recoveryTime) {
      const recoveryTimes = this.state.errorHistory
        .map(e => e.context?.recoveryTime)
        .filter(t => t !== undefined);
      
      if (recoveryTimes.length > 0) {
        const totalRecoveryTime = recoveryTimes.reduce((sum, time) => sum + time, 0);
        metrics.averageRecoveryTime = totalRecoveryTime / recoveryTimes.length;
      }
    }
  }

  private resetPerformanceMetrics(): void {
    this.state.performanceMetrics = {
      totalErrors: 0,
      errorsByType: {},
      errorsBySeverity: {},
      averageRecoveryTime: 0,
      lastErrorTime: null,
    };
  }

  private getErrorSeverity(error: ReactoryComponentError): string {
    const message = error.error.message.toLowerCase();
    const name = error.error.name.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('http')) {
      return 'warning';
    }
    if (message.includes('validation') || message.includes('schema') || message.includes('form')) {
      return 'error';
    }
    if (name.includes('type') || name.includes('reference')) {
      return 'error';
    }
    return 'error';
  }

  private formatError(error: ReactoryComponentError): any {
    const baseError: any = {
      errorType: error.errorType,
      message: error.error.message,
      name: error.error.name,
      timestamp: error.timestamp.toISOString(),
      userMessage: error.userMessage,
      context: {
        ...error.context,
        sessionId: this.sessionId,
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    };

    // Add stack trace if enabled
    if (this.config.includeStackTraces && error.error.stack) {
      baseError.stack = error.error.stack;
    }

    // Add performance metrics if enabled
    if (this.config.includePerformanceMetrics) {
      baseError.performanceMetrics = this.state.performanceMetrics;
    }

    // Use custom formatter if provided
    if (this.config.formatter) {
      return this.config.formatter(error);
    }

    return baseError;
  }

  private logByLevel(formattedError: any): void {
    const { logLevel } = this.config;

    switch (logLevel) {
      case 'debug':
        console.debug('ReactoryForm Error:', formattedError);
        break;
      case 'info':
        console.info('ReactoryForm Error:', formattedError);
        break;
      case 'warn':
        console.warn('ReactoryForm Error:', formattedError);
        break;
      case 'error':
      default:
        console.error('ReactoryForm Error:', formattedError);
        break;
    }
  }

  private async reportError(formattedError: any): Promise<void> {
    if (!this.config.reportingEndpoint) {
      return;
    }

    try {
      const response = await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedError),
      });

      if (!response.ok) {
        console.warn('Failed to report error to endpoint:', response.status);
      }
    } catch (reportError) {
      console.warn('Failed to report error:', reportError);
    }
  }
}

// ============================================================================
// ERROR FILTERS
// ============================================================================

export const errorFilters = {
  /** Filter out network errors */
  excludeNetworkErrors: (error: ReactoryComponentError) => error.errorType !== 'network',
  
  /** Filter out validation errors */
  excludeValidationErrors: (error: ReactoryComponentError) => error.errorType !== 'validation',
  
  /** Filter out runtime errors */
  excludeRuntimeErrors: (error: ReactoryComponentError) => error.errorType !== 'runtime',
  
  /** Only include errors with stack traces */
  onlyWithStackTraces: (error: ReactoryComponentError) => !!error.error.stack,
  
  /** Only include errors from specific components */
  fromComponent: (componentName: string) => (error: ReactoryComponentError) => 
    error.context?.componentName === componentName,
  
  /** Only include errors after a specific time */
  afterTime: (timestamp: Date) => (error: ReactoryComponentError) => 
    error.timestamp > timestamp,
  
  /** Only include errors with specific severity */
  withSeverity: (severity: string) => (error: ReactoryComponentError) => {
    const errorSeverity = error.error.message.toLowerCase().includes('network') ? 'warning' : 'error';
    return errorSeverity === severity;
  },
};

// ============================================================================
// ERROR FORMATTERS
// ============================================================================

export const errorFormatters = {
  /** Simple formatter */
  simple: (error: ReactoryComponentError) => ({
    type: error.errorType,
    message: error.error.message,
    timestamp: error.timestamp.toISOString(),
  }),

  /** Detailed formatter */
  detailed: (error: ReactoryComponentError) => ({
    errorType: error.errorType,
    error: {
      name: error.error.name,
      message: error.error.message,
      stack: error.error.stack,
    },
    context: error.context,
    userMessage: error.userMessage,
    timestamp: error.timestamp.toISOString(),
  }),

  /** JSON formatter for API reporting */
  json: (error: ReactoryComponentError) => ({
    error_type: error.errorType,
    error_message: error.error.message,
    error_name: error.error.name,
    user_message: error.userMessage,
    timestamp: error.timestamp.toISOString(),
    context: error.context,
  }),
};

// ============================================================================
// ERROR LOGGING INSTANCE
// ============================================================================

// Create a default error logger instance
export const defaultErrorLogger = new ReactoryFormErrorLogger({
  enabled: true,
  logLevel: 'error',
  includeStackTraces: true,
  includeUserContext: true,
  includePerformanceMetrics: true,
  maxErrorHistory: 50,
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a new error logger with custom configuration
 */
export const createErrorLogger = (config: Partial<ErrorLoggingConfig> = {}): ReactoryFormErrorLogger => {
  return new ReactoryFormErrorLogger(config);
};

/**
 * Log an error using the default logger
 */
export const logError = (error: ReactoryComponentError): void => {
  defaultErrorLogger.logError(error);
};

/**
 * Get error statistics from the default logger
 */
export const getErrorStats = () => {
  return defaultErrorLogger.getErrorStats();
};

/**
 * Export error data from the default logger
 */
export const exportErrorData = (): string => {
  return defaultErrorLogger.exportErrorData();
};

// ============================================================================
// EXPORTS
// ============================================================================

export default ReactoryFormErrorLogger;
export type { ErrorLoggingConfig, ErrorLoggingState }; 