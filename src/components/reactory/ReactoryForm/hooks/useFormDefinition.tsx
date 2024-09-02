import { useEffect, useState } from "react";
import * as uuid from 'uuid';
import { useNavigate, useLocation, useParams, Params } from 'react-router';
import ReactoryFormListDefinition from '../../formDefinitions/ReactoryFormList';
import ReactoryNewFormInput from '../../formDefinitions/ReactoryNewFormInput';
import { ReactoryDefaultForm } from "../constants";
import ReactoryUxPackages from '../../ux';
import ReactoryApi, { useReactory } from "@reactory/client-core/api";
import { DefaultComponentMap, ReactoryFormDefinitionHook } from "../types";
import MuiReactoryPackage from "@reactory/client-core/components/reactory/ux/mui";
import { useUISchema } from "./useUISchema";
import { useSchema } from "./useSchema";
import { useContext } from "./useContext";
import { useDataManager } from "./useDataManager";
import { ReactoryApiEventNames } from "@reactory/client-core/api/ReactoryApi";


/**
    * Build the form definition from current props and state. 
    * Returns active form definition
    */
// const formDefinitionFunction = (): Reactory.Forms.IReactoryForm => {
//   if (formDefinition === undefined) return ReactoryDefaultForm;
//   if (formDefinition.__complete__ === false) return ReactoryDefaultForm;

//   const { extendSchema, uiSchemaKey, uiSchemaId } = props;
//   let _formDef: Reactory.Forms.IReactoryForm = reactory.utils.lodash.cloneDeep(formDefinition);
//   if (extendSchema && typeof extendSchema === 'function') _formDef = extendSchema(_formDef);

//   if (_formDef.uiFramework !== 'schema') {
//     //we are not using the schema define ui framework we are assigning a different one
//     _formDef.uiFramework = uiFramework
//   }

//   // set noHtml5Validation if not set by schema
//   if (nil(_formDef.noHtml5Validate)) _formDef.noHtml5Validate = true;

//   //state selected option must override the property set item
//   //as the user can change the current active item either programmatically
//   //or via UX element.
//   _formDef.uiSchema = getActiveUiSchema();
//   _formDef.graphql = getActiveGraphDefinitions();
//   _formDef.schema = getActiveSchema(_formDef.schema);

//   // #region setup functions
//   const setFormContext = () => {
//     if (!_formDef.formContext) _formDef.formContext = {};
//     //we combine the form context from the getter function, with the formContext property / object on the _formDef
//     _formDef.formContext = { ...getFormContext(), ..._formDef.formContext as Object };
//   };

//   const setFields = () => {

//     if (ReactoryUxPackages[_formDef.uiFramework] && ReactoryUxPackages[_formDef.uiFramework].fields) {
//       _formDef.fields = ReactoryUxPackages.material.fields;
//     } else {
//       _formDef.fields = {};
//     }

//   };

//   if (!_formDef.fields) _formDef.fields = {};

//   if (isArray(_formDef.fieldMap) === true) {
//     _formDef.fieldMap.forEach((map) => {
//       //reactory.log(`${signature} (init) Mapping ${map.field} to ${map.componentFqn || map.component} ${_formDef.id}`, map);
//       let mapped = false;

//       if (map.component && typeof map.component === 'string') {
//         if (map.component.indexOf('.') > -1) {
//           const pathArray = map.component.split('.');
//           let component: Object = componentDefs[pathArray[0]];
//           if (component && Object.keys(component).length > 0) {
//             for (let pi = 1; pi <= pathArray.length - 1; pi += 1) {
//               if (component && Object.keys(component).length > 0) component = component[pathArray[pi]]
//             }
//             _formDef.fields[map.field] = component;
//             //reactory.log(`${signature} (init) Component: ${_formDef.id}, ${map.component} successfully mapped`, { component });
//             mapped = true;
//           } else {
//             _formDef.widgets[map.field] = componentDefs[map.component];
//             if (_formDef.widgets[map.field]) {
//               //reactory.log(`${signature} (init) Component: ${_formDef.id}, ${map.component} successfully mapped`, { component: _formDef.widgets[map.field] });
//               mapped = true;
//             }
//           }
//         }
//       }

//       if (map.componentFqn && map.field && mapped === false) {
//         if (typeof map.componentFqn === 'string' && typeof map.field === 'string') {
//           _formDef.widgets[map.field] = reactory.getComponent(map.componentFqn);
//           if (_formDef.widgets[map.field]) {
//             //reactory.log(`${signature} (init) Component: ${_formDef.id}, ${map.componentFqn} successfully mapped`, { component: _formDef.widgets[map.field] });
//             mapped = true;
//           }
//         }
//       }

