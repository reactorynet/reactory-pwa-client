import { StepDefinition, PortType } from '../../../types';

export const CustomStepDefinition: StepDefinition = {
  id: 'custom',
  name: 'Custom',
  category: 'action',
  description: 'Custom user-defined step with arbitrary configuration',
  icon: 'extension',
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
      description: 'Input data for custom processing'
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
      name: 'result',
      type: PortType.OUTPUT,
      dataType: 'any',
      description: 'Custom step output'
    }
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'Custom Step'
      },
      handler: {
        type: 'string',
        title: 'Handler',
        description: 'Custom handler identifier (service FQN, script path, etc.)'
      },
      configuration: {
        type: 'object',
        title: 'Configuration',
        description: 'Custom configuration passed to the handler',
        properties: {},
        additionalProperties: true
      }
    },
    required: ['name']
  },
  defaultProperties: {
    name: 'Custom Step',
    configuration: {}
  },
  uiSchema: {
    'ui:order': ['name', 'handler', 'configuration'],
    handler: {
      'ui:placeholder': 'e.g. namespace.ServiceName@1.0.0'
    },
    configuration: {
      'ui:widget': 'RichEditorWidget',
      'ui:options': {
        format: 'json',
        rows: 8
      }
    }
  },
  tags: ['action', 'custom', 'extensible', 'plugin'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'EXT',
        colors: {
          body: 0x1a1a1a,
          bodyHover: 0x2a2a2a,
          bodySelected: 0x78909c,
          pins: 0x808080,
          pinsConnected: 0xb87333
        },
        features: {
          pinCount: 4
        },
        dimensions: {
          width: 100,
          height: 60
        }
      }
    }
  }
};
