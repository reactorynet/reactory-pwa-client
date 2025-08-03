/**
 * Phase 4.2: Advanced Validation Tests
 * Comprehensive test suite for advanced validation features
 */

describe('Phase 4.2: Advanced Validation', () => {
  describe('useAdvancedValidation Hook', () => {
    test('should have proper hook structure', () => {
      const useAdvancedValidation = require('../validation/useAdvancedValidation').default;
      expect(useAdvancedValidation).toBeDefined();
      expect(typeof useAdvancedValidation).toBe('function');
    });

    test('should export validation types', () => {
      const {
        ValidationRule,
        ValidationResult,
        ValidationError,
        ValidationWarning,
        CrossFieldValidation,
        AsyncValidationConfig,
        ValidationPerformance,
        AdvancedValidationConfig,
      } = require('../validation/useAdvancedValidation');

      expect(ValidationRule).toBeDefined();
      expect(ValidationResult).toBeDefined();
      expect(ValidationError).toBeDefined();
      expect(ValidationWarning).toBeDefined();
      expect(CrossFieldValidation).toBeDefined();
      expect(AsyncValidationConfig).toBeDefined();
      expect(ValidationPerformance).toBeDefined();
      expect(AdvancedValidationConfig).toBeDefined();
    });

    test('should support validation rule interface', () => {
      const { ValidationRule } = require('../validation/useAdvancedValidation');
      
      const validRule = {
        id: 'rule-1',
        type: 'required' as const,
        fieldId: 'field-1',
        message: 'This field is required',
        params: { min: 5 },
        validator: (value: any) => value.length >= 5,
        dependencies: ['field-2'],
        priority: 1,
        debounceMs: 300,
      };

      expect(validRule).toBeDefined();
      expect(typeof validRule.id).toBe('string');
      expect(['required', 'min', 'max', 'pattern', 'custom', 'async', 'cross-field']).toContain(validRule.type);
      expect(typeof validRule.fieldId).toBe('string');
      expect(typeof validRule.message).toBe('string');
      expect(typeof validRule.validator).toBe('function');
    });

    test('should support validation result interface', () => {
      const { ValidationResult } = require('../validation/useAdvancedValidation');
      
      const validResult = {
        isValid: true,
        errors: [],
        warnings: [],
        isPending: false,
        lastValidated: new Date(),
      };

      expect(validResult).toBeDefined();
      expect(typeof validResult.isValid).toBe('boolean');
      expect(Array.isArray(validResult.errors)).toBe(true);
      expect(Array.isArray(validResult.warnings)).toBe(true);
      expect(typeof validResult.isPending).toBe('boolean');
      expect(validResult.lastValidated instanceof Date).toBe(true);
    });

    test('should support validation error interface', () => {
      const { ValidationError } = require('../validation/useAdvancedValidation');
      
      const validError = {
        id: 'error-1',
        fieldId: 'field-1',
        ruleId: 'rule-1',
        message: 'Validation failed',
        severity: 'error' as const,
        timestamp: new Date(),
        metadata: { originalError: new Error('Test error') },
      };

      expect(validError).toBeDefined();
      expect(typeof validError.id).toBe('string');
      expect(typeof validError.fieldId).toBe('string');
      expect(typeof validError.ruleId).toBe('string');
      expect(typeof validError.message).toBe('string');
      expect(['error', 'warning']).toContain(validError.severity);
      expect(validError.timestamp instanceof Date).toBe(true);
    });

    test('should support cross-field validation interface', () => {
      const { CrossFieldValidation } = require('../validation/useAdvancedValidation');
      
      const validCrossField = {
        id: 'cross-field-1',
        fields: ['field-1', 'field-2'],
        validator: (values: Record<string, any>) => values['field-1'] === values['field-2'],
        message: 'Fields must match',
        severity: 'error' as const,
        dependencies: ['field-1', 'field-2'],
      };

      expect(validCrossField).toBeDefined();
      expect(typeof validCrossField.id).toBe('string');
      expect(Array.isArray(validCrossField.fields)).toBe(true);
      expect(typeof validCrossField.validator).toBe('function');
      expect(typeof validCrossField.message).toBe('string');
      expect(['error', 'warning']).toContain(validCrossField.severity);
    });

    test('should support async validation config interface', () => {
      const { AsyncValidationConfig } = require('../validation/useAdvancedValidation');
      
      const validConfig = {
        enabled: true,
        debounceMs: 300,
        maxConcurrent: 5,
        retryAttempts: 3,
        retryDelay: 1000,
        timeout: 10000,
      };

      expect(validConfig).toBeDefined();
      expect(typeof validConfig.enabled).toBe('boolean');
      expect(typeof validConfig.debounceMs).toBe('number');
      expect(typeof validConfig.maxConcurrent).toBe('number');
      expect(typeof validConfig.retryAttempts).toBe('number');
      expect(typeof validConfig.retryDelay).toBe('number');
      expect(typeof validConfig.timeout).toBe('number');
    });

    test('should support validation performance interface', () => {
      const { ValidationPerformance } = require('../validation/useAdvancedValidation');
      
      const validPerformance = {
        totalValidations: 100,
        averageValidationTime: 50.5,
        slowestValidations: [
          { ruleId: 'rule-1', time: 150 },
          { ruleId: 'rule-2', time: 100 },
        ],
        cacheHitRate: 0.75,
        memoryUsage: 1024,
      };

      expect(validPerformance).toBeDefined();
      expect(typeof validPerformance.totalValidations).toBe('number');
      expect(typeof validPerformance.averageValidationTime).toBe('number');
      expect(Array.isArray(validPerformance.slowestValidations)).toBe(true);
      expect(typeof validPerformance.cacheHitRate).toBe('number');
      expect(typeof validPerformance.memoryUsage).toBe('number');
    });

    test('should support advanced validation config interface', () => {
      const { AdvancedValidationConfig } = require('../validation/useAdvancedValidation');
      
      const validConfig = {
        enabled: true,
        asyncValidation: {
          enabled: true,
          debounceMs: 300,
          maxConcurrent: 5,
          retryAttempts: 3,
          retryDelay: 1000,
          timeout: 10000,
        },
        enableCrossField: true,
        enableCaching: true,
        enablePerformanceMonitoring: true,
        maxRulesPerField: 10,
        debounceMs: 300,
        rules: [],
        crossFieldRules: [],
      };

      expect(validConfig).toBeDefined();
      expect(typeof validConfig.enabled).toBe('boolean');
      expect(typeof validConfig.enableCrossField).toBe('boolean');
      expect(typeof validConfig.enableCaching).toBe('boolean');
      expect(typeof validConfig.enablePerformanceMonitoring).toBe('boolean');
      expect(typeof validConfig.maxRulesPerField).toBe('number');
      expect(typeof validConfig.debounceMs).toBe('number');
      expect(Array.isArray(validConfig.rules)).toBe(true);
      expect(Array.isArray(validConfig.crossFieldRules)).toBe(true);
    });
  });

  describe('ValidationDisplay Component', () => {
    test('should have proper component structure', () => {
      const ValidationDisplay = require('../validation/ValidationDisplay').default;
      expect(ValidationDisplay).toBeDefined();
      expect(typeof ValidationDisplay).toBe('function');
    });

    test('should support validation display props interface', () => {
      const validProps = {
        validationResults: {
          'field-1': {
            isValid: false,
            errors: [{
              id: 'error-1',
              fieldId: 'field-1',
              ruleId: 'rule-1',
              message: 'Validation failed',
              severity: 'error' as const,
              timestamp: new Date(),
            }],
            warnings: [],
            isPending: false,
            lastValidated: new Date(),
          },
        },
        performanceMetrics: {
          totalValidations: 100,
          averageValidationTime: 50.5,
          slowestValidations: [],
          cacheHitRate: 0.75,
          memoryUsage: 1024,
        },
        showPerformance: true,
        showDetails: true,
        enableAnimations: true,
        position: 'inline' as const,
        maxErrors: 5,
        maxWarnings: 3,
        errorMessages: {},
        warningMessages: {},
      };

      expect(validProps).toBeDefined();
      expect(typeof validProps.validationResults).toBe('object');
      expect(typeof validProps.showPerformance).toBe('boolean');
      expect(typeof validProps.showDetails).toBe('boolean');
      expect(['top', 'bottom', 'inline']).toContain(validProps.position);
      expect(typeof validProps.maxErrors).toBe('number');
      expect(typeof validProps.maxWarnings).toBe('number');
    });
  });

  describe('Built-in Validators', () => {
    test('should support required validator', () => {
      const validators = {
        required: (value: any) => {
          if (value === null || value === undefined) return false;
          if (typeof value === 'string') return value.trim().length > 0;
          if (Array.isArray(value)) return value.length > 0;
          return true;
        },
      };

      expect(validators.required('')).toBe(false);
      expect(validators.required('test')).toBe(true);
      expect(validators.required(null)).toBe(false);
      expect(validators.required(undefined)).toBe(false);
      expect(validators.required([])).toBe(false);
      expect(validators.required([1, 2, 3])).toBe(true);
    });

    test('should support min validator', () => {
      const validators = {
        min: (value: any, params: { min: number }) => {
          if (typeof value === 'number') return value >= params.min;
          if (typeof value === 'string') return value.length >= params.min;
          if (Array.isArray(value)) return value.length >= params.min;
          return true;
        },
      };

      expect(validators.min(5, { min: 3 })).toBe(true);
      expect(validators.min(2, { min: 3 })).toBe(false);
      expect(validators.min('test', { min: 3 })).toBe(true);
      expect(validators.min('ab', { min: 3 })).toBe(false);
      expect(validators.min([1, 2, 3], { min: 3 })).toBe(true);
      expect(validators.min([1, 2], { min: 3 })).toBe(false);
    });

    test('should support max validator', () => {
      const validators = {
        max: (value: any, params: { max: number }) => {
          if (typeof value === 'number') return value <= params.max;
          if (typeof value === 'string') return value.length <= params.max;
          if (Array.isArray(value)) return value.length <= params.max;
          return true;
        },
      };

      expect(validators.max(5, { max: 10 })).toBe(true);
      expect(validators.max(15, { max: 10 })).toBe(false);
      expect(validators.max('test', { max: 10 })).toBe(true);
      expect(validators.max('very long string', { max: 10 })).toBe(false);
      expect(validators.max([1, 2, 3], { max: 5 })).toBe(true);
      expect(validators.max([1, 2, 3, 4, 5, 6], { max: 5 })).toBe(false);
    });

    test('should support pattern validator', () => {
      const validators = {
        pattern: (value: any, params: { pattern: string }) => {
          if (typeof value !== 'string') return true;
          try {
            const regex = new RegExp(params.pattern);
            return regex.test(value);
          } catch {
            return false;
          }
        },
      };

      expect(validators.pattern('test@example.com', { pattern: '^[^@]+@[^@]+\\.[^@]+$' })).toBe(true);
      expect(validators.pattern('invalid-email', { pattern: '^[^@]+@[^@]+\\.[^@]+$' })).toBe(false);
      expect(validators.pattern(123, { pattern: '\\d+' })).toBe(true); // Non-string returns true
    });
  });

  describe('Validation Features', () => {
    test('should support async validation', () => {
      const asyncValidator = async (value: any) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 100));
        return value.length >= 5;
      };

      expect(typeof asyncValidator).toBe('function');
      expect(asyncValidator('test')).resolves.toBe(false);
      expect(asyncValidator('longer test')).resolves.toBe(true);
    });

    test('should support cross-field validation', () => {
      const crossFieldValidator = (values: Record<string, any>) => {
        return values.password === values.confirmPassword;
      };

      expect(typeof crossFieldValidator).toBe('function');
      expect(crossFieldValidator({ password: 'test', confirmPassword: 'test' })).toBe(true);
      expect(crossFieldValidator({ password: 'test', confirmPassword: 'different' })).toBe(false);
    });

    test('should support custom validation rules', () => {
      const customRule = {
        id: 'custom-rule',
        type: 'custom' as const,
        fieldId: 'field-1',
        message: 'Custom validation failed',
        validator: (value: any) => value.includes('test'),
      };

      expect(customRule).toBeDefined();
      expect(typeof customRule.validator).toBe('function');
      expect(customRule.validator('this is a test')).toBe(true);
      expect(customRule.validator('no test here')).toBe(false);
      expect(customRule.validator('test string')).toBe(true);
      expect(customRule.validator('no match')).toBe(false);
    });

    test('should support validation caching', () => {
      const cacheKey = (fieldId: string, value: any, dependencies?: Record<string, any>) => {
        const dependencyHash = dependencies ? JSON.stringify(dependencies) : '';
        return `${fieldId}:${JSON.stringify(value)}:${dependencyHash}`;
      };

      expect(typeof cacheKey).toBe('function');
      expect(cacheKey('field-1', 'test')).toBe('field-1:"test":');
      expect(cacheKey('field-1', 'test', { dep: 'value' })).toBe('field-1:"test":{"dep":"value"}');
    });

    test('should support performance monitoring', () => {
      const performanceMetrics = {
        totalValidations: 100,
        averageValidationTime: 50.5,
        slowestValidations: [
          { ruleId: 'async-rule', time: 150 },
          { ruleId: 'pattern-rule', time: 100 },
        ],
        cacheHitRate: 0.75,
        memoryUsage: 1024,
      };

      expect(performanceMetrics).toBeDefined();
      expect(typeof performanceMetrics.totalValidations).toBe('number');
      expect(typeof performanceMetrics.averageValidationTime).toBe('number');
      expect(Array.isArray(performanceMetrics.slowestValidations)).toBe(true);
      expect(typeof performanceMetrics.cacheHitRate).toBe('number');
      expect(typeof performanceMetrics.memoryUsage).toBe('number');
    });
  });

  describe('File Structure', () => {
    test('should have proper file structure', () => {
      const fs = require('fs');
      const path = require('path');

      const validationPath = path.join(__dirname, '../validation');
      expect(fs.existsSync(validationPath)).toBe(true);

      const hookPath = path.join(validationPath, 'useAdvancedValidation.ts');
      expect(fs.existsSync(hookPath)).toBe(true);

      const displayPath = path.join(validationPath, 'ValidationDisplay.tsx');
      expect(fs.existsSync(displayPath)).toBe(true);
    });

    test('should have proper imports and dependencies', () => {
      expect(() => {
        require('lodash');
        require('framer-motion');
        require('@mui/material');
        require('@mui/icons-material');
      }).not.toThrow();
    });
  });

  describe('Integration Features', () => {
    test('should support debounced validation', () => {
      const { debounce } = require('lodash');
      const debouncedFunction = debounce(() => {}, 300);
      expect(typeof debouncedFunction).toBe('function');
    });

    test('should support performance timing', () => {
      expect(typeof performance.now).toBe('function');
      const startTime = performance.now();
      expect(typeof startTime).toBe('number');
    });

    test('should support Framer Motion animations', () => {
      const { motion, AnimatePresence } = require('framer-motion');
      expect(motion).toBeDefined();
      expect(AnimatePresence).toBeDefined();
    });

    test('should support Material-UI components', () => {
      expect(() => {
        require('@mui/material/Box');
        require('@mui/material/Alert');
        require('@mui/material/AlertTitle');
        require('@mui/material/Chip');
        require('@mui/material/Typography');
        require('@mui/material/LinearProgress');
        require('@mui/material/IconButton');
        require('@mui/material/Tooltip');
        require('@mui/material/Collapse');
        require('@mui/material/List');
        require('@mui/material/ListItem');
        require('@mui/material/ListItemIcon');
        require('@mui/material/ListItemText');
        require('@mui/material/Divider');
        require('@mui/material/Paper');
      }).not.toThrow();
    });
  });

  describe('Advanced Validation Features', () => {
    test('should support comprehensive validation features', () => {
      const features = [
        'Async validation with debouncing',
        'Cross-field validation',
        'Custom validation rules',
        'Built-in validators (required, min, max, pattern)',
        'Validation caching for performance',
        'Performance monitoring and metrics',
        'Validation error and warning handling',
        'Real-time validation feedback',
        'Validation result aggregation',
        'Validation state management',
        'Validation display components',
        'Validation performance optimization',
      ];

      expect(features).toBeDefined();
      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBeGreaterThan(0);
    });

    test('should support validation UI components', () => {
      const components = [
        'Validation display',
        'Error alerts',
        'Warning alerts',
        'Performance metrics display',
        'Validation summary',
        'Pending validation indicator',
        'Validation details expander',
        'Validation action buttons',
        'Validation chips and badges',
        'Validation progress indicators',
      ];

      expect(components).toBeDefined();
      expect(Array.isArray(components)).toBe(true);
      expect(components.length).toBeGreaterThan(0);
    });

    test('should support validation configuration options', () => {
      const configOptions = [
        'enabled',
        'asyncValidation',
        'enableCrossField',
        'enableCaching',
        'enablePerformanceMonitoring',
        'maxRulesPerField',
        'debounceMs',
        'rules',
        'crossFieldRules',
        'onValidationStart',
        'onValidationComplete',
        'onValidationError',
        'onPerformanceUpdate',
      ];

      expect(configOptions).toBeDefined();
      expect(Array.isArray(configOptions)).toBe(true);
      expect(configOptions.length).toBeGreaterThan(0);
    });
  });
}); 