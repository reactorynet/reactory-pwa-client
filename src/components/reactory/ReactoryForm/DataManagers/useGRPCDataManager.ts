import { 
  IReactoryFormDataManagerHookResult,
  ReactoryFormDataManagerHook,
} from './types';

export const useGRPCDataManager: ReactoryFormDataManagerHook  = (form: Reactory.Forms.IReactoryForm) => { 
  
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
    refresh
  } as IReactoryFormDataManagerHookResult;
};