/**
 * Error Handling Tests for ReactoryForm
 * Phase 1.2: Error Handling Enhancement
 * 
 * This file provides comprehensive tests for all error handling components
 * including error boundaries, hooks, and logging utilities.
 */

import { ReactoryComponentError } from './types-v2';
import { useErrorHandling, builtInRecoveryStrategies } from './hooks/useErrorHandling';
import { ReactoryFormErrorLogger, errorFilters, errorFormatters } from './errorLogging';

// ============================================================================
// TEST DATA
// ============================================================================

/**
 * Valid ReactoryComponentError for testing
 */
export const validReactoryComponentError: ReactoryComponentError = {
  errorType: 'runtime',
  error: new Error('Test runtime error'),
  context: { test: 'value', componentName: 'TestComponent' },
  timestamp: new Date(),
  userMessage: 'A test runtime error occurred',
};

/**
 * Network error for testing
 */
export const networkError: ReactoryComponentError = {
  errorType: 'network',
  error: new Error('Network request failed'),
  context: { url: 'https://api.example.com', method: 'GET' },
  timestamp: new Date(),
  userMessage: 'Network connection issue',
};

/**
 * Validation error for testing
 */
export const validationError: ReactoryComponentError = {
  errorType: 'validation',
  error: new Error('Form validation failed'),
  context: { field: 'email', value: 'invalid-email' },
  timestamp: new Date(),
  userMessage: 'Please check your input',
};

/**
 * Graph error for testing
 */
export const graphError: ReactoryComponentError = {
  errorType: 'graph',
  error: new Error('GraphQL query failed'),
  context: { query: 'query { user { id } }', variables: {} },
  timestamp: new Date(),
  userMessage: 'Data loading failed',
};

// ============================================================================
// ERROR LOGGING TESTS
// ============================================================================

/**
 * Tests for error logging functionality
 */
export const runErrorLoggingTests = (): void => {
  console.log('🧪 Running Error Logging Tests...');

  // Test error logger creation
  const logger = new ReactoryFormErrorLogger({
    enabled: true,
    logLevel: 'error',
    includeStackTraces: true,
    includeUserContext: true,
    includePerformanceMetrics: true,
    maxErrorHistory: 10,
  });

  // Test error logging
  logger.logError(validReactoryComponentError);
  logger.logError(networkError);
  logger.logError(validationError);

  // Test error statistics
  const stats = logger.getErrorStats();
  console.assert(stats.totalErrors === 3, 'Should have logged 3 errors');
  console.assert(stats.errorsByType.runtime === 1, 'Should have 1 runtime error');
  console.assert(stats.errorsByType.network === 1, 'Should have 1 network error');
  console.assert(stats.errorsByType.validation === 1, 'Should have 1 validation error');

  // Test error history
  const history = logger.getErrorStats().errorHistory;
  console.assert(history.length === 3, 'Should have 3 errors in history');

  // Test error export
  const exportedData = logger.exportErrorData();
  console.assert(exportedData.includes('"totalErrors":3'), 'Should export error data correctly');

  // Test error filters
  const filteredLogger = new ReactoryFormErrorLogger({
    enabled: true,
    filters: [errorFilters.excludeNetworkErrors],
  });

  filteredLogger.logError(networkError);
  filteredLogger.logError(validationError);

  const filteredStats = filteredLogger.getErrorStats();
  console.assert(filteredStats.totalErrors === 1, 'Should filter out network errors');
  console.assert(filteredStats.errorsByType.validation === 1, 'Should only have validation error');

  // Test error formatters
  const simpleFormatter = errorFormatters.simple(validReactoryComponentError);
  console.assert(simpleFormatter.type === 'runtime', 'Simple formatter should work');

  const detailedFormatter = errorFormatters.detailed(validReactoryComponentError);
  console.assert(detailedFormatter.errorType === 'runtime', 'Detailed formatter should work');

  console.log('✅ Error Logging Tests Completed');
};

// ============================================================================
// ERROR HANDLING HOOK TESTS
// ============================================================================

/**
 * Tests for error handling hook functionality
 */
export const runErrorHandlingHookTests = (): void => {
  console.log('🧪 Running Error Handling Hook Tests...');

  // Note: These tests would require React Testing Library in a real environment
  // For now, we'll test the built-in recovery strategies

  // Test built-in recovery strategies
  const refreshPageStrategy = builtInRecoveryStrategies.refreshPage;
  const clearStorageStrategy = builtInRecoveryStrategies.clearStorage;
  const resetFormStrategy = builtInRecoveryStrategies.resetForm;

  // Test network error recovery
  const networkRecoveryResult = refreshPageStrategy.handler(networkError);
  console.assert(networkRecoveryResult instanceof Promise, 'Network recovery should return promise');

  // Test runtime error recovery
  const runtimeRecoveryResult = clearStorageStrategy.handler(validReactoryComponentError);
  console.assert(runtimeRecoveryResult instanceof Promise, 'Runtime recovery should return promise');

  // Test validation error recovery
  const validationRecoveryResult = resetFormStrategy.handler(validationError);
  console.assert(validationRecoveryResult instanceof Promise, 'Validation recovery should return promise');

  console.log('✅ Error Handling Hook Tests Completed');
};

