// Core workflow designer types
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Workflow definition types
export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  namespace: string;
  tags?: string[];
  author?: string;
  createdAt?: Date;
  updatedAt?: Date;
  steps: WorkflowStepDefinition[];
  connections: WorkflowConnection[];
  variables?: WorkflowVariable[];
  configuration?: WorkflowConfiguration;
  metadata?: WorkflowMetadata;
}

export interface WorkflowStepDefinition {
  id: string;
  name: string;
  type: string;
  position: Point;
  size?: Size;
  properties: Record<string, unknown>;
  inputPorts: PortDefinition[];
  outputPorts: PortDefinition[];
  metadata?: StepMetadata;
}

export interface PortDefinition {
  id: string;
  name: string;
  type: PortType;
  dataType?: string;
  required?: boolean;
  position: Point;
}

export enum PortType {
  INPUT = 'input',
  OUTPUT = 'output',
  CONTROL_INPUT = 'control_input',
  CONTROL_OUTPUT = 'control_output'
}

export interface WorkflowConnection {
  id: string;
  sourceStepId: string;
  sourcePortId: string;
  targetStepId: string;
  targetPortId: string;
  points?: Point[];
  metadata?: ConnectionMetadata;
}

export interface WorkflowVariable {
  id: string;
  name: string;
  type: string;
  defaultValue?: unknown;
  description?: string;
}

export interface WorkflowConfiguration {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  priority?: number;
  parallelism?: number;
  environment?: Record<string, unknown>;
  resources?: ResourceRequirements;
  notifications?: NotificationSettings;
}

export interface ResourceRequirements {
  cpu?: string;
  memory?: string;
  storage?: string;
}

export interface NotificationSettings {
  onSuccess?: boolean;
  onFailure?: boolean;
  channels?: string[];
}

export interface WorkflowMetadata {
  canvas?: CanvasMetadata;
  ui?: UiMetadata;
  [key: string]: unknown;
}

export interface CanvasMetadata {
  zoom?: number;
  panX?: number;
  panY?: number;
  gridSize?: number;
  snapToGrid?: boolean;
}

export interface UiMetadata {
  selectedItems?: string[];
  collapsedPanels?: string[];
  [key: string]: unknown;
}

export interface StepMetadata {
  color?: string;
  icon?: string;
  collapsed?: boolean;
  [key: string]: unknown;
}

export interface ConnectionMetadata {
  color?: string;
  style?: ConnectionStyle;
  [key: string]: unknown;
}

export enum ConnectionStyle {
  STRAIGHT = 'straight',
  CURVED = 'curved',
  ORTHOGONAL = 'orthogonal'
}

// Step library types
export interface StepDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  icon?: string;
  color?: string;
  inputPorts: PortTemplate[];
  outputPorts: PortTemplate[];
  propertySchema: PropertySchema;
  defaultProperties: Record<string, unknown>;
  tags?: string[];
}

export interface PortTemplate {
  name: string;
  type: PortType;
  dataType: string;
  required?: boolean;
  description?: string;
}

export interface PropertySchema {
  type: 'object';
  properties: Record<string, PropertyDefinition>;
  required?: string[];
}

export interface PropertyDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  items?: PropertyDefinition;
  properties?: Record<string, PropertyDefinition>;
  required?: string[];
}

export interface StepCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  steps: StepDefinition[];
}

// Template types
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  tags?: string[];
  definition: Partial<WorkflowDefinition>;
  thumbnail?: string;
}

// Validation types
export interface ValidationError {
  id?: string;
  type?: ValidationErrorType;
  severity: 'error' | 'warning' | 'info';
  message: string;
  stepId?: string;
  connectionId?: string;
  path?: string;
  propertyPath?: string;
  suggestions?: ValidationSuggestion[];
}

export enum ValidationErrorType {
  MISSING_CONNECTION = 'missing_connection',
  INVALID_CONNECTION = 'invalid_connection',
  MISSING_PROPERTY = 'missing_property',
  INVALID_PROPERTY = 'invalid_property',
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  UNREACHABLE_STEP = 'unreachable_step',
  DUPLICATE_NAME = 'duplicate_name',
  SCHEMA_VIOLATION = 'schema_violation'
}

