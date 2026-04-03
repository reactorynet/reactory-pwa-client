import { StepDefinition, PortType } from '../../../types';

export const GRPCStepDefinition: StepDefinition = {
  id: 'grpc',
  name: 'gRPC',
  category: 'integration',
  description: 'Execute gRPC service call',
  icon: 'sync_alt',
  color: '#00897b',
  inputPorts: [
    {
      name: 'previous',
      type: PortType.CONTROL_INPUT,
      dataType: 'any',
      description: 'Previous step in workflow'
    },
    {
      name: 'request',
      type: PortType.INPUT,
      dataType: 'object',
      description: 'Request message data'
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
      description: 'Response from gRPC service'
    },
    {
      name: 'error',
      type: PortType.OUTPUT,
      dataType: 'error',
      description: 'Error if call fails'
    }
  ],
  propertySchema: {
    type: 'object',
    title: 'gRPC Call',
    description: 'gRPC call properties',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'gRPC Call'
      },
      host: {
        type: 'string',
        title: 'Server Host',
        description: 'gRPC server host address'
      },
      port: {
        type: 'number',
        title: 'Server Port',
        description: 'gRPC server port',
        default: 50051
      },
      service: {
        type: 'string',
        title: 'Service Name',
        description: 'Fully qualified service name'
      },
      method: {
        type: 'string',
        title: 'Method Name',
        description: 'Service method to call'
      },
      protoPath: {
        type: 'string',
        title: 'Proto File Path',
        description: 'Path to .proto definition file'
      },
      metadata: {
        type: 'array',
        title: 'Metadata',
        description: 'gRPC metadata headers',
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
      },
      ssl: {
        type: 'boolean',
        title: 'Use SSL/TLS',
        description: 'Enable SSL/TLS encryption',
        default: false
      }
    },
    required: ['name', 'host', 'port', 'service', 'method']
  },
  defaultProperties: {
    name: 'gRPC Call',
    port: 50051,
    metadata: [],
    timeout: 30000,
    ssl: false
  },
  uiSchema: {
    'ui:order': ['name', 'host', 'port', 'service', 'method', 'protoPath', 'metadata', 'timeout', 'ssl'],
    host: {
      'ui:placeholder': 'grpc.example.com',
      'ui:help': 'gRPC server hostname or IP address'
    },
    port: {
      'ui:placeholder': '50051'
    },
    service: {
      'ui:placeholder': 'e.g. myapp.UserService',
      'ui:help': 'Fully qualified service name as defined in the .proto file'
    },
    method: {
      'ui:placeholder': 'e.g. GetUser',
      'ui:help': 'Name of the service method to invoke'
    },
    protoPath: {
      'ui:placeholder': '/path/to/service.proto',
      'ui:help': 'Path to the .proto definition file'
    },
    metadata: {
      'ui:widget': 'MaterialTableWidget',
      'ui:options': {
        columns: [
          { title: 'Key', field: 'key' },
          { title: 'Value', field: 'value' }
        ]
      },
      'ui:help': 'gRPC metadata key-value pairs (equivalent to HTTP headers)'
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
    ssl: {
      'ui:help': 'Enable SSL/TLS encryption for the gRPC connection. Ensure the server certificate is trusted by the runtime environment.'
    }
  },
  tags: ['integration', 'grpc', 'rpc', 'microservices'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'RPC',
        colors: {
          bodySelected: 0x00897b,
        }
      }
    }
  }
};
