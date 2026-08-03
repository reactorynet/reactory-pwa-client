/**
 * webgl-canvas — shared three.js 2D-canvas infrastructure.
 *
 * Node-agnostic camera/scene management and grid rendering used by
 * WorkflowDesigner and GraphExplorer. Domain renderers (steps, connections,
 * graph nodes/edges) live with their owning components.
 */

export { SceneManager } from './SceneManager';
export { GridRenderer } from './GridRenderer';
export type {
  Point,
  Size,
  Bounds,
  CanvasViewport,
  WebGLRendererConfig,
  GridConfig,
  CameraConfig,
  AnimationState,
  WebGLPerformanceMetrics,
} from './types';
export {
  DEFAULT_WEBGL_CONFIG,
  DEFAULT_GRID_CONFIG,
  DEFAULT_CAMERA_CONFIG,
} from './types';
