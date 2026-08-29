/**
 * useGraphStore — incremental graph state (nodes/edges/expansion/selection/
 * visibility/perspective) via useReducer, plus a mutable versioned
 * PositionStore that the render loop reads every frame without going through
 * React. Renderer-agnostic: both the 2D and the 3D canvas consume it.
 */

import { useMemo, useReducer, useRef } from 'react';
import {
  GraphEdge,
  GraphNode,
  GraphPoint,
  GraphStoreAction,
  GraphStoreState,
  PositionStore,
} from '../types';
import { createPositionAnimator, PositionAnimator } from '../utils/positionAnimator';

export const initialGraphState = (): GraphStoreState => ({
  nodes: new Map(),
  edges: new Map(),
  adjacency: new Map(),
  expanded: new Set(),
  hidden: new Set(),
  loading: new Set(),
  selection: { nodeIds: new Set(), edgeIds: new Set() },
  focusNodeId: null,
  rootId: null,
  filters: { nodeTypes: null, linkTypes: null },
  pinned: new Set(),
  layout: 'radial',
  viewMode: '2d',
  depth: 1,
  perspective: null,
  dirty: false,
  truncated: false,
});

const cloneAdjacency = (adjacency: Map<number, Set<string>>): Map<number, Set<string>> =>
  new Map(Array.from(adjacency.entries(), ([k, v]) => [k, new Set(v)] as [number, Set<string>]));

const addEdgeToAdjacency = (adjacency: Map<number, Set<string>>, edge: GraphEdge): void => {
  for (const endpoint of [edge.source, edge.target]) {
    let set = adjacency.get(endpoint);
    if (!set) {
      set = new Set();
      adjacency.set(endpoint, set);
    }
    set.add(edge.id);
  }
};

const removeEdgeFromAdjacency = (adjacency: Map<number, Set<string>>, edge: GraphEdge): void => {
  for (const endpoint of [edge.source, edge.target]) {
    const set = adjacency.get(endpoint);
    set?.delete(edge.id);
    if (set && set.size === 0) adjacency.delete(endpoint);
  }
};

const pruneSelection = (state: GraphStoreState, nodes: Map<number, GraphNode>, edges: Map<string, GraphEdge>) => ({
  nodeIds: new Set(Array.from(state.selection.nodeIds).filter((id) => nodes.has(id))),
  edgeIds: new Set(Array.from(state.selection.edgeIds).filter((id) => edges.has(id))),
});

/**
 * All nodes below `rootId` in the containment (parentId) tree, exclusive of
 * the root itself. Used for collapse pruning and drag-end child realignment.
 */
export const containmentSubtree = (state: GraphStoreState, rootId: number): Set<number> => {
  const subtree = new Set<number>();
  const children = new Map<number, number[]>();
  for (const node of state.nodes.values()) {
    if (node.parentId === null) continue;
    let list = children.get(node.parentId);
    if (!list) {
      list = [];
      children.set(node.parentId, list);
    }
    list.push(node.id);
  }
  const stack = [rootId];
  while (stack.length) {
    const current = stack.pop()!;
    for (const child of children.get(current) ?? []) {
      if (!subtree.has(child)) {
        subtree.add(child);
        stack.push(child);
      }
    }
  }
  return subtree;
};

/**
 * The node ids COLLAPSE_NODE will actually remove: the containment subtree
 * minus root/pinned/selected keepers. Exported so the orchestrator can
 * animate exactly these nodes back into the parent before dispatching.
 */
export const collapsibleSubtree = (state: GraphStoreState, nodeId: number): Set<number> => {
  const doomed = containmentSubtree(state, nodeId);
  for (const keep of [state.rootId, ...state.pinned, ...state.selection.nodeIds]) {
    if (keep !== null && keep !== undefined) doomed.delete(keep as number);
  }
  return doomed;
};

/** Containment depth of every node relative to the root (root = 0). */
export const containmentDepths = (state: GraphStoreState): Map<number, number> => {
  const depths = new Map<number, number>();
  const resolve = (id: number, guard = 0): number => {
    const known = depths.get(id);
    if (known !== undefined) return known;
    const node = state.nodes.get(id);
    if (!node || node.parentId === null || !state.nodes.has(node.parentId) || guard > 64) {
      depths.set(id, 0);
      return 0;
    }
    const depth = resolve(node.parentId, guard + 1) + 1;
    depths.set(id, depth);
    return depth;
  };
  for (const id of state.nodes.keys()) resolve(id);
  return depths;
};

