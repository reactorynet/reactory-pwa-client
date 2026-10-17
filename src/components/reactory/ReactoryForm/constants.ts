
export const DefaultLoadingSchema = {
  type: "object",
  title: "Loading Form",
  description: "This form is used to display a loading state.",
  properties: {
  },
  required: ["loading"]
};

/**
 * Detects whether a resolved schema is still the placeholder used while a real
 * form definition / schema has not arrived yet.
 *
 * When `useSchema` cannot resolve a schema it falls back to
 * {@link DefaultLoadingSchema} — a schema with no properties. Historically the
 * form engine then rendered that placeholder as if it were a real form, which
 * produced the bare "Loading Form" surface (title, description, a stray
 * required field and Submit/refresh chrome). Callers use this guard to render a
 * {@link FormSkeleton} instead.
 *
 * The check is intentionally narrow (identity, or the exact placeholder title
 * with no properties) so genuine schema-less/minimal forms are not mistaken for
 * a loading state. A `null`/`undefined` schema returns `false` ("unknown", not
 * "placeholder") to avoid false positives when a caller simply has not supplied
 * a schema at all.
 */
export const isDefaultLoadingSchema = (schema?: unknown): boolean => {
  if (schema === undefined || schema === null) return false;
  if (schema === DefaultLoadingSchema) return true;
  if (typeof schema !== 'object') return false;

  const candidate = schema as { title?: unknown; properties?: unknown };
  if (candidate.title !== DefaultLoadingSchema.title) return false;

  const properties = candidate.properties;
  const hasProperties =
    !!properties &&
    typeof properties === 'object' &&
    Object.keys(properties as Record<string, unknown>).length > 0;

  return !hasProperties;
};

export const DefaultUiSchema: Reactory.Schema.IUISchema = {
  "ui:form": {
    toolbarStyle: {
      display: 'none',
      height: 0,
    },
    showSubmit: false,
    showRefresh: false,
    componentType: "div",
    style: {
      display: "flex",
      flexDirection: "column",
    }
  },
  "ui:field": "GridLayout",
  "ui:grid-options": {
    container: 'Paper',
    containerProps: {
      elevation: 0, 
      square: true,
      variant: 'indeterminate',
      sx: {
        padding: 2,
        marginTop: 0,
        marginBottom: 0,
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
      },
    },
  },
  "ui:grid-layout": [
    {
      loading: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
    },
  ],
  loading: {
    "ui:widget": "ProgressWidget",
    "ui:options": {
      variant: 'outlined',
      size: 'medium',
      inditerminate: true,
    }
  }
};

export const ReactoryDefaultForm: Reactory.Forms.IReactoryForm = {
  id: 'ReactoryLoadingForm',
  schema: DefaultLoadingSchema,
  uiSchema: DefaultUiSchema,
  name: 'ReactoryLoadingForm',
  uiFramework: 'material',
  uiSupport: ['material'],
  nameSpace: 'core',
  version: '1.0.0',
  title: "Loading Form",
  registerAsComponent: false,
  defaultFormValue: null,
  __complete__: true
};

export const ReactoryErrorForm: Reactory.Forms.IReactoryForm = {
  id: 'ReactoryErrorForm',
  schema: DefaultLoadingSchema,
  uiSchema: DefaultUiSchema,
  name: 'ReactoryErrorForm',
  uiFramework: 'material',
  uiSupport: ['material'],
  nameSpace: 'core',
  version: '1.0.0',
  title: "Error Form",
  registerAsComponent: false,
  defaultFormValue: "Error in form",
  __complete__: true
}