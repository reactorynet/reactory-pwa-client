/**
 * Enhanced Error Boundary for ReactoryForm
 * Phase 1.2: Error Handling Enhancement
 * 
 * This component provides comprehensive error handling for ReactoryForm components
 * with retry mechanisms, error reporting, and user-friendly error messages.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Card,
  CardContent,
  Typography,
  Box,
  Collapse,
  IconButton,
  Stack,
  Chip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  BugReport as BugReportIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { ReactoryComponentError } from './types-v2';

// ============================================================================
// ERROR BOUNDARY STATE
// ============================================================================

interface ErrorBoundaryState {
  /** Whether an error has occurred */
  hasError: boolean;
  /** The error that occurred */
  error: Error | null;
  /** Error information for reporting */
  errorInfo: ErrorInfo | null;
  /** Whether error details are expanded */
  isExpanded: boolean;
  /** Retry count */
  retryCount: number;
  /** Whether a retry is in progress */
  isRetrying: boolean;
  /** Error context */
  errorContext: Record<string, any>;
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
// ERROR BOUNDARY PROPS
// ============================================================================

interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Custom error fallback component */
  fallback?: React.ComponentType<ErrorFallbackProps>;
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
}

// ============================================================================
// ERROR FALLBACK PROPS
// ============================================================================

interface ErrorFallbackProps {
  /** The error that occurred */
  error: Error;
  /** Error information */
  errorInfo: ErrorInfo;
  /** Retry function */
  retry: () => void;
  /** Whether retry is in progress */
  isRetrying: boolean;
  /** Retry count */
  retryCount: number;
  /** Maximum retries */
  maxRetries: number;
  /** Error context */
  context: Record<string, any>;
  /** Error severity */
  severity: 'error' | 'warning' | 'info';
  /** User-friendly message */
  userMessage: string;
  /** Technical message */
  technicalMessage: string;
  /** Whether to show technical details */
  showTechnicalDetails: boolean;
  /** Toggle technical details */
  toggleTechnicalDetails: () => void;
}

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

