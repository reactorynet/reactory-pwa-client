/**
 * WorkflowWebGLCanvas - React component wrapper for WebGL canvas
 * 
 * Provides the same interface as the DOM-based WorkflowCanvas but
 * uses WebGL for high-performance rendering.
 */

import { useReactory } from "@reactory/client-core/api";
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useWebGLCanvas } from './useWebGLCanvas';
import {
  WorkflowCanvasProps,
  Point,
  Bounds
} from '../../types';
import { WebGLInteractionEvent } from './types';
import { CANVAS_DEFAULTS } from '../../constants';

export interface WorkflowWebGLCanvasProps extends WorkflowCanvasProps {
  /** Theme colors override */
  themeColors?: {
    backgroundColor?: string;
    gridPrimaryColor?: string;
    gridSecondaryColor?: string;
  };
  /** Enable performance metrics display */
  showMetrics?: boolean;
}

/**
 * Convert hex color string to number
 */
function hexToNumber(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}

export default function WorkflowWebGLCanvas(props: Readonly<WorkflowWebGLCanvasProps>) {
  const {
    definition,
    stepLibrary,
    viewport,
    selection,
    dragState,
    validationResult,
    showGrid,
    snapToGrid,
    readonly,
    onStepMove,
    onStepResize: _onStepResize, // Not implemented in WebGL mode yet
    onStepSelect,
    onStepDoubleClick,
    onConnectionCreate,
    onConnectionSelect,
    onCanvasClick,
    onViewportChange,
    onStepCreate,
    onContextMenu,
    themeColors,
    showMetrics = false
  } = props;

  const reactory = useReactory();
  const {
    Material
  } = reactory.getComponents<{
    Material: Reactory.Client.Web.IMaterialModule
  }>(["material-ui.Material"]);

  const { Box, Typography } = Material.MaterialCore;

  // Get theme colors
  const { background } = reactory.muiTheme.palette;

  // Metrics state
  const [metrics, setMetrics] = useState<{ fps: number; steps: number } | null>(null);

  // Initialize WebGL canvas
  const {
    containerRef,
    initialize,
    updateWorkflow,
    updateViewport,
    updateSelection,
    updateValidation,
    setConnectionPreview,
    setEventHandlers,
    setGridVisible,
    setInteracting,
    getMetrics,
    screenToWorld,
    dispose,
    isInitialized
  } = useWebGLCanvas({
    showGrid,
    theme: {
      backgroundColor: themeColors?.backgroundColor 
        ? hexToNumber(themeColors.backgroundColor) 
        : hexToNumber(background.paper || '#fafafa'),
      gridPrimaryColor: themeColors?.gridPrimaryColor
        ? hexToNumber(themeColors.gridPrimaryColor)
        : 0xcccccc,
      gridSecondaryColor: themeColors?.gridSecondaryColor
        ? hexToNumber(themeColors.gridSecondaryColor)
        : 0xe8e8e8
    },
    enableMetrics: showMetrics
  });

  // Ref for connection creation state
  const connectionCreationRef = useRef<{
    isCreating: boolean;
    sourceStepId: string;
    sourcePortId: string;
    sourcePortType: 'input' | 'output';
    startPoint: Point;
  } | null>(null);

  // Ref for interaction debounce timer - hides labels during pan/drag
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCurrentlyInteractingRef = useRef(false);

  // Helper to mark interaction start - hides labels immediately
  const markInteractionStart = useCallback(() => {
    // Clear any pending "end interaction" timer
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
      interactionTimeoutRef.current = null;
    }
    
    // Only call setInteracting if not already interacting
    if (!isCurrentlyInteractingRef.current) {
      isCurrentlyInteractingRef.current = true;
      setInteracting(true);
    }
  }, [setInteracting]);

  // Helper to mark interaction end - shows labels after debounce
  const markInteractionEnd = useCallback(() => {
    // Clear any existing timer
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    
    // Set a small delay before showing labels to ensure positions are updated
    interactionTimeoutRef.current = setTimeout(() => {
      isCurrentlyInteractingRef.current = false;
      setInteracting(false);
      interactionTimeoutRef.current = null;
    }, 100);
  }, [setInteracting]);

  // Initialize on mount
  useEffect(() => {
    initialize();
    
    return () => {
      // Clean up interaction timeout
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
      dispose();
    };
  }, []);

  // Update workflow data when definition changes
  useEffect(() => {
    if (isInitialized) {
      updateWorkflow(definition.steps, definition.connections, stepLibrary);
    }
  }, [definition.steps, definition.connections, stepLibrary, isInitialized]);

  // Update viewport
  useEffect(() => {
    if (isInitialized) {
      updateViewport(viewport);
    }
  }, [viewport, isInitialized]);

  // Update selection
  useEffect(() => {
    if (isInitialized) {
      updateSelection(selection);
    }
  }, [selection, isInitialized]);

  // Update validation
  useEffect(() => {
    if (isInitialized) {
      updateValidation(validationResult);
    }
  }, [validationResult, isInitialized]);

  // Update grid visibility
  useEffect(() => {
    if (isInitialized) {
      setGridVisible(showGrid);
    }
  }, [showGrid, isInitialized]);

  // Update metrics periodically
  useEffect(() => {
    if (!showMetrics || !isInitialized) return;

    const interval = setInterval(() => {
      const currentMetrics = getMetrics();
      if (currentMetrics) {
        setMetrics({
          fps: currentMetrics.fps,
          steps: currentMetrics.visibleSteps || definition.steps.length
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [showMetrics, isInitialized, definition.steps.length]);

  // Handle step click
  const handleStepClick = useCallback((stepId: string, event: WebGLInteractionEvent) => {
    if (readonly) return;
    onStepSelect(stepId, event.modifiers.ctrl || event.modifiers.meta);
  }, [readonly, onStepSelect]);

  // Handle step double click
  const handleStepDoubleClick = useCallback((stepId: string, event: WebGLInteractionEvent) => {
    onStepDoubleClick(stepId);
  }, [onStepDoubleClick]);

  // Handle step drag
  const handleStepDragStart = useCallback((stepId: string, position: Point) => {
    if (readonly) return;
    markInteractionStart();
    onStepSelect(stepId, false);
  }, [readonly, onStepSelect, markInteractionStart]);

  const handleStepDrag = useCallback((stepId: string, position: Point, delta: Point) => {
    if (readonly) return;
    
    const step = definition.steps.find(s => s.id === stepId);
    if (step) {
      let newPosition = {
        x: step.position.x + delta.x,
        y: step.position.y + delta.y
      };

      // Snap to grid if enabled
      if (snapToGrid) {
        newPosition = {
          x: Math.round(newPosition.x / CANVAS_DEFAULTS.GRID_SIZE) * CANVAS_DEFAULTS.GRID_SIZE,
          y: Math.round(newPosition.y / CANVAS_DEFAULTS.GRID_SIZE) * CANVAS_DEFAULTS.GRID_SIZE
        };
      }

      onStepMove(stepId, newPosition);
    }
  }, [readonly, definition.steps, snapToGrid, onStepMove]);

  const handleStepDragEnd = useCallback((stepId: string, position: Point) => {
    markInteractionEnd();
  }, [markInteractionEnd]);

  // Handle connection click
  const handleConnectionClick = useCallback((connectionId: string, event: WebGLInteractionEvent) => {
    onConnectionSelect(connectionId, event.modifiers.ctrl || event.modifiers.meta);
  }, [onConnectionSelect]);

  // Handle port drag (connection creation)
  const handlePortDragStart = useCallback((
    stepId: string, 
    portId: string, 
    portType: 'input' | 'output', 
    position: Point
  ) => {
    if (readonly) return;

    connectionCreationRef.current = {
      isCreating: true,
      sourceStepId: stepId,
      sourcePortId: portId,
      sourcePortType: portType,
      startPoint: position
    };

    setConnectionPreview({
      startPoint: position,
      currentPoint: position,
      sourcePortType: portType
    });
  }, [readonly, setConnectionPreview]);

  const handlePortDrag = useCallback((position: Point) => {
    if (connectionCreationRef.current?.isCreating) {
      setConnectionPreview({
        startPoint: connectionCreationRef.current.startPoint,
        currentPoint: position,
        sourcePortType: connectionCreationRef.current.sourcePortType
      });
    }
  }, [setConnectionPreview]);

  const handlePortDragEnd = useCallback((
    targetStepId: string | null, 
    targetPortId: string | null, 
    position: Point
  ) => {
    if (connectionCreationRef.current?.isCreating && targetStepId && targetPortId) {
      // Create connection
      const { sourceStepId, sourcePortId, sourcePortType } = connectionCreationRef.current;

      // Determine source and target based on port types
      if (sourcePortType === 'output') {
        onConnectionCreate({
          sourceStepId,
          sourcePortId,
          targetStepId,
          targetPortId
        });
      } else {
        onConnectionCreate({
          sourceStepId: targetStepId,
          sourcePortId: targetPortId,
          targetStepId: sourceStepId,
          targetPortId: sourcePortId
        });
      }
    }

    connectionCreationRef.current = null;
    setConnectionPreview(null);
  }, [onConnectionCreate, setConnectionPreview]);

  // Handle canvas interactions
  const handleCanvasClick = useCallback((position: Point, event: WebGLInteractionEvent) => {
    onCanvasClick(position, {
      ctrl: event.modifiers.ctrl,
      shift: event.modifiers.shift,
      alt: event.modifiers.alt,
      meta: event.modifiers.meta
    });
  }, [onCanvasClick]);

  const handleCanvasDrag = useCallback((delta: Point) => {
    // Hide labels during pan to prevent visual glitches
    markInteractionStart();
    
    // Pan the viewport
    // Invert Y-axis because screen coordinates increase downward,
    // but we want dragging down to pan the view down (showing content above)
    const newViewport = {
      ...viewport,
      panX: viewport.panX + delta.x,
      panY: viewport.panY - delta.y
    };
    onViewportChange(newViewport);
    
    // Schedule showing labels after pan stops (debounced)
    markInteractionEnd();
  }, [viewport, onViewportChange, markInteractionStart, markInteractionEnd]);

  // Handle zoom
  const handleZoom = useCallback((zoomDelta: number, center: Point) => {
    // Hide labels during zoom to prevent visual glitches
    markInteractionStart();
    
    const newZoom = Math.max(0.1, Math.min(3, viewport.zoom * (1 + zoomDelta)));
    
    // Zoom toward mouse position
    const zoomRatio = newZoom / viewport.zoom;
    const newPanX = center.x - (center.x - viewport.panX) * zoomRatio;
    const newPanY = center.y - (center.y - viewport.panY) * zoomRatio;

    onViewportChange({
      ...viewport,
      zoom: newZoom,
      panX: newPanX,
      panY: newPanY
    });
    
    // Schedule showing labels after zoom stops (debounced)
    markInteractionEnd();
  }, [viewport, onViewportChange, markInteractionStart, markInteractionEnd]);

  // Handle context menu
  const handleStepContextMenu = useCallback((stepId: string, event: WebGLInteractionEvent) => {
    if (onContextMenu && event.originalEvent instanceof MouseEvent) {
      // Create a synthetic React mouse event from the native event
      const syntheticEvent = {
        ...event.originalEvent,
        nativeEvent: event.originalEvent,
        isDefaultPrevented: () => event.originalEvent.defaultPrevented,
        isPropagationStopped: () => false,
        persist: () => {}
      } as unknown as React.MouseEvent;
      onContextMenu(syntheticEvent, { type: 'step', id: stepId });
    }
  }, [onContextMenu]);

  const handleConnectionContextMenu = useCallback((connectionId: string, event: WebGLInteractionEvent) => {
    if (onContextMenu && event.originalEvent instanceof MouseEvent) {
      const syntheticEvent = {
        ...event.originalEvent,
        nativeEvent: event.originalEvent,
        isDefaultPrevented: () => event.originalEvent.defaultPrevented,
        isPropagationStopped: () => false,
        persist: () => {}
      } as unknown as React.MouseEvent;
      onContextMenu(syntheticEvent, { type: 'connection', id: connectionId });
    }
  }, [onContextMenu]);

  const handleCanvasContextMenu = useCallback((position: Point, event: WebGLInteractionEvent) => {
    if (onContextMenu && event.originalEvent instanceof MouseEvent) {
      const syntheticEvent = {
        ...event.originalEvent,
        nativeEvent: event.originalEvent,
        isDefaultPrevented: () => event.originalEvent.defaultPrevented,
        isPropagationStopped: () => false,
        persist: () => {}
      } as unknown as React.MouseEvent;
      onContextMenu(syntheticEvent, { type: 'canvas' });
    }
  }, [onContextMenu]);

  // Handle selection rectangle
  const handleSelectionChange = useCallback((bounds: Bounds | null) => {
    if (bounds) {
      // Find all steps within selection bounds
      const selectedSteps = definition.steps.filter(step => {
        const stepBounds = {
          x: step.position.x,
          y: step.position.y,
          width: step.size?.width || 200,
          height: step.size?.height || 100
        };

        return (
          stepBounds.x < bounds.x + bounds.width &&
          stepBounds.x + stepBounds.width > bounds.x &&
          stepBounds.y < bounds.y + bounds.height &&
          stepBounds.y + stepBounds.height > bounds.y
        );
      });

      // Update selection
      const newSelection = {
        selectedSteps: new Set(selectedSteps.map(s => s.id)),
        selectedConnections: new Set<string>()
      };

      // This would need to be connected to parent state
      console.log('Selection:', newSelection);
    }
  }, [definition.steps]);

  // Set up event handlers
  useEffect(() => {
    if (!isInitialized) return;

    setEventHandlers({
      onStepClick: handleStepClick,
      onStepDoubleClick: handleStepDoubleClick,
      onStepDragStart: handleStepDragStart,
      onStepDrag: handleStepDrag,
      onStepDragEnd: handleStepDragEnd,
      onStepContextMenu: handleStepContextMenu,
      
      onConnectionClick: handleConnectionClick,
      onConnectionContextMenu: handleConnectionContextMenu,
      
      onPortDragStart: handlePortDragStart,
      onPortDrag: handlePortDrag,
      onPortDragEnd: handlePortDragEnd,
      
      onCanvasClick: handleCanvasClick,
      onCanvasDrag: handleCanvasDrag,
      onCanvasContextMenu: handleCanvasContextMenu,
      
      onSelectionChange: handleSelectionChange,
      onZoom: handleZoom
    });
  }, [
    isInitialized,
    handleStepClick,
    handleStepDoubleClick,
    handleStepDragStart,
    handleStepDrag,
    handleStepDragEnd,
    handleStepContextMenu,
    handleConnectionClick,
    handleConnectionContextMenu,
    handlePortDragStart,
    handlePortDrag,
    handlePortDragEnd,
    handleCanvasClick,
    handleCanvasDrag,
    handleCanvasContextMenu,
    handleSelectionChange,
    handleZoom,
    setEventHandlers
  ]);

  // Handle drag and drop from step library
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    if (readonly) return;

    event.preventDefault();

    try {
      const dataString = event.dataTransfer.getData('application/json');
      const data = JSON.parse(dataString);

      if (data.type === 'step' && data.stepDefinition) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const screenPoint = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          };

          // Convert to world coordinates using the proper coordinate transformation
          const worldPoint = screenToWorld(screenPoint);

          // Snap to grid if enabled
          const position = snapToGrid
            ? {
                x: Math.round(worldPoint.x / CANVAS_DEFAULTS.GRID_SIZE) * CANVAS_DEFAULTS.GRID_SIZE,
                y: Math.round(worldPoint.y / CANVAS_DEFAULTS.GRID_SIZE) * CANVAS_DEFAULTS.GRID_SIZE
              }
            : worldPoint;

          onStepCreate(data.stepDefinition, position);
        }
      }
    } catch (error) {
      console.warn('Failed to handle drop:', error);
    }
  }, [readonly, snapToGrid, onStepCreate, screenToWorld]);

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden'
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* WebGL Canvas Container */}
      <Box
        ref={containerRef}
        data-workflow-canvas="true"
        sx={{
          position: 'absolute',
          inset: 0,
          '& canvas': {
            display: 'block',
            outline: 'none'
          }
        }}
      />

      {/* Performance Metrics Overlay */}
      {showMetrics && metrics && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: 1,
            fontSize: 12,
            fontFamily: 'monospace',
            zIndex: 100
          }}
        >
          <Typography variant="caption" sx={{ display: 'block' }}>
            FPS: {metrics.fps}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Steps: {metrics.steps}
          </Typography>
        </Box>
      )}

      {/* Selection Rectangle (rendered via HTML for simplicity) */}
      {dragState.isDragging && dragState.dragType === 'selection' && 
       dragState.startPosition && dragState.currentPosition && (
        <Box
          sx={{
            position: 'absolute',
            left: Math.min(dragState.startPosition.x, dragState.currentPosition.x),
            top: Math.min(dragState.startPosition.y, dragState.currentPosition.y),
            width: Math.abs(dragState.currentPosition.x - dragState.startPosition.x),
            height: Math.abs(dragState.currentPosition.y - dragState.startPosition.y),
            border: '2px dashed #1976d2',
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            pointerEvents: 'none',
            zIndex: 10
          }}
        />
      )}
    </Box>
  );
}
