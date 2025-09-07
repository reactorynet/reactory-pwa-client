import { CanvasTheme, StepTheme, ConnectionTheme, StepDefinition, StepCategory, PortType } from './types';

// Canvas constants
export const CANVAS_DEFAULTS = {
  ZOOM_MIN: 0.1,
  ZOOM_MAX: 3.0,
  ZOOM_STEP: 0.1,
  ZOOM_DEFAULT: 1.0,
  GRID_SIZE: 20,
  SNAP_THRESHOLD: 10,
  PAN_SPEED: 1.0,
} as const;

// Step constants
export const STEP_DEFAULTS = {
  WIDTH: 200,
  HEIGHT: 100,
  MIN_WIDTH: 120,
  MIN_HEIGHT: 80,
  MAX_WIDTH: 400,
  MAX_HEIGHT: 300,
  PADDING: 16,
  BORDER_RADIUS: 4,
  BORDER_WIDTH: 2,
} as const;

// Connection constants
export const CONNECTION_DEFAULTS = {
  STROKE_WIDTH: 2,
  ARROW_SIZE: 8,
  CURVE_TENSION: 0.3,
  HIT_TOLERANCE: 8,
} as const;

// Port constants
export const PORT_DEFAULTS = {
  SIZE: 12,
  OFFSET: 6,
  SPACING: 24,
} as const;

// Animation constants
export const ANIMATION_DEFAULTS = {
  DURATION: 300,
  EASING: 'ease-in-out',
  SELECTION_PULSE_DURATION: 1000,
  DRAG_FEEDBACK_DELAY: 150,
} as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  SAVE: 'ctrl+s',
  UNDO: 'ctrl+z',
  REDO: 'ctrl+y',
  DELETE: 'delete',
  COPY: 'ctrl+c',
  PASTE: 'ctrl+v',
  SELECT_ALL: 'ctrl+a',
  ZOOM_IN: 'ctrl+=',
  ZOOM_OUT: 'ctrl+-',
  ZOOM_FIT: 'ctrl+0',
  FIND: 'ctrl+f',
} as const;

// Default themes
export const DEFAULT_CANVAS_THEME: CanvasTheme = {
  backgroundColor: '#fafafa',
  gridColor: '#e0e0e0',
  gridSize: CANVAS_DEFAULTS.GRID_SIZE,
  selectionColor: '#1976d2',
  selectionOpacity: 0.2,
};

export const DEFAULT_STEP_THEME: StepTheme = {
  defaultColor: '#ffffff',
  selectedColor: '#e3f2fd',
  errorColor: '#ffebee',
  warningColor: '#fff3e0',
  borderWidth: STEP_DEFAULTS.BORDER_WIDTH,
  borderRadius: STEP_DEFAULTS.BORDER_RADIUS,
  fontSize: 14,
  padding: STEP_DEFAULTS.PADDING,
};

export const DEFAULT_CONNECTION_THEME: ConnectionTheme = {
  defaultColor: '#757575',
  selectedColor: '#1976d2',
  errorColor: '#d32f2f',
  strokeWidth: CONNECTION_DEFAULTS.STROKE_WIDTH,
  arrowSize: CONNECTION_DEFAULTS.ARROW_SIZE,
};