export class ReactoryFormErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout?: NodeJS.Timeout;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isExpanded: false,
      retryCount: 0,
      isRetrying: false,
      errorContext: props.context || {},
      severity: 'error',
      userMessage: '',
      technicalMessage: '',
      timestamp: new Date(),
    };
  }

  // ============================================================================
  // LIFECYCLE METHODS
  // ============================================================================

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      timestamp: new Date(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error information
    this.setState({
      errorInfo,
      severity: this.getErrorSeverity(error),
      userMessage: this.getUserMessage(error),
      technicalMessage: this.getTechnicalMessage(error),
    });

    // Create enhanced error object
    const enhancedError: ReactoryComponentError = {
      errorType: this.getErrorType(error),
      error,
      context: {
        ...this.state.errorContext,
        componentName: this.props.componentName || 'ReactoryForm',
        errorInfo: errorInfo.componentStack,
        retryCount: this.state.retryCount,
      },
      timestamp: new Date(),
      userMessage: this.getUserMessage(error),
    };

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(enhancedError);
    }

    // Log error for debugging
    console.error('ReactoryForm Error Boundary caught an error:', {
      error,
      errorInfo,
      context: this.state.errorContext,
      componentName: this.props.componentName,
    });

    // Report error if enabled
    if (this.props.enableErrorReporting) {
      this.reportError(enhancedError);
    }
  }

  componentWillUnmount(): void {
    // Clear any pending retry timeouts
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  // ============================================================================
  // ERROR ANALYSIS METHODS
  // ============================================================================

  private getErrorType(error: Error): ReactoryComponentError['errorType'] {
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
  }

  private getErrorSeverity(error: Error): 'error' | 'warning' | 'info' {
    const type = this.getErrorType(error);
    
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
  }

  private getUserMessage(error: Error): string {
    const type = this.getErrorType(error);
    const customMessages = this.props.errorMessages || {};

    switch (type) {
      case 'network':
        return customMessages.network || 'Network connection issue. Please check your internet connection and try again.';
      case 'validation':
        return customMessages.validation || 'Form validation error. Please check your input and try again.';
      case 'runtime':
        return customMessages.runtime || 'An unexpected error occurred. Please refresh the page and try again.';
      default:
        return customMessages.default || customMessages.unknown || 'Something went wrong. Please try again.';
    }
  }

  private getTechnicalMessage(error: Error): string {
    return `${error.name}: ${error.message}`;
  }

  // ============================================================================
  // ERROR HANDLING METHODS
  // ============================================================================

  private handleRetry = (): void => {
    const { maxRetries = 3, retryDelay = 1000 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    this.setState({ isRetrying: true });

    // Call custom retry handler
    if (this.props.onRetry) {
      this.props.onRetry();
    }

    // Clear error state after delay
    this.retryTimeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
        isRetrying: false,
      });
    }, retryDelay);
  };

  private toggleTechnicalDetails = (): void => {
    this.setState(prevState => ({
      isExpanded: !prevState.isExpanded,
    }));
  };

  private reportError = (error: ReactoryComponentError): void => {
    // In a real application, this would send the error to an error reporting service
    console.log('Error reported:', error);
  };

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  private renderErrorIcon(): React.ReactNode {
    const { severity } = this.state;

    switch (severity) {
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      default:
        return <ErrorIcon color="error" />;
    }
  }

  private renderDefaultFallback(): React.ReactNode {
    const {
      error,
      errorInfo,
      isRetrying,
      retryCount,
      severity,
      userMessage,
      technicalMessage,
      isExpanded,
    } = this.state;

    const { maxRetries = 3, showTechnicalDetails = false } = this.props;

    if (!error) return null;

    return (
      <Card variant="outlined" sx={{ m: 2, borderColor: 'error.main' }}>
        <CardContent>
          <Stack spacing={2}>
            {/* Error Header */}
            <Box display="flex" alignItems="center" gap={1}>
              {this.renderErrorIcon()}
              <Typography variant="h6" color="error">
                Form Error
              </Typography>
              <Chip
                label={severity}
                size="small"
                color={severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'info'}
              />
            </Box>

            {/* User Message */}
            <Alert severity={severity}>
              <AlertTitle>Error Details</AlertTitle>
              {userMessage}
            </Alert>

            {/* Retry Section */}
            <Box display="flex" alignItems="center" gap={2}>
              <Button
                variant="contained"
                onClick={this.handleRetry}
                disabled={isRetrying || retryCount >= maxRetries}
                startIcon={<RefreshIcon />}
              >
                {isRetrying ? 'Retrying...' : 'Retry'}
              </Button>
              {retryCount > 0 && (
                <Typography variant="body2" color="text.secondary">
                  Attempt {retryCount} of {maxRetries}
                </Typography>
              )}
            </Box>

            {/* Technical Details */}
            {showTechnicalDetails && (
              <Box>
                <Button
                  startIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={this.toggleTechnicalDetails}
                  size="small"
                >
                  {isExpanded ? 'Hide' : 'Show'} Technical Details
                </Button>
                
                <Collapse in={isExpanded}>
                  <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
                    <Typography variant="subtitle2" gutterBottom>
                      Technical Error:
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace" color="error">
                      {technicalMessage}
                    </Typography>
                    
                    {errorInfo && (
                      <>
                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                          Component Stack:
                        </Typography>
                        <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                          {errorInfo.componentStack}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Collapse>
              </Box>
            )}

            {/* Error Context */}
            {Object.keys(this.state.errorContext).length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Error Context:
                </Typography>
                <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                  {JSON.stringify(this.state.errorContext, null, 2)}
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  render(): React.ReactNode {
    const { children, fallback } = this.props;
    const { hasError, error, errorInfo, isRetrying, retryCount, severity, userMessage, technicalMessage, isExpanded } = this.state;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        const FallbackComponent = fallback;
        return (
          <FallbackComponent
            error={error!}
            errorInfo={errorInfo!}
            retry={this.handleRetry}
            isRetrying={isRetrying}
            retryCount={retryCount}
            maxRetries={this.props.maxRetries || 3}
            context={this.state.errorContext}
            severity={severity}
            userMessage={userMessage}
            technicalMessage={technicalMessage}
            showTechnicalDetails={this.props.showTechnicalDetails || false}
            toggleTechnicalDetails={this.toggleTechnicalDetails}
          />
        );
      }

      // Use default fallback
      return this.renderDefaultFallback();
    }

    return children;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ReactoryFormErrorBoundary;
export type { ErrorBoundaryProps, ErrorFallbackProps }; 