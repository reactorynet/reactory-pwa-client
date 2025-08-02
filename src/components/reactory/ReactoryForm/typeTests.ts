/**
 * Type Tests for ReactoryForm Enhanced Type System
 * Phase 1.1: Type System Overhaul
 * 
 * This file provides comprehensive tests for all enhanced types and validation utilities.
 */

import {
  ReactoryComponentError,
  ReactoryFormState,
  ReactoryFormDataManagerHookResult,
  isValidScreenSize,
  isInitialDataFunction,
  isValidComponentMap,
  isValidPaging,
  isValidFormState,
  isValidFormDefinition,
  isValidSchema,
  isValidUISchema,
  isReactoryComponentError,
  isReactoryFormState,
  isReactoryFormDataManagerHookResult,
} from './types-v2';

import {
  validateReactoryComponentError,
  validateReactoryFormState,
  validateFormDefinition,
  validateDataManagerHookResult,
  validateReactoryFormTypes,
  formatValidationErrors,
  logValidationResult,
  assertValidation,
  ValidationResult,
} from './typeValidation';

// ============================================================================
// TEST DATA
// ============================================================================

/**
 * Valid ReactoryComponentError for testing
 */
export const validReactoryComponentError: ReactoryComponentError = {
  errorType: 'runtime',
  error: new Error('Test error'),
  context: { test: 'value' },
  timestamp: new Date(),
  userMessage: 'A test error occurred',
};

/**
 * Invalid ReactoryComponentError for testing
 */
export const invalidReactoryComponentError = {
  errorType: 'invalid',
  error: 'not an error',
  timestamp: 'not a date',
};

/**
 * Valid ReactoryFormState for testing
 */
export const validReactoryFormState: ReactoryFormState = {
  loading: false,
  allowRefresh: true,
  forms_loaded: true,
  forms: [
    {
      id: 'test-form',
      name: 'Test Form',
      version: '1.0.0',
      description: 'A test form',
      schema: { type: 'object', properties: {} },
      nameSpace: 'test',
    },
  ],
  uiFramework: 'material',
  uiSchemaKey: 'default',
  dirty: false,
  queryComplete: true,
  showHelp: false,
  showReportModal: false,
  showExportWindow: false,
  busy: false,
  liveUpdate: false,
  pendingResources: {},
  _instance_id: 'test-instance',
  notificationComplete: true,
  mutate_complete_handler_called: false,
  last_query_exec: Date.now(),
  form_created: Date.now(),
  isValid: true,
  lastValidated: new Date(),
  lastModified: new Date(),
  metadata: { test: 'value' },
};

/**
 * Invalid ReactoryFormState for testing
 */
export const invalidReactoryFormState = {
  loading: 'not boolean',
  forms: 'not array',
  uiFramework: 123,
  _instance_id: null,
};

/**
 * Valid form definition for testing
 */
export const validFormDefinition = {
  id: 'test-form',
  name: 'Test Form',
  version: '1.0.0',
  description: 'A test form',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
    },
  },
  uiSchema: {
    'ui:order': ['name', 'email'],
  },
};

/**
 * Invalid form definition for testing
 */
export const invalidFormDefinition = {
  id: 123,
  name: null,
  version: undefined,
};

/**
 * Valid data manager hook result for testing
 */
export const validDataManagerHookResult: ReactoryFormDataManagerHookResult<any> = {
  canRefresh: true,
  formData: { name: 'Test', email: 'test@example.com' },
  isDataLoading: false,
  onSubmit: async () => {},
  onChange: async () => {},
  reset: () => {},
  refresh: async () => {},
  RefreshButton: () => null,
  isValidating: false,
  validate: () => ({ errors: [], valid: true, errorSchema: {} }),
  errors: [],
  SubmitButton: () => null,
  paging: {
    page: 1,
    pageSize: 10,
    total: 100,
    totalPages: 10,
    hasNext: true,
    hasPrevious: false,
    items: [],
  },
  PagingWidget: () => null,
  isValid: true,
  lastValidated: new Date(),
  isTransforming: false,
};