export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export interface ValidationSuggestion {
  message: string;
  action?: ValidationAction;
}

export interface ValidationAction {
  type: string;
  parameters?: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  infos: ValidationError[];
}

// Canvas interaction types
export interface CanvasViewport {
  zoom: number;
  panX: number;
  panY: number;
  bounds: Bounds;
}

export interface SelectionState {
  selectedSteps: Set<string>;
  selectedConnections: Set<string>;
  selectionBounds?: Bounds;
}

export interface DragState {
  isDragging: boolean;
  dragType: DragType;
  startPosition?: Point;
  currentPosition?: Point;
  draggedItems?: string[];
  dragPreview?: DragPreview;
}

export enum DragType {
  NONE = 'none',
  STEP = 'step',
  CONNECTION = 'connection',
  SELECTION = 'selection',
  PAN = 'pan',
  FROM_LIBRARY = 'from_library'
}

export interface DragPreview {
  type: DragType;
  position: Point;
  size?: Size;
  stepDefinition?: StepDefinition;
}

export interface CanvasInteraction {
  type: InteractionType;
  position: Point;
  targetId?: string;
  modifiers?: InteractionModifiers;
}

export enum InteractionType {
  CLICK = 'click',
  DOUBLE_CLICK = 'double_click',
  RIGHT_CLICK = 'right_click',
  MOUSE_DOWN = 'mouse_down',
  MOUSE_UP = 'mouse_up',
  MOUSE_MOVE = 'mouse_move',
  KEY_DOWN = 'key_down',
  KEY_UP = 'key_up'
}

export interface InteractionModifiers {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

// History and undo/redo types
export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  currentIndex: number;
  maxHistorySize: number;
}

export interface HistoryAction {
  type: string;
  timestamp: Date;
  description: string;
  undoData: unknown;
  redoData: unknown;
}

// Component props types
export interface WorkflowDesignerProps {
  workflowId?: string;
  initialDefinition?: WorkflowDefinition;
  templates?: WorkflowTemplate[];
  stepLibrary?: StepDefinition[];
  theme?: WorkflowDesignerTheme;
  onSave?: (workflow: WorkflowDefinition) => Promise<void>;
  onLoad?: (workflowId: string) => Promise<WorkflowDefinition>;
  onValidationChange?: (result: ValidationResult) => void;
  onSelectionChange?: (selectedItems: string[]) => void;
  onCanvasChange?: (viewport: CanvasViewport) => void;
  enableCollaboration?: boolean;
  readonly?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
  showGrid?: boolean;
  snapToGrid?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface WorkflowCanvasProps {
  definition: WorkflowDefinition;
  stepLibrary: StepDefinition[];
  viewport: CanvasViewport;
  selection: SelectionState;
  dragState: DragState;
  validationResult: ValidationResult;
  showGrid: boolean;
  snapToGrid: boolean;
  readonly: boolean;
  onStepMove: (stepId: string, position: Point) => void;
  onStepResize: (stepId: string, size: Size) => void;
  onStepSelect: (stepId: string, multi: boolean) => void;
  onStepDoubleClick: (stepId: string) => void;
  onConnectionCreate: (connection: Partial<WorkflowConnection>) => void;
  onConnectionSelect: (connectionId: string, multi: boolean) => void;
  onCanvasClick: (position: Point, modifiers: InteractionModifiers) => void;
  onViewportChange: (viewport: CanvasViewport) => void;
  onStepCreate: (stepDefinition: any, position: Point) => void;
}

export interface StepLibraryPanelProps {
  stepLibrary: StepDefinition[];
  categories: StepCategory[];
  searchTerm: string;
  selectedCategory?: string;
  onStepDragStart: (step: StepDefinition) => void;
  onSearchChange: (term: string) => void;
  onCategorySelect: (categoryId?: string) => void;
  onStepClick: (step: StepDefinition) => void;
}

export interface PropertiesPanelProps {
  selectedSteps: WorkflowStepDefinition[];
  selectedConnections: WorkflowConnection[];
  stepLibrary: StepDefinition[];
  validationResult: ValidationResult;
  readonly: boolean;
  onStepUpdate: (step: WorkflowStepDefinition) => void;
  onConnectionUpdate: (connection: WorkflowConnection) => void;
  onValidate: () => void;
}

export interface PropertyFormProps {
  step: WorkflowStepDefinition;
  stepDefinition?: StepDefinition | null;
  errors: ValidationError[];
  warnings: ValidationError[];
  expandedSections: Set<string>;
  readonly: boolean;
  onPropertyChange: (propertyPath: string, value: any) => void;
  onSectionToggle: (sectionId: string) => void;
}

export interface PropertyFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'json';
  value: any;
  required: boolean;
  description?: string;
  options?: Array<{ label: string; value: any } | string>;
  schema?: any;
}

