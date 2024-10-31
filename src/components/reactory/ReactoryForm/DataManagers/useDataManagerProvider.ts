import { 
  ReactoryFormDataManagerProviderHook,
  ReactoryFormDataManagerProviderHookResult 
} from "./types";
import { useLocalStoreDataManager } from "./useLocalStoreDataManager";
import { useGraphQLDataManager } from "./useGraphQLDataManager";
import { useRESTDataManager } from "./useRESTDataManager";
import { useGRPCDataManager } from "./useGRPCDataManager";
import { useSocketDataManager } from "./useSocketDataManager";

/**
 * DataManagerProvider hook instanciates all the data managers
 * and provides them to the form.
 * @param props 
 * @returns 
 */
export const useDataManagerProvider: ReactoryFormDataManagerProviderHook = (props): ReactoryFormDataManagerProviderHookResult => {
  return {
    localDataManager: useLocalStoreDataManager(props),
    graphqlDataManager: useGraphQLDataManager(props),
    restDataManager: useRESTDataManager(props),
    grpcDataManager: useGRPCDataManager(props),
    socketDataManager: useSocketDataManager(props),
  };
};
