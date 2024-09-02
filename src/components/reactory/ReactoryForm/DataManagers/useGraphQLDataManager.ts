import { useState  } from 'react';
import { 
  IReactoryFormDataManagerHookResult,
  ReactoryFormDataManagerHook,
} from './types';

export const useGraphQLDataManager: ReactoryFormDataManagerHook  = (form: Reactory.Forms.IReactoryForm) => { 
  
  const [localData, setLocalData] = useState<unknown>()

  const onSubmit = async <TData>(data: TData): Promise<TData> => {
    setLocalData(data);
    return data;
  }

  const onChange = async <TData>(data: TData): Promise<TData> => {
    setLocalData(data);
    return data;
  }

  const getData = async <TData>(props: any): Promise<TData> => {
    return localData as TData;
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