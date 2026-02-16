/**
 * InteractionManager - Handle all user interactions on the WebGL canvas
 * 
 * Manages mouse/touch events, hit testing, dragging, selection,
 * and viewport manipulation (pan/zoom).
 */

import * as THREE from 'three';
import {
  IInteractionManager,
  InteractionConfig,
  WebGLCanvasEvents,
  WebGLInteractionEvent,
  WebGLRenderState,
  WebGLDragType,
  HitTestResult,
  HoveredPortInfo,
  DEFAULT_SCENE_CONFIG
} from './types';
import { Point, Bounds, WorkflowStepDefinition } from '../../types';

export class InteractionManager implements IInteractionManager {
  private canvas: HTMLCanvasElement | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private scene: THREE.Scene | null = null;
  private config: InteractionConfig;
  
  // Event handlers
  private eventHandlers: Partial<WebGLCanvasEvents> = {};
  
  // Current render state (for hit testing)
  private renderState: WebGLRenderState | null = null;
  
  // Interaction state
  private isDragging = false;
  private dragType: WebGLDragType = 'none';
  private dragStartPosition: Point = { x: 0, y: 0 };
  private dragStartWorldPosition: Point = { x: 0, y: 0 };
  private lastMousePosition: Point = { x: 0, y: 0 };
  private draggedStepId: string | null = null;
  private draggedStepInitialPosition: Point = { x: 0, y: 0 };
  
  // Selection rectangle
  private selectionStart: Point | null = null;
  private selectionCurrent: Point | null = null;
  
  // Double-click detection
  private lastClickTime = 0;
  private lastClickPosition: Point = { x: 0, y: 0 };
  
  // Touch handling
  private touchStartDistance = 0;
  private touchStartZoom = 1;
  
  // Bound event handlers (for cleanup)
  private boundHandlers: {
    mousedown?: (e: MouseEvent) => void;
    mousemove?: (e: MouseEvent) => void;
    mouseup?: (e: MouseEvent) => void;
    wheel?: (e: WheelEvent) => void;
    contextmenu?: (e: MouseEvent) => void;
    touchstart?: (e: TouchEvent) => void;
    touchmove?: (e: TouchEvent) => void;
    touchend?: (e: TouchEvent) => void;
  } = {};
  
  constructor(config: Partial<InteractionConfig> = {}) {
    this.config = { ...DEFAULT_SCENE_CONFIG.interaction, ...config };
  }
  
  /**
   * Initialize interaction handling
   */
  initialize(
    canvas: HTMLCanvasElement,
    camera: THREE.OrthographicCamera,
    scene: THREE.Scene,
    config?: Partial<InteractionConfig>
  ): void {
    this.canvas = canvas;
    this.camera = camera;
    this.scene = scene;
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.setupEventListeners();
  }
  
