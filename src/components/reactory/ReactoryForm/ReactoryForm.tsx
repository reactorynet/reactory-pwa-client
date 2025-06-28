/* tslint:disable */
/* eslint-disable */
import React, { useCallback } from 'react';
import Reactory from '@reactory/reactory-core';
import SchemaForm, { ISchemaForm } from '../form/components/SchemaForm';

import { find, template, isArray, isNil, isString, isEmpty, throttle, filter } from 'lodash';
import { useNavigate, useLocation, useParams, Params } from 'react-router';

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
      error,
      getComponents
    } = reactory;
    // #endregion

    // #region hooks

    const {
      instanceId,
      SIGN,
      form,
      formData,
      isDataLoading,
      setForm,
      formContext,
      schema,
      uiSchema,
      SchemaSelector,
      uiOptions,
      errorSchema,
      errors,
      validate,
      onChange,
      onSubmit,
      onError,
      refresh,
      RefreshButton,
      SubmitButton,
      isValidating,
      PagingWidget,
    } = useFormDefinition(props);

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

    // Get helper components for the form
    const { 
      HelpButton,
      HelpModal,
      toggleHelp,
    } = useHelp({ formDefinition: form });

    const {
      Toolbar
    } = useToolbar({
      formDefinition: form,
      formData,
      errors,
      errorSchema,
      onSubmit,
      uiOptions,
      refresh,
      toggleHelp,
      SchemaSelector,
      SubmitButton,
     });         
    // #endregion

    const getInitialDepencyState = () => {
      let _dependency_state = { passed: true, dependencies: {} }

      let _all_dependencies = [];
      if (form?.widgetMap) {
        form.widgetMap.forEach((map) => {
          if (map.componentFqn) {
            if (_all_dependencies.indexOf(map.componentFqn) < 0) _all_dependencies.push(map.componentFqn);
          }
        })
      }

      if (form?.components) {
        form.components.forEach((component) => {
          if (component.indexOf("@") > 1 && component.indexOf(".") > 0) {
            if (_all_dependencies.indexOf(component) < 0) _all_dependencies.push(component);
          }
        })
      }

      if (form?.dependencies && form.dependencies.length > 0) {
        form.dependencies.forEach((_dep: Reactory.Forms.IReactoryComponentDefinition) => {
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
        // let _component = plugin.component(props, formContext);
        if (dependencies[plugin.componentFqn]) {
          let _depends = { ...dependencies };
          _depends[plugin.componentFqn].available = true;
          _depends[plugin.componentFqn].component = plugin.component;
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

    if (form === undefined) return <>No form definition available</>
  
    // #region ISchemaForm Props
    // @ts-ignore
    const formProps: Reactory.Forms.ISchemaFormProps<unknown> = {
      id: instanceId,
      key: instanceId,
      schema: schema as Reactory.Schema.ISchema,
      uiSchema: uiSchema as Reactory.Schema.IFormUISchema,
      formContext,
      acceptcharset: 'UTF-8',
      enctype: 'multipart/form-data',
      noValidate: false,
      liveValidate: false,
      errorSchema,
      validate,
      // @ts-ignore
      onChange,
      onError,
      formData,
      ErrorList: (error_props) => (<ErrorList {...error_props} />),
      onSubmit,
      ref: (form: any) => {
        throw new Error('Form reference deprecated');
      },
      //@ts-ignore
      transformErrors: async (errors = [], errorSchema) => {
        reactory.log(`Transforming error message`, { errors });
        let formfqn = `${form.nameSpace}.${form.name}@${form.version}`;
        let _errors = [...errors];
        // if (props.transformErrors && typeof props.transformErrors === 'function') {
        //   _errors = props.transformErrors(errors, this) as unknown[];
        // }
        if (reactory.formTranslationMaps && reactory.formTranslationMaps[formfqn]) {
          _errors = reactory.formTranslationMaps[formfqn](errors);
        }

        return { errors: _errors, errorSchema };
      }
    };
    // #endregion

    const isFormBusy = () => {
      if (isDataLoading === true) return true;
      if (isValidating === true) return true;
      return false;
    }

    let renderedComponent: React.ReactNode;
    const {
      toolbarPosition = 'bottom',
    } = uiOptions; 
    // #region Form Render
    try {
      //@ts-ignore            
      const schemaFormProps: ISchemaForm<unknown> = {
        ...{ ...formProps, toolbarPosition }
      };

      if (form.__complete__ === true) {
        const formChildren: any[] = [];
        if ((toolbarPosition?.indexOf("top") >= 0 || toolbarPosition?.indexOf("both") >= 0) && Toolbar) formChildren.push(<Toolbar />);
        if (isFormBusy() === true) formChildren.push(<LinearProgress />);
        formChildren.push(<SchemaForm {...schemaFormProps} />);
        if ((toolbarPosition?.indexOf("bottom") >= 0 || toolbarPosition?.indexOf("both") >= 0) && Toolbar) formChildren.push(<Toolbar />);
        if (PagingWidget) formChildren.push(<PagingWidget />);
        if (HelpModal) formChildren.push(<HelpModal />);

        let componentProps = {
          id: `reactory_container::${instanceId}`,
          name: `${form.name}`,
          key: `reactory_container::${instanceId}`,
          className: uiOptions?.className || '',
          style: uiOptions?.style || {},
        }

        switch (uiOptions?.componentType) {
          case 'div': {
            renderedComponent = <div {...componentProps}>{formChildren}</div>;
            debug(`${SIGN}:render - div`);
            break;
          }
          case 'article': {          
            renderedComponent = <article {...componentProps}>{formChildren}</article>;
            debug(`${SIGN}:render - article`);
            break;
          }
          case 'section': {
            renderedComponent = <section {...componentProps}>{formChildren}</section>
            debug(`${SIGN}:render - section`);
            break;
          }
          case 'card': {
            renderedComponent = <Card {...componentProps}>{formChildren}</Card>
            debug(`${SIGN}:render - Card`);
            break;
          }
          case 'grid': {
            renderedComponent = <Grid {...componentProps}>{formChildren}</Grid>
            debug(`${SIGN}:render - Grid`);
            break;
          }
          case 'paper': {
            renderedComponent = <Paper {...componentProps}>{formChildren}</Paper>
            debug(`${SIGN}:render - Paper`);
            break;
          }
          case 'paragraph': {
            renderedComponent = <p {...componentProps}>{formChildren}</p>
            debug(`${SIGN}:render - p`);
            break;
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
            debug(`${SIGN}:render - form`);            
          }
        }
      } else {
        renderedComponent = <LinearProgress />
        debug(`${SIGN}:render - loading`);
      }
    } catch (err) {
      renderedComponent = <>{err.message}</>;
      error(`${SIGN}:render`, err);
    }
    return <IntersectionVisible>{renderedComponent}</IntersectionVisible>
    // #endregion
  };

