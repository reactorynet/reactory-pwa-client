import { StepDefinition, PortType } from '../../../types';

export const ValidationStepDefinition: StepDefinition = {
  id: 'validation',
  name: 'Validation',
  category: 'logic',
  description: 'Validate data against a set of rules',
  icon: 'rule',
  color: '#ef6c00',
  inputPorts: [
    {
      name: 'previous',
      type: PortType.CONTROL_INPUT,
      dataType: 'any',
      description: 'Previous step in workflow'
    },
    {
      name: 'data',
      type: PortType.INPUT,
      dataType: 'any',
      description: 'Data to validate'
    }
  ],
  outputPorts: [
    {
      name: 'valid',
      type: PortType.CONTROL_OUTPUT,
      dataType: 'any',
      description: 'Path when validation passes'
    },
    {
      name: 'invalid',
      type: PortType.CONTROL_OUTPUT,
      dataType: 'any',
      description: 'Path when validation fails'
    },
    {
      name: 'errors',
      type: PortType.OUTPUT,
      dataType: 'array',
      description: 'Validation error details'
    }
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'Validation'
      },
      stopOnFirstError: {
        type: 'boolean',
        title: 'Stop on First Error',
        description: 'Stop validating after the first rule fails',
        default: false
      },
      rules: {
        type: 'array',
        title: 'Validation Rules',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              title: 'Rule Type',
              enum: ['required', 'type', 'pattern', 'range', 'custom']
            },
            field: {
              type: 'string',
              title: 'Field Path'
            },
            value: {
              type: 'string',
              title: 'Expected Value / Pattern'
            },
            message: {
              type: 'string',
              title: 'Error Message'
            }
          }
        }
      }
    },
    required: ['name']
  },
  defaultProperties: {
    name: 'Validation',
    stopOnFirstError: false,
    rules: []
  },
  uiSchema: {
    'ui:order': ['name', 'stopOnFirstError', 'rules'],
    stopOnFirstError: {
      'ui:help': 'When enabled, validation stops at the first failing rule and skips remaining rules'
    },
    rules: {
      'ui:help': 'Define validation rules to check against the input data',
      items: {
        type: {
          'ui:widget': 'SelectWidget',
          'ui:options': {
            selectOptions: [
              { key: 'required', value: 'required', label: 'Required', icon: 'star' },
              { key: 'type', value: 'type', label: 'Type Check', icon: 'category' },
              { key: 'pattern', value: 'pattern', label: 'Pattern (regex)', icon: 'pattern' },
              { key: 'range', value: 'range', label: 'Range', icon: 'swap_horiz' },
              { key: 'custom', value: 'custom', label: 'Custom Expression', icon: 'code' }
            ]
          }
        }
      }
    }
  },
  tags: ['logic', 'validation', 'check', 'rules'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'transistor',
        labelPrefix: 'VAL',
        colors: {
          body: 0x1a1a1a,
          bodyHover: 0x2a2a2a,
          bodySelected: 0xef6c00,
          pins: 0x808080,
          pinsConnected: 0xb87333
        },
        dimensions: {
          width: 100,
          height: 70
        }
      }
    }
  }
};
