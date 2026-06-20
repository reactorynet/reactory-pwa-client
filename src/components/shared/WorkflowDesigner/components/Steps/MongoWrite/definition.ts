import { StepDefinition, PortType } from '../../../types';

export const MongoWriteStepDefinition: StepDefinition = {
  id: 'mongo_write',
  name: 'MongoDB Write',
  category: 'integration',
  description: 'Insert, update or delete documents in a MongoDB collection',
  icon: 'storage',
  color: '#2e7d32',
  inputPorts: [
    { name: 'previous', type: PortType.CONTROL_INPUT, dataType: 'any', description: 'Previous step in workflow' },
  ],
  outputPorts: [
    { name: 'next', type: PortType.CONTROL_OUTPUT, dataType: 'any', description: 'Next step in workflow' },
    { name: 'result', type: PortType.OUTPUT, dataType: 'object', description: 'Write result' },
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Step Name', default: 'MongoDB Write' },
      connectionId: { type: 'string', title: 'Connection Id', default: 'default' },
      collection: { type: 'string', title: 'Collection' },
      operation: {
        type: 'string',
        title: 'Operation',
        enum: ['insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany'],
        default: 'insertOne',
      },
      document: { type: 'object', title: 'Document', additionalProperties: true },
      documents: { type: 'array', title: 'Documents', items: { type: 'object' } },
      filter: { type: 'object', title: 'Filter', additionalProperties: true },
      update: { type: 'object', title: 'Update', additionalProperties: true },
      upsert: { type: 'boolean', title: 'Upsert', default: false },
    },
    required: ['name', 'collection', 'operation'],
  },
  defaultProperties: { name: 'MongoDB Write', connectionId: 'default', operation: 'insertOne', upsert: false },
  uiSchema: {
    'ui:order': ['name', 'connectionId', 'collection', 'operation', 'document', 'documents', 'filter', 'update', 'upsert'],
    operation: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'insertOne', value: 'insertOne', label: 'Insert One' },
          { key: 'insertMany', value: 'insertMany', label: 'Insert Many' },
          { key: 'updateOne', value: 'updateOne', label: 'Update One' },
          { key: 'updateMany', value: 'updateMany', label: 'Update Many' },
          { key: 'deleteOne', value: 'deleteOne', label: 'Delete One' },
          { key: 'deleteMany', value: 'deleteMany', label: 'Delete Many' },
        ],
      },
    },
  },
  tags: ['integration', 'mongodb', 'database', 'write'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'MDBW',
        colors: { body: 0x1a1a1a, bodyHover: 0x2a2a2a, bodySelected: 0x2e7d32, pins: 0x808080, pinsConnected: 0xb87333 },
        features: { hasNotch: true, pinCount: 3 },
        dimensions: { width: 120, height: 80 },
      },
    },
  },
};
