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
        type: 'array',
        title: 'Headers',
        description: 'HTTP request headers (key-value pairs)',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string', title: 'Header Name' },
            value: { type: 'string', title: 'Value' }
          }
        }
      },
      queryParams: {
        type: 'array',
        title: 'Query Parameters',
        description: 'URL query parameters (key-value pairs)',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string', title: 'Parameter Name' },
            value: { type: 'string', title: 'Value' }
          }
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
    headers: [],
    queryParams: [],
    auth: { type: 'none' },
    timeout: 30000,
    retries: 0
  },
  uiSchema: {
    'ui:order': ['name', 'method', 'url', 'headers', 'queryParams', 'auth', 'timeout', 'retries'],
    method: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'GET', value: 'GET', label: 'GET', icon: 'download' },
          { key: 'POST', value: 'POST', label: 'POST', icon: 'upload' },
          { key: 'PUT', value: 'PUT', label: 'PUT', icon: 'edit' },
          { key: 'PATCH', value: 'PATCH', label: 'PATCH', icon: 'build' },
          { key: 'DELETE', value: 'DELETE', label: 'DELETE', icon: 'delete' }
        ]
      }
    },
    url: {
      'ui:placeholder': 'https://api.example.com/resources',
      'ui:help': 'Full URL of the REST endpoint. Supports ${variable} substitution.'
    },
    headers: {
      'ui:widget': 'MaterialTableWidget',
      'ui:options': {
        columns: [
          { title: 'Header Name', field: 'key' },
          { title: 'Value', field: 'value' }
        ]
      },
      'ui:help': 'HTTP headers to include with the request'
    },
    queryParams: {
      'ui:widget': 'MaterialTableWidget',
      'ui:options': {
        columns: [
          { title: 'Parameter', field: 'key' },
          { title: 'Value', field: 'value' }
        ]
      },
      'ui:help': 'URL query parameters appended to the request URL'
    },
    auth: {
      type: {
        'ui:widget': 'SelectWidget',
        'ui:options': {
          selectOptions: [
            { key: 'none', value: 'none', label: 'None', icon: 'lock_open' },
            { key: 'bearer', value: 'bearer', label: 'Bearer Token', icon: 'token' },
            { key: 'basic', value: 'basic', label: 'Basic Auth', icon: 'person' },
            { key: 'api_key', value: 'api_key', label: 'API Key', icon: 'key' }
          ]
        }
      },
      token: {
        'ui:placeholder': 'Enter token or API key',
        'ui:help': 'Authentication credential (token, password, or API key)'
      }
    },
    timeout: {
      'ui:widget': 'SliderWidget',
      'ui:options': {
        min: 1000,
        max: 120000,
        step: 1000
      },
      'ui:help': 'Request timeout in milliseconds (1 000 ms = 1s — 120 000 ms = 120s)'
    },
    retries: {
      'ui:widget': 'SliderWidget',
      'ui:options': {
        min: 0,
        max: 5,
        step: 1,
        marks: true
      },
      'ui:help': 'Number of retry attempts on request failure (0 = no retries)'
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
