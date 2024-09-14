
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
  const utils = reactory.getComponent('core.ReactoryFormUtilities') as ReactoryFormUtilities;
  
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

const MaterialObjectField: Reactory.Forms.ReactoryObjectFieldComponent = (props) => { 
  const reactory = useReactory();
  const utils = reactory.getComponent('core.ReactoryFormUtilities') as ReactoryFormUtilities;
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
    registry = utils.getDefaultRegistry(),
    onChange,
  } = props;


  const isRequired = (name) => {
    const schema = props.schema;
    return (
      Array.isArray(schema.required) && schema.required.indexOf(name) !== -1
    );
  };

  const onPropertyChange = name => {
    return (value: any, errorSchema: Reactory.Schema.IErrorSchema) => {
      reactory.debug(`onPropertyChange ${name}`, { value });
      let nextFormData = {};
      if (formData) {
        nextFormData = { ...formData };
      }
      nextFormData[name] = value;
      onChange(
        nextFormData,
        errorSchema &&
        errorSchema && {
          ...errorSchema,
          [name]: errorSchema,
        }
      );
    };
  };

  const getAvailableKey = (preferredKey, formData) => {
    var index = 0;
    var newKey = preferredKey;
    while (formData.hasOwnProperty(newKey)) {
      newKey = `${preferredKey}-${++index}`;
    }
    return newKey;
  };

  const onKeyChange = (oldValue) => {
    return (value, errorSchema) => {
      value = getAvailableKey(value, formData);
      const newFormData = { ...formData };
      const property = newFormData[oldValue];
      delete newFormData[oldValue];
      newFormData[value] = property;
      onChange(
        newFormData,
        errorSchema &&
        errorSchema && {
          ...errorSchema,
          [value]: errorSchema,
        }
      );
    };
  };

  const getDefaultValue = (type: string) => {
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

  const handleAddClick = () => {
    const type: string = schema.additionalProperties.type as string;
    const newFormData = { ...formData };
    newFormData[
      getAvailableKey("newKey", newFormData)
    ] = getDefaultValue(type);
    onChange(newFormData);
  };

  const { definitions, fields, formContext } = registry;
  const { SchemaField, TitleField, DescriptionField } = fields;
  const schema = utils.retrieveSchema(props.schema, definitions, formData);
  
  let titleOptions = { formData, formContext, reactory };
  if (uiSchema["ui:title"] && typeof uiSchema["ui:title"] === 'string') { 
    schema.title = uiSchema["ui:title"];
  } else if (uiSchema["ui:title"] && typeof uiSchema["ui:title"] === 'object') { 
    if (typeof uiSchema["ui:title"].title === "string") schema.title = uiSchema["ui:title"].title;
    if (typeof uiSchema["ui:title"].title === "object") { 
      schema.title = uiSchema["ui:title"].title.key;
      titleOptions = { ...titleOptions, ...uiSchema["ui:title"].title.options };
    }    
  }

  let descriptionOptions = { formData, formContext, reactory };
  if (uiSchema["ui:description"] && typeof uiSchema["ui:description"] === 'string') { 
    schema.description = uiSchema["ui:description"];
  } else if (uiSchema["ui:description"] && typeof uiSchema["ui:description"] === 'object') { 
    if (typeof uiSchema["ui:description"].title === "string") schema.description = uiSchema["ui:description"].title;
    if (typeof uiSchema["ui:description"].title === "object") { 
      schema.description = uiSchema["ui:description"].title.key;
      descriptionOptions = { ...descriptionOptions, ...uiSchema["ui:description"].title.options };
    }
  }

  const title = reactory.i18n.t(schema.title, titleOptions);
  const description = reactory.i18n.t(schema.description, descriptionOptions);
  const widget = uiSchema["ui:widget"]

  let $props = {};

  if (uiSchema['ui:props']) {
    $props = { ...uiSchema['ui:props'] }
  }

  let orderedProperties;

  try {
    const properties = Object.keys(schema.properties);
    orderedProperties = utils.orderProperties(properties, uiSchema["ui:order"]);
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

  const templateProps = {
    title,
    description,
    TitleField,
    DescriptionField,
    reactory: reactory,
    properties: orderedProperties.map(name => {
      return {
        content: (
          <SchemaField
            key={name}
            name={name}
            required={isRequired(name)}
            schema={schema.properties[name]}
            uiSchema={uiSchema[name] as Reactory.Schema.IUISchema}
            errorSchema={errorSchema[name]}
            idSchema={idSchema[name]}
            idPrefix={idPrefix}
            formData={formData && formData[name] ? formData[name] : null}
            onKeyChange={onKeyChange(name)}
            onChange={onPropertyChange(name)}
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

  let Template = registry.templates.ObjectTemplate;

  if (!Template) { 
    return (<>Check registry has ObjectFieldTemplate</>)
  }

  if (typeof widget === 'string' ) {
    if (widget.indexOf('.') > -1) {
      Template = reactory.getComponent(widget);
      if (!Template) {
        const WaitingForLoad = reactory.getComponent('core.NotFound@1.0.0') as React.FC<any>;
        return <WaitingForLoad 
          waitingFor={widget}
          args={templateProps} 
          />;
      }
    }  
    if (!Template && registry.widgets[widget]) {
      // @ts-ignore
      Template = registry.widgets[widget];
    }
  }

  if (typeof widget === 'function') { 
    Template = widget;
  }

  // @ts-ignore
  return <Template {...templateProps} onAddClick={handleAddClick} />;
}

export default MaterialObjectField;
