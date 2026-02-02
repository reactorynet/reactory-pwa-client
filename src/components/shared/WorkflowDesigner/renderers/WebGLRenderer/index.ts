/**
 * WebGL Renderer Exports
 * 
 * High-performance WebGL-based rendering for the Workflow Designer.
 */

// Types
export * from './types';

// Core managers
export { SceneManager } from './SceneManager';
export { GridRenderer } from './GridRenderer';
export { StepRenderer } from './StepRenderer';
export { ConnectionRenderer } from './ConnectionRenderer';
export { TextRenderer } from './TextRenderer';
export { InteractionManager } from './InteractionManager';
export { CSS2DLabelRenderer } from './CSS2DLabelRenderer';
export type { NodeCardOptions } from './CSS2DLabelRenderer';

// Circuit theme renderers
export { CircuitComponentRenderer } from './CircuitComponentRenderer';
export { CircuitTraceRenderer } from './CircuitTraceRenderer';
export { CircuitLabelRenderer } from './CircuitLabelRenderer';
export type { CircuitLabelOptions } from './CircuitLabelRenderer';
export * from './CircuitTheme';

// React integration
export { useWebGLCanvas } from './useWebGLCanvas';
export type { UseWebGLCanvasOptions, UseWebGLCanvasReturn, CanvasThemeMode } from './useWebGLCanvas';

// Main component
export { default as WorkflowWebGLCanvas } from './WorkflowWebGLCanvas';
export type { WorkflowWebGLCanvasProps } from './WorkflowWebGLCanvas';
