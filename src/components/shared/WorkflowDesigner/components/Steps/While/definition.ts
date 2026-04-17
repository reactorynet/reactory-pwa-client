import { StepDefinition, PortType } from '../../../types';

export const WhileStepDefinition: StepDefinition = {
  id: 'while',
  name: 'While Loop',
  category: 'flow',
  description: 'Repeat child steps while a condition is true',
  icon: 'loop',
  color: '#7e57c2',
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
      name: 'loop_body',
      type: PortType.CONTROL_OUTPUT,
      dataType: 'any',
      description: 'First step inside the loop body'
    },
    {
      name: 'completed',
      type: PortType.CONTROL_OUTPUT,
      dataType: 'any',
      description: 'Continue after loop completes'
    },
    {
      name: 'iteration',
      type: PortType.OUTPUT,
      dataType: 'number',
      description: 'Current iteration count'
    }
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'While Loop'
      },
      condition: {
        type: 'string',
        title: 'Condition',
        description: 'JavaScript expression evaluated each iteration (must return truthy to continue)'
      },
      maxIterations: {
        type: 'number',
        title: 'Max Iterations',
        description: 'Safety limit on maximum iterations',
        minimum: 1,
        default: 1000
      }
    },
    required: ['name', 'condition']
  },
  defaultProperties: {
    name: 'While Loop',
    maxIterations: 1000
  },
  uiSchema: {
    'ui:order': ['name', 'condition', 'maxIterations'],
    condition: {
      'ui:widget': 'RichEditorWidget',
      'ui:options': {
        format: 'javascript',
        rows: 3
      },
      'ui:help': 'Expression returning true/false. Access variables, env, input, steps context.'
    },
    maxIterations: {
      'ui:widget': 'SliderWidget',
      'ui:options': {
        min: 1,
        max: 10000,
        step: 100,
        marks: true
      },
      'ui:help': 'Safety limit to prevent infinite loops'
    }
  },
  tags: ['flow', 'loop', 'while', 'repeat', 'condition'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'relay',
        labelPrefix: 'WH',
        colors: {
          body: 0x1a1a1a,
          bodyHover: 0x2a2a2a,
          bodySelected: 0x7e57c2,
          pins: 0x808080,
          pinsConnected: 0xb87333
        },
        features: {
          pinCount: 4
        },
        dimensions: {
          width: 100,
          height: 80
        }
      }
    }
  }
};
