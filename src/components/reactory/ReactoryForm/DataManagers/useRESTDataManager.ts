import { useState } from 'react';
import { 
  IReactoryFormDataManagerHookResult,
  ReactoryFormDataManagerHook,
} from './types';

export const useRESTDataManager: ReactoryFormDataManagerHook  = (props) => { 
  
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const onSubmit = async <TData>(data: TData): Promise<TData> => {
    return data;
  }

  const onChange = async <TData>(data: TData): Promise<TData> => {
    return data;
  }

  const getData = async <TData>(props: any): Promise<TData> => {
    return props;
  }

  const refresh = () => {
    return;
  }

  return {
    type: 'rest',
    onSubmit,
    onChange,
    getData,
    refresh,
    isBusy,
    available: false, // REST data manager is not implemented yet
  } as IReactoryFormDataManagerHookResult;
};