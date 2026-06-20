import { StepDefinition, PortType } from '../../../types';

export const SagaStepDefinition: StepDefinition = {
  id: 'saga',
  name: 'Saga',
  category: 'flow',
  description: 'Orchestrate a saga. The saga body and its compensation steps are edited as nested steps on the canvas.',
  icon: 'account_tree',
  color: '#ff7043',
  inputPorts: [
    { name: 'previous', type: PortType.CONTROL_INPUT, dataType: 'any', description: 'Previous step in workflow' },
  ],
  outputPorts: [
    { name: 'next', type: PortType.CONTROL_OUTPUT, dataType: 'any', description: 'Next step in workflow' },
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Step Name', default: 'Saga' },
    },
    required: ['name'],
  },
  defaultProperties: { name: 'Saga' },
  uiSchema: {
    'ui:order': ['name'],
  },
  tags: ['flow', 'saga', 'orchestration', 'compensation'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'SAGA',
        colors: { body: 0x1a1a1a, bodyHover: 0x2a2a2a, bodySelected: 0xff7043, pins: 0x808080, pinsConnected: 0xb87333 },
        features: { hasNotch: true, pinCount: 2 },
        dimensions: { width: 120, height: 80 },
      },
    },
  },
};
