import React, { useEffect, useState } from "react";
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
import { Button, Icon } from "@mui/material";

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
    formContext,
    mode,
  } = props;
  const { 
    graphqlDataManager,
    // localDataManager, 
  } = useDataManagerProvider({
    form: formDefinition,
    formData: initialData,
    formContext,
    graphDefinition: graphDefinition || formDefinition.graphql,
  });
  const defaultDataManager = graphqlDataManager
  const [ isDataLoading, setIsDataLoading ] = useState<boolean>(false);
  const [ isValidating, setIsValidating ] = useState<boolean>(false);
  const [ isDirty, setIsDirty] = useState(false);
  const [ isBusy, setIsBusy ] = useState<boolean>(false);
  const [ isQueryComplete, setIsQueryComplete] = useState<boolean>(false);
  const [ refreshInterval, setRefreshInterval] = useState(null);
  const [ isRefeshAllowed, setIsRefreshAllowed ] = useState<boolean>(false);
  const [ formData, setFormData ] = useState<any>(null);
  const [ errors, setErrors] = useState<any[]>([]);
  const [ errorSchema, setErrorSchema] = useState<any>({});
  const [ lastDataFetch, setLastQueryExecution] = useState(null);
  const [ version, setVersion ] = useState(0);

  const getData = async () => { 
    if (defaultDataManager) {
      const result = await graphqlDataManager.getData({
        formData,
        formContext,
      });

      if (result) {
        setFormData(result);
      }
    }
  };

  const onSubmit = (form: any) => {
    reactory.log(`${SIGN} ↩ onSubmit`, { form });

    if (props.onSubmit) {
      props.onSubmit(
        form,
        errors,
        errorSchema,
        formContext);

      return;
    }

    //@ts-ignore
    getData(form.formData);
    setIsQueryComplete(false);
    setVersion(version + 1);
  };

  const onChange = (form: any, errorSchema: any) => {
    const hasDelta = deepEquals(formData, form.formData) === false;  
    if (hasDelta) {
      setIsDirty(true);
    }  
  };

  const reset = () => {
    setFormData(initialData);
    setIsDirty(false);
  };

  // Refreshes the form data
  const refresh = () => { };

  const validate = () => { };

  const SubmitButton = () => {
    return (
      <Button
        onClick={() => onSubmit(formData)}
        disabled={isDataLoading}
      >
        <Icon>save</Icon>
      </Button>
    );
  }

  useEffect(() => { 
    reactory.debug(`useDataManager: ${SIGN} initialData change`, { initialData });
    setFormData(initialData);
  }, [initialData]);

  const getEffectiveData = () => {
    return formData;
  }

  return {
    canRefresh: isRefeshAllowed,
    errors: [],
    errorSchema: {},
    isDataLoading,
    isValidating,
    onSubmit,
    paging: {
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    },
    PagingWidget: () => null,
    RefreshButton: () => null,    
    formData: getEffectiveData(),
    onChange,
    reset,
    // @ts-ignore
    validate,
    refresh,
    SubmitButton
  };
};
