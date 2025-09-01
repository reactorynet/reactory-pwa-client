import { useReactory } from "@reactory/client-core/api";
import { useEffect, useCallback, useMemo, useState } from 'react';
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
  getSelectionBounds 
} from './utils';
import { CANVAS_DEFAULTS, STEP_DEFAULTS } from './constants';

// Component imports
import WorkflowCanvas from './components/Canvas/WorkflowCanvas';
import StepLibraryPanel from './components/Panels/StepLibraryPanel';
import PropertiesPanel from './components/Panels/PropertiesPanel';
// import MainToolbar from './components/Toolbar/MainToolbar';

export default function WorkflowDesigner(props: WorkflowDesignerProps) {
  const {
    workflowId,
    initialDefinition,
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
    showGrid = true,
    snapToGrid: enableSnapToGrid = true,
    className,
    style
  } = props;

  const reactory = useReactory();
  const reactoryTheme: Reactory.UX.IReactoryTheme = reactory.getTheme();

  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);

  const { useState: useStateReact, useMemo: useMemoReact, useCallback: useCallbackReact, useEffect: useEffectReact } = React;

  // UI state
  const [stepLibraryPanelOpen, setStepLibraryPanelOpen] = useStateReact<boolean>(true);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useStateReact<boolean>(true);
  const [validationPanelOpen, setValidationPanelOpen] = useStateReact<boolean>(false);
  const [templatesPanelOpen, setTemplatesPanelOpen] = useStateReact<boolean>(false);

  // GraphQL operations
  const {
    loading: graphqlLoading,
    error: graphqlError,
    getWorkflows,
    getWorkflow,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    validateWorkflow
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
    onSave: useCallbackReact(async (def) => {
      if (onSave) {
        await onSave(def);
      } else {
        // Use GraphQL to save
        if (def.id && def.id !== 'new') {
          await updateWorkflow(def);
        } else {
          await createWorkflow(def);
        }
      }
    }, [onSave, updateWorkflow, createWorkflow]),
    onLoad: useCallbackReact(async (id) => {
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

  // Canvas viewport operations (for toolbar controls)
  const zoomIn = useCallbackReact(() => {
    const newZoom = Math.min(3.0, viewport.zoom * 1.2);
    setViewport({ ...viewport, zoom: newZoom });
  }, [viewport, setViewport]);

  const zoomOut = useCallbackReact(() => {
    const newZoom = Math.max(0.1, viewport.zoom / 1.2);
    setViewport({ ...viewport, zoom: newZoom });
  }, [viewport, setViewport]);

  const zoomToFit = useCallbackReact(() => {
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

    // Assume canvas size (would be better to get from ref)
    const canvasWidth = 800;
    const canvasHeight = 600;

    const scaleX = canvasWidth / contentBounds.width;
    const scaleY = canvasHeight / contentBounds.height;
    const newZoom = Math.min(scaleX, scaleY, 1.0);

    const newPanX = canvasWidth / 2 - (contentBounds.x + contentBounds.width / 2) * newZoom;
    const newPanY = canvasHeight / 2 - (contentBounds.y + contentBounds.height / 2) * newZoom;

    setViewport({
      ...viewport,
      zoom: newZoom,
      panX: newPanX,
      panY: newPanY
    });
  }, [definition.steps, viewport, setViewport]);

  const zoomToSelectionBounds = useCallbackReact((bounds) => {
    // Implementation for zooming to selection bounds
    console.log('Zoom to selection:', bounds);
  }, []);

  // Handle step creation from library (via canvas drop)
  const handleStepCreation = useCallbackReact((stepDefinition: any, position: Point) => {

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

    addStep(newStep);

    // Select the new step
    setSelection({
      selectedSteps: new Set([newStep.id]),
      selectedConnections: new Set()
    });
  }, [addStep, setSelection, enableSnapToGrid]);

  // Handle connection creation
  const handleConnectionCreate = useCallbackReact((sourceStepId: string, sourcePortId: string, targetStepId: string, targetPortId: string) => {
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
  const handleKeyDown = useCallbackReact((event: KeyboardEvent) => {
    if (readonly) return;

    const modifiers = {
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey
    };

    const isModifierKey = modifiers.ctrl || modifiers.meta;

    switch (event.key.toLowerCase()) {
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
  useEffectReact(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Notify parent of selection changes
  useEffectReact(() => {
    if (onSelectionChange) {
      const selectedItems = [...selection.selectedSteps, ...selection.selectedConnections];
      onSelectionChange(selectedItems);
    }
  }, [selection, onSelectionChange]);

  // Notify parent of canvas changes
  useEffectReact(() => {
    if (onCanvasChange) {
      onCanvasChange(viewport);
    }
  }, [viewport, onCanvasChange]);

  // Zoom to selection when selection changes
  const handleZoomToSelection = useCallbackReact(() => {
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
  const handleStepLibraryToggle = useCallbackReact(() => {
    setStepLibraryPanelOpen(!stepLibraryPanelOpen);
  }, [stepLibraryPanelOpen]);

  const handlePropertiesToggle = useCallbackReact(() => {
    setPropertiesPanelOpen(!propertiesPanelOpen);
  }, [propertiesPanelOpen]);

  const handleValidationToggle = useCallbackReact(() => {
    setValidationPanelOpen(!validationPanelOpen);
  }, [validationPanelOpen]);

  // Get selected items for properties panel
  const selectedSteps = useMemoReact(() => {
    return definition.steps.filter(step => selection.selectedSteps.has(step.id));
  }, [definition.steps, selection.selectedSteps]);

  const selectedConnections = useMemoReact(() => {
    return definition.connections.filter(connection => selection.selectedConnections.has(connection.id));
  }, [definition.connections, selection.selectedConnections]);

  // Handle step property updates
  const handleStepUpdate = useCallbackReact((updatedStep: WorkflowStepDefinition) => {
    updateStep(updatedStep.id, updatedStep);
  }, [updateStep]);

  // Handle connection updates
  const handleConnectionUpdate = useCallbackReact((updatedConnection: WorkflowConnection) => {
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
  const handleValidate = useCallbackReact(() => {
    validate();
  }, [validate]);

  const {
    Box,
    Paper,
    Typography,
    IconButton,
    Tooltip,
    LinearProgress,
    Alert
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
    VisibilityOff
  } = Material.MaterialIcons;

  // Main component render
  return (
    <Box
      className={className}
      style={style}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: reactoryTheme.palette.background.default,
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
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {definition.name}
          {isDirty && ' *'}
        </Typography>

        <Tooltip title="Save Workflow">
          <IconButton 
            onClick={save} 
            disabled={readonly || isSaving || !isDirty}
            color="primary"
          >
            <Save />
          </IconButton>
        </Tooltip>

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
          // Toggle grid - we'll need to add this to the component state
          console.log('Toggle grid');
        }}
        color={showGrid ? "primary" : "default"}
      >
        {showGrid ? <Visibility /> : <VisibilityOff />}
      </IconButton>
    </Tooltip>
      </Paper>

      {/* Progress indicator */}
      {(isSaving || graphqlLoading) && (
        <LinearProgress />
      )}

      {/* Error display */}
      {graphqlError && (
        <Alert severity="error" onClose={() => {/* Handle error dismissal */}}>
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
              onStepDragStart={useCallbackReact((step) => {
                // Step drag start handled by StepItem
              }, [])}
              onSearchChange={setSearchTerm}
              onCategorySelect={setSelectedCategory}
              onStepClick={useCallbackReact((step) => {
                // Handle step click - could show step details
                console.log('Step clicked:', step);
              }, [])}
            />
          </Paper>
        )}

        {/* Canvas Area */}
        <Box 
          sx={{ 
            flexGrow: 1, 
            position: 'relative', 
            overflow: 'hidden',
            backgroundColor: reactoryTheme.palette.background.paper
          }}
        >
          <WorkflowCanvas
            definition={definition}
            stepLibrary={stepLibrary}
            viewport={viewport}
            selection={selection}
            dragState={dragState}
            validationResult={validationResult}
            showGrid={showGrid}
            snapToGrid={enableSnapToGrid}
            readonly={readonly}
            onStepMove={useCallbackReact((stepId: string, position: Point) => {
              updateStep(stepId, { position });
            }, [updateStep])}
            onStepResize={useCallbackReact((stepId: string, size: Size) => {
              updateStep(stepId, { size });
            }, [updateStep])}
            onStepSelect={useCallbackReact((stepId: string, multi: boolean) => {
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
            }, [selection, setSelection])}
            onStepDoubleClick={useCallbackReact((stepId: string) => {
              setPropertiesPanelOpen(true);
            }, [])}
            onConnectionCreate={useCallbackReact((connection: Partial<WorkflowConnection>) => {
              if (connection.sourceStepId && connection.sourcePortId && connection.targetStepId && connection.targetPortId) {
                handleConnectionCreate(connection.sourceStepId, connection.sourcePortId, connection.targetStepId, connection.targetPortId);
              }
            }, [handleConnectionCreate])}
            onConnectionSelect={useCallbackReact((connectionId: string, multi: boolean) => {
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
            }, [selection, setSelection])}
            onCanvasClick={useCallbackReact((position: Point, modifiers: InteractionModifiers) => {
              if (!modifiers.ctrl && !modifiers.meta) {
                // Clear selection when clicking on empty canvas
                setSelection({
                  selectedSteps: new Set(),
                  selectedConnections: new Set()
                });
              }
            }, [setSelection])}
            onViewportChange={setViewport}
            onStepCreate={handleStepCreation}
          />
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
              validationResult={validationResult}
              readonly={readonly}
              onStepUpdate={handleStepUpdate}
              onConnectionUpdate={handleConnectionUpdate}
              onValidate={handleValidate}
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
          {validationResult.errors.length > 0 && `Errors: ${validationResult.errors.length} | `}
          {validationResult.warnings.length > 0 && `Warnings: ${validationResult.warnings.length} | `}
          Ready
        </Typography>
      </Paper>
    </Box>
  );
}
