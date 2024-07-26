import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";
import  UnsupportedField from "@reactory/client-core/components/reactory/form/components/fields/UnsupportedField";
import { ErrorBoundary } from "@reactory/client-core/api/ErrorBoundary";
import { ReactoryFormUtilities } from "components/reactory/form/types";
import { useReactory, withReactory } from "@reactory/client-core/api/ApiProvider";

const REQUIRED_FIELD_SYMBOL = "*";

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

function getFieldComponent(schema, uiSchema = {}, idSchema, fields, utils: ReactoryFormUtilities) {
  const field = uiSchema["ui:field"];
  if (typeof field === "function") {
    return field;
  }
  if (typeof field === "string" && field in fields) {
    return fields[field];
  }

  const componentName = COMPONENT_TYPES[utils.getSchemaType(schema)];
  return componentName in fields
    ? fields[componentName]
    : () => {
        return (
          <UnsupportedField
            schema={schema}
            idSchema={idSchema}
            reason={`Unknown field type ${schema.type}`}
          />
        );
      };
}

function Label(props) {
  const { label, required, id } = props;
  if (!label) {
    // See #312: Ensure compatibility with old versions of React.
    return <div />;
  }
  return (
    <label className="control-label" htmlFor={id}>
      {label}
      {required && <span className="required">{REQUIRED_FIELD_SYMBOL}</span>}
    </label>
  );
}

function LabelInput(props) {
  const { id, label, onChange } = props;
  return (
    <input
      className="form-control"
      type="text"
      id={id}
      onBlur={event => onChange(event.target.value)}
      defaultValue={label}
    />
  );
}

function Help(props) {
  const { help } = props;
  if (!help) {
    // See #312: Ensure compatibility with old versions of React.
    return <div />;
  }
  if (typeof help === "string") {
    return <p className="help-block">{help}</p>;
  }
  return <div className="help-block">{help}</div>;
}

