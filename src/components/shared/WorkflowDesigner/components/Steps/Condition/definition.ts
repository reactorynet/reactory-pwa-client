import { StepDefinition, PortType } from '../../../types';

export const ConditionStepDefinition: StepDefinition = {
  id: 'condition',
  name: 'Condition',
  category: 'logic',
  description: 'Conditional branching step',
  icon: 'alt_route',
  color: '#ff9800',
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
      description: 'Input data for condition evaluation'
    }
  ],
  outputPorts: [
    {
      name: 'true',
      type: PortType.CONTROL_OUTPUT,
      dataType: 'any',
      description: 'Path when condition is true'
    },
    {
      name: 'false',
      type: PortType.CONTROL_OUTPUT,
      dataType: 'any',
      description: 'Path when condition is false'
    }
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'Condition'
      },
      expression: {
        type: 'string',
        title: 'Condition Expression',
        description: 'JavaScript expression to evaluate',
        default: 'input.value > 0'
      }
    },
    required: ['name', 'expression']
  },
  defaultProperties: {
    name: 'Condition',
    expression: 'input.value > 0'
  },
  uiSchema: {
    expression: {
      'ui:widget': 'textarea',
      'ui:options': {
        rows: 3
      },
      'ui:help': 'JavaScript expression that evaluates to true/false'
    }
  },
  tags: ['logic', 'condition', 'branch', 'if']
};
