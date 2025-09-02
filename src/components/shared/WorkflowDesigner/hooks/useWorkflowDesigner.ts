import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  WorkflowDefinition, 
  WorkflowStepDefinition,
  WorkflowConnection,
  CanvasViewport,
  SelectionState,
  DragState,
  ValidationResult,
  HistoryState,
  HistoryAction,
  UseWorkflowDesignerReturn,
  Point,
  Size,
  DragType
} from '../types';
import { 
  generateId, 
  generateStepId, 
  generateConnectionId,
  validateWorkflow,
  cloneDefinition,
  definitionsEqual 
} from '../utils';
import { CANVAS_DEFAULTS } from '../constants';

interface UseWorkflowDesignerOptions {
  workflowId?: string;
  initialDefinition?: WorkflowDefinition;
  autoSave?: boolean;
  autoSaveInterval?: number;
  maxHistorySize?: number;
  onSave?: (definition: WorkflowDefinition) => Promise<void>;
  onLoad?: (workflowId: string) => Promise<WorkflowDefinition>;
  onValidationChange?: (result: ValidationResult) => void;
}

export function useWorkflowDesigner(options: UseWorkflowDesignerOptions): UseWorkflowDesignerReturn {
  const {
    workflowId,
    initialDefinition,
    autoSave = false,
    autoSaveInterval = 30000,
    maxHistorySize = 50,
    onSave,
    onLoad,
    onValidationChange
  } = options;

  // Create default workflow definition
  const createDefaultDefinition = useCallback((): WorkflowDefinition => ({
    id: workflowId || generateId(),
    name: 'Untitled Workflow',
    version: '1.0.0',
    namespace: 'user',
    description: '',
    tags: [],
    steps: [],
    connections: [],
    variables: [],
    configuration: {
      timeout: 300000,
      maxRetries: 3,
      priority: 5
    },
    metadata: {
      canvas: {
        zoom: CANVAS_DEFAULTS.ZOOM_DEFAULT,
        panX: 0,
        panY: 0,
        gridSize: CANVAS_DEFAULTS.GRID_SIZE,
        snapToGrid: true
      },
      ui: {
        selectedItems: [],
        collapsedPanels: []
      }
    }
  }), [workflowId]);

  // State management
  const [definition, setDefinition] = useState<WorkflowDefinition>(
    initialDefinition || createDefaultDefinition()
  );

  const [viewport, setViewport] = useState<CanvasViewport>({
    zoom: definition.metadata?.canvas?.zoom || CANVAS_DEFAULTS.ZOOM_DEFAULT,
    panX: definition.metadata?.canvas?.panX || 0,
    panY: definition.metadata?.canvas?.panY || 0,
    bounds: { x: 0, y: 0, width: 0, height: 0 }
  });

  const [selection, setSelection] = useState<SelectionState>({
    selectedSteps: new Set(definition.metadata?.ui?.selectedItems || []),
    selectedConnections: new Set()
  });

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragType: DragType.NONE
  });

  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
    infos: []
  });

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // History management
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [historyState, setHistoryState] = useState<HistoryState>({
    canUndo: false,
    canRedo: false,
    currentIndex: -1,
    maxHistorySize
  });

  // Refs for avoiding stale closures
  const definitionRef = useRef(definition);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedDefinitionRef = useRef<WorkflowDefinition>(cloneDefinition(definition));

  // Update refs when definition changes
  useEffect(() => {
    definitionRef.current = definition;
  }, [definition]);

  // Validation effect
  useEffect(() => {
    const errors = validateWorkflow(definition);
    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors: errors.filter(e => e.severity === 'error'),
      warnings: errors.filter(e => e.severity === 'warning'),
      infos: errors.filter(e => e.severity === 'info')
    };
    
    setValidationResult(result);
    onValidationChange?.(result);
  }, [definition, onValidationChange]);

  // Dirty state tracking
  useEffect(() => {
    const isCurrentlyDirty = !definitionsEqual(definition, lastSavedDefinitionRef.current);
    if (isCurrentlyDirty !== isDirty) {
      setIsDirty(isCurrentlyDirty);
    }
  }, [definition, isDirty]);

  // History state updates
  useEffect(() => {
    setHistoryState({
      canUndo: historyIndex >= 0,
      canRedo: historyIndex < history.length - 1,
      currentIndex: historyIndex,
      maxHistorySize
    });
  }, [historyIndex, history.length, maxHistorySize]);

  // Auto-save effect
  useEffect(() => {
    if (!autoSave || !isDirty || !onSave) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      save();
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [autoSave, isDirty, autoSaveInterval]);

  // History management functions
  const addToHistory = useCallback((action: Omit<HistoryAction, 'timestamp'>) => {
    const historyAction: HistoryAction = {
      ...action,
      timestamp: new Date()
    };

    setHistory(prev => {
      // Remove any redo history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(historyAction);
      
      // Trim history if it exceeds max size
      if (newHistory.length > maxHistorySize) {
        return newHistory.slice(-maxHistorySize);
      }
      
      return newHistory;
    });

    setHistoryIndex(prev => Math.min(prev + 1, maxHistorySize - 1));
  }, [historyIndex, maxHistorySize]);

  // Core workflow operations
  const updateDefinition = useCallback((updater: WorkflowDefinition | ((prev: WorkflowDefinition) => WorkflowDefinition)) => {
    const oldDefinition = cloneDefinition(definitionRef.current);
    const newDefinition = typeof updater === 'function' ? updater(definitionRef.current) : updater;
    
    setDefinition(newDefinition);
    
    addToHistory({
      type: 'update_definition',
      description: 'Update workflow definition',
      undoData: oldDefinition,
      redoData: newDefinition
    });
  }, [addToHistory]);

  const updateStep = useCallback((stepId: string, updates: Partial<WorkflowStepDefinition>) => {
    const oldDefinition = cloneDefinition(definitionRef.current);
    const stepIndex = oldDefinition.steps.findIndex(s => s.id === stepId);
    
    if (stepIndex === -1) return;

    const oldStep = oldDefinition.steps[stepIndex];
    const newDefinition = cloneDefinition(oldDefinition);
    newDefinition.steps[stepIndex] = { ...oldStep, ...updates };

    setDefinition(newDefinition);
    
    addToHistory({
      type: 'update_step',
      description: `Update step "${oldStep.name}"`,
      undoData: oldDefinition,
      redoData: newDefinition
    });
  }, [addToHistory]);

  const addStep = useCallback((step: WorkflowStepDefinition) => {
    console.log('📝 addStep called with step:', step);
    
    // Use functional state update to ensure we have the latest definition
    setDefinition(currentDefinition => {
      console.log('📝 Current definition in functional update - steps.length:', currentDefinition.steps.length);
      const oldDefinition = cloneDefinition(currentDefinition);
      const newDefinition = cloneDefinition(oldDefinition);
      newDefinition.steps.push(step);
      console.log('📝 newDefinition.steps.length:', newDefinition.steps.length);
      
      // Update the ref immediately to prevent race conditions
      definitionRef.current = newDefinition;
      
      // Add to history
      addToHistory({
        type: 'add_step',
        description: `Add step "${step.name}"`,
        undoData: oldDefinition,
        redoData: newDefinition
      });
      
      return newDefinition;
    });
  }, [addToHistory]);

  const removeStep = useCallback((stepId: string) => {
    const oldDefinition = cloneDefinition(definitionRef.current);
    const stepIndex = oldDefinition.steps.findIndex(s => s.id === stepId);
    
    if (stepIndex === -1) return;

    const removedStep = oldDefinition.steps[stepIndex];
    const newDefinition = cloneDefinition(oldDefinition);
    
    // Remove the step
    newDefinition.steps.splice(stepIndex, 1);
    
    // Remove associated connections
    newDefinition.connections = newDefinition.connections.filter(
      conn => conn.sourceStepId !== stepId && conn.targetStepId !== stepId
    );

    setDefinition(newDefinition);
    
    // Update selection
    setSelection(prev => ({
      ...prev,
      selectedSteps: new Set([...prev.selectedSteps].filter(id => id !== stepId))
    }));
    
    addToHistory({
      type: 'remove_step',
      description: `Remove step "${removedStep.name}"`,
      undoData: oldDefinition,
      redoData: newDefinition
    });
  }, [addToHistory]);

  const addConnection = useCallback((connection: WorkflowConnection) => {
    const oldDefinition = cloneDefinition(definitionRef.current);
    const newDefinition = cloneDefinition(oldDefinition);
    newDefinition.connections.push(connection);

    setDefinition(newDefinition);
    
    addToHistory({
      type: 'add_connection',
      description: 'Add connection',
      undoData: oldDefinition,
      redoData: newDefinition
    });
  }, [addToHistory]);

  const removeConnection = useCallback((connectionId: string) => {
    const oldDefinition = cloneDefinition(definitionRef.current);
    const connectionIndex = oldDefinition.connections.findIndex(c => c.id === connectionId);
    
    if (connectionIndex === -1) return;

    const newDefinition = cloneDefinition(oldDefinition);
    newDefinition.connections.splice(connectionIndex, 1);

    setDefinition(newDefinition);
    
    // Update selection
    setSelection(prev => ({
      ...prev,
      selectedConnections: new Set([...prev.selectedConnections].filter(id => id !== connectionId))
    }));
    
    addToHistory({
      type: 'remove_connection',
      description: 'Remove connection',
      undoData: oldDefinition,
      redoData: newDefinition
    });
  }, [addToHistory]);

  // Viewport operations
  const setViewportState = useCallback((newViewport: CanvasViewport) => {
    setViewport(newViewport);
    
    // Update metadata
    const newDefinition = cloneDefinition(definitionRef.current);
    if (!newDefinition.metadata) newDefinition.metadata = {};
    if (!newDefinition.metadata.canvas) newDefinition.metadata.canvas = {};
    
    newDefinition.metadata.canvas.zoom = newViewport.zoom;
    newDefinition.metadata.canvas.panX = newViewport.panX;
    newDefinition.metadata.canvas.panY = newViewport.panY;
    
    setDefinition(newDefinition);
  }, []);

  // Selection operations
  const setSelectionState = useCallback((newSelection: SelectionState) => {
    setSelection(newSelection);
    
    // Update metadata
    const newDefinition = cloneDefinition(definitionRef.current);
    if (!newDefinition.metadata) newDefinition.metadata = {};
    if (!newDefinition.metadata.ui) newDefinition.metadata.ui = {};
    
    newDefinition.metadata.ui.selectedItems = [...newSelection.selectedSteps];
    
    setDefinition(newDefinition);
  }, []);

  // Save and load operations
  const save = useCallback(async () => {
    if (!onSave) return;
    
    try {
      setIsSaving(true);
      await onSave(definitionRef.current);
      lastSavedDefinitionRef.current = cloneDefinition(definitionRef.current);
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  const load = useCallback(async (loadWorkflowId: string) => {
    if (!onLoad) return;
    
    try {
      const loadedDefinition = await onLoad(loadWorkflowId);
      setDefinition(loadedDefinition);
      lastSavedDefinitionRef.current = cloneDefinition(loadedDefinition);
      setIsDirty(false);
      
      // Reset history
      setHistory([]);
      setHistoryIndex(-1);
      
      // Update viewport from loaded definition
      if (loadedDefinition.metadata?.canvas) {
        setViewport(prev => ({
          ...prev,
          zoom: loadedDefinition.metadata!.canvas!.zoom || CANVAS_DEFAULTS.ZOOM_DEFAULT,
          panX: loadedDefinition.metadata!.canvas!.panX || 0,
          panY: loadedDefinition.metadata!.canvas!.panY || 0
        }));
      }
      
      // Update selection from loaded definition
      if (loadedDefinition.metadata?.ui?.selectedItems) {
        setSelection(prev => ({
          ...prev,
          selectedSteps: new Set(loadedDefinition.metadata!.ui!.selectedItems)
        }));
      }
    } catch (error) {
      console.error('Failed to load workflow:', error);
      throw error;
    }
  }, [onLoad]);

  // Undo/Redo operations
  const undo = useCallback(() => {
    if (historyIndex < 0) return;
    
    const action = history[historyIndex];
    setDefinition(action.undoData as WorkflowDefinition);
    setHistoryIndex(prev => prev - 1);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    
    const action = history[historyIndex + 1];
    setDefinition(action.redoData as WorkflowDefinition);
    setHistoryIndex(prev => prev + 1);
  }, [history, historyIndex]);

  // Validation
  const validate = useCallback(() => {
    return validationResult;
  }, [validationResult]);

  // Reset
  const reset = useCallback(() => {
    const defaultDef = createDefaultDefinition();
    setDefinition(defaultDef);
    setViewport({
      zoom: CANVAS_DEFAULTS.ZOOM_DEFAULT,
      panX: 0,
      panY: 0,
      bounds: { x: 0, y: 0, width: 0, height: 0 }
    });
    setSelection({
      selectedSteps: new Set(),
      selectedConnections: new Set()
    });
    setDragState({
      isDragging: false,
      dragType: DragType.NONE
    });
    setHistory([]);
    setHistoryIndex(-1);
    setIsDirty(false);
    lastSavedDefinitionRef.current = cloneDefinition(defaultDef);
  }, [createDefaultDefinition]);

  return {
    definition,
    viewport,
    selection,
    dragState,
    validationResult,
    historyState,
    isDirty,
    isSaving,
    updateDefinition,
    updateStep,
    addStep,
    removeStep,
    addConnection,
    removeConnection,
    setViewport: setViewportState,
    setSelection: setSelectionState,
    setDragState,
    save,
    load,
    undo,
    redo,
    validate,
    reset
  };
}
