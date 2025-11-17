/**
 * Runtime Type Validation Utilities
 * Phase 1.1: Type System Overhaul
 * 
 * This file provides comprehensive runtime validation for all ReactoryForm types.
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

// ============================================================================
// VALIDATION ERROR TYPES
// ============================================================================

/**
 * Validation error with detailed information
 */
export interface ValidationError {
  /** Field path where the error occurred */
  path: string;
  /** Error message */
  message: string;
  /** Error code for programmatic handling */
  code: string;
  /** Additional error context */
  context?: Record<string, any>;
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
}

/**
 * Validation result with errors and warnings
 */
export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  /** Array of validation errors */
  errors: ValidationError[];
  /** Array of validation warnings */
  warnings: ValidationError[];
  /** Validation timestamp */
  timestamp: Date;
  /** Validation duration in milliseconds */
  duration: number;
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Creates a validation error
 */
export const createValidationError = (
  path: string,
  message: string,
  code: string,
  severity: 'error' | 'warning' | 'info' = 'error',
  context?: Record<string, any>
): ValidationError => ({
  path,
  message,
  code,
  severity,
  context,
});

/**
 * Validates a ReactoryComponentError
 */
export const validateReactoryComponentError = (error: any): ValidationResult => {
  const startTime = Date.now();
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!error || typeof error !== 'object') {
    errors.push(createValidationError(
      'root',
      'Error must be an object',
      'INVALID_ERROR_TYPE'
    ));
    return {
      isValid: false,
      errors,
      warnings,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }

  // Validate errorType
  if (!error.errorType || typeof error.errorType !== 'string') {
    errors.push(createValidationError(
      'errorType',
      'Error type must be a string',
      'INVALID_ERROR_TYPE'
    ));
  } else {
    const validErrorTypes = ['graph', 'runtime', 'validation', 'network', 'unknown'];
    if (!validErrorTypes.includes(error.errorType)) {
      errors.push(createValidationError(
        'errorType',
        'Error type must be one of: ' + validErrorTypes.join(', '),
        'INVALID_ERROR_TYPE_VALUE'
      ));
    }
  }

  // Validate error object
  if (!error.error || !(error.error instanceof Error)) {
    errors.push(createValidationError(
      'error',
      'Error must be an Error instance',
      'INVALID_ERROR_INSTANCE'
    ));
  }

  // Validate timestamp
  if (!error.timestamp || !(error.timestamp instanceof Date)) {
    errors.push(createValidationError(
      'timestamp',
      'Timestamp must be a Date instance',
      'INVALID_TIMESTAMP'
    ));
  }

  // Validate optional fields
  if (error.context && typeof error.context !== 'object') {
    warnings.push(createValidationError(
      'context',
      'Context should be an object',
      'INVALID_CONTEXT_TYPE',
      'warning'
    ));
  }

  if (error.userMessage && typeof error.userMessage !== 'string') {
    warnings.push(createValidationError(
      'userMessage',
      'User message should be a string',
      'INVALID_USER_MESSAGE_TYPE',
      'warning'
    ));
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    timestamp: new Date(),
    duration: Date.now() - startTime,
  };
};

/**
 * Validates a ReactoryFormState
 */
