import { StepDefinition, PortType } from '../../../types';

export const StartStepDefinition: StepDefinition = {
  id: 'start',
  name: 'Start',
  category: 'control',
  description: 'Starting point of the workflow',
  icon: 'play_arrow',
  color: '#4caf50',
  inputPorts: [],
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
        default: 'Start'
      }
    }
  },
  defaultProperties: {
    name: 'Start'
  },
  uiSchema: {
    name: {
      'ui:autofocus': true,
      'ui:help': 'Enter a descriptive name for the start step'
    }
  },
  tags: ['control', 'start', 'entry'],
  // Rendering configuration
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'pushButton',
        labelPrefix: 'S',
        colors: {
          body: 0x1a1a1a,        // Black plastic
          bodyHover: 0x2a2a2a,
          bodySelected: 0x1565c0,
          pins: 0x808080,         // Silver
          pinsConnected: 0xb87333 // Copper
        },
        features: {
          hasPressEffect: true,
          pinCount: 1
        },
        dimensions: {
          width: 40,
          height: 40
        }
      },
      animation: {
        hover: {
          scale: 1.05,
          duration: 200
        },
        selected: {
          glow: true,
          duration: 300
        }
      }
    }
  }
};