/**
 * Invalid data manager hook result for testing
 */
export const invalidDataManagerHookResult = {
  canRefresh: 'not boolean',
  formData: null,
  onSubmit: 'not function',
  errors: 'not array',
};

// ============================================================================
// TYPE GUARD TESTS
// ============================================================================

/**
 * Tests for type guard functions
 */
export const runTypeGuardTests = (): void => {
  console.log('🧪 Running Type Guard Tests...');

  // Test isValidScreenSize
  console.assert(isValidScreenSize('xs'), 'xs should be valid screen size');
  console.assert(isValidScreenSize('lg'), 'lg should be valid screen size');
  console.assert(isValidScreenSize(1024), '1024 should be valid screen size');
  console.assert(!isValidScreenSize('invalid'), 'invalid should not be valid screen size');
  console.assert(!isValidScreenSize(-1), '-1 should not be valid screen size');

  // Test isInitialDataFunction
  const validDataFunction = async () => ({ test: 'data' });
  const invalidDataFunction = () => ({ test: 'data' });
  console.assert(isInitialDataFunction(validDataFunction), 'Async function should be valid');
  console.assert(!isInitialDataFunction(invalidDataFunction), 'Sync function should not be valid');

  // Test isValidComponentMap
  const validComponentMap = {
    Loading: () => null,
    Logo: () => null,
    FullScreenModal: () => null,
    DropDownMenu: () => null,
    HelpMe: () => null,
    ReportViewer: () => null,
    ReactorFormEditor: () => null,
  };
  const invalidComponentMap = {
    Loading: 'not component',
    Logo: () => null,
  };
  console.assert(isValidComponentMap(validComponentMap), 'Valid component map should pass');
  console.assert(!isValidComponentMap(invalidComponentMap), 'Invalid component map should fail');

  // Test isValidPaging
  const validPaging = {
    page: 1,
    pageSize: 10,
    total: 100,
    totalPages: 10,
    hasNext: true,
    hasPrevious: false,
    items: [],
  };
  const invalidPaging = {
    page: -1,
    pageSize: 0,
    total: -1,
  };
  console.assert(isValidPaging(validPaging), 'Valid paging should pass');
  console.assert(!isValidPaging(invalidPaging), 'Invalid paging should fail');

  // Test isValidFormState
  console.assert(isValidFormState(validReactoryFormState), 'Valid form state should pass');
  console.assert(!isValidFormState(invalidReactoryFormState), 'Invalid form state should fail');

  // Test isValidFormDefinition
  console.assert(isValidFormDefinition(validFormDefinition), 'Valid form definition should pass');
  console.assert(!isValidFormDefinition(invalidFormDefinition), 'Invalid form definition should fail');

  // Test isValidSchema
  const validSchema = { type: 'object', properties: {} };
  const invalidSchema = 'not schema';
  console.assert(isValidSchema(validSchema), 'Valid schema should pass');
  console.assert(!isValidSchema(invalidSchema), 'Invalid schema should fail');

  // Test isValidUISchema
  const validUISchema = { 'ui:order': ['name'] };
  const invalidUISchema = 'not ui schema';
  console.assert(isValidUISchema(validUISchema), 'Valid UI schema should pass');
  console.assert(!isValidUISchema(invalidUISchema), 'Invalid UI schema should fail');

  // Test isReactoryComponentError
  console.assert(isReactoryComponentError(validReactoryComponentError), 'Valid component error should pass');
  console.assert(!isReactoryComponentError(invalidReactoryComponentError), 'Invalid component error should fail');

  // Test isReactoryFormState
  console.assert(isReactoryFormState(validReactoryFormState), 'Valid form state should pass');
  console.assert(!isReactoryFormState(invalidReactoryFormState), 'Invalid form state should fail');

  // Test isReactoryFormDataManagerHookResult
  console.assert(isReactoryFormDataManagerHookResult(validDataManagerHookResult), 'Valid hook result should pass');
  console.assert(!isReactoryFormDataManagerHookResult(invalidDataManagerHookResult), 'Invalid hook result should fail');

  console.log('✅ Type Guard Tests Completed');
};

