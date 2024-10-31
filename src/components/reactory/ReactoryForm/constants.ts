
export const DefaultLoadingSchema = {
  "title": "Starting",
  "type": "string",
};

export const DefaultUiSchema = {
  "ui:widget": "LabelWidget",
  "ui:options": {
    componentType: 'div',
    showSubmit: false,
    showRefresh: false
  },
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
  defaultFormValue: "🧙",
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