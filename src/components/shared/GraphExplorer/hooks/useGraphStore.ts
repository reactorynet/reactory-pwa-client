/**
 * useGraphStore — incremental graph state (nodes/edges/expansion/selection)
 * via useReducer, plus a mutable versioned PositionStore that the render loop
 * reads every frame without going through React.
 */

import { useMemo, useReducer, useRef } from 'react';
import {
  GraphEdge,
  GraphNode,
  GraphStoreAction,
  GraphStoreState,
  Point,
  PositionStore,
} from '../types';
import { createPositionAnimator, PositionAnimator } from '../utils/positionAnimator';

export const initialGraphState = (): GraphStoreState => ({
  nodes: new Map(),
  edges: new Map(),
  adjacency: new Map(),
  expanded: new Set(),
  loading: new Set(),
  selection: { nodeIds: new Set(), edgeIds: new Set() },
  focusNodeId: null,
  rootId: null,
  filters: { nodeTypes: null, linkTypes: null },
  pinned: new Set(),
});

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

/**
 * All nodes below `rootId` in the containment (parentId) tree, exclusive of
 * the root itself. Used for collapse pruning and drag-end child realignment.
 */
export const containmentSubtree = (state: GraphStoreState, rootId: number): Set<number> => {
  const subtree = new Set<number>();
  const stack = [rootId];
  while (stack.length) {
    const current = stack.pop()!;
    for (const node of state.nodes.values()) {
      if (node.parentId === current && !subtree.has(node.id)) {
        subtree.add(node.id);
        stack.push(node.id);
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

export const graphReducer = (
  state: GraphStoreState,
  action: GraphStoreAction
): GraphStoreState => {
  switch (action.type) {
    case 'SET_ROOT': {
      const next = initialGraphState();
      next.nodes.set(action.node.id, action.node);
      next.rootId = action.node.id;
      return next;
    }

    case 'MERGE_SUBGRAPH': {
      const nodes = new Map(state.nodes);
      const edges = new Map(state.edges);
      const adjacency = new Map(
        Array.from(state.adjacency.entries(), ([k, v]) => [k, new Set(v)] as [number, Set<string>])
      );
      for (const node of action.nodes) {
        // Merge over existing so richer data (attributes) is not lost.
        const existing = nodes.get(node.id);
        nodes.set(node.id, existing ? { ...existing, ...node } : node);
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
      return { ...state, nodes, edges, adjacency, expanded, loading };
    }

    case 'COLLAPSE_NODE': {
      // Keeps pinned/selected/root nodes even inside the collapsed subtree.
      const doomed = collapsibleSubtree(state, action.nodeId);
      const nodes = new Map(state.nodes);
      const edges = new Map(state.edges);
      const adjacency = new Map(
        Array.from(state.adjacency.entries(), ([k, v]) => [k, new Set(v)] as [number, Set<string>])
      );
      for (const id of doomed) nodes.delete(id);
      for (const edge of Array.from(edges.values())) {
        if (doomed.has(edge.source) || doomed.has(edge.target)) {
          edges.delete(edge.id);
          removeEdgeFromAdjacency(adjacency, edge);
        }
      }
      const expanded = new Set(state.expanded);
      expanded.delete(action.nodeId);
      for (const id of doomed) expanded.delete(id);
      const selection = {
        nodeIds: new Set(Array.from(state.selection.nodeIds).filter((id) => nodes.has(id))),
        edgeIds: new Set(Array.from(state.selection.edgeIds).filter((id) => edges.has(id))),
      };
      const focusNodeId = state.focusNodeId !== null && nodes.has(state.focusNodeId)
        ? state.focusNodeId
        : null;
      return { ...state, nodes, edges, adjacency, expanded, selection, focusNodeId };
    }

    case 'REMOVE_NODES': {
      // View-only removal (never deletes server data). The root stays.
      const doomed = new Set(action.nodeIds.filter((id) => id !== state.rootId));
      if (doomed.size === 0) return state;
      const nodes = new Map(state.nodes);
      const edges = new Map(state.edges);
      const adjacency = new Map(
        Array.from(state.adjacency.entries(), ([k, v]) => [k, new Set(v)] as [number, Set<string>])
      );
      for (const id of doomed) nodes.delete(id);
      for (const edge of Array.from(edges.values())) {
        if (doomed.has(edge.source) || doomed.has(edge.target)) {
          edges.delete(edge.id);
          removeEdgeFromAdjacency(adjacency, edge);
        }
      }
      const expanded = new Set(state.expanded);
      const pinned = new Set(state.pinned);
      for (const id of doomed) {
        expanded.delete(id);
        pinned.delete(id);
      }
      const selection = {
        nodeIds: new Set(Array.from(state.selection.nodeIds).filter((id) => nodes.has(id))),
        edgeIds: new Set(Array.from(state.selection.edgeIds).filter((id) => edges.has(id))),
      };
      const focusNodeId =
        state.focusNodeId !== null && nodes.has(state.focusNodeId) ? state.focusNodeId : null;
      return { ...state, nodes, edges, adjacency, expanded, pinned, selection, focusNodeId };
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
      return { ...state, filters: { ...state.filters, ...action.filters } };

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

    case 'EDGE_UPSERT': {
      const edges = new Map(state.edges);
      const adjacency = new Map(
        Array.from(state.adjacency.entries(), ([k, v]) => [k, new Set(v)] as [number, Set<string>])
      );
      const previous = edges.get(action.edge.id);
      if (previous) removeEdgeFromAdjacency(adjacency, previous);
      edges.set(action.edge.id, action.edge);
      addEdgeToAdjacency(adjacency, action.edge);
      return { ...state, edges, adjacency };
    }

    case 'EDGE_DELETE': {
      const edge = state.edges.get(action.edgeId);
      if (!edge) return state;
      const edges = new Map(state.edges);
      const adjacency = new Map(
        Array.from(state.adjacency.entries(), ([k, v]) => [k, new Set(v)] as [number, Set<string>])
      );
      edges.delete(action.edgeId);
      removeEdgeFromAdjacency(adjacency, edge);
      const edgeIds = new Set(state.selection.edgeIds);
      edgeIds.delete(action.edgeId);
      return { ...state, edges, adjacency, selection: { ...state.selection, edgeIds } };
    }

    case 'RESET':
      return initialGraphState();

    default:
      return state;
  }
};

/** Mutable versioned position store — see PositionStore in types.ts. */
export const createPositionStore = (): PositionStore => {
  const positions = new Map<number, Point>();
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
  /** Nodes/edges passing the active filters (render set). */
  visibleNodes: GraphNode[];
  visibleEdges: GraphEdge[];
}

export function useGraphStore(): UseGraphStoreReturn {
  const [state, dispatch] = useReducer(graphReducer, undefined, initialGraphState);
  const positionsRef = useRef<PositionStore>();
  if (!positionsRef.current) positionsRef.current = createPositionStore();
  const animatorRef = useRef<PositionAnimator>();
  if (!animatorRef.current) animatorRef.current = createPositionAnimator();

  const { visibleNodes, visibleEdges } = useMemo(() => {
    const { nodeTypes, linkTypes } = state.filters;
    const nodes = Array.from(state.nodes.values()).filter(
      (n) => !nodeTypes || nodeTypes.has(n.type) || n.id === state.rootId
    );
    const present = new Set(nodes.map((n) => n.id));
    const edges = Array.from(state.edges.values()).filter(
      (e) =>
        present.has(e.source) &&
        present.has(e.target) &&
        (!linkTypes || e.types.some((t) => linkTypes.has(t)))
    );
    return { visibleNodes: nodes, visibleEdges: edges };
  }, [state.nodes, state.edges, state.filters, state.rootId]);

  return {
    state,
    dispatch,
    positions: positionsRef.current,
    animator: animatorRef.current,
    visibleNodes,
    visibleEdges,
  };
}
