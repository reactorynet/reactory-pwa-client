import React, { Component, ForwardRefRenderFunction } from "react";
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
import { useReactory } from "@reactory/client-core/api";
import { Html } from "@mui/icons-material";

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

export default FormClass;