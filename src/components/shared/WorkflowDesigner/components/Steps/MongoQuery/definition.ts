import { StepDefinition, PortType } from '../../../types';

export const MongoQueryStepDefinition: StepDefinition = {
  id: 'mongo_query',
  name: 'MongoDB Query',
  category: 'integration',
  description: 'Query documents from a MongoDB collection',
  icon: 'storage',
  color: '#43a047',
  inputPorts: [
    { name: 'previous', type: PortType.CONTROL_INPUT, dataType: 'any', description: 'Previous step in workflow' },
  ],
  outputPorts: [
    { name: 'next', type: PortType.CONTROL_OUTPUT, dataType: 'any', description: 'Next step in workflow' },
    { name: 'result', type: PortType.OUTPUT, dataType: 'any', description: 'Query result' },
    { name: 'count', type: PortType.OUTPUT, dataType: 'number', description: 'Document count' },
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Step Name', default: 'MongoDB Query' },
      connectionId: { type: 'string', title: 'Connection Id', default: 'default' },
      collection: { type: 'string', title: 'Collection' },
      operation: {
        type: 'string',
        title: 'Operation',
        enum: ['find', 'findOne', 'aggregate', 'count'],
        default: 'find',
      },
      filter: { type: 'object', title: 'Filter', additionalProperties: true },
      projection: { type: 'object', title: 'Projection', additionalProperties: true },
      sort: { type: 'object', title: 'Sort', additionalProperties: true },
      limit: { type: 'number', title: 'Limit' },
      skip: { type: 'number', title: 'Skip' },
      pipeline: { type: 'array', title: 'Pipeline', items: { type: 'object' } },
    },
    required: ['name', 'collection', 'operation'],
  },
  defaultProperties: { name: 'MongoDB Query', connectionId: 'default', operation: 'find' },
  uiSchema: {
    'ui:order': ['name', 'connectionId', 'collection', 'operation', 'filter', 'projection', 'sort', 'limit', 'skip', 'pipeline'],
    operation: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'find', value: 'find', label: 'Find' },
          { key: 'findOne', value: 'findOne', label: 'Find One' },
          { key: 'aggregate', value: 'aggregate', label: 'Aggregate' },
          { key: 'count', value: 'count', label: 'Count' },
        ],
      },
    },
  },
  tags: ['integration', 'mongodb', 'database', 'query'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'MDBQ',
        colors: { body: 0x1a1a1a, bodyHover: 0x2a2a2a, bodySelected: 0x43a047, pins: 0x808080, pinsConnected: 0xb87333 },
        features: { hasNotch: true, pinCount: 4 },
        dimensions: { width: 120, height: 80 },
      },
    },
  },
};
