import React, { useEffect, useState } from "react";
import { v4 } from "uuid";
import { ApolloQueryResult } from '@apollo/client'
import {
  ReactoryFormDataManagerHook,
  ReactoryFormDataManagerHookResult,
  ReactoryFormDataManagerProps,
  SchemaFormOnChangeEventProps,
  SchemaFormOnSubmitEventProps,
} from "../types";
import objectMapper from 'object-mapper';
import { diff } from 'deep-object-diff';

import { useReactory } from "@reactory/client-core/api";
import { deepEquals } from "@reactory/client-core/components/util";
import { useDataManagerProvider } from "../DataManagers";
import { useUISchema } from "./useUISchema";
import { Button, Icon } from "@mui/material";
import { Schema } from "ajv";

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
    localDataManager,
    grpcDataManager,
    restDataManager,
    socketDataManager,
  } = useDataManagerProvider({
    form: formDefinition,
    formData: initialData,
    formContext,
    graphDefinition: graphDefinition || formDefinition.graphql,
    mode
  });

  const {
    uiOptions,
  } = useUISchema({
    formDefinition,
    FQN,
    SIGN,
    mode,    
  });

  const defaultDataManager = graphqlDataManager
  const [ isDataLoading, setIsDataLoading ] = useState<boolean>(false);
  const [ isValidating, setIsValidating ] = useState<boolean>(false);
  const [ isDirty, setIsDirty] = useState(false);
  const [ isBusy, setIsBusy ] = useState<boolean>(false);
  const [ isQueryComplete, setIsQueryComplete] = useState<boolean>(false);
  const [ refreshInterval, setRefreshInterval] = useState(null);
  const [ isRefeshAllowed, setIsRefreshAllowed ] = useState<boolean>(false);
  const [ formData, setFormData ] = useState<any>(initialData);
  const [ errors, setErrors] = useState<any[]>([]);
  const [ errorSchema, setErrorSchema] = useState<any>({});
  const [ lastDataFetch, setLastQueryExecution] = useState(null);
  const [ version, setVersion ] = useState(0);

  const { schema } = formDefinition;

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

  const onSubmit = (submitEvent: SchemaFormOnSubmitEventProps<unknown>) => {
    reactory.log(`${SIGN} ↩ onSubmit`, submitEvent);

    if (onBeforeSubmit) {
      const shouldSubmit = onBeforeSubmit(submitEvent.formData, formContext);
      if (shouldSubmit === false) {
        return;
      }
    }

    if (props.onSubmit) {
      props.onSubmit(
        submitEvent.formData,
        errors,
        errorSchema,
        formContext);
      return;
    }

    if (localDataManager) {
      void localDataManager.onSubmit(submitEvent.formData);
    }

    if (graphqlDataManager) {
      void graphqlDataManager.onSubmit(submitEvent.formData);
    }

    if (restDataManager) {
      void restDataManager.onSubmit(submitEvent.formData);
    }

    if (grpcDataManager) {
      void grpcDataManager.onSubmit(submitEvent.formData);
    }

    if (socketDataManager) {
      void socketDataManager.onSubmit(submitEvent.formData);
    }

    //@ts-ignore
    // getData();
    // setIsQueryComplete(false);
    setVersion(version + 1);
  };

  const onChange = (props: SchemaFormOnChangeEventProps<unknown>) => {
    const {
      formData: nextFormData,
    } = props;
    const hasDelta = deepEquals(formData, nextFormData) === false;  
    if (hasDelta) {
      setIsDirty(true);
      setFormData(nextFormData);
      reactory.debug(`useDataManager: ${SIGN} onChange`, { nextFormData });
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
    
    const onClick = () => { 
      const evt: SchemaFormOnSubmitEventProps<unknown> = { 
        edit: true,
        errors,
        errorSchema,
        schema: schema as Reactory.Schema.AnySchema,
        idSchema: formDefinition?.idSchema as Reactory.Schema.IDSchema, 
        formData
      }      
      onSubmit(evt); 
    }

    let icon = 'save';
    let iconProps: any = uiOptions?.submitIconProps || {};
    if (iconProps.icon) {
      icon = iconProps.icon;
      delete iconProps.icon;
    } 
    let iconWidget = (icon === '$none' ? null : <Icon {...iconProps}>{icon}</Icon>);

    return (
      <Button
        onClick={onClick}
        disabled={isDataLoading || isDirty === false}
      >
        {iconWidget}
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
