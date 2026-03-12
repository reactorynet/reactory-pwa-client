import { StepDefinition, PortType } from '../../../types';

export const ForEachStepDefinition: StepDefinition = {
  id: 'for_each',
  name: 'For Each',
  category: 'flow',
  description: 'Iterate over a collection and execute child steps for each item',
  icon: 'repeat',
  color: '#ab47bc',
  inputPorts: [
    {
      name: 'previous',
      type: PortType.CONTROL_INPUT,
      dataType: 'any',
      description: 'Previous step in workflow'
    },
    {
      name: 'items',
      type: PortType.INPUT,
      dataType: 'array',
      description: 'Collection to iterate over'
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
      description: 'Continue after all iterations complete'
    },
    {
      name: 'item',
      type: PortType.OUTPUT,
      dataType: 'any',
      description: 'Current iteration item'
    },
    {
      name: 'index',
      type: PortType.OUTPUT,
      dataType: 'number',
      description: 'Current iteration index'
    }
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'For Each'
      },
      items: {
        type: 'string',
        title: 'Items Expression',
        description: 'Expression that resolves to the collection (supports ${variable})'
      },
      itemVariable: {
        type: 'string',
        title: 'Item Variable Name',
        description: 'Variable name for the current item',
        default: 'item'
      },
      indexVariable: {
        type: 'string',
        title: 'Index Variable Name',
        description: 'Variable name for the current index',
        default: 'index'
      },
      maxConcurrency: {
        type: 'number',
        title: 'Max Concurrency',
        description: 'Max parallel iterations (1 = sequential)',
        minimum: 1,
        default: 1
      }
    },
    required: ['name', 'items']
  },
  defaultProperties: {
    name: 'For Each',
    itemVariable: 'item',
    indexVariable: 'index',
    maxConcurrency: 1
  },
  uiSchema: {
    'ui:order': ['name', 'items', 'itemVariable', 'indexVariable', 'maxConcurrency'],
    items: {
      'ui:help': 'Expression resolving to an array, e.g. ${steps.previous.output}'
    }
  },
  tags: ['flow', 'loop', 'iteration', 'forEach', 'repeat'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'relay',
        labelPrefix: 'FE',
        colors: {
          body: 0x1a1a1a,
          bodyHover: 0x2a2a2a,
          bodySelected: 0xab47bc,
          pins: 0x808080,
          pinsConnected: 0xb87333
        },
        features: {
          pinCount: 6
        },
        dimensions: {
          width: 100,
          height: 80
        }
      }
    }
  }
};
