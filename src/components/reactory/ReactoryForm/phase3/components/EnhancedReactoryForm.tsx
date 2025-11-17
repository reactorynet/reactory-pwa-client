/**
 * Phase 3.4: Enhanced ReactoryForm Component
 * Integrates ModernFormField and LoadingSkeleton components with the existing ReactoryForm
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  Grid,
  Paper,
  LinearProgress,
  Typography,
  Alert,
  Snackbar,
  Fade,
  Grow,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import Reactory from '@reactory/reactory-core';
import { useReactory } from '@reactory/client-core/api/ApiProvider';

// Import existing ReactoryForm
import { ReactoryForm } from '../../ReactoryForm';

// Import enhanced components
import ModernFormField from './ModernFormField';
import LoadingSkeleton from './LoadingSkeleton';

// Import animations
import { formAnimations, animationUtils } from '../animations/formAnimations';

// ============================================================================
// TYPES
// ============================================================================

export interface EnhancedReactoryFormProps extends Reactory.Client.IReactoryFormProps<unknown> {
  /** Whether to enable enhanced features */
  enableEnhanced?: boolean;
  /** Whether to show loading skeleton */
  showLoadingSkeleton?: boolean;
  /** Whether to use modern form fields */
  useModernFields?: boolean;
  /** Loading skeleton configuration */
  skeletonConfig?: {
    type?: 'text' | 'rectangular' | 'circular' | 'form' | 'table' | 'card' | 'list' | 'custom';
    animation?: 'pulse' | 'wave' | 'shimmer' | 'fade' | 'slide';
    showProgress?: boolean;
    darkMode?: boolean;
  };
  /** Modern field configuration */
  modernFieldConfig?: {
    animate?: boolean;
    showCharacterCount?: boolean;
    showPasswordToggle?: boolean;
    validateOnBlur?: boolean;
    validateOnChange?: boolean;
  };
  /** Animation configuration */
  animationConfig?: {
    enableAnimations?: boolean;
    performanceMode?: 'normal' | 'reduced' | 'high';
    duration?: number;
  };
  /** Success/Error message configuration */
  messageConfig?: {
    showSuccessMessages?: boolean;
    showErrorMessages?: boolean;
    autoHideDuration?: number;
    position?: 'top' | 'bottom';
  };
  /** Custom CSS class name */
  className?: string;
  /** Custom styles */
  sx?: any;
  /** Whether to show enhanced toolbar */
  showEnhancedToolbar?: boolean;
  /** Whether to show enhanced validation */
  showEnhancedValidation?: boolean;
  /** Whether to show enhanced progress */
  showEnhancedProgress?: boolean;
  /** Custom loading message */
  loadingMessage?: string;
  /** Custom error message */
  errorMessage?: string;
  /** Custom success message */
  successMessage?: string;
  /** Custom warning message */
  warningMessage?: string;
  /** Form state handlers */
  onFormStateChange?: (state: 'loading' | 'error' | 'success' | 'warning') => void;
  /** Custom error handler */
  onEnhancedError?: (error: any) => void;
  /** Custom success handler */
  onEnhancedSuccess?: (data: any) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const EnhancedReactoryForm: React.FC<EnhancedReactoryFormProps> = ({
  enableEnhanced = true,
  showLoadingSkeleton = true,
  useModernFields = true,
  skeletonConfig = {},
  modernFieldConfig = {},
  animationConfig = {},
  messageConfig = {},
  className = '',
  sx = {},
  showEnhancedToolbar = true,
  showEnhancedValidation = true,
  showEnhancedProgress = true,
  loadingMessage = 'Loading form...',
  errorMessage = 'An error occurred while loading the form',
  successMessage = 'Form loaded successfully',
  warningMessage = 'Form loaded with warnings',
  onFormStateChange,
  onEnhancedError,
  onEnhancedSuccess,
  ...formProps
}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [formState, setFormState] = useState<'loading' | 'error' | 'success' | 'warning'>('loading');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [hasSuccess, setHasSuccess] = useState(false);
  const [hasWarning, setHasWarning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const reactory = useReactory();
  const { debug, warning, error } = reactory;

  // ============================================================================
  // ANIMATION CONFIGURATION
  // ============================================================================

  const getAnimationConfig = useCallback(() => {
    if (!animationConfig.enableAnimations) return {};

    const mode = animationConfig.performanceMode || animationUtils.getPerformanceMode();
    const duration = animationConfig.duration || 0.3;

    switch (mode) {
      case 'reduced':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: duration * 0.5 },
        };
      case 'high':
        return {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -20 },
          transition: { duration: duration * 0.8 },
        };
      default:
        return {
          initial: { opacity: 0, scale: 0.95 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.95 },
          transition: { duration },
        };
    }
  }, [animationConfig]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Simulate loading progress
  useEffect(() => {
    if (isLoading && showEnhancedProgress) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsLoading(false);
            setFormState('success');
            setHasSuccess(true);
            setMessage(successMessage);
            setMessageType('success');
            setShowMessage(true);
            onFormStateChange?.('success');
            onEnhancedSuccess?.({ formState: 'success' });
            return 100;
          }
          return prev + 10;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isLoading, showEnhancedProgress, successMessage, onFormStateChange, onEnhancedSuccess]);

  // Handle form state changes
  useEffect(() => {
    if (hasError) {
      setFormState('error');
      setMessage(errorMessage);
      setMessageType('error');
      setShowMessage(true);
      onFormStateChange?.('error');
      onEnhancedError?.({ formState: 'error', message: errorMessage });
    }
  }, [hasError, errorMessage, onFormStateChange, onEnhancedError]);

  useEffect(() => {
    if (hasWarning) {
      setFormState('warning');
      setMessage(warningMessage);
      setMessageType('warning');
      setShowMessage(true);
      onFormStateChange?.('warning');
    }
  }, [hasWarning, warningMessage, onFormStateChange]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleFormError = useCallback((err: any) => {
    debug('EnhancedReactoryForm: Handling form error', err);
    setHasError(true);
    setHasSuccess(false);
    setHasWarning(false);
  }, [debug]);

  const handleFormSuccess = useCallback((data: any) => {
    debug('EnhancedReactoryForm: Handling form success', data);
    setHasSuccess(true);
    setHasError(false);
    setHasWarning(false);
  }, [debug]);

  const handleFormWarning = useCallback((warning: any) => {
    debug('EnhancedReactoryForm: Handling form warning', warning);
    setHasWarning(true);
    setHasError(false);
    setHasSuccess(false);
  }, [debug]);

  const handleMessageClose = useCallback(() => {
    setShowMessage(false);
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderLoadingSkeleton = () => {
    if (!showLoadingSkeleton || !isLoading) return null;

    return (
      <LoadingSkeleton
        loading={isLoading}
        error={hasError}
        success={hasSuccess}
        message={loadingMessage}
        errorMessage={errorMessage}
        successMessage={successMessage}
        showProgress={showEnhancedProgress}
        progress={progress}
        type={skeletonConfig.type || 'form'}
        animation={skeletonConfig.animation || 'pulse'}
        darkMode={skeletonConfig.darkMode || false}
        count={3}
        height={40}
        spacing={2}
        form={true}
        fieldCount={5}
      />
    );
  };

  const renderEnhancedToolbar = () => {
    if (!showEnhancedToolbar) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            mb: 2,
            borderRadius: 1,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" component="h2">
            Enhanced Form
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {hasError && <ErrorIcon color="error" />}
            {hasSuccess && <SuccessIcon color="success" />}
            {hasWarning && <WarningIcon color="warning" />}
            {isLoading && <InfoIcon color="info" />}
          </Box>
        </Box>
      </motion.div>
    );
  };

  const renderEnhancedProgress = () => {
    if (!showEnhancedProgress || !isLoading) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Box sx={{ width: '100%', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              Loading form...
            </Typography>
            <Typography variant="body2" color="text.primary">
              {progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 4, borderRadius: 2 }}
          />
        </Box>
      </motion.div>
    );
  };

  const renderMessageSnackbar = () => {
    if (!messageConfig.showSuccessMessages && !messageConfig.showErrorMessages) return null;

    return (
      <Snackbar
        open={showMessage}
        autoHideDuration={messageConfig.autoHideDuration || 6000}
        onClose={handleMessageClose}
        anchorOrigin={{
          vertical: messageConfig.position === 'top' ? 'top' : 'bottom',
          horizontal: 'center',
        }}
      >
        <Alert
          onClose={handleMessageClose}
          severity={messageType}
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!enableEnhanced) {
    return <ReactoryForm {...formProps} />;
  }

  return (
    <AnimatePresence>
      <motion.div
        {...getAnimationConfig()}
        className={className}
        style={{ width: '100%' }}
      >
        <Box sx={{ width: '100%', ...sx }}>
          {/* Enhanced Toolbar */}
          {renderEnhancedToolbar()}

          {/* Enhanced Progress */}
          {renderEnhancedProgress()}

          {/* Loading Skeleton */}
          {renderLoadingSkeleton()}

          {/* Main Form */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoading ? 0.5 : 1 }}
            transition={{ duration: 0.3 }}
          >
            <ReactoryForm
              {...formProps}
              onError={handleFormError}
              onSubmit={handleFormSuccess}
            />
          </motion.div>

          {/* Message Snackbar */}
          {renderMessageSnackbar()}
        </Box>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default EnhancedReactoryForm; 