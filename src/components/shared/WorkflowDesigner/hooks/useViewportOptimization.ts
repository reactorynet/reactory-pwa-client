import { useMemo } from 'react';
import { 
  WorkflowStepDefinition, 
  WorkflowConnection, 
  CanvasViewport, 
  Bounds,
  Point
} from '../types';
import { getStepBounds, boundsIntersect } from '../utils';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  LARGE_WORKFLOW: 50,      // Steps count for large workflow
  HUGE_WORKFLOW: 200,      // Steps count for huge workflow
  VIEWPORT_BUFFER: 100,    // Buffer pixels around visible area
  MIN_STEP_SIZE: 10,       // Minimum step size when zoomed out
  LOD_ZOOM_THRESHOLD: 0.3, // Zoom level for level-of-detail optimization
} as const;

interface UseViewportOptimizationOptions {
  steps: WorkflowStepDefinition[];
  connections: WorkflowConnection[];
  viewport: CanvasViewport;
  enableOptimizations?: boolean;
}

interface OptimizationResult {
  // Visibility optimization
  visibleSteps: WorkflowStepDefinition[];
  visibleConnections: WorkflowConnection[];
  
  // Level of detail optimization  
  shouldUseSimplifiedRendering: boolean;
  shouldSkipGrid: boolean;
  shouldUseCanvasRendering: boolean;
  
  // Performance metrics
  totalSteps: number;
  visibleStepCount: number;
  optimizationLevel: 'none' | 'viewport' | 'lod' | 'canvas';
}

export function useViewportOptimization({
  steps,
  connections,
  viewport,
  enableOptimizations = true
}: UseViewportOptimizationOptions): OptimizationResult {

  return useMemo(() => {
    const totalSteps = steps.length;
    
    // Determine optimization level based on workflow size
    const getOptimizationLevel = () => {
      if (!enableOptimizations) return 'none';
      if (totalSteps > PERFORMANCE_THRESHOLDS.HUGE_WORKFLOW) return 'canvas';
      if (totalSteps > PERFORMANCE_THRESHOLDS.LARGE_WORKFLOW) return 'lod';
      if (totalSteps > 20) return 'viewport';
      return 'none';
    };

    const optimizationLevel = getOptimizationLevel();
    
    // Calculate visible viewport bounds with buffer
    const getVisibleBounds = (): Bounds => {
      const buffer = PERFORMANCE_THRESHOLDS.VIEWPORT_BUFFER;
      return {
        x: (-viewport.panX - buffer) / viewport.zoom,
        y: (-viewport.panY - buffer) / viewport.zoom,
        width: (viewport.bounds.width + buffer * 2) / viewport.zoom,
        height: (viewport.bounds.height + buffer * 2) / viewport.zoom
      };
    };

    const visibleBounds = getVisibleBounds();

    // Filter visible steps
    const getVisibleSteps = (): WorkflowStepDefinition[] => {
      if (optimizationLevel === 'none') return steps;
      
      return steps.filter(step => {
        const stepBounds = getStepBounds(step);
        return boundsIntersect(stepBounds, visibleBounds);
      });
    };

    // Filter visible connections
    const getVisibleConnections = (): WorkflowConnection[] => {
      if (optimizationLevel === 'none') return connections;
      
      const visibleStepIds = new Set(visibleSteps.map(s => s.id));
      
      return connections.filter(connection => {
        // Only include connections where both endpoints are visible
        return visibleStepIds.has(connection.sourceStepId) && 
               visibleStepIds.has(connection.targetStepId);
      });
    };

    const visibleSteps = getVisibleSteps();
    const visibleConnections = getVisibleConnections();

    // Level of detail decisions
    const shouldUseSimplifiedRendering = 
      optimizationLevel === 'lod' || 
      optimizationLevel === 'canvas' ||
      viewport.zoom < PERFORMANCE_THRESHOLDS.LOD_ZOOM_THRESHOLD;

    const shouldSkipGrid = 
      optimizationLevel === 'canvas' || 
      (viewport.zoom < 0.2);

    const shouldUseCanvasRendering = optimizationLevel === 'canvas';

    return {
      visibleSteps,
      visibleConnections,
      shouldUseSimplifiedRendering,
      shouldSkipGrid,
      shouldUseCanvasRendering,
      totalSteps,
      visibleStepCount: visibleSteps.length,
      optimizationLevel
    };
  }, [steps, connections, viewport, enableOptimizations]);
}

// Hook for debouncing viewport changes during interactions
export function useViewportDebouncing(
  viewport: CanvasViewport,
  isDragging: boolean,
  delay: number = 16 // ~60fps
) {
  return useMemo(() => {
    // During dragging, use the current viewport for immediate feedback
    // When not dragging, we could add debouncing here if needed
    return viewport;
  }, [viewport, isDragging, delay]);
}

// Hook for step clustering at low zoom levels
export function useStepClustering(
  steps: WorkflowStepDefinition[],
  viewport: CanvasViewport,
  clusterThreshold: number = 0.2
) {
  return useMemo(() => {
    if (viewport.zoom > clusterThreshold) {
      return { clusters: [], shouldCluster: false };
    }

    // Group nearby steps into clusters for simplified rendering
    const clusters: Array<{
      id: string;
      position: Point;
      stepCount: number;
      bounds: Bounds;
      steps: WorkflowStepDefinition[];
    }> = [];

    // Simple clustering algorithm - could be optimized further
    const unclusteredSteps = [...steps];
    const clusterRadius = 100; // pixels

    while (unclusteredSteps.length > 0) {
      const seed = unclusteredSteps.shift()!;
      const cluster = {
        id: `cluster_${clusters.length}`,
        position: { ...seed.position },
        stepCount: 1,
        bounds: getStepBounds(seed),
        steps: [seed]
      };

      // Find nearby steps
      for (let i = unclusteredSteps.length - 1; i >= 0; i--) {
        const step = unclusteredSteps[i];
        const distance = Math.sqrt(
          Math.pow(step.position.x - seed.position.x, 2) +
          Math.pow(step.position.y - seed.position.y, 2)
        );

        if (distance < clusterRadius) {
          cluster.steps.push(step);
          cluster.stepCount++;
          unclusteredSteps.splice(i, 1);
          
          // Update cluster bounds
          const stepBounds = getStepBounds(step);
          cluster.bounds.x = Math.min(cluster.bounds.x, stepBounds.x);
          cluster.bounds.y = Math.min(cluster.bounds.y, stepBounds.y);
          cluster.bounds.width = Math.max(
            cluster.bounds.x + cluster.bounds.width,
            stepBounds.x + stepBounds.width
          ) - cluster.bounds.x;
          cluster.bounds.height = Math.max(
            cluster.bounds.y + cluster.bounds.height,
            stepBounds.y + stepBounds.height
          ) - cluster.bounds.y;

          // Update cluster center position
          cluster.position.x = cluster.bounds.x + cluster.bounds.width / 2;
          cluster.position.y = cluster.bounds.y + cluster.bounds.height / 2;
        }
      }

      clusters.push(cluster);
    }

    return { clusters, shouldCluster: true };
  }, [steps, viewport, clusterThreshold]);
}
