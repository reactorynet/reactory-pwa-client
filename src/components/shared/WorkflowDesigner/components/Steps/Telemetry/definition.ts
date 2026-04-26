import { StepDefinition, PortType } from '../../../types';

export const TelemetryStepDefinition: StepDefinition = {
  id: 'telemetry',
  name: 'Telemetry',
  category: 'observability',
  description: 'Record metrics, traces, and logs',
  icon: 'analytics',
  color: '#607d8b',
  inputPorts: [
    {
      name: 'previous',
      type: PortType.CONTROL_INPUT,
      dataType: 'any',
      description: 'Previous step in workflow'
    },
    {
      name: 'data',
      type: PortType.INPUT,
      dataType: 'any',
      description: 'Data to record'
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
      name: 'recorded',
      type: PortType.OUTPUT,
      dataType: 'boolean',
      description: 'Whether telemetry was recorded successfully'
    }
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'Telemetry'
      },
      telemetryType: {
        type: 'string',
        title: 'Telemetry Type',
        enum: ['metric', 'trace', 'log', 'event'],
        default: 'metric'
      },
      metricConfig: {
        type: 'object',
        title: 'Metric Configuration',
        properties: {
          name: {
            type: 'string',
            title: 'Metric Name'
          },
          type: {
            type: 'string',
            title: 'Type',
            enum: ['counter', 'gauge', 'histogram'],
            default: 'counter'
          },
          value: {
            type: 'number',
            title: 'Value',
            default: 1
          },
          tags: {
            type: 'object',
            title: 'Tags',
            properties: {},
            additionalProperties: { type: 'string' }
          }
        }
      },
      logConfig: {
        type: 'object',
        title: 'Log Configuration',
        properties: {
          level: {
            type: 'string',
            title: 'Level',
            enum: ['debug', 'info', 'warn', 'error'],
            default: 'info'
          },
          message: {
            type: 'string',
            title: 'Message'
          },
          attributes: {
            type: 'object',
            title: 'Attributes',
            properties: {},
            additionalProperties: true
          }
        }
      },
      traceConfig: {
        type: 'object',
        title: 'Trace Configuration',
        properties: {
          spanName: {
            type: 'string',
            title: 'Span Name'
          },
          attributes: {
            type: 'object',
            title: 'Span Attributes',
            properties: {},
            additionalProperties: { type: 'string' }
          }
        }
      },
      exporters: {
        type: 'array',
        title: 'Exporters',
        items: {
          type: 'string',
          enum: ['console', 'otlp', 'prometheus', 'jaeger']
        },
        default: ['console']
      }
    },
    required: ['name', 'telemetryType']
  },
  defaultProperties: {
    name: 'Telemetry',
    telemetryType: 'metric',
    exporters: ['console']
  },
  uiSchema: {
    'ui:order': ['name', 'telemetryType', 'metricConfig', 'logConfig', 'traceConfig', 'exporters'],
    telemetryType: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'metric', value: 'metric', label: 'Metric', icon: 'speed' },
          { key: 'trace', value: 'trace', label: 'Trace', icon: 'route' },
          { key: 'log', value: 'log', label: 'Log', icon: 'terminal' },
          { key: 'event', value: 'event', label: 'Event', icon: 'event' }
        ]
      }
    },
    metricConfig: {
      'ui:help': 'Configuration for metric collection (visible when Telemetry Type is Metric)',
      type: {
        'ui:widget': 'SelectWidget',
        'ui:options': {
          selectOptions: [
            { key: 'counter', value: 'counter', label: 'Counter', icon: 'add_circle' },
            { key: 'gauge', value: 'gauge', label: 'Gauge', icon: 'speed' },
            { key: 'histogram', value: 'histogram', label: 'Histogram', icon: 'bar_chart' }
          ]
        }
      }
    },
    logConfig: {
      'ui:help': 'Configuration for log entries (visible when Telemetry Type is Log)',
      level: {
        'ui:widget': 'SelectWidget',
        'ui:options': {
          selectOptions: [
            { key: 'debug', value: 'debug', label: 'Debug', icon: 'bug_report' },
            { key: 'info', value: 'info', label: 'Info', icon: 'info' },
            { key: 'warn', value: 'warn', label: 'Warn', icon: 'warning' },
            { key: 'error', value: 'error', label: 'Error', icon: 'error' }
          ]
        }
      }
    },
    traceConfig: {
      'ui:help': 'Configuration for trace spans (visible when Telemetry Type is Trace)',
      spanName: {
        'ui:placeholder': 'e.g. workflow.step.operation'
      }
    }
  },
  tags: ['observability', 'telemetry', 'metrics', 'tracing', 'logging'],
  // Rendering configuration
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'sevenSegment',
        labelPrefix: 'DSP',
        colors: {
          body: 0x1a1a1a,
          bodyHover: 0x2a2a2a,
          bodySelected: 0x607d8b, // Blue gray
          pins: 0x808080,
          pinsConnected: 0xb87333
        },
        features: {
          hasNotch: true,
          pinCount: 6
        },
        dimensions: {
          width: 100,
          height: 70
        }
      },
      animation: {
        idle: {
          pulse: true,
          speed: 2
        },
        executing: {
          pulse: true,
          color: 0x607d8b,
          duration: 1200
        }
      },
      // Custom material with shader for data visualization effect
      material: {
        type: 'shader',
        shader: {
          uniforms: {
            time: { type: 'float', value: 0 },
            color: { type: 'vec3', value: [0.376, 0.49, 0.545] }
          }
        }
      }
    }
  }
};
