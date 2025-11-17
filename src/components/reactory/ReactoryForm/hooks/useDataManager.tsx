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
import { get } from "lodash";
import { getDefaultFormState } from "@reactory/client-core/components/reactory/form/utils";

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
    mode,
    props: props?.props,
  });

  const {
    uiOptions,
    uiSchema,
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
    reactory.debug(`${SIGN} getData`, { formData, formContext, props });
    setIsDataLoading(true);

    //for each of the data managers, call the getData method
    let localResult = null;
    let graphqlResult = null;
    let restResult = null;
    let grpcResult = null;
    let socketResult = null;

    if (localDataManager?.available) {
      // this should always return the default form state
      localResult = await localDataManager.getData({
        formData,
        formContext,
        props,
      });
    }

    if (graphqlDataManager?.available) {
      graphqlResult = await graphqlDataManager.getData({
        formData,
        formContext,
        props,
      });
    }

    if (restDataManager?.available) {
      restResult = await restDataManager.getData({
        formData,
        formContext,
        props,
      });
    }

    if (grpcDataManager?.available) {
      grpcResult = await grpcDataManager.getData({
        formData,
        formContext,
        props,
      });
    }

    if (socketDataManager?.available) {
      socketResult = await socketDataManager.getData({
        formData,
        formContext,
        props,
      });
    }

    let nextData = null;
    if (localResult) {
      nextData = localResult;
    } 

    // Start with localResult as the base data
    let mergedData = localResult;

    // Helper to merge based on schema type
    const mergeData = (current: any, next: any) => {
      if (!next) return current;
      if ((schema as Reactory.Schema.AnySchema).type === 'object') {
      return { ...(current || {}), ...(next || {}) };
      }
      if ((schema as Reactory.Schema.AnySchema).type === 'array') {
      return [ ...(current || []), ...(next || []) ];
      }
      // fallback: just return next if type is unknown
      return next;
    };

    // Merge in order: graphql, rest, grpc, socket
    mergedData = mergeData(mergedData, graphqlResult);
    mergedData = mergeData(mergedData, restResult);
    mergedData = mergeData(mergedData, grpcResult);
    mergedData = mergeData(mergedData, socketResult);

    if (mergedData !== undefined && mergedData !== null) {
      setFormData(mergedData);
    }

    setIsDataLoading(false);
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
  const refresh = () => { 
    getData();
  };

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
    let iconProps: any = uiSchema["ui:form"]?.submitIconProps || uiOptions?.submitIconProps || {};
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

  useEffect(() => {
    reactory.debug(`useDataManager: ${SIGN} formData change`, { formData });
    if (isDirty) {
      setIsDirty(true);
    }
  }, [formData]);

  useEffect(() => {
    reactory.debug(`useDataManager: ${SIGN} isDirty change`, { isDirty });
    if (isDirty) {
      setIsRefreshAllowed(true);
    } else {
      setIsRefreshAllowed(false);
    }
  }, [isDirty]);

  useEffect(() => {
    if (formDefinition.__complete__ === true) {
      //debugger;
      //if (!isDataLoading) { 
      getData();
      //} 
    }
  }, [formDefinition, props.props, props.formId]);


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
