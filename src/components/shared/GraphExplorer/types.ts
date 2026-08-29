/**
 * GraphExplorer domain types.
 *
 * Decoupled from the GraphQL wire shape — utils/graphMapping.ts is the single
 * seam converting server results into these models. The same store/model is
 * consumed by both renderers (2D board canvas and 3D orbit canvas).
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

export const ALL_NODE_TYPES: GraphNodeType[] = [
  'SYSTEM', 'FOLDER', 'FILE', 'FUNCTION', 'PROCESS', 'DATASTORE', 'ENDPOINT',
  'DEPENDENCY', 'CONTAINER', 'CLOUD', 'CONSUMER', 'CONFIG', 'CONNECTION',
  'INPUT', 'OUTPUT', 'CHILD', 'DOCUMENT', 'SECTION', 'TOPIC', 'RESOURCE', 'UNKNOWN',
];

export const ALL_LINK_TYPES: GraphLinkType[] = [
  'CONTAINS', 'DEPENDENCY', 'CALL', 'INHERITS', 'IMPLEMENTS', 'REFERENCE',
  'SYMLINK', 'CONNECTION', 'DIRECT', 'INFERRED', 'INPUT', 'OUTPUT',
  'DOCUMENTS', 'MENTIONS', 'EMBEDS', 'UNKNOWN',
];

/**
 * Who put a node/edge on the canvas. `graph` = loaded from the system graph;
 * `overlay` = injected by a host (e.g. the chat agent's touched nodes);
 * `both` = present in both.
 */
export type GraphOrigin = 'graph' | 'overlay' | 'both';

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
  origin?: GraphOrigin;
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
  /** True for edges that are not persisted rows (containment, derived). */
  synthetic?: boolean;
  origin?: GraphOrigin;
}

/** World position; z is only meaningful in the 3D renderer. */
export interface GraphPoint extends Point {
  z?: number;
}

// ============================================================================
// Perspectives (saved views)
// ============================================================================

export type GraphViewMode = '2d' | '3d';
export type GraphLayoutKind = 'radial' | 'force' | 'hierarchical';

/**
 * World-space camera — renderer independent so a perspective saved in 2D
 * restores sensibly in 3D and vice versa.
 *  - 2D: `target` is the world point at the viewport centre, `zoom` the scale.
 *  - 3D: `target` is the orbit target, `camera` the eye position.
 */
export interface GraphCameraState {
  target: { x: number; y: number; z: number };
  camera?: { x: number; y: number; z: number };
  zoom: number;
}

export interface GraphPerspectiveFilters {
  nodeTypes: GraphNodeType[] | null;
  linkTypes: GraphLinkType[] | null;
}

export interface GraphPerspective {
  id?: string;
  name: string;
  owner?: string;
  /** False for perspectives shared by another user (read-only). */
  isOwner: boolean;
  catalogNodeId: number | null;
  projectId?: string;
  positions: Array<{ nodeId: number; x: number; y: number; z?: number }>;
  expanded: number[];
  hiddenNodeIds: number[];
  filters: GraphPerspectiveFilters;
  layout: GraphLayoutKind;
  viewMode: GraphViewMode;
  depth: number;
  viewport: GraphCameraState;
  share: boolean;
  isDefault: boolean;
  updated?: string;
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
  /** Nodes removed from the view by the user — loaded but never rendered. */
  hidden: Set<number>;
  /** Per-node expansion in flight. */
  loading: Set<number>;
  selection: GraphSelection;
  focusNodeId: number | null;
  rootId: number | null;
  filters: GraphFilters;
  /** Nodes with saved/user-dragged positions — layouts never move them. */
  pinned: Set<number>;
  layout: GraphLayoutKind;
  viewMode: GraphViewMode;
  depth: number;
  /** The perspective the current view was loaded from / last saved as. */
  perspective: GraphPerspective | null;
  /** True once the view diverged from `perspective`. */
  dirty: boolean;
  /** Last subgraph load hit a server limit — more nodes exist. */
  truncated: boolean;
}

export type GraphStoreAction =
  | { type: 'SET_ROOT'; node: GraphNode; keepViewSettings?: boolean }
  | {
      type: 'MERGE_SUBGRAPH';
      nodes: GraphNode[];
      edges: GraphEdge[];
      expandedNodeId?: number;
      /** Bulk expansion restore (perspective load). */
      expandedNodeIds?: number[];
      truncated?: boolean;
    }
  | { type: 'COLLAPSE_NODE'; nodeId: number }
  | { type: 'REMOVE_NODES'; nodeIds: number[] }
  | { type: 'HIDE_NODES'; nodeIds: number[] }
  | { type: 'UNHIDE_NODES'; nodeIds?: number[] }
  | { type: 'SET_SELECTION'; nodeIds?: number[]; edgeIds?: string[]; additive?: boolean }
  | { type: 'SET_FOCUS'; nodeId: number | null }
  | { type: 'SET_FILTERS'; filters: Partial<GraphFilters> }
  | { type: 'NODE_LOADING'; nodeId: number; loading: boolean }
  | { type: 'PIN_NODES'; nodeIds: number[] }
  | { type: 'UNPIN_ALL' }
  | { type: 'NODE_UPSERT'; node: GraphNode }
  | { type: 'EDGE_UPSERT'; edge: GraphEdge; replaceId?: string }
  | { type: 'EDGE_DELETE'; edgeId: string }
  | { type: 'SET_LAYOUT'; layout: GraphLayoutKind }
  | { type: 'SET_VIEW_MODE'; viewMode: GraphViewMode }
  | { type: 'SET_DEPTH'; depth: number }
  | { type: 'SET_PERSPECTIVE'; perspective: GraphPerspective | null }
  | { type: 'MARK_DIRTY'; dirty?: boolean }
  | { type: 'RESET' };