function ErrorList(props) {
  const { errors = [] } = props;
  if (errors.length === 0) {
    return <div />;
  }
  return (
    <div>
      <p />
      <ul className="error-detail bs-callout bs-callout-info">
        {errors.map((error, index) => {
          return (
            <li className="text-danger" key={index}>
              {error}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DefaultTemplate(props) {
  const utils = props.reactory.getComponent('core.ReactoryFormUtilities');
  const {
    id,
    classNames,
    label,
    children,
    errors,
    help,
    description,
    hidden,
    required,
    displayLabel,
    onKeyChange,
  } = props;
  if (hidden) {
    return children;
  }
  const additional = props.schema.hasOwnProperty(utils.ADDITIONAL_PROPERTY_FLAG);
  const keyLabel = `${label} Key`;

  return (
    <div key={props.key || props.id || props.idSchema.id} className={classNames}>
      {additional && (
        <div className="form-group">
          <Label label={keyLabel} required={required} id={`${id}-key`} />
          <LabelInput
            label={label}
            required={required}
            id={`${id}-key`}
            onChange={onKeyChange}
          />
        </div>
      )}
      {displayLabel && <Label label={label} required={required} id={id} />}
      {displayLabel && description ? description : null}
      {children}
      {errors}
      {help}
    </div>
  );
}

if (process.env.NODE_ENV !== "production") {
  DefaultTemplate.propTypes = {
    id: PropTypes.string,
    classNames: PropTypes.string,
    label: PropTypes.string,
    children: PropTypes.node.isRequired,
    errors: PropTypes.element,
    rawErrors: PropTypes.arrayOf(PropTypes.string),
    help: PropTypes.element,
    rawHelp: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    description: PropTypes.element,
    rawDescription: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    hidden: PropTypes.bool,
    required: PropTypes.bool,
    readonly: PropTypes.bool,
    displayLabel: PropTypes.bool,
    fields: PropTypes.object,
    formContext: PropTypes.object,
  };
}

DefaultTemplate.defaultProps = {
  hidden: false,
  readonly: false,
  required: false,
  displayLabel: true,
};

function SchemaFieldRender(props) {
  const reactory = useReactory();
  const utils = reactory.getComponent<ReactoryFormUtilities>('core.ReactoryFormUtilities');
  const {
    uiSchema = {},
    formData,
    errorSchema,
    idPrefix,
    name,
    onKeyChange,
    required,
    onFocus,
    onBlur,
    registry = utils.getDefaultRegistry(),
  } = props;
  const {
    definitions,
    fields,
    formContext,
    FieldTemplate = withReactory(DefaultTemplate),
  } = registry;
  let idSchema = props.idSchema;
  const schema = utils.retrieveSchema(props.schema, definitions, formData);
  idSchema = utils.mergeObjects(
    utils.toIdSchema(schema, null, definitions, formData, idPrefix),
    idSchema
  );

  const FieldComponent = getFieldComponent(schema, uiSchema, idSchema, fields, utils);
  const { DescriptionField } = fields;
  const disabled = Boolean(props.disabled || uiSchema["ui:disabled"]);
  const readonly = Boolean(props.readonly || uiSchema["ui:readonly"]);
  const autofocus = Boolean(props.autofocus || uiSchema["ui:autofocus"]);

  if (Object.keys(schema).length === 0) {
    // See #312: Ensure compatibility with old versions of React.
    return <div />;
  }

  const uiOptions = utils.getUiOptions(uiSchema);
  let { label: displayLabel = true } = uiOptions;
  if (schema.type === "array") {
    displayLabel =
      utils.isMultiSelect(schema, definitions) ||
      utils.isFilesArray(schema, uiSchema, definitions);
  }
  if (schema.type === "object") {
    displayLabel = false;
  }
  if (schema.type === "boolean" && !uiSchema["ui:widget"]) {
    displayLabel = false;
  }
  if (uiSchema["ui:field"]) {
    displayLabel = false;
  }

  const { __errors, ...fieldErrorSchema } = errorSchema || { __errors: [], fieldErrorSchema: {} };
  if(FieldComponent === undefined ||  FieldComponent === null) {
    console.error('Component resolved to null', { schema, uiSchema, idSchema, fields })    
  }
  
  // See #439: uiSchema: Don't pass consumed class names to child components
  const field = (
    <ErrorBoundary onError={()=>{}} FallbackComponent={(props)=>(<>ERR on Field: {idSchema.$id}</>)}>
      <FieldComponent
        {...props}
        idSchema={idSchema}
        schema={schema}
        uiSchema={{ ...uiSchema, classNames: undefined }}
        disabled={disabled}
        onFocus={onFocus}
        onBlur={onBlur}
        readonly={readonly}
        autofocus={autofocus}
        errorSchema={fieldErrorSchema}
        formContext={formContext}
        rawErrors={__errors}
      />
    </ErrorBoundary>
  );

  const { type } = schema;
  const id = idSchema.$id;
  const label =
    uiSchema["ui:title"] || props.schema.title || schema.title;
  const description =
    uiSchema["ui:description"] ||
    props.schema.description ||
    schema.description;
  const errors = __errors;
  const help = uiSchema["ui:help"];
  const hidden = uiSchema["ui:widget"] === "hidden";
  const classNames = [
    "form-group",
    "field",
    `field-${type}`,
    errors && errors.length > 0 ? "field-error has-error has-danger" : "",
    uiSchema.classNames,
  ]
    .join(" ")
    .trim();

  const fieldProps = {
    description: (
      <DescriptionField
        id={id + "__description"}
        description={description}
        formContext={formContext}
      />
    ),
    rawDescription: description,
    help: <Help help={help} />,
    rawHelp: typeof help === "string" ? help : undefined,
    errors: <ErrorList errors={errors} />,
    rawErrors: errors,
    id,
    label,
    hidden,
    onKeyChange,
    onBlur,
    onFocus,
    required,
    disabled,
    readonly,
    displayLabel,
    classNames,
    formContext,
    fields,
    schema,
    uiSchema,
    formData
  };

  return <FieldTemplate {...fieldProps}>{field}</FieldTemplate>;
}

export default SchemaFieldRender;