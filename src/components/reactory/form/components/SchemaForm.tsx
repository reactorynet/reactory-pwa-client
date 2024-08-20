import React, { Component, ForwardRefRenderFunction } from "react";
import { default as DefaultErrorList } from "./ErrorList";
import {
  getDefaultFormState,
  retrieveSchema,
  toIdSchema,
  deepEquals,
  getDefaultRegistry,
  validateFormData,
  toErrorList
} from "../utils";
import { ErrorBoundary } from "@reactory/client-core/api/ErrorBoundary";
import { useReactory } from "@reactory/client-core/api";

import FormClass from './FormClass';

export type FormToolbarPosition = 'top' | 'bottom' | 'both' | 'none';
export interface ISchemaForm<TData, TError, TAdditionContext extends unknown[]> {
  idSchema?: Reactory.Schema.IDSchema,
  schema: Reactory.Schema.ISchema,
  uiSchema: Reactory.Schema.IUISchema,
  idPrefix?: string,
  errorSchema?: any,
  formData?: any,
  widgets?: {
    [key: string]: Reactory.Client.AnyValidComponent
  },
  fields?: object,
  ArrayFieldTemplate?: Reactory.Forms.ReactoryFieldComponent<any[]>,
  ObjectFieldTemplate?:  Reactory.Forms.ReactoryFieldComponent<any>,
  FieldTemplate?: Reactory.Forms.ReactoryFieldComponent<any>,
  ErrorList?: React.FC<any>,
  onBlur?: (...args: any) => void
  onFocus?: (...args: any) => void,
  onChange?: (formData: any) => any,
  onError?: (errors: any[], erroSchema?: any) => any,
  showErrorList?: boolean,
  onSubmit?: (form: any) => void,
  id?: string,
  className?: string,
  chilren?: any
  name?: string,
  method?: string,
  target?: string,
  action?: string,
  autocomplete?: string,
  enctype?: string,
  acceptcharset?: string,
  noValidate?: boolean,
  noHtml5Validate?: boolean,
  liveValidate?: boolean,
  toolbarPosition?: FormToolbarPosition,
  validate?: (formData: any, schema?: Reactory.Schema.ISchema, validationType?: string) => { errors: any, errorSchema: any },
  transformErrors?: (errors: any) => any,
  safeRenderCompletion?: boolean,
  formContext: Reactory.Forms.ReactoryFormContext<TData, TAdditionContext>,
  disabled?: boolean
  style?: any,  
  [key: string]: any
}


interface FormState {
  schema: Reactory.Schema.ISchema,
  uiSchema: Reactory.Schema.IUISchema,
  idSchema: Reactory.Schema.IDSchema,
  formData: any,
  edit: any,
  errors: any,
  errorSchema: any,
}