//       if (mapped === false) {
//         _formDef.widgets[map.field] = (props, context) => {
//           //@ts-ignore
//           return (<MuiReactoryPackage.widgets.WidgetNotAvailable {...props} map={map} />)

//         }
//         //reactory.log(`${signature} (init) Component could not be mapped for Form: ${_formDef.id}, ${map.field}`, { map });
//       }
//     });
//   }


//   const setWidgets = () => {

//     if (ReactoryUxPackages[_formDef.uiFramework] && ReactoryUxPackages[_formDef.uiFramework].widgets) {
//       _formDef.widgets = ReactoryUxPackages[_formDef.uiFramework].widgets;
//     } else {
//       _formDef.widgets = {};
//     }

//     if (!_formDef.widgets) _formDef.widgets = {};
//     if (isArray(_formDef.widgetMap) === true) {
//       _formDef.widgetMap.forEach((map) => {
//         //reactory.log(`${signature} (init) Mapping ${map.widget} to ${map.componentFqn || map.component} ${_formDef.id}`, map);
//         let mapped = false;

//         if (map.component && typeof map.component === 'string') {
//           if (map.component.indexOf('.') > -1) {
//             const pathArray = map.component.split('.');
//             let component: Object = componentDefs[pathArray[0]];
//             if (component && Object.keys(component).length > 0) {
//               for (let pi = 1; pi <= pathArray.length - 1; pi += 1) {
//                 if (component && Object.keys(component).length > 0) component = component[pathArray[pi]]
//               }
//               _formDef.widgets[map.widget] = component;
//               //reactory.log(`${signature} (init) Component: ${_formDef.id}, ${map.component} successfully mapped`, { component });
//               mapped = true;
//             } else {
//               _formDef.widgets[map.widget] = componentDefs[map.component];
//               if (_formDef.widgets[map.widget]) {
//                 //reactory.log(`${signature} (init) Component: ${_formDef.id}, ${map.component} successfully mapped`, { component: _formDef.widgets[map.widget] });
//                 mapped = true;
//               }
//             }
//           }
//         }

//         if (map.componentFqn && map.widget && mapped === false) {
//           if (typeof map.componentFqn === 'string' && typeof map.widget === 'string') {
//             _formDef.widgets[map.widget] = reactory.getComponent(map.componentFqn);
//             if (_formDef.widgets[map.widget]) {
//               // reactory.log(`${signature} (init) Component: ${_formDef.id}, ${map.componentFqn} successfully mapped`, { component: _formDef.widgets[map.widget] });
//               mapped = true;
//             }
//           }
//         }

//         if (mapped === false) {
//           _formDef.widgets[map.widget] = (props, context) => {

//             return (<WidgetNotAvailable {...props} map={map} />)
//             //setTimeout(() => { setVersion(version + 1) }, 777);
//             //return (<>loading ...{map.widget}</>)

//           }
//           // reactory.log(`${signature} (init) Component could not be mapped for Form: ${_formDef.id}, ${map.widget}`, { map });
//         }
//       });
//     }

//   };

//   const setFieldTemplate = () => {

//     switch (_formDef.uiFramework) {
//       case 'material': {
//         _formDef.FieldTemplate = MuiReactoryPackage.templates.MaterialFieldTemplate;
//         _formDef.ArrayFieldTemplate = MuiReactoryPackage.templates.MaterialArrayFieldTemplate;
//         break;
//       }
//       default: {
//         if (_formDef.FieldTemplate) delete _formDef.FieldTemplate;
//         break
//       }
//     }
//   };

//   const setObjectTemplate = () => {
//     switch (_formDef.uiFramework) {
//       case 'material': {
//         _formDef.ObjectFieldTemplate = MuiReactoryPackage.templates.MaterialObjectTemplate;
//         break;
//       }
//       default: {
//         if (_formDef.ObjectFieldTemplate) delete _formDef.ObjectFieldTemplate;
//         break;
//       }
//     }
//   };

//   const injectResources = () => {
//     if (document) {
//       if (_formDef.uiResources && _formDef.uiResources.length) {
//         _formDef.uiResources.forEach((resource) => {
//           const resourceId = `${resource.type}_${resource.id}`;
//           if (nil(document.getElementById(resourceId)) === true) {
//             switch (resource.type) {
//               case 'style': {
//                 let styleLink = document.createElement('link');
//                 styleLink.id = resourceId;
//                 styleLink.href = resource.uri;
//                 styleLink.rel = 'stylesheet';
//                 document.head.append(styleLink)
//                 break;
//               }
//               case 'script': {
//                 let scriptLink = document.createElement('script');
//                 scriptLink.id = resourceId;
//                 scriptLink.src = resource.uri;
//                 scriptLink.type = 'text/javascript';
//                 document.body.append(scriptLink)
//                 break;
//               }
//               default: {
//                 reactory.warning(`ReactoryFormComponent.form() - injectResources() Resource Type ${resource.type}, not supported.`, { resource });
//                 break;
//               }
//             }
//           }
//         })
//       }
//     }
//   };
//   // #endregion
//   injectResources();
//   setFields();
//   setWidgets();
//   setObjectTemplate();
//   setFieldTemplate();
//   setFormContext();
//   return _formDef
// }

