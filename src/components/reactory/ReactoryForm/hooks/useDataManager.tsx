import { useState } from "react";
import { v4 } from "uuid";
import { ApolloQueryResult } from '@apollo/client'
import {
  ReactoryFormDataManagerHook,
  ReactoryFormDataManagerHookResult,
  ReactoryFormDataManagerProps,
} from "../types";
import objectMapper from 'object-mapper';
import { diff } from 'deep-object-diff';

import { useReactory } from "@reactory/client-core/api";
import { deepEquals } from "@reactory/client-core/components/util";
import { useDataManagerProvider } from "../DataManagers";

// const formValidation = ($formData: any, $errors: any, via = 'onChange') => {

//   let formfqn = `${formDefinition.nameSpace}.${formDefinition.name}@${formDefinition.version}`;
//   reactory.log(`Executing custom validations for ${formfqn}`, { $formData, $errors });
//   let validationFunctionKey = `${formfqn}_validate`;
//   let validationResult = [];
//   let validationFunction = null;
//   let selectedKey = validationFunctionKey;

//   if (reactory.formValidationMaps && reactory.formValidationMaps[formfqn]) {
//     validationFunction = reactory.formValidationMaps[formfqn];
//   }

//   if (typeof props.validate === 'function') {
//     validationFunction = props.validate;
//   }

//   if (typeof validationFunction === 'function') {
//     try {
//       validationResult = validationFunction($formData, $errors, getFormReference(), via);
//     } catch (ex) {
//       reactory.log(`Error While Executing Custom Validation`, { ex });
//     }
//   }

//   return $errors;
// };

export const useDataManager: ReactoryFormDataManagerHook<any> = (
  props
): ReactoryFormDataManagerHookResult<any> => {
  const reactory = useReactory();
  const { utils } = reactory;
  const { isNil, isString, isArray } = utils.lodash;
  const { 
    FQN,
    SIGN,
    initialData, 
    formDefinition,
    graphDefinition,
    onBeforeSubmit,
    onBeforeMutation,
    onBeforeQuery,
    onError,
    formId,
    route,
    context,
    mode,
  } = props;
  const { dataManagers } = useDataManagerProvider(formDefinition);
  const [ defaultDataManager ] = dataManagers;
  const [loading, setIsLoading] = useState<boolean>(false);
  const [dirty, setIsDirty] = useState(false);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [queryComplete, setQueryComplete] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [allowRefresh, setAllowRefresh] = useState<boolean>(false);
  const [formData, setFormData] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [errorSchema, setErrorSchema] = useState<any>({});
  const [last_query_exec, setLastQueryExecution] = useState(null);
  const [version, setVersion] = useState(0);

  
  const getData = async (data?: any) => { 
    if (defaultDataManager) {
      const result = await defaultDataManager.getData(data);
    }    
  };

  const onSubmit = (form: any) => {
    reactory.log(`${SIGN} ↩ onSubmit`, { form });

    if (props.onSubmit) {
      props.onSubmit(
        form,
        errors,
        errorSchema,
        context);

      return;
    }

    getData(form.formData);
    setQueryComplete(false);
    setVersion(version + 1);
  };

  const onChange = (form: any, errorSchema: any) => {
    const hasDelta = deepEquals(formData, form.formData) === false;    
  };

  const reset = () => {
    setFormData(initialData);
  };

  // Refreshes the form data
  const refresh = () => { };

  const validate = () => { };

  const SubmitButton = () => {
    return (
      <button
        onClick={() => onSubmit(formData)}
        disabled={loading}
      >
        Submit
      </button>
    );
  }

  return {
    canRefresh: allowRefresh,
    errors: [],
    errorSchema: {},
    isDataLoading: loading,
    isValidating: false,
    onSubmit,
    paging: {
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    },
    PagingWidget: () => null,
    RefreshButton: () => null,    
    formData,
    onChange,
    reset,
    // @ts-ignore
    validate,
    refresh,
    SubmitButton
  };
};