const Form: React.FC<ISchemaForm<any, any, unknown[]>> = (props) => {

  const formElement = React.useRef<HTMLFormElement | HTMLDivElement>(null);
  const reactory = useReactory();
  const {
    id,      
    formContext,
    container = 'form',
    ArrayFieldTemplate,
    FieldTemplate,
    ObjectFieldTemplate,
    acceptcharset,
    action,
    autocomplete,
    enctype,
    liveValidate,
    method,
    name,
    noHtml5Validate,            
    safeRenderCompletion,
    target,
    transformErrors,    
    children,
    className,
    schema,    
    idPrefix = 'root',
    disabled = false,
    uiSchema = {},
  } = props;

  reactory.debug('Form', { props });
  
  const [idSchema, setIdSchema] = React.useState<Reactory.Schema.IDSchema>({ $id: "root" });
  const [formData, setFormData] = React.useState<any>(null);
  const [edit, setEdit] = React.useState<boolean>(false);
  const [errors, setError] = React.useState<any[]>([])
  const [errorSchema, setErrorSchema] = React.useState<any>(null);


  React.useEffect(()=>{
    const $state = getStateFromProps(props);
    if (
      props.onChange && !deepEquals(props.formData, $state.formData)
    ) {
      props.onChange($state);
    }

  },[])
    
  React.useEffect(() => {

    const nextState = getStateFromProps(props);
    //TODO: ensure that data and schema are the only items compared before rerended
    if (
      !deepEquals(nextState.formData, props.formData) &&
      !deepEquals(nextState.formData, formData) && props.onChange
    ) {
      props.onChange(nextState);
    }
    
    setEdit(nextState.edit === true);
    setFormData(nextState.formData);
    setIdSchema(nextState.idSchema);
    setError(nextState.errors);    
    setErrorSchema(nextState.errorSchema);

  }, [props])


  const getRegistry = () => {
    // For BC, accept passed SchemaField and TitleField props and pass them to
    // the "fields" registry one.
    const defaultRegistry = getDefaultRegistry();
    let registery: any = {
      ...defaultRegistry,
      // fields: { ...fields, ...props.fields },
      // widgets: { ...widgets, ...props.widgets },
      // ArrayFieldTemplate,
      // ObjectFieldTemplate,
      // FieldTemplate,
      definitions: schema.definitions || {},
      formContext: formContext || {},
    };

    if (formContext) {
      registery.formContext.$formElement = formElement;
      registery.formContext.$submit = submit;
      registery.formContext.$formData = formData;
    }

    return registery;
  }

  const validate = (formData: any, schema: Reactory.Schema.ISchema = props.schema, via = 'onChange') => {
    const { definitions } = getRegistry();
    const resolvedSchema = retrieveSchema(schema, definitions, formData);
    return validateFormData(
      formData,
      resolvedSchema,
      props.validate,
      transformErrors,
      via
    );
  }

  const getStateFromProps = (props): FormState => {    
    
    const edit = typeof props.formData !== "undefined";    
    const mustValidate = edit && !props.noValidate && liveValidate;
    const { definitions } = schema;
    const formData = getDefaultFormState(schema, props.formData, definitions);
    const retrievedSchema = retrieveSchema(schema, definitions, formData);

    const validationResult = mustValidate ? validate(formData, schema) : {
      errors: errors || [],
      errorSchema: errorSchema || {},
    };

    const idSchema = toIdSchema(
      retrievedSchema,
      uiSchema["ui:rootFieldId"],
      definitions,
      formData,
      props.idPrefix
    );
    return {
      schema,
      uiSchema,
      idSchema,
      formData,
      edit,
      errors: validationResult.errors,
      errorSchema: validationResult.errorSchema,
    };
  }

  const onChange = (formData: any, newErrorSchema: any) => {
    const mustValidate = true; //!props.noValidate && props.liveValidate;    
    let $errorSchema = null;
    let $errors = null;
    if (mustValidate) {
      const validationResult = validate(formData);
      $errorSchema = validationResult.errorSchema || {};
      $errors = validationResult.errors || [];      
    } else if (!props.noValidate && newErrorSchema) {      
      $errors = toErrorList(newErrorSchema);
      $errorSchema = newErrorSchema;      
    }
    
    setError($errors || []);
    setErrorSchema($errorSchema || {});

    if(props.onChange) {
      props.onChange({  
        schema,
        uiSchema,
        idSchema,
        formData,
        edit,
        errors: $errors,
        errorSchema: $errorSchema,
      })
    } 
  };

  const renderErrors = () => {
    
    const { ErrorList, showErrorList, formContext } = props;

    if (errors.length && showErrorList != false) {
      return (<ErrorList errors={errors}
        errorSchema={errorSchema}
        schema={schema}
        uiSchema={uiSchema}
        formContext={formContext} />
      );
    }
    return null;
  }

  const onBlur = (...args) => {
    if (props.onBlur) {
      props.onBlur(...args);
    }
  };

  const onFocus = (...args) => {
    if (props.onFocus) {
      props.onFocus(...args);
    }
  };

  const onSubmit = (event) => {
    if (event) event.preventDefault();

    if (!props.noValidate) {
      const { errors, errorSchema } = validate(formData, props.schema, 'submit');
      if (Object.keys(errors).length > 0) {
        setErrorSchema(errorSchema);
        setError(errors);
        
        if(props.onError) props.onError(errors, errorSchema)        
        return;
      }
    }

    setError([]);
    setErrorSchema({});
    if(props.onSubmit) props.onSubmit({ schema, uiSchema, formData, errorSchema, errors, status: "submitted" })        
  };



  const submit = () => {    

    let submitted = false;
    if (formElement) {      
      formElement.current.dispatchEvent(new Event("submit", { cancelable: true }));      
      submitted = true;
    }    

    return submitted;
  }
  
  const registry = getRegistry();
  const { SchemaField } = registry.fields;

  if (!SchemaField) { 
    return <div>SchemaField not found in registry</div>
  }

  let componentType = 'form';
  let formUiOptions: any = {};
  let style = props.style || {}

  if (uiSchema['ui:options']) {
    formUiOptions = uiSchema['ui:options'];
    componentType = formUiOptions.componentType || componentType;
    style = formUiOptions.style ? { ...style, ...formUiOptions.style } : style;
  }

    return (
      <div
        className={className ? className : undefined}
        id={id}
        ref={(form: HTMLDivElement) => {
          formElement.current = form;
        }}>
        <ErrorBoundary FallbackComponent={(props) => (<>{idSchema.$id} Field Error: {props.error}</>)}>
        {renderErrors()}
        {props.toolbarPosition && props.toolbarPosition.indexOf('top') >= 0 ? (children) : null}
        <SchemaField
          schema={schema}
          uiSchema={uiSchema}
          errorSchema={props.errorSchema}
          idSchema={idSchema}
          idPrefix={idPrefix}
          formData={formData}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          registry={registry}
          safeRenderCompletion={safeRenderCompletion}
          disabled={disabled} />
          {props.toolbarPosition && props.toolbarPosition.indexOf('bottom') >= 0 ? (children) : null}
        </ErrorBoundary>
      </div>);


}

export default Form;