export interface PropertyFieldProps {
  property: PropertyFieldDefinition;
  validation: {
    hasError: boolean;
    hasWarning: boolean;
    errorMessage?: string;
    warningMessage?: string;
  };
  readonly: boolean;
  onChange: (value: any) => void;
}

export interface ValidationSummaryProps {
  validationResult: ValidationResult;
  selectedSteps: WorkflowStepDefinition[];
  selectedConnections: WorkflowConnection[];
  onValidate: () => void;
}



// Theming types
export interface WorkflowDesignerTheme {
  canvas?: CanvasTheme;
  steps?: StepTheme;
  connections?: ConnectionTheme;
  panels?: PanelTheme;
  colors?: ColorTheme;
}

export interface CanvasTheme {
  backgroundColor?: string;
  gridColor?: string;
  gridSize?: number;
  selectionColor?: string;
  selectionOpacity?: number;
}

export interface StepTheme {
  defaultColor?: string;
  selectedColor?: string;
  errorColor?: string;
  warningColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  fontSize?: number;
  padding?: number;
}

export interface ConnectionTheme {
  defaultColor?: string;
  selectedColor?: string;
  errorColor?: string;
  strokeWidth?: number;
  arrowSize?: number;
}

export interface PanelTheme {
  backgroundColor?: string;
  borderColor?: string;
  headerColor?: string;
  textColor?: string;
}

export interface ColorTheme {
  primary?: string;
  secondary?: string;
  success?: string;
  error?: string;
  warning?: string;
  info?: string;
  background?: string;
  surface?: string;
  text?: string;
}

// Event types
export interface WorkflowDesignerEvent {
  type: string;
  payload?: unknown;
  timestamp: Date;
}

export interface StepEvent extends WorkflowDesignerEvent {
  stepId: string;
}

export interface ConnectionEvent extends WorkflowDesignerEvent {
  connectionId: string;
}

export interface CanvasEvent extends WorkflowDesignerEvent {
  position: Point;
  viewport: CanvasViewport;
}

// GraphQL types
export interface WorkflowQueryResult {
  workflow: WorkflowDefinition | null;
  error?: string;
}

export interface WorkflowMutationResult {
  success: boolean;
  workflow?: WorkflowDefinition;
  error?: string;
}

export interface WorkflowsQueryResult {
  workflows: WorkflowDefinition[];
  pagination?: {
    page: number;
    pages: number;
    limit: number;
    total: number;
  };
  error?: string;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends Record<string, unknown>
    ? DeepPartial<T[P]>
    : T[P];
};

export type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalProps<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Hook return types
export interface UseWorkflowDesignerReturn {
  definition: WorkflowDefinition;
  viewport: CanvasViewport;
  selection: SelectionState;
  dragState: DragState;
  validationResult: ValidationResult;
  historyState: HistoryState;
  isDirty: boolean;
  isSaving: boolean;
  // Actions
  updateDefinition: (definition: WorkflowDefinition) => void;
  updateStep: (stepId: string, updates: Partial<WorkflowStepDefinition>) => void;
  addStep: (step: WorkflowStepDefinition) => void;
  removeStep: (stepId: string) => void;
  addConnection: (connection: WorkflowConnection) => void;
  removeConnection: (connectionId: string) => void;
  setViewport: (viewport: CanvasViewport) => void;
  setSelection: (selection: SelectionState) => void;
  setDragState: (dragState: DragState) => void;
  save: () => Promise<void>;
  load: (workflowId: string) => Promise<void>;
  undo: () => void;
  redo: () => void;
  validate: () => ValidationResult;
  reset: () => void;
}
