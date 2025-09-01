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
import { DEFAULT_CANVAS_THEME } from '../../constants';
import GridBackground from './GridBackground';
import WorkflowStep from './WorkflowStep';
import Connection from './Connection';

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
    onStepCreate
  } = props;

  const reactory = useReactory();
  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);

  const { useEffect: useEffectReact, useRef: useRefReact, useCallback: useCallbackReact } = React;

  const canvasRef = useRefReact<HTMLDivElement>(null);
  const svgRef = useRefReact<SVGSVGElement>(null);
  const isDraggedRef = useRefReact(false);

  // Handle mouse events
  const handleMouseDown = useCallbackReact((event: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const screenPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    const canvasPoint = screenToCanvas(screenPoint, viewport);
    
    // Check if we clicked on a step
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
      onStepSelect(clickedStep.id, event.ctrlKey || event.metaKey);
      isDraggedRef.current = false;
    } else {
      // Click on empty canvas
      onCanvasClick(canvasPoint, {
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey
      });
      isDraggedRef.current = false;
    }

    event.preventDefault();
  }, [definition.steps, viewport, onStepSelect, onCanvasClick]);

  const handleMouseMove = useCallbackReact((event: React.MouseEvent) => {
    if (!canvasRef.current) return;
    isDraggedRef.current = true;
  }, []);

  const handleMouseUp = useCallbackReact((event: React.MouseEvent) => {
    isDraggedRef.current = false;
  }, []);

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
      const data = JSON.parse(event.dataTransfer.getData('application/json'));
      
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
        onStepCreate(data.stepDefinition, canvasPoint);
      }
    } catch (error) {
      console.warn('Failed to handle drop:', error);
    }
  }, [readonly, viewport, snapToGrid, onStepCreate]);

  // Handle wheel zoom
  const handleWheel = useCallbackReact((event: React.WheelEvent) => {
    if (!canvasRef.current) return;

    event.preventDefault();

    const rect = canvasRef.current.getBoundingClientRect();
    const mousePoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    const canvasPoint = screenToCanvas(mousePoint, viewport);
    const zoomDelta = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3.0, viewport.zoom * zoomDelta));

    if (newZoom === viewport.zoom) return;

    // Calculate new pan to zoom towards mouse position
    const newScreenPoint = canvasToScreen(canvasPoint, { ...viewport, zoom: newZoom });
    const panDelta = {
      x: mousePoint.x - newScreenPoint.x,
      y: mousePoint.y - newScreenPoint.y
    };

    onViewportChange({
      ...viewport,
      zoom: newZoom,
      panX: viewport.panX + panDelta.x,
      panY: viewport.panY + panDelta.y
    });
  }, [viewport, onViewportChange]);

  const { Box } = Material.MaterialCore;

  // Get canvas theme (use custom theme or default)
  const canvasTheme = {
    ...DEFAULT_CANVAS_THEME,
    backgroundColor: '#fafafa',
    gridColor: '#e0e0e0'
  };

  return (
    <Box
      ref={canvasRef}
      sx={{
        position: 'absolute',
        inset: 0,
        backgroundColor: canvasTheme.backgroundColor,
        cursor: dragState.isDragging ? 'grabbing' : 'grab',
        overflow: 'hidden'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
            border: `2px dashed ${canvasTheme.selectionColor || '#1976d2'}`,
            backgroundColor: `${canvasTheme.selectionColor || '#1976d2'}${Math.round((canvasTheme.selectionOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
            pointerEvents: 'none',
            zIndex: 10
          }}
        />
      )}
    </Box>
  );
}
