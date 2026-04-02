import { argsToArgsConfig } from 'graphql/type/definition';
import { StepDefinition, PortType } from '../../../types';

export const ServiceInvokeStepDefinition: StepDefinition = {
  id: 'service_invoke',
  name: 'Service Invoke',
  category: 'integration',
  description: 'Invoke a registered Reactory service',
  icon: 'settings_applications',
  color: '#5e35b1',
  inputPorts: [
    {
      name: 'previous',
      type: PortType.CONTROL_INPUT,
      dataType: 'any',
      description: 'Previous step in workflow'
    },
    {
      name: 'params',
      type: PortType.INPUT,
      dataType: 'any',
      description: 'Parameters for service method'
    },
    {
      name: 'context',
      type: PortType.INPUT,
      dataType: 'object',
      description: 'Execution context'
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
      name: 'result',
      type: PortType.OUTPUT,
      dataType: 'any',
      description: 'Service method result'
    },
    {
      name: 'error',
      type: PortType.OUTPUT,
      dataType: 'error',
      description: 'Error if invocation fails'
    }
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'Service Invoke'
      },
      serviceId: {
        type: 'string',
        title: 'Service ID',
        description: 'ID of the registered service'
      },
      serviceMethod: {
        type: 'string',
        title: 'Service Method',
        description: 'Method name to invoke'
      },
      arguments: {
        "description": "Step input parameters (object or JSON-serialized string)",
          "oneOf": [
            { "type": "string" },
            {
              "type": "object",
              "patternProperties": {
                "^[a-zA-Z][a-zA-Z0-9_]*$": {
                  "oneOf": [
                    { "type": "string" },
                    { "type": "number" },
                    { "type": "boolean" },
                    { "type": "null" },
                    { "type": "object" },
                    { "type": "array" }
                  ]
                }
              }
            }
          ]
      },
      passthrough: {
        type: 'boolean',
        title: 'Passthrough Result',
        description: 'Pass the result directly to next step',
        default: true
      },
      errorHandling: {
        type: 'string',
        title: 'Error Handling',
        enum: ['throw', 'continue', 'retry'],
        default: 'throw'
      },
      retryConfig: {
        type: 'object',
        title: 'Retry Configuration',
        properties: {
          maxAttempts: {
            type: 'number',
            title: 'Max Attempts',
            default: 3,
            minimum: 1,
            maximum: 10
          },
          delay: {
            type: 'number',
            title: 'Delay (ms)',
            default: 1000,
            minimum: 100
          },
          backoff: {
            type: 'string',
            title: 'Backoff Strategy',
            enum: ['linear', 'exponential'],
            default: 'exponential'
          }
        }
      }
    },
    required: ['name', 'serviceId', 'serviceMethod']
  },
  defaultProperties: {
    name: 'Service Invoke',
    passthrough: true,
    errorHandling: 'throw',
    retryConfig: {
      maxAttempts: 3,
      delay: 1000,
      backoff: 'exponential'
    }
  },
  uiSchema: {
    'ui:order': [
      'name', 
      'serviceId', 
      'serviceMethod', 
      'arguments',
      'passthrough', 
      'errorHandling', 
      'retryConfig'
    ],
    serviceId: {
      'ui:placeholder': 'e.g. core.UserService',
      'ui:help': 'ID of the registered Reactory service'
    },
    serviceMethod: {
      'ui:placeholder': 'e.g. getUserById',
      'ui:help': 'Method to invoke on the service'
    },
    arguments: {
      'ui:widget': 'RichEditorWidget',
      'ui:options': {
        format: 'json',
        rows: 6
      },
      'ui:help': 'Arguments to pass as a JSON object. Supports ${variable} substitution from workflow context.'
    },
    passthrough: {
      'ui:options': {
        yesLabel: 'Passthrough',
        noLabel: 'Standard',
        yesIcon: 'call_merge',
        noIcon: 'call_split',
        showLabels: true
      }      
    },
    errorHandling: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'throw', value: 'throw', label: 'Throw (halt workflow)', icon: 'error' },
          { key: 'continue', value: 'continue', label: 'Continue (ignore error)', icon: 'skip_next' },
          { key: 'retry', value: 'retry', label: 'Retry', icon: 'replay' }
        ]
      },
      'ui:help': 'How to handle errors from the service invocation'
    },
    retryConfig: {
      maxAttempts: {
        'ui:widget': 'SliderWidget',
        'ui:options': {
          min: 1,
          max: 10,
          step: 1,
          marks: true
        },
        'ui:help': 'Maximum number of retry attempts'
      },
      delay: {
        'ui:widget': 'SliderWidget',
        'ui:options': {
          min: 100,
          max: 30000,
          step: 100
        },
        'ui:help': 'Initial delay between retries in milliseconds'
      },
      backoff: {
        'ui:widget': 'SelectWidget',
        'ui:options': {
          selectOptions: [
            { key: 'linear', value: 'linear', label: 'Linear', icon: 'trending_flat' },
            { key: 'exponential', value: 'exponential', label: 'Exponential', icon: 'trending_up' }
          ]
        },
        'ui:help': 'Linear: constant delay between attempts. Exponential: delay doubles each attempt.'
      }
    }
  },
  tags: ['integration', 'service', 'invoke', 'reactory'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'SVC',
        colors: {
          bodySelected: 0x5e35b1,
        }
      }
    }
  }
};
