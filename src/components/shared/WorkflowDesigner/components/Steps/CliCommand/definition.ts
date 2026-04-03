import { StepDefinition, PortType } from '../../../types';

export const CliCommandStepDefinition: StepDefinition = {
  id: 'cliCommand',
  name: 'CLI Command',
  category: 'action',
  description: 'Execute a command-line command',
  icon: 'code',
  color: '#455a64',
  inputPorts: [
    {
      name: 'previous',
      type: PortType.CONTROL_INPUT,
      dataType: 'any',
      description: 'Previous step in workflow'
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
      name: 'stdout',
      type: PortType.OUTPUT,
      dataType: 'string',
      description: 'Standard output from the command'
    },
    {
      name: 'exitCode',
      type: PortType.OUTPUT,
      dataType: 'number',
      description: 'Process exit code'
    }
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'CLI Command'
      },
      command: {
        type: 'string',
        title: 'Command',
        description: 'The command to execute'
      },
      arguments: {
        type: 'array',
        title: 'Arguments',
        items: { type: 'string' }
      },
      workingDirectory: {
        type: 'string',
        title: 'Working Directory',
        description: 'Directory to run the command in'
      },
      environment: {
        type: 'object',
        title: 'Environment Variables',
        properties: {},
        additionalProperties: { type: 'string' }
      },
      expectedExitCodes: {
        type: 'array',
        title: 'Expected Exit Codes',
        description: 'Exit codes considered successful',
        items: { type: 'number' },
        default: [0]
      }
    },
    required: ['name', 'command']
  },
  defaultProperties: {
    name: 'CLI Command',
    command: '',
    arguments: [],
    expectedExitCodes: [0]
  },
  uiSchema: {
    'ui:order': ['name', 'command', 'arguments', 'workingDirectory', 'environment', 'expectedExitCodes'],
    command: {
      'ui:widget': 'RichEditorWidget',
      'ui:options': {
        format: 'console',
        rows: 2
      },
      'ui:help': 'Command to execute (e.g. "node", "python", "curl"). Supports ${variable} substitution.'
    },
    workingDirectory: {
      'ui:placeholder': '/app or ${REACTORY_SERVER}',
      'ui:help': 'Defaults to the workflow working directory'
    },
    environment: {
      'ui:widget': 'RichEditorWidget',
      'ui:options': {
        format: 'json',
        rows: 4
      },
      'ui:help': 'Environment variables to inject into the process (JSON object of key-value pairs)'
    },
    expectedExitCodes: {
      'ui:help': 'Exit codes considered successful. Any other code will be treated as an error. Default: [0]'
    }
  },
  tags: ['action', 'cli', 'command', 'shell', 'execute'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'CMD',
        colors: {
          body: 0x1a1a1a,
          bodyHover: 0x2a2a2a,
          bodySelected: 0x455a64,
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
      }
    }
  }
};
