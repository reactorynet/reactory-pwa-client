import { 
  ReactoryFormDataManagerProviderHook,
  ReactoryFormDataManagerProviderHookResult 
} from "./types";
import { useLocalStoreDataManager } from "./useLocalStoreDataManager";
import { useGraphQLDataManager } from "./useGraphQLDataManager";


export const useDataManagerProvider: ReactoryFormDataManagerProviderHook = (props): ReactoryFormDataManagerProviderHookResult => {
  const {
    form,
    formData,
    formContext,
  } = props;
  
  return {
    localDataManager: useLocalStoreDataManager(props),
    graphqlDataManager: useGraphQLDataManager(props),
    restDataManager: useGraphQLDataManager(props),
    grpcDataManager: useGraphQLDataManager(props),
    socketDataManager: useGraphQLDataManager(props),

  };
};
