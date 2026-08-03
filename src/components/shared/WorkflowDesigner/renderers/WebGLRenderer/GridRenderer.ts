/**
 * GridRenderer — re-export shim.
 *
 * The implementation moved to the shared, node-agnostic
 * `src/components/shared/webgl-canvas` package so WorkflowDesigner and
 * GraphExplorer share one source of truth for the shader grid.
 * This shim keeps every existing WorkflowDesigner import path working.
 */

export { GridRenderer } from '../../../webgl-canvas';
