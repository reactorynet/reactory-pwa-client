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
  } = props;

  const transformData = (data: any): any => { 
    return data;
  };

  const transformAsync = (data: any): Promise<any> => { 
    return Promise.resolve(data);
  }

  const [localData, setLocalData] = useState<unknown>(transformData(formData));

  const onSubmit = async <TData>(data: TData): Promise<TData> => {
    setLocalData(data);
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
    refresh
  } as IReactoryFormDataManagerHookResult;
};