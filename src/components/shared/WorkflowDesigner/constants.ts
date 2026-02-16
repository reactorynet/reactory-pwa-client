import { CanvasTheme, StepTheme, ConnectionTheme, StepDefinition, StepCategory } from './types';
import { ALL_STEP_DEFINITIONS } from './components/Steps';

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

// Built-in step definitions - imported from modular step definitions
export const BUILT_IN_STEPS: StepDefinition[] = ALL_STEP_DEFINITIONS;

// Step category definitions (without steps - steps are populated dynamically)
export const STEP_CATEGORY_DEFINITIONS: Omit<StepCategory, 'steps'>[] = [
  {
    id: 'control',
    name: 'Control Flow',
    description: 'Start and end points for workflows',
    icon: 'play_arrow',
    color: '#4caf50'
  },
  {
    id: 'action',
    name: 'Actions',
    description: 'Execute tasks and operations',
    icon: 'assignment',
    color: '#2196f3'
  },
  {
    id: 'logic',
    name: 'Logic',
    description: 'Conditional and decision steps',
    icon: 'alt_route',
    color: '#ff9800'
  },
  {
    id: 'flow',
    name: 'Flow Control',
    description: 'Parallel execution and synchronization',
    icon: 'call_split',
    color: '#9c27b0'
  },
  {
    id: 'integration',
    name: 'Integration',
    description: 'Connect to external services and APIs',
    icon: 'api',
    color: '#00bcd4'
  },
  {
    id: 'interaction',
    name: 'User Interaction',
    description: 'User activities and approvals',
    icon: 'person',
    color: '#ff5722'
  },
  {
    id: 'observability',
    name: 'Observability',
    description: 'Monitoring, logging, and telemetry',
    icon: 'analytics',
    color: '#607d8b'
  }
];

// Step categories with steps populated dynamically
export const STEP_CATEGORIES: StepCategory[] = STEP_CATEGORY_DEFINITIONS.map(catDef => ({
  ...catDef,
  steps: BUILT_IN_STEPS.filter(step => step.category === catDef.id)
}));

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
