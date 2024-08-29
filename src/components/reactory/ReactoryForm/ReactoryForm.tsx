/* tslint:disable */
/* eslint-disable */
import React, { useCallback } from 'react';
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
  Paper,
  LinearProgress,
  Breakpoint
} from '@mui/material';

import IntersectionVisible from '../../utility/IntersectionVisible';
import ErrorList from '../form/components/ErrorList';

import {
  DefaultComponentMap,
  InitialDataFunction,
  ReactoryFormState,
  ReactoryComponentError
} from './types';

import { 
  useContext,
  useDataManager,
  useExports,
  useFormDefinition,
  useHelp,
  useReports,
  useSchema,
  useUISchema,
  useToolbar,
 } from './hooks';

type ScreenSizeKey = Breakpoint | number;

const SCREEN_SIZES: ScreenSizeKey[] = ["xl", "lg", "md", "sm", "xs"];
const DEFAULT_UI_FRAMEWORK = 'material';

export const ReactoryForm: React.FunctionComponent<Reactory.Client.IReactoryFormProps<unknown>>
  = (props: Reactory.Client.IReactoryFormProps<unknown>) => {
    // #region Props & Locals
    const reactory = useReactory();
    const {
      debug,
      warning,
      getComponents
    } = reactory;

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
      onBeforeSubmit,
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
    const [form, setForm] = React.useState<Reactory.Forms.IReactoryForm>(formDef);
    const FQN = `${formDef?.nameSpace || 'unknown'}.${formDef?.name || 'unknown'}@${formDef?.version || '0.0.0'}`;
    const SIGN = `${FQN}:${instanceId}`;
    
    // #endregion

    // #region hooks

    // form context puts all the elements together
    // and provides a context for the form
    const context: Reactory.Client.IReactoryFormContext<unknown> = useContext({
      ...props,
    });

    // First we get the ui schema information.
    // use the useUISchema hook to get the ui schema information.
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
      SIGN
    });

    // Next we get the schema information
    // The schema can change depending on
    // the active ui schema definition
    const {
      schema,
    } = useSchema({ 
      FQN,
      SIGN,
      formId,
      schema: form?.schema as Reactory.Schema.AnySchema, 
      uiSchemaActiveMenuItem,
    });

     // Next we get the form definition
     const {
      formDefinition,
    } = useFormDefinition({
      formId,
      formDefinition: form,
      schema,
      uiSchema,
      context,
    });

    // Next we get the data manager
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
      initialData: props.formData || props.data,
      formDefinition,
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
      context,
      mode: mode,
      onError,
    });
 
    // Get helper components for the form
    const {
      Toolbar
    } = useToolbar({ 
      formDefinition: form,
      formData,
     });
    const { 
      ExportButton,
      ExportModal,
    } = useExports({ 
      formDefinition: form,
      formData, 
    });

    const { 
      ReportButton,
      ReportModal,
    } = useReports({ 
      formDefinition: form,
    });

    const { 
      HelpButton,
      HelpModal,
    } = useHelp({ formDefinition: form });    
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
      reactory.log(` ${SIGN} Plugin loaded, activating component`, { plugin });
      try {
        let _component = plugin.component(props, context);
        if (dependencies[plugin.componentFqn]) {
          let _depends = { ...dependencies };
          _depends[plugin.componentFqn].available = true;
          _depends[plugin.componentFqn].component = _component;
          setDepencies(_depends);
        }
        setVersion(version + 1);
      } catch (pluginFailure) {
        reactory.log(`${SIGN} An error occured loading plugin ${plugin.componentFqn}`, { plugin, pluginFailure });
      }
    }
    // #endregion

    // #region Effects

    React.useEffect(onReactoryFormMounted, []);

    // React.useEffect(() => {
    //   //getData();
    //   reactory.utils.localForage.setItem(`${fqn}::preferred_uiSchema`, activeUiSchemaMenuItem);
    // }, [activeUiSchemaMenuItem])

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

    // #region Event handlers


    // #endregion

    

    if (formDefinition === undefined) return <>No form definition available</>
    
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

    reactory.log(`Form Props: ${SIGN}`, { formProps })

    const isFormBusy = () => {
      if (busy === true) return true;
      if (isDataLoading === true) return true;

      return false;
    }

    let renderedComponent: React.ReactNode;
    const {
      toolbarPosition = 'bottom',
    } = uiOptions; 
    // #region Form Render
    try {
      //@ts-ignore            
      const schemaFormProps: ISchemaForm<> = {
        ...{ ...formProps, toolbarPosition }
      };

      if (formDefinition.__complete__ === true) {
        const formChildren: any[] = [];
        if (uiOptions.toolbarPosition.indexOf("top") >= 0 || uiOptions.toolbarPosition.indexOf("both") >= 0) formChildren.push(<Toolbar />);
        if (isFormBusy()) formChildren.push(<LinearProgress />);
        formChildren.push(<SchemaForm {...schemaFormProps} />);
        if (toolbarPosition.indexOf("bottom") >= 0 || toolbarPosition.indexOf("both") >= 0) formChildren.push(<Toolbar />);
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

    debug(`${SIGN}:render`);
    return <IntersectionVisible>{renderedComponent}</IntersectionVisible>
    // #endregion
  };

