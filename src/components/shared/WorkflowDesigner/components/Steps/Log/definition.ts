import { StepDefinition, PortType } from '../../../types';

export const LogStepDefinition: StepDefinition = {
  id: 'log',
  name: 'Log',
  category: 'observability',
  description: 'Log a message with optional data',
  icon: 'terminal',
  color: '#78909c',
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
      description: 'Data to include in log output'
    }
  ],
  outputPorts: [
    {
      name: 'next',
      type: PortType.CONTROL_OUTPUT,
      dataType: 'any',
      description: 'Next step in workflow'
    }
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'Log'
      },
      message: {
        type: 'string',
        title: 'Message',
        description: 'Log message (supports ${variable} substitution)'
      },
      level: {
        type: 'string',
        title: 'Log Level',
        enum: ['debug', 'info', 'warn', 'error'],
        default: 'info'
      },     
    },
    required: ['name', 'message']
  },
  defaultProperties: {
    name: 'Log',
    message: '',
    level: 'info'
  },
  uiSchema: {
    'ui:order': ['name', 'message', 'level'],
    message: {
      'ui:widget': 'RichEditorWidget',
      'ui:options': {
        format: 'console', 
        rows: 3 
      },
      'ui:help': 'Supports ${variable} substitution from workflow context'
    },
    level: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { icon: 'bug_report', key: 'debug', value: 'debug', label: 'Debug' },
          { icon: 'info', key: 'info', value: 'info', label: 'Info' },
          { icon: 'warning', key: 'warn', value: 'warn', label: 'Warn' },
          { icon: 'error', key: 'error', value: 'error', label: 'Error' }
        ]
      }
    }
  },
  tags: ['observability', 'log', 'debug', 'message'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'sevenSegment',
        labelPrefix: 'LOG',
        colors: {
          body: 0x1a1a1a,
          bodyHover: 0x2a2a2a,
          bodySelected: 0x78909c,
          pins: 0x808080,
          pinsConnected: 0xb87333
        },
        features: {
          hasNotch: false,
          pinCount: 4
        },
        dimensions: {
          width: 80,
          height: 60
        }
      }
    }
  }
};