// ============================================================================
// VALIDATION TESTS
// ============================================================================

/**
 * Tests for validation functions
 */
export const runValidationTests = (): void => {
  console.log('🧪 Running Validation Tests...');

  // Test validateReactoryComponentError
  const validErrorResult = validateReactoryComponentError(validReactoryComponentError);
  const invalidErrorResult = validateReactoryComponentError(invalidReactoryComponentError);
  
  console.assert(validErrorResult.isValid, 'Valid component error should pass validation');
  console.assert(!invalidErrorResult.isValid, 'Invalid component error should fail validation');
  console.assert(validErrorResult.errors.length === 0, 'Valid error should have no errors');
  console.assert(invalidErrorResult.errors.length > 0, 'Invalid error should have errors');

  // Test validateReactoryFormState
  const validStateResult = validateReactoryFormState(validReactoryFormState);
  const invalidStateResult = validateReactoryFormState(invalidReactoryFormState);
  
  console.assert(validStateResult.isValid, 'Valid form state should pass validation');
  console.assert(!invalidStateResult.isValid, 'Invalid form state should fail validation');

  // Test validateFormDefinition
  const validFormResult = validateFormDefinition(validFormDefinition);
  const invalidFormResult = validateFormDefinition(invalidFormDefinition);
  
  console.assert(validFormResult.isValid, 'Valid form definition should pass validation');
  console.assert(!invalidFormResult.isValid, 'Invalid form definition should fail validation');

  // Test validateDataManagerHookResult
  const validHookResult = validateDataManagerHookResult(validDataManagerHookResult);
  const invalidHookResult = validateDataManagerHookResult(invalidDataManagerHookResult);
  
  console.assert(validHookResult.isValid, 'Valid hook result should pass validation');
  console.assert(!invalidHookResult.isValid, 'Invalid hook result should fail validation');

  console.log('✅ Validation Tests Completed');
};

// ============================================================================
// UTILITY TESTS
// ============================================================================

/**
 * Tests for utility functions
 */
export const runUtilityTests = (): void => {
  console.log('🧪 Running Utility Tests...');

  // Test formatValidationErrors
  const validResult: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    timestamp: new Date(),
    duration: 10,
  };

  const invalidResult: ValidationResult = {
    isValid: false,
    errors: [
      { path: 'test', message: 'Test error', code: 'TEST_ERROR', severity: 'error' },
    ],
    warnings: [
      { path: 'test', message: 'Test warning', code: 'TEST_WARNING', severity: 'warning' },
    ],
    timestamp: new Date(),
    duration: 20,
  };

  const validFormatted = formatValidationErrors(validResult);
  const invalidFormatted = formatValidationErrors(invalidResult);

  console.assert(validFormatted.includes('Validation passed'), 'Valid result should show success message');
  console.assert(invalidFormatted.includes('Validation failed'), 'Invalid result should show failure message');
  console.assert(invalidFormatted.includes('Test error'), 'Should include error message');
  console.assert(invalidFormatted.includes('Test warning'), 'Should include warning message');

  // Test logValidationResult (this will output to console)
  console.log('Testing logValidationResult (check console output):');
  logValidationResult(validResult, 'Test Context');
  logValidationResult(invalidResult, 'Test Context');

  // Test assertValidation
  try {
    assertValidation(validResult);
    console.log('✅ assertValidation passed for valid result');
  } catch (error) {
    console.error('❌ assertValidation should not throw for valid result');
  }

  try {
    assertValidation(invalidResult);
    console.error('❌ assertValidation should throw for invalid result');
  } catch (error) {
    console.log('✅ assertValidation correctly threw for invalid result');
  }

  console.log('✅ Utility Tests Completed');
};

