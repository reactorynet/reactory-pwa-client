import { useState  } from 'react';
import { useReactory } from '@reactory/client-core/api';
import { 
  IReactoryFormDataManagerHookResult,
  ReactoryFormDataManagerHook,
} from './types';

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

  const transformData = (data: any, fieldName?: string, objectMap?: Reactory.ObjectMap): any => { 
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

  const transformAsync = (data: any): Promise<any> => { 
    return Promise.resolve(data);
  }

  const [localData, setLocalData] = useState<unknown>(transformData(formData));
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const onSubmit = async <TData>(data: TData): Promise<TData> => {
    setLocalData(data);

    if (graphql && (graphql?.mutation || Object.keys(graphql?.mutation).length > 0)) { 
      if (graphql.mutation[mode]) { 
        const mutation = graphql.mutation[mode];
        const {
          text: mutationText, 
          variables: variableMap,
          resultMap,
          name,
        } = mutation;
        let variables = {};
        if (variableMap) {
          const kwargs = {
            ...form,
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
          data, 
          errors, 
          extensions 
        } = await reactory.graphqlMutation(mutationText, variables);
        
        if (errors) {
          reactory.error(`Error in GraphQL Mutation: ${mutationText}`, errors);
        }

        if (data) {
          return transformData(data, name, resultMap) as TData;
        }

      }
    }

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