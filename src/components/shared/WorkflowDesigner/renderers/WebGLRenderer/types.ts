/**
 * WebGL Renderer Types for Workflow Designer
 * 
 * These types define the interfaces for the Three.js-based WebGL renderer
 * that provides high-performance rendering for large workflows.
 */

import * as THREE from 'three';
import { 
  WorkflowStepDefinition, 
  WorkflowConnection, 
  CanvasViewport, 
  Point, 
  Size, 
  Bounds,
  SelectionState,
  ValidationResult
} from '../../types';

// ============================================================================
// Scene Configuration
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

export interface SceneConfig {
  /** Grid configuration */
  grid: GridConfig;
  /** Step rendering configuration */
  steps: StepRenderConfig;
  /** Connection rendering configuration */
  connections: ConnectionRenderConfig;
  /** Camera configuration */
  camera: CameraConfig;
  /** Interaction configuration */
  interaction: InteractionConfig;
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

export interface StepRenderConfig {
  /** Default step width */
  defaultWidth: number;
  /** Default step height */
  defaultHeight: number;
  /** Corner radius for rounded rectangles */
  cornerRadius: number;
  /** Border width */
  borderWidth: number;
  /** Selected step border width */
  selectedBorderWidth: number;
  /** Port radius */
  portRadius: number;
  /** Font size for labels */
  fontSize: number;
  /** Enable shadows */
  shadows: boolean;
  /** Shadow blur radius */
  shadowBlur: number;
}

export interface ConnectionRenderConfig {
  /** Line width */
  lineWidth: number;
  /** Selected line width */
  selectedLineWidth: number;
  /** Default connection color */
  defaultColor: number;
  /** Selected connection color */
  selectedColor: number;
  /** Error connection color */
  errorColor: number;
  /** Curve tension (0 = straight, 1 = max curve) */
  curveTension: number;
  /** Number of segments for bezier curves */
  curveSegments: number;
  /** Arrow head size */
  arrowSize: number;
  /** Show arrow heads */
  showArrows: boolean;
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

export interface InteractionConfig {
  /** Enable step dragging */
  enableDrag: boolean;
  /** Enable multi-select */
  enableMultiSelect: boolean;
  /** Selection rectangle color */
  selectionColor: number;
  /** Selection rectangle opacity */
  selectionOpacity: number;
  /** Hover highlight color */
  hoverColor: number;
  /** Double-click threshold in ms */
  doubleClickThreshold: number;
  /** Drag threshold in pixels */
  dragThreshold: number;
}

// ============================================================================
// Render State
// ============================================================================

export interface WebGLRenderState {
  /** Steps to render */
  steps: WorkflowStepDefinition[];
  /** Connections to render */
  connections: WorkflowConnection[];
  /** Processed step geometry data with calculated port positions (for hit testing) */
  stepGeometry?: StepGeometryData[];
  /** Current viewport */
  viewport: CanvasViewport;
  /** Selection state */
  selection: SelectionState;
  /** Validation results */
  validation: ValidationResult;
  /** Hovered step ID */
  hoveredStepId: string | null;
  /** Hovered connection ID */
  hoveredConnectionId: string | null;
  /** Hovered port info */
  hoveredPort: HoveredPortInfo | null;
  /** Is currently dragging */
  isDragging: boolean;
  /** Drag type */
  dragType: WebGLDragType;
  /** Selection rectangle bounds */
  selectionRect: Bounds | null;
  /** Connection preview state */
  connectionPreview: ConnectionPreviewState | null;
}

export interface HoveredPortInfo {
  stepId: string;
  portId: string;
  portType: 'input' | 'output';
  position: Point;
}

export interface ConnectionPreviewState {
  sourceStepId: string;
  sourcePortId: string;
  sourcePortType: 'input' | 'output';
  startPoint: Point;
  currentPoint: Point;
}

export type WebGLDragType = 
  | 'none'
  | 'pan'
  | 'step'
  | 'selection'
  | 'connection'
  | 'resize';

// ============================================================================
// Geometry & Rendering
// ============================================================================

export interface StepGeometryData {
  /** Step ID */
  id: string;
  /** Step type (references StepDefinition.id) */
  stepType: string;
  /** Position in world space */
  position: Point;
  /** Size in world units */
  size: Size;
  /** Background color */
  color: number;
  /** Border color */
  borderColor: number;
  /** Is selected */
  selected: boolean;
  /** Has error */
  hasError: boolean;
  /** Has warning */
  hasWarning: boolean;
  /** Label text */
  label: string;
  /** Step type icon */
  icon?: string;
  /** Input ports */
  inputPorts: PortGeometryData[];
  /** Output ports */
  outputPorts: PortGeometryData[];
}

export interface PortGeometryData {
  /** Port ID */
  id: string;
  /** Port position relative to step */
  localPosition: Point;
  /** Port position in world space */
  worldPosition: Point;
  /** Port color */
  color: number;
  /** Is connected */
  connected: boolean;
  /** Is hovered */
  hovered: boolean;
}

export interface ConnectionGeometryData {
  /** Connection ID */
  id: string;
  /** Start point in world space */
  startPoint: Point;
  /** End point in world space */
  endPoint: Point;
  /** Control points for bezier curve */
  controlPoints: Point[];
  /** Line color */
  color: number;
  /** Line width */
  width: number;
  /** Is selected */
  selected: boolean;
  /** Has error */
  hasError: boolean;
}

// ============================================================================
// Hit Testing
// ============================================================================

export interface HitTestResult {
  /** Type of object hit */
  type: 'step' | 'connection' | 'port' | 'canvas';
  /** Object ID (if applicable) */
  id?: string;
  /** Port info (if port hit) */
  portInfo?: HoveredPortInfo;
  /** World position of hit */
  worldPosition: Point;
  /** Screen position of hit */
  screenPosition: Point;
  /** Distance from camera */
  distance: number;
}

// ============================================================================
// Events
// ============================================================================

export interface WebGLCanvasEvents {
  onStepClick: (stepId: string, event: WebGLInteractionEvent) => void;
  onStepDoubleClick: (stepId: string, event: WebGLInteractionEvent) => void;
  onStepDragStart: (stepId: string, position: Point) => void;
  onStepDrag: (stepId: string, position: Point, delta: Point) => void;
  onStepDragEnd: (stepId: string, position: Point) => void;
  onStepHover: (stepId: string | null) => void;
  onStepContextMenu: (stepId: string, event: WebGLInteractionEvent) => void;
  
