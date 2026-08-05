/**
 * GraphExplorer domain types.
 *
 * Decoupled from the GraphQL wire shape — utils/graphMapping.ts is the single
 * seam converting server results into these models.
 */

import { Point, Bounds, CanvasViewport } from '../webgl-canvas';

// ============================================================================
// Graph model
// ============================================================================

/** Mirrors the server's ReactorNodeType enum, with a fallback. */
export type GraphNodeType =
  | 'INPUT'
  | 'OUTPUT'
  | 'PROCESS'
  | 'SYSTEM'
  | 'DATASTORE'
  | 'CHILD'
  | 'CONNECTION'
  | 'DEPENDENCY'
  | 'CONTAINER'
  | 'CLOUD'
  | 'CONSUMER'
  | 'CONFIG'
  | 'FOLDER'
  | 'FILE'
  | 'FUNCTION'
  | 'ENDPOINT'
  | 'DOCUMENT'
  | 'SECTION'
  | 'TOPIC'
  | 'RESOURCE'
  | 'UNKNOWN';

/** Mirrors the server's ReactorLinkType enum, with a fallback. */
export type GraphLinkType =
  | 'INPUT'
  | 'OUTPUT'
  | 'DEPENDENCY'
  | 'CONNECTION'
  | 'INFERRED'
  | 'DIRECT'
  | 'CALL'
  | 'INHERITS'
  | 'IMPLEMENTS'
  | 'REFERENCE'
  | 'SYMLINK'
  | 'CONTAINS'
  | 'DOCUMENTS'
  | 'MENTIONS'
  | 'EMBEDS'
  | 'UNKNOWN';

export interface GraphNode {
  /** Deterministic hash id from the server. */
  id: number;
  /** Ancestry key "rootId|...|nodeId" — drives breadcrumbs and deep links. */
  key: string;
  parentId: number | null;
  type: GraphNodeType;
  name: string;
  nameSpace?: string;
  version?: string;
  description?: string;
  providerId?: string;
  attributes?: Record<string, unknown>;
  data?: Record<string, unknown>;
  /** Inferred expandability (folders/files/systems expand; symbols do not). */
  hasChildren: boolean;
  /** null = unknown until expanded. */
  childCount: number | null;
}

export interface GraphEdge {
  /** Server edge id, or `${source}->${target}` for synthesized edges. */
  id: string;
  source: number;
  target: number;
  types: GraphLinkType[];
  title?: string;
  description?: string;
  projectId?: string;
  data?: Record<string, unknown>;
  /** True for CONTAINS edges derived from parentId, never persisted. */
  synthetic?: boolean;
}

// ============================================================================
// Perspectives (saved views)
// ============================================================================

export interface GraphPerspective {
  id?: string;
  name: string;
  catalogNodeId: number | null;
  projectId?: string;
  positions: Array<{ nodeId: number; x: number; y: number }>;
  expanded: number[];
  viewport: { zoom: number; panX: number; panY: number };
  share?: boolean;
}

// ============================================================================
// Store
// ============================================================================

export interface GraphFilters {
  nodeTypes: Set<GraphNodeType> | null;
  linkTypes: Set<GraphLinkType> | null;
}

export interface GraphSelection {
  nodeIds: Set<number>;
  edgeIds: Set<string>;
}

export interface GraphStoreState {
  nodes: Map<number, GraphNode>;
  edges: Map<string, GraphEdge>;
  /** nodeId -> incident edge ids. */
  adjacency: Map<number, Set<string>>;
  expanded: Set<number>;
  /** Per-node expansion in flight. */
  loading: Set<number>;
  selection: GraphSelection;
  focusNodeId: number | null;
  rootId: number | null;
  filters: GraphFilters;
  /** Nodes with saved/user-dragged positions — layouts never move them. */
  pinned: Set<number>;
}

export type GraphStoreAction =
  | { type: 'SET_ROOT'; node: GraphNode }
  | {
      type: 'MERGE_SUBGRAPH';
      nodes: GraphNode[];
      edges: GraphEdge[];
      expandedNodeId?: number;
      /** Bulk expansion restore (perspective load). */
      expandedNodeIds?: number[];
    }
  | { type: 'COLLAPSE_NODE'; nodeId: number }
  | { type: 'REMOVE_NODES'; nodeIds: number[] }
  | { type: 'SET_SELECTION'; nodeIds?: number[]; edgeIds?: string[]; additive?: boolean }
  | { type: 'SET_FOCUS'; nodeId: number | null }
  | { type: 'SET_FILTERS'; filters: Partial<GraphFilters> }
  | { type: 'NODE_LOADING'; nodeId: number; loading: boolean }
  | { type: 'PIN_NODES'; nodeIds: number[] }
  | { type: 'EDGE_UPSERT'; edge: GraphEdge }
  | { type: 'EDGE_DELETE'; edgeId: string }
  | { type: 'RESET' };

/**
 * High-frequency node positions bypass React state — the render loop reads
 * them every frame; `version` bumps tell the canvas to re-sync geometry.
 */
export interface PositionStore {
  get(id: number): Point | undefined;
  set(id: number, position: Point): void;
  setMany(entries: Array<[number, Point]>): void;
  remove(id: number): void;
  readonly version: number;
  snapshot(): Map<number, Point>;
  clear(): void;
}

// ============================================================================
// Component props
// ============================================================================

export interface GraphExplorerProps {
  /** Catalog (project root) node id — from the route or the picker. */
  catalogNodeId?: number | string;
  /** Deep link: expand the ancestry described by this key. */
  nodeKey?: string;
  projectId?: string;
  /** Hides edge CRUD and perspective save. */
  readOnly?: boolean;
  /** Levels to expand on load (default 1 — root + children). */
  initialDepth?: number;
  height?: number | string;
  onNodeSelect?: (node: GraphNode | null) => void;
}

// ============================================================================
// Interaction (renderer-facing)
// ============================================================================

export interface GraphInteractionEvent {
  originalEvent: MouseEvent | TouchEvent | WheelEvent;
  screenPosition: Point;
  worldPosition: Point;
  modifiers: { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean };
  button: number;
}

export interface GraphHitTestResult {
  type: 'node' | 'edge' | 'canvas';
  nodeId?: number;
  edgeId?: string;
  worldPosition: Point;
  screenPosition: Point;
}

export type { Point, Bounds, CanvasViewport };
