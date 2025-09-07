import { useReactory } from "@reactory/client-core/api";
import { useRef, useEffect, useCallback, memo } from 'react';
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
import { useViewportOptimization, useStepClustering } from '../../hooks/useViewportOptimization';
import GridBackground from './GridBackground';
import WorkflowStep from './WorkflowStep';
import Connection from './Connection';

// Memoized step component to prevent unnecessary re-renders
const MemoizedWorkflowStep = memo(WorkflowStep, (prevProps, nextProps) => {
  return (
    prevProps.step.id === nextProps.step.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.size.width === nextProps.size.width &&
    prevProps.size.height === nextProps.size.height &&
    prevProps.viewport.zoom === nextProps.viewport.zoom &&
    prevProps.errors.length === nextProps.errors.length &&
    prevProps.warnings.length === nextProps.warnings.length
  );
});

// Memoized connection component
const MemoizedConnection = memo(Connection, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.sourcePoint.x === nextProps.sourcePoint.x &&
    prevProps.sourcePoint.y === nextProps.sourcePoint.y &&
    prevProps.targetPoint.x === nextProps.targetPoint.x &&
    prevProps.targetPoint.y === nextProps.targetPoint.y &&
    prevProps.hasError === nextProps.hasError
  );
});

// Simplified step cluster component for low zoom levels
const StepCluster = memo(({ cluster, viewport, onClick }: {
  cluster: {
    id: string;
    position: Point;
    stepCount: number;
    bounds: any;
  };
  viewport: CanvasViewport;
  onClick: (clusterId: string) => void;
}) => {
  const reactory = useReactory();
  const {
    Material
  } = reactory.getComponents<{
    Material: Reactory.Client.Web.IMaterialModule
  }>(['material-ui.Material']);
  const { Box, Typography } = Material.MaterialCore;
  
  const screenPosition = canvasToScreen(cluster.position, viewport);
  const size = Math.max(20, Math.min(60, cluster.stepCount * 3));
  
  return (
    <Box
      onClick={() => onClick(cluster.id)}
      sx={{
        position: 'absolute',
        left: screenPosition.x - size / 2,
        top: screenPosition.y - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 1,
        '&:hover': {
          backgroundColor: 'primary.dark',
          transform: 'scale(1.1)'
        }
      }}
    >
      <Typography variant="caption" fontWeight="bold">
        {cluster.stepCount}
      </Typography>
    </Box>
  );
});

export default function OptimizedWorkflowCanvas(props: WorkflowCanvasProps) {
  const {
    definition,
    stepLibrary,
    viewport,
    selection,
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

  // Performance optimization hook
  const optimization = useViewportOptimization({
    steps: definition.steps,
    connections: definition.connections,
    viewport,
    enableOptimizations: true
  });

  // Step clustering for low zoom levels
  const { clusters, shouldCluster } = useStepClustering(
    definition.steps,
    viewport,
    0.2 // Cluster threshold zoom level
  );

  // Update canvas element reference for operations hook
  useEffectReact(() => {
    canvasOperations.setCanvasElement(canvasRef.current);
  }, [canvasRef.current, canvasOperations]);

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

  // Mouse event handlers
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
    canvasOperations.handleDoubleClick(event.nativeEvent);
  }, [canvasOperations]);

  // Drag and drop handlers
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

  // Handle cluster click to zoom in
  const handleClusterClick = useCallbackReact((clusterId: string) => {
    const cluster = clusters.find(c => c.id === clusterId);
    if (cluster) {
      // Zoom to cluster
      const padding = 50;
      const targetZoom = Math.min(
        viewport.bounds.width / (cluster.bounds.width + padding),
        viewport.bounds.height / (cluster.bounds.height + padding),
        1.0
      );
      
      onViewportChange({
        ...viewport,
        zoom: targetZoom,
        panX: viewport.bounds.width / 2 - (cluster.position.x * targetZoom),
        panY: viewport.bounds.height / 2 - (cluster.position.y * targetZoom)
      });
    }
  }, [clusters, viewport, onViewportChange]);

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

  const { Box } = Material.MaterialCore;

  // Get canvas theme (use custom theme or default)
  const canvasTheme = {
    ...DEFAULT_CANVAS_THEME,
    backgroundColor: background.paper,
    gridColor: text.disabled || '#e0e0e0'
  };

  // Performance logging (can be removed in production)
  useEffectReact(() => {
    if (optimization.optimizationLevel !== 'none') {
      console.log(`🚀 Performance: ${optimization.optimizationLevel} optimization active. Showing ${optimization.visibleStepCount}/${optimization.totalSteps} steps`);
    }
  }, [optimization.optimizationLevel, optimization.visibleStepCount, optimization.totalSteps]);

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
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onContextMenu={handleCanvasContextMenu}
      onWheel={handleWheel}
    >
      {/* SVG layer for connections and grid */}
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
        {/* Grid Background - skip if optimization suggests */}
        {showGrid && !optimization.shouldSkipGrid && (
          <GridBackground
            viewport={viewport}
            gridSize={20}
            color={canvasTheme.gridColor}
          />
        )}

        {/* Connections - only render visible ones */}
        <g style={{ pointerEvents: 'auto' }}>
          {optimization.visibleConnections.map(connection => {
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
              <MemoizedConnection
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

      {/* Steps layer */}
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
        {/* Render clusters instead of individual steps at low zoom */}
        {shouldCluster ? (
          clusters.map(cluster => (
            <StepCluster
              key={cluster.id}
              cluster={cluster}
              viewport={viewport}
              onClick={handleClusterClick}
            />
          ))
        ) : (
          /* Render individual steps - only visible ones */
          optimization.visibleSteps.map(step => {
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
              <MemoizedWorkflowStep
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
                onContextMenu={onContextMenu}
              />
            );
          })
        )}
      </div>

      {/* Performance info overlay (dev mode only) */}
      {process.env.NODE_ENV === 'development' && optimization.optimizationLevel !== 'none' && (
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: 1,
            fontSize: '12px',
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          {optimization.optimizationLevel} | {optimization.visibleStepCount}/{optimization.totalSteps} steps
        </Box>
      )}
    </Box>
  );
}
