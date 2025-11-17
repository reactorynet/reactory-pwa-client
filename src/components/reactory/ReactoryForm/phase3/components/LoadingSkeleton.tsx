/**
 * Phase 3.3: LoadingSkeleton Component
 * Enhanced loading skeleton component with animations and modern UX
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Skeleton,
  Typography,
  Paper,
  Grid,
  Chip,
  Avatar,
  LinearProgress,
  CircularProgress,
  Fade,
  Grow,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { formAnimations, animationUtils } from '../animations/formAnimations';

// ============================================================================
// TYPES
// ============================================================================

export interface LoadingSkeletonProps {
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: boolean;
  /** Success state */
  success?: boolean;
  /** Loading message */
  message?: string;
  /** Error message */
  errorMessage?: string;
  /** Success message */
  successMessage?: string;
  /** Skeleton type */
  type?: 'text' | 'rectangular' | 'circular' | 'form' | 'table' | 'card' | 'list' | 'custom';
  /** Number of skeleton items */
  count?: number;
  /** Skeleton height */
  height?: number | string;
  /** Skeleton width */
  width?: number | string;
  /** Animation variant */
  animation?: 'pulse' | 'wave' | 'shimmer' | 'fade' | 'slide';
  /** Animation duration */
  duration?: number;
  /** Whether to show progress */
  showProgress?: boolean;
  /** Progress value (0-100) */
  progress?: number;
  /** Whether to show retry button */
  showRetry?: boolean;
  /** Retry handler */
  onRetry?: () => void;
  /** Custom skeleton content */
  children?: React.ReactNode;
  /** Custom CSS class name */
  className?: string;
  /** Skeleton variant */
  variant?: 'text' | 'rectangular' | 'circular';
  /** Whether to show animations */
  animate?: boolean;
  /** Loading icon */
  icon?: React.ReactNode;
  /** Error icon */
  errorIcon?: React.ReactNode;
  /** Success icon */
  successIcon?: React.ReactNode;
  /** Custom styles */
  sx?: any;
  /** Whether to show skeleton in dark mode */
  darkMode?: boolean;
  /** Skeleton spacing */
  spacing?: number;
  /** Whether to show skeleton in grid layout */
  grid?: boolean;
  /** Grid columns */
  columns?: number;
  /** Whether to show skeleton in list layout */
  list?: boolean;
  /** List item height */
  itemHeight?: number;
  /** Whether to show skeleton in card layout */
  card?: boolean;
  /** Card padding */
  cardPadding?: number;
  /** Whether to show skeleton in form layout */
  form?: boolean;
  /** Form field count */
  fieldCount?: number;
  /** Whether to show skeleton in table layout */
  table?: boolean;
  /** Table row count */
  rowCount?: number;
  /** Table column count */
  columnCount?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  loading = true,
  error = false,
  success = false,
  message = 'Loading...',
  errorMessage = 'An error occurred',
  successMessage = 'Completed successfully',
  type = 'text',
  count = 1,
  height = 20,
  width = '100%',
  animation = 'pulse',
  duration = 1.5,
  showProgress = false,
  progress = 0,
  showRetry = false,
  onRetry,
  children,
  className = '',
  variant = 'text',
  animate = true,
  icon,
  errorIcon,
  successIcon,
  sx = {},
  darkMode = false,
  spacing = 1,
  grid = false,
  columns = 3,
  list = false,
  itemHeight = 60,
  card = false,
  cardPadding = 2,
  form = false,
  fieldCount = 3,
  table = false,
  rowCount = 5,
  columnCount = 4,
}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [currentProgress, setCurrentProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Simulate progress animation
  useEffect(() => {
    if (showProgress && loading) {
      const interval = setInterval(() => {
        setCurrentProgress((prev) => {
          if (prev >= progress) {
            clearInterval(interval);
            return progress;
          }
          return prev + 1;
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [showProgress, loading, progress]);

  // Visibility animation
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // ============================================================================
  // ANIMATION CONFIGURATION
  // ============================================================================

  const getAnimationConfig = () => {
    if (!animate) return {};

    const mode = animationUtils.getPerformanceMode();
    const baseConfig = {
      pulse: {
        initial: { opacity: 0.6 },
        animate: { opacity: 1 },
        transition: { duration, repeat: Infinity, repeatType: 'reverse' as const },
      },
      wave: {
        initial: { x: '-100%' },
        animate: { x: '100%' },
        transition: { duration, repeat: Infinity, ease: 'easeInOut' },
      },
      shimmer: {
        initial: { backgroundPosition: '-200% 0' },
        animate: { backgroundPosition: '200% 0' },
        transition: { duration, repeat: Infinity, ease: 'linear' },
      },
      fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.5 },
      },
      slide: {
        initial: { x: -20, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: 20, opacity: 0 },
        transition: { duration: 0.3 },
      },
    };

    return baseConfig[animation] || baseConfig.pulse;
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderSkeletonItem = (index: number) => {
    const animationConfig = getAnimationConfig();
    const skeletonProps = {
      variant,
      height,
      width: typeof width === 'number' ? `${width}px` : width,
      sx: {
        ...sx,
        ...(animation === 'shimmer' && {
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
        }),
      },
    };

    if (animate) {
      return (
        <motion.div
          key={index}
          {...animationConfig}
          style={{ marginBottom: spacing * 8 }}
        >
          <Skeleton {...skeletonProps} />
        </motion.div>
      );
    }

    return (
      <Skeleton
        key={index}
        {...skeletonProps}
        sx={{ ...skeletonProps.sx, mb: spacing }}
      />
    );
  };

  const renderFormSkeleton = () => (
    <Box sx={{ p: cardPadding }}>
      {Array.from({ length: fieldCount }).map((_, index) => (
        <Box key={index} sx={{ mb: 2 }}>
          <Skeleton variant="text" width="30%" height={20} />
          <Skeleton variant="rectangular" height={40} sx={{ mt: 1 }} />
        </Box>
      ))}
    </Box>
  );

  const renderTableSkeleton = () => (
    <Box sx={{ p: cardPadding }}>
      {/* Header */}
      <Box sx={{ display: 'flex', mb: 2 }}>
        {Array.from({ length: columnCount }).map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            width={`${100 / columnCount}%`}
            height={20}
            sx={{ mr: 1 }}
          />
        ))}
      </Box>
      {/* Rows */}
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <Box key={rowIndex} sx={{ display: 'flex', mb: 1 }}>
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="rectangular"
              width={`${100 / columnCount}%`}
              height={40}
              sx={{ mr: 1 }}
            />
          ))}
        </Box>
      ))}
    </Box>
  );

  const renderCardSkeleton = () => (
    <Paper
      elevation={1}
      sx={{
        p: cardPadding,
        borderRadius: 2,
        ...(darkMode && { bgcolor: 'grey.800' }),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="40%" height={16} />
        </Box>
      </Box>
      <Skeleton variant="rectangular" height={100} sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton variant="text" width="30%" height={20} />
        <Skeleton variant="text" width="20%" height={20} />
      </Box>
    </Paper>
  );

  const renderListSkeleton = () => (
    <Box>
      {Array.from({ length: count }).map((_, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 2,
            mb: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            height: itemHeight,
          }}
        >
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="70%" height={20} />
            <Skeleton variant="text" width="50%" height={16} />
          </Box>
          <Skeleton variant="rectangular" width={60} height={24} />
        </Box>
      ))}
    </Box>
  );

  const renderGridSkeleton = () => (
    <Grid container spacing={spacing}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid item xs={12 / columns} key={index}>
          <Skeleton variant="rectangular" height={height} />
        </Grid>
      ))}
    </Grid>
  );

  const renderCustomSkeleton = () => (
    <Box sx={{ p: cardPadding }}>
      {children || (
        <Box>
          <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={100} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="rectangular" width={80} height={32} />
            <Skeleton variant="rectangular" width={80} height={32} />
          </Box>
        </Box>
      )}
    </Box>
  );

  const renderSkeletonContent = () => {
    switch (type) {
      case 'form':
        return renderFormSkeleton();
      case 'table':
        return renderTableSkeleton();
      case 'card':
        return renderCardSkeleton();
      case 'list':
        return renderListSkeleton();
      case 'custom':
        return renderCustomSkeleton();
      default:
        return Array.from({ length: count }).map((_, index) =>
          renderSkeletonItem(index)
        );
    }
  };

  const renderProgress = () => {
    if (!showProgress) return null;

    return (
      <Box sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <CircularProgress
            variant="determinate"
            value={currentProgress}
            size={20}
            sx={{ mr: 1 }}
          />
          <Typography variant="body2" color="text.secondary">
            {currentProgress}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={currentProgress}
          sx={{ height: 4, borderRadius: 2 }}
        />
      </Box>
    );
  };

  const renderStatusMessage = () => {
    if (!loading && !error && !success) return null;

    const statusConfig = {
      loading: {
        message,
        icon: icon || <CircularProgress size={20} />,
        color: 'primary' as const,
      },
      error: {
        message: errorMessage,
        icon: errorIcon || <ErrorIcon />,
        color: 'error' as const,
      },
      success: {
        message: successMessage,
        icon: successIcon || <SuccessIcon />,
        color: 'success' as const,
      },
    };

    const config = error
      ? statusConfig.error
      : success
      ? statusConfig.success
      : statusConfig.loading;

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
          p: 2,
          borderRadius: 1,
          bgcolor: `${config.color}.light`,
          color: `${config.color}.dark`,
        }}
      >
        <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
          {config.icon}
        </Box>
        <Typography variant="body2">{config.message}</Typography>
        {showRetry && error && onRetry && (
          <Box sx={{ ml: 'auto' }}>
            <Chip
              label="Retry"
              size="small"
              onClick={onRetry}
              icon={<RefreshIcon />}
              color="error"
              variant="outlined"
            />
          </Box>
        )}
      </Box>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!loading && !error && !success) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={className}
      >
        <Box
          sx={{
            width: '100%',
            ...(darkMode && { bgcolor: 'grey.900', color: 'grey.100' }),
            ...sx,
          }}
        >
          {renderStatusMessage()}
          {renderProgress()}
          {loading && renderSkeletonContent()}
        </Box>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default LoadingSkeleton; 