// Built-in step definitions
export const BUILT_IN_STEPS: StepDefinition[] = [
  {
    id: 'start',
    name: 'Start',
    category: 'control',
    description: 'Starting point of the workflow',
    icon: 'play_arrow',
    color: '#4caf50',
    inputPorts: [],
    outputPorts: [
      {
        name: 'next',
        type: PortType.CONTROL_OUTPUT,
        dataType: 'any',
        description: 'Next step in workflow'
      }
    ],
    propertySchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Step Name',
          description: 'Name of the workflow step',
          default: 'Start'
        }
      }
    },
    defaultProperties: {
      name: 'Start'
    },
    tags: ['control', 'start', 'entry']
  },
  {
    id: 'end',
    name: 'End',
    category: 'control',
    description: 'End point of the workflow',
    icon: 'stop',
    color: '#f44336',
    inputPorts: [
      {
        name: 'previous',
        type: PortType.CONTROL_INPUT,
        dataType: 'any',
        description: 'Previous step in workflow'
      }
    ],
    outputPorts: [],
    propertySchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Step Name',
          description: 'Name of the workflow step',
          default: 'End'
        },
        returnValue: {
          type: 'string',
          title: 'Return Value',
          description: 'Value to return when workflow completes'
        }
      }
    },
    defaultProperties: {
      name: 'End',
      returnValue: 'success'
    },
    tags: ['control', 'end', 'exit']
  },
  {
    id: 'task',
    name: 'Task',
    category: 'action',
    description: 'Generic task step',
    icon: 'assignment',
    color: '#2196f3',
    inputPorts: [
      {
        name: 'previous',
        type: PortType.CONTROL_INPUT,
        dataType: 'any',
        description: 'Previous step in workflow'
      },
      {
        name: 'input',
        type: PortType.INPUT,
        dataType: 'any',
        description: 'Input data for the task'
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
        name: 'output',
        type: PortType.OUTPUT,
        dataType: 'any',
        description: 'Output data from the task'
      }
    ],
    propertySchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Step Name',
          description: 'Name of the workflow step',
          default: 'Task'
        },
        taskType: {
          type: 'string',
          title: 'Task Type',
          description: 'Type of task to execute',
          enum: ['http_request', 'data_transform', 'custom_script'],
          default: 'custom_script'
        },
        configuration: {
          type: 'object',
          title: 'Configuration',
          description: 'Task-specific configuration'
        }
      },
      required: ['name', 'taskType']
    },
    defaultProperties: {
      name: 'Task',
      taskType: 'custom_script',
      configuration: {}
    },
    tags: ['action', 'task', 'execute']
  },
  {
    id: 'condition',
    name: 'Condition',
    category: 'logic',
    description: 'Conditional branching step',
    icon: 'alt_route',
    color: '#ff9800',
    inputPorts: [
      {
        name: 'previous',
        type: PortType.CONTROL_INPUT,
        dataType: 'any',
        description: 'Previous step in workflow'
      },
      {
        name: 'input',
        type: PortType.INPUT,
        dataType: 'any',
        description: 'Input data for condition evaluation'
      }
    ],
    outputPorts: [
      {
        name: 'true',
        type: PortType.CONTROL_OUTPUT,
        dataType: 'any',
        description: 'Path when condition is true'
      },
      {
        name: 'false',
        type: PortType.CONTROL_OUTPUT,
        dataType: 'any',
        description: 'Path when condition is false'
      }
    ],
    propertySchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Step Name',
          description: 'Name of the workflow step',
          default: 'Condition'
        },
        expression: {
          type: 'string',
          title: 'Condition Expression',
          description: 'JavaScript expression to evaluate',
          default: 'input.value > 0'
        }
      },
      required: ['name', 'expression']
    },
    defaultProperties: {
      name: 'Condition',
      expression: 'input.value > 0'
    },
    tags: ['logic', 'condition', 'branch', 'if']
  },
  {
    id: 'parallel',
    name: 'Parallel',
    category: 'flow',
    description: 'Execute multiple branches in parallel',
    icon: 'call_split',
    color: '#9c27b0',
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
        name: 'branch1',
        type: PortType.CONTROL_OUTPUT,
        dataType: 'any',
        description: 'First parallel branch'
      },
      {
        name: 'branch2',
        type: PortType.CONTROL_OUTPUT,
        dataType: 'any',
        description: 'Second parallel branch'
      }
    ],
    propertySchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Step Name',
          description: 'Name of the workflow step',
          default: 'Parallel'
        },
        maxConcurrency: {
          type: 'number',
          title: 'Max Concurrency',
          description: 'Maximum number of parallel executions',
          minimum: 1,
          maximum: 10,
          default: 2
        }
      },
      required: ['name']
    },
    defaultProperties: {
      name: 'Parallel',
      maxConcurrency: 2
    },
    tags: ['flow', 'parallel', 'concurrent', 'split']
  },
  {
    id: 'join',
    name: 'Join',
    category: 'flow',
    description: 'Join multiple branches back together',
    icon: 'call_merge',
    color: '#9c27b0',
    inputPorts: [
      {
        name: 'branch1',
        type: PortType.CONTROL_INPUT,
        dataType: 'any',
        description: 'First branch to join'
      },
      {
        name: 'branch2',
        type: PortType.CONTROL_INPUT,
        dataType: 'any',
        description: 'Second branch to join'
      }
    ],
    outputPorts: [
      {
        name: 'next',
        type: PortType.CONTROL_OUTPUT,
        dataType: 'any',
        description: 'Next step after join'
      }
    ],
    propertySchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Step Name',
          description: 'Name of the workflow step',
          default: 'Join'
        },
        waitForAll: {
          type: 'boolean',
          title: 'Wait for All Branches',
          description: 'Wait for all branches to complete before continuing',
          default: true
        }
      },
      required: ['name']
    },
    defaultProperties: {
      name: 'Join',
      waitForAll: true
    },
    tags: ['flow', 'join', 'merge', 'synchronize']
  }
];

