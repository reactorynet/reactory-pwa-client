/* tslint:disable */
/* eslint-disable */
import React, { Component, Fragment, ReactNode, DOMElement, CSSProperties, Ref } from 'react';
import Reactory from '@reactory/reactory-core';
import PropTypes, { any, ReactNodeArray, string } from 'prop-types';
import SchemaForm, { ISchemaForm } from '../form/components/SchemaForm';
import objectMapper from 'object-mapper';
import { diff } from 'deep-object-diff';
import { find, template, isArray, isNil, isString, isEmpty, throttle, filter } from 'lodash';
import { Route, Routes, useParams, useNavigate, useLocation } from 'react-router';
import { withTheme } from '@mui/styles';
import { compose } from 'redux';
import * as uuid from 'uuid';
import { ApolloQueryResult } from '@apollo/client'
import { nil } from '@reactory/client-core/components/util';
import queryString from '@reactory/client-core/components/utility/query-string';
import { useReactory } from '@reactory/client-core/api/ApiProvider';

import {
  Card,
  Grid,
  Button,
  Fab,
  Typography,
  IconButton,
  Icon,
  Paper,
  Input,
  Toolbar,
  LinearProgress,
  Theme,
  Breakpoint,
  Tooltip
} from '@mui/material';

import ReactoryUxPackages from '../ux';

import gql from 'graphql-tag';
import { deepEquals } from '../form/utils';
import { History } from 'history';
import ReactoryFormListDefinition from '../formDefinitions/ReactoryFormList';
import ReactoryNewFormInput from '../formDefinitions/ReactoryNewFormInput';

import ReactoryFormDataManager from '../ReactoryFormDataManager';
import IntersectionVisible from '../../utility/IntersectionVisible';
import { ErrorBoundary } from '@reactory/client-core/api/ErrorBoundary';
import MuiReactoryPackage from '../ux/mui';
import { WidgetNotAvailable } from '../ux/mui/widgets';
import ErrorList from '../form/components/ErrorList';

import {  
  ReactoryDefaultForm,
  ReactoryErrorForm
} from './constants';

import {
  InitialStateFunction,
  ReactoryFormState
} from './types';

import { useContext } from './useContext';
import { useDataManager } from './useDataManager';
import { useFormDefinition } from './useFormDefinition';

function TabContainer(props) {
  return (
    <Typography component="div" style={{ padding: 8 * 3 }}>
      {props.children}
    </Typography>
  );
}

TabContainer.propTypes = {
  children: PropTypes.node.isRequired,
};

const AllowedSchemas = (uiSchemaItems: Reactory.Forms.IUISchemaMenuItem[], mode = 'view', size = 'md'): Reactory.Forms.IUISchemaMenuItem[] => {
  return filter(uiSchemaItems, item => {
    let mode_pass = false;
    let size_pass = false;
    let min_width_pass = false;

    if (item.modes === null || item.modes === undefined) mode_pass = true;
    else if (item.modes.indexOf(mode) >= 0) {
      mode_pass = true;
    }

    if (item.sizes === null || item.sizes === undefined) size_pass = true;
    else if (item.sizes.indexOf(size) >= 0) {
      size_pass = true;
    }

    if (item.minWidth === null || item.minWidth === undefined) min_width_pass = true;
    else if (window.innerWidth >= item.minWidth) min_width_pass = true;

    return mode_pass === true && size_pass === true && min_width_pass === true;
  });
};


const default_dependencies = () => {
  return [
    'core.Loading',
    'core.Logo',
    'core.FullScreenModal',
    'core.DropDownMenu',
    'core.HelpMe',
    'core.ReportViewer',
    'core.ReactoryFormEditor',
  ];
};

interface ReactoryComponentMap {
  [key: string]: any
}

interface ReactoryComponentError {
  errorType: string | "graph" | "runtime",
  error: any
}

type ScreenSizeKey = Breakpoint | number;

const available_sizes: ScreenSizeKey[] = ["xl", "lg", "md", "sm", "xs"];

