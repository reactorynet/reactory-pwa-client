import { StepDefinition, PortType } from '../../../types';

export const UserLookupStepDefinition: StepDefinition = {
  id: 'user_lookup',
  name: 'User Lookup',
  category: 'integration',
  description: 'Look up a Reactory user by email, id or username',
  icon: 'person_search',
  color: '#8d6e63',
  inputPorts: [
    { name: 'previous', type: PortType.CONTROL_INPUT, dataType: 'any', description: 'Previous step in workflow' },
  ],
  outputPorts: [
    { name: 'next', type: PortType.CONTROL_OUTPUT, dataType: 'any', description: 'Next step in workflow' },
    { name: 'user', type: PortType.OUTPUT, dataType: 'object', description: 'The resolved user' },
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Step Name', default: 'User Lookup' },
      email: { type: 'string', title: 'Email', description: 'Look up by email address' },
      id: { type: 'string', title: 'Id', description: 'Look up by user id' },
      username: { type: 'string', title: 'Username', description: 'Look up by username' },
    },
    required: ['name'],
  },
  defaultProperties: { name: 'User Lookup' },
  uiSchema: {
    'ui:order': ['name', 'email', 'id', 'username'],
  },
  tags: ['integration', 'user', 'lookup', 'identity'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'USER',
        colors: { body: 0x1a1a1a, bodyHover: 0x2a2a2a, bodySelected: 0x8d6e63, pins: 0x808080, pinsConnected: 0xb87333 },
        features: { hasNotch: true, pinCount: 3 },
        dimensions: { width: 120, height: 80 },
      },
    },
  },
};
