
import React from "react";
import { useReactory } from "@reactory/client-core/api/ApiProvider";
import { ReactoryFormUtilities } from "../../types";
// @ts-ignore
export const useRegistry: Reactory.Forms.ReactorySchemaUtitlitiesHook = (props) => {
  const reactory = useReactory();
  const utils = reactory.getComponent<ReactoryFormUtilities>("core.ReactoryFormUtilities");
  const registry = utils.getDefaultRegistry();
  const {
    schema,
    uiSchema,
    idSchema,
    required,
    formContext,
    errorSchema,
    disabled,
    formData,
  } = props;

  const {
    title,
    description,
  } = schema;

  const uiOptions: Reactory.Schema.IUISchemaOptions = uiSchema["ui:options"] as Reactory.Schema.IUISchemaOptions;
  /**
   * The component types that is inferred
   * from the schema field type.
   */
  const COMPONENT_TYPES = {
    array: "ArrayField",
    boolean: "BooleanField",
    integer: "NumberField",
    number: "NumberField",
    object: "ObjectField",
    string: "StringField",
    date: "DateField"
  };

  const getFieldComponent = (returnNullComponent: boolean = false, uiSchemaField = "ui:field"): React.ComponentType<any> => {
    if (uiSchemaField.indexOf('.') > -1) { 
      return reactory.getComponent(uiSchemaField);
    }
  
    const field = uiSchema[uiSchemaField];
    if (typeof field === "function") {
      return field as React.ComponentType<any>;
    }
    if (typeof field === "string" && field.indexOf('.') > -1) {      
      return reactory.getComponent(field);
    }
    if (typeof field === "string" && field in registry.fields) {
      return registry.fields[field] as React.ComponentType<any>;
    }
    if (typeof field === "string" && field in registry.widgets) { 
      return registry.widgets[field] as React.ComponentType<any>;
    }

    // fallback to the default field types
    const componentName = COMPONENT_TYPES[utils.getSchemaType(schema)];
    if (componentName in registry.fields) {
      return registry.fields[componentName] as React.ComponentType<any>;
    }

    if (returnNullComponent === true) return () => null;
    // @ts-ignore
    const UnsupportedField = registry.fields.UnsupportedField;

    return ({schema, idSchema}) => <UnsupportedField
        schema={schema}
        idSchema={idSchema}
        reason={`Unknown field type ${schema.type}`}
      />
  }

  const getTitleField = (): React.ComponentType<any> => {
    if (!title) return () => null;
    if (uiOptions?.showTitle === false) return null;
    let TitleComponent: React.ComponentType<any> = registry.fields.TitleField;
    let titleFieldProps: any = {
      id: `${idSchema.$id}__title`,
      title,
      required,
      formContext,
      style: {}
    }

    if (uiSchema["ui:title"]) {
      if (typeof uiSchema["ui:title"] === "string") {
        // if we have a string title, we check if it contains
        // a FQN of a component to render
        TitleComponent = getFieldComponent(true, "ui:title");
      } else if (typeof uiSchema["ui:title"] === "object") {
        const {
          title: uiTitle,
          field,
          fieldOptions = {},
          icon,
          iconOptions
        } = uiSchema["ui:title"] as Reactory.Schema.UITitleFieldOptions;

        if (field) {
          TitleComponent = getFieldComponent(true, field);
          titleFieldProps = { ...titleFieldProps, ...fieldOptions }
        }

        if (icon) {
          titleFieldProps.icon = icon;
          titleFieldProps.iconOptions = iconOptions;
        }

        if (uiTitle) {
          titleFieldProps.title = uiTitle;
        }
      }
    }

    // if for some reason our resolver returns a null component
    // we set the default title field
    if (TitleComponent === null) TitleComponent = registry.fields.TitleField;

    return () => (
      <TitleComponent {...titleFieldProps} />
    );
  }

  const getDescriptionField = (): React.ComponentType<any> => {
    if (!description) return () => null;
    if (uiOptions?.showDescription === false) return () => null;
    let DescriptionComponent = registry.fields.DescriptionField;

    let descriptionFieldProps: any = {
      id: `${idSchema.$id}__description`,
      description,
      formContext,
      style: {}
    }

    if (uiSchema["ui:description"]) {
      if (typeof uiSchema["ui:description"] === "string") {
        // if we have a string title, we check if it contains
        // a FQN of a component to render
        DescriptionComponent = getFieldComponent(true, "ui:description");
      } else if (typeof uiSchema["ui:description"] === "object") {
        const {
          title: uiDescription,
          field,
          fieldOptions = {},
          icon,
          iconOptions
        } = uiSchema["ui:description"] as Reactory.Schema.UIDescriptionFieldOptions;

        if (field) {
          DescriptionComponent = getFieldComponent(true, field);
          descriptionFieldProps = { ...descriptionFieldProps, ...fieldOptions }
        }

        if (icon) {
          descriptionFieldProps.icon = icon;
          descriptionFieldProps.iconOptions = iconOptions;
        }

        if (uiDescription) {
          descriptionFieldProps.description = uiDescription;
        }
      }
    }

    // if for some reason our resolver returns a null component
    // we set the default description field
    if (DescriptionComponent === null) DescriptionComponent = registry.fields.DescriptionField

    return () => (<DescriptionComponent {...descriptionFieldProps} />);
  }

  const getErrorField = (): React.ComponentType<any> => {
    if (!errorSchema) return null;
    let ErrorComponent = registry.fields.ErrorField as React.ComponentType<any>;

    let errorFieldProps: any = {
      id: `${idSchema.$id}__error`,
      errorSchema,
      formContext,
      style: {}
    }

    if (uiSchema["ui:error"]) {
      if (typeof uiSchema["ui:error"] === "string") {
        // if we have a string title, we check if it contains
        // a FQN of a component to render
        ErrorComponent = getFieldComponent(true, "ui:error");
      } else if (typeof uiSchema["ui:error"] === "object") {
        const {
          title: uiError,
          field,
          fieldOptions = {},
          icon,
          iconOptions
        } = uiSchema["ui:error"] as Reactory.Schema.UIErrorFieldOptions;

        if (field) {
          ErrorComponent = getFieldComponent(true, field);
          errorFieldProps = { ...errorFieldProps, ...fieldOptions }
        }

        if (icon) {
          errorFieldProps.icon = icon;
          errorFieldProps.iconOptions = iconOptions;
        }

        if (uiError) {
          errorFieldProps.errorSchema = uiError;
        }
      }
    }

    return () => (<ErrorComponent {...errorFieldProps } />);
  }

  return {
    DescriptionField: getDescriptionField(),
    TitleField: getTitleField(),
    ErrorField: getErrorField(),
    Field: getFieldComponent()
  };
}