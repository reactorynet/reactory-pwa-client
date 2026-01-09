// Schema definitions for property editors based on field type

export const commonProperties = {
  title: {
    type: 'string',
    title: 'Title',
    description: 'Human readable title for the field'
  },
  description: {
    type: 'string',
    title: 'Description',
    description: 'Helper text or description'
  },
  key: {
    type: 'string',
    title: 'Property Key',
    description: 'The internal key name for this property (must be unique)'
  },
  readOnly: {
    type: 'boolean',
    title: 'Read Only',
    description: 'If true, the field cannot be edited'
  },
  required: {
    type: 'boolean',
    title: 'Required',
    description: 'Is this field required?'
  }
};

export const getEditorSchema = (type: string) => {
  const baseProperties = { ...commonProperties };

  switch (type) {
    case 'string':
      return {
        type: 'object',
        properties: {
          ...baseProperties,
          minLength: { type: 'integer', title: 'Minimum Length' },
          maxLength: { type: 'integer', title: 'Maximum Length' },
          pattern: { type: 'string', title: 'Regex Pattern' },
          format: { 
            type: 'string', 
            title: 'Format',
            enum: ['text', 'email', 'uri', 'data-url', 'date', 'date-time', 'password'],
            enumNames: ['Text', 'Email', 'URI', 'Data URL', 'Date', 'Date Time', 'Password']
          }
        }
      };
    case 'number':
    case 'integer':
      return {
        type: 'object',
        properties: {
          ...baseProperties,
          minimum: { type: 'number', title: 'Minimum Value' },
          maximum: { type: 'number', title: 'Maximum Value' },
          multipleOf: { type: 'number', title: 'Multiple Of' }
        }
      };
    case 'array':
      return {
        type: 'object',
        properties: {
          ...baseProperties,
          minItems: { type: 'integer', title: 'Minimum Items' },
          maxItems: { type: 'integer', title: 'Maximum Items' },
          uniqueItems: { type: 'boolean', title: 'Unique Items' }
        }
      };
    case 'boolean':
      return {
        type: 'object',
        properties: {
          ...baseProperties,
          default: { type: 'boolean', title: 'Default Value' }
        }
      };
    default:
      return {
        type: 'object',
        properties: baseProperties
      };
  }
};

export const getEditorUISchema = (type: string) => {
  return {
    "ui:form": {
      style: {
        padding: '8px'
      }
    },
    description: {
      "ui:widget": "textarea"
    },
    key: {
      "ui:disabled": false, // Enabled key editing
      "ui:help": "Changing the key will rename the property"
    }
  };
};