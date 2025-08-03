/**
 * Phase 3.2: ModernFormField Component
 * Enhanced form field component with animations and modern UX
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TextField,
  FormHelperText,
  InputAdornment,
  IconButton,
  Box,
  Typography,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { formAnimations, animationUtils } from '../animations/formAnimations';

// ============================================================================
// TYPES
// ============================================================================

export interface ModernFormFieldProps {
  /** Field label */
  label: string;
  /** Field value */
  value: string | number;
  /** Change handler */
  onChange: (value: string) => void;
  /** Field type */
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url';
  /** Error message */
  error?: string;
  /** Success message */
  success?: string;
  /** Info message */
  info?: string;
  /** Help text */
  helpText?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether field is required */
  required?: boolean;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Whether field is read-only */
  readOnly?: boolean;
  /** Whether to show password toggle */
  showPasswordToggle?: boolean;
  /** Whether to show character count */
  showCharacterCount?: boolean;
  /** Maximum character count */
  maxLength?: number;
  /** Minimum character count */
  minLength?: number;
  /** Custom validation function */
  validate?: (value: string) => string | null;
  /** Whether to show floating label */
  floatingLabel?: boolean;
  /** Whether to show animations */
  animate?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** Field size */
  size?: 'small' | 'medium';
  /** Field variant */
  variant?: 'outlined' | 'filled' | 'standard';
  /** Start adornment */
  startAdornment?: React.ReactNode;
  /** End adornment */
  endAdornment?: React.ReactNode;
  /** Whether to show validation on blur */
  validateOnBlur?: boolean;
  /** Whether to show validation on change */
  validateOnChange?: boolean;
  /** Custom error icon */
  errorIcon?: React.ReactNode;
  /** Custom success icon */
  successIcon?: React.ReactNode;
  /** Custom info icon */
  infoIcon?: React.ReactNode;
  /** Custom help icon */
  helpIcon?: React.ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ModernFormField: React.FC<ModernFormFieldProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  error,
  success,
  info,
  helpText,
  placeholder,
  required = false,
  disabled = false,
  readOnly = false,
  showPasswordToggle = false,
  showCharacterCount = false,
  maxLength,
  minLength,
  validate,
  floatingLabel = true,
  animate = true,
  className = '',
  size = 'medium',
  variant = 'outlined',
  startAdornment,
  endAdornment,
  validateOnBlur = true,
  validateOnChange = false,
  errorIcon,
  successIcon,
  infoIcon,
  helpIcon,
}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [localInfo, setLocalInfo] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // ANIMATION CONFIGURATION
  // ============================================================================

  const getFieldAnimation = useCallback(() => {
    if (!animate) return {};
    
    const mode = animationUtils.getPerformanceMode();
    switch (mode) {
      case 'reduced':
        return formAnimations.performanceAnimations.reducedMotion.fieldFocus;
      case 'high':
        return formAnimations.performanceAnimations.highPerformance.fieldFocus;
      default:
        return formAnimations.fieldFocus;
    }
  }, [animate]);

  const getValidationAnimation = useCallback(() => {
    if (!animate) return {};
    
    if (localError) return formAnimations.fieldError;
    if (localSuccess) return formAnimations.fieldSuccess;
    return {};
  }, [animate, localError, localSuccess]);

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateField = useCallback((value: string) => {
    let validationError: string | null = null;

    // Required validation
    if (required && !value.trim()) {
      validationError = `${label} is required`;
    }

    // Min length validation
    if (minLength && value.length < minLength) {
      validationError = `${label} must be at least ${minLength} characters`;
    }

    // Max length validation
    if (maxLength && value.length > maxLength) {
      validationError = `${label} must be no more than ${maxLength} characters`;
    }

    // Custom validation
    if (validate) {
      const customError = validate(value);
      if (customError) {
        validationError = customError;
      }
    }

    return validationError;
  }, [label, required, minLength, maxLength, validate]);

  const handleValidation = useCallback((value: string) => {
    const validationError = validateField(value);
    
    setLocalError(validationError);
    setLocalSuccess(validationError ? null : 'Valid input');
    setLocalInfo(null);
  }, [validateField]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    onChange(newValue);
    setCharacterCount(newValue.length);
    
    if (validateOnChange && hasInteracted) {
      handleValidation(newValue);
    }
  }, [onChange, validateOnChange, hasInteracted, handleValidation]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    setHasInteracted(true);
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
    if (validateOnBlur) {
      handleValidation(value.toString());
    }
  }, [validateOnBlur, handleValidation, value]);

  const handlePasswordToggle = useCallback(() => {
    setShowPassword(!showPassword);
  }, [showPassword]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Update character count when value changes
  useEffect(() => {
    setCharacterCount(value.toString().length);
  }, [value]);

  // Update local states when props change
  useEffect(() => {
    setLocalError(error || null);
    setLocalSuccess(success || null);
    setLocalInfo(info || null);
  }, [error, success, info]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderValidationMessage = () => {
    const message = localError || localSuccess || localInfo;
    if (!message) return null;

    const isError = !!localError;
    const isSuccess = !!localSuccess;
    const isInfo = !!localInfo;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <FormHelperText
            error={isError}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 0.5,
            }}
          >
            {isError && (errorIcon || <ErrorIcon fontSize="small" />)}
            {isSuccess && (successIcon || <SuccessIcon fontSize="small" />)}
            {isInfo && (infoIcon || <InfoIcon fontSize="small" />)}
            {message}
          </FormHelperText>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderCharacterCount = () => {
    if (!showCharacterCount) return null;

    return (
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 0.5, textAlign: 'right' }}
      >
        {characterCount}
        {maxLength && ` / ${maxLength}`}
      </Typography>
    );
  };

  const renderHelpText = () => {
    if (!helpText) return null;

    return (
      <Tooltip title={helpText} arrow>
        <IconButton size="small" sx={{ ml: 1 }}>
          {helpIcon || <HelpIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    );
  };

  const renderPasswordToggle = () => {
    if (!showPasswordToggle || type !== 'password') return null;

    return (
      <InputAdornment position="end">
        <IconButton
          onClick={handlePasswordToggle}
          edge="end"
          size="small"
        >
          {showPassword ? <VisibilityOff /> : <Visibility />}
        </IconButton>
      </InputAdornment>
    );
  };

  const renderEndAdornment = () => {
    const elements = [];

    if (endAdornment) {
      elements.push(endAdornment);
    }

    if (renderPasswordToggle()) {
      elements.push(renderPasswordToggle());
    }

    if (renderHelpText()) {
      elements.push(renderHelpText());
    }

    return elements.length > 0 ? elements : undefined;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const fieldType = type === 'password' && showPassword ? 'text' : type;

  return (
    <motion.div
      variants={getFieldAnimation()}
      animate={focused ? 'animate' : 'initial'}
      className={className}
    >
      <motion.div
        variants={getValidationAnimation()}
        animate={localError || localSuccess ? 'animate' : 'initial'}
      >
        <TextField
          ref={inputRef}
          label={floatingLabel ? label : undefined}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          type={fieldType}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          InputProps={{
            readOnly,
            startAdornment,
            endAdornment: renderEndAdornment(),
          }}
          size={size}
          variant={variant}
          error={!!localError}
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              transition: 'all 0.2s ease-in-out',
            },
            '& .MuiOutlinedInput-root:hover': {
              transform: 'translateY(-1px)',
            },
            '& .MuiOutlinedInput-root.Mui-focused': {
              transform: 'translateY(-2px)',
            },
          }}
        />
      </motion.div>

      {renderValidationMessage()}
      {renderCharacterCount()}

      {/* Validation Chips */}
      <AnimatePresence>
        {(localError || localSuccess || localInfo) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ marginTop: '8px' }}
          >
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                             {localError && (
                 <Chip
                   label={localError}
                   color="error"
                   size="small"
                   icon={<ErrorIcon />}
                 />
               )}
               {localSuccess && (
                 <Chip
                   label={localSuccess}
                   color="success"
                   size="small"
                   icon={<SuccessIcon />}
                 />
               )}
               {localInfo && (
                 <Chip
                   label={localInfo}
                   color="info"
                   size="small"
                   icon={<InfoIcon />}
                 />
               )}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default ModernFormField; 