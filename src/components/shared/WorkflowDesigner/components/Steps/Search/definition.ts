import { StepDefinition, PortType } from '../../../types';

export const SearchStepDefinition: StepDefinition = {
  id: 'search',
  name: 'Search',
  category: 'integration',
  description: 'Search, index or manage a search index',
  icon: 'search',
  color: '#5c6bc0',
  inputPorts: [
    { name: 'previous', type: PortType.CONTROL_INPUT, dataType: 'any', description: 'Previous step in workflow' },
  ],
  outputPorts: [
    { name: 'next', type: PortType.CONTROL_OUTPUT, dataType: 'any', description: 'Next step in workflow' },
    { name: 'results', type: PortType.OUTPUT, dataType: 'object', description: 'Search results' },
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Step Name', default: 'Search' },
      operation: {
        type: 'string',
        title: 'Operation',
        enum: ['search', 'index', 'createIndex', 'deleteIndex'],
        default: 'search',
      },
      indexName: { type: 'string', title: 'Index Name', description: 'Name of the search index' },
      query: { type: 'string', title: 'Query' },
      filters: { type: 'string', title: 'Filters' },
      limit: { type: 'number', title: 'Limit', default: 20 },
      offset: { type: 'number', title: 'Offset', default: 0 },
    },
    required: ['name', 'operation', 'indexName'],
  },
  defaultProperties: { name: 'Search', operation: 'search', limit: 20, offset: 0 },
  uiSchema: {
    'ui:order': ['name', 'operation', 'indexName', 'query', 'filters', 'limit', 'offset'],
    operation: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'search', value: 'search', label: 'Search' },
          { key: 'index', value: 'index', label: 'Index' },
          { key: 'createIndex', value: 'createIndex', label: 'Create Index' },
          { key: 'deleteIndex', value: 'deleteIndex', label: 'Delete Index' },
        ],
      },
    },
  },
  tags: ['integration', 'search', 'index'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'FIND',
        colors: { body: 0x1a1a1a, bodyHover: 0x2a2a2a, bodySelected: 0x5c6bc0, pins: 0x808080, pinsConnected: 0xb87333 },
        features: { hasNotch: true, pinCount: 3 },
        dimensions: { width: 120, height: 80 },
      },
    },
  },
};
