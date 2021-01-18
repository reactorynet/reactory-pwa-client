import React, { Component, Fragment, ReactNode, DOMElement, CSSProperties } from 'react';
import PropTypes, { ReactNodeArray } from 'prop-types';
import IntersectionVisible from 'react-intersection-visible';
import Form from './form/components/Form';
import EventEmitter, { ListenerFn } from 'eventemitter3';
import objectMapper from 'object-mapper';
import { diff } from 'deep-object-diff';
import { find, template, isArray, isNil, isString, isEmpty, throttle, filter } from 'lodash';
import { withRouter, Route, Switch } from 'react-router';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { compose } from 'redux';
import uuid from 'uuid';
import Dropzone, { DropzoneState } from 'react-dropzone';
import { MutationResult } from '@apollo/client'
import { Mutation } from '@apollo/client/react/components';
import { nil } from '@reactory/client-core/components/util';
import queryString from '@reactory/client-core/query-string';
import ReactoryApi from '../../api/ReactoryApi';
import { withApi } from '../../api/ApiProvider';

import {
  Button,
  ButtonGroup,
  Fab,
  Typography,
  IconButton,
  Icon,
  Input,
  Toolbar,
  LinearProgress,
  useMediaQuery,
  Theme
} from '@material-ui/core';

import Fields from './fields';
import * as WidgetPresets from './widgets';
import MaterialTemplates from './templates';
import gql from 'graphql-tag';
import { deepEquals } from './form/utils';
import Reactory from '../../types/reactory';
import { History } from 'history';
import { ReactoryHOC } from 'App';
import { Breakpoint } from '@material-ui/core/styles/createBreakpoints';

const {
  MaterialArrayField,
  MaterialBooleanField,
  MaterialStringField,
  MaterialTitleField,
  MaterialDescriptionField,
  MaterialGridField,
  BootstrapGridField,
  MaterialObjectField,
  MaterialSchemaField,
} = Fields;

const {
  MaterialObjectTemplate,
  MaterialFieldTemplate,
  MaterialArrayFieldTemplate,
  MaterialErrorListTemplate
} = MaterialTemplates;

const DefaultLoadingSchema = {
  "title": "Starting",
  "type": "string",
};

const DefaultUiSchema = {
  "ui:widget": "LabelWidget",
  "ui:options": {
    componentType: 'div',
    showSubmit: false,
    showRefresh: false
  },
};


const ReactoryDefaultForm: Reactory.IReactoryForm = {
  id: 'ReactoryFormNotFoundForm',
  schema: DefaultLoadingSchema,
  uiSchema: DefaultUiSchema,
  name: 'FormNotFound',
  uiFramework: 'material',
  uiSupport: ['material'],
  nameSpace: 'core',
  version: '1.0.0',
  title: "Form Not Found Form",
  registerAsComponent: false,
  defaultFormValue: "🧙",
};

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


export interface ReactoryFormProperties {
  uiSchemaKey: string;
  uiSchemaId?: string;
  data: any | any[];
  formData: any | any[];
  formDef?: any;
  location: any;
  api: ReactoryApi;
  reactory: ReactoryApi,
  formId: string,
  helpTopics?: string[],
  helpTitle?: string,
  uiFramework: string,
  mode: string,
  history: History,
  formContext?: any,
  extendSchema?: Function,
  busy: boolean,
  events?: Object,
  query?: Object,
  onChange?: Function,
  onSubmit?: Function,
  onError?: Function,
  onCommand?: Function,
  onMutateComplete?: Function,
  onQueryComplete?: Function,
  before?: Component | undefined,
  children?: ReactNodeArray,
  $route?: any,
  $App?: any,
  validate?: Function,
  transformErrors?: Function,
  autoQueryDisabled?: boolean,
  refCallback?: Function,
  queryOnFormDataChange?: boolean,
  onBeforeMutation?: Function,
  componentType?: string | "form" | "widget",
  theme?: Theme,
}

export interface ReactoryFormState {
  loading: boolean,
  allowRefresh?: boolean,
  forms_loaded: boolean,
  forms: Reactory.IReactoryForm[],
  uiFramework: string,
  uiSchemaKey: string,
  activeUiSchemaMenuItem?: Reactory.IUISchemaMenuItem,
  formDef?: Reactory.IReactoryForm,
  formData?: any,
  dirty: boolean,
  queryComplete: boolean,
  showHelp: boolean,
  showReportModal: boolean,
  showExportWindow: boolean,
  activeExportDefinition?: Reactory.IExport,
  activeReportDefinition?: Reactory.IReactoryPdfReport,
  query?: any,
  busy: boolean,
  liveUpdate: boolean,
  pendingResources: any,
  _instance_id: string,
  plugins?: any,
  queryError?: any,
  message?: string,
  formError?: any,
  autoQueryDisabled?: boolean,
  boundaryError?: Error,
  notificationComplete: boolean,
  mutate_complete_handler_called: boolean,
  last_query_exec?: number,
  form_created: number
}

