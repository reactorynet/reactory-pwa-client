import { useState  } from 'react';
import { useReactory } from '@reactory/client-core/api';
import { 
  IReactoryFormDataManagerHookResult,
  ReactoryErrorHandlerProps,
  ReactoryFormDataManagerHook,
} from './types';
import { cloneDeep } from 'lodash';

/**
 * GraphQL Data Manager Hook for Reactory Forms.
 * This hook will handle the data management for GraphQL requests and responses.
 * 
 * Using the Graph is the preferred method for data management in Reactory Forms
 * due to all the benefits of GraphQL.
 * @param props 
 * @returns 
 */
export const useGraphQLDataManager: ReactoryFormDataManagerHook  = (props) => { 
  const reactory = useReactory();
  const { 
    debug,
  } = reactory;
  const { 
    form,
    formData,
    formContext,
    graphDefinition: graphql,
    mode = 'new',
  } = props;

  const { 
    schema,
  } = form;

  /**
   * Transform the shape of the data based on the objectMap specified in the schema
   * @param data 
   * @param fieldName 
   * @param objectMap 
   * @returns any type
   */
  const transformData = (data: any, fieldName?: string, objectMap?: Reactory.ObjectMap): any | any[] => { 
    let nextData = null;
  
    if (fieldName && data[fieldName]) {
      
      switch ((schema as Reactory.Schema.AnySchema)?.type) {
        case 'object': 
          nextData = { ...data[fieldName] };
          break;
        case 'array': 
          nextData = [ ...data[fieldName] ];
          break;
        default:
          // these are for scalar types
          // number, string, boolean, etc. 
          nextData = data;
          break;
      }

      if (objectMap) { 
        
        const kwargs = {
          form,
          formData: nextData,
          formContext,          
          reactory,
        };

        reactory.utils.objectMapper(
          kwargs,
          nextData,
          objectMap
        );
      }
    } else if (data) {
      switch ((schema as Reactory.Schema.AnySchema)?.type) {
        case 'object': 
          nextData = { ...data };
          break;
        case 'array': 
          nextData = [ ...data ];
          break;
        default: 
          nextData = data;
          break;
      }
    }
    return nextData;
  };

  /**
   * Async data transformation. Useful for async data transformations
   * that requires a callable function to transform the data
   * @param data 
   * @returns 
   */
  const transformAsync = (data: any): Promise<any> => { 
    // TODO: Werner Weber - Implement async data transformation
    // Need to give some thought as to how this will work.
    // The implementation should be a reactory.utility function.
    // reactory.utils.templateObject()
    return Promise.resolve(data);
  }

  const [localData, setLocalData] = useState<unknown>(transformData(formData));
  const [isBusy, setIsBusy] = useState<boolean>(false);

  /**
   * @param options
   * @param options.method
   * @param options.result
   * @param options.onSuccessEvent
   * @param options.onSuccessRedirectTimeout
   * @param options.onSuccessUrl
   * @param options.onSuccessComponentRef
   * @returns
   * @description This function will handle the success of a GraphQL mutation or query 
   */
  const doHandleSuccess = (options: {
    method: Reactory.Forms.ReactoryFormActionHandlerType,
    result: any,
    onSuccessEvent: Reactory.Forms.IReactoryEvent,
    onSuccessRedirectTimeout: number,
    onSuccessUrl: string,
    onSuccessComponentRef?: string,
  }) => { 
    const { 
      method,
      result,
      onSuccessEvent,
      onSuccessRedirectTimeout,
      onSuccessUrl,
      onSuccessComponentRef,
    } = options
    switch (method) { 
      case "refresh": {
        getData({
        });
        break;
      }
      case "redirect": {
        if (onSuccessUrl) { 
          setTimeout(() => {}, onSuccessRedirectTimeout || 0);
        }
        break;
      }
      case "event": {
        if (onSuccessEvent) { 
          reactory.emit(onSuccessEvent.name, result);
        }
        break;
      }
      case "function": { 
        if (result && onSuccessComponentRef) { 
          const component: any = reactory.getComponent(onSuccessComponentRef);
          if (component && typeof component === 'function') { 
            component[method](result);
          } else {
            reactory.error(`Requested onSuccessComponentRef ${onSuccessComponentRef} does not exist in reactory registry: ${onSuccessComponentRef}`, { result });
          }
        }
        break;
      }
      case "component": { 
        if (result) { 
          const component: any = reactory.getComponent(onSuccessComponentRef);
          if (component && typeof component === 'function') { 
            return component(result);
          } else {
            reactory.error(`Requested onSuccessComponentRef ${onSuccessComponentRef} does not exist in reactory registry: ${onSuccessComponentRef}`, { result });
          }
        }
        break;
      }
      case "none": {
        break;
      }
    }
  }

  const doHandleErrors = (
    onErrorMethod: Reactory.Forms.ReactoryFormActionHandlerType,
    error: ReactoryErrorHandlerProps,
    componentRef?: string,
    method?: string
  ) => {
    switch(onErrorMethod) { 
      case 'function':
      case 'component': {
        if (!componentRef) {
          reactory.warning('No componentRef provided for onErrorMethod', { error });
          return;
        }
        const component: any = reactory.getComponent(componentRef);
        if (component.onError && typeof component.onError === 'function') {
          component.onError(error);
        } else {
          if (component[method] && typeof component[method] === 'function') { 
            component[method](error);
          } else {
            reactory.warning(`Error method ${method} does not exist on component: ${componentRef}`, { error });
          }
        }
        break;
      }
      case 'notification': {
        const errorTitle = `Error in GraphQL Mutation`;
        reactory.createNotification(errorTitle, { type: "warning", showInAppNotification: true });
        break;
      }
      case 'refresh': {
        getData({});
        break;
      }
      case 'redirect': {
        if (method && method === 'url') { 
          if (error.data && error.data.url) { 
            setTimeout(() => {}, error.data.redirectTimeout || 0);
          }
        }
        break;
      }
      case 'none':
      default: {
        reactory.warning('No onErrorMethod provided', { error });
      }
    }   
  }

  const onSubmit = async <TData>(data: TData): Promise<TData> => {
    debug('useGraphQLDataManager:onSubmit', { data });
    setLocalData(data);
    setIsBusy(true);
    if (graphql && (graphql?.mutation || Object.keys(graphql?.mutation).length > 0)) { 
      if (graphql.mutation[mode]) { 
        const mutation = graphql.mutation[mode];
        const {
          text: mutationText, 
          variables: variableMap,
          resultMap,
          name,
        onSuccessMethod,
          onSuccessEvent,
          onSuccessRedirectTimeout,
          onSuccessUrl,
          onError,
          componentRef,
        } = mutation;
        let variables = {};
        if (variableMap) {
          const kwargs = {
            form,
            formData: data,
            formContext,          
            reactory,
            api: reactory,
          };
    
          // TODO: Werner Weber - Add the ability here for variables to be mapped to an async function
          // that will allow the developer to create a custom client side mapping object and resolve async
          // data as part of the input params.
          reactory.utils.objectMapper(
            kwargs,
            variables,
            variableMap
          );

          variables = reactory.utils.omitDeep(variables);
        }

        const { 
          data: resultData, 
          errors, 
          extensions 
        } = await reactory.graphqlMutation(mutationText, variables);
        
        let hasErrors = false;

        if (errors) {
          reactory.error(`Error in GraphQL Mutation: ${mutationText}`, errors);
          hasErrors = true;
          if (onError) { 
            const error: any = {
              errors,
              extensions,
              data,
              form,
              formContext,
              reactory,
            };
            const {
              method,
              onErrorMethod,
              componentRef,
            } = onError;

            if (onErrorMethod && Array.isArray(onErrorMethod)) { 
              onErrorMethod.forEach((method) => { 
                doHandleErrors(method, error)
              });
            } else if (onErrorMethod && method === 'function') { 
              const component: any = reactory.getComponent(componentRef);
              if (component.onError && typeof component.onError === 'function') {
                component.onError(error);
              } else {
                if (component[method] && typeof component[method] === 'function') { 
                  component[method](error);
                }
              }
            } 
          }
        }

        let transformed = data ? cloneDeep(data) : null;
        if (resultData && transformed !== null) {
          transformed = transformData(transformed, name, resultMap) as TData;
        }

        if (onSuccessMethod && !hasErrors) {
          if (Array.isArray(onSuccessMethod)) {
            onSuccessMethod.forEach((method) => {
              doHandleSuccess({ 
                method, 
                result: transformed,
                onSuccessEvent,
                onSuccessRedirectTimeout,
                onSuccessUrl,
              });
            });
          } else {
            doHandleSuccess({
              method: onSuccessMethod,
              result: transformed,
              onSuccessEvent,
              onSuccessRedirectTimeout,
              onSuccessUrl,
              onSuccessComponentRef: componentRef,
            });
          }
        }
    
      }
    }

    setIsBusy(false);
    return data;
  }

  const onChange = async <TData>(data: TData): Promise<TData> => {
    setLocalData(data);
    return data;
  }

  const getData = async <TData>(props: any): Promise<TData> => {
    let nextData: TData = reactory.utils.lodash.cloneDeep(localData) as TData;
    const {
      queryKey = null,
    } = props;
    if (graphql && (graphql?.query || Object.keys(graphql?.queries).length > 0)) {
      let query: Reactory.Forms.IReactoryFormQuery = null;
      
      if (Object.keys(graphql.queries).length > 0 && queryKey) {
        const queries = graphql.queries;
        for (const key in queries) {
          query = queries[key];
          break;
        }
      }
      
      if (graphql.query && !query) {
        query = graphql.query;
      }
      
      if (!query) {
        return nextData;
      }
      
      const variables = {};
      const data = await reactory.graphqlQuery(query.text, variables);
      nextData = transformData(data) as TData;
    }

    return nextData;
  }

  const refresh = () => {
    return;
  }

  return {
    type: 'graphql',
    onSubmit,
    onChange,
    getData,
    refresh,
    isBusy,
  } as IReactoryFormDataManagerHookResult;
};