
export const DefaultLoadingSchema = {
  type: "object",
  title: "Loading Form",
  description: "This form is used to display a loading state.",
  properties: {
    loading: {
      type: "string",      
      default: "Please wait while we load the data..."
    }
  },
  required: ["loading"]
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