const AllowedSchemas = (uiSchemaItems: Reactory.IUISchemaMenuItem[], mode = 'view', size = 'md'): Reactory.IUISchemaMenuItem[] => {
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

const initialState = (props) => ({
  loading: true,
  forms_loaded: false,
  formDef: props.formDef || null,
  forms: [],
  uiFramework: props.uiFramework,
  uiSchemaKey: props.uiSchemaKey || 'default',
  activeUiSchemaMenuItem: null,
  activeExportDefinition: undefined,
  formData: props.formData || props.data,
  dirty: false,
  queryComplete: false,
  showHelp: false,
  showExportWindow: false,
  showReportModal: false,
  query: { ...props.query, ...queryString.parse(props.location.search) },
  busy: props.busy === true,
  liveUpdate: false,
  pendingResources: {},
  _instance_id: uuid(),
  autoQueryDisabled: props.autoQueryDisabled || false,
  notificationComplete: true,
  mutate_complete_handler_called: false,
  last_query_exec: null,
  form_created: new Date().valueOf()
});

const default_dependencies = () => {
  return [
    'core.Loading',
    'core.Logo',
    'core.FullScreenModal',
    'core.DropDownMenu',
    'core.HelpMe',
    'core.ReportViewer'
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

const ReactoryComponentHOC = (props: ReactoryFormProperties) => {

  const { reactory, mode, theme } = props;
  const instance_id = uuid();

  let formDef = reactory.form(props.formId);
  if (!formDef) formDef = props.formDef || ReactoryDefaultForm;
  const fqn = `${formDef.nameSpace}.${formDef.name}@${formDef.version}`;
  const signature = `<${fqn} instance={${instance_id} />`;
  

  const getScreenSize = () => {
    let _response: ScreenSizeKey = "md";    

    return _response;
  };

  //get initial data
  const initialData = () => {
    switch (formDef.schema.type) {
      case "string": {
        return `${props.data || props.formData || formDef.defaultFormValue}`
      }
      case "number": {
        if (typeof props.data === 'number') return props.data;
        if (typeof props.formData === 'number') return props.formData;
        if (typeof formDef.defaultFormValue === 'number') return formDef.defaultFormValue;

        if (formDef.schema.default) return formDef.schema.default;

        return null
      }
      case "object": {
        let _obj = {};
        if (typeof formDef.schema.default === 'object') _obj = { ...formDef.schema.default };
        if (typeof formDef.defaultFormValue === 'object') _obj = { ..._obj, ...formDef.defaultFormValue };
        if (typeof props.data === 'object') _obj = { ..._obj, ...props.data };
        if (typeof props.formData === 'object') _obj = { ..._obj, ...props.formData };

        return _obj
      }
      case "array": {
        if (reactory.utils.lodash.isArray(props.data) === true) return props.data;
        if (reactory.utils.lodash.isArray(props.formData) === true) return props.formData;
        if (reactory.utils.lodash.isArray(formDef.defaultFormValue) === true) return formDef.defaultFormValue;

        if (reactory.utils.lodash.isArray(formDef.schema.default) === true) return formDef.schema.default;

        return [];
      }
      default: {
        return props.data || props.formData || formDef.schema.default;
      }
    }
  };

  const [componentDefs, setComponents] = React.useState<ReactoryComponentMap>(reactory.getComponents(default_dependencies()));
  const [formData, setFormData] = React.useState<any>(initialData());
  const [formData_history, setHistory] = React.useState<any[]>([props.data || props.formData]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [activeUiSchemaMenuItem, setActiveUiSchemaMenuItem] = React.useState<Reactory.IUISchemaMenuItem>(null);
  const [queryComplete, setQueryComplete] = React.useState<boolean>(false);
  const [allowRefresh, setAllowRefresh] = React.useState<boolean>(false);
  const [showReportModal, setShowReportModal] = React.useState<boolean>(false);
  const [showExportModal, setShowExportModal] = React.useState<boolean>(false)
  const [showHelpModal, setShowHelpModal] = React.useState<boolean>(false)
  const [activeExportDefinition, setActiveExportDefinition] = React.useState<Reactory.IExport>(null);
  const [activeReportDefinition, setActiveReportDefinition] = React.useState<Reactory.IReactoryPdfReport>(null);
  const [busy, setIsBusy] = React.useState<boolean>(false);
  const [pendingResources, setPendingResources] = React.useState<any>(null);
  const [plugins, setPlugins] = React.useState(null);
  const [liveUpdate, setLiveUpdate] = React.useState<boolean>(false);
  const [error, setError] = React.useState<ReactoryComponentError>(null);
  const [uiFramework, setUiFramework] = React.useState(props.uiFramework || 'material');
  const [autoQueryDisabled, setAutoQueryDisabled] = React.useState<boolean>(props.autoQueryDisabled || false);
  const [dirty, setIsDirty] = React.useState<false>(false);
  const [refreshInterval, setRefreshInterval] = React.useState(null);
  //used for internal tracking of updates / changes since first load
  const [version, setVersion] = React.useState<number>(0);
  const [last_query_exec, setLastQueryExecution] = React.useState(null);
  const [formRef, setFormRef] = React.useState<Form>(React.createRef());
  //const $events = new EventEmitter();

  const getActiveUiSchema = () => {

    if (activeUiSchemaMenuItem !== null) {
      return activeUiSchemaMenuItem.uiSchema;
    }

    if (formDef.uiSchemas === null || formDef.uiSchemas === undefined) return formDef.uiSchema || {};
    if (Array.isArray(formDef.uiSchemas) === true && formDef.uiSchemas.length === 0) return formDef.uiSchema || {};

    let allowed_schemas = AllowedSchemas(formDef.uiSchemas, mode, getScreenSize());

    let matched_schema = allowed_schemas.find((menu_item, index) => {
      return menu_item.key === props.uiSchemaKey || menu_item.id === props.uiSchemaId;
    });

    if (matched_schema) return matched_schema;

    return formDef.uiSchema;
  }

  const getActiveUiOptions = () => {    
    const _baseOptions = formDef.uiSchema && formDef.uiSchema['ui:options'] ? formDef.uiSchema['ui:options'] : { showSchemaSelectorInToolbar: true };
    let _uiSchema = getActiveUiSchema();
    let _options = { ..._baseOptions, ..._uiSchema["ui:options"] };

    return _options;
  }


  /*
     forms_loaded: boolean,
    forms: Reactory.IReactoryForm[],
    uiFramework: string,
    uiSchemaKey: string,
    activeUiSchemaMenuItem?: Reactory.IUISchemaMenuItem,
    formDef?: Reactory.IReactoryForm,
    formData?: any,
    dirty: boolean,
    queryComplete: boolean,
    showHelp: boolean,
    showReportModal: boolean,
    showExportWindow: boolean,
    activeExportDefinition?: Reactory.IExport,
    activeReportDefinition?: Reactory.IReactoryPdfReport,
    query?: any,
    busy: boolean,
    liveUpdate: boolean,
    pendingResources: any,
    _instance_id: string,
    plugins?: any,
    queryError?: any,
    message?: string,
    formError?: any,
    autoQueryDisabled?: boolean,
    boundaryError?: Error,
    notificationComplete: boolean,
    mutate_complete_handler_called: boolean,
    last_query_exec?: number,
    form_created: number
    */

  const onPluginLoaded = (plugin: any) => {
    reactory.log(`${signature} Plugin loaded, activating component`, { plugin }, 'debug');
    try {
      plugins[plugin.componentFqn] = plugin.component(props, getFormContext());
      setPlugins({ plugins: plugins });
    } catch (pluginFailure) {
      reactory.log(`${signature} An error occured loading plugin ${plugin.componentFqn}`, { plugin, pluginFailure });
    }
  }

  const getHelpScreen = () => {
    const { HelpMe } = componentDefs;
    let topics = [];
    if (formDef.helpTopics) topics = [...formDef.helpTopics]
    if (props.helpTopics) topics = [...props.helpTopics, ...topics];
    const closeHelp = e => setShowHelpModal(false);
    return (
      <HelpMe topics={topics} tags={formDef.tags} title={props.helpTitle || formDef.title} open={showHelpModal === true} onClose={closeHelp}>
      </HelpMe>
    )
  };
  
  const onSubmit = (form: any) => {
    reactory.log(`${signature} ↩ onSubmit`, { form }, 'debug');
    let cancel: boolean = false;
    if (props.onSubmit) {
      cancel = props.onSubmit(form) || false;
    }

    if (cancel === true) return;

    if (formDef.graphql) {

      if (formDef.graphql.mutation) {

        let mutation: Reactory.IReactoryFormMutation = formDef.graphql.mutation[mode];

        if (activeUiSchemaMenuItem && activeUiSchemaMenuItem.graphql) {
          if (activeUiSchemaMenuItem.graphql.mutation && activeUiSchemaMenuItem.graphql.mutation[mode]) {
            reactory.log(`<${fqn} instance={${instance_id} />`)
            mutation = activeUiSchemaMenuItem.graphql.mutation[mode];
          }
        }

        if (mutation === null && mutation !== undefined) {
          reactory.createNotification(`Could not save / process form data, form has no mutation definition for mode ${mode}`, { type: 'warning', canDismiss: true })
          return;
        }

        const _variables = objectMapper({ ...form, formContext: getFormContext(), $route: props.$route, reactory, api: props.api }, mutation.variables);

        let do_mutation = true;
        let mutation_props: any = {
          variables: reactory.utils.omitDeep({ ..._variables }),
          refetchQueries: mutation.options && mutation.options.refetchQueries ? mutation.options.refetchQueries : [],
        };

        if (props.onBeforeMutation) {
          do_mutation = props.onBeforeMutation(mutation_props, form);
        }

        if (do_mutation) {
          reactory.graphqlMutation(mutation.text, mutation_props.variables, mutation_props.refetchQueries).then((mutation_result: MutationResult) => {
            const { data, error } = mutation_result;

            if (error) {
              // ADDED: DREW
              // Show message returned from resolver
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

            if (data && data[mutation.name]) {

              let _formData = null;
              let _result = reactory.utils.omitDeep(data[mutation.name]);

              if (mutation.resultMap && Object.getOwnPropertyNames(mutation.resultMap).length > 0) {
                _result = reactory.utils.objectMapper(_result, mutation.resultMap);
              }

              let _strategy = 'merge';
              switch (_strategy) {
                case "overwrite": {
                  _formData = _result;
                  break;
                }
                case 'merge':
                default: {
                  _formData = reactory.utils.lodash.merge({}, formData, _result);
                  break;
                }
              }

              //validate data against schema 
              if (formDef.sanitizeSchema) {
                reactory.utils.inspector.sanitize(formDef.sanitizeSchema, _formData);
              };

              if (reactory.utils.deepEquals(_formData, formData) === false) {
                setFormData(_formData);
              }

              const templateProps = {
                formData,
                formContext: getFormContext(),
                props: props,
                mutation_result: data[mutation.name],
              };

              if (typeof mutation.onSuccessUrl === 'string') {
                let linkText = template(mutation.onSuccessUrl)(templateProps);
                props.history.push(linkText);
              }

              if (mutation.onSuccessMethod === "notification") {
                const dataObject = { formData, resultData: data[mutation.name], formContext: getFormContext() };

                reactory.createNotification(
                  template(mutation.notification.title)(templateProps),
                  {
                    showInAppNotification: mutation.notification.inAppNotification === true,
                    type: 'success',
                    props: {
                      ...dataObject,
                      ...mutation.notification.props
                    }
                  }
                );
              }

              // REMOVED BLOCK TEMPORARLY
              /*
              if (that.props.onMutateComplete && that.state.mutate_complete_handler_called) {
                 that.setState({ mutate_complete_handler_called: true }, () => {
                   that.props.onMutateComplete(_formData, that.getFormContext(), mutationResult);
                 })
               }
               */
              if (props.onMutateComplete) props.onMutateComplete(data[mutation.name], getFormContext(), mutation_result);

              if (typeof mutation.onSuccessMethod === "string" && mutation.onSuccessMethod.indexOf('event:') >= 0) {
                let eventName = mutation.onSuccessMethod.split(':')[1];

                reactory.amq.raiseFormCommand(eventName, {
                  form: {},
                  result: data[mutation.name]
                });

                if (typeof props[eventName] === "function") {
                  props[eventName]({ formData: data[mutation.name] })
                }
              }

              // TODO - check if this is acceptable
              if (mutation.onSuccessMethod === "refresh") {
                getData();
              }
            }

          }).catch((mutation_error) => {

            if (mutation.onError) {
              //handle the error with the error handler
            }

            reactory.log(`Error Executing Mutation ${mutation_error.message}`, { mutation_error }, 'error');
            setError({ error: mutation_error, errorType: "runtime" });

          });
        }

      } else {
        //no mutation
        //check if need to refresh on submit
        setFormData(form.formData);
        setQueryComplete(false);
      }
    }

  }


  const onChange = (form: any, errorSchema: any) => {


    reactory.log(`ReactoryComponent => ${formDef.nameSpace}.${formDef.name}@${formDef.version} instanceId=${instance_id} => onChange`, { form, errorSchema }, 'debug');

    if (deepEquals(formData, form.formData) === false) {

      reactory.log(`${formDef.name}[${instance_id}].onChange`, { data: form.formData }, 'debug');

      const $onChange = props.onChange;

      const trigger_onChange = $onChange && typeof $onChange === 'function';

      const changed = diff(form.formData, formData);
      const rchanged = diff(formData, form.formData);

      let cancelEvent = false;

      const fire = () => {

        if (formDef.eventBubbles) {
          formDef.eventBubbles.forEach((eventAction) => {
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


      reactory.log(`ReactoryComponent => ${formDef.nameSpace}.${formDef.name}@${formDef.version} instanceId=${instance_id} => onChange`, { changed, rchanged }, 'debug');

      if (formDef.graphql && formDef.graphql.mutation && formDef.graphql.mutation['onChange']) {
        debugger;
        let onChangeMutation: Reactory.IReactoryFormMutation = formDef.graphql.mutation['onChange'];
        let throttleDelay: number = formDef.graphql.mutation['onChange'].throttle || 500;
        let variables = reactory.utils.objectMapper({ eventData: form, form: { formData, formContext: getFormContext() } }, onChangeMutation.variables);

        let throttled_call = throttle(() => {
          reactory.graphqlMutation(onChangeMutation.text, variables, onChangeMutation.options).then((mutationResult) => {
            reactory.log(`ReactoryComponent => ${formDef.nameSpace}${formDef.name}@${formDef.version} instanceId=${instance_id} onChangeMutation result`, { mutationResult }, 'debug');

            if (props.onMutateComplete) props.onMutateComplete(form.formData, getFormContext(), mutationResult);
          }).catch((mutationError) => {

            if (props.onMutateComplete) props.onMutateComplete(form.formData, getFormContext(), null, mutationError);
            reactory.log(`ReactoryComponent => ${formDef.nameSpace}${formDef.name}@${formDef.version} instanceId=${instance_id} onChangeMutation error`, { mutationError }, 'error');
            setLastQueryExecution(new Date().valueOf());
          });
        }, throttleDelay);

        if (last_query_exec) {
          if (new Date().valueOf() - last_query_exec > 1500) throttled_call()
        } else {
          if (!formDef.graphql.query) throttled_call();
        }
      }

      if (formDef && formDef.refresh && formDef.refresh.onChange) {
        if (trigger_onChange === true) fire();
      } else {
        setFormData(form.formData);
      }
    }
  }

  const setState = ($state: any, callback = () => { }) => {

    if ($state.formData) setFormData($state.formData);
    if ($state.queryComplete) setQueryComplete($state.queryComplete);

    callback();
    getData();
  };

  const getState = () => {
    return {
      formData,
      queryComplete,
      dirty,
      _instance_id: instance_id
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
      formDef: { ...formDef },
      formData: nextData || formData,
      $formData: nextData || formData,
      $formState: {
        formData: nextData || formData,
        showReportModal,
        formDef
      },
      query: { ...props.query },
      formInstanceId: instance_id,
      $ref: {
        setState,
        forceUpdate: () => { setVersion(version + 1) },
        props,
        submit: formRef ? formRef.onSubmit : () => {},
        state: getState()
      },
      refresh: (args = { autoQueryDisabled: true }) => {
        setQueryComplete(false);
        setAutoQueryDisabled(args.autoQueryDisabled);
        getData();

      },
      setFormData: (formData: any, callback = () => { }) => {
        setFormData(formData);
        callback();
      },
      getData,
      screenBreakPoint: getScreenSize(),
      ...inputContext,
    }

    reactory.log(`<${formDef.nameSpace}.${formDef.name}@${formDef.version} /> -> getFormContext()`, { _context }, 'debug');
    return _context;
  }

  /**
   * Returns the entire form definition
   */
  const formDefinition = (): Reactory.IReactoryForm => {

    const { extendSchema, uiSchemaKey, uiSchemaId } = props;
    let _formDef: Reactory.IReactoryForm = reactory.utils.lodash.cloneDeep(formDef);

    //we check schema id on the query object only if the uiSchemaId
    //const { uiSchemaId } = this.state.query;
    const Logo = componentDefs["Logo"];

    if (extendSchema && typeof extendSchema === 'function') _formDef = extendSchema(_formDef);

    if (_formDef.uiFramework !== 'schema') {
      //we are not using the schema define ui framework we are assigning a different one
      _formDef.uiFramework = uiFramework
    }

    // set noHtml5Validation if not set by schema
    if (nil(_formDef.noHtml5Validate)) _formDef.noHtml5Validate = true;

    if (uiSchemaId) {
      if (uiSchemaId !== 'default' && find(_formDef.uiSchemas, { key: uiSchemaKey })) {
        _formDef.uiSchema = find(_formDef.uiSchemas, { id: uiSchemaId }).uiSchema;
      }
    }

    if (uiSchemaKey) {
      if (uiSchemaKey !== 'default' && find(_formDef.uiSchemas, { key: uiSchemaKey })) {
        _formDef.uiSchema = find(_formDef.uiSchemas, { key: uiSchemaKey }).uiSchema;
      }
    }

    //state selected option must override the property set item
    //as the user can change the current active item either programmatically
    //or via UX element.
    if (activeUiSchemaMenuItem && activeUiSchemaMenuItem.uiSchema) {
      reactory.log(`ReactoryComponent => ${_formDef.nameSpace}${_formDef.name}@${_formDef.version} instanceId=${instance_id} => Setting activeUiSchemaMenuItem ${activeUiSchemaMenuItem.title}`, { activeUiSchemaMenuItem }, 'debug');
      _formDef.uiSchema = activeUiSchemaMenuItem.uiSchema;
    }

    if (_formDef.uiSchema && _formDef.uiSchema['ui:graphql']) {
      reactory.log(`ReactoryComponent => ${_formDef.nameSpace}${_formDef.name}@${_formDef.version} instanceId=${instance_id} => Updating graphql definition ${uiSchemaKey}`)
      _formDef.graphql = { ..._formDef.uiSchema['ui:graphql'] };
    }

    // #region setup functions
    const setFormContext = () => {
      if (!_formDef.formContext) _formDef.formContext = {};
      //we combine the form context from the getter function, with the formContext property / object on the _formDef
      _formDef.formContext = { ...getFormContext(), ..._formDef.formContext };
    };

    const setFields = () => {

      switch (_formDef.uiFramework) {
        case 'material': {
          _formDef.fields = {
            ArrayField: MaterialArrayFieldTemplate,
            BooleanField: MaterialBooleanField,
            DescriptionField: MaterialDescriptionField,
            //TODO: WW move this to seperate file
            NumberField: (props: any, context: any) => {
              const nilf = () => ({});
              const { uiSchema, registry, onChange } = props;
              const uiOptions = uiSchema['ui:options'] || { readOnly: false, format: 'int', precision: 8 };

              if (uiSchema["ui:widget"]) {
                const Widget = registry.widgets[uiSchema["ui:widget"]];
                if (Widget) return <Widget {...props} />
              } else {

                let args = {};
                const onInputChanged = (evt) => {
                  evt.persist();

                  let value: number = 0;

                  switch (uiOptions.format) {
                    case 'float': {
                      value = parseFloat(evt.target.value);
                      break;
                    }
                    case 'int':
                    default: {
                      value = parseInt(evt.target.value);
                    }
                  }

                  onChange(value);
                };

                return (<Input
                  id={props.idSchema.$id}
                  type="number"
                  margin="none"
                  onChange={onInputChanged}
                  value={props.formData || 0}
                />)
              }


            },
            ObjectField: MaterialObjectField,
            SchemaField: MaterialSchemaField,
            StringField: MaterialStringField,
            TitleField: MaterialTitleField,
            UnsupportedField: (props, context) => <Typography>Field {props.schema.title} type not supported</Typography>,
            GridLayout: MaterialGridField,
            //TODO: WW Add following layout fields
            //Tabbed Layout
            //Panel Layout (collapsable stack)
            // ?? customer component layout/
          };
          break;
        }
        default: {
          _formDef.fields = {
            GridLayout: BootstrapGridField
          };
          break;
        }
      }
    };

    const setWidgets = () => {
      switch (_formDef.uiFramework) {
        case 'material': {
          _formDef.widgets = {
            ...WidgetPresets,
            DateWidget: WidgetPresets.DateSelectorWidget,
            EmailWidget: (props, context) => (<Input {...props} type="email" />),
            RangeWidget: WidgetPresets.SliderWidget,
            LogoWidget: (props) => {
              const { formData } = props
              if (formData === undefined || formData === null) return <Typography>Logo loading...</Typography>
              if (formData.organization && formData.organization.id) {
                return (
                  <Logo
                    backgroundSrc={reactory.getOrganizationLogo(formData.organization.id, formData.organization.logo)}
                  />
                );
              } else {
                return <Typography>Logo Widget Expecting "id" and "logo" properties.</Typography>
              }

            }
          };
          break;
        }
        default: {
          //do nothing
        }
      }

      if (!_formDef.widgets) _formDef.widgets = {};
      if (isArray(_formDef.widgetMap) === true) {
        _formDef.widgetMap.forEach((map) => {
          reactory.log(`ReactoryForm:: Mapping ${map.widget} to ${map.componentFqn || map.component} ${_formDef.id}`, map, 'debug');
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
                reactory.log(`Component: ${_formDef.id}, ${map.component} successfully mapped`, { component }, 'debug')
                mapped = true;
              } else {
                _formDef.widgets[map.widget] = componentDefs[map.component];
                if (_formDef.widgets[map.widget]) {
                  reactory.log(`Component: ${_formDef.id}, ${map.component} successfully mapped`, { component: _formDef.widgets[map.widget] }, 'debug')
                  mapped = true;
                }
              }
            }
          }

          if (map.componentFqn && map.widget && mapped === false) {
            if (typeof map.componentFqn === 'string' && typeof map.widget === 'string') {
              _formDef.widgets[map.widget] = reactory.getComponent(map.componentFqn);
              if (_formDef.widgets[map.widget]) {
                reactory.log(`Component: ${_formDef.id}, ${map.componentFqn} successfully mapped`, { component: _formDef.widgets[map.widget] }, 'debug')
                mapped = true;
              }
            }
          }

          if (mapped === false) {
            _formDef.widgets[map.widget] = (props, context) => {

              return (<WidgetPresets.WidgetNotAvailable {...props} map={map} />)

            }
            reactory.log(`Component could not be mapped for Form: ${_formDef.id}, ${map.widget}`, { map }, 'warning')
          }
        });
      }

    };

    const setFieldTemplate = () => {

      switch (_formDef.uiFramework) {
        case 'material': {
          _formDef.FieldTemplate = MaterialFieldTemplate;
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
          _formDef.ObjectFieldTemplate = MaterialObjectTemplate;
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
                  reactory.log(`ReactoryFormComponent.form() - injectResources() Resource Type ${resource.type}, not supported.`, { resource }, 'warn');
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
    //onCommand: this.onCommand,
    return _formDef
  }

  const formValidation = ($formData: any, $errors: any) => {

    let formfqn = `${formDef.nameSpace}.${formDef.name}@${formDef.version}`;
    reactory.log(`Executing custom validations for ${formfqn}`, { $formData, $errors }, 'debug');
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
        validationResult = validationFunction($formData, $errors, this);
      } catch (ex) {
        reactory.log(`Error While Executing Custom Validation`, { ex }, 'error');
      }
    }

    return $errors;
  };

  const getPdfWidget = () => {
    const { ReportViewer, FullScreenModal } = componentDefs;
    const formDef = formDefinition();
    let _activeReportDefinition = activeReportDefinition || formDef.defaultPdfReport;

    if(_activeReportDefinition === null || _activeReportDefinition === undefined) return null;

    const closeReport = () =>  {
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
    const formDef: Reactory.IReactoryForm = formDefinition();
    if (formDef !== undefined) {
      const closeReport = (e: React.SyntheticEvent): void => { setShowExportModal( false ); }
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
    reactory.log(`<${fqn} /> getData(defaultInputData?: any)`, { defaultInputData, formData }, 'debug');
    if (formDef.graphql) {

      const has = {
        query: isNil(formDef.graphql.query) === false && isString(formDef.graphql.query.text) === true,
      };

      if (has.query === true) {

        const query = formDef.graphql.query;
        const formContext = getFormContext();
        const __staticFormData = query.formData;

        let _formData = null;

        switch (formDef.schema.type) {
          case "object": {
            _formData = { ...formDef.defaultFormValue, ...__staticFormData, ...formData };
            if (defaultInputData && typeof defaultInputData === 'object') _formData = { ..._formData, ...defaultInputData }
            break;
          }
          case "array": {
            _formData = [...formDef.defaultFormValue, ...__staticFormData, ...formData];
            if (defaultInputData && Array.isArray(defaultInputData) === true) _formData = [..._formData, ...defaultInputData]
            break;
          }
          default: {
            _formData = formData;
            break;
          }
        }


        const _variables = reactory.utils.omitDeep(objectMapper({
          formContext,
          formData: _formData,
          $route: props.$route
        }, query.variables || {}));

        reactory.log(`Variables for query`, { variables: _variables }, 'debug');

        let options = query.options || {};

        //error handler function
        const handleErrors = (errors) => {

          if (formDef.graphql.query.onError) {
            const componentToCall = reactory.getComponent(formDef.graphql.query.onError.componentRef);
            if (componentToCall && typeof componentToCall === 'function') {
              const componentInstance = componentToCall(props)
              if (typeof componentInstance[formDef.graphql.query.onError.method] === 'function') {
                try {
                  componentInstance[formDef.graphql.query.onError.method](errors);
                } catch (err) {
                  reactory.log(err.message, err, 'error');
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

          reactory.log(`<${formDef.nameSpace}.${formDef.name}@${formDef.version} instanceId=${instance_id} />  executeFormQuery()`)
          const query_start = new Date().valueOf();
          reactory.graphqlQuery(gql(query.text), _variables, query.options).then((result: any) => {
            const query_end = new Date().valueOf();

            reactory.stat(`${formDef.nameSpace}.${formDef.name}@${formDef.version}:query_execution_length`, { query_start, query_end, diff: query_end - query_start, unit: 'utc-date' });
            const { data, errors } = result;
            let _formData = formData;

            if (data && data[query.name]) {
              switch (query.resultType) {
                case 'array': {
                  let mergedData = []
                  if (isArray(formData) === true) mergedData = [...formData];
                  if (isArray(data[query.name]) === true) mergedData = [...reactory.utils.lodash.cloneDeep(formData), ...reactory.utils.lodash.cloneDeep(data[query.name])];
                  if (query.resultMap && Object.getOwnPropertyNames(query.resultMap).length > 0) {
                    _formData = objectMapper(mergedData, query.resultMap);
                  } else {
                    _formData = mergedData;
                  }

                  break;
                }
                default: {
                  if (query.resultMap && Object.getOwnPropertyNames(query.resultMap).length > 0) {

                    try {
                      _formData = objectMapper({ ...reactory.utils.lodash.cloneDeep(formData), ...reactory.utils.lodash.cloneDeep(data[query.name]) }, query.resultMap);
                    } catch (mappError) {

                      reactory.log("Could not map the object data", { mappError }, 'error')
                    }

                  } else {
                    _formData = { ...formData, ...data[query.name] };
                  }
                }
              }
            }

            //update component state with new form data

            try {
              //setState({ formData: _formData, queryComplete: true, dirty: false, allowRefresh: true, queryError: errors, loading, last_query_exec: new Date().valueOf() }, () => {

              if (props.onQueryComplete) {
                props.onQueryComplete({ formData: _formData, formContext: getFormContext(_formData), result, errors });
              }

              //$events.emit('onQueryComplete', { formData: _formData });

              if (errors) {
                reactory.log(`ReactoryComponent => ${formDef.nameSpace}${formDef.name}@${formDef.version} instanceId=${instance_id} => Error executing graphql query`, errors)
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
              reactory.log(`ReactoryComponent -> Error on setting state`, unhandledErr, 'error')
            }
          }).catch((queryError) => {

            reactory.log(`Error Executing Form Query`, { queryError }, 'error')
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

            reactory.stat(`${formDef.nameSpace}.${formDef.name}@${formDef.version}:query_error`, { query_start, query_end, diff: query_end - query_start, unit: 'utc-date', failed: true, error: queryError.message });
          });
        }

        if (formDef.graphql.query.interval) {
          if (refreshInterval === null || refreshInterval === undefined) {
            setRefreshInterval(setInterval(executeFormQuery, formDef.graphql.query.interval));
          }

        }

        if (query.refreshEvents) {
          query.refreshEvents.forEach((eventDefinition) => {
            reactory.once(eventDefinition.name, (evt) => {
              reactory.log(`🔔 Refresh of query triggred via refresh event`, { eventDefinition, evt }, 'debug')
              setTimeout(executeFormQuery, query.autoQueryDelay || 500)
            });
          });
        }

        setTimeout(executeFormQuery, query.autoQueryDelay || 0);
      }
    }
  };

  const renderForm = () => {

    reactory.log(`Rendering <${formDef.nameSpace}.${formDef.name}@${formDef.version} />`, { props: props, formData }, 'debug');

    const filter_props = () => {
      return props;    
    };

    const _formUiOptions = getActiveUiOptions();

    const DropDownMenu = componentDefs["DropDownMenu"];
    const formProps = {
      id: instance_id,
      ...filter_props(),
      ...formDefinition(),
      validate: formValidation,
      onChange: onChange,
      formData,
      ErrorList: (error_props) => (<MaterialErrorListTemplate {...error_props} />),
      onSubmit: props.onSubmit || onSubmit,
      ref: (form: any) => { setFormRef(form) },
      transformErrors: (errors = []) => {
        reactory.log(`Transforming error message`, { errors }, 'debug');
        let formfqn = `${formDef.nameSpace}.${formDef.name}@${formDef.version}`;
        let _errors = [...errors];
        if (props.transformErrors && typeof props.transformErrors === 'function') {
          _errors = props.transformErrors(errors, this);
        }

        if (reactory.formTranslationMaps && reactory.formTranslationMaps[formfqn]) {
          _errors = reactory.formTranslationMaps[formfqn](errors, this);
        }

        return _errors;
      }
    };

    let icon = 'save';
    if (formDef.uiSchema && formDef.uiSchema.submitIcon) {
      if (typeof formDef.uiSchema.submitIcon === 'string') {
        icon = formDef.uiSchema.submitIcon
      }
    }

    if (formDef.uiSchema && formDef.uiSchema['ui:options']) {
      if (formDef.uiSchema['ui:options'].submitIcon) {
        icon = formDef.uiSchema['ui:options'].submitIcon
      }
    }

    let iconWidget = (icon === '$none' ? null : <Icon>{icon}</Icon>);
    let showSubmit = true;
    let showRefresh = true;
    let showHelp = true;
    let submitButton = null;
    let uiSchemaSelector = null;
    let activeUiSchemaModel = null;


    const $submitForm = () => {
      if (isNil(formRef) === false && formRef) {
        try {
          formRef.onSubmit();
        } catch (submitError) {
          reactory.createNotification(`The Form ${signature} could not submit`, { type: "warning", showInAppNotification: true, canDismis: true });
          reactory.log(`Could not submit the form`, submitError, 'error')
        }
      }
    }
    
    const { submitProps, buttons } = _formUiOptions;
    if (typeof submitProps === 'object' && showSubmit === true) {
      const { variant = 'fab', iconAlign = 'left' } = submitProps;
      const _props = { ...submitProps };
      delete _props.iconAlign;
      _props.onClick = $submitForm;

      if (variant && typeof variant === 'string' && showSubmit === true) {
        switch (variant) {
          case 'fab':
          {
            delete _props.variant;
            submitButton = (<Fab {..._props}>{iconWidget}</Fab>);
            break;
          }          
          default:  {
            submitButton = (<Button {..._props}>{iconAlign === 'left' && iconWidget}{template(_props.text)({ props: props, formData, formDef, reactory })}{iconAlign === 'right' && iconWidget}</Button>);
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
      submitButton = (<Fab onClick={$submitForm} color="primary">{iconWidget}</Fab>);
    }


    /**
     * If the form supports multiple schemas,
     * we need to determine which is the preffered, currently
     * active one.
     */
    if (formDef.uiSchemas) {

      // Even handler for the schema selector menu 
      const onSchemaSelect = (evt: Event, menuItem: Reactory.IUISchemaMenuItem) => {
        reactory.log(`UI Schema Selector onSchemaSelect "${menuItem.title}" selected`, { evt, menuItem });
        setActiveUiSchemaMenuItem(menuItem);
      };

      // if there is an active with a key
      if (activeUiSchemaMenuItem !== null && activeUiSchemaMenuItem.key) {
        activeUiSchemaModel = activeUiSchemaMenuItem;
      }


      if (!activeUiSchemaModel) {
        activeUiSchemaModel = find(formDef.uiSchemas, { key: props.uiSchemaKey });
      }

      if (activeUiSchemaModel) {
        uiSchemaSelector = (
          <Fragment>
            {activeUiSchemaModel.title}
            <DropDownMenu menus={AllowedSchemas(formDef.uiSchemas, props.mode)} onSelect={onSchemaSelect} selected={activeUiSchemaModel} />
          </Fragment>);
      }

      if (_formUiOptions && _formUiOptions.schemaSelector && activeUiSchemaModel) {
        if (_formUiOptions.schemaSelector.variant === "icon-button") {
          let schemaStyle: CSSProperties = { position: 'absolute', top: '10px', right: '10px', zIndex: 1000 };
          if (_formUiOptions.schemaSelector.style) {
            schemaStyle = _formUiOptions.schemaSelector.style;
          }

          const GetSchemaSelectorMenus = () => {
            const allowed_schema = AllowedSchemas(formDef.uiSchemas, props.mode, null)
            reactory.log(`<${fqn} /> GetSchemaSelectorMenus`, { allowed_schema }, 'debug');

            allowed_schema.forEach((uiSchemaItem: Reactory.IUISchemaMenuItem, index: number) => {

              /**
               * We hook uip the event handler for each of the schema selection options.
               */
              const onSelectUiSchema = () => {
                // self.setState({ activeUiSchemaMenuItem: uiSchemaItem })
                reactory.log(`<${fqn} /> UI Schema Selector onSchemaSelect "${uiSchemaItem.title}" selected`, { uiSchemaItem });
                setActiveUiSchemaMenuItem(uiSchemaItem);
              };

              return (<IconButton onClick={onSelectUiSchema} key={`schema_selector_${index}`}><Icon>{uiSchemaItem.icon}</Icon></IconButton>)
            });

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
            const selectedSchema: Reactory.IUISchemaMenuItem = find(formDef.uiSchemas, { id: _formUiOptions.schemaSelector.selectSchemaId });

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

          if(_formUiOptions.schemaSelector.components) {
            _formUiOptions.schemaSelector.components.forEach((componentRef: string | object) => {
              if(typeof componentRef === 'string') {
                if(componentRef.indexOf(".") > 0 ) {
                  const ComponentInSchemaSelector = reactory.getComponent(componentRef);
                  if(ComponentInSchemaSelector) {
                    _after.push(<ComponentInSchemaSelector formData={formData} formContext={formProps.formContext} uiSchema={formProps.uiSchema} schema={formProps.schema} />)
                  }
                } else {
                  switch(componentRef) {
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
      _additionalButtons = buttons.map((button, buttonIndex) => {
        const { buttonProps, iconProps, type, handler } = button;

        const onButtonClicked = () => {
          reactory.log(`OnClickButtonFor Additional Buttons`);
          if (props[handler] && typeof props[handler] === 'function') {
            props[handler]({ reactoryForm: this, button })
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

    if (formDef.defaultPdfReport) {
      reportButton = (<Button variant="text" onClick={() => { setShowReportModal(!showReportModal) }} color="secondary"><Icon>print</Icon></Button>);
    }

    if (isArray(formDef.reports) === true) {

      const onDropDownSelect = (evt, menuItem: any) => {
        props.api.log('Report Item Selected', { evt, menuItem }, 'debug');
        // setShowReport(menuItem.data);
      };

      let exportMenus = formDef.reports.map((reportDef: any, index) => {
        return {
          title: reportDef.title,
          icon: reportDef.icon,
          key: index,
          id: `exportButton_${index}`,
          data: reportDef,
          disabled: props.api.utils.template(reportDef.disabled || "false")({ props: props, state: { formData } }) === 'true',
        }
      });
      reportButton = (<DropDownMenu menus={exportMenus} onSelect={onDropDownSelect} icon={"print"} />)
    }

    let exportButton = null;

    if (formDef.defaultExport) {
      const defaultExportClicked = () => {
        //showExcelModal(formDef.defaultExport)
      };

      exportButton = (
        <Button variant="text" onClick={defaultExportClicked} color="secondary">
          <Icon>cloud_download</Icon>
        </Button>);
    }

    if (isArray(formDef.exports) === true) {

      const onDropDownSelect = (evt, menuItem: any) => {
        props.api.log('Export Item Selected', { evt, menuItem }, 'debug');
        //showExcelModal(menuItem.data);
      };

      let exportMenus = formDef.exports.map((exportDef: Reactory.IExport, index) => {
        return {
          title: exportDef.title,
          icon: exportDef.icon,
          key: index,
          id: `exportButton_${index}`,
          data: exportDef,
          disabled: props.api.utils.template(exportDef.disabled || "false")({ props: props, state: { formData } }) === 'true',
        }
      });
      exportButton = (<DropDownMenu menus={exportMenus} onSelect={onDropDownSelect} icon={"import_export"} />)
    }

    let formtoolbar = (
      <Toolbar>
        {_formUiOptions.showSchemaSelectorInToolbar && !_formUiOptions.showSchemaSelectorInToolbar === false ? uiSchemaSelector : null}
        {showSubmit === true && submitButton}
        {_additionalButtons}
        {allowRefresh && showRefresh === true && <Button variant="text" onClick={refreshClick} color="secondary"><Icon>cached</Icon></Button>}
        {formDef.backButton && <Button variant="text" onClick={() => { props.history.goBack() }} color="secondary"><Icon>keyboard_arrow_left</Icon></Button>}
        {formDef.helpTopics && showHelp === true && <Button variant="text" onClick={() => { setShowHelpModal(!showHelpModal) }} color="secondary"><Icon>help</Icon></Button>}
        {reportButton}
        {exportButton}
      </Toolbar>
    );

    let toolbarPosition = _formUiOptions.toolbarPosition || 'bottom'

    return (
      <>
        {formDef.graphql && formDef.graphql.query && queryComplete === false && <LinearProgress />}
        {props.before}
        <Form {...{ ...formProps, toolbarPosition: toolbarPosition }}>
          {toolbarPosition.indexOf('bottom') >= 0 && toolbarPosition !== 'none' ? formtoolbar : null}
        </Form>
        {props.children}
        {getHelpScreen()}
        {getPdfWidget()}
        {getExcelWidget()}
      </>
    )
  }

  React.useEffect(() => {

    getData();

  }, [queryComplete])


  React.useEffect(() => {
    reactory.amq.onReactoryPluginLoaded('loaded', onPluginLoaded);

    getData();

    if (props.refCallback) props.refCallback({
      state: {
        formData,
        instance_id
      },
      props
    });

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setInterval(null);
      }
    }
  }, [])

  return (
    <IntersectionVisible>{renderForm()}</IntersectionVisible>
  )

};

const styles = (theme: Object) => {
  return {

  }
};


/**
 * Component Export
 */
export const ReactoryFormComponent: any = compose(
  withApi,
  withTheme,  
  withRouter
)(ReactoryComponentHOC);


class ReactoryFormRouter extends Component<any, any> {

  constructor(props, context) {
    super(props, context);
  }

  render() {
    const { match, api, routePrefix } = this.props;

    api.log('ReactoryFormRouter:render', { props: this.props }, 'debug');
    return (
      <Fragment>
        <Switch>
          <Route path={`${routePrefix}/:formId/:mode/`} render={(props) => {
            return (<ReactoryFormComponent formId={props.match.params.formId || 'ReactoryFormList'} mode={props.match.params.mode} {...props} />)
          }} />
          <Route path={`${routePrefix}/:formId/`} render={(props) => {
            return (<ReactoryFormComponent formId={props.match.params.formId || 'ReactoryFormList'} mode='view' {...props} />)
          }} />
          <Route exact path={`${routePrefix}/`} render={(props) => {
            return (<ReactoryFormComponent formId='ReactoryFormList' formData={{ forms: api.formSchemas }} mode='view' {...props} />)
          }}>
          </Route>
        </Switch>
      </Fragment>
    )
  }
};

export const ReactoryFormRouterComponent = compose(
  withApi,
  withTheme,
  withRouter)(ReactoryFormRouter);

export default ReactoryFormRouterComponent;
