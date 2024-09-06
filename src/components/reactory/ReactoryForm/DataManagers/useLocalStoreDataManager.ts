import { useState } from 'react';
import { 
  IReactoryFormDataManagerHookResult,
  ReactoryFormDataManagerHook,
} from './types';
import { useReactory } from '@reactory/client-core/api';

export const useLocalStoreDataManager: ReactoryFormDataManagerHook  = (props) => { 

  const reactory = useReactory();
  const { 
    form,
    formData,
    formContext,
  } = props;
  const [localData, setLocalData] = useState<unknown>()
  const [isBusy, setIsBusy] = useState<boolean>(false);

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
    type: 'local',
    onSubmit,
    onChange,
    getData,
    refresh,
    isBusy
  } as IReactoryFormDataManagerHookResult;
};