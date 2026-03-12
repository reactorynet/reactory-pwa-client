import { StepDefinition, PortType } from '../../../types';

export const DelayStepDefinition: StepDefinition = {
  id: 'delay',
  name: 'Delay',
  category: 'flow',
  description: 'Pause workflow execution for a specified duration',
  icon: 'hourglass_empty',
  color: '#8d6e63',
  inputPorts: [
    {
      name: 'previous',
      type: PortType.CONTROL_INPUT,
      dataType: 'any',
      description: 'Previous step in workflow'
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
        default: 'Delay'
      },
      duration: {
        type: 'number',
        title: 'Duration (ms)',
        description: 'Delay duration in milliseconds',
        minimum: 0,
        default: 1000
      },
      reason: {
        type: 'string',
        title: 'Reason',
        description: 'Why this delay is needed'
      }
    },
    required: ['name', 'duration']
  },
  defaultProperties: {
    name: 'Delay',
    duration: 1000
  },
  uiSchema: {
    'ui:order': ['name', 'duration', 'reason'],
    duration: {
      'ui:help': 'Time to pause in milliseconds'
    },
    reason: {
      'ui:help': 'Optional explanation for the delay'
    }
  },
  tags: ['flow', 'delay', 'wait', 'pause', 'timer'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'capacitor',
        labelPrefix: 'DLY',
        colors: {
          body: 0x1a1a1a,
          bodyHover: 0x2a2a2a,
          bodySelected: 0x8d6e63,
          pins: 0x808080,
          pinsConnected: 0xb87333
        },
        features: {
          pinCount: 2
        },
        dimensions: {
          width: 60,
          height: 40
        }
      }
    }
  }
};
