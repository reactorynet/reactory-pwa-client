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
    restDefinition: (formDefinition as any)?.rest,
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

  const getData = async (bypassCache = false) => { 
    reactory.debug(`${SIGN} getData`, { formData, formContext, props, bypassCache });
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
        // An explicit "run" (submit / refresh) must reach the server rather
        // than replay a cached response — otherwise re-running a query after
        // changing a value can return the previous result. `bypassCache` also
        // lets a form's own `options.fetchPolicy` apply on ordinary loads.
        fetchPolicy: bypassCache ? 'network-only' : undefined,
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

  /**
   * Query-only forms (e.g. core.SQLQueryForm, core.GraphQLQueryForm) declare
   * `graphql.query` but no `graphql.mutation`. For those, "submit" means "run
   * the query" — which is what the toolbar button promises. Without this the
   * GraphQL data manager's `onSubmit` early-returns on the missing mutation and
   * the button silently does nothing.
   *
   * A form with a mutation keeps its existing behaviour; a form with neither
   * is unaffected.
   */
  const activeGraphDefinition: any = graphDefinition || formDefinition.graphql;

  const formHasMutation = Boolean(
    activeGraphDefinition?.mutation &&
      Object.keys(activeGraphDefinition.mutation || {}).length > 0
  );

  const formHasQuery = Boolean(
    activeGraphDefinition?.query ||
      (activeGraphDefinition?.queries &&
        Object.keys(activeGraphDefinition.queries || {}).length > 0)
  );

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

    // Query-only form: re-execute the query so the toolbar button does what it
    // says. Two things must happen:
    //
    //   1. Emit the form's refresh event. A results grid wired for server-side
    //      paging (MaterialTableWidget with `remoteData: true`) owns its own
    //      fetching and re-runs the query with its current page — it does not
    //      read this form's data. Without this, Execute Query would not refresh
    //      the grid.
    //   2. Re-run `getData`, for forms whose results ARE bound into formData
    //      (e.g. core.GraphQLQueryForm). `getData` reads the current `formData`,
    //      which `onChange` has already kept in step with what the user sees.
    //
    // Where both apply the query runs twice — once for each consumer. That is a
    // deliberate correctness-over-efficiency trade; the grid-owned fetch is the
    // one that can page.
    if (!formHasMutation && formHasQuery) {
      setIsQueryComplete(false);
      reactory.emit(`${FQN}::refresh`, { source: SIGN });
      void getData(true);
    }
    setVersion(version + 1);
  };

  const onChange = (changeProps: SchemaFormOnChangeEventProps<unknown>) => {
    const {
      formData: nextFormData,
      errorSchema: nextErrorSchema,
      errors: nextErrors,
    } = changeProps;
    const hasDelta = deepEquals(formData, nextFormData) === false;
    if (hasDelta) {
      setIsDirty(true);
      setFormData(nextFormData);
      reactory.debug(`useDataManager: ${SIGN} onChange`, { nextFormData });
      // Forward the change to the consumer supplied onChange handler (if any).
      // The engine previously swallowed this event, so consumers relying on
      // live change notifications (e.g. the Form Editor) never received them.
      const consumerOnChange = (props as any)?.props?.onChange;
      if (typeof consumerOnChange === 'function') {
        try {
          consumerOnChange(nextFormData, nextErrorSchema, nextErrors);
        } catch (consumerErr) {
          reactory.log(`useDataManager: ${SIGN} consumer onChange threw`, { consumerErr }, 'error');
        }
      }
    }
  };

  const reset = () => {
    setFormData(initialData);
    setIsDirty(false);
  };

  // Refreshes the form data
  const refresh = () => { 
    getData(true);
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

    // Resolve submitProps from uiSchema or uiOptions with defaults
    const submitProps = (uiSchema["ui:form"] as any)?.submitProps || uiOptions?.submitProps || {};
    const variant: "contained" | "text" | "outlined"  = submitProps.variant || "contained";
    const color: "primary" | "secondary" | "inherit" | "success" | "error" | "info" | "warning" = submitProps.color || "primary";
    const iconAlign: string = submitProps.iconAlign || "left";
    const sx = submitProps.sx;
    const style = submitProps.style;

    // Action-style forms (seeded, never edited — e.g. approve / disable
    // panels) opt out of the dirty gate with submitProps.requireDirty: false.
    const requireDirty = submitProps.requireDirty !== false;

    // Resolve title text with i18n support (`text` accepted as an alias).
    // `ui:options.submitText` is the older Reactory convention (used by forms
    // such as core.SQLQueryForm) and was previously ignored here, so those
    // forms rendered a generic "Submit" despite declaring their own label.
    let titleText = submitProps.titleText || submitProps.text || "Submit";
    if (reactory.i18n && reactory.i18n.t && typeof titleText === 'string' && titleText.includes(':')) {
       try {
         titleText = reactory.i18n.t(titleText, titleText);
        } catch (e) {
          // Fall back to raw string if translation fails
         }
       }

    // Resolve icon from submitIconProps (ui:form or ui:options), falling back
    // to the legacy `ui:options.submitIcon` name, then to a save icon.
    let icon = uiOptions?.submitIcon || 'save';
    let iconProps: any = uiSchema["ui:form"]?.submitIconProps || uiOptions?.submitIconProps || {};
    if (iconProps.icon) {
      icon = iconProps.icon;
      // delete iconProps.icon;
     }

    const iconWidget = (icon === '$none' ? null : <Icon {...iconProps}>{icon}</Icon>);

    // Build children based on icon alignment
    let buttonChildren: React.ReactNode;
    if (iconAlign === 'right') {
       buttonChildren = <>
           <span>{titleText}</span>
          {iconWidget}
         </>;
      } else {
       buttonChildren = <>
          {iconWidget}
           <span>{titleText}</span>
         </>;
       }

    return (
        <Button
         variant={variant}
         color={color}
         onClick={onClick}
         disabled={isDataLoading || (requireDirty && isDirty === false)}
         sx={sx}
         style={style}>
          {buttonChildren}
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