/**
 * High-frequency node positions bypass React state — the render loop reads
 * them every frame; `version` bumps tell the canvas to re-sync geometry.
 */
export interface PositionStore {
  get(id: number): GraphPoint | undefined;
  set(id: number, position: GraphPoint): void;
  setMany(entries: Array<[number, GraphPoint]>): void;
  remove(id: number): void;
  readonly version: number;
  snapshot(): Map<number, GraphPoint>;
  clear(): void;
}

// ============================================================================
// Component props
// ============================================================================

/** Host-injected graph fragment (e.g. the chat agent's touched nodes). */
export interface GraphOverlayNode {
  id: number | string;
  name?: string;
  type?: string;
  parentId?: number | string | null;
  key?: string;
  nameSpace?: string;
  description?: string;
  data?: Record<string, unknown>;
}

export interface GraphOverlay {
  nodes: GraphOverlayNode[];
  edges: Array<{ source: number | string; target: number | string; types?: string[] }>;
}

/**
 * A steering instruction — from a route, a host, or the chat agent's
 * loadGraphPerspective tool. Strings resolve against built-ins
 * ('conversation' | 'agent'), saved perspective names, or project names.
 */
export type GraphPerspectiveRequest =
  | string
  | {
      rootId?: number;
      depth?: number;
      label?: string;
      perspectiveId?: string;
      viewMode?: GraphViewMode;
    };

export interface GraphExplorerProps {
  /** Catalog (project root) node id — from the route or the picker. */
  catalogNodeId?: number | string;
  /** Deep link: expand the ancestry described by this key. */
  nodeKey?: string;
  /** Project (ObjectId / fqn / name) — resolved to its graph root node. */
  projectId?: string;
  /** Deep link: node to hydrate, select and focus after the root loads. */
  nodeId?: number | string;
  /** Chat session whose conversation node becomes the root. */
  conversationId?: string;
  /** Hides edge/node CRUD and perspective save. */
  readOnly?: boolean;
  /** Traversal depth for the root neighbourhood (default 1). */
  initialDepth?: number;
  /** Initial renderer; the toolbar can switch at runtime. */
  viewMode?: GraphViewMode;
  /** 'full' shows the left drawer; 'compact' (side panels) collapses it. */
  chrome?: 'full' | 'compact';
  /** Host-injected nodes/edges rendered on top of the loaded graph. */
  overlay?: GraphOverlay | null;
  /** Steering request applied whenever its identity changes. */
  perspective?: GraphPerspectiveRequest | null;
  /** Pins the current perspective (+ selected node) into the host context. */
  onPinPerspective?: (perspective: GraphPerspective, node: GraphNode | null) => Promise<void> | void;
  height?: number | string;
  onNodeSelect?: (node: GraphNode | null) => void;
  /** Colors for the 3D ambient styling; defaults follow the PCB theme. */
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
}

// ============================================================================
// Interaction (renderer-facing)
// ============================================================================

export interface GraphInteractionEvent {
  originalEvent: MouseEvent | TouchEvent | WheelEvent | PointerEvent;
  screenPosition: Point;
  worldPosition: GraphPoint;
  modifiers: { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean };
  button: number;
}

export interface GraphHitTestResult {
  type: 'node' | 'edge' | 'canvas';
  nodeId?: number;
  edgeId?: string;
  worldPosition: GraphPoint;
  screenPosition: Point;
}

/**
 * Common contract both renderers (2D/3D) expose to the shell so the toolbar,
 * perspective manager and keyboard handling are renderer-agnostic.
 */
export interface GraphCanvasController {
  containerRef: React.RefObject<HTMLDivElement>;
  hoveredNodeId: number | null;
  /** Renderer-independent camera for persistence. */
  getCamera(): GraphCameraState;
  setCamera(camera: GraphCameraState, animate?: boolean): void;
  fitToContent(): void;
  focusOn(nodeId: number): void;
  /** Start a chunked global force relayout ("tidy graph"). */
  runForceLayout(): void;
  setEdgePreview(fromNodeId: number | null): void;
  /** Screen-space marquee currently being dragged (2D only). */
  marquee: Bounds | null;
  /** Live zoom for the toolbar readout (2D scale, 3D distance-derived). */
  zoom: number;
}

export type { Point, Bounds, CanvasViewport };
