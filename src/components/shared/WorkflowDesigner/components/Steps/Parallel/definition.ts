import { StepDefinition, PortType } from '../../../types';

export const ParallelStepDefinition: StepDefinition = {
  id: 'parallel',
  name: 'Parallel',
  category: 'flow',
  description: 'Execute multiple branches in parallel',
  icon: 'call_split',
  color: '#9c27b0',
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
      name: 'branch1',
      type: PortType.CONTROL_OUTPUT,
      dataType: 'any',
      description: 'First parallel branch'
    },
    {
      name: 'branch2',
      type: PortType.CONTROL_OUTPUT,
      dataType: 'any',
      description: 'Second parallel branch'
    }
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'Parallel'
      },
      maxConcurrency: {
        type: 'number',
        title: 'Max Concurrency',
        description: 'Maximum number of parallel executions',
        minimum: 1,
        maximum: 10,
        default: 2
      }
    },
    required: ['name']
  },
  defaultProperties: {
    name: 'Parallel',
    maxConcurrency: 2
  },
  uiSchema: {
    maxConcurrency: {
      'ui:help': 'Number of parallel branches that can execute simultaneously'
    }
  },
  tags: ['flow', 'parallel', 'concurrent', 'split']
};