export const validateReactoryFormState = (state: any): ValidationResult => {
  const startTime = Date.now();
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!state || typeof state !== 'object') {
    errors.push(createValidationError(
      'root',
      'State must be an object',
      'INVALID_STATE_TYPE'
    ));
    return {
      isValid: false,
      errors,
      warnings,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }

  // Validate required boolean fields
  const requiredBooleanFields = [
    'loading', 'forms_loaded', 'dirty', 'queryComplete', 
    'showHelp', 'showReportModal', 'showExportWindow', 'busy', 
    'liveUpdate', 'notificationComplete', 'mutate_complete_handler_called'
  ];

  requiredBooleanFields.forEach(field => {
    if (typeof state[field] !== 'boolean') {
      errors.push(createValidationError(
        field,
        field + ' must be a boolean',
        'INVALID_BOOLEAN_FIELD'
      ));
    }
  });

  // Validate required string fields
  const requiredStringFields = ['uiFramework', 'uiSchemaKey', '_instance_id'];

  requiredStringFields.forEach(field => {
    if (typeof state[field] !== 'string') {
      errors.push(createValidationError(
        field,
        field + ' must be a string',
        'INVALID_STRING_FIELD'
      ));
    }
  });

  // Validate forms array
  if (!Array.isArray(state.forms)) {
    errors.push(createValidationError(
      'forms',
      'Forms must be an array',
      'INVALID_FORMS_ARRAY'
    ));
  } else {
    state.forms.forEach((form: any, index: number) => {
      const formValidation = validateFormDefinition(form);
      if (!formValidation.isValid) {
        formValidation.errors.forEach(error => {
          errors.push(createValidationError(
            'forms[' + index + '].' + error.path,
            error.message,
            error.code
          ));
        });
      }
    });
  }

  // Validate optional number fields
  const optionalNumberFields = ['last_query_exec', 'form_created'];

  optionalNumberFields.forEach(field => {
    if (state[field] !== undefined && typeof state[field] !== 'number') {
      warnings.push(createValidationError(
        field,
        field + ' should be a number',
        'INVALID_NUMBER_FIELD',
        'warning'
      ));
    }
  });

  // Validate optional error fields
  if (state.queryError && !isReactoryComponentError(state.queryError)) {
    warnings.push(createValidationError(
      'queryError',
      'Query error should be a valid ReactoryComponentError',
      'INVALID_QUERY_ERROR',
      'warning'
    ));
  }

  if (state.formError && !isReactoryComponentError(state.formError)) {
    warnings.push(createValidationError(
      'formError',
      'Form error should be a valid ReactoryComponentError',
      'INVALID_FORM_ERROR',
      'warning'
    ));
  }

  // Validate optional allowRefresh field
  if (state.allowRefresh !== undefined && typeof state.allowRefresh !== 'boolean') {
    warnings.push(createValidationError(
      'allowRefresh',
      'Allow refresh should be a boolean',
      'INVALID_ALLOW_REFRESH',
      'warning'
    ));
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    timestamp: new Date(),
    duration: Date.now() - startTime,
  };
};

/**
 * Validates a form definition
 */
export const validateFormDefinition = (form: any): ValidationResult => {
  const startTime = Date.now();
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!form || typeof form !== 'object') {
    errors.push(createValidationError(
      'root',
      'Form definition must be an object',
      'INVALID_FORM_DEFINITION_TYPE'
    ));
    return {
      isValid: false,
      errors,
      warnings,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }

  // Validate required fields
  const requiredFields = ['id', 'name', 'version'];

  requiredFields.forEach(field => {
    if (!form[field]) {
      errors.push(createValidationError(
        field,
        field + ' is required',
        'MISSING_REQUIRED_FIELD'
      ));
    } else if (typeof form[field] !== 'string') {
      errors.push(createValidationError(
        field,
        field + ' must be a string',
        'INVALID_FIELD_TYPE'
      ));
    }
  });

  // Validate optional fields
  if (form.description && typeof form.description !== 'string') {
    warnings.push(createValidationError(
      'description',
      'Description should be a string',
      'INVALID_DESCRIPTION_TYPE',
      'warning'
    ));
  }

  if (form.schema && !isValidSchema(form.schema)) {
    warnings.push(createValidationError(
      'schema',
      'Schema should be a valid JSON Schema',
      'INVALID_SCHEMA',
      'warning'
    ));
  }

  if (form.uiSchema && !isValidUISchema(form.uiSchema)) {
    warnings.push(createValidationError(
      'uiSchema',
      'UI Schema should be a valid UI Schema',
      'INVALID_UI_SCHEMA',
      'warning'
    ));
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    timestamp: new Date(),
    duration: Date.now() - startTime,
  };
};

/**
 * Validates a data manager hook result
 */