const removeNodeSet = (state: GraphStoreState, doomed: Set<number>): GraphStoreState => {
  const nodes = new Map(state.nodes);
  const edges = new Map(state.edges);
  const adjacency = cloneAdjacency(state.adjacency);
  for (const id of doomed) nodes.delete(id);
  for (const edge of Array.from(edges.values())) {
    if (doomed.has(edge.source) || doomed.has(edge.target)) {
      edges.delete(edge.id);
      removeEdgeFromAdjacency(adjacency, edge);
    }
  }
  const expanded = new Set(state.expanded);
  const pinned = new Set(state.pinned);
  const hidden = new Set(state.hidden);
  for (const id of doomed) {
    expanded.delete(id);
    pinned.delete(id);
    hidden.delete(id);
  }
  const selection = pruneSelection(state, nodes, edges);
  const focusNodeId =
    state.focusNodeId !== null && nodes.has(state.focusNodeId) ? state.focusNodeId : null;
  return { ...state, nodes, edges, adjacency, expanded, pinned, hidden, selection, focusNodeId, dirty: true };
};

export const graphReducer = (
  state: GraphStoreState,
  action: GraphStoreAction
): GraphStoreState => {
  switch (action.type) {
    case 'SET_ROOT': {
      const next = initialGraphState();
      next.nodes.set(action.node.id, action.node);
      next.rootId = action.node.id;
      if (action.keepViewSettings !== false) {
        next.layout = state.layout;
        next.viewMode = state.viewMode;
        next.depth = state.depth;
      }
      return next;
    }

    case 'MERGE_SUBGRAPH': {
      const nodes = new Map(state.nodes);
      const edges = new Map(state.edges);
      const adjacency = cloneAdjacency(state.adjacency);
      for (const node of action.nodes) {
        // Merge over existing so richer data (attributes) is not lost.
        const existing = nodes.get(node.id);
        if (existing) {
          const origin =
            existing.origin && node.origin && existing.origin !== node.origin
              ? 'both'
              : node.origin ?? existing.origin;
          nodes.set(node.id, { ...existing, ...node, origin });
        } else {
          nodes.set(node.id, node);
        }
      }
      for (const edge of action.edges) {
        if (!edges.has(edge.id)) {
          edges.set(edge.id, edge);
          addEdgeToAdjacency(adjacency, edge);
        }
      }
      const expanded = new Set(state.expanded);
      const loading = new Set(state.loading);
      if (action.expandedNodeId !== undefined) {
        expanded.add(action.expandedNodeId);
        loading.delete(action.expandedNodeId);
      }
      for (const id of action.expandedNodeIds ?? []) {
        expanded.add(id);
        loading.delete(id);
      }
      const dirty = state.perspective !== null ? true : state.dirty;
      return {
        ...state,
        nodes,
        edges,
        adjacency,
        expanded,
        loading,
        dirty,
        truncated: action.truncated ?? state.truncated,
      };
    }

    case 'COLLAPSE_NODE': {
      // Keeps pinned/selected/root nodes even inside the collapsed subtree.
      const doomed = collapsibleSubtree(state, action.nodeId);
      const next = removeNodeSet(state, doomed);
      const expanded = new Set(next.expanded);
      expanded.delete(action.nodeId);
      return { ...next, expanded };
    }

    case 'REMOVE_NODES': {
      // View-only removal (never deletes server data). The root stays.
      const doomed = new Set(action.nodeIds.filter((id) => id !== state.rootId));
      if (doomed.size === 0) return state;
      return removeNodeSet(state, doomed);
    }

    case 'HIDE_NODES': {
      const hidden = new Set(state.hidden);
      for (const id of action.nodeIds) if (id !== state.rootId) hidden.add(id);
      if (hidden.size === state.hidden.size) return state;
      const selection = {
        nodeIds: new Set(Array.from(state.selection.nodeIds).filter((id) => !hidden.has(id))),
        edgeIds: state.selection.edgeIds,
      };
      const focusNodeId =
        state.focusNodeId !== null && hidden.has(state.focusNodeId) ? null : state.focusNodeId;
      return { ...state, hidden, selection, focusNodeId, dirty: true };
    }

    case 'UNHIDE_NODES': {
      if (state.hidden.size === 0) return state;
      if (!action.nodeIds) return { ...state, hidden: new Set(), dirty: true };
      const hidden = new Set(state.hidden);
      for (const id of action.nodeIds) hidden.delete(id);
      return { ...state, hidden, dirty: true };
    }

    case 'SET_SELECTION': {
      const nodeIds = action.additive
        ? new Set([...state.selection.nodeIds, ...(action.nodeIds ?? [])])
        : new Set(action.nodeIds ?? []);
      const edgeIds = action.additive
        ? new Set([...state.selection.edgeIds, ...(action.edgeIds ?? [])])
        : new Set(action.edgeIds ?? []);
      return { ...state, selection: { nodeIds, edgeIds } };
    }

    case 'SET_FOCUS':
      return { ...state, focusNodeId: action.nodeId };

    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.filters }, dirty: true };

    case 'NODE_LOADING': {
      const loading = new Set(state.loading);
      if (action.loading) loading.add(action.nodeId);
      else loading.delete(action.nodeId);
      return { ...state, loading };
    }

    case 'PIN_NODES': {
      const pinned = new Set(state.pinned);
      for (const id of action.nodeIds) pinned.add(id);
      return { ...state, pinned };
    }

    case 'UNPIN_ALL':
      return state.pinned.size === 0 ? state : { ...state, pinned: new Set() };

    case 'NODE_UPSERT': {
      const nodes = new Map(state.nodes);
      const existing = nodes.get(action.node.id);
      nodes.set(action.node.id, existing ? { ...existing, ...action.node } : action.node);
      return { ...state, nodes };
    }

    case 'EDGE_UPSERT': {
      const edges = new Map(state.edges);
      const adjacency = cloneAdjacency(state.adjacency);
      const replaced = action.replaceId ? edges.get(action.replaceId) : undefined;
      if (replaced) {
        edges.delete(replaced.id);
        removeEdgeFromAdjacency(adjacency, replaced);
      }
      const previous = edges.get(action.edge.id);
      if (previous) removeEdgeFromAdjacency(adjacency, previous);
      edges.set(action.edge.id, action.edge);
      addEdgeToAdjacency(adjacency, action.edge);
      const edgeIds = new Set(state.selection.edgeIds);
      if (replaced) edgeIds.delete(replaced.id);
      return { ...state, edges, adjacency, selection: { ...state.selection, edgeIds } };
    }

    case 'EDGE_DELETE': {
      const edge = state.edges.get(action.edgeId);
      if (!edge) return state;
      const edges = new Map(state.edges);
      const adjacency = cloneAdjacency(state.adjacency);
      edges.delete(action.edgeId);
      removeEdgeFromAdjacency(adjacency, edge);
      const edgeIds = new Set(state.selection.edgeIds);
      edgeIds.delete(action.edgeId);
      return { ...state, edges, adjacency, selection: { ...state.selection, edgeIds } };
    }

    case 'SET_LAYOUT':
      return state.layout === action.layout ? state : { ...state, layout: action.layout, dirty: true };

    case 'SET_VIEW_MODE':
      return state.viewMode === action.viewMode
        ? state
        : { ...state, viewMode: action.viewMode, dirty: true };

    case 'SET_DEPTH':
      return state.depth === action.depth ? state : { ...state, depth: action.depth, dirty: true };

    case 'SET_PERSPECTIVE':
      return { ...state, perspective: action.perspective, dirty: false };

    case 'MARK_DIRTY':
      return { ...state, dirty: action.dirty ?? true };

    case 'RESET':
      return initialGraphState();

    default:
      return state;
  }
};

