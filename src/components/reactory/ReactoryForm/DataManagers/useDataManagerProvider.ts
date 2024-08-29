import { ReactoryFormDataManagerProviderHookResult } from "./types";
import { useLocalStoreDataManager } from "./useLocalStoreDataManager";
import { useGraphQLDataManager } from "./useGraphQLDataManager";


export const useDataManagerProvider = (form: any): ReactoryFormDataManagerProviderHookResult => {
  const dataManagers = [];
  dataManagers.push(useLocalStoreDataManager(form));
  dataManagers.push(useGraphQLDataManager(form));
  return {
    dataManagers,
  };
};