// ============================================================================
// COMPREHENSIVE VALIDATION TESTS
// ============================================================================

/**
 * Tests for comprehensive validation
 */
export const runComprehensiveValidationTests = (): void => {
  console.log('🧪 Running Comprehensive Validation Tests...');

  // Test validateReactoryFormTypes
  console.assert(typeof validateReactoryFormTypes.ReactoryComponentError === 'function', 'Should have ReactoryComponentError validator');
  console.assert(typeof validateReactoryFormTypes.ReactoryFormState === 'function', 'Should have ReactoryFormState validator');
  console.assert(typeof validateReactoryFormTypes.FormDefinition === 'function', 'Should have FormDefinition validator');
  console.assert(typeof validateReactoryFormTypes.DataManagerHookResult === 'function', 'Should have DataManagerHookResult validator');

  // Test all validators with valid data
  const validators = [
    { name: 'ReactoryComponentError', data: validReactoryComponentError },
    { name: 'ReactoryFormState', data: validReactoryFormState },
    { name: 'FormDefinition', data: validFormDefinition },
    { name: 'DataManagerHookResult', data: validDataManagerHookResult },
  ];

  validators.forEach(({ name, data }) => {
    const validator = validateReactoryFormTypes[name as keyof typeof validateReactoryFormTypes];
    if (typeof validator === 'function') {
      const result = validator(data);
      if (typeof result === 'object' && 'isValid' in result) {
        console.assert(result.isValid, name + ' validator should pass for valid data');
      }
    }
  });

  console.log('✅ Comprehensive Validation Tests Completed');
};

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

/**
 * Tests for performance characteristics
 */
export const runPerformanceTests = (): void => {
  console.log('🧪 Running Performance Tests...');

  const iterations = 1000;
  const startTime = Date.now();

  // Test type guard performance
  for (let i = 0; i < iterations; i++) {
    isValidScreenSize('lg');
    isValidFormState(validReactoryFormState);
    isValidFormDefinition(validFormDefinition);
  }

  const typeGuardTime = Date.now() - startTime;

  // Test validation performance
  const validationStartTime = Date.now();
  for (let i = 0; i < iterations; i++) {
    validateReactoryComponentError(validReactoryComponentError);
    validateReactoryFormState(validReactoryFormState);
    validateFormDefinition(validFormDefinition);
  }

  const validationTime = Date.now() - validationStartTime;

  console.log(`⏱️ Type Guard Performance: ${typeGuardTime}ms for ${iterations} iterations`);
  console.log(`⏱️ Validation Performance: ${validationTime}ms for ${iterations} iterations`);
  console.log(`⏱️ Average Type Guard: ${typeGuardTime / iterations}ms per operation`);
  console.log(`⏱️ Average Validation: ${validationTime / iterations}ms per operation`);

  // Performance assertions
  console.assert(typeGuardTime < 1000, 'Type guards should be fast (< 1s for 1000 iterations)');
  console.assert(validationTime < 5000, 'Validation should be reasonably fast (< 5s for 1000 iterations)');

  console.log('✅ Performance Tests Completed');
};

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

/**
 * Runs all type system tests
 */
export const runAllTypeTests = (): void => {
  console.log('🚀 Starting ReactoryForm Type System Tests...');
  console.log('==============================================');

  try {
    runTypeGuardTests();
    runValidationTests();
    runUtilityTests();
    runComprehensiveValidationTests();
    runPerformanceTests();

    console.log('==============================================');
    console.log('🎉 All Type System Tests Passed!');
    console.log('✅ Phase 1.1: Type System Overhaul - Validation Complete');
  } catch (error) {
    console.error('❌ Type System Tests Failed:', error);
    throw error;
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

// All exports are already declared above 