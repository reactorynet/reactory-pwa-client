import { useCallback } from 'react';

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
}

export const useSchemaValidation = () => {
  const validateJsonString = useCallback((jsonString: string): SchemaValidationResult => {
    const errors: string[] = [];

    if (!jsonString.trim()) {
      return { isValid: true, errors: [] };
    }

    try {
      const parsed = JSON.parse(jsonString);

      // Basic JSON Schema validation
      if (typeof parsed !== 'object' || parsed === null) {
        errors.push('Schema must be an object');
        return { isValid: false, errors };
      }

      // Check for required JSON Schema properties
      if (!parsed.type && !parsed.properties && !parsed.items) {
        errors.push('Schema should have at least a type, properties, or items field');
      }

      // Validate type field if present
      if (parsed.type && !['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'].includes(parsed.type)) {
        errors.push(`Invalid type: ${parsed.type}`);
      }

      // Check for circular references (basic check)
      try {
        JSON.stringify(parsed);
      } catch (circularError) {
        errors.push('Circular reference detected in schema');
        return { isValid: false, errors };
      }

      return { isValid: errors.length === 0, errors };
    } catch (parseError: any) {
      errors.push(`Invalid JSON: ${parseError.message}`);
      return { isValid: false, errors };
    }
  }, []);

  const validateSchemaChange = useCallback((
    newSchemaString: string,
    onValidationChange?: (isValid: boolean, errors?: string[]) => void,
    onSchemaUpdate?: (schema: any) => void
  ) => {
    const validation = validateJsonString(newSchemaString);

    // Call validation callback
    onValidationChange?.(validation.isValid, validation.errors);

    // If valid, parse and update schema
    if (validation.isValid && newSchemaString.trim()) {
      try {
        const parsed = JSON.parse(newSchemaString);
        onSchemaUpdate?.(parsed);
      } catch (error) {
        // This shouldn't happen since we already validated, but just in case
        console.warn('Unexpected parsing error after validation:', error);
      }
    }

    return validation;
  }, [validateJsonString]);

  const validateUISchemaChange = useCallback((
    newUISchemaString: string,
    onValidationChange?: (isValid: boolean, errors?: string[]) => void,
    onUISchemaUpdate?: (uiSchema: any) => void
  ) => {
    // UI Schema is more lenient - we mainly check if it's valid JSON
    const errors: string[] = [];

    if (!newUISchemaString.trim()) {
      onValidationChange?.(true, []);
      onUISchemaUpdate?.({});
      return { isValid: true, errors: [] };
    }

    try {
      const parsed = JSON.parse(newUISchemaString);

      // Basic validation - UI schema should be an object
      if (typeof parsed !== 'object' || parsed === null) {
        errors.push('UI Schema must be an object');
      }

      const isValid = errors.length === 0;
      onValidationChange?.(isValid, errors);

      if (isValid) {
        onUISchemaUpdate?.(parsed);
      }

      return { isValid, errors };
    } catch (parseError: any) {
      errors.push(`Invalid JSON: ${parseError.message}`);
      onValidationChange?.(false, errors);
      return { isValid: false, errors };
    }
  }, []);

  return {
    validateJsonString,
    validateSchemaChange,
    validateUISchemaChange
  };
};