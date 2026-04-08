import { useReactory } from "@reactory/client-core/api";
import { toIdSchema } from "@reactory/client-core/components/reactory/form/utils";
import MuiReactoryPackage from "@reactory/client-core/components/reactory/ux/mui";
import React, { useEffect, useState } from "react";
import { Params, useParams } from "react-router";
import * as uuid from "uuid";
import ReactoryUxPackages from "../../ux";
import { ReactoryDefaultForm } from "../constants";
import { DefaultComponentMap, ReactoryFormDefinitionHook } from "../types";
import { useDataManager } from "./useDataManager";
import { useSchema } from "./useSchema";
import { useUISchema } from "./useUISchema";
import { useFormLoadingState } from "./useFormLoadingState";
import { useFormContext } from "./useContext";
import { useStateStore } from "../stateManagement/useStateStore";
import { usePerformanceMonitor } from "../performanceOptimization/usePerformanceMonitor";
import { ReactoryFormState } from "../types-v2";

// Feature flags for upgrade phases — stable booleans, no hooks.
// useSimpleFeatureFlag causes infinite re-renders due to unstable
// context reference in its useEffect dependency array.
// Enable via environment variables when ready to test.
const ENABLE_STATE_V2 = process.env.REACT_APP_REACTORY_FORM_STATE_V2 === 'true';
const ENABLE_PERF_V2 = process.env.REACT_APP_REACTORY_FORM_PERFORMANCE_V2 === 'true';

const DEFAULT_DEPENDENCIES = [
  "core.Loading",
  "core.Logo",
  "core.FullScreenModal",
  "core.DropDownMenu",
  "core.HelpMe",
  "core.ReportViewer",
  "core.ReactoryFormEditor",
];

/**
 * Build the form definition from current props and state.
 * Returns active form definition
 */
