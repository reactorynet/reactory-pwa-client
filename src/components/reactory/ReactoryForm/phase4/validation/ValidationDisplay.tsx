/**
 * Phase 4.2: Validation Display Component
 * Shows validation errors, warnings, and performance metrics with smooth animations
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Alert,
  AlertTitle,
  Chip,
  Typography,
  LinearProgress,
  IconButton,
  Tooltip,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Speed as PerformanceIcon,
  Memory as MemoryIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { ValidationResult, ValidationError, ValidationWarning, ValidationPerformance } from './useAdvancedValidation';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationDisplayProps {
  /** Validation results for fields */
  validationResults: Record<string, ValidationResult>;
  /** Performance metrics */
  performanceMetrics?: ValidationPerformance;
  /** Whether to show performance metrics */
  showPerformance?: boolean;
  /** Whether to show validation details */
  showDetails?: boolean;
  /** Whether to enable animations */
  enableAnimations?: boolean;
  /** Custom styles */
  sx?: any;
  /** Position of the display */
  position?: 'top' | 'bottom' | 'inline';
  /** Maximum number of errors to show */
  maxErrors?: number;
  /** Maximum number of warnings to show */
  maxWarnings?: number;
  /** Custom error messages */
  errorMessages?: Record<string, string>;
  /** Custom warning messages */
  warningMessages?: Record<string, string>;
  /** Event handlers */
  onClearValidation?: (fieldId?: string) => void;
  onRefreshValidation?: () => void;
  onPerformanceClick?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ValidationDisplay: React.FC<ValidationDisplayProps> = ({
  validationResults,
  performanceMetrics,
  showPerformance = true,
  showDetails = true,
  enableAnimations = true,
  sx = {},
  position = 'inline',
  maxErrors = 5,
  maxWarnings = 3,
  errorMessages = {},
  warningMessages = {},
  onClearValidation,
  onRefreshValidation,
  onPerformanceClick,
}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [expanded, setExpanded] = useState(false);
  const [showPerformanceDetails, setShowPerformanceDetails] = useState(false);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const allErrors = Object.values(validationResults)
    .flatMap(result => result.errors)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, maxErrors);

  const allWarnings = Object.values(validationResults)
    .flatMap(result => result.warnings)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, maxWarnings);

  const pendingValidations = Object.values(validationResults)
    .filter(result => result.isPending)
    .length;

  const totalErrors = allErrors.length;
  const totalWarnings = allWarnings.length;
  const hasIssues = totalErrors > 0 || totalWarnings > 0;
  const hasPending = pendingValidations > 0;

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getPositionStyles = () => {
    const baseStyles = {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 1,
      p: 2,
    };

    switch (position) {
      case 'top':
        return { ...baseStyles, position: 'sticky' as const, top: 0, zIndex: 1000 };
      case 'bottom':
        return { ...baseStyles, position: 'sticky' as const, bottom: 0, zIndex: 1000 };
      case 'inline':
      default:
        return baseStyles;
    }
  };

  const renderError = (error: ValidationError, index: number) => {
    const customMessage = errorMessages[error.id] || error.message;
    
    return (
      <motion.div
        key={error.id}
        initial={enableAnimations ? { opacity: 0, x: -20 } : false}
        animate={enableAnimations ? { opacity: 1, x: 0 } : false}
        exit={enableAnimations ? { opacity: 0, x: 20 } : false}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <Alert
          severity="error"
          icon={<ErrorIcon />}
          action={
            <Tooltip title="Clear this error">
              <IconButton
                size="small"
                onClick={() => onClearValidation?.(error.fieldId)}
              >
                <InfoIcon />
              </IconButton>
            </Tooltip>
          }
          sx={{ mb: 1 }}
        >
          <AlertTitle>Validation Error</AlertTitle>
          <Typography variant="body2">{customMessage}</Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={error.fieldId}
              size="small"
              variant="outlined"
              color="error"
            />
            <Chip
              label={error.ruleId}
              size="small"
              variant="outlined"
            />
            <Chip
              label={error.timestamp.toLocaleTimeString()}
              size="small"
              variant="outlined"
            />
          </Box>
        </Alert>
      </motion.div>
    );
  };

  const renderWarning = (warning: ValidationWarning, index: number) => {
    const customMessage = warningMessages[warning.id] || warning.message;
    
    return (
      <motion.div
        key={warning.id}
        initial={enableAnimations ? { opacity: 0, x: -20 } : false}
        animate={enableAnimations ? { opacity: 1, x: 0 } : false}
        exit={enableAnimations ? { opacity: 0, x: 20 } : false}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{ mb: 1 }}
        >
          <Typography variant="body2">{customMessage}</Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={warning.fieldId}
              size="small"
              variant="outlined"
              color="warning"
            />
            <Chip
              label={warning.ruleId}
              size="small"
              variant="outlined"
            />
          </Box>
        </Alert>
      </motion.div>
    );
  };

  const renderPerformanceMetrics = () => {
    if (!performanceMetrics || !showPerformance) return null;

    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PerformanceIcon />
            Performance Metrics
          </Typography>
          <IconButton
            size="small"
            onClick={() => setShowPerformanceDetails(!showPerformanceDetails)}
          >
            {showPerformanceDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            icon={<TimelineIcon />}
            label={`${performanceMetrics.totalValidations} validations`}
            color="primary"
            variant="outlined"
          />
          <Chip
            icon={<PerformanceIcon />}
            label={`${performanceMetrics.averageValidationTime.toFixed(2)}ms avg`}
            color="secondary"
            variant="outlined"
          />
          <Chip
            icon={<MemoryIcon />}
            label={`${(performanceMetrics.cacheHitRate * 100).toFixed(1)}% cache hit`}
            color="success"
            variant="outlined"
          />
        </Box>

        <Collapse in={showPerformanceDetails}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Slowest Validations
            </Typography>
            <List dense>
              {performanceMetrics.slowestValidations.slice(0, 5).map((validation, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <TimelineIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={validation.ruleId}
                    secondary={`${validation.time.toFixed(2)}ms`}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Collapse>
      </Paper>
    );
  };

  const renderSummary = () => {
    if (!hasIssues && !hasPending) return null;

    return (
      <motion.div
        initial={enableAnimations ? { opacity: 0, y: -20 } : false}
        animate={enableAnimations ? { opacity: 1, y: 0 } : false}
        transition={{ duration: 0.3 }}
      >
        <Alert
          severity={totalErrors > 0 ? 'error' : totalWarnings > 0 ? 'warning' : 'info'}
          icon={totalErrors > 0 ? <ErrorIcon /> : totalWarnings > 0 ? <WarningIcon /> : <SuccessIcon />}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              {onRefreshValidation && (
                <Tooltip title="Refresh validation">
                  <IconButton size="small" onClick={onRefreshValidation}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={expanded ? 'Hide details' : 'Show details'}>
                <IconButton
                  size="small"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          }
        >
          <AlertTitle>
            {totalErrors > 0 
              ? `${totalErrors} validation error${totalErrors !== 1 ? 's' : ''}`
              : totalWarnings > 0
              ? `${totalWarnings} validation warning${totalWarnings !== 1 ? 's' : ''}`
              : 'Validation complete'
            }
          </AlertTitle>
          {hasPending && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {pendingValidations} validation{pendingValidations !== 1 ? 's' : ''} pending...
            </Typography>
          )}
        </Alert>
      </motion.div>
    );
  };

  const renderPendingIndicator = () => {
    if (!hasPending) return null;

    return (
      <motion.div
        initial={enableAnimations ? { opacity: 0 } : false}
        animate={enableAnimations ? { opacity: 1 } : false}
        exit={enableAnimations ? { opacity: 0 } : false}
      >
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Validating...
          </Typography>
          <LinearProgress />
        </Box>
      </motion.div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!hasIssues && !hasPending && !showPerformance) return null;

  return (
    <Box sx={{ ...getPositionStyles(), ...sx }}>
      {/* Performance Metrics */}
      {renderPerformanceMetrics()}

      {/* Summary */}
      {renderSummary()}

      {/* Pending Indicator */}
      {renderPendingIndicator()}

      {/* Details */}
      <Collapse in={expanded && showDetails}>
        <AnimatePresence>
          {/* Errors */}
          {allErrors.map((error, index) => renderError(error, index))}

          {/* Warnings */}
          {allWarnings.map((warning, index) => renderWarning(warning, index))}

          {/* Divider */}
          {allErrors.length > 0 && allWarnings.length > 0 && (
            <Divider sx={{ my: 2 }} />
          )}
        </AnimatePresence>
      </Collapse>
    </Box>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default ValidationDisplay; 