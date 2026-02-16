import { StepDefinition, PortType } from '../../../types';

export const JoinStepDefinition: StepDefinition = {
  id: 'join',
  name: 'Join',
  category: 'flow',
  description: 'Join multiple branches back together',
  icon: 'call_merge',
  color: '#9c27b0',
  inputPorts: [
    {
      name: 'branch1',
      type: PortType.CONTROL_INPUT,
      dataType: 'any',
      description: 'First branch to join'
    },
    {
      name: 'branch2',
      type: PortType.CONTROL_INPUT,
      dataType: 'any',
      description: 'Second branch to join'
    }
  ],
  outputPorts: [
    {
      name: 'next',
      type: PortType.CONTROL_OUTPUT,
      dataType: 'any',
      description: 'Next step after join'
    }
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'Join'
      },
      waitForAll: {
        type: 'boolean',
        title: 'Wait for All Branches',
        description: 'Wait for all branches to complete before continuing',
        default: true
      }
    },
    required: ['name']
  },
  defaultProperties: {
    name: 'Join',
    waitForAll: true
  },
  uiSchema: {
    waitForAll: {
      'ui:help': 'If enabled, waits for all branches to complete before continuing'
    }
  },
  tags: ['flow', 'join', 'merge', 'synchronize']
};
