/**
 * Phase 4.2: Advanced Validation Hook
 * Comprehensive validation system with async validation, cross-field validation, and performance optimization
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { debounce } from 'lodash';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationRule {
  id: string;
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom' | 'async' | 'cross-field';
  fieldId: string;
  message: string;
  params?: Record<string, any>;
  validator?: (value: any, formData?: any) => boolean | Promise<boolean>;
  dependencies?: string[];
  priority?: number;
  debounceMs?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  isPending: boolean;
  lastValidated: Date | null;
}

export interface ValidationError {
  id: string;
  fieldId: string;
  ruleId: string;
  message: string;
  severity: 'error' | 'warning';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ValidationWarning {
  id: string;
  fieldId: string;
  ruleId: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CrossFieldValidation {
  id: string;
  fields: string[];
  validator: (values: Record<string, any>) => boolean | Promise<boolean>;
  message: string;
  severity: 'error' | 'warning';
  dependencies?: string[];
}

export interface AsyncValidationConfig {
  enabled: boolean;
  debounceMs: number;
  maxConcurrent: number;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
}

export interface ValidationPerformance {
  totalValidations: number;
  averageValidationTime: number;
  slowestValidations: Array<{ ruleId: string; time: number }>;
  cacheHitRate: number;
  memoryUsage: number;
}

export interface AdvancedValidationConfig {
  /** Whether to enable advanced validation */
  enabled?: boolean;
  /** Async validation configuration */
  asyncValidation?: AsyncValidationConfig;
  /** Whether to enable cross-field validation */
  enableCrossField?: boolean;
  /** Whether to enable validation caching */
  enableCaching?: boolean;
  /** Whether to enable validation performance monitoring */
  enablePerformanceMonitoring?: boolean;
  /** Maximum number of validation rules per field */
  maxRulesPerField?: number;
  /** Validation debounce time in milliseconds */
  debounceMs?: number;
  /** Custom validation rules */
  rules?: ValidationRule[];
  /** Cross-field validation rules */
  crossFieldRules?: CrossFieldValidation[];
  /** Custom event handlers */
  onValidationStart?: (fieldId: string) => void;
  onValidationComplete?: (fieldId: string, result: ValidationResult) => void;
  onValidationError?: (error: ValidationError) => void;
  onPerformanceUpdate?: (performance: ValidationPerformance) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export const useAdvancedValidation = (config: AdvancedValidationConfig = {}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const [pendingValidations, setPendingValidations] = useState<Set<string>>(new Set());
  const [validationCache, setValidationCache] = useState<Map<string, ValidationResult>>(new Map());
  const [performanceMetrics, setPerformanceMetrics] = useState<ValidationPerformance>({
    totalValidations: 0,
    averageValidationTime: 0,
    slowestValidations: [],
    cacheHitRate: 0,
    memoryUsage: 0,
  });

  // ============================================================================
  // REFS
  // ============================================================================

  const validationQueue = useRef<Map<string, Promise<ValidationResult>>>(new Map());
  const performanceTimers = useRef<Map<string, number>>(new Map());
  const cacheHits = useRef<number>(0);
  const cacheMisses = useRef<number>(0);

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const {
    enabled = true,
    asyncValidation = {
      enabled: true,
      debounceMs: 300,
      maxConcurrent: 5,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 10000,
    },
    enableCrossField = true,
    enableCaching = true,
    enablePerformanceMonitoring = true,
    maxRulesPerField = 10,
    debounceMs = 300,
    rules = [],
    crossFieldRules = [],
    onValidationStart,
    onValidationComplete,
    onValidationError,
    onPerformanceUpdate,
  } = config;

  // ============================================================================
  // UTILITIES
  // ============================================================================

  const generateValidationId = useCallback((fieldId: string, ruleId: string) => {
    return `${fieldId}:${ruleId}`;
  }, []);

  const getCacheKey = useCallback((fieldId: string, value: any, dependencies?: Record<string, any>) => {
    const dependencyHash = dependencies ? JSON.stringify(dependencies) : '';
    return `${fieldId}:${JSON.stringify(value)}:${dependencyHash}`;
  }, []);

  const updatePerformanceMetrics = useCallback((ruleId: string, time: number) => {
    setPerformanceMetrics(prev => {
      const newTotal = prev.totalValidations + 1;
      const newAverage = (prev.averageValidationTime * prev.totalValidations + time) / newTotal;
      
      const newSlowest = [...prev.slowestValidations, { ruleId, time }]
        .sort((a, b) => b.time - a.time)
        .slice(0, 10);

      const totalCacheAccess = cacheHits.current + cacheMisses.current;
      const newCacheHitRate = totalCacheAccess > 0 ? cacheHits.current / totalCacheAccess : 0;

      return {
        totalValidations: newTotal,
        averageValidationTime: newAverage,
        slowestValidations: newSlowest,
        cacheHitRate: newCacheHitRate,
        memoryUsage: validationCache.size,
      };
    });
  }, []);

  // ============================================================================
  // VALIDATION RULES
  // ============================================================================

  const builtInValidators = useMemo(() => ({
    required: (value: any) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    },
    min: (value: any, params: { min: number }) => {
      if (typeof value === 'number') return value >= params.min;
      if (typeof value === 'string') return value.length >= params.min;
      if (Array.isArray(value)) return value.length >= params.min;
      return true;
    },
    max: (value: any, params: { max: number }) => {
      if (typeof value === 'number') return value <= params.max;
      if (typeof value === 'string') return value.length <= params.max;
      if (Array.isArray(value)) return value.length <= params.max;
      return true;
    },
    pattern: (value: any, params: { pattern: string }) => {
      if (typeof value !== 'string') return true;
      try {
        const regex = new RegExp(params.pattern);
        return regex.test(value);
      } catch {
        return false;
      }
    },
  }), []);

  const validateField = useCallback(async (
    fieldId: string,
    value: any,
    formData?: Record<string, any>,
    customRules?: ValidationRule[]
  ): Promise<ValidationResult> => {
    const startTime = performance.now();
    const fieldRules = [...rules.filter(r => r.fieldId === fieldId), ...(customRules || [])];
    
    if (fieldRules.length === 0) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        isPending: false,
        lastValidated: new Date(),
      };
    }

    // Check cache first
    if (enableCaching) {
      const cacheKey = getCacheKey(fieldId, value, formData);
      const cachedResult = validationCache.get(cacheKey);
      if (cachedResult) {
        cacheHits.current++;
        updatePerformanceMetrics('cache', performance.now() - startTime);
        return cachedResult;
      }
      cacheMisses.current++;
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let isPending = false;

    // Validate each rule
    for (const rule of fieldRules.slice(0, maxRulesPerField)) {
      try {
        let isValid: boolean;

        if (rule.type === 'async') {
          isPending = true;
          if (rule.validator) {
            isValid = await rule.validator(value, formData);
          } else {
            isValid = true;
          }
        } else if (rule.type === 'custom' && rule.validator) {
          isValid = await rule.validator(value, formData);
        } else if (rule.type in builtInValidators) {
          const validator = builtInValidators[rule.type as keyof typeof builtInValidators];
          isValid = validator(value, rule.params as any);
        } else {
          isValid = true;
        }

        if (!isValid) {
          const error: ValidationError = {
            id: generateValidationId(fieldId, rule.id),
            fieldId,
            ruleId: rule.id,
            message: rule.message,
            severity: 'error',
            timestamp: new Date(),
            metadata: rule.params,
          };
          errors.push(error);
        }
      } catch (error) {
        const validationError: ValidationError = {
          id: generateValidationId(fieldId, rule.id),
          fieldId,
          ruleId: rule.id,
          message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
          timestamp: new Date(),
          metadata: { originalError: error },
        };
        errors.push(validationError);
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      isPending,
      lastValidated: new Date(),
    };

    // Cache result
    if (enableCaching) {
      const cacheKey = getCacheKey(fieldId, value, formData);
      setValidationCache(prev => new Map(prev).set(cacheKey, result));
    }

    updatePerformanceMetrics('validation', performance.now() - startTime);
    return result;
  }, [rules, maxRulesPerField, enableCaching, getCacheKey, generateValidationId, builtInValidators, updatePerformanceMetrics]);

  // ============================================================================
  // CROSS-FIELD VALIDATION
  // ============================================================================

  const validateCrossField = useCallback(async (
    crossFieldRule: CrossFieldValidation,
    formData: Record<string, any>
  ): Promise<ValidationResult> => {
    const startTime = performance.now();
    const values = crossFieldRule.fields.reduce((acc, fieldId) => {
      acc[fieldId] = formData[fieldId];
      return acc;
    }, {} as Record<string, any>);

    try {
      const isValid = await crossFieldRule.validator(values);
      
      const result: ValidationResult = {
        isValid,
        errors: isValid ? [] : [{
          id: crossFieldRule.id,
          fieldId: crossFieldRule.fields[0],
          ruleId: crossFieldRule.id,
          message: crossFieldRule.message,
          severity: crossFieldRule.severity,
          timestamp: new Date(),
        }],
        warnings: [],
        isPending: false,
        lastValidated: new Date(),
      };

      updatePerformanceMetrics('cross-field', performance.now() - startTime);
      return result;
    } catch (error) {
      const result: ValidationResult = {
        isValid: false,
        errors: [{
          id: crossFieldRule.id,
          fieldId: crossFieldRule.fields[0],
          ruleId: crossFieldRule.id,
          message: `Cross-field validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
          timestamp: new Date(),
          metadata: { originalError: error },
        }],
        warnings: [],
        isPending: false,
        lastValidated: new Date(),
      };

      updatePerformanceMetrics('cross-field-error', performance.now() - startTime);
      return result;
    }
  }, [updatePerformanceMetrics]);

  // ============================================================================
  // DEBOUNCED VALIDATION
  // ============================================================================

  const debouncedValidateField = useMemo(
    () => debounce(validateField, debounceMs),
    [validateField, debounceMs]
  );

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  const validateSingleField = useCallback(async (
    fieldId: string,
    value: any,
    formData?: Record<string, any>,
    customRules?: ValidationRule[]
  ) => {
    if (!enabled) return;

    onValidationStart?.(fieldId);
    setPendingValidations(prev => new Set(prev).add(fieldId));

    try {
      const result = await validateField(fieldId, value, formData, customRules);
      
      setValidationResults(prev => ({
        ...prev,
        [fieldId]: result,
      }));

      onValidationComplete?.(fieldId, result);
      
      // Trigger cross-field validation if enabled
      if (enableCrossField) {
        const relatedCrossFieldRules = crossFieldRules.filter(rule => 
          rule.fields.includes(fieldId)
        );

        for (const crossFieldRule of relatedCrossFieldRules) {
          const crossFieldResult = await validateCrossField(crossFieldRule, formData || {});
          
          // Update validation results for all fields in the cross-field rule
          setValidationResults(prev => {
            const updated = { ...prev };
            crossFieldRule.fields.forEach(fieldId => {
              updated[fieldId] = crossFieldResult;
            });
            return updated;
          });
        }
      }
    } catch (error) {
      const errorResult: ValidationError = {
        id: `error-${fieldId}`,
        fieldId,
        ruleId: 'system',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        timestamp: new Date(),
        metadata: { originalError: error },
      };

      onValidationError?.(errorResult);
    } finally {
      setPendingValidations(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldId);
        return newSet;
      });
    }
  }, [enabled, validateField, enableCrossField, crossFieldRules, validateCrossField, onValidationStart, onValidationComplete, onValidationError]);

  const validateForm = useCallback(async (formData: Record<string, any>) => {
    if (!enabled) return { isValid: true, errors: [], warnings: [] };

    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];
    const fieldIds = Object.keys(formData);

    // Validate all fields
    const validationPromises = fieldIds.map(fieldId => 
      validateField(fieldId, formData[fieldId], formData)
    );

    const results = await Promise.all(validationPromises);

    // Collect all errors and warnings
    results.forEach(result => {
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    });

    // Validate cross-field rules
    if (enableCrossField) {
      for (const crossFieldRule of crossFieldRules) {
        const crossFieldResult = await validateCrossField(crossFieldRule, formData);
        allErrors.push(...crossFieldResult.errors);
        allWarnings.push(...crossFieldResult.warnings);
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }, [enabled, validateField, enableCrossField, crossFieldRules, validateCrossField]);

  const clearValidation = useCallback((fieldId?: string) => {
    if (fieldId) {
      setValidationResults(prev => {
        const updated = { ...prev };
        delete updated[fieldId];
        return updated;
      });
    } else {
      setValidationResults({});
    }
  }, []);

  const clearCache = useCallback(() => {
    setValidationCache(new Map());
    cacheHits.current = 0;
    cacheMisses.current = 0;
  }, []);

  const getFieldValidation = useCallback((fieldId: string): ValidationResult | null => {
    return validationResults[fieldId] || null;
  }, [validationResults]);

  const isFieldValid = useCallback((fieldId: string): boolean => {
    const result = validationResults[fieldId];
    return result ? result.isValid : true;
  }, [validationResults]);

  const isFieldPending = useCallback((fieldId: string): boolean => {
    return pendingValidations.has(fieldId);
  }, [pendingValidations]);

  const getFieldErrors = useCallback((fieldId: string): ValidationError[] => {
    const result = validationResults[fieldId];
    return result ? result.errors : [];
  }, [validationResults]);

  const getFieldWarnings = useCallback((fieldId: string): ValidationWarning[] => {
    const result = validationResults[fieldId];
    return result ? result.warnings : [];
  }, [validationResults]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Performance monitoring
  useEffect(() => {
    if (enablePerformanceMonitoring) {
      onPerformanceUpdate?.(performanceMetrics);
    }
  }, [performanceMetrics, enablePerformanceMonitoring, onPerformanceUpdate]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Validation functions
    validateSingleField,
    validateForm,
    debouncedValidateField,
    
    // State queries
    getFieldValidation,
    isFieldValid,
    isFieldPending,
    getFieldErrors,
    getFieldWarnings,
    
    // Cache management
    clearValidation,
    clearCache,
    
    // Performance
    performanceMetrics,
    
    // State
    validationResults,
    pendingValidations,
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export default useAdvancedValidation; 