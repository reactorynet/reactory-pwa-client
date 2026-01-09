// Schema definitions for UI property editors

export const commonUIProperties = {
  "widget": {
    type: "string",
    title: "Widget",
    description: "The component to use for rendering this field",
    enum: [
      "TextWidget",
      "TextareaWidget",
      "SelectWidget",
      "CheckboxesWidget",
      "RadioWidget",
      "DateWidget",
      "DateTimeWidget",
      "HiddenWidget",
      "PasswordWidget",
      "EmailWidget",
      "URLWidget",
      "ColorWidget",
      "FileWidget",
      "RangeWidget",
      "UpDownWidget",
      "LabelWidget",
      "StaticContentWidget",
      "MaterialTableWidget",
      "SchemaSelectorWidget",
      "UserSelectWidget",
      "SelectWithDataWidget"
    ]
  },
  "title": {
    type: "string",
    title: "Custom Title",
    description: "Override the default title derived from the schema"
  },
  "description": {
    type: "string",
    title: "Custom Description",
    description: "Override the default description"
  },
  "placeholder": {
    type: "string",
    title: "Placeholder",
    description: "Placeholder text for the input"
  },
  "help": {
    type: "string",
    title: "Help Text",
    description: "Help text displayed below the input"
  },
  "disabled": {
    type: "boolean",
    title: "Disabled",
    description: "Disable this field"
  },
  "readonly": {
    type: "boolean",
    title: "Read Only",
    description: "Make this field read-only"
  },
  "hidden": {
    type: "boolean",
    title: "Hidden",
    description: "Hide this field (sets ui:widget to hidden)"
  },
  "autofocus": {
    type: "boolean",
    title: "Auto Focus",
    description: "Focus this field on load"
  },
  "options": {
    type: "string", // Using string for now, could be object with specific schema later
    title: "Options (JSON)",
    description: "Additional options as JSON string"
  }
};

export const rootFormUIProperties = {
  "field": {
    type: "string",
    title: "Layout Field",
    description: "The layout component to use (e.g. GridLayout, TabbedLayout)",
    enum: [
      "GridLayout",
      "TabbedLayout",
      "AccordionLayout",
      "SteppedLayout",
      "ListLayout",
      "PagedLayout"
    ]
  },
  "title": {
    type: "string",
    title: "Form Title",
    description: "Override the form title"
  },
  "description": {
    type: "string",
    title: "Form Description",
    description: "Override the form description"
  },
  "form": {
    type: "string",
    title: "Form Options (JSON)",
    description: "Configuration for the form container (e.g. style)"
  },
  "options": {
    type: "string",
    title: "Layout Options (JSON)",
    description: "Additional options for the layout"
  }
};

export const getUIEditorSchema = (type: string) => {
  if (type === 'root') {
    return {
      type: "object",
      properties: rootFormUIProperties
    };
  }

  const baseProperties = { ...commonUIProperties };
  
  // Type-specific UI properties could be added here
  
  return {
    type: "object",
    properties: baseProperties
  };
};

export const getUIEditorUISchema = () => {
  return {
    "ui:form": {
      style: {
        padding: "8px"
      }
    },
    "widget": {
      "ui:widget": "SelectWidget",
      "ui:options": {
        allowCustomValue: true // Allow typing custom widget names
      }
    },
    "field": {
      "ui:widget": "SelectWidget",
      "ui:options": {
        allowCustomValue: true
      }
    },
    "description": {
      "ui:widget": "textarea"
    },
    "help": {
      "ui:widget": "textarea"
    },
    "options": {
      "ui:widget": "textarea",
      "ui:options": {
        rows: 5,
        format: "json"
      },
      "ui:help": "Enter valid JSON for advanced options"
    },
    "form": {
      "ui:widget": "textarea",
      "ui:options": {
        rows: 5,
        format: "json"
      },
      "ui:help": "Enter valid JSON for ui:form options"
    }
  };
};
