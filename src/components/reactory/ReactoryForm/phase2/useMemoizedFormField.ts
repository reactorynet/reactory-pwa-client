/**
 * Phase 2.1: Memoized Form Field Hook
 * 
 * Optimized form field hook with React.memo equivalent functionality
 * for preventing unnecessary re-renders in ReactoryForm components.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface FormFieldProps {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'select' | 'textarea' | 'checkbox' | 'radio';
  value: any;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    message?: string;
  };
  options?: Array<{ value: string; label: string }>;
  onChange?: (value: any) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  onValidation?: (isValid: boolean, error?: string) => void;
}

export interface MemoizedFormFieldState {
  value: any;
  isValid: boolean;
  error: string | null;
  isFocused: boolean;
  isDirty: boolean;
  isTouched: boolean;
  renderCount: number;
  lastRenderTime: number;
}

export interface MemoizedFormFieldResult {
  // State
  state: MemoizedFormFieldState;
  props: FormFieldProps;
  
  // Actions
  setValue: (value: any) => void;
  setFocus: (focused: boolean) => void;
  setDirty: (dirty: boolean) => void;
  setTouched: (touched: boolean) => void;
  validate: () => boolean;
  reset: () => void;
  
  // Utilities
  shouldReRender: (newProps: FormFieldProps) => boolean;
  getRenderStats: () => { renderCount: number; lastRenderTime: number };
  isPropsEqual: (prevProps: FormFieldProps, nextProps: FormFieldProps) => boolean;
}

// ============================================================================
// UTILITIES
// ============================================================================

const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return a === b;
};

const shallowEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (a[key] !== b[key]) return false;
    }
    
    return true;
  }
  
  return a === b;
};

// ============================================================================
// VALIDATION
// ============================================================================

const validateField = (props: FormFieldProps, value: any): { isValid: boolean; error: string | null } => {
  const { required, validation, label } = props;
  
  // Required validation
  if (required && (!value || value.toString().trim() === '')) {
    return {
      isValid: false,
      error: validation?.message || `${label} is required`
    };
  }
  
  // Pattern validation
  if (validation?.pattern && value) {
    const regex = new RegExp(validation.pattern);
    if (!regex.test(value.toString())) {
      return {
        isValid: false,
        error: validation.message || `${label} format is invalid`
      };
    }
  }
  
  // Min/Max validation
  if (validation?.min !== undefined && value < validation.min) {
    return {
      isValid: false,
      error: validation.message || `${label} must be at least ${validation.min}`
    };
  }
  
  if (validation?.max !== undefined && value > validation.max) {
    return {
      isValid: false,
      error: validation.message || `${label} must be at most ${validation.max}`
    };
  }
  
  return { isValid: true, error: null };
};

// ============================================================================
// MAIN HOOK
// ============================================================================

export const useMemoizedFormField = (
  initialProps: FormFieldProps
): MemoizedFormFieldResult => {
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [state, setState] = useState<MemoizedFormFieldState>({
    value: initialProps.value,
    isValid: true,
    error: null,
    isFocused: false,
    isDirty: false,
    isTouched: false,
    renderCount: 0,
    lastRenderTime: Date.now()
  });

  const propsRef = useRef<FormFieldProps>(initialProps);
  const lastRenderTimeRef = useRef<number>(Date.now());

  // ============================================================================
  // PROPS COMPARISON
  // ============================================================================
  
  const isPropsEqual = useCallback((prevProps: FormFieldProps, nextProps: FormFieldProps): boolean => {
    // Quick reference equality check
    if (prevProps === nextProps) return true;
    
    // Deep comparison for critical props
    const criticalProps = ['id', 'name', 'label', 'type', 'required', 'disabled', 'placeholder'];
    for (const prop of criticalProps) {
      if (prevProps[prop as keyof FormFieldProps] !== nextProps[prop as keyof FormFieldProps]) {
        return false;
      }
    }
    
    // Deep comparison for validation
    if (!deepEqual(prevProps.validation, nextProps.validation)) {
      return false;
    }
    
    // Deep comparison for options
    if (!deepEqual(prevProps.options, nextProps.options)) {
      return false;
    }
    
    // Reference equality for callbacks (assuming they're stable)
    if (prevProps.onChange !== nextProps.onChange) {
      return false;
    }
    
    return true;
  }, []);

  const shouldReRender = useCallback((newProps: FormFieldProps): boolean => {
    return !isPropsEqual(propsRef.current, newProps);
  }, [isPropsEqual]);

  // ============================================================================
  // ACTIONS
  // ============================================================================
  
  const setValue = useCallback((value: any) => {
    const validation = validateField(propsRef.current, value);
    
    setState(prev => ({
      ...prev,
      value,
      isValid: validation.isValid,
      error: validation.error,
      isDirty: true,
      renderCount: prev.renderCount + 1,
      lastRenderTime: Date.now()
    }));

    // Call onChange callback
    if (propsRef.current.onChange) {
      propsRef.current.onChange(value);
    }
  }, []);

  const setFocus = useCallback((focused: boolean) => {
    setState(prev => ({
      ...prev,
      isFocused: focused,
      isTouched: focused ? true : prev.isTouched,
      renderCount: prev.renderCount + 1,
      lastRenderTime: Date.now()
    }));

    if (focused && propsRef.current.onFocus) {
      propsRef.current.onFocus();
    } else if (!focused && propsRef.current.onBlur) {
      propsRef.current.onBlur();
    }
  }, []);

  const setDirty = useCallback((dirty: boolean) => {
    setState(prev => ({
      ...prev,
      isDirty: dirty,
      renderCount: prev.renderCount + 1,
      lastRenderTime: Date.now()
    }));
  }, []);

  const setTouched = useCallback((touched: boolean) => {
    setState(prev => ({
      ...prev,
      isTouched: touched,
      renderCount: prev.renderCount + 1,
      lastRenderTime: Date.now()
    }));
  }, []);

  const validate = useCallback((): boolean => {
    const validation = validateField(propsRef.current, state.value);
    
    setState(prev => ({
      ...prev,
      isValid: validation.isValid,
      error: validation.error,
      renderCount: prev.renderCount + 1,
      lastRenderTime: Date.now()
    }));

    // Call onValidation callback
    if (propsRef.current.onValidation) {
      propsRef.current.onValidation(validation.isValid, validation.error || undefined);
    }

    return validation.isValid;
  }, [state.value]);

  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      value: propsRef.current.value,
      isValid: true,
      error: null,
      isFocused: false,
      isDirty: false,
      isTouched: false,
      renderCount: prev.renderCount + 1,
      lastRenderTime: Date.now()
    }));
  }, []);

  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  const getRenderStats = useCallback(() => {
    return {
      renderCount: state.renderCount,
      lastRenderTime: state.lastRenderTime
    };
  }, [state.renderCount, state.lastRenderTime]);

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Update props reference when props change
  useEffect(() => {
    propsRef.current = initialProps;
  }, [initialProps]);

  // Auto-validate on value change
  useEffect(() => {
    if (state.isDirty || state.isTouched) {
      validate();
    }
  }, [state.value, state.isDirty, state.isTouched, validate]);

  // Track render performance
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    
    if (timeSinceLastRender < 16) { // Less than 60fps
      console.warn(`Form field ${initialProps.name} rendering too frequently: ${timeSinceLastRender}ms`);
    }
    
    lastRenderTimeRef.current = now;
  });

  // ============================================================================
  // RETURN
  // ============================================================================
  
  return {
    // State
    state,
    props: initialProps,
    
    // Actions
    setValue,
    setFocus,
    setDirty,
    setTouched,
    validate,
    reset,
    
    // Utilities
    shouldReRender,
    getRenderStats,
    isPropsEqual
  };
}; 