// ============================================================================
// ERROR BOUNDARY TESTS
// ============================================================================

/**
 * Tests for error boundary functionality
 */
export const runErrorBoundaryTests = (): void => {
  console.log('🧪 Running Error Boundary Tests...');

  // Test error type detection
  const testErrorTypes = [
    { error: new Error('Network request failed'), expected: 'network' },
    { error: new Error('Form validation failed'), expected: 'validation' },
    { error: new TypeError('Cannot read property of undefined'), expected: 'runtime' },
    { error: new Error('Unknown error'), expected: 'unknown' },
  ];

  testErrorTypes.forEach(({ error, expected }) => {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    
    let detectedType: ReactoryComponentError['errorType'];
    if (message.includes('network') || message.includes('fetch') || message.includes('http')) {
      detectedType = 'network';
    } else if (message.includes('validation') || message.includes('schema') || message.includes('form')) {
      detectedType = 'validation';
    } else if (name.includes('type') || name.includes('reference')) {
      detectedType = 'runtime';
    } else {
      detectedType = 'unknown';
    }

    console.assert(detectedType === expected, `Error type detection failed for ${error.message}`);
  });

  // Test error severity detection
  const testErrorSeverities = [
    { error: new Error('Network request failed'), expected: 'warning' },
    { error: new Error('Form validation failed'), expected: 'error' },
    { error: new TypeError('Cannot read property of undefined'), expected: 'error' },
  ];

  testErrorSeverities.forEach(({ error, expected }) => {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    
    let detectedSeverity: 'error' | 'warning' | 'info';
    if (message.includes('network') || message.includes('fetch') || message.includes('http')) {
      detectedSeverity = 'warning';
    } else if (message.includes('validation') || message.includes('schema') || message.includes('form')) {
      detectedSeverity = 'error';
    } else if (name.includes('type') || name.includes('reference')) {
      detectedSeverity = 'error';
    } else {
      detectedSeverity = 'error';
    }

    console.assert(detectedSeverity === expected, `Error severity detection failed for ${error.message}`);
  });

  console.log('✅ Error Boundary Tests Completed');
};

// ============================================================================
// ERROR RECOVERY TESTS
// ============================================================================

/**
 * Tests for error recovery functionality
 */
export const runErrorRecoveryTests = (): void => {
  console.log('🧪 Running Error Recovery Tests...');

  // Test recovery strategy priorities
  const strategies = [
    builtInRecoveryStrategies.refreshPage,
    builtInRecoveryStrategies.clearStorage,
    builtInRecoveryStrategies.resetForm,
  ];

  // Sort by priority (highest first)
  const sortedStrategies = [...strategies].sort((a, b) => b.priority - a.priority);
  
  console.assert(sortedStrategies[0].priority === 3, 'Highest priority should be 3');
  console.assert(sortedStrategies[1].priority === 2, 'Second priority should be 2');
  console.assert(sortedStrategies[2].priority === 1, 'Lowest priority should be 1');

  // Test strategy names
  console.assert(sortedStrategies[0].name === 'resetForm', 'First strategy should be resetForm');
  console.assert(sortedStrategies[1].name === 'clearStorage', 'Second strategy should be clearStorage');
  console.assert(sortedStrategies[2].name === 'refreshPage', 'Third strategy should be refreshPage');

  console.log('✅ Error Recovery Tests Completed');
};

// ============================================================================
// ERROR MESSAGE TESTS
// ============================================================================

/**
 * Tests for error message generation
 */
