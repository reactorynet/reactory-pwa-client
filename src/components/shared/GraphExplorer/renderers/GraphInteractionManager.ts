/**
 * GraphInteractionManager — pointer/touch state machine for the graph canvas.
 *
 * Adapted from the WorkflowDesigner InteractionManager: same pan/zoom/marquee
 * /drag/pinch behaviour, ports removed, and hit testing swapped from the
 * O(n)-per-move analytic scan to the shared SpatialHash (nodes) plus a
 * point-to-segment test over only viewport-visible edges.
 */

import { SpatialHash } from '../utils/spatialHash';
import {
  Bounds,
  CanvasViewport,
  GraphHitTestResult,
  GraphInteractionEvent,
  Point,
} from '../types';
import { EdgeGeometryData, GraphCanvasEvents } from './types';

type DragType = 'none' | 'pan' | 'node' | 'marquee';

export interface InteractionConfig {
  minZoom: number;
  maxZoom: number;
  zoomSpeed: number;
  dragThreshold: number;
  doubleClickThreshold: number;
  edgeHitTolerance: number;
}

const DEFAULT_CONFIG: InteractionConfig = {
  minZoom: 0.05,
  maxZoom: 4,
  zoomSpeed: 0.001,
  dragThreshold: 5,
  doubleClickThreshold: 300,
  edgeHitTolerance: 6,
};

const distanceToSegment = (p: Point, a: Point, b: Point): number => {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
};

export class GraphInteractionManager {
  private canvas: HTMLCanvasElement | null = null;
  private config: InteractionConfig = { ...DEFAULT_CONFIG };
  private handlers: Partial<GraphCanvasEvents> = {};

  // Injected state (updated by the canvas hook every sync).
  private spatialHash: SpatialHash | null = null;
  private visibleEdges: EdgeGeometryData[] = [];
  private viewport: CanvasViewport = { zoom: 1, panX: 0, panY: 0, bounds: { x: 0, y: 0, width: 800, height: 600 } };

  // Drag state
  private dragType: DragType = 'none';
  private dragNodeId: number | null = null;
  private pointerDownScreen: Point | null = null;
  private pointerDownWorld: Point | null = null;
  private dragStartPan: Point = { x: 0, y: 0 };
  private dragging = false;
  private marqueeStart: Point | null = null;
  private lastClickTime = 0;
  private lastClickNodeId: number | null = null;
  private hoveredNodeId: number | null = null;

  // Touch state
  private touchStartDistance = 0;
  private touchStartZoom = 1;

  // Bound listeners (so dispose can remove them)
  private onMouseDown = (e: MouseEvent) => this.handleMouseDown(e);
  private onMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
  private onMouseUp = (e: MouseEvent) => this.handleMouseUp(e);
  private onWheel = (e: WheelEvent) => this.handleWheel(e);
  private onContextMenu = (e: MouseEvent) => this.handleContextMenu(e);
  private onTouchStart = (e: TouchEvent) => this.handleTouchStart(e);
  private onTouchMove = (e: TouchEvent) => this.handleTouchMove(e);
  private onTouchEnd = () => this.handleTouchEnd();