export const ReactoryForm: React.FunctionComponent<Reactory.Client.IReactoryFormProps> = (props: Reactory.Client.IReactoryFormProps) => {  
  const [instanceId] = React.useState(uuid.v4())
  const { mode = 'view' } = props;
  const reactory = useReactory();
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const formDefinition = useFormDefinition(props);
  const {} = useDataManager(props);
  //const [formDefinition, setFormDefinition] = React.useState<Reactory.Forms.IReactoryForm>(undefined);
  

  const fqn = `${formDefinition?.nameSpace || '*'}.${formDefinition?.name || '*'}@${formDefinition?.version || '*'}`;
  const signature = `${formDefinition === undefined ? '🔸' : ''}<${fqn} instance={${instanceId} />`;
  const queryData: any = reactory.utils.queryString.parse(window.location.search) || {};

  const getScreenSize = () => {
    let _response: ScreenSizeKey = "md";
    return _response;
  };

  const DATAMANAGER = ReactoryFormDataManager(reactory);

  //get initial data
  const initialData = (_existing: any = null) => {
    if (formDefinition === undefined || formDefinition.id === "ReactoryLoadingForm") return null;

    if (typeof formDefinition.schema === "object") {
      switch (formDefinition.schema.type) {
        case "string": {
          return `${location.search || props.data || props.formData || formDefinition.defaultFormValue}`
        }
        case "number": {
          if (typeof props.data === 'number') return props.data;
          if (typeof props.formData === 'number') return props.formData;
          if (typeof formDefinition.defaultFormValue === 'number') return formDefinition.defaultFormValue;

          if (formDefinition.schema.default) return formDefinition.schema.default;

          return null
        }
        case "object": {
          let _obj = {};
          if (typeof formDefinition.schema.default === 'object') _obj = { ...formDefinition.schema.default };
          if (typeof formDefinition.defaultFormValue === 'object') _obj = { ..._obj, ...formDefinition.defaultFormValue };
          if (typeof props.data === 'object') _obj = { ..._obj, ...props.data };
          if (typeof props.formData === 'object') _obj = { ..._obj, ...props.formData };
          // if (typeof queryData === 'object') _obj = { ..._obj, ...queryData };

          if (_existing && typeof _existing === 'object') {
            _obj = { ..._existing, ..._obj };
          }
          return _obj
        }
        case "array": {

          if (formDefinition.defaultFormValue && Array.isArray(formDefinition.defaultFormValue) === false) reactory.log(`🚨 ${signature} Schema type and Default Form Value do not match.`, { formDef: formDefinition });

          if (reactory.utils.lodash.isArray(props.data) === true) return props.data;
          if (reactory.utils.lodash.isArray(props.formData) === true) return props.formData;
          if (reactory.utils.lodash.isArray(formDefinition.defaultFormValue) === true) return formDefinition.defaultFormValue;
          if (reactory.utils.lodash.isArray(formDefinition.schema.default) === true) return formDefinition.schema.default;

          return [];
        }
        default: {
          return props.data || props.formData || formDefinition.schema.default;
        }
      }
    } else {
      if (typeof formDefinition.schema === "function") {
        return (formDefinition.schema as Reactory.Schema.TClientSchemaResolver)(formDefinition, reactory);
      }
    }
  };

  const getInitialUiSchemaKey = () => {
    return queryData.uiSchemaKey || props.uiSchemaKey || 'default';
  };

  const getInitialActiveMenuItem = (): Reactory.Forms.IUISchemaMenuItem => {

    const key = getInitialUiSchemaKey();

    if (formDefinition === undefined) return null;

    //if (formDef?.id ==='core.SupportTickets@1.0.0') 

    let allowed_schemas = AllowedSchemas(formDefinition.uiSchemas, mode, getScreenSize());

    let matched_schema = allowed_schemas.find((menu_item) => {
      return menu_item.key === key
    });

    if (matched_schema) return matched_schema;

    if (allowed_schemas.length > 0) {
      return allowed_schemas[0];
    }

    return {
      id: 'default',
      key: 'default',
      uiSchema: (formDefinition.uiSchema as Reactory.Schema.IFormUISchema) || {},
      description: "Default active menu item",
      title: "Default",
      icon: "form",
    };
  };

  const getInitialDepencyState = () => {
    let _dependency_state = { passed: true, dependencies: {} }

    let _all_dependencies = [];
    if (formDefinition?.widgetMap) {
      formDefinition.widgetMap.forEach((map) => {
        if (map.componentFqn) {
          if (_all_dependencies.indexOf(map.componentFqn) < 0) _all_dependencies.push(map.componentFqn);
        }
      })
    }

    if (formDefinition?.components) {
      formDefinition.components.forEach((component) => {
        if (component.indexOf("@") > 1 && component.indexOf(".") > 0) {
          if (_all_dependencies.indexOf(component) < 0) _all_dependencies.push(component);
        }
      })
    }

    if (formDefinition?.dependencies && formDefinition.dependencies.length > 0) {
      formDefinition.dependencies.forEach((_dep: Reactory.Forms.IReactoryComponentDefinition) => {
        _dependency_state.dependencies[_dep.fqn] = {
          available: reactory.componentRegister[_dep.fqn] !== null && reactory.componentRegister[_dep.fqn] !== undefined,
          component: null
        };

        if (_dependency_state.dependencies[_dep.fqn].available === true) {
          _dependency_state.dependencies[_dep.fqn].component = reactory.componentRegister[_dep.fqn].component
        } else {
          _dependency_state.passed = false;
        }
      })
    }

    return _dependency_state;
  };

  const $initialData = initialData();

  const [componentDefs, setComponents] = React.useState<ReactoryComponentMap>(reactory.getComponents(default_dependencies()));
  const [formData, setFormData] = React.useState<any>($initialData);
  const [formHistory, setHistory] = React.useState<any[]>([$initialData]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [activeUiSchemaKey, setActiveUiSchemaKey] = React.useState<string>(getInitialUiSchemaKey());
  const [activeUiSchemaMenuItem, setActiveUiSchemaMenuItem] = React.useState<Reactory.Forms.IUISchemaMenuItem>(getInitialActiveMenuItem());
  const [queryComplete, setQueryComplete] = React.useState<boolean>(false);
  const [allowRefresh, setAllowRefresh] = React.useState<boolean>(false);
  const [showReportModal, setShowReportModal] = React.useState<boolean>(false);
  const [showExportModal, setShowExportModal] = React.useState<boolean>(false)
  const [showHelpModal, setShowHelpModal] = React.useState<boolean>(false)
  const [activeExportDefinition, setActiveExportDefinition] = React.useState<Reactory.Forms.IExport>(null);
  const [activeReportDefinition, setActiveReportDefinition] = React.useState<Reactory.Forms.IReactoryPdfReport>(null);
  const [busy, setIsBusy] = React.useState<boolean>(false);
  const [pendingResources, setPendingResources] = React.useState<any>(null);
  const [plugins, setPlugins] = React.useState(null);
  const [liveUpdate, setLiveUpdate] = React.useState<boolean>(false);
  const [error, setError] = React.useState<ReactoryComponentError>(null);
  const [uiFramework, setUiFramework] = React.useState(props.uiFramework || 'material');
  const [autoQueryDisabled, setAutoQueryDisabled] = React.useState<boolean>(props.autoQueryDisabled || false);
  const [dirty, setIsDirty] = React.useState(false);
  const [refreshInterval, setRefreshInterval] = React.useState(null);
  //used for internal tracking of updates / changes since first load
  const [version, setVersion] = React.useState<number>(0);
  const [last_query_exec, setLastQueryExecution] = React.useState(null);
  //const [formRef, setFormRef] = React.useState<React.RefObject<Form>>(React.createRef());
  const [dependencies, setDepencies] = React.useState<any>(getInitialDepencyState().dependencies);
  const [dependenciesPassed, setDepenciesPassed] = React.useState<boolean>(getInitialDepencyState().passed);
  const [customState, setCustomState] = React.useState<any>({});
  const [showFormEditor, setShowEditor] = React.useState<boolean>(false);

  const formRef: React.RefObject<any> = React.createRef<any>();

  const reset = () => {
    setComponents(reactory.getComponents(default_dependencies()));
    setFormData(initialData());
    setQueryComplete(false);
    setAllowRefresh(false);
    setIsBusy(false);
    setIsDirty(false);
    setVersion(0);
    setDepencies(getInitialDepencyState().dependencies);
    setCustomState({});
  };

  const onReactoryFormUnmount = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setInterval(null);
    }

    if (props.formId) {
      reactory.removeListener(`onReactoryFormDefinitionUpdate::${props.formId}`, setFormDefinition)
    }
  }

  const onReactoryFormMounted = () => {

    reactory.amq.onReactoryPluginLoaded('loaded', onPluginLoaded);

    if (props.refCallback) props.refCallback(getFormReference());
    if (props.ref && typeof props.ref === 'function') props.ref(getFormReference())

    if (props.formDef) {
      setFormDefinition({ ...props.formDef, __complete__: true });
    } else {
      let $id = props.formId;
      if (!$id && props.formDef && props.formDef.id) $id = props.formDef.$id as string;
      const $formDef = reactory.form($id, (nextFormDef, error) => {
        if (error) {
          setFormDefinition(ReactoryErrorForm);
          setFormData({ error })
        } else {
          setFormDefinition(nextFormDef);
        }

      });

      if ($formDef) setFormDefinition($formDef.__complete__ === true ? $formDef : ReactoryDefaultForm)

    }

    return onReactoryFormUnmount;
  }

  /**
   * Effects Starts
   */

  React.useEffect(onReactoryFormMounted, []);

  React.useEffect(() => {
    getData();
    reactory.utils.localForage.setItem(`${fqn}::preferred_uiSchema`, activeUiSchemaMenuItem);
  }, [activeUiSchemaMenuItem])

  const watchList = [props.formData, props.formDef, props.formId];

  if (props.watchList) {
    props.watchList.forEach((p) => {
      watchList.push(props[p]);
    })
  }

  React.useEffect(() => {
    //let next_version = version + 1;
    setVersion(0);
    reactory.log(`${signature} Incoming Properties Changed`, { formData, version });
    getData();

  }, watchList)


  React.useEffect(() => {
    setVersion(version + 1);
  }, [formData, props])

  React.useEffect(() => {
    //clear the data
    // setFormData();
    //get the data    
    getData(initialData());
  }, [formDefinition])

  /** Effects End */


  /**
   * Determines what is the correct uiSchema to use for the form based on order of importance.
   * User Preference overrides other values
   * Route param overrides form props / state
   * Form state overrides props
   * props is initial and base values
   * @returns 
   */
  const getActiveUiSchema = () => {
    if (formDefinition === undefined) return {};

    if (activeUiSchemaMenuItem !== null) {
      return activeUiSchemaMenuItem.uiSchema;
    }

    if (formDefinition.uiSchemas === null || formDefinition.uiSchemas === undefined) return formDefinition.uiSchema || {};
    if (Array.isArray(formDefinition.uiSchemas) === true && formDefinition.uiSchemas.length === 0) return formDefinition.uiSchema || {};

    let allowed_schemas = AllowedSchemas(formDefinition.uiSchemas, mode, getScreenSize());
    const qargs = queryString.parse(location.search);
    let matched_schema = allowed_schemas.find((menu_item, index) => {
      return menu_item.key === props.uiSchemaKey || menu_item.id === props.uiSchemaId || qargs.uiSchemaKey === menu_item.key || qargs.uiSchemaId === menu_item.id;
    });

    if (matched_schema) return matched_schema.uiSchema;

    return formDefinition.uiSchema;
  }

  const getActiveUiOptions = (): Reactory.Schema.IFormUIOptions => {

    let _options = { showSchemaSelectorInToolbar: true };
    let _uiSchema: Reactory.Schema.IFormUISchema = getActiveUiSchema() as Reactory.Schema.IFormUISchema;

    if (_uiSchema && _uiSchema['ui:form']) {
      _options = { ..._options, ..._uiSchema['ui:form'] };
    } else {
      //fallback
      if (_uiSchema && _uiSchema['ui:options'] && typeof _uiSchema['ui:options'] === 'object') {
        _options = { ..._options, ..._uiSchema['ui:options'] };
      }
    }
    return _options;
  }

  const getActiveGraphDefinitions = (): Reactory.Forms.IFormGraphDefinition => {
    let _grahDefinitions: Reactory.Forms.IFormGraphDefinition = formDefinition?.graphql;


    if (activeUiSchemaMenuItem !== null) {
      if (activeUiSchemaMenuItem.graphql) _grahDefinitions = activeUiSchemaMenuItem.graphql;
    }

    const _uiSchema = getActiveUiSchema();
    if (_uiSchema && _uiSchema["ui:graphql"]) {
      _grahDefinitions = _uiSchema["ui:graphql"];
    }

    return _grahDefinitions;
  };

  const getActiveSchema = (defaultSchema) => {
    if (formDefinition === undefined) return ReactoryDefaultForm.schema;

    let _schemaDefinitions: any = defaultSchema || formDefinition.schema;

    const _uiSchema = getActiveUiSchema();
    if (_uiSchema && _uiSchema["ui:schema"]) {
      _schemaDefinitions = _uiSchema["ui:schema"];
    }

    return _schemaDefinitions;
  }

  const onPluginLoaded = (plugin: any) => {
    reactory.log(` ${signature} Plugin loaded, activating component`, { plugin });
    try {

      let _component = plugin.component(props, getFormContext());
      if (dependencies[plugin.componentFqn]) {
        let _depends = { ...dependencies };
        _depends[plugin.componentFqn].available = true;
        _depends[plugin.componentFqn].component = _component;
        setDepencies(_depends);
      }
      setVersion(version + 1);
    } catch (pluginFailure) {
      reactory.log(`${signature} An error occured loading plugin ${plugin.componentFqn}`, { plugin, pluginFailure });
    }
  }

  const getHelpScreen = () => {

    const { HelpMe } = componentDefs;
    let topics = [];
    if (formDefinition.helpTopics) topics = [...formDefinition.helpTopics]
    if (props.helpTopics) topics = [...props.helpTopics, ...topics];
    const closeHelp = e => setShowHelpModal(false);

    const allowSupportRequest = () => {
      const _activeSchema = getActiveUiSchema();
      if (_activeSchema && _activeSchema['ui:form'] && _activeSchema['ui:form'].allowSupportRequest === false) return false;
      return true;
    }

    return (
      <HelpMe
        topics={topics}
        tags={formDefinition.tags}
        title={props.helpTitle || formDefinition.title}
        open={showHelpModal === true}
        allowSupportRequest={allowSupportRequest()}
        onClose={closeHelp}>
      </HelpMe>
    )
  };

  const onSubmit = (form: any) => {
    reactory.log(`${signature} ↩ onSubmit`, { form });
    let cancel: boolean = false;

    if (props.onSubmit) {
      const _cancel = props.onSubmit(form);
      if (_cancel === true) cancel = true;
      else cancel = false;
    }

    if (cancel === true) return;

    getData(form.formData);
    setQueryComplete(false);
    setVersion(version + 1);

    const _graphql: Reactory.Forms.IFormGraphDefinition = getActiveGraphDefinitions();
    if (_graphql) {

      if (_graphql.mutation) {

        let mutation: Reactory.Forms.IReactoryFormMutation = _graphql.mutation[mode];

        if (mutation === null || mutation === undefined) {
          //check if we need to rerun the query with the updated formData.
          reactory.log(`No mutations available for configured mode}`, {});
          return;
        }

        const _input_mapping_params = {
          ...form,
          formContext: getFormContext(),
          $route:
            props.$route,
          reactory,
          api: reactory
        };


        // TODO: Werner Weber - Add the ability here for variables to be mapped to an async function
        // that will allow the developer to create a custom client side mapping object and resolve async
        // data as part of the input params.
        const _variables = objectMapper(_input_mapping_params, mutation.variables);

        let do_mutation = true;
        let mutation_props: any = {
          variables: reactory.utils.omitDeep({ ..._variables }),
          refetchQueries: mutation.options && mutation.options.refetchQueries ? mutation.options.refetchQueries : [],
        };

        if (props.onBeforeMutation) {
          do_mutation = props.onBeforeMutation(mutation_props, form, getFormContext()) !== false;
        }

        if (do_mutation) {
          reactory.graphqlMutation(mutation.text, mutation_props.variables, mutation_props.refetchQueries).then((mutation_result: ApolloQueryResult<any>) => {
            const { data, error, errors = [] } = mutation_result;
            reactory.log(`🧐 Mutation Response ${mutation.name}`, { data, error });
            if (error) {
              // ADDED: DREW
              // Show message returned from resolver
              if (props.onError) props.onError(error, getFormContext());
              if (error.graphQLErrors && error.graphQLErrors.length > 0) {

                error.graphQLErrors.forEach(gqlError => {
                  reactory.createNotification(
                    `${gqlError.message}`,
                    {
                      showInAppNotification: true,
                      type: 'error',
                    });
                })
              } else {
                reactory.createNotification(
                  `Error ${mutation.name} Failed`,
                  {
                    showInAppNotification: true,
                    type: 'error',
                  });
              }
            }
            if (errors && errors.length > 0) {
              if (props.onError) props.onError(errors, getFormContext());
              else {
                reactory.createNotification('Could not execute the action.  Server responded with errors', { type: 'warning', showInAppNotification: true })
              }
            }

            if (data && data[mutation.name]) {

              let _formData = DATAMANAGER.fromGraphResult(data, form.formData, mutation);

              //validate data against schema
              if (formDefinition.sanitizeSchema) {
                reactory.utils.inspector.sanitize(formDefinition.sanitizeSchema, _formData);
              };

              if (reactory.utils.deepEquals(_formData, formData) === false) {

                setFormData(_formData);
              }

              const templateProps = {
                formData: _formData,
                formContext: getFormContext(),
                props: props,
                mutation_result: data[mutation.name],
              };

              if (typeof mutation.onSuccessUrl === 'string') {
                try {
                  let linkText = template(mutation.onSuccessUrl)(templateProps);
                  setTimeout(() => {
                    navigate(linkText);
                  }, mutation.onSuccessRedirectTimeout || 500);
                } catch (exception) {
                  reactory.createNotification('Cannot redirect form, template error', { type: 'warning' });
                  reactory.log('ReactoryForm Mutation Cannot redirect using redirect method as the template caused an error.', { templateError: exception });
                }
              }

              if (mutation.onSuccessMethod === "notification" && mutation.notification) {
                const dataObject = { formData, resultData: data[mutation.name], formContext: getFormContext() };

                reactory.createNotification(
                  template(mutation.notification.title)(templateProps),
                  {
                    showInAppNotification: mutation.notification.inAppNotification === true,
                    type: 'success',
                    props: {
                      ...dataObject,
                      ...(mutation.notification?.props || {}) as Object,
                    },
                  }
                );
              }


              if (props.onMutateComplete) props.onMutateComplete(data[mutation.name], getFormContext(), mutation_result);

              if (typeof mutation.onSuccessMethod === "string" && mutation.onSuccessMethod.indexOf('event') >= 0) {
                if (mutation.onSuccessMethod.indexOf(":") > 0) {
                  let eventName = mutation.onSuccessMethod.split(':')[1];
                  if (typeof props[eventName] === "function") {
                    (props[eventName] as Function)({ formData: data[mutation.name] })
                  } else {
                    reactory.amq.raiseFormCommand(eventName, {
                      form: {},
                      result: data[mutation.name]
                    });
                  }
                } else {
                  if (mutation.onSuccessEvent && mutation.onSuccessEvent.name) {
                    if (typeof props[mutation.onSuccessEvent.name] === 'function') {
                      (props[mutation.onSuccessEvent.name] as Function)({ formData: mutation.onSuccessEvent.dataMap ? reactory.utils.objectMapper(data[mutation.name], mutation.onSuccessEvent.dataMap) : data[mutation.name] });
                    }
                  } else {
                    reactory.amq.raiseFormCommand(mutation.onSuccessEvent.name, {
                      form: {},
                      result: data[mutation.name]
                    });
                  }
                }
              }

              // TODO - check if this is acceptable
              if (mutation.onSuccessMethod === "refresh") {
                getData();
              }


            }

            setQueryComplete(true);
            setVersion(version + 1);
          }).catch((mutation_error) => {

            if (mutation.onError) {
              //handle the error with the error handler              
            }

            if (props.onError) {
              props.onError(mutation_error, getFormContext(), 'mutation');
            }

            reactory.log(`Error Executing Mutation ${mutation_error.message}`, { mutation_error });
            setError({ error: mutation_error, errorType: "runtime" });
            setQueryComplete(true);
            setVersion(version + 1);
          });
        }

      }

    }
  }


  const onChange = (form: any, errorSchema: any) => {

    const hasDelta = deepEquals(formData, form.formData) === false;

    //@ts-ignore
    //reactory.log(`${signature} => onChange`, { form, errorSchema, hasDelta }, 'debug' );

    //if ((new Date().valueOf() - created) < 777) return;

    const _graphql: Reactory.Forms.IFormGraphDefinition = getActiveGraphDefinitions();


    if (busy === false && (_graphql && _graphql.query && queryComplete === true) || (_graphql && _graphql.mutation)) {

      if (deepEquals(formData, form.formData) === false) {

        //reactory.log(`${formDef.name}[${instance_id}].onChange`, { data: form.formData });

        const $onChange = props.onChange;

        const trigger_onChange = $onChange && typeof $onChange === 'function';

        const changed = diff(form.formData, formData);
        const rchanged = diff(formData, form.formData);

        let cancelEvent = false;

        let do_mutation = true;
        const fire = () => {

          if (formDefinition.eventBubbles) {
            formDefinition.eventBubbles.forEach((eventAction) => {
              if (eventAction.eventName === "onChange") {
                if (eventAction.action === "swallow") {
                  cancelEvent = true;
                }
              }
            });
          }

          if (cancelEvent === true) return;

          $onChange(form.formData, form.errorSchema, { before: changed, after: rchanged, self });
        }

        //reactory.log(`${signature} => onChange DELTA =>`, { changed, rchanged });

        if (_graphql && _graphql.mutation && _graphql.mutation['onChange']) {

          do_mutation = dirty === true

          if (props.onBeforeMutation && do_mutation === true) {
            do_mutation = props.onBeforeMutation({}, form, getFormContext()) !== false;
          }

          if (do_mutation === true) {
            let onChangeMutation: Reactory.Forms.IReactoryFormMutation = _graphql.mutation['onChange'];
            let throttleDelay: number = _graphql.mutation['onChange'].throttle || 250;
            let variables = reactory.utils.objectMapper({ eventData: form, form: { formData, formContext: getFormContext() } }, onChangeMutation.variables);

            //let throttled_call = throttle(() => {
            reactory.graphqlMutation(onChangeMutation.text, variables, onChangeMutation.options).then((mutationResult) => {
              reactory.log(`${signature} => onChange => onChangeMutation result`, { mutationResult });

              if (props.onMutateComplete) props.onMutateComplete(form.formData, getFormContext(), mutationResult);
            }).catch((mutationError) => {

              if (props.onMutateComplete) props.onMutateComplete(form.formData, getFormContext(), null, mutationError);
              reactory.log(`${signature} => onChange => onChangeMutation error`, { mutationError });
            });

          }
        }

        if (formDefinition && formDefinition.refresh && formDefinition.refresh.onChange) {
          if (trigger_onChange === true) fire();
        } else {

          setFormData(form.formData);
        }
      }
    } else {

      setFormData(form.formData);
    }

    setIsDirty(hasDelta);
    // if (hasDelta === true) setVersion(version + 1);
  }

  const setState = ($state: any, callback = () => { }) => {

    let _$state = { ...$state };
    delete _$state.formData;
    if (Object.keys(_$state).length > 0) {
      let _customState = {};
      Object.keys(_$state).forEach((stateKey) => {
        switch (stateKey) {
          case "componentDefs": {
            setComponents(_$state[stateKey]);
            break;
          }
          case "":
          case "formData": {
            //do nothing, already handled or not permitted.
            break;
          }
          default: {
            _customState[stateKey] = _$state[stateKey];
          }
        }
      });

      if (Object.keys(_customState).length > 0) {
        setCustomState(_customState);
      }
    }

    if ($state.formData) getData($state.formData);

    callback();

  };

  const getState = () => {
    return {
      formData,
      queryComplete,
      dirty,
      _instance_id: instanceId,
      ...customState
    }
  }

  const $submitForm = () => {
    // if (isNil(formRef) === false && formRef.current) {
    //   try {
    //     if (formRef.current && formRef.current.onSubmit) {

    //       formRef.current.onSubmit(null);
    //     }
    //   } catch (submitError) {
    //     reactory.createNotification(`The Form ${signature} could not submit`, { type: "warning", showInAppNotification: true, canDismis: true });
    //     reactory.log(`Could not submit the form`, submitError);
    //   }
    // }
    onSubmit({ formData });
  }

  const getFormReference = () => {
    return {
      setState,
      forceUpdate: () => { setVersion(version + 1) },
      props,
      setFormDefinition,
      submit: $submitForm,
      state: getState(),
      validate: () => {
        if (formRef && formRef.current) {
          formRef.current.validate(formData);
        }
      },
      formRef,
      onChange,
      refresh: (args = { autoQueryDisabled: true }) => {
        setAutoQueryDisabled(args.autoQueryDisabled);
        getData(formData);
      },
    }
  }


  const getFormContext = (nextData?: any) => {
    const cloned_props = { ...props };
    let inputContext = {}
    if (cloned_props.formContext) {
      inputContext = cloned_props.formContext;
      delete cloned_props.formContext;
    }
    let _context = {
      ...cloned_props,
      signature,
      version,
      formDef: { ...formDefinition },
      formData: nextData || formData,
      $formData: nextData || formData,
      $formState: {
        formData: nextData || formData,
        showReportModal,
        formDef: formDefinition
      },
      query: { ...props.query },
      formInstanceId: instanceId,
      $ref: getFormReference(),
      refresh: (args = { autoQueryDisabled: true }) => {
        setAutoQueryDisabled(args.autoQueryDisabled);
        getData(formData);
      },
      setFormData: (formData: any, callback = () => { }) => {
        setFormData(formData);
        callback();
      },
      graphql: getActiveGraphDefinitions(),
      getData,
      reset,
      screenBreakPoint: getScreenSize(),
      i18n: reactory.i18n,
      reactory,
      setState: setCustomState,
      state: customState,
      ...inputContext,
    }

    // reactory.log(`<${formDef.nameSpace}.${formDef.name}@${formDef.version} /> -> getFormContext()`, { _context });
    return _context;
  }

  /**
   * Build the form definition from current props and state. 
   * Returns active form definition
   */
  const formDefinitionFunction = (): Reactory.Forms.IReactoryForm => {
    if (formDefinition === undefined) return ReactoryDefaultForm;
    if (formDefinition.__complete__ === false) return ReactoryDefaultForm;

    const { extendSchema, uiSchemaKey, uiSchemaId } = props;
    let _formDef: Reactory.Forms.IReactoryForm = reactory.utils.lodash.cloneDeep(formDefinition);
    if (extendSchema && typeof extendSchema === 'function') _formDef = extendSchema(_formDef);

    if (_formDef.uiFramework !== 'schema') {
      //we are not using the schema define ui framework we are assigning a different one
      _formDef.uiFramework = uiFramework
    }

    // set noHtml5Validation if not set by schema
    if (nil(_formDef.noHtml5Validate)) _formDef.noHtml5Validate = true;

    //state selected option must override the property set item
    //as the user can change the current active item either programmatically
    //or via UX element.
    _formDef.uiSchema = getActiveUiSchema();
    _formDef.graphql = getActiveGraphDefinitions();
    _formDef.schema = getActiveSchema(_formDef.schema);

    // #region setup functions
    const setFormContext = () => {
      if (!_formDef.formContext) _formDef.formContext = {};
      //we combine the form context from the getter function, with the formContext property / object on the _formDef
      _formDef.formContext = { ...getFormContext(), ..._formDef.formContext as Object };
    };

    const setFields = () => {

      if (ReactoryUxPackages[_formDef.uiFramework] && ReactoryUxPackages[_formDef.uiFramework].fields) {
        _formDef.fields = ReactoryUxPackages.material.fields;
      } else {
        _formDef.fields = {};
      }

    };

    if (!_formDef.fields) _formDef.fields = {};

    if (isArray(_formDef.fieldMap) === true) {
      _formDef.fieldMap.forEach((map) => {
        //reactory.log(`${signature} (init) Mapping ${map.field} to ${map.componentFqn || map.component} ${_formDef.id}`, map);
        let mapped = false;

        if (map.component && typeof map.component === 'string') {
          if (map.component.indexOf('.') > -1) {
            const pathArray = map.component.split('.');
            let component: Object = componentDefs[pathArray[0]];
            if (component && Object.keys(component).length > 0) {
              for (let pi = 1; pi <= pathArray.length - 1; pi += 1) {
                if (component && Object.keys(component).length > 0) component = component[pathArray[pi]]
              }
              _formDef.fields[map.field] = component;
              //reactory.log(`${signature} (init) Component: ${_formDef.id}, ${map.component} successfully mapped`, { component });
              mapped = true;
            } else {
              _formDef.widgets[map.field] = componentDefs[map.component];
              if (_formDef.widgets[map.field]) {
                //reactory.log(`${signature} (init) Component: ${_formDef.id}, ${map.component} successfully mapped`, { component: _formDef.widgets[map.field] });
                mapped = true;
              }
            }
          }
        }

        if (map.componentFqn && map.field && mapped === false) {
          if (typeof map.componentFqn === 'string' && typeof map.field === 'string') {
            _formDef.widgets[map.field] = reactory.getComponent(map.componentFqn);
            if (_formDef.widgets[map.field]) {
              //reactory.log(`${signature} (init) Component: ${_formDef.id}, ${map.componentFqn} successfully mapped`, { component: _formDef.widgets[map.field] });
              mapped = true;
            }
          }
        }

        if (mapped === false) {
          _formDef.widgets[map.field] = (props, context) => {
            //@ts-ignore
            return (<MuiReactoryPackage.widgets.WidgetNotAvailable {...props} map={map} />)

          }
          //reactory.log(`${signature} (init) Component could not be mapped for Form: ${_formDef.id}, ${map.field}`, { map });
        }
      });
    }


    const setWidgets = () => {

      if (ReactoryUxPackages[_formDef.uiFramework] && ReactoryUxPackages[_formDef.uiFramework].widgets) {
        _formDef.widgets = ReactoryUxPackages[_formDef.uiFramework].widgets;
      } else {
        _formDef.widgets = {};
      }

      if (!_formDef.widgets) _formDef.widgets = {};
      if (isArray(_formDef.widgetMap) === true) {
        _formDef.widgetMap.forEach((map) => {
          //reactory.log(`${signature} (init) Mapping ${map.widget} to ${map.componentFqn || map.component} ${_formDef.id}`, map);
          let mapped = false;

          if (map.component && typeof map.component === 'string') {
            if (map.component.indexOf('.') > -1) {
              const pathArray = map.component.split('.');
              let component: Object = componentDefs[pathArray[0]];
              if (component && Object.keys(component).length > 0) {
                for (let pi = 1; pi <= pathArray.length - 1; pi += 1) {
                  if (component && Object.keys(component).length > 0) component = component[pathArray[pi]]
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
            if (typeof map.componentFqn === 'string' && typeof map.widget === 'string') {
              _formDef.widgets[map.widget] = reactory.getComponent(map.componentFqn);
              if (_formDef.widgets[map.widget]) {
                // reactory.log(`${signature} (init) Component: ${_formDef.id}, ${map.componentFqn} successfully mapped`, { component: _formDef.widgets[map.widget] });
                mapped = true;
              }
            }
          }

          if (mapped === false) {
            _formDef.widgets[map.widget] = (props, context) => {

              return (<WidgetNotAvailable {...props} map={map} />)
              //setTimeout(() => { setVersion(version + 1) }, 777);
              //return (<>loading ...{map.widget}</>)

            }
            // reactory.log(`${signature} (init) Component could not be mapped for Form: ${_formDef.id}, ${map.widget}`, { map });
          }
        });
      }

    };

    const setFieldTemplate = () => {

      switch (_formDef.uiFramework) {
        case 'material': {
          _formDef.FieldTemplate = MuiReactoryPackage.templates.MaterialFieldTemplate;
          _formDef.ArrayFieldTemplate = MuiReactoryPackage.templates.MaterialArrayFieldTemplate;
          break;
        }
        default: {
          if (_formDef.FieldTemplate) delete _formDef.FieldTemplate;
          break
        }
      }
    };

    const setObjectTemplate = () => {
      switch (_formDef.uiFramework) {
        case 'material': {
          _formDef.ObjectFieldTemplate = MuiReactoryPackage.templates.MaterialObjectTemplate;
          break;
        }
        default: {
          if (_formDef.ObjectFieldTemplate) delete _formDef.ObjectFieldTemplate;
          break;
        }
      }
    };

    const injectResources = () => {
      if (document) {
        if (_formDef.uiResources && _formDef.uiResources.length) {
          _formDef.uiResources.forEach((resource) => {
            const resourceId = `${resource.type}_${resource.id}`;
            if (nil(document.getElementById(resourceId)) === true) {
              switch (resource.type) {
                case 'style': {
                  let styleLink = document.createElement('link');
                  styleLink.id = resourceId;
                  styleLink.href = resource.uri;
                  styleLink.rel = 'stylesheet';
                  document.head.append(styleLink)
                  break;
                }
                case 'script': {
                  let scriptLink = document.createElement('script');
                  scriptLink.id = resourceId;
                  scriptLink.src = resource.uri;
                  scriptLink.type = 'text/javascript';
                  document.body.append(scriptLink)
                  break;
                }
                default: {
                  reactory.warning(`ReactoryFormComponent.form() - injectResources() Resource Type ${resource.type}, not supported.`, { resource });
                  break;
                }
              }
            }
          })
        }
      }
    };
    // #endregion
    injectResources();
    setFields();
    setWidgets();
    setObjectTemplate();
    setFieldTemplate();
    setFormContext();
    return _formDef
  }

  const formValidation = ($formData: any, $errors: any, via = 'onChange') => {

    let formfqn = `${formDefinition.nameSpace}.${formDefinition.name}@${formDefinition.version}`;
    reactory.log(`Executing custom validations for ${formfqn}`, { $formData, $errors });
    let validationFunctionKey = `${formfqn}_validate`;
    let validationResult = [];
    let validationFunction = null;
    let selectedKey = validationFunctionKey;

    if (reactory.formValidationMaps && reactory.formValidationMaps[formfqn]) {
      validationFunction = reactory.formValidationMaps[formfqn];
    }

    if (typeof props.validate === 'function') {
      validationFunction = props.validate;
    }

    if (typeof validationFunction === 'function') {
      try {
        validationResult = validationFunction($formData, $errors, getFormReference(), via);
      } catch (ex) {
        reactory.log(`Error While Executing Custom Validation`, { ex });
      }
    }

    return $errors;
  };



  const getPdfWidget = () => {
    const { ReportViewer, FullScreenModal } = componentDefs;
    const formDef = formDefinition();
    let _activeReportDefinition = activeReportDefinition || formDef.defaultPdfReport;

    if (_activeReportDefinition === null || _activeReportDefinition === undefined) return null;

    const closeReport = () => {
      setShowReportModal(false);
      setActiveReportDefinition(null);
    }


    let data = { ...formData }
    if (_activeReportDefinition && _activeReportDefinition.dataMap) {
      data = reactory.utils.objectMapper(data, _activeReportDefinition.dataMap);
    }

    return (
      <FullScreenModal open={showReportModal === true} onClose={closeReport}>
        {activeReportDefinition ? (
          <ReportViewer
            {...{ ...activeReportDefinition, data }}
          />) : null}
      </FullScreenModal>
    )
  };

  const getExcelWidget = () => {
    const { ReportViewer, FullScreenModal } = componentDefs;
    const formDef: Reactory.Forms.IReactoryForm = formDefinition();
    if (formDef !== undefined) {
      const closeReport = (e: React.SyntheticEvent): void => { setShowExportModal(false); }
      return (
        <FullScreenModal open={showExportModal === true} onClose={closeReport}>
          <ReportViewer
            engine={'excel'}
            formDef={formDef}
            exportDefinition={activeExportDefinition || formDef.defaultExport}
            useClient={true}
            data={formData}
          />
        </FullScreenModal>
      )
    }
  };

  const getData = (defaultInputData?: any) => {
    if (formDefinition === undefined || formDefinition.id === "ReactoryLoadingForm") return null
    reactory.log(`<${fqn} /> getData(defaultInputData?: any)`, { defaultInputData, formData, formDef: formDefinition });
    const _graphql: Reactory.Forms.IFormGraphDefinition = getActiveGraphDefinitions();
    let _formData = null;

    if (typeof formDefinition.schema === "object") {
      switch (formDefinition.schema.type) {
        case "object": {
          _formData = { ...formData };
          if (formData === undefined || formData === null && formDefinition.defaultFormValue) {
            _formData = { ...formDefinition.defaultFormValue as Object };
          }
          if (defaultInputData && typeof defaultInputData === 'object') _formData = { ..._formData, ...defaultInputData }
          break;
        }
        case "array": {
          _formData = [];
          if (formData && Array.isArray(formData) === true) {
            _formData = [...formData];
          }

          if (defaultInputData && Array.isArray(defaultInputData) === true) _formData = [..._formData, ...defaultInputData]
          break;
        }
        default: {
          _formData = formData;
          break;
        }
      }
    }


    if (_graphql) {

      const has = {
        query: isNil(_graphql.query) === false && isString(_graphql.query.text) === true,
      };

      if (has.query === true) {

        const query = _graphql.query;
        const formContext = getFormContext();
        const __staticFormData = query.formData;

        if (typeof formDefinition.schema === "object") {
          switch (formDefinition.schema.type) {
            case "object": {
              _formData = { ...__staticFormData as Object, ..._formData };
              break;
            }
            case "array": {
              _formData = [];
              if (isArray(__staticFormData) === true) _formData = [...__staticFormData as Array<any>, ..._formData];
              if (isArray(formData) === true) _formData = [...formData];
              break;
            }
            default: {
              break;
            }
          }
        }

        // TODO: Werner Weber - Add the ability here for variables to be mapped to an async function
        // that will allow the developer to create a custom client side mapping object and resolve async
        // data as part of the input params.


        const _input_mapping_params: any = {
          formContext,
          formData: _formData,
          $route: props.$route,
          props: query.props ? { ...query.props } : {},
        };

        const _variables: any = reactory.utils.omitDeep(objectMapper(_input_mapping_params, query.variables || {}));
        reactory.log(`Variables for query`, { variables: _variables });

        let $options = query.options ? { ...query.options as Object } : { fetchPolicy: 'network-only' }

        //error handler function
        const handleErrors = (errors) => {

          if (_graphql.query.onError) {
            const componentToCall = reactory.getComponent(_graphql.query.onError.componentRef);
            if (componentToCall && typeof componentToCall === 'function') {
              const componentInstance = componentToCall(props)
              if (typeof componentInstance[_graphql.query.onError.method] === 'function') {
                try {
                  componentInstance[_graphql.query.onError.method](errors);
                } catch (err) {
                  reactory.log(err.message, err);
                }
              }
            }
          }
        };

        //execute query
        //TODO: Updated / fix types so that errors is available on result
        //if (query.autoQuery === false && autoQueryDisabled === false) {
        //  setState({ queryComplete: true, dirty: false, allowRefresh: true, loading: false });
        //} else {

        const executeFormQuery = () => {

          if (props.onBeforeQuery) {
            if (props.onBeforeQuery(_formData, formContext) === false) return;
          }

          reactory.log(`${signature}  executeFormQuery()`)
          const query_start = new Date().valueOf();

          if ($options && $options.fetchPolicy && $options.fetchPolicy.indexOf('${') >= 0) {
            try {
              $options.fetchPolicy = reactory.utils.template($options.fetchPolicy)({ formContext: getFormContext(), query, props });
            } catch (fpterror) {
              $options.fetchPolicy = 'network-only';
            }
          }

          reactory.graphqlQuery(gql(query.text), _variables, $options).then((result: any) => {
            const query_end = new Date().valueOf();

            reactory.stat(`${formDefinition.nameSpace}.${formDefinition.name}@${formDefinition.version}:query_execution_length`, { query_start, query_end, diff: query_end - query_start, unit: 'utc-date' });
            const { data, errors } = result;

            if (data && data[query.name]) {
              _formData = DATAMANAGER.fromGraphResult(data, _formData, query);
            }


            try {
              //setState({ formData: _formData, queryComplete: true, dirty: false, allowRefresh: true, queryError: errors, loading, last_query_exec: new Date().valueOf() }, () => {

              if (props.onQueryComplete) {
                props.onQueryComplete({ formData: _formData, formContext: getFormContext(_formData), result, errors });
              }

              //$events.emit('onQueryComplete', { formData: _formData });

              if (errors) {
                reactory.log(`ReactoryComponent => ${formDefinition.nameSpace}${formDefinition.name}@${formDefinition.version} instanceId=${instanceId} => Error executing graphql query`, errors)
                handleErrors(errors);
              }


              setFormData(_formData);
              setQueryComplete(true);
              setIsDirty(false);
              setAllowRefresh(true);
              setError({ errorType: "graphql", error: errors });
              setIsBusy(false);

              //});
            } catch (unhandledErr) {
              reactory.log(`ReactoryComponent -> Error on setting state`, unhandledErr);
            }
          }).catch((queryError) => {

            reactory.log(`Error Executing Form Query`, { queryError });
            const query_end = new Date().valueOf();

            setFormData(_formData);
            setQueryComplete(true);
            setIsDirty(false);
            setAllowRefresh(false);
            setError({
              error: queryError,
              errorType: 'runtime',
            });
            setIsBusy(false);

            if (props.onError) {
              props.onError(queryError, getFormContext(), 'query')
            }

            reactory.stat(`${formDefinition.nameSpace}.${formDefinition.name}@${formDefinition.version}:query_error`, { query_start, query_end, diff: query_end - query_start, unit: 'utc-date', failed: true, error: queryError.message });
          });
        }

        if (_graphql.query.interval) {
          if (refreshInterval === null || refreshInterval === undefined) {
            setRefreshInterval(setInterval(executeFormQuery, _graphql.query.interval));
          }

        }

        if (query.refreshEvents) {
          query.refreshEvents.forEach((eventDefinition) => {
            if (eventDefinition.on === true) {
              // only use on when the use case is explicit for it's use. Otherwise it is recommended
              // to use once 
              reactory.on(eventDefinition.name, (evt) => {
                reactory.log(`🔔 Refresh of query triggred via refresh event`, { eventDefinition, evt, signature });
                setTimeout(getData, query.autoQueryDelay || 500)
              });
            } else {
              reactory.once(eventDefinition.name, (evt) => {
                reactory.log(`🔔 Refresh of query triggred via ONCE refresh event`, { eventDefinition, evt, signature });
                setTimeout(() => {
                  getData();

                }, query.autoQueryDelay || 0)
              });
            }

          });
        }

        setTimeout(executeFormQuery, query.autoQueryDelay || 0);
      } else {

        setFormData(_formData);
        setQueryComplete(true);
      }


    } else {

      setFormData(_formData);
      setQueryComplete(true);
    }

  };


  const getDeveloperOptions = () => {
    // if (reactory.hasRole(["DEVELOPER"]) === true) {
    //   if (formDef && formDef.name) {
    //     if (formDef.name.indexOf("$GLOBAL$") >= 0) return null;
    //   }

    //   return (
    //     <>
    //       <IconButton size="small" onClick={() => { setShowEditor(true) }} style={{ float: 'right', position: 'relative', marginTop: '-8px' }}>
    //         <Icon style={{ fontSize: '0.9rem' }}>build</Icon>
    //       </IconButton>
    //     </>)
    // }

    return null;
  }




  reactory.log(`Rendering ${signature}`, { props: props, formData });
  if (formDefinition === undefined) return null
  const filter_props = () => {
    return props;
  };

  // if (!formData && !props.formData) {
  //   debugger;
  // }

  const _formUiOptions: Reactory.Schema.IFormUIOptions = getActiveUiOptions();
  const _definition = formDefinitionFunction();
  const DropDownMenu = componentDefs["DropDownMenu"];
  const formProps: any = {
    id: instanceId,
    key: instanceId,
    ..._definition,
    validate: formValidation,
    onChange: onChange,
    onError: props.onError ? props.onError : (error) => { },
    formData: formData || props.formData,
    ErrorList: (error_props) => (<ErrorList {...error_props} />),
    onSubmit: props.onSubmit || onSubmit,
    ref: (form: any) => {
      if (formRef.current === null || formRef.current === undefined) {
        //@ts-ignore
        formRef.current = form;
      }

      if (props.refCallback) props.refCallback(getFormReference())
      if (props.ref && typeof props.ref === 'function') props.ref(getFormReference())
    },
    transformErrors: (errors = []) => {
      reactory.log(`Transforming error message`, { errors });
      let formfqn = `${formDefinition.nameSpace}.${formDefinition.name}@${formDefinition.version}`;
      let _errors = [...errors];
      if (props.transformErrors && typeof props.transformErrors === 'function') {
        _errors = props.transformErrors(errors, this) as unknown[];
      }

      if (reactory.formTranslationMaps && reactory.formTranslationMaps[formfqn]) {
        _errors = reactory.formTranslationMaps[formfqn](errors, this);
      }

      return _errors;
    }
  };

  reactory.log(`Form Props: ${signature}`, { formProps })

  let icon = 'save';

  // BACKWARDS COMPATIBLE SCHEMA OBJECTS
  if (typeof formDefinition.uiSchema === "object") {
    if (formDefinition.uiSchema && formDefinition.uiSchema.submitIcon) {
      if (typeof formDefinition.uiSchema.submitIcon === 'string') {
        icon = formDefinition.uiSchema.submitIcon
      }
    }

    if (formDefinition.uiSchema && formDefinition.uiSchema['ui:options'] !== null
      && typeof formDefinition.uiSchema['ui:options'] === 'object') {
      if ((formDefinition.uiSchema['ui:options'] as any).submitIcon) {
        icon = (formDefinition.uiSchema['ui:options'] as any).submitIcon
      }
    }
  }

  if (_formUiOptions.submitIcon) icon = _formUiOptions.submitIcon;
  let iconProps = _formUiOptions?.submitIconProps || {};
  let iconWidget = (icon === '$none' ? null : <Icon {...iconProps}>{icon}</Icon>);
  let showSubmit = true;
  let showRefresh = true;
  let showHelp = true;
  let submitButton = null;
  let uiSchemaSelector = null;
  let activeUiSchemaModel = null;
  let submitTooltip = 'Click to submit the form';

  const { submitProps, buttons } = _formUiOptions;
  if (typeof submitProps === 'object' && showSubmit === true) {
    const { variant = 'fab', iconAlign = 'left', tooltip = submitTooltip } = submitProps;
    const _props = { ...submitProps };
    delete _props.iconAlign;
    _props.onClick = $submitForm;

    submitTooltip = reactory.utils.template(tooltip as string)({
      props: props,
      state: { formData }
    });


    if (variant && typeof variant === 'string' && showSubmit === true) {
      switch (variant) {
        case 'fab':
          {
            delete _props.variant;
            //@ts-ignore
            submitButton = (<Fab {..._props}>{iconWidget}</Fab>);
            break;
          }
        default: {
          //@ts-ignore
          submitButton = (<Button {..._props}>{iconAlign === 'left' && iconWidget}{template(_props.text)({ props: props, formData, formDef: formDefinition, reactory })}{iconAlign === 'right' && iconWidget}</Button>);
          break;
        }
      }
    }
  }

  /**
   * options for submit buttons
   * variant = 'fab' / 'button'
   *
   */
  if (showSubmit === true && submitButton === null) {
    submitButton = (
      <Fab onClick={$submitForm} color="primary">
        {iconWidget}
      </Fab>
    );
  }

  /**
   * If the form supports multiple schemas,
   * we need to determine which is the preffered, currently
   * active one.
   */
  if (formDefinition.uiSchemas && formDefinition.uiSchemas.length > 0) {

    // Even handler for the schema selector menu
    const onSchemaSelect = (evt: Event, menuItem: Reactory.Forms.IUISchemaMenuItem) => {
      reactory.log(`UI Schema Selector onSchemaSelect "${menuItem.title}" selected`, { evt, menuItem });
      let doQuery = false;
      if (menuItem.graphql) {
        doQuery = true
      }
      if (menuItem && menuItem.uiSchema) {
        if (menuItem.uiSchema['ui:graphql']) {
          doQuery = true;
        }
      } else {
        //the uiSchema is null? now what?
        reactory.log(`Null uiSchema?`, { menuItem });;
      }

      setActiveUiSchemaMenuItem(menuItem);
      if (doQuery === true) {
        setQueryComplete(false);
        setIsBusy(false);
        setIsDirty(false);
      }
    };


    // if there is an active with a key
    if (activeUiSchemaMenuItem !== null && activeUiSchemaMenuItem.key) {
      activeUiSchemaModel = activeUiSchemaMenuItem;
    }

    if (!activeUiSchemaModel) {
      activeUiSchemaModel = find(formDefinition.uiSchemas, { key: props.uiSchemaKey });
      if (!activeUiSchemaModel) activeUiSchemaModel = formDefinition.uiSchemas[0];
    }

    if (activeUiSchemaModel) {
      uiSchemaSelector = (
        <Fragment>
          {activeUiSchemaModel.title}
          <DropDownMenu menus={AllowedSchemas(formDefinition.uiSchemas, props.mode)} onSelect={onSchemaSelect} selected={activeUiSchemaModel} />
        </Fragment>);
    }


    if (_formUiOptions && _formUiOptions.schemaSelector) {
      if (_formUiOptions.schemaSelector.variant === "icon-button") {


        let schemaStyle: CSSProperties = {};
        if (_formUiOptions.schemaSelector.style) {
          schemaStyle = _formUiOptions.schemaSelector.style;
        }

        const GetSchemaSelectorMenus = () => {
          const allowed_schema = AllowedSchemas(formDefinition.uiSchemas, props.mode, null)
          reactory.log(`<${fqn} /> GetSchemaSelectorMenus`, { allowed_schema });

          // allowed_schema.forEach((uiSchemaItem: Reactory.IUISchemaMenuItem, index: number) => {
          const schemaButtons = allowed_schema.map((uiSchemaItem: Reactory.Forms.IUISchemaMenuItem, index: number) => {
            /**  We hook uip the event handler for each of the schema selection options. */
            const onSelectUiSchema = () => {
              // self.setState({ activeUiSchemaMenuItem: uiSchemaItem })
              reactory.log(`<${fqn} /> UI Schema Selector onSchemaSelect "${uiSchemaItem.title}" selected`, { uiSchemaItem });
              setActiveUiSchemaMenuItem(uiSchemaItem);
            };

            return <IconButton onClick={onSelectUiSchema} key={`schema_selector_${index}`} size="large"><Icon>{uiSchemaItem.icon}</Icon></IconButton>;
          });

          return schemaButtons;

        };

        uiSchemaSelector = (
          <div style={schemaStyle}>
            {
              _formUiOptions.schemaSelector &&
                _formUiOptions.schemaSelector.showTitle === false ? null : (<span>
                  {activeUiSchemaModel.title}
                </span>)
            }
            {GetSchemaSelectorMenus()}
          </div>
        )

      }

      if (_formUiOptions.schemaSelector.variant === "button") {
        const onSelectUiSchema = () => {
          const selectedSchema: Reactory.Forms.IUISchemaMenuItem = find(formDefinition.uiSchemas, { id: _formUiOptions.schemaSelector.selectSchemaId });

          reactory.log(`<${fqn} /> UI Schema Selector onSchemaSelect "${selectedSchema.title}" selected`, { selectedSchema });
          // TODO - this needs to be tested
          setActiveUiSchemaMenuItem(selectedSchema);
        };

        // let defaultStyle =
        let schemaStyle: CSSProperties = { position: "absolute", top: '10px', right: '10px', zIndex: 1000 };
        if (_formUiOptions.schemaSelector.style) {
          schemaStyle = {
            ...schemaStyle,
            ..._formUiOptions.schemaSelector.style
          }
        }

        let buttonStyle = {
          ..._formUiOptions.schemaSelector.buttonStyle
        };

        let p = {
          style: schemaStyle
        }

        let _before = [];
        let _after = []

        if (_formUiOptions.schemaSelector.components) {
          _formUiOptions.schemaSelector.components.forEach((componentRef: string | object) => {
            if (typeof componentRef === 'string') {
              if (componentRef.indexOf(".") > 0) {
                const ComponentInSchemaSelector = reactory.getComponent<any>(componentRef);
                if (ComponentInSchemaSelector) {
                  //@ts-ignore
                  _after.push(<ComponentInSchemaSelector formData={formData} formContext={formProps.formContext} uiSchema={formProps.uiSchema} schema={formProps.schema} />)
                }
              } else {
                switch (componentRef) {
                  case "submit": {
                    _after.push(submitButton)
                    break;
                  }
                  case "help": {

                    break;
                  }
                  case "refresh": {

                    break;
                  }
                  case "export": {

                    break;
                  }
                  case "import": {

                    break;
                  }
                }
              }
            }
          });
        }


        uiSchemaSelector = (
          //@ts-ignore
          <div {...p}>
            {_before}
            {
              _formUiOptions.schemaSelector.buttonVariant ?
                //@ts-ignore
                <Button
                  id="schemaButton"
                  onClick={onSelectUiSchema}
                  color={_formUiOptions.schemaSelector.activeColor ? _formUiOptions.schemaSelector.activeColor : "primary"}
                  variant={_formUiOptions.schemaSelector.buttonVariant}
                  style={buttonStyle}
                >{_formUiOptions.schemaSelector.buttonTitle}</Button> :
                <Button
                  id="schemaButton"
                  style={{ fontWeight: 'bold', fontSize: '1rem' }}
                  onClick={onSelectUiSchema}
                  //@ts-ignore
                  color={_formUiOptions.schemaSelector.activeColor ? _formUiOptions.schemaSelector.activeColor : "primary"}
                >{_formUiOptions.schemaSelector.buttonTitle}</Button>
            }
            {_after}
          </div>
        )

      }
    }

    formProps.formContext.$schemaSelector = uiSchemaSelector;
  }

  if (_formUiOptions && isNil(_formUiOptions.showSubmit) === false) {
    showSubmit = _formUiOptions.showSubmit === true;
  }

  if (_formUiOptions && isNil(_formUiOptions.showHelp) === false) {
    showHelp = _formUiOptions.showHelp === true;
  }

  if (_formUiOptions && isNil(_formUiOptions.showRefresh) === false) {
    showRefresh = _formUiOptions.showRefresh === true;
  }

  let _additionalButtons = [];
  if (buttons && buttons.length) {
    _additionalButtons = buttons.map((button: any, buttonIndex) => {
      const { buttonProps, iconProps, type, handler, component } = button;

      if (component && typeof component === "function") return component;

      const onButtonClicked = () => {
        reactory.log(`OnClickButtonFor Additional Buttons`);
        if (props[handler] && typeof props[handler] === 'function') {
          (props[handler] as Function)({ reactoryForm: this, button })
        } else {
          reactory.createNotification(`No handler '${handler}' for ${buttonProps.title} button`, { showInAppNotification: true, type: 'error' })
        }
      }

      let buttonIcon = null;
      if (iconProps) {
        buttonIcon = <Icon {...iconProps}>{iconProps.icon}</Icon>
      }

      return (
        <Button {...buttonProps} key={buttonIndex} onClick={onButtonClicked}>{iconProps.placement === 'left' && buttonIcon}{buttonProps.title}{iconProps.placement === 'right' && buttonIcon}</Button>
      )
    });
  }

  const refreshClick = (evt) => {
    setQueryComplete(false);
  }

  let reportButton = null;

  if (formDefinition.defaultPdfReport) {
    reportButton = (<Button variant="text" onClick={() => { setShowReportModal(!showReportModal) }} color="secondary"><Icon>print</Icon></Button>);
  }

  if (isArray(formDefinition.reports) === true && formDefinition.reports.length > 0) {

    const onDropDownSelect = (evt, menuItem: any) => {
      reactory.log('Report Item Selected', { evt, menuItem });
      // setShowReport(menuItem.data);
    };

    let exportMenus = formDefinition.reports.map((reportDef: any, index) => {
      return {
        title: reportDef.title,
        icon: reportDef.icon,
        key: index,
        id: `exportButton_${index}`,
        data: reportDef,
        disabled: reactory.utils.template(reportDef.disabled || "false")({ props: props, state: { formData } }) === 'true',
      }
    });
    reportButton = (<DropDownMenu menus={exportMenus} onSelect={onDropDownSelect} icon={"print"} />)
  }

  let exportButton = null;

  if (formDefinition.defaultExport) {
    const defaultExportClicked = () => {
      //showExcelModal(formDef.defaultExport)
    };

    exportButton = (
      <Button variant="text" onClick={defaultExportClicked} color="secondary">
        <Icon>cloud_download</Icon>
      </Button>);
  }

  if (isArray(formDefinition.exports) === true) {

    const onDropDownSelect = (evt, menuItem: any) => {
      reactory.log('Export Item Selected', { evt, menuItem });
      //showExcelModal(menuItem.data);
    };

    let exportMenus = formDefinition.exports.map((exportDef: Reactory.Forms.IExport, index) => {
      return {
        title: exportDef.title,
        icon: exportDef.icon,
        key: index,
        id: `exportButton_${index}`,
        data: exportDef,
        disabled: reactory.utils.template(exportDef.disabled || "false")({ props: props, state: { formData } }) === 'true',
      }
    });
    exportButton = (<DropDownMenu menus={exportMenus} onSelect={onDropDownSelect} icon={"import_export"} />)
  }

  let formtoolbar = (
    <Toolbar style={_formUiOptions.toolbarStyle || {}}>
      {_formUiOptions.showSchemaSelectorInToolbar && !_formUiOptions.showSchemaSelectorInToolbar === false ? uiSchemaSelector : null}
      {showSubmit === true && submitButton ? (<Tooltip title={submitTooltip}>{submitButton}</Tooltip>) : null}
      {_additionalButtons}
      {allowRefresh && showRefresh === true && <Button variant="text" onClick={refreshClick} color="secondary"><Icon>cached</Icon></Button>}
      {formDefinition.backButton && <Button variant="text" onClick={() => { history.back() }} color="primary">BACK <Icon>keyboard_arrow_left</Icon></Button>}
      {formDefinition.helpTopics && showHelp === true && <Button variant="text" onClick={() => { setShowHelpModal(true) }} color="primary"><Icon>help</Icon></Button>}
      {reportButton}
      {exportButton}
    </Toolbar>
  );

  let toolbarPosition = _formUiOptions.toolbarPosition || 'bottom'

  const _graphql = getActiveGraphDefinitions();
  const isBusy = () => {
    if (_graphql === null || _graphql === undefined) return false;

    return !(queryComplete === true);
  }

  let renderedComponent: React.ReactNode;

  try {
    // {getDeveloperOptions()}      
    // {isBusy() === true && <LinearProgress />}
    // { getPdfWidget() }
    // { getExcelWidget() }    
    //@ts-ignore            
    let $fp: ISchemaForm = { ...{ ...formProps, toolbarPosition: toolbarPosition } };
    if (formDefinition.__complete__ === true) {
      const formChildren: any[] = [];
      if (toolbarPosition.indexOf("top") >= 0) formChildren.push(formtoolbar);
      if (isBusy() === true) formChildren.push(<LinearProgress />);
      formChildren.push(<SchemaForm {...$fp} />);
      if (toolbarPosition.indexOf("bottom") >= 0) formChildren.push(formtoolbar);
      formChildren.push(getHelpScreen());

      let componentProps = {
        id: `reactory_container::${instanceId}`,
        name: `${formDefinition.name}`,
        key: `reactory_container::${instanceId}`,
        autoComplete: 'off',
        encType: 'multipart/form-data',
        noValidate: true,
        className: _formUiOptions?.className || '',
        style: _formUiOptions?.style || {},
      }

      switch (_formUiOptions?.componentType) {
        case 'div': {
          renderedComponent = <div {...componentProps}>{formChildren}</div>;
        }
        case 'article': {
          renderedComponent = <article {...componentProps}>{formChildren}</article>;
        }
        case 'section': {
          renderedComponent = <section {...componentProps}>{formChildren}</section>
        }
        case 'card': {
          renderedComponent = <Card {...componentProps}>{formChildren}</Card>
        }
        case 'grid': {
          renderedComponent = <Grid {...componentProps}>{formChildren}</Grid>
        }
        case 'paper': {
          renderedComponent = <Paper {...componentProps}>{formChildren}</Paper>
        }
        case 'paragraph': {
          renderedComponent = <p {...componentProps}>{formChildren}</p>
        }
        default: {
          renderedComponent = <form
            {...componentProps}>
            {formChildren}
          </form>
        }
      }
    } else {
      renderedComponent = <LinearProgress />
    }
  } catch (err) {
    renderedComponent = <>{err.message}</>;
  }

  return <IntersectionVisible>{renderedComponent}</IntersectionVisible>

};

