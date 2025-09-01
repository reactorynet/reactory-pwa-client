import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Point, 
  Size, 
  Bounds, 
  CanvasViewport, 
  DragState, 
  DragType, 
  InteractionModifiers,
  WorkflowStepDefinition
} from '../types';
import { 
  screenToCanvas, 
  canvasToScreen, 
  snapToGrid, 
  getStepBounds,
  pointInBounds 
} from '../utils';
import { CANVAS_DEFAULTS, STEP_DEFAULTS } from '../constants';

export interface UseCanvasOperationsReturn {
  isDragging: boolean;
  dragState: DragState;
  viewport: CanvasViewport;
  canvasElement: HTMLElement | null;
  setCanvasElement: (element: HTMLElement | null) => void;
  handleMouseDown: (event: MouseEvent, targetId?: string) => void;
  handleMouseMove: (event: MouseEvent) => void;
  handleMouseUp: (event: MouseEvent) => void;
  handleWheel: (event: WheelEvent) => void;
  handleDoubleClick: (event: MouseEvent, targetId?: string) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  zoomToSelection: (bounds: Bounds) => void;
  resetViewport: () => void;
  getMousePosition: (event: MouseEvent) => Point;
  getCanvasPosition: (event: MouseEvent) => Point;
  isPointInCanvas: (point: Point) => boolean;
}

interface UseCanvasOperationsOptions {
  viewport: CanvasViewport;
  onViewportChange: (viewport: CanvasViewport) => void;
  onStepMove: (stepId: string, position: Point) => void;
  onStepResize: (stepId: string, size: Size) => void;
  onCanvasClick: (position: Point, modifiers: InteractionModifiers) => void;
  onStepSelect: (stepId: string, multi: boolean) => void;
  onStepDoubleClick: (stepId: string) => void;
  snapToGrid: boolean;
  gridSize: number;
  steps: WorkflowStepDefinition[];
}

