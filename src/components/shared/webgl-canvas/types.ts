/**
 * webgl-canvas — shared, node-agnostic three.js canvas infrastructure.
 *
 * Extracted from WorkflowDesigner/renderers/WebGLRenderer so that any 2D
 * graph-like canvas (WorkflowDesigner, GraphExplorer, ...) shares one source
 * of truth for the orthographic camera, viewport math, grid and performance
 * metrics. Domain-specific renderers (steps, connections, graph nodes) stay
 * with their owning component.
 */

// ============================================================================
// Geometry primitives
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 2D canvas viewport: zoom + pan in screen space over pixel bounds. */
export interface CanvasViewport {
  zoom: number;
  panX: number;
  panY: number;
  bounds: Bounds;
}

// ============================================================================
// Renderer / camera / grid configuration
// ============================================================================

export interface WebGLRendererConfig {
  /** Enable anti-aliasing (may impact performance) */
  antialias?: boolean;
  /** Pixel ratio for high-DPI displays */
  pixelRatio?: number;
  /** Background color */
  backgroundColor?: number;
  /** Enable alpha/transparency */
  alpha?: boolean;
  /** Power preference for GPU */
  powerPreference?: 'high-performance' | 'low-power' | 'default';
  /** Enable logarithmic depth buffer for large scenes */
  logarithmicDepthBuffer?: boolean;
}

export interface GridConfig {
  /** Show grid */
  visible: boolean;
  /** Grid cell size in world units */
  cellSize: number;
  /** Primary grid line color */
  primaryColor: number;
  /** Secondary grid line color */
  secondaryColor: number;
  /** Grid line opacity */
  opacity: number;
  /** Number of cells between primary lines */
  primaryInterval: number;
  /** Fade distance from camera */
  fadeDistance: number;
}

export interface CameraConfig {
  /** Minimum zoom level */
  minZoom: number;
  /** Maximum zoom level */
  maxZoom: number;
  /** Zoom speed multiplier */
  zoomSpeed: number;
  /** Pan speed multiplier */
  panSpeed: number;
  /** Enable smooth zoom animation */
  smoothZoom: boolean;
  /** Zoom animation duration in ms */
  zoomDuration: number;
}

// ============================================================================
// Animation & metrics
// ============================================================================

export interface AnimationState {
  /** Current animation ID */
  animationId: number | null;
  /** Target viewport for smooth zoom/pan */
  targetViewport: CanvasViewport | null;
  /** Animation start time */
  startTime: number;
  /** Animation duration */
  duration: number;
  /** Easing function */
  easing: (t: number) => number;
}

export interface WebGLPerformanceMetrics {
  /** Frames per second */
  fps: number;
  /** Frame time in ms */
  frameTime: number;
  /** Draw calls per frame */
  drawCalls: number;
  /** Triangles rendered */
  triangles: number;
  /** Texture memory usage */
  textureMemory: number;
  /** Geometry memory usage */
  geometryMemory: number;
  /** Total GPU memory */
  totalMemory: number;
  /** Visible steps count */
  visibleSteps: number;
  /** Visible connections count */
  visibleConnections: number;
}

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_WEBGL_CONFIG: WebGLRendererConfig = {
  antialias: true,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
  backgroundColor: 0xfafafa,
  alpha: false,
  powerPreference: 'high-performance',
  logarithmicDepthBuffer: false,
};

export const DEFAULT_GRID_CONFIG: GridConfig = {
  visible: true,
  cellSize: 20,
  primaryColor: 0xcccccc,
  secondaryColor: 0xe8e8e8,
  opacity: 0.5,
  primaryInterval: 5,
  fadeDistance: 5000,
};

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  minZoom: 0.1,
  maxZoom: 3.0,
  zoomSpeed: 0.001,
  panSpeed: 1.0,
  smoothZoom: true,
  zoomDuration: 200,
};