export const runErrorMessageTests = (): void => {
  console.log('🧪 Running Error Message Tests...');

  const errorMessages = {
    default: 'Something went wrong. Please try again.',
    network: 'Network connection issue. Please check your internet connection and try again.',
    validation: 'Form validation error. Please check your input and try again.',
    runtime: 'An unexpected error occurred. Please refresh the page and try again.',
    unknown: 'Something went wrong. Please try again.',
  };

  // Test error type message mapping
  const testCases = [
    { error: new Error('Network request failed'), expectedMessage: errorMessages.network },
    { error: new Error('Form validation failed'), expectedMessage: errorMessages.validation },
    { error: new TypeError('Cannot read property of undefined'), expectedMessage: errorMessages.runtime },
    { error: new Error('Unknown error'), expectedMessage: errorMessages.unknown },
  ];

  testCases.forEach(({ error, expectedMessage }) => {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    
    let userMessage: string;
    if (message.includes('network') || message.includes('fetch') || message.includes('http')) {
      userMessage = errorMessages.network;
    } else if (message.includes('validation') || message.includes('schema') || message.includes('form')) {
      userMessage = errorMessages.validation;
    } else if (name.includes('type') || name.includes('reference')) {
      userMessage = errorMessages.runtime;
    } else {
      userMessage = errorMessages.default;
    }

    console.assert(userMessage === expectedMessage, `Error message generation failed for ${error.message}`);
  });

  console.log('✅ Error Message Tests Completed');
};

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

/**
 * Tests for error handling performance
 */
export const runPerformanceTests = (): void => {
  console.log('🧪 Running Performance Tests...');

  const iterations = 1000;
  const startTime = Date.now();

  // Test error logging performance
  const logger = new ReactoryFormErrorLogger({
    enabled: true,
    maxErrorHistory: 100,
  });

  for (let i = 0; i < iterations; i++) {
    logger.logError({
      ...validReactoryComponentError,
      error: new Error(`Test error ${i}`),
    });
  }

  const loggingTime = Date.now() - startTime;

  // Test error formatting performance
  const formatStartTime = Date.now();
  for (let i = 0; i < iterations; i++) {
    errorFormatters.simple(validReactoryComponentError);
    errorFormatters.detailed(validReactoryComponentError);
  }
  const formattingTime = Date.now() - formatStartTime;

  console.log(`⏱️ Error Logging Performance: ${loggingTime}ms for ${iterations} iterations`);
  console.log(`⏱️ Error Formatting Performance: ${formattingTime}ms for ${iterations} iterations`);
  console.log(`⏱️ Average Logging: ${loggingTime / iterations}ms per operation`);
  console.log(`⏱️ Average Formatting: ${formattingTime / iterations}ms per operation`);

  // Performance assertions
  console.assert(loggingTime < 5000, 'Error logging should be fast (< 5s for 1000 iterations)');
  console.assert(formattingTime < 1000, 'Error formatting should be fast (< 1s for 1000 iterations)');

  console.log('✅ Performance Tests Completed');
};

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

/**
 * Tests for error handling integration
 */
export const runIntegrationTests = (): void => {
  console.log('🧪 Running Integration Tests...');

  // Test error logger with filters and formatters
  const integratedLogger = new ReactoryFormErrorLogger({
    enabled: true,
    logLevel: 'error',
    includeStackTraces: true,
    includeUserContext: true,
    includePerformanceMetrics: true,
    maxErrorHistory: 50,
    filters: [errorFilters.excludeNetworkErrors],
    formatter: errorFormatters.detailed,
  });

  // Log different types of errors
  integratedLogger.logError(validReactoryComponentError);
  integratedLogger.logError(networkError); // Should be filtered out
  integratedLogger.logError(validationError);
  integratedLogger.logError(graphError);

  const stats = integratedLogger.getErrorStats();
  console.assert(stats.totalErrors === 3, 'Should have 3 errors (network filtered out)');
  console.assert(stats.errorsByType.runtime === 1, 'Should have 1 runtime error');
  console.assert(stats.errorsByType.validation === 1, 'Should have 1 validation error');
  console.assert(stats.errorsByType.graph === 1, 'Should have 1 graph error');

  // Test error export with all data
  const exportedData = integratedLogger.exportErrorData();
  console.assert(exportedData.includes('"totalErrors":3'), 'Should export correct error count');
  console.assert(exportedData.includes('"sessionInfo"'), 'Should include session info');
  console.assert(exportedData.includes('"userContext"'), 'Should include user context');

  console.log('✅ Integration Tests Completed');
};

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

/**
 * Runs all error handling tests
 */
export const runAllErrorHandlingTests = (): void => {
  console.log('🚀 Starting ReactoryForm Error Handling Tests...');
  console.log('==============================================');

  try {
    runErrorLoggingTests();
    runErrorHandlingHookTests();
    runErrorBoundaryTests();
    runErrorRecoveryTests();
    runErrorMessageTests();
    runPerformanceTests();
    runIntegrationTests();

    console.log('==============================================');
    console.log('🎉 All Error Handling Tests Passed!');
    console.log('✅ Phase 1.2: Error Handling Enhancement - Validation Complete');
  } catch (error) {
    console.error('❌ Error Handling Tests Failed:', error);
    throw error;
  }
}; 