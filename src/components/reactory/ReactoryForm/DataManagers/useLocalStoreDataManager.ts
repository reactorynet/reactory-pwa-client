import { useState } from 'react';
import { 
  IReactoryFormDataManagerHookResult,
  ReactoryFormDataManagerHook,
} from './types';
import { useReactory } from '@reactory/client-core/api';
import { getDefaultFormState } from "@reactory/client-core/components/reactory/form/utils";

export const useLocalStoreDataManager: ReactoryFormDataManagerHook  = (props) => { 

  const { 
    form,
    formData,
  } = props;

  const EmptySchema = {
    type: 'object',
    properties: {}
  }

  const [localData, setLocalData] = useState<unknown>(getDefaultFormState(form?.schema || EmptySchema, formData));
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const onSubmit = async <TData>(data: TData): Promise<TData> => {
    setLocalData(data);
    return data;
  }

  const onChange = async <TData>(data: TData): Promise<TData> => {
    setLocalData(data);
    // use a local store to store the data.    
    // consider what the correct key should be.
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
    isBusy,
    available: true
  } as IReactoryFormDataManagerHookResult;
};