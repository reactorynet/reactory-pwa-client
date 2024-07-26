import React, { Component } from "react";
import { default as DefaultErrorList } from "./ErrorList";
import {
  getDefaultFormState,
  retrieveSchema,
  shouldRender,
  toIdSchema,
  setState,
  deepEquals,
  getDefaultRegistry,
  validateFormData,
  toErrorList
} from "../utils";
import { ErrorBoundary } from "@reactory/client-core/api/ErrorBoundary";
import templates from './templates';

// Make modifications to the theme with your own fields and widgets




class FormClass extends Component<any, any> {

  formElement: any;
  $formElement: any;

  static defaultProps = {
    uiSchema: {},
    noValidate: false,
    liveValidate: false,
    disabled: false,
    safeRenderCompletion: false,
    noHtml5Validate: false,
    ErrorList: DefaultErrorList,
  };

  constructor(props) {
    super(props);
    this.state = this.getStateFromProps(props);
    if (
      this.props.onChange &&
      !deepEquals(this.state.formData, this.props.formData)
    ) {
      this.props.onChange(this.state);
    }
    this.formElement = null;
  }

  UNSAFE_componentWillReceiveProps(nextProps) {

    const nextState = this.getStateFromProps(nextProps);
    //TODO: ensure that data and schema are the only items compared before rerended
    if (
      !deepEquals(nextState.formData, nextProps.formData) &&
      !deepEquals(nextState.formData, this.state.formData) &&
      !deepEquals(nextProps.formContext, this.props.formContext) &&
      this.props.onChange
    ) {
      this.props.onChange(nextState);
    }
    this.setState(nextState);
  }

