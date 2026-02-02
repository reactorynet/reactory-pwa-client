/**
 * useLabelLookup Hook
 * 
 * Handles GraphQL data lookups for LabelWidget, fetching data from the server
 * and mapping the result to display text.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type Reactory from '@reactory/reactory-core';

export interface UseLabelLookupOptions {
  /** GraphQL query configuration */
  graphql?: Reactory.Forms.IReactoryFormQuery;
  
  /** Whether lookup is enabled */
  enabled?: boolean;
}

export interface UseLabelLookupProps {
  /** Props to use for variable mapping */
  props: Record<string, any>;
  
  /** Reactory API instance */
  reactory: Reactory.Client.ReactorySDK;
  
  /** Lookup options */
  options: UseLabelLookupOptions;
  
  /** Form context for logging */
  formContext?: Reactory.Client.IReactoryFormContext<unknown>;
  
  /** ID schema for logging */
  idSchema?: Reactory.Schema.IDSchema;
}

export interface UseLabelLookupResult {
  /** The lookup result value */
  lookupValue: string | null;
  
  /** Whether lookup is currently loading */
  isLoading: boolean;
  
  /** Error if lookup failed */
  error: Error | null;
  
  /** Manually trigger the lookup */
  refetch: () => void;
  
  /** Whether lookup is configured and active */
  isLookupActive: boolean;
}

/**
 * Hook to handle GraphQL lookups for label values.
 * 
 * Executes a GraphQL query and maps the result to a display string using
 * the configured resultMap and resultKey.
 */
export function useLabelLookup({
  props,
  reactory,
  options,
  formContext,
  idSchema,
}: UseLabelLookupProps): UseLabelLookupResult {
  const { graphql, enabled = true } = options;
  
  const [lookupValue, setLookupValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const mountedRef = useRef(true);
  // Track if we've already fetched to prevent duplicate calls
  const fetchedRef = useRef(false);

  // Determine if lookup is active
  const isLookupActive = Boolean(graphql && enabled);

  const executeLookup = useCallback(async () => {
    if (!graphql || !reactory || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Map variables from props
      const variables = reactory.utils?.objectMapper?.(props, graphql.variables) || {};

      // Execute GraphQL query
      const result = await reactory.graphqlQuery(
        graphql.text,
        variables,
        graphql.options
      );

      // Only update state if still mounted
      if (!mountedRef.current) return;

      const signature = formContext?.signature || 'NO CONTEXT';
      const fieldId = idSchema?.$id || 'unknown';

      reactory.log?.(`Lookup result ${signature}[${fieldId}]`, { result });

      if (result.data?.[graphql.name]) {
        // Map the result using resultMap
        const mappedResult = graphql.resultMap
          ? reactory.utils?.objectMapper?.(result.data[graphql.name], graphql.resultMap)
          : result.data[graphql.name];

        // Extract the display value using resultKey
        const displayValue = mappedResult?.[graphql.resultKey || 'id'];
        
        setLookupValue(displayValue == null ? '' : String(displayValue));
        setError(null);
      } else {
        // No data returned
        setLookupValue('');
        setError(null);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      const lookupError = err instanceof Error ? err : new Error('Lookup failed');
      
      reactory.log?.('Lookup Query Error', { error: lookupError });
      
      setError(lookupError);
      setLookupValue(null);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [graphql, reactory, enabled, props, formContext, idSchema]);

  // Manual refetch function
  const refetch = useCallback(() => {
    fetchedRef.current = false;
    executeLookup();
  }, [executeLookup]);

  // Execute lookup on mount and when dependencies change
  useEffect(() => {
    mountedRef.current = true;
    
    if (isLookupActive && !fetchedRef.current) {
      fetchedRef.current = true;
      executeLookup();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [isLookupActive, executeLookup]);

  // Re-fetch when props change (for dependent lookups)
  useEffect(() => {
    if (isLookupActive && fetchedRef.current) {
      // Only refetch if formData actually changed
      executeLookup();
    }
  }, [props.formData, isLookupActive, executeLookup]);

  return {
    lookupValue,
    isLoading,
    error,
    refetch,
    isLookupActive,
  };
}

export default useLabelLookup;