  onConnectionClick: (connectionId: string, event: WebGLInteractionEvent) => void;
  onConnectionHover: (connectionId: string | null) => void;
  onConnectionContextMenu: (connectionId: string, event: WebGLInteractionEvent) => void;
  
  onPortDragStart: (stepId: string, portId: string, portType: 'input' | 'output', position: Point) => void;
  onPortDrag: (position: Point) => void;
  onPortDragEnd: (targetStepId: string | null, targetPortId: string | null, position: Point) => void;
  onPortHover: (portInfo: HoveredPortInfo | null) => void;
  
  onCanvasClick: (position: Point, event: WebGLInteractionEvent) => void;
  onCanvasDrag: (delta: Point) => void;
  onCanvasContextMenu: (position: Point, event: WebGLInteractionEvent) => void;
  
  onSelectionChange: (bounds: Bounds | null) => void;
  onViewportChange: (viewport: CanvasViewport) => void;
  onZoom: (zoom: number, center: Point) => void;
}

export interface WebGLInteractionEvent {
  /** Original DOM event */
  originalEvent: MouseEvent | TouchEvent | WheelEvent;
  /** Screen position */
  screenPosition: Point;
  /** World position */
  worldPosition: Point;
  /** Modifier keys */
  modifiers: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
  };
  /** Mouse button (0 = left, 1 = middle, 2 = right) */
  button: number;
}

// ============================================================================
// Animation
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

// ============================================================================
// Performance Metrics
// ============================================================================

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
// Manager Interfaces
// ============================================================================

export interface ISceneManager {
  /** Initialize the scene */
  initialize(container: HTMLElement, config: SceneConfig): void;
  /** Dispose all resources */
  dispose(): void;
  /** Get the Three.js scene */
  getScene(): THREE.Scene;
  /** Get the camera */
  getCamera(): THREE.OrthographicCamera;
  /** Get the renderer */
  getRenderer(): THREE.WebGLRenderer;
  /** Resize the canvas */
  resize(width: number, height: number): void;
  /** Update viewport */
  setViewport(viewport: CanvasViewport): void;
  /** Get current viewport */
  getViewport(): CanvasViewport;
  /** Render a frame */
  render(): void;
  /** Get performance metrics */
  getMetrics(): WebGLPerformanceMetrics;
}

export interface IGridRenderer {
  /** Initialize grid */
  initialize(scene: THREE.Scene, config: GridConfig): void;
  /** Update grid based on viewport */
  update(viewport: CanvasViewport): void;
  /** Set visibility */
  setVisible(visible: boolean): void;
  /** Dispose resources */
  dispose(): void;
}

export interface IStepRenderer {
  /** Initialize renderer */
  initialize(scene: THREE.Scene, config: StepRenderConfig): void;
  /** Update steps */
  updateSteps(steps: StepGeometryData[]): void;
  /** Highlight step */
  setHighlight(stepId: string | null): void;
  /** Get step mesh by ID */
  getStepMesh(stepId: string): THREE.Object3D | null;
  /** Dispose resources */
  dispose(): void;
}

export interface IConnectionRenderer {
  /** Initialize renderer */
  initialize(scene: THREE.Scene, config: ConnectionRenderConfig): void;
  /** Update connections */
  updateConnections(connections: ConnectionGeometryData[]): void;
  /** Set preview connection */
  setPreview(preview: ConnectionPreviewState | null): void;
  /** Dispose resources */
  dispose(): void;
}

export interface ITextRenderer {
  /** Initialize renderer */
  initialize(scene: THREE.Scene): void;
  /** Add/update text label */
  updateLabel(id: string, text: string, position: Point, options?: TextLabelOptions): void;
  /** Remove label */
  removeLabel(id: string): void;
  /** Update all labels for zoom level */
  updateZoom(zoom: number): void;
  /** Dispose resources */
  dispose(): void;
}

export interface TextLabelOptions {
  fontSize?: number;
  color?: number;
  backgroundColor?: number;
  padding?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

export interface IInteractionManager {
  /** Initialize interaction handling */
  initialize(
    canvas: HTMLCanvasElement, 
    camera: THREE.OrthographicCamera,
    scene: THREE.Scene,
    config: InteractionConfig
  ): void;
  /** Set event handlers */
  setEventHandlers(handlers: Partial<WebGLCanvasEvents>): void;
  /** Update render state for hit testing */
  updateRenderState(state: WebGLRenderState): void;
  /** Perform hit test at screen position */
  hitTest(screenPosition: Point): HitTestResult;
  /** Convert screen to world coordinates */
  screenToWorld(screenPosition: Point): Point;
  /** Convert world to screen coordinates */
  worldToScreen(worldPosition: Point): Point;
  /** Dispose resources */
  dispose(): void;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_WEBGL_CONFIG: WebGLRendererConfig = {
  antialias: true,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
  backgroundColor: 0xfafafa,
  alpha: false,
  powerPreference: 'high-performance',
  logarithmicDepthBuffer: false
};

export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  grid: {
    visible: true,
    cellSize: 20,
    primaryColor: 0xcccccc,
    secondaryColor: 0xe8e8e8,
    opacity: 0.5,
    primaryInterval: 5,
    fadeDistance: 5000
  },
  steps: {
    defaultWidth: 200,
    defaultHeight: 100,
    cornerRadius: 8,
    borderWidth: 2,
    selectedBorderWidth: 3,
    portRadius: 6,
    fontSize: 14,
    shadows: true,
    shadowBlur: 8
  },
  connections: {
    lineWidth: 6,
    selectedLineWidth: 9,
    defaultColor: 0x666666,
    selectedColor: 0x1976d2,
    errorColor: 0xd32f2f,
    curveTension: 0.5,
    curveSegments: 50,
    arrowSize: 8,
    showArrows: true
  },
  camera: {
    minZoom: 0.1,
    maxZoom: 3.0,
    zoomSpeed: 0.001,
    panSpeed: 1.0,
    smoothZoom: true,
    zoomDuration: 200
  },
  interaction: {
    enableDrag: true,
    enableMultiSelect: true,
    selectionColor: 0x1976d2,
    selectionOpacity: 0.2,
    hoverColor: 0x42a5f5,
    doubleClickThreshold: 300,
    dragThreshold: 5
  }
};
