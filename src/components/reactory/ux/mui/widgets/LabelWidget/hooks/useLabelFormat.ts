/**
 * useLabelFormat Hook
 * 
 * Handles text formatting for LabelWidget including template processing,
 * boolean value handling, and custom format functions.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { template, isNil } from 'lodash';
import type Reactory from '@reactory/reactory-core';

export interface UseLabelFormatOptions {
  /** Format string template (lodash template syntax) */
  format?: string;
  
  /** Custom format function name in reactory.$func */
  $format?: string;
  
  /** Text to display when value is empty/null/undefined */
  emptyText?: string;
  
  /** Label for true boolean values */
  yesLabel?: string;
  
  /** Label for false boolean values */
  noLabel?: string;
}

export interface UseLabelFormatProps {
  /** Current form data value */
  formData: any;
  
  /** Alternative value prop */
  value?: any;
  
  /** JSON schema (used to detect boolean type) */
  schema?: Reactory.Schema.AnySchema;
  
  /** Full props object (passed to template context) */
  props: Record<string, any>;
  
  /** Reactory API instance */
  reactory: Reactory.Client.ReactorySDK;
  
  /** Format options */
  options: UseLabelFormatOptions;
}

export interface UseLabelFormatResult {
  /** The formatted label text */
  labelText: string;
  
  /** Whether there was an error during formatting */
  hasError: boolean;
  
  /** Error message if formatting failed */
  errorMessage: string | null;
  
  /** Whether the value is considered empty */
  isEmpty: boolean;
  
  /** Force re-format the text */
  reformat: () => void;
}

/**
 * Determines if a value should be treated as a boolean field
 */
function isBooleanField(formData: any, schema?: Reactory.Schema.AnySchema): boolean {
  if (typeof formData === 'boolean') return true;
  if (schema?.type === 'boolean') return true;
  return false;
}

/**
 * Formats a boolean value to a yes/no label
 */
function formatBooleanValue(
  boolValue: boolean,
  yesLabel: string = 'Yes',
  noLabel: string = 'No'
): string {
  if (boolValue) {
    return yesLabel;
  }
  return noLabel;
}

/**
 * Processes a lodash template string with the given context
 */
function processTemplate(
  formatString: string,
  context: Record<string, any>
): { result: string; error: string | null } {
  try {
    const compiled = template(formatString);
    return { result: compiled(context), error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown template error';
    return { result: `Template Error (${error})`, error };
  }
}

/**
 * Hook to handle label text formatting with support for templates,
 * boolean values, custom format functions, and empty state handling.
 */
export function useLabelFormat({
  formData,
  value,
  schema,
  props,
  reactory,
  options,
}: UseLabelFormatProps): UseLabelFormatResult {
  const {
    format,
    $format,
    emptyText = 'No data available',
    yesLabel = 'Yes',
    noLabel = 'No',
  } = options;

  const [labelText, setLabelText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Create template context
  const templateContext = useMemo(() => ({
    ...props,
    formData,
    value,
  }), [props, formData, value]);

  // Compute the formatted label
  const computeLabel = useCallback((): { text: string; error: string | null } => {
    // Skip if using lookup format (handled by useLabelLookup)
    if (format === '$LOOKUP$') {
      return { text: '...', error: null };
    }

    // Handle custom format function
    if ($format && typeof (reactory as any)?.$func?.[$format] === 'function') {
      try {
        const customResult = (reactory as any).$func[$format](props);
        return { text: String(customResult ?? emptyText), error: null };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Format function error';
        return { text: `Format Error (${errorMsg})`, error: errorMsg };
      }
    }

    // Handle format template string
    if (format && typeof format === 'string') {
      const { result, error: templateError } = processTemplate(format, templateContext);
      return { text: result, error: templateError };
    }

    // Handle boolean values
    if (isBooleanField(formData, schema)) {
      return {
        text: formatBooleanValue(Boolean(formData), yesLabel, noLabel),
        error: null,
      };
    }

    // Handle null/undefined values
    if (isNil(formData)) {
      const fallback = value ?? emptyText;
      return { text: String(fallback), error: null };
    }

    // Default: convert formData to string
    if (typeof formData === 'object') {
      try {
        return { text: JSON.stringify(formData), error: null };
      } catch {
        return { text: '[Object]', error: null };
      }
    }

    return { text: String(formData), error: null };
  }, [format, $format, formData, value, schema, props, reactory, templateContext, emptyText, yesLabel, noLabel]);

  // Format the label text
  const reformat = useCallback(() => {
    const { text, error: formatError } = computeLabel();
    setLabelText(text);
    setError(formatError);
  }, [computeLabel]);

  // Update label when dependencies change
  useEffect(() => {
    reformat();
  }, [reformat]);

  // Determine if value is empty
  const isEmpty = useMemo(() => {
    if (isNil(formData)) return true;
    if (formData === '') return true;
    if (Array.isArray(formData) && formData.length === 0) return true;
    return false;
  }, [formData]);

  return {
    labelText,
    hasError: error !== null,
    errorMessage: error,
    isEmpty,
    reformat,
  };
}

export default useLabelFormat;