  /**
   * Set event handlers
   */
  setEventHandlers(handlers: Partial<WebGLCanvasEvents>): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }
  
  /**
   * Update render state for hit testing
   */
  updateRenderState(state: WebGLRenderState): void {
    this.renderState = state;
  }
  
  /**
   * Setup all event listeners
   */
  private setupEventListeners(): void {
    if (!this.canvas) return;
    
    // Mouse events
    this.boundHandlers.mousedown = this.handleMouseDown.bind(this);
    this.boundHandlers.mousemove = this.handleMouseMove.bind(this);
    this.boundHandlers.mouseup = this.handleMouseUp.bind(this);
    this.boundHandlers.wheel = this.handleWheel.bind(this);
    this.boundHandlers.contextmenu = this.handleContextMenu.bind(this);
    
    this.canvas.addEventListener('mousedown', this.boundHandlers.mousedown);
    this.canvas.addEventListener('mousemove', this.boundHandlers.mousemove);
    this.canvas.addEventListener('mouseup', this.boundHandlers.mouseup);
    this.canvas.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this.boundHandlers.contextmenu);
    
    // Touch events
    this.boundHandlers.touchstart = this.handleTouchStart.bind(this);
    this.boundHandlers.touchmove = this.handleTouchMove.bind(this);
    this.boundHandlers.touchend = this.handleTouchEnd.bind(this);
    
    this.canvas.addEventListener('touchstart', this.boundHandlers.touchstart, { passive: false });
    this.canvas.addEventListener('touchmove', this.boundHandlers.touchmove, { passive: false });
    this.canvas.addEventListener('touchend', this.boundHandlers.touchend);
    
    // Prevent default drag behavior
    this.canvas.style.touchAction = 'none';
  }
  
  /**
   * Handle mouse down
   */
  private handleMouseDown(event: MouseEvent): void {
    event.preventDefault();
    
    const screenPosition = this.getScreenPosition(event);
    const worldPosition = this.screenToWorld(screenPosition);
    const interactionEvent = this.createInteractionEvent(event, screenPosition, worldPosition);
    
    this.dragStartPosition = screenPosition;
    this.dragStartWorldPosition = worldPosition;
    this.lastMousePosition = screenPosition;
    
    // Check for double-click
    const now = Date.now();
    const isDoubleClick = 
      now - this.lastClickTime < this.config.doubleClickThreshold &&
      Math.abs(screenPosition.x - this.lastClickPosition.x) < 5 &&
      Math.abs(screenPosition.y - this.lastClickPosition.y) < 5;
    
    this.lastClickTime = now;
    this.lastClickPosition = screenPosition;
    
    // Perform hit test
    const hitResult = this.hitTest(screenPosition);
    
    if (event.button === 0) { // Left click
      if (hitResult.type === 'step' && hitResult.id) {
        if (isDoubleClick) {
          this.eventHandlers.onStepDoubleClick?.(hitResult.id, interactionEvent);
        } else {
          // Start step drag
          this.isDragging = true;
          this.dragType = 'step';
          this.draggedStepId = hitResult.id;
          
          // Get initial step position
          const step = this.renderState?.steps.find(s => s.id === hitResult.id);
          if (step) {
            this.draggedStepInitialPosition = { ...step.position };
          }
          
          this.eventHandlers.onStepClick?.(hitResult.id, interactionEvent);
          this.eventHandlers.onStepDragStart?.(hitResult.id, worldPosition);
        }
      } else if (hitResult.type === 'port' && hitResult.portInfo) {
        // Start connection drag
        this.isDragging = true;
        this.dragType = 'connection';
        
        this.eventHandlers.onPortDragStart?.(
          hitResult.portInfo.stepId,
          hitResult.portInfo.portId,
          hitResult.portInfo.portType,
          worldPosition
        );
      } else if (hitResult.type === 'connection' && hitResult.id) {
        this.eventHandlers.onConnectionClick?.(hitResult.id, interactionEvent);
      } else if (hitResult.type === 'canvas') {
        if (interactionEvent.modifiers.shift) {
          // Start selection rectangle
          this.isDragging = true;
          this.dragType = 'selection';
          this.selectionStart = worldPosition;
          this.selectionCurrent = worldPosition;
        } else {
          // Start pan
          this.isDragging = true;
          this.dragType = 'pan';
        }
        
        this.eventHandlers.onCanvasClick?.(worldPosition, interactionEvent);
      }
    } else if (event.button === 1) { // Middle click - always pan
      this.isDragging = true;
      this.dragType = 'pan';
    }
  }
  
  /**
   * Handle mouse move
   */
  private handleMouseMove(event: MouseEvent): void {
    const screenPosition = this.getScreenPosition(event);
    const worldPosition = this.screenToWorld(screenPosition);
    
    if (this.isDragging) {
      const delta: Point = {
        x: screenPosition.x - this.lastMousePosition.x,
        y: screenPosition.y - this.lastMousePosition.y
      };
      
      const worldDelta: Point = {
        x: worldPosition.x - this.screenToWorld(this.lastMousePosition).x,
        y: worldPosition.y - this.screenToWorld(this.lastMousePosition).y
      };
      
      switch (this.dragType) {
        case 'pan':
          this.eventHandlers.onCanvasDrag?.(delta);
          break;
          
        case 'step':
          if (this.draggedStepId) {
            this.eventHandlers.onStepDrag?.(this.draggedStepId, worldPosition, worldDelta);
          }
          break;
          
        case 'selection':
          this.selectionCurrent = worldPosition;
          if (this.selectionStart) {
            const bounds: Bounds = {
              x: Math.min(this.selectionStart.x, worldPosition.x),
              y: Math.min(this.selectionStart.y, worldPosition.y),
              width: Math.abs(worldPosition.x - this.selectionStart.x),
              height: Math.abs(worldPosition.y - this.selectionStart.y)
            };
            this.eventHandlers.onSelectionChange?.(bounds);
          }
          break;
          
        case 'connection':
          this.eventHandlers.onPortDrag?.(worldPosition);
          break;
      }
      
      this.lastMousePosition = screenPosition;
    } else {
      // Hover detection
      const hitResult = this.hitTest(screenPosition);
      
      if (hitResult.type === 'step' && hitResult.id) {
        this.eventHandlers.onStepHover?.(hitResult.id);
      } else if (hitResult.type === 'connection' && hitResult.id) {
        this.eventHandlers.onConnectionHover?.(hitResult.id);
        this.eventHandlers.onStepHover?.(null);
      } else if (hitResult.type === 'port' && hitResult.portInfo) {
        this.eventHandlers.onPortHover?.(hitResult.portInfo);
        this.eventHandlers.onStepHover?.(null);
      } else {
        this.eventHandlers.onStepHover?.(null);
        this.eventHandlers.onConnectionHover?.(null);
        this.eventHandlers.onPortHover?.(null);
      }
    }
    
    // Update cursor
    this.updateCursor(screenPosition);
  }
  
  /**
   * Handle mouse up
   */
  private handleMouseUp(event: MouseEvent): void {
    const screenPosition = this.getScreenPosition(event);
    const worldPosition = this.screenToWorld(screenPosition);
    
    if (this.isDragging) {
      switch (this.dragType) {
        case 'step':
          if (this.draggedStepId) {
            this.eventHandlers.onStepDragEnd?.(this.draggedStepId, worldPosition);
          }
          break;
          
        case 'selection':
          this.eventHandlers.onSelectionChange?.(null);
          this.selectionStart = null;
          this.selectionCurrent = null;
          break;
          
        case 'connection':
          // Check if we're over a compatible port
          const hitResult = this.hitTest(screenPosition);
          if (hitResult.type === 'port' && hitResult.portInfo) {
            this.eventHandlers.onPortDragEnd?.(
              hitResult.portInfo.stepId,
              hitResult.portInfo.portId,
              worldPosition
            );
          } else {
            this.eventHandlers.onPortDragEnd?.(null, null, worldPosition);
          }
          break;
      }
    }
    
    this.isDragging = false;
    this.dragType = 'none';
    this.draggedStepId = null;
  }
  
  /**
   * Handle mouse wheel (zoom)
   */
  private handleWheel(event: WheelEvent): void {
    event.preventDefault();
    
    const screenPosition = this.getScreenPosition(event);
    const worldPosition = this.screenToWorld(screenPosition);
    
    // Calculate zoom change
    const zoomDelta = -event.deltaY * 0.001;
    
    this.eventHandlers.onZoom?.(zoomDelta, worldPosition);
  }
  
  /**
   * Handle context menu
   */
  private handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    
    const screenPosition = this.getScreenPosition(event);
    const worldPosition = this.screenToWorld(screenPosition);
    const interactionEvent = this.createInteractionEvent(event, screenPosition, worldPosition);
    
    const hitResult = this.hitTest(screenPosition);
    
    if (hitResult.type === 'step' && hitResult.id) {
      this.eventHandlers.onStepContextMenu?.(hitResult.id, interactionEvent);
    } else if (hitResult.type === 'connection' && hitResult.id) {
      this.eventHandlers.onConnectionContextMenu?.(hitResult.id, interactionEvent);
    } else {
      this.eventHandlers.onCanvasContextMenu?.(worldPosition, interactionEvent);
    }
  }
  
  /**
   * Handle touch start
   */
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    
    if (event.touches.length === 1) {
      // Single touch - treat as mouse down
      const touch = event.touches[0];
      const mouseEvent = this.touchToMouseEvent(touch, 'mousedown');
      this.handleMouseDown(mouseEvent as MouseEvent);
    } else if (event.touches.length === 2) {
      // Two finger touch - prepare for pinch zoom
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      this.touchStartDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      this.touchStartZoom = this.renderState?.viewport.zoom || 1;
    }
  }
  
  /**
   * Handle touch move
   */
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const mouseEvent = this.touchToMouseEvent(touch, 'mousemove');
      this.handleMouseMove(mouseEvent as MouseEvent);
    } else if (event.touches.length === 2) {
      // Pinch zoom
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const scale = currentDistance / this.touchStartDistance;
      const newZoom = this.touchStartZoom * scale;
      
      // Calculate center point
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      const center = this.screenToWorld({ x: centerX, y: centerY });
      
      this.eventHandlers.onZoom?.(newZoom - (this.renderState?.viewport.zoom || 1), center);
    }
  }
  
  /**
   * Handle touch end
   */
  private handleTouchEnd(event: TouchEvent): void {
    if (event.touches.length === 0) {
      const touch = event.changedTouches[0];
      const mouseEvent = this.touchToMouseEvent(touch, 'mouseup');
      this.handleMouseUp(mouseEvent as MouseEvent);
    }
  }
  
  /**
   * Perform hit test at screen position
   */
  hitTest(screenPosition: Point): HitTestResult {
    if (!this.renderState) {
      return {
        type: 'canvas',
        worldPosition: this.screenToWorld(screenPosition),
        screenPosition,
        distance: Infinity
      };
    }
    
    const worldPosition = this.screenToWorld(screenPosition);
    
    // Check ports first (smallest targets, highest priority)
    // Use stepGeometry if available for accurate port positions
    const stepsForPortHitTest = this.renderState.stepGeometry || this.renderState.steps;
    
    for (const step of stepsForPortHitTest) {
      // Check input ports - use worldPosition from geometry data
      for (const port of step.inputPorts) {
        // Use the pre-calculated worldPosition from the port geometry
        const portWorldPos = (port as { worldPosition?: Point }).worldPosition || {
          x: step.position.x,
          y: step.position.y + (step.size?.height || 100) / 2
        };
        
        const dist = Math.hypot(
          worldPosition.x - portWorldPos.x,
          worldPosition.y - portWorldPos.y
        );
        
        if (dist < 15) { // Port hit radius
          return {
            type: 'port',
            portInfo: {
              stepId: step.id,
              portId: port.id,
              portType: 'input',
              position: portWorldPos
            },
            worldPosition,
            screenPosition,
            distance: dist
          };
        }
      }
      
      // Check output ports - use worldPosition from geometry data
      for (const port of step.outputPorts) {
        // Use the pre-calculated worldPosition from the port geometry
        const portWorldPos = (port as { worldPosition?: Point }).worldPosition || {
          x: step.position.x + (step.size?.width || 200),
          y: step.position.y + (step.size?.height || 100) / 2
        };
        
        const dist = Math.hypot(
          worldPosition.x - portWorldPos.x,
          worldPosition.y - portWorldPos.y
        );
        
        if (dist < 15) {
          return {
            type: 'port',
            portInfo: {
              stepId: step.id,
              portId: port.id,
              portType: 'output',
              position: portWorldPos
            },
            worldPosition,
            screenPosition,
            distance: dist
          };
        }
      }
    }
    
    // Check steps (reverse order to check top-most first)
    for (let i = this.renderState.steps.length - 1; i >= 0; i--) {
      const step = this.renderState.steps[i];
      const stepBounds = {
        x: step.position.x,
        y: step.position.y,
        width: step.size?.width || 200,
        height: step.size?.height || 100
      };
      
      if (
        worldPosition.x >= stepBounds.x &&
        worldPosition.x <= stepBounds.x + stepBounds.width &&
        worldPosition.y >= stepBounds.y &&
        worldPosition.y <= stepBounds.y + stepBounds.height
      ) {
        return {
          type: 'step',
          id: step.id,
          worldPosition,
          screenPosition,
          distance: 0
        };
      }
    }
    
    // Check connections
    for (const connection of this.renderState.connections) {
      const sourceStep = this.renderState.steps.find(s => s.id === connection.sourceStepId);
      const targetStep = this.renderState.steps.find(s => s.id === connection.targetStepId);
      
      if (sourceStep && targetStep) {
        const startPoint = {
          x: sourceStep.position.x + (sourceStep.size?.width || 200),
          y: sourceStep.position.y + (sourceStep.size?.height || 100) / 2
        };
        const endPoint = {
          x: targetStep.position.x,
          y: targetStep.position.y + (targetStep.size?.height || 100) / 2
        };
        
        // Simplified distance check (to bezier midpoint)
        const midX = (startPoint.x + endPoint.x) / 2;
        const midY = (startPoint.y + endPoint.y) / 2;
        
        const dist = Math.hypot(worldPosition.x - midX, worldPosition.y - midY);
        const connectionLength = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
        
        if (dist < connectionLength / 2 + 10) {
          // More precise check using point-to-curve distance
          const curveDistance = this.pointToBezierDistance(
            worldPosition,
            startPoint,
            endPoint
          );
          
          if (curveDistance < 10) {
            return {
              type: 'connection',
              id: connection.id,
              worldPosition,
              screenPosition,
              distance: curveDistance
            };
          }
        }
      }
    }
    
    // Canvas (nothing hit)
    return {
      type: 'canvas',
      worldPosition,
      screenPosition,
      distance: Infinity
    };
  }
  
  /**
   * Calculate approximate distance from point to bezier curve
   */
  private pointToBezierDistance(point: Point, start: Point, end: Point): number {
    // Simplified: use distance to line segment
    // For more accuracy, sample the bezier curve
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy;
    
    if (lengthSq === 0) {
      return Math.hypot(point.x - start.x, point.y - start.y);
    }
    
    const t = Math.max(0, Math.min(1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq
    ));
    
    const projX = start.x + t * dx;
    const projY = start.y + t * dy;
    
    return Math.hypot(point.x - projX, point.y - projY);
  }
  
  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenPosition: Point): Point {
    if (!this.camera || !this.canvas) {
      return screenPosition;
    }
    
    const rect = this.canvas.getBoundingClientRect();
    const x = screenPosition.x / rect.width * 2 - 1;
    const y = -(screenPosition.y / rect.height * 2 - 1);
    
    const vector = new THREE.Vector3(x, y, 0);
    vector.unproject(this.camera);
    
    return { x: vector.x, y: -vector.y };
  }
  
  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldPosition: Point): Point {
    if (!this.camera || !this.canvas) {
      return worldPosition;
    }
    
    const vector = new THREE.Vector3(worldPosition.x, -worldPosition.y, 0);
    vector.project(this.camera);
    
    const rect = this.canvas.getBoundingClientRect();
    
    return {
      x: (vector.x + 1) / 2 * rect.width,
      y: (-vector.y + 1) / 2 * rect.height
    };
  }
  
  /**
   * Get screen position from mouse event
   */
  private getScreenPosition(event: MouseEvent | Touch): Point {
    if (!this.canvas) return { x: 0, y: 0 };
    
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
  
  /**
   * Create interaction event object
   */
  private createInteractionEvent(
    event: MouseEvent | TouchEvent,
    screenPosition: Point,
    worldPosition: Point
  ): WebGLInteractionEvent {
    const mouseEvent = event as MouseEvent;
    
    return {
      originalEvent: event,
      screenPosition,
      worldPosition,
      modifiers: {
        ctrl: mouseEvent.ctrlKey || false,
        shift: mouseEvent.shiftKey || false,
        alt: mouseEvent.altKey || false,
        meta: mouseEvent.metaKey || false
      },
      button: mouseEvent.button || 0
    };
  }
  
  /**
   * Convert touch to mouse event (simplified)
   */
  private touchToMouseEvent(touch: Touch, type: string): Partial<MouseEvent> {
    return {
      clientX: touch.clientX,
      clientY: touch.clientY,
      button: 0,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      preventDefault: () => {},
      type
    };
  }
  
  /**
   * Update cursor based on current state and position
   */
  private updateCursor(screenPosition: Point): void {
    if (!this.canvas) return;
    
    if (this.isDragging) {
      switch (this.dragType) {
        case 'pan':
          this.canvas.style.cursor = 'grabbing';
          break;
        case 'step':
          this.canvas.style.cursor = 'move';
          break;
        case 'selection':
          this.canvas.style.cursor = 'crosshair';
          break;
        case 'connection':
          this.canvas.style.cursor = 'pointer';
          break;
        default:
          this.canvas.style.cursor = 'default';
      }
    } else {
      const hitResult = this.hitTest(screenPosition);
      
      switch (hitResult.type) {
        case 'step':
          this.canvas.style.cursor = 'move';
          break;
        case 'port':
          this.canvas.style.cursor = 'pointer';
          break;
        case 'connection':
          this.canvas.style.cursor = 'pointer';
          break;
        default:
          this.canvas.style.cursor = 'grab';
      }
    }
  }
  
  /**
   * Get current selection bounds (if selecting)
   */
  getSelectionBounds(): Bounds | null {
    if (!this.selectionStart || !this.selectionCurrent) {
      return null;
    }
    
    return {
      x: Math.min(this.selectionStart.x, this.selectionCurrent.x),
      y: Math.min(this.selectionStart.y, this.selectionCurrent.y),
      width: Math.abs(this.selectionCurrent.x - this.selectionStart.x),
      height: Math.abs(this.selectionCurrent.y - this.selectionStart.y)
    };
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.canvas) {
      // Remove all event listeners
      if (this.boundHandlers.mousedown) {
        this.canvas.removeEventListener('mousedown', this.boundHandlers.mousedown);
      }
      if (this.boundHandlers.mousemove) {
        this.canvas.removeEventListener('mousemove', this.boundHandlers.mousemove);
      }
      if (this.boundHandlers.mouseup) {
        this.canvas.removeEventListener('mouseup', this.boundHandlers.mouseup);
      }
      if (this.boundHandlers.wheel) {
        this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
      }
      if (this.boundHandlers.contextmenu) {
        this.canvas.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
      }
      if (this.boundHandlers.touchstart) {
        this.canvas.removeEventListener('touchstart', this.boundHandlers.touchstart);
      }
      if (this.boundHandlers.touchmove) {
        this.canvas.removeEventListener('touchmove', this.boundHandlers.touchmove);
      }
      if (this.boundHandlers.touchend) {
        this.canvas.removeEventListener('touchend', this.boundHandlers.touchend);
      }
    }
    
    this.canvas = null;
    this.camera = null;
    this.scene = null;
    this.renderState = null;
    this.eventHandlers = {};
    this.boundHandlers = {};
  }
}
