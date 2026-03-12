import { StepDefinition, PortType } from '../../../types';

export const DataTransformStepDefinition: StepDefinition = {
  id: 'data_transform',
  name: 'Data Transform',
  category: 'logic',
  description: 'Transform data using map, filter, reduce, and other operations',
  icon: 'transform',
  color: '#ff7043',
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
      description: 'Input data to transform'
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
      description: 'Transformed data'
    }
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'Data Transform'
      },
      transformations: {
        type: 'array',
        title: 'Transformations',
        items: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              title: 'Operation',
              enum: ['map', 'filter', 'reduce', 'sort', 'group', 'merge', 'extract', 'custom']
            },
            source: {
              type: 'string',
              title: 'Source Field'
            },
            target: {
              type: 'string',
              title: 'Target Field'
            },
            expression: {
              type: 'string',
              title: 'Expression',
              description: 'Transformation expression'
            }
          }
        }
      }
    },
    required: ['name']
  },
  defaultProperties: {
    name: 'Data Transform',
    transformations: []
  },
  uiSchema: {
    'ui:order': ['name', 'transformations'],
    transformations: {
      'ui:help': 'Define data transformation operations to apply sequentially'
    }
  },
  tags: ['logic', 'transform', 'data', 'map', 'filter'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'XFM',
        colors: {
          body: 0x1a1a1a,
          bodyHover: 0x2a2a2a,
          bodySelected: 0xff7043,
          pins: 0x808080,
          pinsConnected: 0xb87333
        },
        features: {
          hasNotch: true,
          pinCount: 6
        },
        dimensions: {
          width: 100,
          height: 70
        }
      }
    }
  }
};
