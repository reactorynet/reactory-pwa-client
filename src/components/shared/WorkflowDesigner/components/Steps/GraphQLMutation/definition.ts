import { StepDefinition, PortType } from '../../../types';

export const GraphQLMutationStepDefinition: StepDefinition = {
  id: 'graphql_mutate',
  name: 'GraphQL Mutation',
  category: 'integration',
  description: 'Execute a GraphQL mutation',
  icon: 'schema',
  color: '#e10098',
  inputPorts: [
    { name: 'previous', type: PortType.CONTROL_INPUT, dataType: 'any', description: 'Previous step in workflow' },
  ],
  outputPorts: [
    { name: 'next', type: PortType.CONTROL_OUTPUT, dataType: 'any', description: 'Next step in workflow' },
    { name: 'data', type: PortType.OUTPUT, dataType: 'any', description: 'Mutation data' },
    { name: 'errors', type: PortType.OUTPUT, dataType: 'any', description: 'GraphQL errors' },
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Step Name', default: 'GraphQL Mutation' },
      query: { type: 'string', title: 'Mutation' },
      variables: { type: 'object', title: 'Variables', additionalProperties: true },
      operationName: { type: 'string', title: 'Operation Name' },
    },
    required: ['name', 'query'],
  },
  defaultProperties: { name: 'GraphQL Mutation' },
  uiSchema: {
    'ui:order': ['name', 'query', 'variables', 'operationName'],
    query: { 'ui:widget': 'RichEditorWidget', 'ui:options': { format: 'graphql', rows: 6 } },
  },
  tags: ['integration', 'graphql', 'mutation'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'GQLM',
        colors: { body: 0x1a1a1a, bodyHover: 0x2a2a2a, bodySelected: 0xe10098, pins: 0x808080, pinsConnected: 0xb87333 },
        features: { hasNotch: true, pinCount: 4 },
        dimensions: { width: 120, height: 80 },
      },
    },
  },
};
