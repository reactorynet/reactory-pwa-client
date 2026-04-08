import { useState } from 'react';
import { useReactory } from '@reactory/client-core/api';
import { template } from 'lodash';
import {
  IReactoryFormDataManagerHookResult,
  ReactoryFormDataManagerHook,
} from './types';

/**
 * REST Data Manager Hook for Reactory Forms.
 * Handles data management for REST API requests using fetch (or axios).
 * Follows the same pattern as useGraphQLDataManager.
 */
export const useRESTDataManager: ReactoryFormDataManagerHook = (props) => {
  const reactory = useReactory();
  const { debug, warning, error: logError } = reactory;
  const {
    form,
    formData: initialFormData,
    formContext,
    restDefinition,
    mode = 'view',
    props: formProps,
  } = props;

  const [isBusy, setIsBusy] = useState<boolean>(false);

  // REST definition comes from form.rest or the provider props
  const restDef: Reactory.Forms.IFormRESTDefinition | undefined =
    restDefinition || (form as any)?.rest;

  const hasQueries = restDef?.queries && Object.keys(restDef.queries).length > 0;
  const hasMutations = restDef?.mutations && Object.keys(restDef.mutations).length > 0;
  const isAvailable = !!(hasQueries || hasMutations);

  /**
   * Resolve a URL template string using lodash template.
   * Supports ${formData.x}, ${formContext.y}, ${props.z} patterns.
   */
  const resolveUrl = (
    urlTemplate: string,
    context: { formData: any; formContext: any; props: any }
  ): string => {
    try {
      return template(urlTemplate)(context);
    } catch (err) {
      warning(`REST DataManager: Failed to resolve URL template: ${urlTemplate}`, err);
      return urlTemplate;
    }
  };

  /**
   * Execute a single REST call.
   */
  const executeCall = async (
    call: Reactory.Forms.IReactoryFormRESTCall,
    body?: any
  ): Promise<any> => {
    // Only support client-side calls for now
    if (call.runat === 'server') {
      warning('REST DataManager: Server-side REST calls are not yet supported. Skipping.');
      return null;
    }

    const templateContext = {
      formData: initialFormData,
      formContext,
      props: formProps,
    };

    const url = resolveUrl(call.url, templateContext);
    const method = call.method || 'GET';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...call.options?.headers,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    // Attach body for non-GET methods
    if (method !== 'GET' && method !== 'DELETE') {
      fetchOptions.body = JSON.stringify(body ?? call.options?.body ?? initialFormData);
    }

    debug(`REST DataManager: ${method} ${url}`, { call, fetchOptions });

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`REST ${method} ${url} failed (${response.status}): ${errorText}`);
    }

    // Parse response — handle empty responses (204 No Content)
    const contentType = response.headers.get('content-type') || '';
    if (response.status === 204 || !contentType.includes('application/json')) {
      return null;
    }

    return response.json();
  };

  /**
   * getData: Execute all REST queries and merge results.
   */
  const getData = async <TData>(getDataProps: any): Promise<TData> => {
    if (!isAvailable || !restDef?.queries) {
      return getDataProps?.formData ?? null;
    }

    setIsBusy(true);
    try {
      const queryKeys = Object.keys(restDef.queries);
      const defaultKey = restDef.default || queryKeys[0];

      // If a default query is specified, execute just that one
      if (defaultKey && restDef.queries[defaultKey]) {
        const result = await executeCall(restDef.queries[defaultKey]);
        return result as TData;
      }

      // Otherwise execute all queries and merge
      const results: Record<string, any> = {};
      for (const key of queryKeys) {
        results[key] = await executeCall(restDef.queries[key]);
      }

      // If single query, return its result directly
      if (queryKeys.length === 1) {
        return results[queryKeys[0]] as TData;
      }

      return results as TData;
    } catch (err) {
      logError('REST DataManager: getData failed', err);
      throw err;
    } finally {
      setIsBusy(false);
    }
  };

  /**
   * onSubmit: Execute the appropriate REST mutation based on current mode.
   */
  const onSubmit = async <TData>(data: TData): Promise<TData> => {
    if (!isAvailable || !restDef?.mutations) {
      return data;
    }

    setIsBusy(true);
    try {
      // Look for a mutation matching the current mode, or fall back to 'default'
      const mutationKey = restDef.mutations[mode]
        ? mode
        : restDef.mutations['default']
          ? 'default'
          : Object.keys(restDef.mutations)[0];

      if (!mutationKey || !restDef.mutations[mutationKey]) {
        warning(`REST DataManager: No mutation found for mode "${mode}"`);
        return data;
      }

      const call = restDef.mutations[mutationKey];

      // Set sensible default methods based on mode if not explicitly specified
      if (!call.method) {
        switch (mode) {
          case 'create':
          case 'new':
            call.method = 'POST';
            break;
          case 'edit':
            call.method = 'PUT';
            break;
          case 'delete':
            call.method = 'DELETE';
            break;
          default:
            call.method = 'POST';
        }
      }

      const result = await executeCall(call, data);
      return (result ?? data) as TData;
    } catch (err) {
      logError('REST DataManager: onSubmit failed', err);
      throw err;
    } finally {
      setIsBusy(false);
    }
  };

  /**
   * onChange: No-op for REST — data changes are local until submit.
   */
  const onChange = async <TData>(data: TData): Promise<TData> => {
    return data;
  };

  /**
   * refresh: Re-execute getData.
   */
  const refresh = () => {
    if (isAvailable) {
      getData({ formData: initialFormData, formContext, props: formProps }).catch((err) => {
        logError('REST DataManager: refresh failed', err);
      });
    }
  };

  return {
    type: 'rest',
    onSubmit,
    onChange,
    getData,
    refresh,
    isBusy,
    available: isAvailable,
  } as IReactoryFormDataManagerHookResult;
};
