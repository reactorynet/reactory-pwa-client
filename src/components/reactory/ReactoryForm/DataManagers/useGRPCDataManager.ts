import { useState } from 'react';
import { 
  IReactoryFormDataManagerHookResult,
  ReactoryFormDataManagerHook,
} from './types';

export const useGRPCDataManager: ReactoryFormDataManagerHook  = (props) => { 
  
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
    type: 'grpc',
    onSubmit,
    onChange,
    getData,
    refresh,
    isBusy,
    available: false,
  } as IReactoryFormDataManagerHookResult;
};