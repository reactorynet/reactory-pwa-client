import { StepDefinition, PortType } from '../../../types';

export const RESTStepDefinition: StepDefinition = {
  id: 'rest',
  name: 'REST API',
  category: 'integration',
  description: 'Execute REST API request',
  icon: 'http',
  color: '#00bcd4',
  inputPorts: [
    {
      name: 'previous',
      type: PortType.CONTROL_INPUT,
      dataType: 'any',
      description: 'Previous step in workflow'
    },
    {
      name: 'body',
      type: PortType.INPUT,
      dataType: 'any',
      description: 'Request body data'
    },
    {
      name: 'params',
      type: PortType.INPUT,
      dataType: 'object',
      description: 'URL parameters'
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
      name: 'response',
      type: PortType.OUTPUT,
      dataType: 'any',
      description: 'Response data from API'
    },
    {
      name: 'error',
      type: PortType.OUTPUT,
      dataType: 'error',
      description: 'Error if request fails'
    }
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'REST API Call'
      },
      method: {
        type: 'string',
        title: 'HTTP Method',
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        default: 'GET'
      },
      url: {
        type: 'string',
        title: 'URL',
        description: 'API endpoint URL',
        format: 'uri'
      },
      headers: {
        type: 'object',
        title: 'Headers',
        description: 'HTTP headers',
        additionalProperties: {
          type: 'string'
        }
      },
      queryParams: {
        type: 'object',
        title: 'Query Parameters',
        description: 'URL query parameters',
        additionalProperties: {
          type: 'string'
        }
      },
      auth: {
        type: 'object',
        title: 'Authentication',
        properties: {
          type: {
            type: 'string',
            enum: ['none', 'bearer', 'basic', 'api_key'],
            default: 'none'
          },
          token: {
            type: 'string',
            title: 'Token/Key'
          }
        }
      },
      timeout: {
        type: 'number',
        title: 'Timeout (ms)',
        description: 'Request timeout in milliseconds',
        default: 30000,
        minimum: 1000
      },
      retries: {
        type: 'number',
        title: 'Retry Attempts',
        description: 'Number of retry attempts on failure',
        default: 0,
        minimum: 0,
        maximum: 5
      }
    },
    required: ['name', 'method', 'url']
  },
  defaultProperties: {
    name: 'REST API Call',
    method: 'GET',
    headers: {},
    queryParams: {},
    auth: { type: 'none' },
    timeout: 30000,
    retries: 0
  },
  uiSchema: {
    'ui:order': ['name', 'method', 'url', 'headers', 'queryParams', 'auth', 'timeout', 'retries'],
    url: {
      'ui:placeholder': 'https://api.example.com/endpoint',
      'ui:help': 'Full URL of the REST API endpoint'
    },
    headers: {
      'ui:widget': 'textarea',
      'ui:options': {
        rows: 3
      },
      'ui:help': 'JSON object with HTTP headers'
    },
    queryParams: {
      'ui:widget': 'textarea',
      'ui:options': {
        rows: 2
      },
      'ui:help': 'JSON object with query parameters'
    }
  },
  tags: ['integration', 'rest', 'api', 'http'],
  // Rendering configuration
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'HTTP',
        colors: {
          body: 0x1a1a1a,
          bodyHover: 0x2a2a2a,
          bodySelected: 0x00bcd4, // Cyan
          pins: 0x808080,
          pinsConnected: 0xb87333
        },
        features: {
          hasNotch: true,
          pinCount: 10  // 3 inputs + 3 outputs + 4 extras
        },
        dimensions: {
          width: 130,
          height: 90
        }
      },
      animation: {
        executing: {
          pulse: true,
          color: 0x00bcd4,
          duration: 600
        }
      }
    }
  }
};
