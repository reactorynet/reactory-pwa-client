// Main export for WorkflowDesigner component
import WorkflowDesigner from './WorkflowDesigner';

// Export types for external use
export type {
  WorkflowDefinition,
  WorkflowStepDefinition,
  WorkflowConnection,
  WorkflowDesignerProps,
  StepDefinition,
  StepCategory,
  ValidationError,
  ValidationResult,
  Point,
  Size,
  Bounds,
  CanvasViewport,
  SelectionState,
  DragState,
  HistoryState,
  WorkflowTemplate,
  WorkflowDesignerTheme,
  StepLibraryPanelProps,
  PropertiesPanelProps,
  PropertyFormProps,
  PropertyFieldProps,
  PropertyFieldDefinition,
  ValidationSummaryProps
} from './types';

export { PortType } from './types';

// Export constants for external configuration
export {
  CANVAS_DEFAULTS,
  STEP_DEFAULTS,
  CONNECTION_DEFAULTS,
  BUILT_IN_STEPS,
  STEP_CATEGORIES,
  KEYBOARD_SHORTCUTS,
  DEFAULT_CANVAS_THEME,
  DEFAULT_STEP_THEME,
  DEFAULT_CONNECTION_THEME
} from './constants';

// Export utilities for external use
export {
  generateId,
  generateStepId,
  generateConnectionId,
  validateWorkflow,
  autoLayout,
  exportToJSON,
  importFromJSON,
  snapToGrid,
  screenToCanvas,
  canvasToScreen,
  getStepBounds,
  getSelectionBounds,
  fitToViewport
} from './utils';

// Export hooks for advanced customization
export { useWorkflowDesigner } from './hooks/useWorkflowDesigner';
export { useStepLibrary } from './hooks/useStepLibrary';
export { useCanvasOperations } from './hooks/useCanvasOperations';
export { useGraphQL } from './hooks/useGraphQL';

// Export components for modular use
export * from './components';

// Key Panel exports for easier access
export { 
  StepLibraryPanel, 
  StepCategoryList, 
  StepItem, 
  StepSearch,
  PropertiesPanel,
  PropertyForm,
  PropertyField,
  ValidationSummary
} from './components/Panels';

// Default export
export default WorkflowDesigner;