export function useCanvasOperations(options: UseCanvasOperationsOptions): UseCanvasOperationsReturn {
  const {
    viewport,
    onViewportChange,
    onStepMove,
    onStepResize,
    onCanvasClick,
    onStepSelect,
    onStepDoubleClick,
    snapToGrid: shouldSnapToGrid,
    gridSize,
    steps
  } = options;

  const [canvasElement, setCanvasElement] = useState<HTMLElement | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragType: DragType.NONE
  });

  const dragStartRef = useRef<Point>({ x: 0, y: 0 });
  const lastMousePosRef = useRef<Point>({ x: 0, y: 0 });
  const draggedStepRef = useRef<string | null>(null);
  const initialStepPositionRef = useRef<Point>({ x: 0, y: 0 });

  const isDragging = dragState.isDragging;

  // Get mouse position relative to canvas element
  const getMousePosition = useCallback((event: MouseEvent): Point => {
    if (!canvasElement) return { x: 0, y: 0 };
    
    const rect = canvasElement.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }, [canvasElement]);

  // Get canvas position (accounting for zoom and pan)
  const getCanvasPosition = useCallback((event: MouseEvent): Point => {
    const mousePos = getMousePosition(event);
    return screenToCanvas(mousePos, viewport);
  }, [getMousePosition, viewport]);

  // Check if point is within canvas bounds
  const isPointInCanvas = useCallback((point: Point): boolean => {
    if (!canvasElement) return false;
    
    const rect = canvasElement.getBoundingClientRect();
    return point.x >= 0 && point.x <= rect.width && point.y >= 0 && point.y <= rect.height;
  }, [canvasElement]);

  // Find step at given position
  const findStepAtPosition = useCallback((position: Point): string | null => {
    for (const step of steps) {
      const bounds = getStepBounds(step);
      if (pointInBounds(position, bounds)) {
        return step.id;
      }
    }
    return null;
  }, [steps]);

  // Handle mouse down events
  const handleMouseDown = useCallback((event: MouseEvent, targetId?: string) => {
    if (!canvasElement) return;

    const mousePos = getMousePosition(event);
    const canvasPos = getCanvasPosition(event);
    
    dragStartRef.current = mousePos;
    lastMousePosRef.current = mousePos;

    // Determine what we're dragging
    let dragType = DragType.PAN;
    
    if (targetId) {
      // Dragging a specific step
      dragType = DragType.STEP;
      draggedStepRef.current = targetId;
      
      // Store initial step position
      const step = steps.find(s => s.id === targetId);
      if (step) {
        initialStepPositionRef.current = { ...step.position };
      }
    } else {
      // Check if we're clicking on a step
      const stepId = findStepAtPosition(canvasPos);
      if (stepId) {
        dragType = DragType.STEP;
        draggedStepRef.current = stepId;
        
        const step = steps.find(s => s.id === stepId);
        if (step) {
          initialStepPositionRef.current = { ...step.position };
        }
      }
    }

    setDragState({
      isDragging: true,
      dragType,
      startPosition: mousePos,
      currentPosition: mousePos
    });

    // Prevent default to avoid text selection
    event.preventDefault();
  }, [canvasElement, getMousePosition, getCanvasPosition, findStepAtPosition, steps]);

  // Handle mouse move events
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!canvasElement || !isDragging) return;

    const mousePos = getMousePosition(event);
    const deltaX = mousePos.x - lastMousePosRef.current.x;
    const deltaY = mousePos.y - lastMousePosRef.current.y;

    lastMousePosRef.current = mousePos;

    setDragState(prev => ({
      ...prev,
      currentPosition: mousePos
    }));

    switch (dragState.dragType) {
      case DragType.PAN:
        // Pan the viewport
        onViewportChange({
          ...viewport,
          panX: viewport.panX + deltaX,
          panY: viewport.panY + deltaY
        });
        break;

      case DragType.STEP:
        // Move the step
        if (draggedStepRef.current) {
          const canvasDelta = {
            x: deltaX / viewport.zoom,
            y: deltaY / viewport.zoom
          };
          
          const step = steps.find(s => s.id === draggedStepRef.current);
          if (step) {
            let newPosition = {
              x: step.position.x + canvasDelta.x,
              y: step.position.y + canvasDelta.y
            };

            // Apply grid snapping if enabled
            if (shouldSnapToGrid) {
              newPosition = snapToGrid(newPosition, gridSize);
            }

            onStepMove(draggedStepRef.current, newPosition);
          }
        }
        break;
    }
  }, [
    canvasElement, 
    isDragging, 
    getMousePosition, 
    dragState.dragType, 
    viewport, 
    onViewportChange, 
    steps, 
    onStepMove, 
    shouldSnapToGrid, 
    gridSize
  ]);

  // Handle mouse up events
  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (!isDragging) return;

    const mousePos = getMousePosition(event);
    const canvasPos = getCanvasPosition(event);
    
    // Check if this was a click (minimal movement)
    const wasClick = Math.abs(mousePos.x - dragStartRef.current.x) < 5 && 
                     Math.abs(mousePos.y - dragStartRef.current.y) < 5;

    if (wasClick) {
      const modifiers: InteractionModifiers = {
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey
      };

      if (draggedStepRef.current) {
        // Click on step
        onStepSelect(draggedStepRef.current, modifiers.ctrl || modifiers.meta);
      } else {
        // Click on canvas
        onCanvasClick(canvasPos, modifiers);
      }
    }

    // Reset drag state
    setDragState({
      isDragging: false,
      dragType: DragType.NONE
    });
    
    draggedStepRef.current = null;
  }, [
    isDragging, 
    getMousePosition, 
    getCanvasPosition, 
    onStepSelect, 
    onCanvasClick
  ]);

  // Handle wheel events for zooming
  const handleWheel = useCallback((event: WheelEvent) => {
    if (!canvasElement) return;

    event.preventDefault();

    const mousePos = getMousePosition(event);
    const canvasPos = screenToCanvas(mousePos, viewport);

    // Calculate zoom change
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(
      CANVAS_DEFAULTS.ZOOM_MIN,
      Math.min(CANVAS_DEFAULTS.ZOOM_MAX, viewport.zoom * zoomFactor)
    );

    if (newZoom === viewport.zoom) return;

    // Zoom towards mouse position
    const newScreenPos = canvasToScreen(canvasPos, { ...viewport, zoom: newZoom });
    
    onViewportChange({
      ...viewport,
      zoom: newZoom,
      panX: viewport.panX + (mousePos.x - newScreenPos.x),
      panY: viewport.panY + (mousePos.y - newScreenPos.y)
    });
  }, [canvasElement, getMousePosition, viewport, onViewportChange]);

  // Handle double click events
  const handleDoubleClick = useCallback((event: MouseEvent, targetId?: string) => {
    const canvasPos = getCanvasPosition(event);
    
    if (targetId) {
      onStepDoubleClick(targetId);
    } else {
      const stepId = findStepAtPosition(canvasPos);
      if (stepId) {
        onStepDoubleClick(stepId);
      }
    }
  }, [getCanvasPosition, findStepAtPosition, onStepDoubleClick]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(CANVAS_DEFAULTS.ZOOM_MAX, viewport.zoom * 1.2);
    onViewportChange({ ...viewport, zoom: newZoom });
  }, [viewport, onViewportChange]);

  const zoomOut = useCallback(() => {
    const newZoom = Math.max(CANVAS_DEFAULTS.ZOOM_MIN, viewport.zoom / 1.2);
    onViewportChange({ ...viewport, zoom: newZoom });
  }, [viewport, onViewportChange]);

  const zoomToFit = useCallback(() => {
    if (!canvasElement || steps.length === 0) return;

    const rect = canvasElement.getBoundingClientRect();
    const viewportBounds = { x: 0, y: 0, width: rect.width, height: rect.height };

    // Calculate content bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    steps.forEach(step => {
      const bounds = getStepBounds(step);
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    if (minX === Infinity) return;

    const contentBounds = {
      x: minX - 50,
      y: minY - 50,
      width: maxX - minX + 100,
      height: maxY - minY + 100
    };

    // Calculate zoom to fit
    const scaleX = viewportBounds.width / contentBounds.width;
    const scaleY = viewportBounds.height / contentBounds.height;
    const newZoom = Math.min(scaleX, scaleY, 1.0);

    // Calculate pan to center
    const newPanX = viewportBounds.width / 2 - (contentBounds.x + contentBounds.width / 2) * newZoom;
    const newPanY = viewportBounds.height / 2 - (contentBounds.y + contentBounds.height / 2) * newZoom;

    onViewportChange({
      ...viewport,
      zoom: newZoom,
      panX: newPanX,
      panY: newPanY
    });
  }, [canvasElement, steps, viewport, onViewportChange]);

  const zoomToSelection = useCallback((bounds: Bounds) => {
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    const viewportBounds = { x: 0, y: 0, width: rect.width, height: rect.height };

    const contentBounds = {
      x: bounds.x - 50,
      y: bounds.y - 50,
      width: bounds.width + 100,
      height: bounds.height + 100
    };

    const scaleX = viewportBounds.width / contentBounds.width;
    const scaleY = viewportBounds.height / contentBounds.height;
    const newZoom = Math.min(scaleX, scaleY, 1.0);

    const newPanX = viewportBounds.width / 2 - (contentBounds.x + contentBounds.width / 2) * newZoom;
    const newPanY = viewportBounds.height / 2 - (contentBounds.y + contentBounds.height / 2) * newZoom;

    onViewportChange({
      ...viewport,
      zoom: newZoom,
      panX: newPanX,
      panY: newPanY
    });
  }, [canvasElement, viewport, onViewportChange]);

  const resetViewport = useCallback(() => {
    onViewportChange({
      ...viewport,
      zoom: CANVAS_DEFAULTS.ZOOM_DEFAULT,
      panX: 0,
      panY: 0
    });
  }, [viewport, onViewportChange]);

  return {
    isDragging,
    dragState,
    viewport,
    canvasElement,
    setCanvasElement,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleDoubleClick,
    zoomIn,
    zoomOut,
    zoomToFit,
    zoomToSelection,
    resetViewport,
    getMousePosition,
    getCanvasPosition,
    isPointInCanvas
  };
}
