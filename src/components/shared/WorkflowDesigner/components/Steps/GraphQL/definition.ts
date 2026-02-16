import { StepDefinition, PortType } from '../../../types';

export const GraphQLStepDefinition: StepDefinition = {
  id: 'graphql',
  name: 'GraphQL',
  category: 'integration',
  description: 'Execute GraphQL query or mutation',
  icon: 'api',
  color: '#e535ab',
  inputPorts: [
    {
      name: 'previous',
      type: PortType.CONTROL_INPUT,
      dataType: 'any',
      description: 'Previous step in workflow'
    },
    {
      name: 'variables',
      type: PortType.INPUT,
      dataType: 'object',
      description: 'Variables for the GraphQL query'
    }
  ],
  outputPorts: [
    {
      name: 'next',
      type: PortType.CONTROL_OUTPUT,
      dataType: 'any',
      description: 'Next step in workflow'
    },
    {
      name: 'data',
      type: PortType.OUTPUT,
      dataType: 'any',
      description: 'Response data from GraphQL'
    },
    {
      name: 'error',
      type: PortType.OUTPUT,
      dataType: 'error',
      description: 'Error if query fails'
    }
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'GraphQL Query'
      },
      endpoint: {
        type: 'string',
        title: 'Endpoint URL',
        description: 'GraphQL endpoint URL',
        format: 'uri'
      },
      operation: {
        type: 'string',
        title: 'Operation Type',
        enum: ['query', 'mutation', 'subscription'],
        default: 'query'
      },
      query: {
        type: 'string',
        title: 'GraphQL Query/Mutation',
        description: 'GraphQL query or mutation string'
      },
      headers: {
        title: 'HTTP Headers',
        description: 'Additional headers to send with request',
        type: 'array',
        items: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              title: 'Key'
            },
            value: {
              type: 'string',
              title: 'Value'
            }
          }
        }
      },
      timeout: {
        type: 'number',
        title: 'Timeout (ms)',
        description: 'Request timeout in milliseconds',
        default: 30000,
        minimum: 1000
      }
    },
    required: ['name', 'endpoint', 'query']
  },
  defaultProperties: {
    name: 'GraphQL Query',
    operation: 'query',
    timeout: 30000,
    headers: {}
  },
  uiSchema: {
    'ui:order': ['name', 'endpoint', 'operation', 'query', 'headers', 'timeout'],
    query: {
      'ui:widget': 'textarea',
      'ui:options': {
        rows: 10
      }
    },
    headers: {
      'ui:widget': 'textarea',
      'ui:options': {
        rows: 3
      },
      'ui:help': 'JSON object with header key-value pairs'
    }
  },
  tags: ['integration', 'graphql', 'api', 'query'],
  // Rendering configuration
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'API',
        colors: {
          body: 0x1a1a1a,         // Black IC chip
          bodyHover: 0x2a2a2a,
          bodySelected: 0xe535ab, // GraphQL pink
          pins: 0x808080,
          pinsConnected: 0xb87333
        },
        features: {
          hasNotch: true,
          pinCount: 8  // 2 inputs + 3 outputs + 3 extras
        },
        dimensions: {
          width: 120,
          height: 80
        }
      },
      animation: {
        hover: {
          scale: 1.02,
          duration: 200
        },
        executing: {
          pulse: true,
          color: 0xe535ab,
          duration: 800
        }
      }
    },
    // SVG fallback configuration
    svg: {
      type: 'svg',
      paths: [
        {
          d: 'M0,0 L120,0 L120,80 L0,80 Z',
          fill: '#1a1a1a',
          stroke: '#e535ab',
          strokeWidth: 2
        }
      ]
    }
  }
};
