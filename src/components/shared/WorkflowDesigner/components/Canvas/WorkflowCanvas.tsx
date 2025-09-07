import { useReactory } from "@reactory/client-core/api";
import { useRef, useEffect, useCallback } from 'react';
import {
  WorkflowCanvasProps,
  Point,
  CanvasViewport,
  WorkflowStepDefinition,
  WorkflowConnection
} from '../../types';
import { canvasToScreen, screenToCanvas } from '../../utils';
import { DEFAULT_CANVAS_THEME, CANVAS_DEFAULTS } from '../../constants';
import { useCanvasOperations } from '../../hooks/useCanvasOperations';
import GridBackground from './GridBackground';
import WorkflowStep from './WorkflowStep';
import Connection from './Connection';
import ConnectionPreview from './ConnectionPreview';
import { useConnectionCreation } from '../../hooks/useConnectionCreation';

export default function WorkflowCanvas(props: WorkflowCanvasProps) {
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
    onStepResize,
    onStepSelect,
    onStepDoubleClick,
    onConnectionCreate,
    onConnectionSelect,
    onCanvasClick,
    onViewportChange,
    onStepCreate,
    onContextMenu
  } = props;



  // Connection creation functionality
  const {
    connectionState,
    startConnection,
    updateConnectionPreview,
    endConnection,
    cancelConnection
  } = useConnectionCreation();

  // Handle canvas context menu
  const handleCanvasContextMenu = useCallback((event: React.MouseEvent) => {
    if (onContextMenu) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        const canvasPosition = {
          x: event.clientX - canvasRect.left,
          y: event.clientY - canvasRect.top
        };
        const worldPosition = screenToCanvas(canvasPosition, viewport);
        
        // Check if we're clicking on empty canvas
        onContextMenu(event, { type: 'canvas' });
      }
    }
  }, [onContextMenu, viewport]);

  const reactory = useReactory();
  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);

  // Get theme colors
  const {
    background,
    text,
  } = reactory.muiTheme.palette;

  const { useEffect: useEffectReact, useRef: useRefReact, useCallback: useCallbackReact } = React;

  const canvasRef = useRefReact<HTMLDivElement>(null);
  const svgRef = useRefReact<SVGSVGElement>(null);

  // Use the canvas operations hook for proper mouse handling
  const canvasOperations = useCanvasOperations({
    viewport,
    onViewportChange,
    onStepMove,
    onStepResize,
    onCanvasClick,
    onStepSelect,
    onStepDoubleClick,
    snapToGrid,
    gridSize: CANVAS_DEFAULTS.GRID_SIZE,
    steps: definition.steps
  });

  // Update canvas element reference for operations hook
  useEffectReact(() => {
    canvasOperations.setCanvasElement(canvasRef.current);
  }, [canvasRef.current, canvasOperations]);

  // Port interaction handlers
  const handlePortDragStart = useCallbackReact((stepId: string, portId: string, portType: 'input' | 'output', position: Point) => {
    const canvasPosition = screenToCanvas(position, viewport);
    startConnection(stepId, portId, portType, canvasPosition);
  }, [startConnection, viewport]);

  const handlePortDragEnd = useCallbackReact((stepId: string, portId: string, position: Point) => {
    if (connectionState.isCreating) {
      // Validate connection compatibility
      const sourceStep = definition.steps.find(s => s.id === connectionState.sourceStepId);
      const targetStep = definition.steps.find(s => s.id === stepId);
      
      if (sourceStep && targetStep) {
        const sourcePort = [...sourceStep.inputPorts, ...sourceStep.outputPorts].find(p => p.id === connectionState.sourcePortId);
        const targetPort = [...targetStep.inputPorts, ...targetStep.outputPorts].find(p => p.id === portId);
        
        // Only allow connections between different port types (output -> input or input -> output)
        if (sourcePort && targetPort && sourcePort.type !== targetPort.type) {
          const result = endConnection(stepId, portId);
          if (result && onConnectionCreate) {
            onConnectionCreate(result);
          }
        } else {
          cancelConnection();
        }
      } else {
        cancelConnection();
      }
    }
  }, [connectionState, endConnection, onConnectionCreate, definition.steps, cancelConnection]);

  // Mouse move handler for connection preview
  const handleConnectionMouseMove = useCallbackReact((event: MouseEvent) => {
    if (connectionState.isCreating) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const mousePosition: Point = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        };
        const canvasPosition = screenToCanvas(mousePosition, viewport);
        updateConnectionPreview(canvasPosition);
      }
    }
  }, [connectionState.isCreating, updateConnectionPreview, viewport]);

  // Keyboard handler for canceling connections
  const handleKeyDown = useCallbackReact((event: KeyboardEvent) => {
    if (connectionState.isCreating && event.key === 'Escape') {
      cancelConnection();
    }
  }, [connectionState.isCreating, cancelConnection]);

  // Event listeners for connection creation
  useEffectReact(() => {
    if (connectionState.isCreating) {
      window.addEventListener('mousemove', handleConnectionMouseMove);
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        window.removeEventListener('mousemove', handleConnectionMouseMove);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [connectionState.isCreating, handleConnectionMouseMove, handleKeyDown]);

  // Update viewport bounds when canvas resizes
  useEffectReact(() => {
    const updateBounds = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const newViewport = {
          ...viewport,
          bounds: {
            x: 0,
            y: 0,
            width: rect.width,
            height: rect.height
          }
        };
        
        // Only update if bounds actually changed
        if (viewport.bounds.width !== rect.width || viewport.bounds.height !== rect.height) {
          onViewportChange(newViewport);
        }
      }
    };

    // Update on mount and resize
    updateBounds();
    window.addEventListener('resize', updateBounds);
    
    return () => window.removeEventListener('resize', updateBounds);
  }, [onViewportChange, viewport]);

  // Handle mouse events
  const handleMouseDown = useCallbackReact((event: React.MouseEvent) => {
    canvasOperations.handleMouseDown(event.nativeEvent);
  }, [canvasOperations]);

  const handleMouseMove = useCallbackReact((event: React.MouseEvent) => {
    canvasOperations.handleMouseMove(event.nativeEvent);
  }, [canvasOperations]);

  const handleMouseUp = useCallbackReact((event: React.MouseEvent) => {
    canvasOperations.handleMouseUp(event.nativeEvent);
  }, [canvasOperations]);

  const handleDoubleClick = useCallbackReact((event: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const screenPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    const canvasPoint = screenToCanvas(screenPoint, viewport);
    
    const clickedStep = definition.steps.find(step => {
      const stepBounds = {
        x: step.position.x,
        y: step.position.y,
        width: step.size?.width || 200,
        height: step.size?.height || 100
      };
      
      return canvasPoint.x >= stepBounds.x &&
             canvasPoint.x <= stepBounds.x + stepBounds.width &&
             canvasPoint.y >= stepBounds.y &&
             canvasPoint.y <= stepBounds.y + stepBounds.height;
    });

    if (clickedStep) {
      onStepDoubleClick(clickedStep.id);
    }
  }, [definition.steps, viewport, onStepDoubleClick]);

  // Handle drag and drop
  const handleDragOver = useCallbackReact((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallbackReact((event: React.DragEvent) => {
    if (readonly) return;

    event.preventDefault();
    
    try {
      const dataString = event.dataTransfer.getData('application/json');
      console.log('🎯 Drop - received data string:', dataString);
      const data = JSON.parse(dataString);
      console.log('🎯 Drop - parsed data:', data);
      
      if (data.type === 'step' && data.stepDefinition && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const screenPoint = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        };

        const canvasPoint = screenToCanvas(screenPoint, viewport);
        
        // Create new step from definition
        const newStep = {
          id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: data.stepDefinition.name,
          type: data.stepDefinition.id,
          position: snapToGrid ? 
            { 
              x: Math.round(canvasPoint.x / 20) * 20, 
              y: Math.round(canvasPoint.y / 20) * 20 
            } : canvasPoint,
          size: { width: 200, height: 100 },
          properties: { ...data.stepDefinition.defaultProperties },
          inputPorts: data.stepDefinition.inputPorts.map(port => ({
            id: `port_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: port.name,
            type: port.type,
            dataType: port.dataType,
            required: port.required,
            position: { x: 0, y: 0 }
          })),
          outputPorts: data.stepDefinition.outputPorts.map(port => ({
            id: `port_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: port.name,
            type: port.type,
            dataType: port.dataType,
            required: port.required,
            position: { x: 0, y: 0 }
          }))
        };

        // Call step creation callback
        console.log('🎯 Drop - calling onStepCreate with:', data.stepDefinition, canvasPoint);
        onStepCreate(data.stepDefinition, canvasPoint);
      }
    } catch (error) {
      console.warn('Failed to handle drop:', error);
    }
  }, [readonly, viewport, snapToGrid, onStepCreate]);

  // Handle wheel zoom
  const handleWheel = useCallbackReact((event: React.WheelEvent) => {
    canvasOperations.handleWheel(event.nativeEvent);
  }, [canvasOperations]);

  const { Box } = Material.MaterialCore;

  // Get canvas theme (use custom theme or default)
  const canvasTheme = {
    ...DEFAULT_CANVAS_THEME,
    backgroundColor: background.paper,
    gridColor: text.disabled || '#e0e0e0'
  };

  return (
    <Box
      ref={canvasRef}
      data-workflow-canvas="true"
      sx={{
        position: 'absolute',
        inset: 0,
        backgroundColor: canvasTheme.backgroundColor,
        cursor: canvasOperations.isDragging ? 'grabbing' : 'grab',
        overflow: 'hidden'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onContextMenu={handleCanvasContextMenu}
    >
      {/* SVG for connections and grid */}
      <svg
        ref={svgRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        {/* Grid Background */}
        {showGrid && (
          <GridBackground
            viewport={viewport}
            gridSize={20}
            color={canvasTheme.gridColor}
          />
        )}

        {/* Connections */}
        <g style={{ pointerEvents: 'auto' }}>
          {definition.connections.map(connection => {
            const sourceStep = definition.steps.find(s => s.id === connection.sourceStepId);
            const targetStep = definition.steps.find(s => s.id === connection.targetStepId);
            
            if (!sourceStep || !targetStep) return null;

            // Calculate connection points
            const sourcePoint = {
              x: sourceStep.position.x + (sourceStep.size?.width || 200),
              y: sourceStep.position.y + (sourceStep.size?.height || 100) / 2
            };
            
            const targetPoint = {
              x: targetStep.position.x,
              y: targetStep.position.y + (targetStep.size?.height || 100) / 2
            };

            const isSelected = selection.selectedConnections.has(connection.id);
            const hasError = validationResult.errors.some(e => e.connectionId === connection.id);

            return (
              <Connection
                key={connection.id}
                id={connection.id}
                sourcePoint={sourcePoint}
                targetPoint={targetPoint}
                viewport={viewport}
                selected={isSelected}
                hasError={hasError}
                readonly={readonly}
                onSelect={(id) => onConnectionSelect(id, false)}
              />
            );
          })}

          {/* Connection Preview */}
          {connectionState.isCreating && connectionState.startPoint && connectionState.currentPoint && (
            <ConnectionPreview
              startPoint={connectionState.startPoint}
              currentPoint={connectionState.currentPoint}
              viewport={viewport}
              sourcePortType={connectionState.sourcePortType!}
            />
          )}
        </g>
      </svg>

      {/* Steps */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2
        }}
      >
        {definition.steps.map(step => {
          const stepDefinition = stepLibrary.find(s => s.id === step.type);
          const isSelected = selection.selectedSteps.has(step.id);
          const errors = validationResult.errors.filter(e => e.stepId === step.id);
          const warnings = validationResult.warnings.filter(e => e.stepId === step.id);

          // Transform step position to screen coordinates
          const screenPosition = canvasToScreen(step.position, viewport);
          const screenSize = {
            width: (step.size?.width || 200) * viewport.zoom,
            height: (step.size?.height || 100) * viewport.zoom
          };

          return (
            <WorkflowStep
              key={step.id}
              step={step}
              stepDefinition={stepDefinition}
              position={screenPosition}
              size={screenSize}
              selected={isSelected}
              errors={errors}
              warnings={warnings}
              readonly={readonly}
              viewport={viewport}
              isCreatingConnection={connectionState.isCreating}
              onMove={(newPosition) => {
                const canvasPosition = screenToCanvas(newPosition, viewport);
                onStepMove(step.id, canvasPosition);
              }}
              onResize={(newSize) => {
                const canvasSize = {
                  width: newSize.width / viewport.zoom,
                  height: newSize.height / viewport.zoom
                };
                onStepResize(step.id, canvasSize);
              }}
              onSelect={(multi) => onStepSelect(step.id, multi)}
              onDoubleClick={() => onStepDoubleClick(step.id)}
              onPortDragStart={handlePortDragStart}
              onPortDragEnd={handlePortDragEnd}
              onContextMenu={onContextMenu}
            />
          );
        })}
      </div>

      {/* Selection Rectangle */}
      {dragState.isDragging && dragState.dragType === 'selection' && dragState.startPosition && dragState.currentPosition && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(dragState.startPosition.x, dragState.currentPosition.x),
            top: Math.min(dragState.startPosition.y, dragState.currentPosition.y),
            width: Math.abs(dragState.currentPosition.x - dragState.startPosition.x),
            height: Math.abs(dragState.currentPosition.y - dragState.startPosition.y),
            border: `${Math.max(1, 2.5 / viewport.zoom)}px dashed ${canvasTheme.selectionColor || '#1976d2'}`,
            backgroundColor: `${canvasTheme.selectionColor || '#1976d2'}${Math.round((canvasTheme.selectionOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
            pointerEvents: 'none',
            zIndex: 10
          }}
        />
      )}
    </Box>
  );
}