const DEFAULT_DEPENDENCIES = [
  'core.Loading',
  'core.Logo',
  'core.FullScreenModal',
  'core.DropDownMenu',
  'core.HelpMe',
  'core.ReportViewer',
  'core.ReactoryFormEditor'];

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
    mode = 'view',
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
  const [instanceId] = useState(uuid.v4())
  const params: Readonly<Params<string>> = useParams();

  const [formContext, setFormContext] = useState<any>({});
  const [form, setForm] = useState<Reactory.Forms.IReactoryForm | undefined>(formDef || ReactoryDefaultForm);
  const [v, setVersion] = useState(0);
  const FQN = `${form?.nameSpace || 'unknown'}.${form?.name || 'unknown'}@${form?.version || '0.0.0'}`;
  const SIGN = `${FQN}:${instanceId}`;

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
  });

  const [componentDefs, setComponents] = useState<DefaultComponentMap>(reactory.getComponents(DEFAULT_DEPENDENCIES));


  const getForm = () => {
    let _form = formDef;
    if (nil(_form)) {
      _form = reactory.form(formId, (nextForm, error) => {
        if (nextForm && !error) {
          setForm(nextForm);
        }
      });
      if (nil(_form)) {
        warning(`Form not found: ${formId}`);
      } else {
        setForm(_form);
      }
    }
  }

  const getFormContext = (): Reactory.Client.IReactoryFormContext<unknown> => {
    return {
      $ref: null,
      formData,
      formDef: form,
      formInstanceId: instanceId,
      getData: async (props: any) => { return formData },
      graphql: form.graphql,
      query: null,
      refresh,
      reset,
      screenBreakPoint: 'md',
      setFormData: async (data: any) => { 
      
      },
      signature: SIGN,
      version: 0,
      reactory,
    }
  };

  const injectResources = () => {
    if (document) {
      if (form.uiResources && form.uiResources.length) {
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
                setTimeout(() => {
                  setVersion(v + 1);
                }, 500)
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
      }
    }
  };

  const setFields = (_formDef: Reactory.Forms.IReactoryForm): Reactory.Forms.IReactoryForm => {
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
            _formDef.widgets[map.field] = reactory.getComponent(map.componentFqn);
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

  const setWidgets = (_formDef: Reactory.Forms.IReactoryForm): Reactory.Forms.IReactoryForm => {
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
            return <MuiReactoryPackage.widgets.WidgetNotAvailable {...props} map={map} />;
            //setTimeout(() => { setVersion(version + 1) }, 777);
            //return (<>loading ...{map.widget}</>)
          };
          // reactory.log(`${signature} (init) Component could not be mapped for Form: ${_formDef.id}, ${map.widget}`, { map });
        }
      });
    }

    return _formDef;
  };

  const setFieldTemplate = (_formDef: Reactory.Forms.IReactoryForm): Reactory.Forms.IReactoryForm => {
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

  const setObjectTemplate = (_formDef: Reactory.Forms.IReactoryForm): Reactory.Forms.IReactoryForm => {
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

  useEffect(getForm,[formId]);
  useEffect(() => {
    if(formDef && formDef.__complete__ === true) {
      setForm(formDef);
    }
  }, [formDef]);

  useEffect(injectResources, [form.uiResources])

  const getEffectiveForm = () => { 
    let _form = lodash.cloneDeep(form);
    if (extendSchema && typeof extendSchema === 'function') _form = extendSchema(_form);

    _form = setFields(_form);
    _form = setWidgets(_form);
    _form = setObjectTemplate(_form);
    _form = setFieldTemplate(_form);
    _form.__complete__ = true;
    return _form;
  }

  return {
    instanceId,
    uiOptions,
    uiSchema,
    uiSchemaActiveMenuItem,
    uiSchemaActiveGraphDefintion,
    uiSchemasAvailable,
    SchemaSelector,
    isUiSchemaLoading: false,

    schema,

    FQN,
    SIGN,
    graphDefinition: uiSchemaActiveGraphDefintion,
    form: getEffectiveForm(),
    formContext: getFormContext(),
    setForm,

    canRefresh,
    isDataLoading: false,
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
  };
};