  initialize(canvas: HTMLCanvasElement, config?: Partial<InteractionConfig>): void {
    this.canvas = canvas;
    this.config = { ...DEFAULT_CONFIG, ...config };
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.onContextMenu);
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd);
    // Window-level so drags survive leaving the canvas.
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  setEventHandlers(handlers: Partial<GraphCanvasEvents>): void {
    this.handlers = handlers;
  }

  updateState(spatialHash: SpatialHash, visibleEdges: EdgeGeometryData[], viewport: CanvasViewport): void {
    this.spatialHash = spatialHash;
    this.visibleEdges = visibleEdges;
    this.viewport = viewport;
  }

  // -- Coordinate helpers ----------------------------------------------------

  private screenFromEvent(e: MouseEvent | Touch): Point {
    const rect = this.canvas!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  screenToWorld(screen: Point): Point {
    const { zoom, panX, panY } = this.viewport;
    return { x: (screen.x - panX) / zoom, y: (screen.y - panY) / zoom };
  }

  worldToScreen(world: Point): Point {
    const { zoom, panX, panY } = this.viewport;
    return { x: world.x * zoom + panX, y: world.y * zoom + panY };
  }

  private interactionEvent(e: MouseEvent | WheelEvent | TouchEvent, screen: Point): GraphInteractionEvent {
    return {
      originalEvent: e,
      screenPosition: screen,
      worldPosition: this.screenToWorld(screen),
      modifiers: {
        ctrl: (e as MouseEvent).ctrlKey ?? false,
        shift: (e as MouseEvent).shiftKey ?? false,
        alt: (e as MouseEvent).altKey ?? false,
        meta: (e as MouseEvent).metaKey ?? false,
      },
      button: (e as MouseEvent).button ?? 0,
    };
  }

  // -- Hit testing -------------------------------------------------------------

  hitTest(screen: Point): GraphHitTestResult {
    const world = this.screenToWorld(screen);
    const tolerance = this.config.edgeHitTolerance / this.viewport.zoom;

    const nodeId = this.spatialHash?.hitTest(world, tolerance / 2) ?? null;
    if (nodeId !== null) {
      return { type: 'node', nodeId, worldPosition: world, screenPosition: screen };
    }

    let bestEdge: string | null = null;
    let bestDistance = tolerance;
    for (const edge of this.visibleEdges) {
      const d = distanceToSegment(world, edge.source, edge.target);
      if (d < bestDistance) {
        bestDistance = d;
        bestEdge = edge.id;
      }
    }
    if (bestEdge !== null) {
      return { type: 'edge', edgeId: bestEdge, worldPosition: world, screenPosition: screen };
    }
    return { type: 'canvas', worldPosition: world, screenPosition: screen };
  }

  // -- Mouse -------------------------------------------------------------------

  private handleMouseDown(e: MouseEvent): void {
    if (!this.canvas || e.button === 2) return;
    const screen = this.screenFromEvent(e);
    this.pointerDownScreen = screen;
    this.pointerDownWorld = this.screenToWorld(screen);
    this.dragging = false;

    const hit = this.hitTest(screen);
    if (hit.type === 'node') {
      this.dragType = 'node';
      this.dragNodeId = hit.nodeId!;
    } else if (e.shiftKey) {
      this.dragType = 'marquee';
      this.marqueeStart = this.pointerDownWorld;
    } else {
      this.dragType = 'pan';
      this.dragStartPan = { x: this.viewport.panX, y: this.viewport.panY };
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.canvas) return;
    const screen = this.screenFromEvent(e);

    if (this.dragType === 'none') {
      // Hover tracking only (ignore moves outside the canvas).
      const rect = this.canvas.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) {
        if (this.hoveredNodeId !== null) {
          this.hoveredNodeId = null;
          this.handlers.onNodeHover?.(null);
        }
        return;
      }
      this.handlers.onCanvasPointerMove?.(this.screenToWorld(screen));
      const hit = this.hitTest(screen);
      const nodeId = hit.type === 'node' ? hit.nodeId! : null;
      if (nodeId !== this.hoveredNodeId) {
        this.hoveredNodeId = nodeId;
        this.handlers.onNodeHover?.(nodeId);
        this.canvas.style.cursor = nodeId !== null ? 'pointer' : 'default';
      }
      return;
    }

    if (!this.pointerDownScreen) return;
    const dx = screen.x - this.pointerDownScreen.x;
    const dy = screen.y - this.pointerDownScreen.y;
    if (!this.dragging && Math.hypot(dx, dy) < this.config.dragThreshold) return;

    if (!this.dragging) {
      this.dragging = true;
      if (this.dragType === 'node' && this.dragNodeId !== null) {
        this.handlers.onNodeDrag?.(this.dragNodeId, this.screenToWorld(screen), 'start');
      }
    }

    switch (this.dragType) {
      case 'pan': {
        this.viewport = {
          ...this.viewport,
          panX: this.dragStartPan.x + dx,
          panY: this.dragStartPan.y + dy,
        };
        this.handlers.onViewportChange?.(this.viewport);
        break;
      }
      case 'node': {
        if (this.dragNodeId !== null) {
          this.handlers.onNodeDrag?.(this.dragNodeId, this.screenToWorld(screen), 'move');
        }
        break;
      }
      case 'marquee': {
        // Emit the live rectangle (screen space) so the shell can draw it;
        // final selection is emitted on mouseup.
        const start = this.pointerDownScreen;
        this.handlers.onMarqueeUpdate?.({
          x: Math.min(start.x, screen.x),
          y: Math.min(start.y, screen.y),
          width: Math.abs(screen.x - start.x),
          height: Math.abs(screen.y - start.y),
        });
        break;
      }
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (!this.canvas || this.dragType === 'none') return;
    const screen = this.screenFromEvent(e);
    const event = this.interactionEvent(e, screen);

    if (this.dragging) {
      if (this.dragType === 'node' && this.dragNodeId !== null) {
        this.handlers.onNodeDrag?.(this.dragNodeId, this.screenToWorld(screen), 'end');
      } else if (this.dragType === 'marquee' && this.marqueeStart) {
        const current = this.screenToWorld(screen);
        const bounds: Bounds = {
          x: Math.min(this.marqueeStart.x, current.x),
          y: Math.min(this.marqueeStart.y, current.y),
          width: Math.abs(current.x - this.marqueeStart.x),
          height: Math.abs(current.y - this.marqueeStart.y),
        };
        this.handlers.onMarqueeSelect?.(bounds, event);
        this.handlers.onMarqueeUpdate?.(null);
      }
    } else {
      // Click (no drag): node / edge / canvas, with double-click detection.
      const hit = this.hitTest(screen);
      const now = performance.now();
      if (hit.type === 'node') {
        const isDouble =
          now - this.lastClickTime < this.config.doubleClickThreshold &&
          this.lastClickNodeId === hit.nodeId;
        if (isDouble) {
          this.handlers.onNodeDoubleClick?.(hit.nodeId!, event);
          this.lastClickTime = 0;
          this.lastClickNodeId = null;
        } else {
          this.handlers.onNodeClick?.(hit.nodeId!, event);
          this.lastClickTime = now;
          this.lastClickNodeId = hit.nodeId!;
        }
      } else if (hit.type === 'edge') {
        this.handlers.onEdgeClick?.(hit.edgeId!, event);
        this.lastClickNodeId = null;
      } else {
        this.handlers.onCanvasClick?.(event.worldPosition, event);
        this.lastClickNodeId = null;
      }
    }

    this.dragType = 'none';
    this.dragNodeId = null;
    this.dragging = false;
    this.marqueeStart = null;
    this.pointerDownScreen = null;
    this.pointerDownWorld = null;
  }

  private handleWheel(e: WheelEvent): void {
    if (!this.canvas) return;
    e.preventDefault();
    const screen = this.screenFromEvent(e);
    const { zoom, panX, panY } = this.viewport;
    const factor = Math.exp(-e.deltaY * this.config.zoomSpeed);
    const nextZoom = Math.min(this.config.maxZoom, Math.max(this.config.minZoom, zoom * factor));
    if (nextZoom === zoom) return;
    // Keep the world point under the cursor fixed while zooming.
    const worldX = (screen.x - panX) / zoom;
    const worldY = (screen.y - panY) / zoom;
    this.viewport = {
      ...this.viewport,
      zoom: nextZoom,
      panX: screen.x - worldX * nextZoom,
      panY: screen.y - worldY * nextZoom,
    };
    this.handlers.onViewportChange?.(this.viewport);
  }

  private handleContextMenu(e: MouseEvent): void {
    if (!this.canvas) return;
    e.preventDefault();
    const screen = this.screenFromEvent(e);
    const event = this.interactionEvent(e, screen);
    const hit = this.hitTest(screen);
    if (hit.type === 'node') {
      this.handlers.onNodeContextMenu?.(hit.nodeId!, event);
    } else {
      this.handlers.onCanvasContextMenu?.(event.worldPosition, event);
    }
  }

  // -- Touch -------------------------------------------------------------------

  private handleTouchStart(e: TouchEvent): void {
    if (!this.canvas) return;
    if (e.touches.length === 1) {
      const screen = this.screenFromEvent(e.touches[0]);
      this.pointerDownScreen = screen;
      this.dragType = 'pan';
      this.dragStartPan = { x: this.viewport.panX, y: this.viewport.panY };
    } else if (e.touches.length === 2) {
      e.preventDefault();
      this.dragType = 'none';
      this.touchStartDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      this.touchStartZoom = this.viewport.zoom;
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.canvas) return;
    if (e.touches.length === 1 && this.dragType === 'pan' && this.pointerDownScreen) {
      e.preventDefault();
      const screen = this.screenFromEvent(e.touches[0]);
      this.viewport = {
        ...this.viewport,
        panX: this.dragStartPan.x + (screen.x - this.pointerDownScreen.x),
        panY: this.dragStartPan.y + (screen.y - this.pointerDownScreen.y),
      };
      this.handlers.onViewportChange?.(this.viewport);
    } else if (e.touches.length === 2 && this.touchStartDistance > 0) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const nextZoom = Math.min(
        this.config.maxZoom,
        Math.max(this.config.minZoom, this.touchStartZoom * (distance / this.touchStartDistance))
      );
      this.viewport = { ...this.viewport, zoom: nextZoom };
      this.handlers.onViewportChange?.(this.viewport);
    }
  }

  private handleTouchEnd(): void {
    this.dragType = 'none';
    this.pointerDownScreen = null;
    this.touchStartDistance = 0;
  }

  dispose(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.onMouseDown);
      this.canvas.removeEventListener('wheel', this.onWheel);
      this.canvas.removeEventListener('contextmenu', this.onContextMenu);
      this.canvas.removeEventListener('touchstart', this.onTouchStart);
      this.canvas.removeEventListener('touchmove', this.onTouchMove);
      this.canvas.removeEventListener('touchend', this.onTouchEnd);
    }
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas = null;
    this.spatialHash = null;
    this.visibleEdges = [];
    this.handlers = {};
  }
}

export default GraphInteractionManager;