/** Mutable versioned position store — see PositionStore in types.ts. */
export const createPositionStore = (): PositionStore => {
  const positions = new Map<number, GraphPoint>();
  let version = 0;
  return {
    get: (id) => positions.get(id),
    set: (id, position) => {
      positions.set(id, position);
      version++;
    },
    setMany: (entries) => {
      for (const [id, position] of entries) positions.set(id, position);
      if (entries.length) version++;
    },
    remove: (id) => {
      if (positions.delete(id)) version++;
    },
    get version() {
      return version;
    },
    snapshot: () => new Map(positions),
    clear: () => {
      positions.clear();
      version++;
    },
  };
};

export interface UseGraphStoreReturn {
  state: GraphStoreState;
  dispatch: React.Dispatch<GraphStoreAction>;
  positions: PositionStore;
  /** Position tween layer — stepped by the canvas render loop. */
  animator: PositionAnimator;
  /** Nodes/edges passing the active filters and not hidden (render set). */
  visibleNodes: GraphNode[];
  visibleEdges: GraphEdge[];
}

/** Pure selector so tests and hosts can compute the render set without React. */
export const selectVisible = (
  state: Pick<GraphStoreState, 'nodes' | 'edges' | 'filters' | 'rootId' | 'hidden'>
): { visibleNodes: GraphNode[]; visibleEdges: GraphEdge[] } => {
  const { nodeTypes, linkTypes } = state.filters;
  const nodes = Array.from(state.nodes.values()).filter(
    (n) => !state.hidden.has(n.id) && (!nodeTypes || nodeTypes.has(n.type) || n.id === state.rootId)
  );
  const present = new Set(nodes.map((n) => n.id));
  const edges = Array.from(state.edges.values()).filter(
    (e) =>
      present.has(e.source) &&
      present.has(e.target) &&
      (!linkTypes || e.types.some((t) => linkTypes.has(t)))
  );
  return { visibleNodes: nodes, visibleEdges: edges };
};

export function useGraphStore(): UseGraphStoreReturn {
  const [state, dispatch] = useReducer(graphReducer, undefined, initialGraphState);
  const positionsRef = useRef<PositionStore>();
  if (!positionsRef.current) positionsRef.current = createPositionStore();
  const animatorRef = useRef<PositionAnimator>();
  if (!animatorRef.current) animatorRef.current = createPositionAnimator();

  const { visibleNodes, visibleEdges } = useMemo(
    () => selectVisible(state),
    [state.nodes, state.edges, state.filters, state.rootId, state.hidden]
  );

  return {
    state,
    dispatch,
    positions: positionsRef.current,
    animator: animatorRef.current,
    visibleNodes,
    visibleEdges,
  };
}
