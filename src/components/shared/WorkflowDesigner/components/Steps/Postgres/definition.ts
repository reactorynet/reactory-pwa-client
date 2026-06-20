import { StepDefinition, PortType } from '../../../types';

export const PostgresStepDefinition: StepDefinition = {
  id: 'postgres',
  name: 'PostgreSQL Query',
  category: 'integration',
  description: 'Execute a parameterised SQL query against PostgreSQL',
  icon: 'table_chart',
  color: '#336791',
  inputPorts: [
    { name: 'previous', type: PortType.CONTROL_INPUT, dataType: 'any', description: 'Previous step in workflow' },
  ],
  outputPorts: [
    { name: 'next', type: PortType.CONTROL_OUTPUT, dataType: 'any', description: 'Next step in workflow' },
    { name: 'rows', type: PortType.OUTPUT, dataType: 'any', description: 'Result rows' },
    { name: 'rowCount', type: PortType.OUTPUT, dataType: 'number', description: 'Number of affected rows' },
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Step Name', default: 'PostgreSQL Query' },
      sql: { type: 'string', title: 'SQL', description: 'SQL using $1..$n placeholders' },
      parameters: { type: 'array', title: 'Parameters', items: { type: 'string' } },
      connectionId: { type: 'string', title: 'Connection Id', default: 'default' },
      connectionString: { type: 'string', title: 'Connection String' },
    },
    required: ['name', 'sql'],
  },
  defaultProperties: { name: 'PostgreSQL Query', connectionId: 'default' },
  uiSchema: {
    'ui:order': ['name', 'sql', 'parameters', 'connectionId', 'connectionString'],
    sql: { 'ui:widget': 'RichEditorWidget', 'ui:options': { format: 'sql', rows: 6 } },
  },
  tags: ['integration', 'postgres', 'sql', 'database'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'PGSQL',
        colors: { body: 0x1a1a1a, bodyHover: 0x2a2a2a, bodySelected: 0x336791, pins: 0x808080, pinsConnected: 0xb87333 },
        features: { hasNotch: true, pinCount: 4 },
        dimensions: { width: 120, height: 80 },
      },
    },
  },
};
