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
      serviceName: {
        type: 'string',
        title: 'Service Name',
        description: 'Name of the registered service'
      },
      serviceMethod: {
        type: 'string',
        title: 'Service Method',
        description: 'Method name to invoke'
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
    required: ['name', 'serviceName', 'serviceMethod']
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
    'ui:order': ['name', 'serviceName', 'serviceMethod', 'passthrough', 'errorHandling', 'retryConfig'],
    serviceName: {
      'ui:help': 'Name of the registered Reactory service'
    },
    serviceMethod: {
      'ui:help': 'Method to invoke on the service'
    }
  },
  tags: ['integration', 'service', 'invoke', 'reactory']
};
