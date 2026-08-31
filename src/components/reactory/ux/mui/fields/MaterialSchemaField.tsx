import React, { Component, Fragment, useState } from "react";
import PropTypes from "prop-types";
import { Box, Typography, Button, Collapse, Paper } from "@mui/material";
import { ErrorBoundary } from "@reactory/client-core/api/ErrorBoundary";
import { ReactoryFormUtilities } from "components/reactory/form/types";
import { useReactory, withReactory } from "@reactory/client-core/api/ApiProvider";

const REQUIRED_FIELD_SYMBOL = "*";

export enum SchemaFieldType {
  array = 'ArrayField',
  boolean = 'BooleanField',
  integer = 'NumberField',
  number = 'NumberField',
  object = 'ObjectField',
  string = 'StringField',
  date = 'DateField',
}

/**
 * The component types that is inferred
 * from the schema field type.
 */
const COMPONENT_TYPES: Record<string, string> = {
  array: "ArrayField",
  boolean: "BooleanField",
  integer: "NumberField",
  number: "NumberField",
  object: "ObjectField",
  string: "StringField",
  date: "DateField"
};

/**
 * Detailed error and warning display for unresolved or crashed form fields.
 */
const UnresolvedFieldFallback: React.FC<{
  fieldKey?: string;
  fieldId?: string;
  fieldTitle?: string;
  schemaType?: string | string[];
  requestedField?: string;
  requestedWidget?: string;
  reason?: string;
  errorDetails?: any;
}> = (props) => {
  const [expanded, setExpanded] = useState(false);
  const displayType = Array.isArray(props.schemaType) ? props.schemaType.join(', ') : props.schemaType;

  return (
    <Paper
      elevation={0}
      sx={{
        my: 1,
        p: 1.5,
        border: '1px solid #ed6c02',
        borderRadius: 1.5,
        bgcolor: 'rgba(237, 108, 2, 0.04)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <span className="material-icons" style={{ color: '#ed6c02', fontSize: 20 }}>
          warning
        </span>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#c75100' }}>
            Field Resolution Warning: {props.fieldTitle || props.fieldKey || props.fieldId || 'Unnamed Field'}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            {props.reason || 'The requested widget or component could not be resolved.'}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          color="warning"
          onClick={() => setExpanded(!expanded)}
          sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25 }}
        >
          {expanded ? 'Hide Details' : 'View Details'}
        </Button>
      </Box>

      <Collapse in={expanded}>
        <Box
          sx={{
            mt: 1.5,
            pt: 1,
            borderTop: '1px dashed rgba(237, 108, 2, 0.3)',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            lineHeight: 1.7,
            bgcolor: 'action.hover',
            p: 1,
            borderRadius: 1,
          }}
        >
          <div><strong>Field ID / Path:</strong> {props.fieldId || 'root'}</div>
          <div><strong>Property Name:</strong> {props.fieldKey || 'N/A'}</div>
          <div><strong>Schema Type:</strong> {displayType || 'N/A'}</div>
          {props.requestedField && <div><strong>Requested ui:field:</strong> {String(props.requestedField)}</div>}
          {props.requestedWidget && <div><strong>Requested ui:widget:</strong> {String(props.requestedWidget)}</div>}
          {props.errorDetails && (
            <div style={{ marginTop: 6, color: '#d32f2f', whiteSpace: 'pre-wrap' }}>
              <strong>Error Message:</strong> {props.errorDetails?.message || String(props.errorDetails)}
            </div>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

function getFieldComponent(
  schema: Reactory.Schema.ISchema,
  uiSchema: Reactory.Schema.IUISchema,
  idSchema: Reactory.Schema.IDSchema,
  fields: Reactory.Forms.IReactoryFields,
  utils: ReactoryFormUtilities,
  reactory: Reactory.Client.ReactorySDK,
  name?: string
): React.ComponentType<any> {
  const uiField = uiSchema?.["ui:field"];
  const uiWidget = uiSchema?.["ui:widget"];

  // 1. Function component provided directly
  if (typeof uiField === "function") {
    return uiField;
  }

  // 2. Named string matching registered form fields
  if (typeof uiField === "string" && fields && uiField in fields) {
    const candidate = fields[uiField];
    if (typeof candidate === "function") return candidate as React.ComponentType<any>;
  }

  // 3. FQN or dotted string looked up via Reactory SDK
  if (typeof uiField === "string" && reactory && typeof reactory.getComponent === "function") {
    try {
      const candidate = reactory.getComponent<React.ComponentType<any>>(uiField);
      if (candidate && (typeof candidate === "function" || typeof candidate === "object")) {
        return candidate;
      }
    } catch (e) {
      if (reactory?.warning) {
        reactory.warning(`Could not resolve custom field component: ${uiField}`, e);
      }
    }
  }

  // 4. Custom widget FQN specified on object/schema level
  if (typeof uiWidget === "string" && reactory && typeof reactory.getComponent === "function" && uiWidget.indexOf(".") > -1) {
    try {
      const candidate = reactory.getComponent<React.ComponentType<any>>(uiWidget);
      if (candidate) return candidate;
    } catch (e) {
      // continue to schema type resolution
    }
  }

  // 5. Schema-type inferred default field component
  const schemaType = utils?.getSchemaType ? utils.getSchemaType(schema) : (schema?.type as string);
  const componentName = typeof schemaType === "string" ? COMPONENT_TYPES[schemaType] || COMPONENT_TYPES[schemaType.toLowerCase()] : null;

  if (componentName && fields && componentName in fields) {
    const candidate = fields[componentName];
    if (typeof candidate === "function") return candidate as React.ComponentType<any>;
  }

  // 6. Safe, non-crashing component fallback
  const SafeFallbackField: React.FC<any> = (fieldProps) => {
    const fieldId = fieldProps?.idSchema?.$id || idSchema?.$id || name || 'root';
    const fieldTitle = fieldProps?.schema?.title || schema?.title || name || fieldId;
    return (
      <UnresolvedFieldFallback
        fieldKey={name}
        fieldId={fieldId}
        fieldTitle={fieldTitle}
        schemaType={schemaType || schema?.type}
        requestedField={typeof uiField === "string" ? uiField : undefined}
        requestedWidget={typeof uiWidget === "string" ? uiWidget : undefined}
        reason={
          uiField
            ? `Custom field component "${uiField}" could not be resolved from registry or Reactory SDK.`
            : `No matching component found for schema type "${schemaType || schema?.type || 'unknown'}".`
        }
      />
    );
  };

  return SafeFallbackField;
}

function Label(props) {
  const { label, required, id } = props;
  if (!label) {
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
  const utils = props.reactory?.getComponent ? props.reactory.getComponent('core.ReactoryFormUtilities') : null;
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
  const additional = utils?.ADDITIONAL_PROPERTY_FLAG && props.schema
    ? props.schema.hasOwnProperty(utils.ADDITIONAL_PROPERTY_FLAG)
    : false;
  const keyLabel = `${label} Key`;

  return (
    <div key={props.key || props.id || props.idSchema?.$id} className={classNames}>
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

const MaterialSchemaField: Reactory.Forms.ReactorySchemaFieldComponent = (props) => {
  const reactory = useReactory();
  const utils = reactory?.getComponent ? reactory.getComponent<ReactoryFormUtilities>('core.ReactoryFormUtilities') : null;
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
    onChange,
    registry = utils?.getDefaultRegistry ? utils.getDefaultRegistry() : ({} as any),
  } = props;
  const {
    definitions,
    fields,
    formContext,
    templates,
  } = registry;

  let idSchema = props.idSchema;
  const schema: Reactory.Schema.ISchema = utils?.retrieveSchema
    ? (utils.retrieveSchema(props.schema, definitions, formData) as Reactory.Schema.ISchema)
    : props.schema;

  if (utils?.mergeObjects && utils?.toIdSchema) {
    idSchema = utils.mergeObjects(
      utils.toIdSchema(schema, null, definitions, formData, idPrefix),
      idSchema
    );
  }

  const FieldComponent = getFieldComponent(schema, uiSchema, idSchema, fields, utils, reactory, name);
  const DescriptionField = fields?.DescriptionField || (({ description }: any) => description ? <Typography variant="caption">{description}</Typography> : null);
  const disabled = Boolean(props.disabled || uiSchema["ui:disabled"]);
  const readonly = Boolean(props.readonly || uiSchema["ui:readonly"]);
  const autofocus = Boolean(props.autofocus || uiSchema["ui:autofocus"]);

  if (Object.keys(schema).length === 0) {
    return <div />;
  }

  const uiOptions = utils?.getUiOptions ? utils.getUiOptions(uiSchema) : {};
  let { label: displayLabel = true } = uiOptions;
  if (schema.type === "array" && utils?.isMultiSelect) {
    displayLabel =
      utils.isMultiSelect(schema, definitions) ||
      (utils.isFilesArray ? utils.isFilesArray(schema, uiSchema, definitions) : false);
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

  const fieldId = idSchema?.$id || props.id || name || "root";
  const rawTitle = uiSchema?.["ui:title"];
  const uiTitleStr = typeof rawTitle === "string" ? rawTitle : (typeof rawTitle === "object" && rawTitle !== null ? (rawTitle as any).title : undefined);
  const fieldTitle: string = uiTitleStr || props.schema?.title || schema?.title || name || fieldId;

  const { __errors, ...fieldErrorSchema } = errorSchema || { __errors: [], fieldErrorSchema: {} };
  
  const field = (
    <ErrorBoundary 
      onError={(error, info) => {
        if (reactory?.error) {
          reactory.error(`Error rendering MaterialSchemaField [${fieldId}]`, {
            fieldId,
            fieldTitle,
            name,
            schema,
            uiSchema,
            error: error?.message,
            stack: error?.stack,
            componentStack: info?.componentStack,
          });
        }
      }} 
      FallbackComponent={({ error }: { error?: Error }) => (
        <UnresolvedFieldFallback
          fieldKey={name}
          fieldId={fieldId}
          fieldTitle={fieldTitle}
          schemaType={schema?.type}
          requestedField={typeof uiSchema["ui:field"] === "string" ? uiSchema["ui:field"] : undefined}
          requestedWidget={typeof uiSchema["ui:widget"] === "string" ? uiSchema["ui:widget"] : undefined}
          reason={`Render error on field "${fieldTitle}" (${fieldId}): ${error?.message || 'Component failed during rendering'}`}
          errorDetails={error}
        />
      )}
    >
      <FieldComponent
        {...props}
        idSchema={idSchema}
        schema={schema}
        uiSchema={{ ...uiSchema, classNames: undefined }}
        disabled={disabled}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={onChange}
        readonly={readonly}
        autofocus={autofocus}
        errorSchema={fieldErrorSchema}
        formContext={formContext}
        rawErrors={__errors}
      />
    </ErrorBoundary>
  );

  const FieldTemplate = templates?.FieldTemplate || DefaultTemplate;
  const type = schema?.type || "string";
  const id = fieldId;
  const label = fieldTitle;
  const description = props.schema?.description || schema?.description;
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
        schema={schema}
        idSchema={idSchema}
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
    title: label,
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
    formData,
    idSchema,
    reactory,
  };

  return <FieldTemplate {...fieldProps}>{field}</FieldTemplate>;
};

export default MaterialSchemaField;