export const validateDataManagerHookResult = <TData>(result: any): ValidationResult => {
  const startTime = Date.now();
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!result || typeof result !== 'object') {
    errors.push(createValidationError(
      'root',
      'Data manager hook result must be an object',
      'INVALID_RESULT_TYPE'
    ));
    return {
      isValid: false,
      errors,
      warnings,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }

  // Validate required boolean fields
  const requiredBooleanFields = ['canRefresh', 'isDataLoading', 'isValidating'];

  requiredBooleanFields.forEach(field => {
    if (typeof result[field] !== 'boolean') {
      errors.push(createValidationError(
        field,
        field + ' must be a boolean',
        'INVALID_BOOLEAN_FIELD'
      ));
    }
  });

  // Validate required function fields
  const requiredFunctionFields = ['onSubmit', 'onChange', 'reset', 'refresh', 'validate'];

  requiredFunctionFields.forEach(field => {
    if (typeof result[field] !== 'function') {
      errors.push(createValidationError(
        field,
        field + ' must be a function',
        'INVALID_FUNCTION_FIELD'
      ));
    }
  });

  // Validate required component fields
  const requiredComponentFields = ['RefreshButton', 'SubmitButton', 'PagingWidget'];

  requiredComponentFields.forEach(field => {
    if (typeof result[field] !== 'function') {
      errors.push(createValidationError(
        field,
        field + ' must be a React component',
        'INVALID_COMPONENT_FIELD'
      ));
    }
  });

  // Validate paging
  if (result.paging && !isValidPaging(result.paging)) {
    errors.push(createValidationError(
      'paging',
      'Paging must be a valid paging configuration',
      'INVALID_PAGING'
    ));
  }

  // Validate errors array
  if (!Array.isArray(result.errors)) {
    errors.push(createValidationError(
      'errors',
      'Errors must be an array',
      'INVALID_ERRORS_ARRAY'
    ));
  } else {
    result.errors.forEach((error: any, index: number) => {
      if (!error || typeof error !== 'object') {
        errors.push(createValidationError(
          'errors[' + index + ']',
          'Error must be an object',
          'INVALID_ERROR_OBJECT'
        ));
      } else {
        if (typeof error.name !== 'string') {
          errors.push(createValidationError(
            'errors[' + index + '].name',
            'Error name must be a string',
            'INVALID_ERROR_NAME'
          ));
        }
        if (typeof error.message !== 'string') {
          errors.push(createValidationError(
            'errors[' + index + '].message',
            'Error message must be a string',
            'INVALID_ERROR_MESSAGE'
          ));
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    timestamp: new Date(),
    duration: Date.now() - startTime,
  };
};

// ============================================================================
// COMPREHENSIVE VALIDATION
// ============================================================================

/**
 * Comprehensive validation for all ReactoryForm types
 */
export const validateReactoryFormTypes = {
  /**
   * Validates a ReactoryComponentError
   */
  ReactoryComponentError: validateReactoryComponentError,

  /**
   * Validates a ReactoryFormState
   */
  ReactoryFormState: validateReactoryFormState,

  /**
   * Validates a form definition
   */
  FormDefinition: validateFormDefinition,

  /**
   * Validates a data manager hook result
   */
  DataManagerHookResult: validateDataManagerHookResult,

  /**
   * Validates screen size
   */
  ScreenSize: isValidScreenSize,

  /**
   * Validates initial data function
   */
  InitialDataFunction: isInitialDataFunction,

  /**
   * Validates component map
   */
  ComponentMap: isValidComponentMap,

  /**
   * Validates paging configuration
   */
  Paging: isValidPaging,

  /**
   * Validates form state
   */
  FormState: isValidFormState,



  /**
   * Validates schema
   */
  Schema: isValidSchema,

  /**
   * Validates UI schema
   */
  UISchema: isValidUISchema,

  /**
   * Validates ReactoryComponentError
   */
  ComponentError: isReactoryComponentError,

  /**
   * Validates ReactoryFormState
   */
  State: isReactoryFormState,

  /**
   * Validates data manager hook result
   */
  HookResult: isReactoryFormDataManagerHookResult,
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Formats validation errors for display
 */
export const formatValidationErrors = (result: ValidationResult): string => {
  if (result.isValid) return 'Validation passed';

  const errorMessages = result.errors.map(error => 
    error.path + ': ' + error.message
  );

  const warningMessages = result.warnings.map(warning => 
    warning.path + ': ' + warning.message + ' (warning)'
  );

  return [
    'Validation failed:',
    ...errorMessages,
    ...warningMessages,
    'Duration: ' + result.duration + 'ms'
  ].join('\n');
};

/**
 * Logs validation results to console
 */
export const logValidationResult = (result: ValidationResult, context?: string): void => {
  const prefix = context ? '[' + context + ']' : '[Validation]';
  
  if (result.isValid) {
    console.log(prefix + ' Validation passed (' + result.duration + 'ms)');
  } else {
    console.error(prefix + ' Validation failed:');
    result.errors.forEach(error => {
      console.error('  ' + error.path + ': ' + error.message);
    });
    result.warnings.forEach(warning => {
      console.warn('  ' + warning.path + ': ' + warning.message + ' (warning)');
    });
    console.error('  Duration: ' + result.duration + 'ms');
  }
};

/**
 * Throws an error if validation fails
 */
export const assertValidation = (result: ValidationResult, context?: string): void => {
  if (!result.isValid) {
    throw new Error(formatValidationErrors(result));
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

// All exports are already declared above 