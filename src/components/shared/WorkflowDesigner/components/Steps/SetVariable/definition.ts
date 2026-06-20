import { StepDefinition, PortType } from '../../../types';

export const SetVariableStepDefinition: StepDefinition = {
  id: 'set_variable',
  name: 'Set Variable',
  category: 'logic',
  description: 'Set, get or delete a workflow-scoped variable',
  icon: 'data_object',
  color: '#7e57c2',
  inputPorts: [
    { name: 'previous', type: PortType.CONTROL_INPUT, dataType: 'any', description: 'Previous step in workflow' },
  ],
  outputPorts: [
    { name: 'next', type: PortType.CONTROL_OUTPUT, dataType: 'any', description: 'Next step in workflow' },
    { name: 'value', type: PortType.OUTPUT, dataType: 'any', description: 'The resolved variable value' },
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Step Name', default: 'Set Variable' },
      action: { type: 'string', title: 'Action', enum: ['set', 'get', 'delete'], default: 'set' },
      key: { type: 'string', title: 'Variable Key', description: 'Name of the workflow variable' },
      value: { type: 'string', title: 'Value', description: 'Literal value (when source = literal)' },
      source: {
        type: 'string',
        title: 'Source',
        enum: ['literal', 'step_output', 'input', 'env'],
        default: 'literal',
        description: 'Where to read the value from',
      },
      sourcePath: { type: 'string', title: 'Source Path', description: 'Dot-path for step_output / input / env sources' },
    },
    required: ['name', 'action', 'key'],
  },
  defaultProperties: { name: 'Set Variable', action: 'set', source: 'literal' },
  uiSchema: {
    'ui:order': ['name', 'action', 'key', 'source', 'value', 'sourcePath'],
    action: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'set', value: 'set', label: 'Set' },
          { key: 'get', value: 'get', label: 'Get' },
          { key: 'delete', value: 'delete', label: 'Delete' },
        ],
      },
    },
    source: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'literal', value: 'literal', label: 'Literal' },
          { key: 'step_output', value: 'step_output', label: 'Step Output' },
          { key: 'input', value: 'input', label: 'Workflow Input' },
          { key: 'env', value: 'env', label: 'Environment' },
        ],
      },
    },
    sourcePath: { 'ui:help': 'e.g. fetchUser.outputs.id (for step_output)' },
  },
  tags: ['logic', 'variable', 'state', 'data'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'led',
        labelPrefix: 'VAR',
        colors: { body: 0x1a1a1a, bodyHover: 0x2a2a2a, bodySelected: 0x7e57c2, pins: 0x808080, pinsConnected: 0xb87333 },
        features: { hasGlow: true, pinCount: 3 },
        dimensions: { width: 90, height: 60 },
      },
    },
  },
};
