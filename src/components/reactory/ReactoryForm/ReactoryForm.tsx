/* tslint:disable */
/* eslint-disable */
import React, { Component, Fragment, ReactNode, DOMElement, CSSProperties, Ref } from 'react';
import Reactory from '@reactory/reactory-core';
import SchemaForm, { ISchemaForm } from '../form/components/SchemaForm';

import { find, template, isArray, isNil, isString, isEmpty, throttle, filter } from 'lodash';
import { useNavigate, useLocation, useParams, Params } from 'react-router';
import * as uuid from 'uuid';
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

import IntersectionVisible from '../../utility/IntersectionVisible';
import ErrorList from '../form/components/ErrorList';

import {
  DefaultComponentMap,
  InitialStateFunction,
  ReactoryFormState,
  ReactoryComponentError
} from './types';

import { useContext } from './useContext';
import { useSchema } from './useSchema';
import { useDataManager } from './useDataManager';
import { useFormDefinition } from './useFormDefinition';
import { useUISchemaManager } from './useUISchemaManager';
import { useExports } from './useExports';
import { useReports } from './useReports';
import { useHelp } from './useHelp';


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
    
    const params: Readonly<Params<string>> = useParams();

    const [instanceId] = React.useState(uuid.v4())
    const fqn = `${formDef?.nameSpace || 'unknown'}.${formDef?.name || 'unknown'}@${formDef?.version || '0.0.0'}`;
    const signature = `${formDef === undefined ? '🔸' : ''}<${fqn} instance={${instanceId} />`;
    const reactory = useReactory();
    const {
      debug,
      warning,
      getComponents
    } = reactory;
    // #endregion

    // #region hooks
    // First we get the ui schema information.
    const {
      loading: isUiSchemaLoading,
      uiOptions,
      uiSchema,
      uiSchemaActiveMenuItem,
      uiSchemaActiveGraphDefintion,
      uiSchemasAvailable,
      SchemaSelector,
    } = useUISchemaManager({
      formDefinition: formDef,
      uiSchemaKey,
      params,
      mode,
    });

    // Next we get the schema information
    const {
      schema,
    } = useSchema({ 
      formId,
      schema: formDef?.schema as Reactory.Schema.AnySchema, 
      uiSchemaActiveMenuItem,
    });

   
    // Next we get the data manager
    const {
      canRefresh,
      loading: isFormDataLoading,
      formData,      
      onChange,
      reset,
      onSubmit,
      validate,
      errorSchema,
      errors,
      refresh,
      RefreshButton,
      SubmitButton,
      PagingWidget,
      paging,
    } = useDataManager({
      ...props,
      schema,
      uiSchema,
      uiSchemaActiveGraphDefintion
    });

    // Next we get the form definition
    const {
      formDefinition,
      resetFormDefinition
    } = useFormDefinition({
      schema,
      uiSchema,
    });
    
    // Get helper components for the form
    const { 
      ExportButton,
      ExportModal,
    } = useExports({ 
      formDefinition,
      formData, 
    });

    const { 
      ReportButton,
      ReportModal,
    } = useReports({ formDefinition });

    const { 
      HelpButton,
      HelpModal,
    } = useHelp({ formDefinition });
    
    // #endregion

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
    const [showExportModal, setShowExportModal] = React.useState<boolean>(false)
    const [showHelpModal, setShowHelpModal] = React.useState<boolean>(false)
    const [error, setError] = React.useState<ReactoryComponentError>(null);        
    //used for internal tracking of updates / changes since first load
    const [version, setVersion] = React.useState<number>(0);
    const [dependencies, setDepencies] = React.useState<any>(getInitialDepencyState().dependencies);
    
    
    // #endregion

    // #region Lifecycle
    const formRef: React.RefObject<any> = React.createRef<any>();

    // const reset = () => {
    //   setComponents(getComponents(DEFAULT_DEPENDENCIES));
    //   //setFormData(initialData());
    //   resetFormData();
    //   setQueryComplete(false);
    //   setAllowRefresh(false);
    //   setIsBusy(false);
    //   setIsDirty(false);
    //   setVersion(0);
    //   setDepencies(getInitialDepencyState().dependencies);
    //   setCustomState({});
    // };

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
    // @ts-ignore
    const DropDownMenu: React.ComponentType<{
      menus: Reactory.Forms.IUISchemaMenuItem[],
      onSelect: (menuItem: Reactory.Forms.IUISchemaMenuItem) => void,
      selected: Reactory.Forms.IUISchemaMenuItem
    }> = componentDefs["DropDownMenu"];

    // #region ISchemaForm Props
    // @ts-ignore
    const formProps: Reactory.Forms.ISchemaFormProps<unknown> = {
      id: instanceId,
      key: instanceId,
      schema,
      uiSchema,
      formContext,
      acceptcharset: 'UTF-8',
      enctype: 'multipart/form-data',
      noValidate: false,
      liveValidate: false,
      errorSchema,
      validate,
      onChange,
      onError: props.onError ? props.onError : (error) => { },
      formData,
      ErrorList: (error_props) => (<ErrorList {...error_props} />),
      onSubmit,
      ref: (form: any) => {
        if (formRef.current === null || formRef.current === undefined) {
          //@ts-ignore
          formRef.current = form;
        }

        // if (props.refCallback) props.refCallback(getFormReference())
        // if (props.ref && typeof props.ref === 'function') props.ref(getFormReference())
      },
      transformErrors: (errors = [], erroSchema) => {
        reactory.log(`Transforming error message`, { errors });
        let formfqn = `${formDefinition.nameSpace}.${formDefinition.name}@${formDefinition.version}`;
        let _errors = [...errors];
        // if (props.transformErrors && typeof props.transformErrors === 'function') {
        //   _errors = props.transformErrors(errors, this) as unknown[];
        // }

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

    let formtoolbar = (
      <Toolbar style={uiOptions.toolbarStyle || {}}>
        {uiOptions.showSchemaSelectorInToolbar && !uiOptions.showSchemaSelectorInToolbar === false ? uiSchemaSelector : null}
        {showSubmit === true && submitButton ? (<Tooltip title={submitTooltip}>{submitButton}</Tooltip>) : null}
        {additionalButtons}
        {<RefreshButton />}        
        {formDefinition.backButton && <Button variant="text" onClick={() => { history.back() }} color="primary">BACK <Icon>keyboard_arrow_left</Icon></Button>}
        {formDefinition.helpTopics && showHelp === true && <Button variant="text" onClick={() => { setShowHelpModal(true) }} color="primary"><Icon>help</Icon></Button>}
      </Toolbar>
    );

    let toolbarPosition = uiOptions.toolbarPosition || 'bottom'

    const isFormBusy = () => {
      if (busy === true) return true;
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
        formChildren.push(<PagingWidget />);
        formChildren.push(<HelpModal />);

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

