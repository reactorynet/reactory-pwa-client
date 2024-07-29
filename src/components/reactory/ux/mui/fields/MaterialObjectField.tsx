
import React from "react";
import {
  IconButton,
  Icon,
} from '@mui/material';
import lodash from 'lodash';
import { useReactory } from "@reactory/client-core/api/ApiProvider";
import { ReactoryFormUtilities } from "@reactory/client-core/components/reactory/form/types";


export function DefaultObjectFieldTemplate(props: any) {
  const reactory  = useReactory();
  const utils = reactory.getComponent('core.ReactoryFormUtils') as ReactoryFormUtilities;
  
  const canExpand = function canExpand() {
    const { formData, schema, uiSchema } = props;
    if (!schema.additionalProperties) {
      return false;
    }
    const { expandable } = utils.getUiOptions(uiSchema);
    if (expandable === false) {
      return expandable;
    }
    // if ui:options.expandable was not explicitly set to false, we can add
    // another property if we have not exceeded maxProperties yet
    if (schema.maxProperties !== undefined) {
      return Object.keys(formData).length < schema.maxProperties;
    }
    return true;
  };

  const { TitleField, DescriptionField } = props;

  return (
    <fieldset>
      {(props.uiSchema["ui:title"] || props.title) && (
        <TitleField
          id={`${props.idSchema.$id}__title`}
          title={props.title || props.uiSchema["ui:title"]}
          required={props.required}
          formContext={props.formContext}
          style={props.uiSchema["ui:titleStyle"] || {}}
        />
      )}
      {props.description && (
        <DescriptionField
          id={`${props.idSchema.$id}__description`}
          description={props.description}
          formContext={props.formContext}
          style={props.uiSchema["ui:descriptionStyle"] || {}}
        />
      )}
      {props.properties.map(prop => prop.content)}
      {canExpand() && (
        <IconButton
          onClick={props.onAddClick(props.schema)}
          disabled={props.disabled || props.readonly}
          size="large">
          <Icon>add</Icon>
        </IconButton>
      )}
    </fieldset>
  );
}

class MaterialObjectFieldClass extends React.Component<any, any, any> {
  static defaultProps = {
    uiSchema: {},
    formData: {},
    errorSchema: {},
    idSchema: {},
    required: false,
    disabled: false,
    readonly: false,
  };

  utils: ReactoryFormUtilities
  
  constructor(props: any) { 
    super(props);
    this.state = { additionalProperties: {} };
    if(!props || !props.reactory) debugger;
    this.utils = props.reactory.getComponent('core.ReactoryFormUtilities') as ReactoryFormUtilities;
  }

  isRequired(name) {
    const schema = this.props.schema;
    return (
      Array.isArray(schema.required) && schema.required.indexOf(name) !== -1
    );
  }

  onPropertyChange = name => {
    
    return (value, errorSchema) => {

      this.props.formContext.reactory.log(`onPropertyChange ${name}`, {value})

      const newFormData = { ...this.props.formData, [name]: value };
      this.props.onChange(
        newFormData,
        errorSchema &&
        this.props.errorSchema && {
          ...this.props.errorSchema,
          [name]: errorSchema,
        }
      );
    };
  };

  getAvailableKey = (preferredKey, formData) => {
    var index = 0;
    var newKey = preferredKey;
    while (this.props.formData.hasOwnProperty(newKey)) {
      newKey = `${preferredKey}-${++index}`;
    }
    return newKey;
  };

  onKeyChange = oldValue => {
    return (value, errorSchema) => {
      value = this.getAvailableKey(value, this.props.formData);
      const newFormData = { ...this.props.formData };
      const property = newFormData[oldValue];
      delete newFormData[oldValue];
      newFormData[value] = property;
      this.props.onChange(
        newFormData,
        errorSchema &&
        this.props.errorSchema && {
          ...this.props.errorSchema,
          [value]: errorSchema,
        }
      );
    };
  };

  getDefaultValue(type) {
    switch (type) {
      case "string":
        return "New Value";
      case "array":
        return [];
      case "boolean":
        return false;
      case "null":
        return null;
      case "number":
        return 0;
      case "object":
        return {};
      default:
        // We don't have a datatype for some reason (perhaps additionalProperties was true)
        return "New Value";
    }
  }

  handleAddClick = schema => () => {
    const type = schema.additionalProperties.type;
    const newFormData = { ...this.props.formData };
    newFormData[
      this.getAvailableKey("newKey", newFormData)
    ] = this.getDefaultValue(type);
    this.props.onChange(newFormData);
  };

  render() {
    
    const {
      uiSchema,
      formData,
      errorSchema,
      idSchema,
      name,
      required,
      disabled,
      readonly,
      idPrefix,
      onBlur,
      onFocus,
      registry = this.utils.getDefaultRegistry(),
      onChange
    } = this.props;
    const { definitions, fields, formContext } = registry;
    const { SchemaField, TitleField, DescriptionField } = fields;
    const schema = this.utils.retrieveSchema(this.props.schema, definitions, formData);
    // const uiSchema = retrieve
    // this.props.formContext.reactory.log(`MaterialObjectField.render ${idSchema.id}`)

    const title = schema.title === undefined ? name : schema.title;
    const description = uiSchema["ui:description"] || schema.description;
    const widget = uiSchema["ui:widget"]

    let $props = {};

    if (uiSchema['ui:props']) {
      $props = { ...uiSchema['ui:props'] }
    }

    let orderedProperties;

    try {
      const properties = Object.keys(schema.properties);
      orderedProperties = this.utils.orderProperties(properties, uiSchema["ui:order"]);
    } catch (err) {
      return (
        <div>
          <p className="config-error" style={{ color: "red" }}>
            Invalid {name || "root"} object field configuration:
            <em>{err.message}</em>.
          </p>
          <pre>{JSON.stringify(schema)}</pre>
        </div>
      );
    }

    let Template = registry.ObjectFieldTemplate || DefaultObjectFieldTemplate;

    if (lodash.isString(widget) && lodash.isFunction(registry.widgets[widget])) {
      //console.log('Set new Template for schema object', Template);
      Template = registry.widgets[widget];

    }

    const templateProps = {
      title: uiSchema["ui:title"] || title,
      description,
      TitleField,
      DescriptionField,
      reactory: formContext.reactory,
      properties: orderedProperties.map(name => {
        return {
          content: (
            <SchemaField
              key={name}
              name={name}
              required={this.isRequired(name)}
              schema={schema.properties[name]}
              uiSchema={uiSchema[name]}
              errorSchema={errorSchema[name]}
              idSchema={idSchema[name]}
              idPrefix={idPrefix}
              formData={formData && formData[name] ? formData[name] : null}
              onKeyChange={this.onKeyChange(name)}
              onChange={this.onPropertyChange(name)}
              onBlur={onBlur}
              onFocus={onFocus}
              registry={registry}
              disabled={disabled}
              readonly={readonly}
            />
          ),
          name,
          readonly,
          disabled,
          required,
        };
      }),
      required,
      idSchema,
      uiSchema,
      schema,
      formData,
      formContext,
      onChange,
      ...$props
    };
    return <Template {...templateProps} onAddClick={this.handleAddClick} />;
  }
}

const MaterialObjectField: Reactory.Forms.ReactoryFieldComponent<object, Reactory.Schema.IObjectSchema, Reactory.Schema.IUISchema> = (props: any) => { 
  const reactory = useReactory();
  const nextProps = { ...props, reactory };
  return <MaterialObjectFieldClass { ...nextProps } />;
}

export default MaterialObjectField;
