/**
 * GraphExplorer renderer types — graph-flavoured geometry structs and the
 * renderer interfaces. Unlike the WorkflowDesigner equivalents there are no
 * ports, ids are numeric, and the shapes are designed for instanced rendering
 * of thousands of nodes.
 */

import * as THREE from 'three';
import { Bounds, CanvasViewport, GraphInteractionEvent, GraphPoint, Point } from '../types';

// ============================================================================
// Geometry
// ============================================================================

export type NodeLodTier = 0 | 1 | 2; // 0 dot, 1 icon circle, 2 icon + label

export interface NodeGeometryData {
  id: number;
  position: Point;
  radius: number;
  /** Fill color by node type. */
  color: number;
  /** Selection/focus ring color (0 = no ring). */
  ringColor: number;
  iconIndex: number;
  selected: boolean;
  focused: boolean;
  /** Filtered-out neighbours render dimmed. */
  dimmed: boolean;
  /** >0 renders a "+N" collapsed-children badge. */
  collapsedChildCount: number;
  label: string;
  lodTier: NodeLodTier;
}

export interface EdgeGeometryData {
  id: string;
  source: Point;
  target: Point;
  color: number;
  width: number;
  directed: boolean;
  dashed: boolean;
  selected: boolean;
}

// ============================================================================
// Renderer configuration
// ============================================================================

export interface GraphNodeRenderConfig {
  /** Ring width as a fraction of radius. */
  ringWidthRatio: number;
  /** Opacity for dimmed nodes. */
  dimmedOpacity: number;
}

export interface GraphEdgeRenderConfig {
  defaultWidth: number;
  selectedWidth: number;
  arrowSize: number;
}

export const DEFAULT_NODE_RENDER_CONFIG: GraphNodeRenderConfig = {
  ringWidthRatio: 0.18,
  dimmedOpacity: 0.25,
};

export const DEFAULT_EDGE_RENDER_CONFIG: GraphEdgeRenderConfig = {
  defaultWidth: 1.5,
  selectedWidth: 3,
  arrowSize: 8,
};

// ============================================================================
// Renderer interfaces
// ============================================================================

export interface IGraphNodeRenderer {
  initialize(scene: THREE.Scene, config?: Partial<GraphNodeRenderConfig>): void;
  updateNodes(nodes: NodeGeometryData[]): void;
  setHighlight(nodeId: number | null): void;
  dispose(): void;
}

export interface IGraphEdgeRenderer {
  initialize(scene: THREE.Scene, config?: Partial<GraphEdgeRenderConfig>): void;
  updateEdges(edges: EdgeGeometryData[]): void;
  /** Ghost line while creating an edge; null clears it. */
  setPreview(from: Point | null, to?: Point): void;
  dispose(): void;
}

// ============================================================================
// Canvas events
// ============================================================================

export interface GraphCanvasEvents {
  onNodeClick(nodeId: number, event: GraphInteractionEvent): void;
  onNodeDoubleClick(nodeId: number, event: GraphInteractionEvent): void;
  onNodeContextMenu(nodeId: number, event: GraphInteractionEvent): void;
  onNodeHover(nodeId: number | null): void;
  onNodeDrag(nodeId: number, position: Point, phase: 'start' | 'move' | 'end'): void;
  onEdgeClick(edgeId: string, event: GraphInteractionEvent): void;
  onCanvasClick(position: Point, event: GraphInteractionEvent): void;
  onCanvasContextMenu(position: Point, event: GraphInteractionEvent): void;
  onMarqueeSelect(bounds: Bounds, event: GraphInteractionEvent): void;
  /** Live marquee rectangle (screen space) while shift-dragging; null when done. */
  onMarqueeUpdate(bounds: Bounds | null): void;
  /** Pointer moved over the canvas (world space) — drives the edge-preview ghost. */
  onCanvasPointerMove(position: GraphPoint): void;
  onViewportChange(viewport: CanvasViewport): void;
}