// @ts-ignore
export const useFormDefinition: ReactoryFormDefinitionHook = (props) => {
  const {
    formId,
    uiSchemaId,
    uiSchemaKey,
    formDef,
    mode = "view",
    extendSchema,
    route,
    onBeforeMutation,
    onBeforeQuery,
    onBeforeSubmit,
    onError,
  } = props;
  const reactory = useReactory();
  const { utils, debug, warning, error } = reactory;
  const { nil, lodash } = utils;
  const [instanceId] = useState(uuid.v4());
  const params: Readonly<Params<string>> = useParams();

  const [formContext, setFormContext] = useState<any>({});
  const [form, setForm] = useState<Reactory.Forms.IReactoryForm | undefined>(
    formDef || ReactoryDefaultForm
  );
  const [v, setVersion] = useState(0);

  // Feature-flagged centralized state management (Phase 1.3)
  const enableStateV2 = ENABLE_STATE_V2;
  const stateStore = useStateStore(
    {
      loading: true,
      forms_loaded: false,
      forms: [],
      uiFramework: 'material',
      uiSchemaKey: uiSchemaKey || '',
      formDef: formDef || ReactoryDefaultForm,
      dirty: false,
      queryComplete: false,
      showHelp: false,
      showReportModal: false,
      showExportWindow: false,
      busy: false,
      liveUpdate: false,
      pendingResources: null,
      _instance_id: instanceId,
      notificationComplete: false,
      mutate_complete_handler_called: false,
      form_created: Date.now(),
      isValid: true,
    } as ReactoryFormState,
    {
      enablePersistence: false,
      enableDebugging: enableStateV2,
      enableImmutabilityChecks: false,
      enablePerformanceMonitoring: enableStateV2,
      storageKey: `reactory-form-state-${instanceId}`,
    }
  );

  // When state V2 is enabled, sync form changes to the state store
  const setFormWithTracking = (nextForm: Reactory.Forms.IReactoryForm) => {
    setForm(nextForm);
    if (enableStateV2) {
      stateStore.setState({ formDef: nextForm, loading: false });
    }
  };

  // Feature-flagged performance monitoring (Phase 1.4)
  const enablePerfV2 = ENABLE_PERF_V2;
  const perfMonitor = usePerformanceMonitor({
    enabled: enablePerfV2,
    trackRenderTime: true,
    trackMemoryUsage: false, // Chrome-only API, disabled by default
    trackNetworkRequests: false,
    reportInterval: 30000,
  });

  // Whether we have a real form (not the placeholder)
  const isPlaceholderForm = form?.id === ReactoryDefaultForm.id;

  // Granular loading stage tracking
  const loadingState = useFormLoadingState();
  const FQN = `${form?.nameSpace || "unknown"}.${form?.name || "unknown"}@${
    form?.version || "0.0.0"
  }`;
  const SIGN = `${FQN}:${instanceId}`;

  // Start performance timer for this form definition render cycle
  if (enablePerfV2) perfMonitor.startTimer(SIGN);

  const {
    loading: isUiSchemaLoading,
    uiOptions,
    uiSchema,
    uiSchemaActiveMenuItem,
    uiSchemaActiveGraphDefintion,
    uiSchemasAvailable,
    SchemaSelector,
  } = useUISchema({
    formDefinition: form,
    uiSchemaKey,
    uiSchemaId,
    params,
    mode,
    FQN,
    SIGN,
  });

  // Next we get the schema information
  // The schema can change depending on
  // the active ui schema definition
  const { schema } = useSchema({
    FQN,
    SIGN,
    formId,
    schema: form?.schema as Reactory.Schema.AnySchema,
    uiSchemaActiveMenuItem,
  });

  const {
    canRefresh,
    isDataLoading,
    formData,
    onChange,
    reset,
    onSubmit,
    validate,
    isValidating,
    errorSchema,
    errors,
    refresh,
    RefreshButton,
    SubmitButton,
    PagingWidget,
    paging,    
  } = useDataManager({
    initialData: form?.defaultFormValue || props.formData || props.data,
    formDefinition: form,
    FQN,
    SIGN,
    formId,
    route,
    // schema,
    // uiSchema,
    graphDefinition: uiSchemaActiveGraphDefintion,
    //@ts-ignore
    onBeforeQuery,
    onBeforeMutation,
    onBeforeSubmit,
    onSubmit: props.onSubmit,
    formContext,
    mode: mode,
    onError,
    props: props,
  });

  // Build the full form context via the useFormContext hook.
  // Note: useDataManager above receives the stale `formContext` state (existing pattern) —
  // it uses it only for passing to error handlers, not core data flow.
  const resolvedFormContext = useFormContext({
    formData,
    form,
    instanceId,
    SIGN,
    refresh,
    reset,
    props,
  });

  const [componentDefs, setComponents] = useState<DefaultComponentMap>(
    reactory.getComponents(DEFAULT_DEPENDENCIES)
  );

  const getForm = () => {
    loadingState.setStageActive('form-definition');
    if (enableStateV2) stateStore.setState({ loading: true });
    let _form = formDef;
    if (nil(_form)) {
      _form = reactory.form(formId, (nextForm, formError) => {
        if (nextForm && !formError) {
          loadingState.setStageComplete('form-definition');
          setFormWithTracking(nextForm);
        } else if (formError) {
          loadingState.setStageError('form-definition', 'Failed to load form definition');
        }
      }, props.loadOptions || {});
      if (nil(_form)) {
        warning(`Form not found: ${formId}`);
      } else {
        loadingState.setStageComplete('form-definition');
        setFormWithTracking(_form);
      }
    } else {
      loadingState.setStageComplete('form-definition');
    }
  };

  const injectResources = () => {
    if (document) {
      if (form.uiResources && form.uiResources.length) {
        loadingState.setStageActive('resources');
        form.uiResources.forEach((resource) => {
          const resourceId = `${resource.type}_${resource.id}`;
          if (nil(document.getElementById(resourceId)) === true) {
            switch (resource.type) {
              case "style": {
                let styleLink = document.createElement("link");
                styleLink.id = resourceId;
                styleLink.href = resource.uri;
                styleLink.rel = "stylesheet";
                document.head.append(styleLink);
                debug(`${SIGN} Injecting stylesheet`, { resource });
                break;
              }
              case "script": {
                let scriptLink = document.createElement("script");
                scriptLink.id = resourceId;
                scriptLink.src = resource.uri;
                scriptLink.type = "text/javascript";
                document.body.append(scriptLink);
                debug(`${SIGN} Injecting script`, { resource });
                // setTimeout(() => {
                //   setVersion(v + 1);
                // }, 500);
                // if the script contains a .js in the uri, we try to add the .js.map
                if (resource.uri && resource.uri.indexOf(".js") > -1) {
                  // uri might contain a query string, we need to remove it before adding .map
                  let uriWithoutQuery = resource.uri.split("?")[0];
                  let sourceMapUri = uriWithoutQuery + ".map";
                  // we also check if the source map already exists by checking for an element with id of resourceId + "_map"
                  if (nil(document.getElementById(resourceId + "_map")) === true) {
                    let scriptMapLink = document.createElement("script");
                    scriptMapLink.id = resourceId + "_map";
                    scriptMapLink.src = sourceMapUri;
                    scriptMapLink.type = "text/javascript";
                    document.body.append(scriptMapLink);
                    debug(`${SIGN} Injecting script source map`, { resource, sourceMapUri });
                  }
                }

                break;
              }
              default: {
                reactory.warning(
                  `ReactoryFormComponent.form() - injectResources() Resource Type ${resource.type}, not supported.`,
                  { resource }
                );
                break;
              }
            }
          }
        });
        loadingState.setStageComplete('resources');
      } else {
        loadingState.skipStage('resources');
      }
    } else {
      loadingState.skipStage('resources');
    }
  };

  const setFields = (
    _formDef: Reactory.Forms.IReactoryForm
  ): Reactory.Forms.IReactoryForm => {
    if (
      ReactoryUxPackages[_formDef.uiFramework] &&
      ReactoryUxPackages[_formDef.uiFramework].fields
    ) {
      _formDef.fields = ReactoryUxPackages[_formDef.uiFramework].fields;
    } else {
      _formDef.fields = {};
    }

    if (lodash.isArray(_formDef.fieldMap) === true) {
      _formDef.fieldMap.forEach((map) => {
        let mapped = false;
        if (map.component && typeof map.component === "string") {
          if (map.component.indexOf(".") > -1) {
            const pathArray = map.component.split(".");
            let component: Object = componentDefs[pathArray[0]];
            if (component && Object.keys(component).length > 0) {
              for (let pi = 1; pi <= pathArray.length - 1; pi += 1) {
                if (component && Object.keys(component).length > 0)
                  component = component[pathArray[pi]];
              }
              _formDef.fields[map.field] = component;
              mapped = true;
            } else {
              _formDef.fields[map.field] = componentDefs[map.component];
              if (_formDef.fields[map.field]) {
                mapped = true;
              }
            }
          }
        }

        if (map.componentFqn && map.field && mapped === false) {
          if (
            typeof map.componentFqn === "string" &&
            typeof map.field === "string"
          ) {
            _formDef.widgets[map.field] = reactory.getComponent(
              map.componentFqn
            );
            if (_formDef.widgets[map.field]) {
              mapped = true;
            }
          }
        }

        if (mapped === false) {
          _formDef.widgets[map.field] = (props, context) => {
            //@ts-ignore
            return (
              <MuiReactoryPackage.widgets.WidgetNotAvailable
                {...props}
                map={map}
              />
            );
          };
        }
      });
    }

    return _formDef;
  };

  const setWidgets = (
    _formDef: Reactory.Forms.IReactoryForm
  ): Reactory.Forms.IReactoryForm => {
    if (
      ReactoryUxPackages[_formDef.uiFramework] &&
      ReactoryUxPackages[_formDef.uiFramework].widgets
    ) {
      _formDef.widgets = ReactoryUxPackages[_formDef.uiFramework].widgets;
    } else {
      _formDef.widgets = {};
    }

    if (!_formDef.widgets) _formDef.widgets = {};
    if (reactory.utils.lodash.isArray(_formDef.widgetMap) === true) {
      _formDef.widgetMap.forEach((map) => {
        //reactory.log(`${signature} (init) Mapping ${map.widget} to ${map.componentFqn || map.component} ${_formDef.id}`, map);
        let mapped = false;

        if (map.component && typeof map.component === "string") {
          if (map.component.indexOf(".") > -1) {
            const pathArray = map.component.split(".");
            let component: Object = componentDefs[pathArray[0]];
            if (component && Object.keys(component).length > 0) {
              for (let pi = 1; pi <= pathArray.length - 1; pi += 1) {
                if (component && Object.keys(component).length > 0)
                  component = component[pathArray[pi]];
              }
              _formDef.widgets[map.widget] = component;
              //reactory.log(`${signature} (init) Component: ${_formDef.id}, ${map.component} successfully mapped`, { component });
              mapped = true;
            } else {
              _formDef.widgets[map.widget] = componentDefs[map.component];
              if (_formDef.widgets[map.widget]) {
                //reactory.log(`${signature} (init) Component: ${_formDef.id}, ${map.component} successfully mapped`, { component: _formDef.widgets[map.widget] });
                mapped = true;
              }
            }
          }
        }

        if (map.componentFqn && map.widget && mapped === false) {
          if (
            typeof map.componentFqn === "string" &&
            typeof map.widget === "string"
          ) {
            _formDef.widgets[map.widget] = reactory.getComponent(
              map.componentFqn
            );
            if (_formDef.widgets[map.widget]) {
              // reactory.log(`${signature} (init) Component: ${_formDef.id}, ${map.componentFqn} successfully mapped`, { component: _formDef.widgets[map.widget] });
              mapped = true;
            }
          }
        }

        if (mapped === false) {
          _formDef.widgets[map.widget] = (props, context) => {
            return React.createElement(
              MuiReactoryPackage.widgets.WidgetNotAvailable,
              { ...props, map }
            );
            //setTimeout(() => { setVersion(version + 1) }, 777);
            //return (<>loading ...{map.widget}</>)
          };
          // reactory.log(`${signature} (init) Component could not be mapped for Form: ${_formDef.id}, ${map.widget}`, { map });
        }
      });
    }

    return _formDef;
  };

  const setFieldTemplate = (
    _formDef: Reactory.Forms.IReactoryForm
  ): Reactory.Forms.IReactoryForm => {
    switch (_formDef.uiFramework) {
      case "material": {
        _formDef.FieldTemplate =
          MuiReactoryPackage.templates.MaterialFieldTemplate;
        _formDef.ArrayFieldTemplate =
          MuiReactoryPackage.templates.MaterialArrayFieldTemplate;
        break;
      }
      default: {
        if (_formDef.FieldTemplate) delete _formDef.FieldTemplate;
        break;
      }
    }

    return _formDef;
  };

  const setObjectTemplate = (
    _formDef: Reactory.Forms.IReactoryForm
  ): Reactory.Forms.IReactoryForm => {
    switch (_formDef.uiFramework) {
      case "material": {
        _formDef.ObjectFieldTemplate =
          MuiReactoryPackage.templates.MaterialObjectTemplate;
        break;
      }
      default: {
        if (_formDef.ObjectFieldTemplate) delete _formDef.ObjectFieldTemplate;
        break;
      }
    }

    return _formDef;
  };

  useEffect(getForm, [formId]);
  useEffect(() => {
    if (formDef && formDef.__complete__ === true) {
      setForm(formDef);
    }
  }, [formDef]);

  // Track UI schema loading stage
  useEffect(() => {
    if (isUiSchemaLoading) {
      loadingState.setStageActive('ui-schema');
    } else {
      loadingState.setStageComplete('ui-schema');
    }
  }, [isUiSchemaLoading]);

  // Track data loading stage
  useEffect(() => {
    if (isDataLoading) {
      loadingState.setStageActive('data');
    } else {
      loadingState.setStageComplete('data');
    }
  }, [isDataLoading]);

  useEffect(() => {
    setVersion(v + 1);
  }, [formData]);

  useEffect(injectResources, [form.uiResources]);

  const getEffectiveForm = () => {
    let _form = lodash.cloneDeep(form);
    if (extendSchema && typeof extendSchema === "function")
      _form = extendSchema(_form);

    _form = setFields(_form);
    _form = setWidgets(_form);
    _form = setObjectTemplate(_form);
    _form = setFieldTemplate(_form);
    // Only mark complete when we have the real form, not the placeholder
    _form.__complete__ = !isPlaceholderForm;
    _form.idSchema = toIdSchema(
      schema,
      _form.id,
      _form.definitions,
      formData,
      _form.idPrefix as string
    );
    return _form;
  };

  // Track the widgets stage via effect — must not setState during render
  const effectiveForm = getEffectiveForm();
  useEffect(() => {
    if (effectiveForm.__complete__) {
      loadingState.setStageComplete('widgets');
    } else {
      loadingState.setStageActive('widgets');
    }
  }, [effectiveForm.__complete__]);

  // End performance timer when form is fully loaded
  useEffect(() => {
    if (enablePerfV2 && effectiveForm.__complete__ && !loadingState.isLoading) {
      perfMonitor.endTimer(SIGN);
    }
  }, [effectiveForm.__complete__, loadingState.isLoading, enablePerfV2]);

  return {
    instanceId,
    uiOptions,
    uiSchema,
    uiSchemaActiveMenuItem,
    uiSchemaActiveGraphDefintion,
    uiSchemasAvailable,
    SchemaSelector,
    isUiSchemaLoading,

    schema,

    FQN,
    SIGN,
    graphDefinition: uiSchemaActiveGraphDefintion,
    form: effectiveForm,
    formContext: resolvedFormContext,
    setForm,

    canRefresh,
    isDataLoading,
    loadingState,
    formData,
    onChange,
    reset,
    onSubmit,
    validate,
    isValidating,
    errorSchema,
    errors,
    refresh,
    RefreshButton,
    SubmitButton,
    PagingWidget,
    paging,

    // Feature-flagged debug/monitoring (only populated when flags are on)
    ...(enableStateV2 ? { stateDebug: stateStore.debug } : {}),
    ...(enablePerfV2 ? { perfMetrics: perfMonitor.metrics, perfReport: perfMonitor.getReport() } : {}),
  };
};
