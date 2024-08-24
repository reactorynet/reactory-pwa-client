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
  DefaultComponentMap,
  InitialStateFunction,
  ReactoryFormState,
  ReactoryComponentError
} from './types';

import { useContext } from './useContext';
import { useDataManager } from './useDataManager';
import { useFormDefinition } from './useFormDefinition';
import { useUISchemaManager } from './useUISchemaManager';


const DEFAULT_DEPENDENCIES = [
  'core.Loading',
  'core.Logo',
  'core.FullScreenModal',
  'core.DropDownMenu',
  'core.HelpMe',
  'core.ReportViewer',
  'core.ReactoryFormEditor'];

type ScreenSizeKey = Breakpoint | number;

const SCREEN_SIZES: ScreenSizeKey[] = ["xl", "lg", "md", "sm", "xs"];
const DEFAULT_UI_FRAMEWORK = 'material';

export const ReactoryForm: React.FunctionComponent<Reactory.Client.IReactoryFormProps<unknown>>
  = (props: Reactory.Client.IReactoryFormProps<unknown>) => {
    // #region Props & Locals
    const {
      formId,
      formDef,
      data,
      formData: propsFormData,
      uiSchemaKey,
      uiSchemaId,
      mode = 'view',
      autoQueryDisabled = false,
      refCallback,
      ref,
      uiFramework = DEFAULT_UI_FRAMEWORK,
      children,
      events = {},
      before,
      after,
      extendSchema,
      helpTopics,
      helpTitle,
      onError,
      onBeforeMutation,
      onMutateComplete,
      onBeforeQuery,
      onQueryComplete,
      queryOnFormDataChange = false,
      queryOnFormMount = false,
      routePrefix = '',
      transformErrors,
      query,
      onCommand,
      formContext,
      componentType,
      busy,
      route,
    } = props;
    
    
    const [instanceId] = React.useState(uuid.v4())
    const reactory = useReactory();
    const {
      debug,
      warning,
      getComponents
    } = reactory;
    // #endregion

    // #region hooks
    const location = useLocation();
    const navigate = useNavigate();
    const {
      formDefinition,
      resetFormDefinition
    } = useFormDefinition(props);
    
    const {
      uiOptions,
      uiSchema,
      uiSchemaActiveMenuItem,
      uiSchemaActiveGraphDefintion,
      uiSchemasAvailable,
      uiSchemaSelectorButtons,
    } = useUISchemaManager(props);

    const {
      loading: isFormDataLoading,
      formData,
      onChange: onFormDataChange,
      reset: resetFormData,
      onSubmit,
      validate,
    } = useDataManager({...props, formDefinition, uiSchemaActiveGraphDefintion});
    // #endregion

    
    const fqn = `${formDefinition?.nameSpace || '*'}.${formDefinition?.name || '*'}@${formDefinition?.version || '*'}`;
    const signature = `${formDefinition === undefined ? '🔸' : ''}<${fqn} instance={${instanceId} />`;
  

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
    

    // #region State

    const [componentDefs, setComponents] = React.useState<DefaultComponentMap>(reactory.getComponents(DEFAULT_DEPENDENCIES));

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
    const [isBusy, setIsBusy] = React.useState<boolean>(busy);
    const [pendingResources, setPendingResources] = React.useState<any>(null);
    const [plugins, setPlugins] = React.useState(null);
    const [liveUpdate, setLiveUpdate] = React.useState<boolean>(false);
    const [error, setError] = React.useState<ReactoryComponentError>(null);
    // const [uiFramework, setUiFramework] = React.useState(props.uiFramework || 'material');
    // const [autoQueryDisabled, setAutoQueryDisabled] = React.useState<boolean>(props.autoQueryDisabled || false);
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
    // #endregion

    // #region Lifecycle
    const formRef: React.RefObject<any> = React.createRef<any>();

    const reset = () => {
      setComponents(getComponents(DEFAULT_DEPENDENCIES));
      //setFormData(initialData());
      resetFormData();
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

      // if (props.formId) {
      //   reactory.removeListener(`onReactoryFormDefinitionUpdate::${props.formId}`, setFormDefinition)
      // }
    }

    const onReactoryFormMounted = () => {

      reactory.amq.onReactoryPluginLoaded('loaded', onPluginLoaded);

      // if (props.refCallback) props.refCallback(getFormReference());
      // if (props.ref && typeof props.ref === 'function') props.ref(getFormReference())

      // if (props.formDef) {
      //   setFormDefinition({ ...props.formDef, __complete__: true });
      // } else {
      //   let $id = props.formId;
      //   if (!$id && props.formDef && props.formDef.id) $id = props.formDef.$id as string;
      //   const $formDef = reactory.form($id, (nextFormDef, error) => {
      //     if (error) {
      //       setFormDefinition(ReactoryErrorForm);
      //       setFormData({ error })
      //     } else {
      //       setFormDefinition(nextFormDef);
      //     }

      //   });

      //   if ($formDef) setFormDefinition($formDef.__complete__ === true ? $formDef : ReactoryDefaultForm)

      // }

      return onReactoryFormUnmount;
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
    // #endregion

    // #region Effects

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

    // React.useEffect(() => {
    //   setVersion(version + 1);
    // }, [props])

    // React.useEffect(() => {
    //   //clear the data
    //   // setFormData();
    //   //get the data    
    //   // getData(initialData());
    // }, [formDefinition])

    // #endregion

    const getActiveSchema = (defaultSchema) => {
      if (formDefinition === undefined) return ReactoryDefaultForm.schema;

      let _schemaDefinitions: any = defaultSchema || formDefinition.schema;

      const _uiSchema = uiSchema;
      if (_uiSchema && _uiSchema["ui:schema"]) {
        _schemaDefinitions = _uiSchema["ui:schema"];
      }

      return _schemaDefinitions;
    }



    const getHelpScreen = () => {

      const { HelpMe } = componentDefs;
      let topics = [];
      if (formDefinition.helpTopics) topics = [...formDefinition.helpTopics]
      if (props.helpTopics) topics = [...props.helpTopics, ...topics];
      const closeHelp = e => setShowHelpModal(false);

      const allowSupportRequest = () => {
        uiSchema;
        if (uiSchema && uiSchema['ui:form'] && uiSchema['ui:form'].allowSupportRequest === false) return false;
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

    // #region Event handlers


    // #endregion

    

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

    // const getFormReference = () => {
    //   return {
    //     setState,
    //     forceUpdate: () => { setVersion(version + 1) },
    //     props,
    //     setFormDefinition,
    //     submit: $submitForm,
    //     state: getState(),
    //     validate: () => {
    //       if (formRef && formRef.current) {
    //         formRef.current.validate(formData);
    //       }
    //     },
    //     formRef,
    //     onChange,
    //     refresh: (args = { autoQueryDisabled: true }) => {
    //       setAutoQueryDisabled(args.autoQueryDisabled);
    //       getData(formData);
    //     },
    //   }
    // }

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


    if (formDefinition === undefined) return <>No form definition available</>

    const DropDownMenu = componentDefs["DropDownMenu"];

    // #region ISchemaForm Props
    const formProps: Reactory.Forms.ISchemaFormProps<unknown> = {
      id: instanceId,
      key: instanceId,
      ...formDefinition,
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
      transformErrors: (errors = [], erroSchema) => {
        reactory.log(`Transforming error message`, { errors });
        let formfqn = `${formDefinition.nameSpace}.${formDefinition.name}@${formDefinition.version}`;
        let _errors = [...errors];
        if (props.transformErrors && typeof props.transformErrors === 'function') {
          _errors = props.transformErrors(errors, this) as unknown[];
        }

        if (reactory.formTranslationMaps && reactory.formTranslationMaps[formfqn]) {
          _errors = reactory.formTranslationMaps[formfqn](errors, this);
        }

        return { errors: _errors, errorSchema: erroSchema };
      }
    };
    // #endregion

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

    if (uiOptions?.submitIcon) icon = uiOptions.submitIcon;
    let iconProps = uiOptions?.submitIconProps || {};
    let iconWidget = (icon === '$none' ? null : <Icon {...iconProps}>{icon}</Icon>);
    let showSubmit = true;
    let showRefresh = true;
    let showHelp = true;
    let submitButton = null;
    let uiSchemaSelector = null;
    let activeUiSchemaModel = null;
    let submitTooltip = 'Click to submit the form';

    const { submitProps, buttons } = uiOptions;
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


      if (uiOptions?.schemaSelector) {
        if (uiOptions.schemaSelector.variant === "icon-button") {


          let schemaStyle: CSSProperties = {};
          if (uiOptions.schemaSelector?.style) {
            schemaStyle = uiOptions.schemaSelector.style;
          }

          uiSchemaSelector = (
            <div style={schemaStyle}>
              {
                uiOptions.schemaSelector &&
                uiOptions.schemaSelector.showTitle === false ? null : (<span>
                    {activeUiSchemaModel.title}
                  </span>)
              }
              {uiSchemaSelectorButtons}
            </div>
          )

        }

        if (uiOptions.schemaSelector.variant === "button") {
          const onSelectUiSchema = () => {
            const selectedSchema: Reactory.Forms.IUISchemaMenuItem = find(formDefinition.uiSchemas, { id: uiOptions.schemaSelector.selectSchemaId });

            reactory.log(`<${fqn} /> UI Schema Selector onSchemaSelect "${selectedSchema.title}" selected`, { selectedSchema });
            // TODO - this needs to be tested
            setActiveUiSchemaMenuItem(selectedSchema);
          };

          // let defaultStyle =
          let schemaStyle: CSSProperties = { position: "absolute", top: '10px', right: '10px', zIndex: 1000 };
          if (uiOptions.schemaSelector.style) {
            schemaStyle = {
              ...schemaStyle,
              ...uiOptions.schemaSelector.style
            }
          }

          let buttonStyle = {
            ...uiOptions.schemaSelector.buttonStyle
          };

          let p = {
            style: schemaStyle
          }

          let _before = [];
          let _after = []

          if (uiOptions.schemaSelector.components) {
            uiOptions.schemaSelector.components.forEach((componentRef: string | object) => {
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
                uiOptions.schemaSelector.buttonVariant ?
                  //@ts-ignore
                  <Button
                    id="schemaButton"
                    onClick={onSelectUiSchema}
                    color={uiOptions.schemaSelector.activeColor ? uiOptions.schemaSelector.activeColor : "primary"}
                    variant={uiOptions.schemaSelector.buttonVariant}
                    style={buttonStyle}
                  >{uiOptions.schemaSelector.buttonTitle}</Button> :
                  <Button
                    id="schemaButton"
                    style={{ fontWeight: 'bold', fontSize: '1rem' }}
                    onClick={onSelectUiSchema}
                    //@ts-ignore
                    color={uiOptions.schemaSelector.activeColor ? uiOptions.schemaSelector.activeColor : "primary"}
                  >{uiOptions.schemaSelector.buttonTitle}</Button>
              }
              {_after}
            </div>
          )

        }
      }

      formProps.formContext.$schemaSelector = uiSchemaSelector;
    }

    if (uiOptions && isNil(uiOptions.showSubmit) === false) {
      showSubmit = uiOptions.showSubmit === true;
    }

    if (uiOptions && isNil(uiOptions.showHelp) === false) {
      showHelp = uiOptions.showHelp === true;
    }

    if (uiOptions && isNil(uiOptions.showRefresh) === false) {
      showRefresh = uiOptions.showRefresh === true;
    }

    let additionalButtons = [];
    if (buttons && buttons.length) {
      additionalButtons = buttons.map((button: any, buttonIndex) => {
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

      let reportMenus = formDefinition.reports.map((reportDef: any, index) => {
        return {
          title: reportDef.title,
          icon: reportDef.icon,
          key: index,
          id: `exportButton_${index}`,
          data: reportDef,
          disabled: reactory.utils.template(reportDef.disabled || "false")({ props: props, state: { formData } }) === 'true',
        }
      });      
      reportButton = reportMenus.length > 0 ? 
      // @ts-ignore
      (<DropDownMenu menus={reportMenus} onSelect={onDropDownSelect} icon={"print"} />) : null;
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
      exportButton = exportMenus.length > 0 ? 
      //@ts-ignore
      (<DropDownMenu menus={exportMenus} onSelect={onDropDownSelect} icon={"import_export"} />) : null;
    }

    let formtoolbar = (
      <Toolbar style={uiOptions.toolbarStyle || {}}>
        {uiOptions.showSchemaSelectorInToolbar && !uiOptions.showSchemaSelectorInToolbar === false ? uiSchemaSelector : null}
        {showSubmit === true && submitButton ? (<Tooltip title={submitTooltip}>{submitButton}</Tooltip>) : null}
        {additionalButtons}
        {allowRefresh && showRefresh === true && <Button variant="text" onClick={refreshClick} color="secondary"><Icon>cached</Icon></Button>}
        {reportButton}
        {exportButton}
        {formDefinition.backButton && <Button variant="text" onClick={() => { history.back() }} color="primary">BACK <Icon>keyboard_arrow_left</Icon></Button>}
        {formDefinition.helpTopics && showHelp === true && <Button variant="text" onClick={() => { setShowHelpModal(true) }} color="primary"><Icon>help</Icon></Button>}
      </Toolbar>
    );

    let toolbarPosition = uiOptions.toolbarPosition || 'bottom'

    const isFormBusy = () => {
      if (busy === true) return true;
      if (isBusy === true) return true;
      if (isFormDataLoading === true) return true;

      return false;
    }

    let renderedComponent: React.ReactNode;

    // #region Form Render
    try {
      //@ts-ignore            
      const schemaFormProps: ISchemaForm<> = {
        ...{ ...formProps, toolbarPosition: toolbarPosition }
      };

      if (formDefinition.__complete__ === true) {
        const formChildren: any[] = [];
        if (toolbarPosition.indexOf("top") >= 0 || toolbarPosition.indexOf("both") >= 0) formChildren.push(formtoolbar);
        if (isFormBusy()) formChildren.push(<LinearProgress />);
        formChildren.push(<SchemaForm {...schemaFormProps} />);
        if (toolbarPosition.indexOf("bottom") >= 0 || toolbarPosition.indexOf("both") >= 0) formChildren.push(formtoolbar);
        formChildren.push(getHelpScreen());

        let componentProps = {
          id: `reactory_container::${instanceId}`,
          name: `${formDefinition.name}`,
          key: `reactory_container::${instanceId}`,
          className: uiOptions?.className || '',
          style: uiOptions?.style || {},
        }

        switch (uiOptions?.componentType) {
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
              encType='multipart/form-data'
              autoComplete='off'
              noValidate={true}              
              {...componentProps}
              >
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

    debug(`Rendering ${signature}`);
    return <IntersectionVisible>{renderedComponent}</IntersectionVisible>
    // #endregion
  };

