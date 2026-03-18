import { useReactory } from "@reactory/client-core/api";
import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import {
  WorkflowDesignerProps,
  WorkflowStepDefinition,
  WorkflowConnection,
  Point,
  Size,
  InteractionModifiers,
  DragType,
  SelectionState
} from './types';
import { useWorkflowDesigner } from './hooks/useWorkflowDesigner';
import { useStepLibrary } from './hooks/useStepLibrary';
import { useCanvasOperations } from './hooks/useCanvasOperations';
import { useGraphQL } from './hooks/useGraphQL';
import {
  generateStepId,
  generateConnectionId,
  snapToGrid,
  getSelectionBounds,
  convertYamlToDesignerDefinition,
} from './utils';
import { CANVAS_DEFAULTS, STEP_DEFAULTS } from './constants';

// Component imports
import WorkflowCanvas from './components/Canvas/WorkflowCanvas';
import OptimizedWorkflowCanvas from './components/Canvas/OptimizedWorkflowCanvas';
import { WorkflowWebGLCanvas } from './renderers/WebGLRenderer';
import StepLibraryPanel from './components/Panels/StepLibraryPanel';
import PropertiesPanel from './components/Panels/PropertiesPanel';
import UserHomeFolder from '../UserHomeFolder/UserHomeFolder';
import { ServerFileExplorer } from '../ServerFileExplorer';

// Rendering mode type
type RenderingMode = 'dom' | 'optimized' | 'webgl';

/**
 * A single error captured during YAML workflow definition loading.
 */
interface YamlLoadError {
  stage: 'REGISTRY' | 'FILE_RESOLVE' | 'FILE_READ' | 'PARSE' | 'VALIDATION';
  message: string;
  code?: string;
  line?: number;
  column?: number;
}

/**
 * A step-level validation error returned by the server's YAML executor validation.
 */
interface ServerValidationError {
  /** Step ID (populated for step-specific errors) */
  field?: string | null;
  message: string;
  code?: string | null;
}

type YamlLoadStatus = 'SUCCESS' | 'PARTIAL' | 'NOT_FOUND' | 'IO_ERROR' | 'PARSE_ERROR' | 'REGISTRY_ERROR' | null;

/**
 * Custom hook for loading YAML workflow definitions from the server.
 * Always returns a result object — check loadStatus and errors for failure details.
 */
