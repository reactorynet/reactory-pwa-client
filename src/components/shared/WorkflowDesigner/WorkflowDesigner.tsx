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
import OptimizedWorkflowCanvas from './components/Canvas/OptimizedWorkflowCanvas';
import StepLibraryPanel from './components/Panels/StepLibraryPanel';
import PropertiesPanel from './components/Panels/PropertiesPanel';
import UserHomeFolder from '../UserHomeFolder/UserHomeFolder';
import { ServerFileExplorer } from '../ServerFileExplorer';


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
  } = props;

  const reactory = useReactory();
  const {
    mode,
    primary,
    secondary,
    background,
    text,
  } = reactory.muiTheme.palette;

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
  const [showGrid, setShowGrid] = useStateReact<boolean>(props.showGrid || true);
  const [enableSnapToGrid, setEnableSnapToGrid] = useStateReact<boolean>(props.snapToGrid || true);
  const [useOptimizedRendering, setUseOptimizedRendering] = useStateReact<boolean>(false); // Will be set after definition loads
  const [isEditingTitle, setIsEditingTitle] = useStateReact<boolean>(false);
  const [titleInputValue, setTitleInputValue] = useStateReact<string>('');
  const [showUserHomeFolderDialog, setShowUserHomeFolderDialog] = useStateReact<boolean>(false);
  const [showServerFileExplorerDialog, setShowServerFileExplorerDialog] = useStateReact<boolean>(false);

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

  // Keep title input value in sync with definition
  useEffectReact(() => {
    if (!isEditingTitle) {
      setTitleInputValue(definition?.name || '');
    }
  }, [definition?.name, isEditingTitle]);

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

  // Handle title editing
  const handleTitleClick = useCallbackReact(() => {
    if (!readonly) {
      setIsEditingTitle(true);
    }
  }, [readonly]);

  const handleTitleSave = useCallbackReact(() => {
    if (titleInputValue.trim() && titleInputValue !== definition.name) {
      const updatedDefinition = {
        ...definition,
        name: titleInputValue.trim()
      };
      updateDefinition(updatedDefinition);
    }
    setIsEditingTitle(false);
  }, [titleInputValue, definition, updateDefinition]);

  const handleTitleCancel = useCallbackReact(() => {
    setTitleInputValue(definition?.name || '');
    setIsEditingTitle(false);
  }, [definition?.name]);

  const handleTitleKeyDown = useCallbackReact((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleTitleSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleTitleCancel();
    }
  }, [handleTitleSave, handleTitleCancel]);

  // Handle save dropdown
  const [saveMenuAnchor, setSaveMenuAnchor] = useStateReact<null | HTMLElement>(null);
  const isSaveMenuOpen = Boolean(saveMenuAnchor);

  // Handle load dropdown
  const [loadMenuAnchor, setLoadMenuAnchor] = useStateReact<null | HTMLElement>(null);
  const isLoadMenuOpen = Boolean(loadMenuAnchor);
  const [selectedWorkspaceType, setSelectedWorkspaceType] = useStateReact<'server' | 'user'>('user');

  // Handle context menu
  const [contextMenu, setContextMenu] = useStateReact<{ mouseX: number; mouseY: number; target: { type: 'step' | 'connection' | 'canvas'; id?: string; } } | null>(null);

  const handleSaveMenuOpen = useCallbackReact((event: React.MouseEvent<HTMLElement>) => {
    setSaveMenuAnchor(event.currentTarget);
  }, []);

  const handleSaveMenuClose = useCallbackReact(() => {
    setSaveMenuAnchor(null);
  }, []);

  const handleSaveToServer = useCallbackReact(async () => {
    handleSaveMenuClose();
    await save();
  }, [save]);

  const handleDownloadFile = useCallbackReact(() => {
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
  const handleLoadMenuOpen = useCallbackReact((event: React.MouseEvent<HTMLElement>) => {
    setLoadMenuAnchor(event.currentTarget);
  }, []);

  const handleLoadMenuClose = useCallbackReact(() => {
    setLoadMenuAnchor(null);
  }, []);

  const handleLoadFromServerWorkspace = useCallbackReact(() => {
    setSelectedWorkspaceType('server');
    setShowServerFileExplorerDialog(true);
    handleLoadMenuClose();
  }, []);

  const handleLoadFromUserWorkspace = useCallbackReact(() => {
    setSelectedWorkspaceType('user');
    setShowUserHomeFolderDialog(true);
    handleLoadMenuClose();
  }, []);


  const handleLoadDialogClose = useCallbackReact(() => {
    setShowUserHomeFolderDialog(false);
  }, []);

  const handleServerFileExplorerClose = useCallbackReact(() => {
    setShowServerFileExplorerDialog(false);
  }, []);

  const handleServerFileSelection = useCallbackReact(async (selectedFiles: any[]) => {
    if (selectedFiles.length > 0) {
      const selectedFile = selectedFiles[0];

      // Check if it's a JSON file (workflow file)
      if (selectedFile.name.toLowerCase().endsWith('.json')) {
        try {
          console.log('Loading workflow from server file:', selectedFile);
          
          // Close the dialog
          setShowServerFileExplorerDialog(false);

          // TODO: Implement actual server file loading
          // This would typically involve:
          // 1. Fetch file content from the server using selectedFile.fullPath
          // 2. Parse the JSON content
          // 3. Load it using the updateDefinition() function

          console.info(`Loading workflow from server file: ${selectedFile.name}`, 'Server file loading will be implemented');

        } catch (error) {
          console.error('Failed to load workflow from server', error);
        }
      } else {
        console.warn('Invalid file type', 'Please select a JSON workflow file');
      }
    }
  }, [updateDefinition]);

  const handleFileSelection = useCallbackReact(async (selectedItems: any[], selectionMode: 'single' | 'multi') => {
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

  const handleFileUpload = useCallbackReact(async (files: File[], path: string) => {
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
  const handleContextMenu = useCallbackReact((event: React.MouseEvent, target: { type: 'step' | 'connection' | 'canvas'; id?: string; }) => {
    if (readonly) return;

    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      target
    });
  }, [readonly]);

  const handleContextMenuClose = useCallbackReact(() => {
    setContextMenu(null);
  }, []);

  const handleCopyStep = useCallbackReact(() => {
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

  const handleDeleteSelected = useCallbackReact(() => {
    selection.selectedSteps.forEach(stepId => removeStep(stepId));
    selection.selectedConnections.forEach(connId => removeConnection(connId));
    handleContextMenuClose();
  }, [selection, removeStep, removeConnection]);

  const handleDuplicateStep = useCallbackReact(() => {
    handleCopyStep(); // Same as copy for now
  }, [handleCopyStep]);

  const computeRootPath = useCallbackReact(() => {
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
        height: '100vh',
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

        {/* DEBUG: Test Step Creation */}
        {/* Performance Toggle */}
        <Tooltip title={`${useOptimizedRendering ? 'Disable' : 'Enable'} Performance Mode`}>
          <IconButton
            onClick={() => {
              setUseOptimizedRendering(!useOptimizedRendering);
            }}
            color={useOptimizedRendering ? "primary" : "default"}
          >
            <Speed />
          </IconButton>
        </Tooltip>
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
            backgroundColor: background.paper
          }}
        >
          {useOptimizedRendering ? (
            <OptimizedWorkflowCanvas
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
                    selectedSteps: new Set<string>(),
                    selectedConnections: new Set<string>(),
                    selectionBounds: undefined
                  });
                }
              }, [setSelection])}
              onViewportChange={setViewport}
              onStepCreate={handleStepCreation}
              onContextMenu={handleContextMenu}
            />
          ) : (
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
        allowedFileTypes={['.json', 'application/json']}
        title="Load Workflow from Server"
        readonly={true}
        il8n={undefined}
      />
    </Box>
  );
}
