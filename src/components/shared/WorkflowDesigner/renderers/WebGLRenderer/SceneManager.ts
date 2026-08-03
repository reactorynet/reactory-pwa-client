/**
 * SceneManager — re-export shim.
 *
 * The implementation moved to the shared, node-agnostic
 * `src/components/shared/webgl-canvas` package so WorkflowDesigner and
 * GraphExplorer share one source of truth for camera/viewport math.
 * This shim keeps every existing WorkflowDesigner import path working.
 */

export { SceneManager } from '../../../webgl-canvas';
