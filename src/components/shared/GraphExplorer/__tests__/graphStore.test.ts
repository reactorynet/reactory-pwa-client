import {
  createPositionStore,
  graphReducer,
  initialGraphState,
} from '../hooks/useGraphStore';
import { GraphEdge, GraphNode, GraphStoreState } from '../types';

const node = (id: number, parentId: number | null = null): GraphNode => ({
  id,
  key: parentId === null ? `${id}` : `${parentId}|${id}`,
  parentId,
  type: 'FILE',
  name: `node-${id}`,
  hasChildren: true,
  childCount: null,
});

const edge = (source: number, target: number, id?: string): GraphEdge => ({
  id: id ?? `${source}->${target}`,
  source,
  target,
  types: ['DEPENDENCY'],
});

const withRoot = (): GraphStoreState =>
  graphReducer(initialGraphState(), { type: 'SET_ROOT', node: node(1) });

describe('graphReducer', () => {
  it('SET_ROOT resets state around the new root', () => {
    const state = withRoot();
    expect(state.rootId).toBe(1);
    expect(state.nodes.size).toBe(1);
  });

  it('MERGE_SUBGRAPH adds nodes/edges, marks expansion complete and builds adjacency', () => {
    let state = withRoot();
    state = graphReducer(state, { type: 'NODE_LOADING', nodeId: 1, loading: true });
    state = graphReducer(state, {
      type: 'MERGE_SUBGRAPH',
      nodes: [node(2, 1), node(3, 1)],
      edges: [edge(2, 3)],
      expandedNodeId: 1,
    });
    expect(state.nodes.size).toBe(3);
    expect(state.expanded.has(1)).toBe(true);
    expect(state.loading.has(1)).toBe(false);
    expect(state.adjacency.get(2)?.has('2->3')).toBe(true);
    expect(state.adjacency.get(3)?.has('2->3')).toBe(true);
  });

  it('MERGE_SUBGRAPH merges over existing nodes without losing data', () => {
    let state = withRoot();
    state = graphReducer(state, {
      type: 'MERGE_SUBGRAPH',
      nodes: [{ ...node(2, 1), attributes: { language: 'ts' } }],
      edges: [],
    });
    state = graphReducer(state, {
      type: 'MERGE_SUBGRAPH',
      nodes: [node(2, 1)],
      edges: [],
    });
    expect(state.nodes.get(2)?.attributes).toEqual({ language: 'ts' });
  });

  it('COLLAPSE_NODE prunes the containment subtree and its edges', () => {
    let state = withRoot();
    state = graphReducer(state, {
      type: 'MERGE_SUBGRAPH',
      nodes: [node(2, 1), node(3, 2), node(4, 3)],
      edges: [edge(2, 3), edge(3, 4)],
      expandedNodeId: 2,
    });
    state = graphReducer(state, { type: 'COLLAPSE_NODE', nodeId: 2 });
    expect(state.nodes.has(2)).toBe(true); // the collapsed node itself stays
    expect(state.nodes.has(3)).toBe(false);
    expect(state.nodes.has(4)).toBe(false);
    expect(state.edges.size).toBe(0);
    expect(state.expanded.has(2)).toBe(false);
    expect(state.adjacency.has(3)).toBe(false);
  });

  it('COLLAPSE_NODE keeps pinned and selected descendants', () => {
    let state = withRoot();
    state = graphReducer(state, {
      type: 'MERGE_SUBGRAPH',
      nodes: [node(2, 1), node(3, 2)],
      edges: [],
    });
    state = graphReducer(state, { type: 'PIN_NODES', nodeIds: [3] });
    state = graphReducer(state, { type: 'COLLAPSE_NODE', nodeId: 2 });
    expect(state.nodes.has(3)).toBe(true);
  });

  it('SET_SELECTION replaces or extends, and collapse cleans dead selections', () => {
    let state = withRoot();
    state = graphReducer(state, {
      type: 'MERGE_SUBGRAPH',
      nodes: [node(2, 1)],
      edges: [],
    });
    state = graphReducer(state, { type: 'SET_SELECTION', nodeIds: [2] });
    expect(state.selection.nodeIds.has(2)).toBe(true);
    state = graphReducer(state, { type: 'SET_SELECTION', nodeIds: [1], additive: true });
    expect(state.selection.nodeIds.size).toBe(2);
    state = graphReducer(state, { type: 'SET_SELECTION', nodeIds: [] });
    expect(state.selection.nodeIds.size).toBe(0);
  });

  it('REMOVE_NODES prunes nodes, incident edges, pins and selection but never the root', () => {
    let state = withRoot();
    state = graphReducer(state, {
      type: 'MERGE_SUBGRAPH',
      nodes: [node(2, 1), node(3, 1)],
      edges: [edge(1, 2), edge(2, 3)],
      expandedNodeId: 1,
    });
    state = graphReducer(state, { type: 'PIN_NODES', nodeIds: [2] });
    state = graphReducer(state, { type: 'SET_SELECTION', nodeIds: [2] });
    state = graphReducer(state, { type: 'REMOVE_NODES', nodeIds: [1, 2] });
    expect(state.nodes.has(1)).toBe(true); // root survives
    expect(state.nodes.has(2)).toBe(false);
    expect(state.nodes.has(3)).toBe(true);
    expect(state.edges.size).toBe(0); // both edges touched node 2
    expect(state.pinned.has(2)).toBe(false);
    expect(state.selection.nodeIds.size).toBe(0);
    expect(state.adjacency.has(2)).toBe(false);
  });

  it('EDGE_UPSERT and EDGE_DELETE keep adjacency consistent', () => {
    let state = withRoot();
    state = graphReducer(state, {
      type: 'MERGE_SUBGRAPH',
      nodes: [node(2, 1)],
      edges: [],
    });
    state = graphReducer(state, { type: 'EDGE_UPSERT', edge: edge(1, 2, 'e1') });
    expect(state.adjacency.get(1)?.has('e1')).toBe(true);
    state = graphReducer(state, { type: 'EDGE_DELETE', edgeId: 'e1' });
    expect(state.edges.size).toBe(0);
    expect(state.adjacency.has(1)).toBe(false);
  });
});

describe('createPositionStore', () => {
  it('bumps version on writes and snapshots independently', () => {
    const store = createPositionStore();
    const v0 = store.version;
    store.set(1, { x: 10, y: 20 });
    expect(store.version).toBeGreaterThan(v0);
    store.setMany([
      [2, { x: 1, y: 1 }],
      [3, { x: 2, y: 2 }],
    ]);
    const snapshot = store.snapshot();
    expect(snapshot.size).toBe(3);
    store.set(1, { x: 99, y: 99 });
    expect(snapshot.get(1)).toEqual({ x: 10, y: 20 }); // snapshot is detached
    store.remove(2);
    expect(store.get(2)).toBeUndefined();
  });
});
