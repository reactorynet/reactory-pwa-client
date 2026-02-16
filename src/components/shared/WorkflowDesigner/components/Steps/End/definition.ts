import { StepDefinition, PortType } from '../../../types';

export const EndStepDefinition: StepDefinition = {
  id: 'end',
  name: 'End',
  category: 'control',
  description: 'End point of the workflow',
  icon: 'stop',
  color: '#f44336',
  inputPorts: [
    {
      name: 'previous',
      type: PortType.CONTROL_INPUT,
      dataType: 'any',
      description: 'Previous step in workflow'
    }
  ],
  outputPorts: [],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'End'
      },
      returnValue: {
        type: 'string',
        title: 'Return Value',
        description: 'Value to return when workflow completes'
      }
    }
  },
  defaultProperties: {
    name: 'End',
    returnValue: 'success'
  },
  uiSchema: {
    returnValue: {
      'ui:help': 'Value returned when workflow completes'
    }
  },
  tags: ['control', 'end', 'exit'],
  // Rendering configuration
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'led',
        labelPrefix: 'LED',
        colors: {
          body: 0x330000,         // Dark red when off
          bodyHover: 0x550000,
          bodySelected: 0xff0000, // Bright red when selected
          pins: 0x808080,
          pinsConnected: 0xb87333,
          glow: 0xff6666          // Red glow
        },
        features: {
          hasGlow: true,
          pinCount: 2
        },
        dimensions: {
          width: 30,
          height: 30
        }
      },
      animation: {
        selected: {
          glow: true,
          color: 0xff0000,
          duration: 300
        },
        executing: {
          pulse: true,
          color: 0xff0000,
          duration: 1000
        }
      }
    }
  }
};