// Step categories
export const STEP_CATEGORIES: StepCategory[] = [
  {
    id: 'control',
    name: 'Control Flow',
    description: 'Start and end points for workflows',
    icon: 'play_arrow',
    color: '#4caf50',
    steps: BUILT_IN_STEPS.filter(step => step.category === 'control')
  },
  {
    id: 'action',
    name: 'Actions',
    description: 'Execute tasks and operations',
    icon: 'assignment',
    color: '#2196f3',
    steps: BUILT_IN_STEPS.filter(step => step.category === 'action')
  },
  {
    id: 'logic',
    name: 'Logic',
    description: 'Conditional and decision steps',
    icon: 'alt_route',
    color: '#ff9800',
    steps: BUILT_IN_STEPS.filter(step => step.category === 'logic')
  },
  {
    id: 'flow',
    name: 'Flow Control',
    description: 'Parallel execution and synchronization',
    icon: 'call_split',
    color: '#9c27b0',
    steps: BUILT_IN_STEPS.filter(step => step.category === 'flow')
  }
];

// Validation messages
export const VALIDATION_MESSAGES = {
  MISSING_CONNECTION: 'Step is not connected to the workflow',
  INVALID_CONNECTION: 'Invalid connection between incompatible ports',
  MISSING_PROPERTY: 'Required property is missing',
  INVALID_PROPERTY: 'Property value is invalid',
  CIRCULAR_DEPENDENCY: 'Circular dependency detected',
  UNREACHABLE_STEP: 'Step is not reachable from the start',
  DUPLICATE_NAME: 'Step name must be unique',
  SCHEMA_VIOLATION: 'Step configuration violates schema',
} as const;

// Auto-save settings
export const AUTO_SAVE_DEFAULTS = {
  INTERVAL: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 seconds
} as const;

// Context menu items
export const CONTEXT_MENU_ITEMS = {
  STEP: [
    { id: 'edit', label: 'Edit Properties', icon: 'edit' },
    { id: 'duplicate', label: 'Duplicate', icon: 'content_copy' },
    { id: 'delete', label: 'Delete', icon: 'delete' },
    { id: 'separator' },
    { id: 'bring_to_front', label: 'Bring to Front', icon: 'flip_to_front' },
    { id: 'send_to_back', label: 'Send to Back', icon: 'flip_to_back' }
  ],
  CONNECTION: [
    { id: 'edit', label: 'Edit Connection', icon: 'edit' },
    { id: 'delete', label: 'Delete', icon: 'delete' }
  ],
  CANVAS: [
    { id: 'paste', label: 'Paste', icon: 'content_paste' },
    { id: 'select_all', label: 'Select All', icon: 'select_all' },
    { id: 'separator' },
    { id: 'zoom_fit', label: 'Zoom to Fit', icon: 'zoom_out_map' },
    { id: 'zoom_selection', label: 'Zoom to Selection', icon: 'center_focus_strong' }
  ]
} as const;
