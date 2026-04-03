import { StepDefinition, PortType } from '../../../types';

export const TaskStepDefinition: StepDefinition = {
  id: 'task',
  name: 'Task',
  category: 'action',
  description: 'Generic task step',
  icon: 'assignment',
  color: '#2196f3',
  inputPorts: [
    {
      name: 'previous',
      type: PortType.CONTROL_INPUT,
      dataType: 'any',
      description: 'Previous step in workflow'
    },
    {
      name: 'input',
      type: PortType.INPUT,
      dataType: 'any',
      description: 'Input data for the task'
    }
  ],
  outputPorts: [
    {
      name: 'next',
      type: PortType.CONTROL_OUTPUT,
      dataType: 'any',
      description: 'Next step in workflow'
    },
    {
      name: 'output',
      type: PortType.OUTPUT,
      dataType: 'any',
      description: 'Output data from the task'
    }
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'Task'
      },
      taskType: {
        type: 'string',
        title: 'Task Type',
        description: 'Type of task to execute',
        enum: ['http_request', 'data_transform', 'custom_script'],
        default: 'custom_script'
      },
      configuration: {
        type: 'object',
        title: 'Configuration',
        description: 'Task-specific configuration',
        properties: {},
        additionalProperties: true
      }
    },
    required: ['name', 'taskType']
  },
  defaultProperties: {
    name: 'Task',
    taskType: 'custom_script',
    configuration: {}
  },
  uiSchema: {
    'ui:order': ['name', 'taskType', 'configuration'],
    taskType: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'http_request', value: 'http_request', label: 'HTTP Request', icon: 'http' },
          { key: 'data_transform', value: 'data_transform', label: 'Data Transform', icon: 'transform' },
          { key: 'custom_script', value: 'custom_script', label: 'Custom Script', icon: 'code' }
        ]
      }
    },
    configuration: {
      'ui:widget': 'RichEditorWidget',
      'ui:options': {
        format: 'json',
        rows: 8
      },
      'ui:help': 'Task-specific configuration as a JSON object'
    }
  },
  tags: ['action', 'task', 'execute'],
  // Rendering configuration
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'U',
        colors: {
          body: 0x1a1a1a,
          bodyHover: 0x2a2a2a,
          bodySelected: 0x2196f3, // Blue
          pins: 0x808080,
          pinsConnected: 0xb87333
        },
        features: {
          hasNotch: true,
          pinCount: 8
        },
        dimensions: {
          width: 100,
          height: 80
        }
      }
    }
  }
};
