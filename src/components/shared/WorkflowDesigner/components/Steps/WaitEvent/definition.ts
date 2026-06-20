import { StepDefinition, PortType } from '../../../types';

export const WaitEventStepDefinition: StepDefinition = {
  id: 'wait_event',
  name: 'Wait for Event',
  category: 'interaction',
  description: 'Pause the workflow until a correlated external event is received',
  icon: 'notifications_active',
  color: '#ffca28',
  inputPorts: [
    { name: 'previous', type: PortType.CONTROL_INPUT, dataType: 'any', description: 'Previous step in workflow' },
  ],
  outputPorts: [
    { name: 'next', type: PortType.CONTROL_OUTPUT, dataType: 'any', description: 'Next step in workflow' },
    { name: 'event', type: PortType.OUTPUT, dataType: 'any', description: 'The received event payload' },
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Step Name', default: 'Wait for Event' },
      eventName: { type: 'string', title: 'Event Name' },
      eventKey: { type: 'string', title: 'Event Key', description: 'expression resolving the correlation key, e.g. input.requestId' },
      timeout: { type: 'number', title: 'Timeout', description: 'ms before giving up' },
      outputVariable: { type: 'string', title: 'Output Variable', description: 'variable to store the event payload' },
    },
    required: ['name', 'eventName'],
  },
  defaultProperties: { name: 'Wait for Event' },
  uiSchema: {
    'ui:order': ['name', 'eventName', 'eventKey', 'timeout', 'outputVariable'],
  },
  tags: ['interaction', 'event', 'wait', 'correlation'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'pushButton',
        labelPrefix: 'EVT',
        colors: { body: 0x1a1a1a, bodyHover: 0x2a2a2a, bodySelected: 0xffca28, pins: 0x808080, pinsConnected: 0xb87333 },
        features: { pinCount: 3 },
        dimensions: { width: 100, height: 70 },
      },
    },
  },
};
