import { 
  ReactoryFormDataManagerProviderHook,
  ReactoryFormDataManagerProviderHookResult 
} from "./types";
import { useLocalStoreDataManager } from "./useLocalStoreDataManager";
import { useGraphQLDataManager } from "./useGraphQLDataManager";
import { useRESTDataManager } from "./useRESTDataManager";
import { useGRPCDataManager } from "./useGRPCDataManager";
import { useSocketDataManager } from "./useSocketDataManager";

export const useDataManagerProvider: ReactoryFormDataManagerProviderHook = (props): ReactoryFormDataManagerProviderHookResult => {
  const {
    form,
    formData,
    formContext,
  } = props;
  
  return {
    localDataManager: useLocalStoreDataManager(props),
    graphqlDataManager: useGraphQLDataManager(props),
    restDataManager: useRESTDataManager(props),
    grpcDataManager: useGRPCDataManager(props),
    socketDataManager: useSocketDataManager(props),
  };
};