function useYamlWorkflowLoader(
  workflowRef: WorkflowDesignerProps['workflow'],
  initialDefinition: WorkflowDesignerProps['initialDefinition'],
  reactory: Reactory.Client.IReactoryApi | Reactory.Client.ReactorySDK,
  updateDefinition: (def: any) => void,
) {
  const [yamlLoading, setYamlLoading] = useState<boolean>(false);
  const [yamlErrors, setYamlErrors] = useState<YamlLoadError[]>([]);
  const [serverValidationErrors, setServerValidationErrors] = useState<ServerValidationError[]>([]);
  const [yamlSource, setYamlSource] = useState<string | null>(null);
  const [yamlSourceType, setYamlSourceType] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<YamlLoadStatus>(null);

  useEffect(() => {
    if (workflowRef?.workflowType !== 'YAML') return;
    if (initialDefinition) return;

    const loadYamlDefinition = async () => {
      if (!workflowRef) return;
      const { nameSpace, name, version } = workflowRef;

      setYamlLoading(true);
      setYamlErrors([]);
      setLoadStatus(null);

      try {
        const query = `
          query GetWorkflowYamlDefinition(
            $nameSpace: String!
            $name: String!
            $version: String
          ) {
            workflowYamlDefinition(
              nameSpace: $nameSpace
              name: $name
              version: $version
            ) {
              nameSpace
              name
              version
              description
              author
              tags
              inputs
              outputs
              variables
              steps {
                id
                name
                description
                type
                enabled
                continueOnError
                timeout
                inputs
                outputs
                condition
                dependsOn
                config
                designer {
                  position { x y }
                  size { width height }
                  color
                  icon
                  collapsed
                  helpText
                  ports {
                    inputs { name label position { x y } dataType }
                    outputs { name label position { x y } dataType }
                  }
                }
                steps {
                  id
                  name
                  type
                  designer {
                    position { x y }
                    size { width height }
                    color
                    icon
                  }
                }
              }
              designer {
                canvas { zoom panX panY gridSize snapToGrid }
                connections {
                  id
                  sourceStepId
                  sourcePort
                  targetStepId
                  targetPort
                  points { x y }
                  style
                  color
                  label
                }
                notes { id text position { x y } size { width height } color }
                groups { id label stepIds color collapsed }
              }
              sourceType
              location
              loadStatus
              errors {
                stage
                message
                code
                line
                column
              }
              validationErrors {
                field
                message
                code
              }
            }
          }
        `;

        const response = await reactory.graphqlQuery<{
          workflowYamlDefinition: any;
        }, any>(query, {
          nameSpace,
          name,
          version,
        });
        const yamlDef = response?.data?.workflowYamlDefinition;
        if (!yamlDef) {
          setYamlErrors([{ stage: 'REGISTRY', message: `No response returned for ${nameSpace}.${name}`, code: 'NO_RESPONSE' }]);
          setLoadStatus('NOT_FOUND');
          return;
        }

        // Always capture the raw source (even on error, so the YAML view can display it)
        setYamlSource(yamlDef.yamlSource || null);
        setYamlSourceType(yamlDef.sourceType || null);
        setLoadStatus(yamlDef.loadStatus || 'SUCCESS');
        setYamlErrors(yamlDef.errors || []);
        setServerValidationErrors(yamlDef.validationErrors || []);

        // Only build designer definition if the load was at least partially successful
        if (yamlDef.loadStatus === 'SUCCESS' || yamlDef.loadStatus === 'PARTIAL') {
          const designerDefinition = convertYamlToDesignerDefinition(yamlDef);
          updateDefinition(designerDefinition);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load YAML definition';
        setYamlErrors([{ stage: 'REGISTRY', message: msg, code: 'NETWORK_ERROR' }]);
        setLoadStatus('NOT_FOUND');
        reactory.log(msg, { err }, 'error');
      } finally {
        setYamlLoading(false);
      }
    };

    loadYamlDefinition();
  }, [workflowRef?.nameSpace, workflowRef?.name, workflowRef?.version]);

  // Convenience: single error string for simple display scenarios
  const yamlError = yamlErrors.length > 0
    ? yamlErrors.map(e => {
        const loc = e.line ? ` L${e.line}:${e.column ?? 0}` : '';
        return `[${e.stage}]${loc} ${e.message}`;
      }).join('\n')
    : null;

  return { yamlLoading, yamlError, yamlErrors, serverValidationErrors, yamlSource, setYamlSource, yamlSourceType, loadStatus };
}


export default function WorkflowDesigner(props: WorkflowDesignerProps) {
  const {
    workflowId,
    initialDefinition,
    workflow: workflowRef,
    templates,
    stepLibrary: customStepLibrary,
    theme: customTheme,
    onSave,
    onLoad,
    onValidationChange,
    onSelectionChange,
    onCanvasChange,
    enableCollaboration = false,
    readonly = false,
    autoSave = false,
    autoSaveInterval = 30000,
  } = props;

  const reactory = useReactory();
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const {
    mode,
    primary,
    secondary,
    background,
    text,
  } = reactory.muiTheme.palette;

  const {    
    Material
  } = reactory.getComponents<{    
    Material: Reactory.Client.Web.IMaterialModule
  }>(["material-ui.Material"]);
  // UI state
  const [stepLibraryPanelOpen, setStepLibraryPanelOpen] = useState<boolean>(true);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState<boolean>(true);
  const [validationPanelOpen, setValidationPanelOpen] = useState<boolean>(false);
  const [templatesPanelOpen, setTemplatesPanelOpen] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(props.showGrid || true);
  const [enableSnapToGrid, setEnableSnapToGrid] = useState<boolean>(props.snapToGrid || true);
  const [renderingMode, setRenderingMode] = useState<RenderingMode>('webgl'); // Default to WebGL for best performance
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [titleInputValue, setTitleInputValue] = useState<string>('');
  const [showUserHomeFolderDialog, setShowUserHomeFolderDialog] = useState<boolean>(false);
  const [showServerFileExplorerDialog, setShowServerFileExplorerDialog] = useState<boolean>(false);

  // Active workflow ref — starts from props but can be overridden by file selection
  const [activeWorkflowRef, setActiveWorkflowRef] = useState<WorkflowDesignerProps['workflow']>(workflowRef ?? null);

  // GraphQL operations
  const {
    loading: graphqlLoading,
    error: graphqlError,
    getWorkflows,
    getWorkflow,
    saveWorkflowDefinition,
    deleteWorkflowDefinition,
    validateWorkflowDefinition
  } = useGraphQL();

  // Step library management
  const {
    stepLibrary,
    categories,
    filteredSteps,
    searchTerm,
    selectedCategory,
    setSearchTerm,
    setSelectedCategory,
    getStepDefinition,
    addCustomStep
  } = useStepLibrary({
    customSteps: customStepLibrary
  });

  // Main workflow designer state
  const {
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
    setViewport,
    setSelection,
    setDragState,
    save,
    load,
    undo,
    redo,
    validate,
    reset
  } = useWorkflowDesigner({
    workflowId,
    initialDefinition,
    autoSave,
    autoSaveInterval,
    onSave: useCallback(async (def) => {
      if (onSave) {
        await onSave(def);
      } else {
        // Use GraphQL to save (upsert)
        await saveWorkflowDefinition(def);
      }
    }, [onSave, saveWorkflowDefinition]),
    onLoad: useCallback(async (id) => {
      if (onLoad) {
        return await onLoad(id);
      } else {
        // Use GraphQL to load
        const [namespace, nameVersion] = id.split('.');
        const [name] = nameVersion.split('@');
        const result = await getWorkflow(namespace, name);
        if (!result) {
          throw new Error(`Workflow ${id} not found`);
        }
        return result;
      }
    }, [onLoad, getWorkflow]),
    onValidationChange
  });

  // Load YAML workflow definition if this is a YAML-based workflow.
  // Uses activeWorkflowRef so it can be re-triggered by file selection.
  const { yamlLoading, yamlError, yamlErrors, serverValidationErrors, yamlSource, setYamlSource, yamlSourceType, loadStatus } = useYamlWorkflowLoader(
    activeWorkflowRef,
    initialDefinition,
    reactory,
    updateDefinition,
  );

  // Merge server-side YAML validation errors into the designer's validationResult
  // so step nodes automatically display error indicators via the existing rendering pipeline.
  const mergedValidationResult = useMemo(() => {
    if (!serverValidationErrors || serverValidationErrors.length === 0) {
      return validationResult;
    }

    const serverErrors = serverValidationErrors.map((sve): import('./types').ValidationError => ({
      severity: 'error' as const,
      message: sve.code ? `[${sve.code}] ${sve.message}` : sve.message,
      stepId: sve.field || undefined,
      type: 'SCHEMA_VIOLATION' as any,
    }));

    return {
      ...validationResult,
      isValid: validationResult.isValid && serverErrors.length === 0,
      errors: [...validationResult.errors, ...serverErrors],
    };
  }, [validationResult, serverValidationErrors]);

  // Canvas viewport operations (for toolbar controls)
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(3.0, viewport.zoom * 1.2);
    setViewport({ ...viewport, zoom: newZoom });
  }, [viewport, setViewport]);

  const zoomOut = useCallback(() => {
    const newZoom = Math.max(0.1, viewport.zoom / 1.2);
    setViewport({ ...viewport, zoom: newZoom });
  }, [viewport, setViewport]);

  const zoomToFit = useCallback(() => {
    if (definition.steps.length === 0) return;

    // Calculate bounds of all steps
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    definition.steps.forEach(step => {
      const stepBounds = {
        x: step.position.x,
        y: step.position.y,
        width: step.size?.width || 200,
        height: step.size?.height || 100
      };

      minX = Math.min(minX, stepBounds.x);
      minY = Math.min(minY, stepBounds.y);
      maxX = Math.max(maxX, stepBounds.x + stepBounds.width);
      maxY = Math.max(maxY, stepBounds.y + stepBounds.height);
    });

    if (minX === Infinity) return;

    const contentBounds = {
      x: minX - 50,
      y: minY - 50,
      width: maxX - minX + 100,
      height: maxY - minY + 100
    };

    // Use actual canvas container dimensions if available, fall back to defaults
    const canvasWidth = canvasAreaRef.current?.clientWidth || 800;
    const canvasHeight = canvasAreaRef.current?.clientHeight || 600;

    // Leave a 5% inset so content isn't flush with the edges
    const availableWidth = canvasWidth * 0.9;
    const availableHeight = canvasHeight * 0.9;

    const scaleX = availableWidth / contentBounds.width;
    const scaleY = availableHeight / contentBounds.height;
    // Clamp: never exceed 1.0 (don't zoom in beyond natural size), never below 0.05
    const newZoom = Math.max(0.05, Math.min(scaleX, scaleY, 1.0));

    const contentCenterX = contentBounds.x + contentBounds.width / 2;
    const contentCenterY = contentBounds.y + contentBounds.height / 2;

    // screenX = worldX * zoom + panX  →  panX = screenCenterX - worldCenterX * zoom
    // screenY = worldY * zoom + panY  →  panY = screenCenterY - worldCenterY * zoom
    const newPanX = canvasWidth / 2 - contentCenterX * newZoom;
    const newPanY = canvasHeight / 2 - contentCenterY * newZoom;

    setViewport({
      ...viewport,
      zoom: newZoom,
      panX: newPanX,
      panY: newPanY
    });
  }, [definition.steps, viewport, setViewport]);

  const zoomToSelectionBounds = useCallback((bounds) => {
    // Implementation for zooming to selection bounds
    console.log('Zoom to selection:', bounds);
  }, []);

  // Handle step creation from library (via canvas drop)
  const handleStepCreation = useCallback((stepDefinition: any, position: Point) => {
    console.log('🏗️ Step creation called with:', stepDefinition, position);

    const canvasPos = enableSnapToGrid
      ? snapToGrid(position, CANVAS_DEFAULTS.GRID_SIZE)
      : position;

    const newStep: WorkflowStepDefinition = {
      id: generateStepId(stepDefinition.name.toLowerCase()),
      name: stepDefinition.name,
      type: stepDefinition.id,
      position: canvasPos,
      size: {
        width: STEP_DEFAULTS.WIDTH,
        height: STEP_DEFAULTS.HEIGHT
      },
      properties: { ...stepDefinition.defaultProperties },
      inputPorts: stepDefinition.inputPorts.map(port => ({
        id: generateConnectionId(),
        name: port.name,
        type: port.type,
        dataType: port.dataType,
        required: port.required,
        position: { x: 0, y: 0 } // Will be calculated during render
      })),
      outputPorts: stepDefinition.outputPorts.map(port => ({
        id: generateConnectionId(),
        name: port.name,
        type: port.type,
        dataType: port.dataType,
        required: port.required,
        position: { x: 0, y: 0 } // Will be calculated during render
      }))
    };

    console.log('🏗️ Adding step to definition:', newStep);
    addStep(newStep);

    // Select the new step
    setSelection({
      selectedSteps: new Set([newStep.id]),
      selectedConnections: new Set()
    });
  }, [addStep, setSelection, enableSnapToGrid, generateStepId, snapToGrid, generateConnectionId]);

  // Handle connection creation
  const handleConnectionCreate = useCallback((sourceStepId: string, sourcePortId: string, targetStepId: string, targetPortId: string) => {
    const newConnection: WorkflowConnection = {
      id: generateConnectionId(),
      sourceStepId,
      sourcePortId,
      targetStepId,
      targetPortId
    };

    addConnection(newConnection);
  }, [addConnection]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (readonly) return;

    // Ignore keyboard shortcuts when user is typing in input fields
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement).contentEditable === 'true' ||
      activeElement.getAttribute('contenteditable') === 'true'
    );

    const modifiers = {
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey
    };

    const isModifierKey = modifiers.ctrl || modifiers.meta;
    const key = event.key.toLowerCase();

    // If user is typing in an input field, don't intercept keyboard events
    // except for specific shortcuts that should work everywhere
    if (isInputFocused && !isModifierKey) {
      // Allow normal typing behavior in input fields
      return;
    }

    // Allow certain shortcuts even in input fields (like Ctrl+Z for undo)
    if (isInputFocused && isModifierKey) {
      const allowedShortcutsInInputs = ['z', 'y', 's']; // Undo, Redo, Save
      if (!allowedShortcutsInInputs.includes(key)) {
        return;
      }
    }

    switch (key) {
      case 's':
        if (isModifierKey) {
          event.preventDefault();
          save();
        }
        break;
      case 'z':
        if (isModifierKey) {
          event.preventDefault();
          if (modifiers.shift) {
            redo();
          } else {
            undo();
          }
        }
        break;
      case 'y':
        if (isModifierKey) {
          event.preventDefault();
          redo();
        }
        break;
      case 'delete':
      case 'backspace':
        event.preventDefault();
        // Delete selected items
        selection.selectedSteps.forEach(stepId => removeStep(stepId));
        selection.selectedConnections.forEach(connId => removeConnection(connId));
        break;
      case 'a':
        if (isModifierKey) {
          event.preventDefault();
          // Select all steps
          setSelection({
            selectedSteps: new Set(definition.steps.map(s => s.id)),
            selectedConnections: new Set(definition.connections.map(c => c.id))
          });
        }
        break;
      case '+':
      case '=':
        if (isModifierKey) {
          event.preventDefault();
          zoomIn();
        }
        break;
      case '-':
        if (isModifierKey) {
          event.preventDefault();
          zoomOut();
        }
        break;
      case '0':
        if (isModifierKey) {
          event.preventDefault();
          zoomToFit();
        }
        break;
    }
  }, [readonly, save, undo, redo, removeStep, removeConnection, selection, setSelection, definition, zoomIn, zoomOut, zoomToFit]);

  // Set up keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const selectedItems = [...selection.selectedSteps, ...selection.selectedConnections];
      onSelectionChange(selectedItems);
    }
  }, [selection, onSelectionChange]);

  // Notify parent of canvas changes
  useEffect(() => {
    if (onCanvasChange) {
      onCanvasChange(viewport);
    }
  }, [viewport, onCanvasChange]);

  // Keep title input value in sync with definition
  useEffect(() => {
    if (!isEditingTitle) {
      setTitleInputValue(definition?.name || '');
    }
  }, [definition?.name, isEditingTitle]);

  // Zoom to selection when selection changes
  const handleZoomToSelection = useCallback(() => {
    const selectedSteps = definition.steps.filter(step =>
      selection.selectedSteps.has(step.id)
    );

    if (selectedSteps.length > 0) {
      const bounds = getSelectionBounds(selectedSteps);
      if (bounds) {
        zoomToSelectionBounds(bounds);
      }
    }
  }, [definition.steps, selection.selectedSteps, zoomToSelectionBounds]);

  // Panel toggle handlers
  const handleStepLibraryToggle = useCallback(() => {
    setStepLibraryPanelOpen(!stepLibraryPanelOpen);
  }, [stepLibraryPanelOpen]);

  const handlePropertiesToggle = useCallback(() => {
    setPropertiesPanelOpen(!propertiesPanelOpen);
  }, [propertiesPanelOpen]);

  const handleValidationToggle = useCallback(() => {
    setValidationPanelOpen(!validationPanelOpen);
  }, [validationPanelOpen]);

  // Get selected items for properties panel
  const selectedSteps = useMemo(() => {
    return definition.steps.filter(step => selection.selectedSteps.has(step.id));
  }, [definition.steps, selection.selectedSteps]);

  const selectedConnections = useMemo(() => {
    return definition.connections.filter(connection => selection.selectedConnections.has(connection.id));
  }, [definition.connections, selection.selectedConnections]);

  // Handle step property updates
  const handleStepUpdate = useCallback((updatedStep: WorkflowStepDefinition) => {
    updateStep(updatedStep.id, updatedStep);
  }, [updateStep]);

  // Handle connection updates
  const handleConnectionUpdate = useCallback((updatedConnection: WorkflowConnection) => {
    // Update connection in definition
    const newDefinition = {
      ...definition,
      connections: definition.connections.map(conn =>
        conn.id === updatedConnection.id ? updatedConnection : conn
      )
    };
    updateDefinition(newDefinition);
  }, [updateDefinition, definition]);

  // Handle manual validation trigger
  const handleValidate = useCallback(() => {
    validate();
  }, [validate]);

  // Handle title editing
  const handleTitleClick = useCallback(() => {
    if (!readonly) {
      setIsEditingTitle(true);
    }
  }, [readonly]);

  const handleTitleSave = useCallback(() => {
    if (titleInputValue.trim() && titleInputValue !== definition.name) {
      const updatedDefinition = {
        ...definition,
        name: titleInputValue.trim()
      };
      updateDefinition(updatedDefinition);
    }
    setIsEditingTitle(false);
  }, [titleInputValue, definition, updateDefinition]);

  const handleTitleCancel = useCallback(() => {
    setTitleInputValue(definition?.name || '');
    setIsEditingTitle(false);
  }, [definition?.name]);

  const handleTitleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleTitleSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleTitleCancel();
    }
  }, [handleTitleSave, handleTitleCancel]);

  // Handle save dropdown
  const [saveMenuAnchor, setSaveMenuAnchor] = useState<null | HTMLElement>(null);
  const isSaveMenuOpen = Boolean(saveMenuAnchor);
  const [saveNotification, setSaveNotification] = useState<{ open: boolean; severity: 'success' | 'error'; message: string }>({ open: false, severity: 'success', message: '' });

  // Handle load dropdown
  const [loadMenuAnchor, setLoadMenuAnchor] = useState<null | HTMLElement>(null);
  const isLoadMenuOpen = Boolean(loadMenuAnchor);
  const [selectedWorkspaceType, setSelectedWorkspaceType] = useState<'server' | 'user'>('user');

  // Handle context menu
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; target: { type: 'step' | 'connection' | 'canvas'; id?: string; } } | null>(null);

  const handleSaveMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setSaveMenuAnchor(event.currentTarget);
  }, []);

  const handleSaveMenuClose = useCallback(() => {
    setSaveMenuAnchor(null);
  }, []);

  const handleSaveToServer = useCallback(async () => {
    handleSaveMenuClose();
    try {
      await save();
      setSaveNotification({ open: true, severity: 'success', message: 'Workflow saved successfully' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save workflow';
      setSaveNotification({ open: true, severity: 'error', message: msg });
    }
  }, [save]);

  const handleDownloadFile = useCallback(() => {
    handleSaveMenuClose();

    // Create downloadable JSON file
    const dataStr = JSON.stringify(definition, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `${definition.name || 'workflow'}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [definition]);

  // Load menu handlers
  const handleLoadMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setLoadMenuAnchor(event.currentTarget);
  }, []);

  const handleLoadMenuClose = useCallback(() => {
    setLoadMenuAnchor(null);
  }, []);

  const handleLoadFromServerWorkspace = useCallback(() => {
    setSelectedWorkspaceType('server');
    setShowServerFileExplorerDialog(true);
    handleLoadMenuClose();
  }, []);

  const handleLoadFromUserWorkspace = useCallback(() => {
    setSelectedWorkspaceType('user');
    setShowUserHomeFolderDialog(true);
    handleLoadMenuClose();
  }, []);


  const handleLoadDialogClose = useCallback(() => {
    setShowUserHomeFolderDialog(false);
  }, []);

  const handleServerFileExplorerClose = useCallback(() => {
    setShowServerFileExplorerDialog(false);
  }, []);

  const handleServerFileSelection = useCallback(async (selectedFiles: any[]) => {
    if (selectedFiles.length === 0) return;

    const selectedFile = selectedFiles[0];
    const lowerName = (selectedFile.name as string).toLowerCase();
    const isWorkflowFile = lowerName.endsWith('.yaml') || lowerName.endsWith('.yml') || lowerName.endsWith('.json');

    if (!isWorkflowFile) {
      setSaveNotification({ open: true, severity: 'error', message: 'Please select a YAML or JSON workflow file' });
      return;
    }

    // Parse nameSpace, name, version from the catalog path.
    // Catalog path format: .../workflows/catalog/<nameSpace>/<name>/<version>/<name>.yaml
    const fullPath: string = selectedFile.fullPath || selectedFile.path || '';
    const catalogMatch = fullPath.replace(/\\/g, '/').split(/\/catalog\//);
    let nameSpace = '';
    let name = '';
    let version: string | undefined;

    if (catalogMatch.length >= 2) {
      const segments = catalogMatch[1].split('/');
      nameSpace = segments[0] || '';
      name = segments[1] || '';
      version = segments[2] || undefined;
    }

    if (!nameSpace || !name) {
      // Fallback: try to derive from the filename itself (name.yaml → name)
      name = lowerName.replace(/\.(yaml|yml|json)$/, '');
      setSaveNotification({ open: true, severity: 'error', message: `Could not determine workflow namespace from path: ${fullPath}` });
      return;
    }

    setShowServerFileExplorerDialog(false);

    // Trigger the YAML loader by updating the active workflow ref
    setActiveWorkflowRef({ nameSpace, name, version: version ?? '1.0.0', workflowType: 'YAML' } as any);
  }, []);

  const handleFileSelection = useCallback(async (selectedItems: any[], selectionMode: 'single' | 'multi') => {
    if (selectedItems.length > 0 && selectedItems[0].type === 'file') {
      const selectedFile = selectedItems[0];

      // Check if it's a JSON file (workflow file)
      if (selectedFile.name.toLowerCase().endsWith('.json')) {
        try {
          // For now, let's use the load function from useWorkflowDesigner
          // In a real implementation, you'd fetch the file content from the backend
          console.log('Loading workflow from file:', selectedFile);

          // Close the dialog
          setShowUserHomeFolderDialog(false);

          // TODO: Implement actual file loading from backend
          // This would typically involve:
          // 1. Fetch file content from the backend using selectedFile.id
          // 2. Parse the JSON content
          // 3. Load it using the load() function

          console.info(`Loading workflow from ${selectedFile.name}`, 'This feature will be implemented to load the actual file content');

        } catch (error) {
          console.error('Failed to load workflow', error);
        }
      } else {
        console.warn('Invalid file type', 'Please select a JSON workflow file');
      }
    }
  }, [load]);

  const handleFileUpload = useCallback(async (files: File[], path: string) => {
    if (files.length > 0) {
      const file = files[0];

      // Check if it's a JSON file
      if (file.name.toLowerCase().endsWith('.json')) {
        try {
          const content = await file.text();
          const workflowData = JSON.parse(content);

          // Validate the workflow structure (basic check)
          if (workflowData.id && workflowData.name && workflowData.steps) {
            // Load the workflow directly
            updateDefinition(workflowData);
            setShowUserHomeFolderDialog(false);
            console.log(`Successfully loaded workflow: ${workflowData.name}`);
          } else {
            console.error('Invalid workflow file', 'The selected file does not appear to be a valid workflow definition');
          }
        } catch (error) {
          console.error('Failed to parse workflow file', error);
        }
      } else {
        console.warn('Invalid file type', 'Please select a JSON workflow file');
      }
    }
  }, [updateDefinition]);

  // Context menu handlers
  const handleContextMenu = useCallback((event: React.MouseEvent, target: { type: 'step' | 'connection' | 'canvas'; id?: string; }) => {
    if (readonly) return;

    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      target
    });
  }, [readonly]);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCopyStep = useCallback(() => {
    if (contextMenu?.target.type === 'step' && contextMenu.target.id) {
      const step = definition.steps.find(s => s.id === contextMenu.target.id);
      if (step) {
        // Create a copy with new ID and offset position
        const copiedStep: WorkflowStepDefinition = {
          ...step,
          id: generateStepId(step.name.toLowerCase()),
          name: `${step.name} Copy`,
          position: {
            x: step.position.x + 50,
            y: step.position.y + 50
          }
        };
        addStep(copiedStep);
        setSelection({
          selectedSteps: new Set([copiedStep.id]),
          selectedConnections: new Set()
        });
      }
    }
    handleContextMenuClose();
  }, [contextMenu, definition.steps, addStep, setSelection, generateStepId]);

  const handleDeleteSelected = useCallback(() => {
    selection.selectedSteps.forEach(stepId => removeStep(stepId));
    selection.selectedConnections.forEach(connId => removeConnection(connId));
    handleContextMenuClose();
  }, [selection, removeStep, removeConnection]);

  const handleDuplicateStep = useCallback(() => {
    handleCopyStep(); // Same as copy for now
  }, [handleCopyStep]);

  // Canvas event handlers - moved to top level to avoid hooks in JSX
  const handleCanvasStepMove = useCallback((stepId: string, position: Point) => {
    updateStep(stepId, { position });
  }, [updateStep]);

  const handleCanvasStepResize = useCallback((stepId: string, size: Size) => {
    updateStep(stepId, { size });
  }, [updateStep]);

  const handleCanvasStepSelect = useCallback((stepId: string, multi: boolean) => {
    const newSelectedSteps: Set<string> = new Set(multi ? selection.selectedSteps : []);

    if (newSelectedSteps.has(stepId)) {
      newSelectedSteps.delete(stepId);
    } else {
      newSelectedSteps.add(stepId);
    }

    setSelection({
      selectedSteps: newSelectedSteps,
      selectedConnections: multi ? selection.selectedConnections : new Set<string>(),
      selectionBounds: undefined
    });
  }, [selection, setSelection]);

  const handleCanvasStepDoubleClick = useCallback((_stepId: string) => {
    setPropertiesPanelOpen(true);
  }, []);

  const handleCanvasConnectionCreate = useCallback((connection: Partial<WorkflowConnection>) => {
    if (connection.sourceStepId && connection.sourcePortId && connection.targetStepId && connection.targetPortId) {
      handleConnectionCreate(connection.sourceStepId, connection.sourcePortId, connection.targetStepId, connection.targetPortId);
    }
  }, [handleConnectionCreate]);

  const handleCanvasConnectionSelect = useCallback((connectionId: string, multi: boolean) => {
    const newSelectedConnections: Set<string> = new Set(multi ? selection.selectedConnections : []);

    if (newSelectedConnections.has(connectionId)) {
      newSelectedConnections.delete(connectionId);
    } else {
      newSelectedConnections.add(connectionId);
    }

    setSelection({
      selectedConnections: newSelectedConnections,
      selectedSteps: multi ? selection.selectedSteps : new Set<string>(),
      selectionBounds: undefined
    });
  }, [selection, setSelection]);

  const handleCanvasClick = useCallback((_position: Point, modifiers: InteractionModifiers) => {
    if (!modifiers.ctrl && !modifiers.meta) {
      setSelection({
        selectedSteps: new Set<string>(),
        selectedConnections: new Set<string>(),
        selectionBounds: undefined
      });
    }
  }, [setSelection]);

  const handleStepLibraryStepDragStart = useCallback((_step: unknown) => {
    // Step drag start handled by StepItem
  }, []);

  const handleStepLibraryStepClick = useCallback((step: unknown) => {
    // Handle step click - could show step details
    console.log('Step clicked:', step);
  }, []);

  const computeRootPath = useCallback(() => {
    // Only used for UserHomeFolder (user workspace)
    return '/';
  }, []);

  const {
    Box,
    Paper,
    Typography,
    TextField,
    IconButton,
    Tooltip,
    LinearProgress,
    Alert,
    Snackbar,
    Menu,
    MenuItem,
    ButtonGroup,
    Button
  } = Material.MaterialCore;

  const {
    ZoomIn,
    ZoomOut,
    CenterFocusStrong,
    GridOn,
    Save,
    Undo,
    Redo,
    PlayArrow,
    ViewSidebar,
    Settings,
    Visibility,
    VisibilityOff,
    Speed,
    ArrowDropDown,
    CloudUpload,
    Download,
    Edit,
    ContentCopy,
    Delete,
    FileCopy,
    MoreVert,
    FolderOpen
  } = Material.MaterialIcons;

  // Main component render
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        maxHeight: '100dvh',
        backgroundColor: background.default,
        overflow: 'hidden'
      }}
    >
      {/* Main Toolbar */}
      <Paper
        elevation={1}
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          gap: 1,
          borderRadius: 0,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        {isEditingTitle ? (
          <TextField
            value={titleInputValue}
            onChange={(e) => setTitleInputValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            variant="standard"
            autoFocus
            fullWidth
            sx={{ flexGrow: 1, mr: 1 }}
            InputProps={{
              style: { fontSize: '1.25rem', fontWeight: 500 }
            }}
          />
        ) : (
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', cursor: readonly ? 'default' : 'pointer' }}>
            <Typography
              variant="h6"
              onClick={handleTitleClick}
              sx={{
                flexGrow: 1,
                '&:hover': readonly ? {} : {
                  backgroundColor: 'action.hover',
                  borderRadius: 1,
                  px: 1,
                  py: 0.5
                }
              }}
            >
              {definition.name}
              {isDirty && ' *'}
            </Typography>
            {!readonly && (
              <IconButton
                size="small"
                onClick={handleTitleClick}
                sx={{ ml: 1, opacity: 0.7 }}
              >
                <Edit fontSize="small" />
              </IconButton>
            )}
          </Box>
        )}

        <Box sx={{ mr: 1 }}>
          <ButtonGroup variant="outlined" disabled={readonly} size="small">
            <Button
              onClick={handleLoadFromUserWorkspace}
              startIcon={<FolderOpen />}
            >
              Load
            </Button>
            <Button
              onClick={handleLoadMenuOpen}
              disabled={readonly}
            >
              <ArrowDropDown />
            </Button>
          </ButtonGroup>
          <Menu
            anchorEl={loadMenuAnchor}
            open={isLoadMenuOpen}
            onClose={handleLoadMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={handleLoadFromUserWorkspace}>
              <FolderOpen sx={{ mr: 1 }} />
              My Workspace
            </MenuItem>
            <MenuItem onClick={handleLoadFromServerWorkspace}>
              <CloudUpload sx={{ mr: 1 }} />
              Server Workspace
            </MenuItem>
          </Menu>
        </Box>


        <Box>
          <ButtonGroup variant="contained" disabled={readonly || isSaving}>

            <Button
              onClick={handleSaveToServer}
              disabled={!isDirty}
              startIcon={<CloudUpload />}
              size="small"
            >
              Save
            </Button>
            <Button
              size="small"
              onClick={handleSaveMenuOpen}
              disabled={readonly || isSaving}
            >
              <ArrowDropDown />
            </Button>
          </ButtonGroup>
          <Menu
            anchorEl={saveMenuAnchor}
            open={isSaveMenuOpen}
            onClose={handleSaveMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={handleSaveToServer} disabled={readonly || isSaving || !isDirty}>
              <CloudUpload sx={{ mr: 1 }} />
              Save to Server
            </MenuItem>
            <MenuItem onClick={handleDownloadFile}>
              <Download sx={{ mr: 1 }} />
              Download File
            </MenuItem>
          </Menu>
        </Box>


        <Tooltip title="Undo">
          <IconButton
            onClick={undo}
            disabled={readonly || !historyState.canUndo}
          >
            <Undo />
          </IconButton>
        </Tooltip>

        <Tooltip title="Redo">
          <IconButton
            onClick={redo}
            disabled={readonly || !historyState.canRedo}
          >
            <Redo />
          </IconButton>
        </Tooltip>

        <Tooltip title="Zoom In">
          <IconButton onClick={zoomIn}>
            <ZoomIn />
          </IconButton>
        </Tooltip>

        <Tooltip title="Zoom Out">
          <IconButton onClick={zoomOut}>
            <ZoomOut />
          </IconButton>
        </Tooltip>

        <Tooltip title="Zoom to Fit">
          <IconButton onClick={zoomToFit}>
            <CenterFocusStrong />
          </IconButton>
        </Tooltip>

        {selectedSteps.length > 0 && (
          <Tooltip title="Zoom to Selection">
            <IconButton onClick={handleZoomToSelection}>
              <CenterFocusStrong color="primary" />
            </IconButton>
          </Tooltip>
        )}

        <Typography variant="body2" sx={{ ml: 2, mr: 2 }}>
          Zoom: {Math.round(viewport.zoom * 100)}%
        </Typography>

        {/* Panel Toggles */}
        <Tooltip title="Toggle Step Library Panel">
          <IconButton
            onClick={handleStepLibraryToggle}
            color={stepLibraryPanelOpen ? "primary" : "default"}
            sx={{ ml: 1 }}
          >
            <ViewSidebar />
          </IconButton>
        </Tooltip>

        <Tooltip title="Toggle Properties Panel">
          <IconButton
            onClick={handlePropertiesToggle}
            color={propertiesPanelOpen ? "primary" : "default"}
          >
            <Settings />
          </IconButton>
        </Tooltip>

        <Tooltip title={`${showGrid ? 'Hide' : 'Show'} Grid`}>
          <IconButton
            onClick={() => {
              setShowGrid(!showGrid);
            }}
            color={showGrid ? "primary" : "default"}
          >
            {showGrid ? <Visibility /> : <VisibilityOff />}
          </IconButton>
        </Tooltip>

        {/* Rendering Mode Toggle */}
        <ButtonGroup size="small" variant="outlined" sx={{ ml: 1 }}>
          <Tooltip title="DOM Rendering (Basic)">
            <Button
              onClick={() => setRenderingMode('dom')}
              variant={renderingMode === 'dom' ? 'contained' : 'outlined'}
              size="small"
            >
              DOM
            </Button>
          </Tooltip>
          <Tooltip title="Optimized DOM Rendering">
            <Button
              onClick={() => setRenderingMode('optimized')}
              variant={renderingMode === 'optimized' ? 'contained' : 'outlined'}
              size="small"
            >
              OPT
            </Button>
          </Tooltip>
          <Tooltip title="WebGL Rendering (Best Performance)">
            <Button
              onClick={() => setRenderingMode('webgl')}
              variant={renderingMode === 'webgl' ? 'contained' : 'outlined'}
              size="small"
              startIcon={<Speed />}
            >
              WebGL
            </Button>
          </Tooltip>
        </ButtonGroup>
      </Paper>

      {/* Progress indicator */}
      {(isSaving || graphqlLoading) && (
        <LinearProgress />
      )}

      {/* Error display */}
      {graphqlError && (
        <Alert severity="error" onClose={() => {/* Handle error dismissal */ }}>
          {graphqlError}
        </Alert>
      )}

      {/* Main content area */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>

        {/* Step Library Panel */}
        {stepLibraryPanelOpen && (
          <Paper
            elevation={1}
            sx={{
              width: 320,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 0,
              borderRight: 1,
              borderColor: 'divider',
              overflow: 'hidden'
            }}
          >
            <StepLibraryPanel
              stepLibrary={stepLibrary}
              categories={categories}
              searchTerm={searchTerm}
              selectedCategory={selectedCategory}
              onStepDragStart={handleStepLibraryStepDragStart}
              onSearchChange={setSearchTerm}
              onCategorySelect={setSelectedCategory}
              onStepClick={handleStepLibraryStepClick}
            />
          </Paper>
        )}

        {/* Canvas Area */}
        <Box
          ref={canvasAreaRef}
          sx={{
            flexGrow: 1,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: background.paper
          }}
        >
          {/* WebGL Canvas - Best Performance */}
          {renderingMode === 'webgl' && (
            <WorkflowWebGLCanvas
              definition={definition}
              stepLibrary={stepLibrary}
              viewport={viewport}
              selection={selection}
              dragState={dragState}
              validationResult={mergedValidationResult}
              showGrid={showGrid}
              snapToGrid={enableSnapToGrid}
              readonly={readonly}
              onStepMove={handleCanvasStepMove}
              onStepResize={handleCanvasStepResize}
              onStepSelect={handleCanvasStepSelect}
              onStepDoubleClick={handleCanvasStepDoubleClick}
              onConnectionCreate={handleCanvasConnectionCreate}
              onConnectionSelect={handleCanvasConnectionSelect}
              onCanvasClick={handleCanvasClick}
              onViewportChange={setViewport}
              onStepCreate={handleStepCreation}
              onContextMenu={handleContextMenu}
            />
          )}

          {/* Optimized DOM Canvas */}
          {renderingMode === 'optimized' && (
            <OptimizedWorkflowCanvas
              definition={definition}
              stepLibrary={stepLibrary}
              viewport={viewport}
              selection={selection}
              dragState={dragState}
              validationResult={mergedValidationResult}
              showGrid={showGrid}
              snapToGrid={enableSnapToGrid}
              readonly={readonly}
              onStepMove={handleCanvasStepMove}
              onStepResize={handleCanvasStepResize}
              onStepSelect={handleCanvasStepSelect}
              onStepDoubleClick={handleCanvasStepDoubleClick}
              onConnectionCreate={handleCanvasConnectionCreate}
              onConnectionSelect={handleCanvasConnectionSelect}
              onCanvasClick={handleCanvasClick}
              onViewportChange={setViewport}
              onStepCreate={handleStepCreation}
              onContextMenu={handleContextMenu}
            />
          )}

          {/* Basic DOM Canvas */}
          {renderingMode === 'dom' && (
            <WorkflowCanvas
              definition={definition}
              stepLibrary={stepLibrary}
              viewport={viewport}
              selection={selection}
              dragState={dragState}
              validationResult={mergedValidationResult}
              showGrid={showGrid}
              snapToGrid={enableSnapToGrid}
              readonly={readonly}
              onStepMove={handleCanvasStepMove}
              onStepResize={handleCanvasStepResize}
              onStepSelect={handleCanvasStepSelect}
              onStepDoubleClick={handleCanvasStepDoubleClick}
              onConnectionCreate={handleCanvasConnectionCreate}
              onConnectionSelect={handleCanvasConnectionSelect}
              onCanvasClick={handleCanvasClick}
              onViewportChange={setViewport}
              onStepCreate={handleStepCreation}
              onContextMenu={handleContextMenu}
            />
          )}
        </Box>

        {/* Properties Panel */}
        {propertiesPanelOpen && (
          <Paper
            elevation={1}
            sx={{
              width: 350,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 0,
              borderLeft: 1,
              borderColor: 'divider',
              overflow: 'hidden'
            }}
          >
            <PropertiesPanel
              selectedSteps={selectedSteps}
              selectedConnections={selectedConnections}
              stepLibrary={stepLibrary}
              validationResult={mergedValidationResult}
              readonly={readonly}
              onStepUpdate={handleStepUpdate}
              onConnectionUpdate={handleConnectionUpdate}
              onValidate={handleValidate}
              definition={definition}
              onDefinitionUpdate={updateDefinition}
            />
          </Paper>
        )}
      </Box>

      {/* Status bar */}
      <Paper
        elevation={1}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 0.5,
          borderRadius: 0,
          borderTop: 1,
          borderColor: 'divider'
        }}
      >
        <Typography variant="caption">
          Steps: {definition.steps.length} |
          Connections: {definition.connections.length} |
          Selected: {selection.selectedSteps.size + selection.selectedConnections.size}
        </Typography>

        <Typography variant="caption">
          {mergedValidationResult.errors.length > 0 && `Errors: ${mergedValidationResult.errors.length} | `}
          {mergedValidationResult.warnings.length > 0 && `Warnings: ${mergedValidationResult.warnings.length} | `}
          Ready
        </Typography>
      </Paper>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {contextMenu?.target.type === 'step' && [
          <MenuItem key="copy" onClick={handleCopyStep}>
            <ContentCopy sx={{ mr: 1 }} />
            Copy Step
          </MenuItem>,
          <MenuItem key="duplicate" onClick={handleDuplicateStep}>
            <FileCopy sx={{ mr: 1 }} />
            Duplicate Step
          </MenuItem>,
          <MenuItem key="delete" onClick={handleDeleteSelected}>
            <Delete sx={{ mr: 1 }} />
            Delete Step
          </MenuItem>
        ]}
        {contextMenu?.target.type === 'connection' && [
          <MenuItem key="delete" onClick={handleDeleteSelected}>
            <Delete sx={{ mr: 1 }} />
            Delete Connection
          </MenuItem>
        ]}
        {contextMenu?.target.type === 'canvas' && [
          <MenuItem key="select-all" onClick={() => {
            setSelection({
              selectedSteps: new Set(definition.steps.map(s => s.id)),
              selectedConnections: new Set(definition.connections.map(c => c.id))
            });
            handleContextMenuClose();
          }}>
            Select All
          </MenuItem>,
          <MenuItem key="zoom-fit" onClick={() => {
            zoomToFit();
            handleContextMenuClose();
          }}>
            Zoom to Fit
          </MenuItem>
        ]}
        {selection.selectedSteps.size > 0 || selection.selectedConnections.size > 0 ? [
          <MenuItem key="delete-selected" onClick={handleDeleteSelected}>
            <Delete sx={{ mr: 1 }} />
            Delete Selected ({selection.selectedSteps.size + selection.selectedConnections.size})
          </MenuItem>
        ] : null}
      </Menu>

      {/* Load Workflow Dialog - User Workspace */}
      <UserHomeFolder
        open={showUserHomeFolderDialog}
        onClose={handleLoadDialogClose}
        reactory={reactory}
        onFileUpload={handleFileUpload}
        onSelectionChanged={handleFileSelection}
        rootPath={ computeRootPath() }
        il8n={undefined}
      />

      {/* Load Workflow Dialog - Server Workspace */}
      <ServerFileExplorer
        open={showServerFileExplorerDialog}
        onClose={handleServerFileExplorerClose}
        reactory={reactory}
        serverPath="${APP_DATA_ROOT}/workflows"
        onFileSelection={handleServerFileSelection}
        selectionMode="single"
        allowedFileTypes={[
          '.json',
          '.yaml',
          '.yml',
          'application/json',
          'application/x-yaml',
          'text/yaml',
          'text/x-yaml'
        ]}
        title="Load Workflow from Server"
        readonly={true}
        il8n={undefined}
      />

      {/* Save notification */}
      <Snackbar
        open={saveNotification.open}
        autoHideDuration={4000}
        onClose={() => setSaveNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={saveNotification.severity}
          onClose={() => setSaveNotification(prev => ({ ...prev, open: false }))}
          variant="filled"
        >
          {saveNotification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
