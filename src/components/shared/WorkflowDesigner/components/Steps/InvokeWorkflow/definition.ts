import { StepDefinition, PortType } from '../../../types';

export const InvokeWorkflowStepDefinition: StepDefinition = {
  id: 'invoke_workflow',
  name: 'Invoke Workflow',
  category: 'flow',
  description: 'Start (and optionally await) another workflow — workflow composition',
  icon: 'account_tree',
  color: '#00897b',
  inputPorts: [
    { name: 'previous', type: PortType.CONTROL_INPUT, dataType: 'any', description: 'Previous step in workflow' },
    { name: 'input', type: PortType.INPUT, dataType: 'object', description: 'Input payload passed to the child workflow' },
  ],
  outputPorts: [
    { name: 'next', type: PortType.CONTROL_OUTPUT, dataType: 'any', description: 'Next step in workflow' },
    { name: 'instanceId', type: PortType.OUTPUT, dataType: 'string', description: 'The child workflow instance id' },
    { name: 'result', type: PortType.OUTPUT, dataType: 'any', description: "The child workflow's result data (when awaited)" },
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'Invoke Workflow',
      },
      workflowId: {
        type: 'string',
        title: 'Workflow',
        description: 'Target workflow id, e.g. "reactory-examples.WaitEvent@1.0.0". Supports ${variable} substitution.',
      },
      waitForCompletion: {
        type: 'boolean',
        title: 'Await Completion',
        description: 'Block this step until the child workflow reaches a terminal state, then surface its result data.',
        default: false,
      },
      timeout: {
        type: 'number',
        title: 'Timeout (ms)',
        description: 'Maximum time to wait when Await Completion is enabled.',
        default: 300000,
        minimum: 1000,
      },
      pollInterval: {
        type: 'number',
        title: 'Poll Interval (ms)',
        description: 'How often to check the child workflow while awaiting completion.',
        default: 1000,
        minimum: 100,
      },
    },
    required: ['name', 'workflowId'],
  },
  defaultProperties: {
    name: 'Invoke Workflow',
    waitForCompletion: false,
    timeout: 300000,
    pollInterval: 1000,
  },
  inputsSchema: {
    type: 'object',
    title: 'Step Inputs',
    description: 'Input payload passed to the child workflow. Supports ${variable} substitution from workflow context.',
    properties: {
      input: {
        type: 'object',
        title: 'Workflow Input',
        description: 'The input object handed to the invoked workflow. Supports ${variable} substitution.',
        additionalProperties: true,
      },
    },
  },
  inputsUiSchema: {
    'ui:order': ['input'],
    input: {
      'ui:widget': 'RichEditorWidget',
      'ui:options': { format: 'json', rows: 6 },
      'ui:help': 'Supports ${variable} substitution from workflow context',
    },
  },
  uiSchema: {
    'ui:order': ['name', 'workflowId', 'waitForCompletion', 'timeout', 'pollInterval'],
    workflowId: {
      'ui:placeholder': 'e.g. reactory-examples.WaitEvent@1.0.0',
      'ui:help': 'The workflow to invoke (nameSpace.Name@version). Supports ${variable} substitution.',
    },
    waitForCompletion: {
      'ui:options': {
        yesLabel: 'Await',
        noLabel: 'Fire & forget',
        yesIcon: 'hourglass_top',
        noIcon: 'flash_on',
        showLabels: true,
      },
    },
    timeout: {
      'ui:widget': 'SliderWidget',
      'ui:options': { min: 1000, max: 600000, step: 1000 },
      'ui:help': 'Max wait when awaiting completion (ms)',
    },
    pollInterval: {
      'ui:widget': 'SliderWidget',
      'ui:options': { min: 100, max: 10000, step: 100 },
      'ui:help': 'Poll cadence while awaiting completion (ms)',
    },
  },
  tags: ['flow control', 'composition', 'workflow', 'invoke', 'orchestration'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'WF',
        colors: {
          body: 0x1a1a1a,
          bodyHover: 0x2a2a2a,
          bodySelected: 0x00897b,
          pins: 0x808080,
          pinsConnected: 0xb87333,
        },
        features: { pinCount: 3 },
        dimensions: { width: 110, height: 70 },
      },
    },
  },
};