  getStateFromProps(props) {
    const state = this.state || {};
    const schema = "schema" in props ? props.schema : this.props.schema;
    const uiSchema = "uiSchema" in props ? props.uiSchema : this.props.uiSchema;
    const edit = typeof props.formData !== "undefined";
    const liveValidate = props.liveValidate || this.props.liveValidate;
    const mustValidate = edit && !props.noValidate && liveValidate;
    const { definitions } = schema;
    const formData = getDefaultFormState(schema, props.formData, definitions);
    const retrievedSchema = retrieveSchema(schema, definitions, formData);

    const { errors, errorSchema } = mustValidate
      ? this.validate(formData, schema)
      : {
        errors: state.errors || [],
        errorSchema: state.errorSchema || {},
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
      errors,
      errorSchema,
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    //return false;
    return shouldRender(this, nextProps, nextState);
    
  }

  validate(formData, schema = this.props.schema, via = 'onChange') {
    const { validate, transformErrors } = this.props;
    const { definitions } = this.getRegistry();
    const resolvedSchema = retrieveSchema(schema, definitions, formData);
    return validateFormData(
      formData,
      resolvedSchema,
      validate,
      transformErrors,
      via
    );
  }

  renderErrors() {
    const { errors, errorSchema, schema, uiSchema } = this.state;
    const { ErrorList, showErrorList, formContext } = this.props;

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

  onChange = (formData, newErrorSchema) => {
    const mustValidate = !this.props.noValidate && this.props.liveValidate;
    let state: any = { formData };
    if (mustValidate) {
      const { errors, errorSchema } = this.validate(formData);
      state = { ...state, errors, errorSchema };
    } else if (!this.props.noValidate && newErrorSchema) {

      state = {
        ...state,
        errorSchema: newErrorSchema,
        errors: toErrorList(newErrorSchema),
      };
    }

    setState(this, state, () => {
      if (this.props.onChange) {
        this.props.onChange(this.state);
      }
    });
  };

  onBlur = (...args) => {
    if (this.props.onBlur) {
      this.props.onBlur(...args);
    }
  };

  onFocus = (...args) => {
    if (this.props.onFocus) {
      this.props.onFocus(...args);
    }
  };

  onSubmit = event => {
    if (event) event.preventDefault();

    if (!this.props.noValidate) {
      const { errors, errorSchema } = this.validate(this.state.formData, this.props.schema, 'submit');
      if (Object.keys(errors).length > 0) {
        setState(this, { errors, errorSchema }, () => {
          if (this.props.onError) {
            this.props.onError(errors);
          }
        });
        return;
      }
    }

    this.setState({ errors: [], errorSchema: {} }, () => {
      if (this.props.onSubmit) {
        this.props.onSubmit({ ...this.state, status: "submitted" });
      }
    });
  };

  getRegistry() {
    // For BC, accept passed SchemaField and TitleField props and pass them to
    // the "fields" registry one.
    const { fields, widgets } = getDefaultRegistry();
    let registery = {
      fields: { ...fields, ...this.props.fields },
      widgets: { ...widgets, ...this.props.widgets },
      ArrayFieldTemplate: this.props.ArrayFieldTemplate || templates.MaterialArrayFieldTemplate,
      ObjectFieldTemplate: this.props.ObjectFieldTemplate || templates.MaterialObjectTemplate,
      FieldTemplate: this.props.FieldTemplate || templates.MaterialFieldTemplate,
      definitions: this.props.schema.definitions || {},
      formContext: this.props.formContext || {},
    };

    if (this.props.formContext) {
      registery.formContext.$formElement = this.formElement;
      registery.formContext.$submit = this.submit;
      registery.formContext.$formData = this.state && this.state.formData ? this.state.formData : {};
    }

    return registery;
  }

  submit() {
    let submitted = false;
    if (this.formElement) {
      this.formElement.dispatchEvent(new Event("submit", { cancelable: true }));
      submitted = true;
    }

    if (this.$formElement && submitted === false) {
      this.$formElement.dispatchEvent(new Event("submit", { cancelable: true }));
      submitted = true;
    }

    return submitted;
  }

  render() {
    const {
      children,
      safeRenderCompletion,
      id,
      idPrefix,
      className,
      name,
      method,
      target,
      action,
      autocomplete,
      enctype,
      acceptcharset,
      noHtml5Validate,
      disabled,
      toolbarPosition = 'bottom',
    } = this.props;

    const { schema, uiSchema, formData, errorSchema, idSchema } = this.state;
    const registry = this.getRegistry();
    const _SchemaField = registry.fields.SchemaField;

    let componentType = 'form';
    let formUiOptions: any = {};
    let style = this.props.style || {}

    if (uiSchema['ui:options']) {
      formUiOptions = uiSchema['ui:options'];
      componentType = formUiOptions.componentType || componentType;
      style = formUiOptions.style ? { ...style, ...formUiOptions.style } : style;
    }

    const $children = (<>
      {this.renderErrors()}
      {toolbarPosition.indexOf('top') >= 0 ? (children) : null}
      <ErrorBoundary FallbackComponent={(props) => (<>{idSchema.$id} Field Error: {props.error}</>)}>
        <_SchemaField
          schema={schema}
          uiSchema={uiSchema}
          errorSchema={errorSchema}
          idSchema={idSchema}
          idPrefix={idPrefix}
          formData={formData}
          onChange={this.onChange}
          onBlur={this.onBlur}
          onFocus={this.onFocus}
          registry={registry}
          safeRenderCompletion={safeRenderCompletion}
          disabled={disabled} />
      </ErrorBoundary>
      {toolbarPosition.indexOf('bottom') >= 0 ? (children) : null}</>)

    if (componentType === 'form') {
      return (
        <form
          className={className}
          id={id}
          key={id}
          name={name}
          method={method}
          target={target}
          action={action}
          autoComplete={autocomplete}
          encType={enctype}
          acceptCharset={acceptcharset}
          noValidate={noHtml5Validate}
          onSubmit={this.onSubmit}
          style={style}
          ref={form => {
            this.formElement = form;
          }}>
          {$children}
        </form>
      );
    }

    if (componentType === 'div') {
      //@ts-ignore
      return (<div
        className={className ? className : null}
        id={id}
        ref={form => {
          this.formElement = form;
        }}>
        {$children}
      </div>)
    }

  }
}

export interface ISchemaForm {
  idSchema?: Reactory.Schema.IDSchema,
  schema: Reactory.Schema.ISchema,
  uiSchema: Reactory.Schema.IUISchema,
  idPrefix?: string,
  errorSchema?: any,
  formData?: any,
  widgets?: {
    [key: string]: React.Component | React.FC | React.PureComponent
  },
  fields?: object,
  ArrayFieldTemplate?: () => any,
  ObjectFieldTemplate?: () => any,
  FieldTemplate?: () => any,
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
  toolbarPosition?: string
  validate?: (formData: any, schema?: Reactory.Schema.ISchema, validationType?: string) => { errors: any, errorSchema: any },
  transformErrors?: (errors: any) => any,
  safeRenderCompletion?: boolean,
  formContext: object,
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

// const Form: React.FC<ISchemaForm> = (props) => {

//   const formElement = React.forwardRef<HTMLFormElement | HTMLDivElement>();
  
//   //let $formElement: any;

//   const reactory = useReactory();

//     //   static defaultProps = {
//   //   uiSchema: {},
//   //   noValidate: false,
//   //   liveValidate: false,
//   //   disabled: false,
//   //   safeRenderCompletion: false,
//   //   noHtml5Validate: false,
//   //   ErrorList: DefaultErrorList,
//   // };

//   const {
//     id,      
//     formContext,
//     ArrayFieldTemplate,
//     FieldTemplate,
//     ObjectFieldTemplate,
//     acceptcharset,
//     action,
//     autocomplete,
//     enctype,
//     liveValidate,
//     method,
//     name,
//     noHtml5Validate,            
//     safeRenderCompletion,
//     target,
//     transformErrors,    
//     children,
//     className,
//     schema,    
//     idPrefix = 'root',
//     disabled = false,
//     uiSchema = {},
//   } = props;
    
//   const [idSchema, setIdSchema] = React.useState<Reactory.Schema.IDSchema>({ $id: "root" });
//   const [formData, setFormData] = React.useState<any>(null);
//   const [edit, setEdit] = React.useState<boolean>(false);
//   const [errors, setError] = React.useState<any[]>([])
//   const [errorSchema, setErrorSchema] = React.useState<any>(null);


//   React.useEffect(()=>{
//     const $state = getStateFromProps(props);
//     if (
//       props.onChange && !deepEquals(props.formData, $state.formData)
//     ) {
//       props.onChange($state);
//     }

//   },[])
    
//   React.useEffect(() => {

//     const nextState = getStateFromProps(props);
//     //TODO: ensure that data and schema are the only items compared before rerended
//     if (
//       !deepEquals(nextState.formData, props.formData) &&
//       !deepEquals(nextState.formData, formData) && props.onChange
//     ) {
//       props.onChange(nextState);
//     }
    
//     setEdit(nextState.edit === true);
//     setFormData(nextState.formData);
//     setIdSchema(nextState.idSchema);
//     setError(nextState.errors);    
//     setErrorSchema(nextState.errorSchema);

//   }, [props])


//   const getRegistry = () => {
//     // For BC, accept passed SchemaField and TitleField props and pass them to
//     // the "fields" registry one.
//     const { fields, widgets } = getDefaultRegistry();
//     let registery: any = {
//       fields: { ...fields, ...props.fields },
//       widgets: { ...widgets, ...props.widgets },
//       ArrayFieldTemplate,
//       ObjectFieldTemplate,
//       FieldTemplate,
//       definitions: schema.definitions || {},
//       formContext: formContext || {},
//     };

//     if (formContext) {
//       registery.formContext.$formElement = formElement;
//       registery.formContext.$submit = submit;
//       registery.formContext.$formData = formData;
//     }

//     return registery;
//   }

//   const validate = (formData: any, schema: Reactory.Schema.ISchema = props.schema, via = 'onChange') => {
//     const { definitions } = getRegistry();
//     const resolvedSchema = retrieveSchema(schema, definitions, formData);
//     return validateFormData(
//       formData,
//       resolvedSchema,
//       props.validate,
//       transformErrors,
//       via
//     );
//   }

//   const getStateFromProps = (props): FormState => {    
    
//     const edit = typeof props.formData !== "undefined";    
//     const mustValidate = edit && !props.noValidate && liveValidate;
//     const { definitions } = schema;
//     const formData = getDefaultFormState(schema, props.formData, definitions);
//     const retrievedSchema = retrieveSchema(schema, definitions, formData);

//     const validationResult = mustValidate ? validate(formData, schema) : {
//       errors: errors || [],
//       errorSchema: errorSchema || {},
//     };

//     const idSchema = toIdSchema(
//       retrievedSchema,
//       uiSchema["ui:rootFieldId"],
//       definitions,
//       formData,
//       props.idPrefix
//     );
//     return {
//       schema,
//       uiSchema,
//       idSchema,
//       formData,
//       edit,
//       errors: validationResult.errors,
//       errorSchema: validationResult.errorSchema,
//     };
//   }


//   const onChange = (formData: any, newErrorSchema: any) => {
//     const mustValidate = !props.noValidate && props.liveValidate;    
//     let $errorSchema = null;
//     let $errors = null;
//     if (mustValidate) {
//       const validationResult = validate(formData);
//       $errorSchema = validationResult.errorSchema || {};
//       $errors = validationResult.errors || [];      
//     } else if (!props.noValidate && newErrorSchema) {      
//       $errors = toErrorList(newErrorSchema);
//       $errorSchema = newErrorSchema;      
//     }
    
//     setError($errors || []);
//     setErrorSchema($errorSchema || {});

//     if(props.onChange) {
//       props.onChange({  
//         schema,
//         uiSchema,
//         idSchema,
//         formData,
//         edit,
//         errors: $errors,
//         errorSchema: $errorSchema,
//       })
//     } 
//   };

//   const renderErrors = () => {
    
//     const { ErrorList, showErrorList, formContext } = props;

//     if (errors.length && showErrorList != false) {
//       return (<ErrorList errors={errors}
//         errorSchema={errorSchema}
//         schema={schema}
//         uiSchema={uiSchema}
//         formContext={formContext} />
//       );
//     }
//     return null;
//   }



//   const onBlur = (...args) => {
//     if (props.onBlur) {
//       props.onBlur(...args);
//     }
//   };

//   const onFocus = (...args) => {
//     if (props.onFocus) {
//       props.onFocus(...args);
//     }
//   };

//   const onSubmit = (event) => {
//     if (event) event.preventDefault();

//     if (!props.noValidate) {
//       const { errors, errorSchema } = validate(formData, props.schema, 'submit');
//       if (Object.keys(errors).length > 0) {
//         setErrorSchema(errorSchema);
//         setError(errors);
        
//         if(props.onError) props.onError(errors, errorSchema)        
//         return;
//       }
//     }

//     setError([]);
//     setErrorSchema({});
//     if(props.onSubmit) props.onSubmit({ schema, uiSchema, formData, errorSchema, errors, status: "submitted" })        
//   };



//   const submit = () => {    

//     let submitted = false;
//     if (formElement) {      
//       formElement.current.dispatchEvent(new Event("submit", { cancelable: true }));      
//       submitted = true;
//     }    

//     return submitted;
//   }
  
//   const registry = getRegistry();
//   const _SchemaField = registry.fields.SchemaField;

//   let componentType = 'form';
//   let formUiOptions: any = {};
//   let style = props.style || {}

//   if (uiSchema['ui:options']) {
//     formUiOptions = uiSchema['ui:options'];
//     componentType = formUiOptions.componentType || componentType;
//     style = formUiOptions.style ? { ...style, ...formUiOptions.style } : style;
//   }

//   const $children = (<>
//     {renderErrors()}
//     {props.toolbarPosition && props.toolbarPosition.indexOf('top') >= 0 ? (children) : null}
//     <ErrorBoundary FallbackComponent={(props) => (<>{idSchema.$id} Field Error: {props.error}</>)}>
//       <_SchemaField
//         schema={schema}
//         uiSchema={uiSchema}
//         errorSchema={props.errorSchema}
//         idSchema={idSchema}
//         idPrefix={idPrefix}
//         formData={formData}
//         onChange={onChange}
//         onBlur={onBlur}
//         onFocus={onFocus}
//         registry={registry}
//         safeRenderCompletion={safeRenderCompletion}
//         disabled={disabled} />
//     </ErrorBoundary>
//     {props.toolbarPosition && props.toolbarPosition.indexOf('bottom') >= 0 ? (children) : null}
//     </>);

//   // if (componentType === 'form') {
//   //   return (
//   //     <form
//   //       className={className}
//   //       id={id}
//   //       name={name}
//   //       method={method}
//   //       target={target}
//   //       action={action}
//   //       autoComplete={autocomplete}
//   //       encType={enctype}
//   //       acceptCharset={acceptcharset}
//   //       noValidate={noHtml5Validate}
//   //       onSubmit={onSubmit}
//   //       style={style}
//   //       ref={(form: HTMLFormElement) => {
//   //         formElement.current = form;
//   //       }}>
//   //       {$children}
//   //     </form>
//   //   );
//   // }

//   // if (componentType === 'div') {
//   //   //@ts-ignore
//     return (<div
//       className={className ? className : null}
//       id={id}
//       ref={(form: HTMLDivElement) => {
//         formElement.current = form;
//       }}>
//       {$children}
//     </div>)
//   //}

// }




export default FormClass;