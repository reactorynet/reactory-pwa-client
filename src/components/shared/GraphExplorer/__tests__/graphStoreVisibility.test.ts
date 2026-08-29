import {
  containmentDepths,
  graphReducer,
  initialGraphState,
  selectVisible,
} from '../hooks/useGraphStore';
import { GraphEdge, GraphNode, GraphPerspective, GraphStoreState } from '../types';

const node = (id: number, parentId: number | null = null, type: GraphNode['type'] = 'FILE'): GraphNode => ({
  id,
  key: parentId === null ? `${id}` : `${parentId}|${id}`,
  parentId,
  type,
  name: `node-${id}`,
  hasChildren: true,
  childCount: null,
});

const edge = (source: number, target: number, types: GraphEdge['types'] = ['DEPENDENCY']): GraphEdge => ({
  id: `${source}->${target}`,
  source,
  target,
  types,
});

const perspective = (): GraphPerspective => ({
  id: 'p1',
  name: 'view',
  isOwner: true,
  catalogNodeId: 1,
  positions: [],
  expanded: [],
  hiddenNodeIds: [],
  filters: { nodeTypes: null, linkTypes: null },
  layout: 'radial',
  viewMode: '2d',
  depth: 1,
  viewport: { target: { x: 0, y: 0, z: 0 }, zoom: 1 },
  share: false,
  isDefault: false,
});

const loaded = (): GraphStoreState => {
  let state = graphReducer(initialGraphState(), { type: 'SET_ROOT', node: node(1, null, 'SYSTEM') });
  state = graphReducer(state, {
    type: 'MERGE_SUBGRAPH',
    nodes: [node(2, 1, 'FOLDER'), node(3, 2), node(4, 1, 'DOCUMENT')],
    edges: [edge(1, 2, ['CONTAINS']), edge(2, 3, ['CONTAINS']), edge(3, 4, ['CALL'])],
    expandedNodeId: 1,
  });
  return state;
};

describe('visibility (hide / unhide / filters)', () => {
  it('HIDE_NODES removes nodes from the render set but keeps them loaded', () => {
    let state = loaded();
    state = graphReducer(state, { type: 'SET_SELECTION', nodeIds: [3] });
    state = graphReducer(state, { type: 'HIDE_NODES', nodeIds: [3, 1] });
    expect(state.hidden.has(3)).toBe(true);
    expect(state.hidden.has(1)).toBe(false); // root can never be hidden
    expect(state.nodes.has(3)).toBe(true);
    expect(state.selection.nodeIds.has(3)).toBe(false);
    const { visibleNodes, visibleEdges } = selectVisible(state);
    expect(visibleNodes.map((n) => n.id).sort()).toEqual([1, 2, 4]);
    // Edges touching hidden nodes disappear with them.
    expect(visibleEdges.map((e) => e.id)).toEqual(['1->2']);
    expect(state.dirty).toBe(true);
  });

  it('UNHIDE_NODES restores selected ids, or everything when unscoped', () => {
    let state = loaded();
    state = graphReducer(state, { type: 'HIDE_NODES', nodeIds: [3, 4] });
    state = graphReducer(state, { type: 'UNHIDE_NODES', nodeIds: [4] });
    expect(Array.from(state.hidden)).toEqual([3]);
    state = graphReducer(state, { type: 'UNHIDE_NODES' });
    expect(state.hidden.size).toBe(0);
  });

  it('type filters apply to every type, never only a curated subset', () => {
    let state = loaded();
    state = graphReducer(state, { type: 'SET_FILTERS', filters: { nodeTypes: new Set(['FOLDER', 'DOCUMENT']) } });
    const { visibleNodes } = selectVisible(state);
    // Root is always kept; FILE (3) is filtered out; DOCUMENT (4) is kept.
    expect(visibleNodes.map((n) => n.id).sort()).toEqual([1, 2, 4]);
    state = graphReducer(state, { type: 'SET_FILTERS', filters: { nodeTypes: null, linkTypes: new Set(['CALL']) } });
    const after = selectVisible(state);
    expect(after.visibleEdges.map((e) => e.id)).toEqual(['3->4']);
  });

  it('REMOVE_NODES and COLLAPSE_NODE drop hidden entries for pruned nodes', () => {
    let state = loaded();
    state = graphReducer(state, { type: 'HIDE_NODES', nodeIds: [3] });
    state = graphReducer(state, { type: 'COLLAPSE_NODE', nodeId: 2 });
    expect(state.nodes.has(3)).toBe(false);
    expect(state.hidden.has(3)).toBe(false);
  });
});

describe('perspective bookkeeping', () => {
  it('SET_PERSPECTIVE clears dirty; subsequent view changes mark dirty', () => {
    let state = loaded();
    state = graphReducer(state, { type: 'SET_PERSPECTIVE', perspective: perspective() });
    expect(state.dirty).toBe(false);
    state = graphReducer(state, { type: 'SET_LAYOUT', layout: 'force' });
    expect(state.dirty).toBe(true);
    state = graphReducer(state, { type: 'SET_PERSPECTIVE', perspective: perspective() });
    state = graphReducer(state, { type: 'MERGE_SUBGRAPH', nodes: [node(9, 1)], edges: [] });
    expect(state.dirty).toBe(true);
  });

  it('SET_ROOT keeps view settings (layout / view mode / depth) but drops the perspective', () => {
    let state = loaded();
    state = graphReducer(state, { type: 'SET_VIEW_MODE', viewMode: '3d' });
    state = graphReducer(state, { type: 'SET_LAYOUT', layout: 'hierarchical' });
    state = graphReducer(state, { type: 'SET_DEPTH', depth: 3 });
    state = graphReducer(state, { type: 'SET_PERSPECTIVE', perspective: perspective() });
    state = graphReducer(state, { type: 'SET_ROOT', node: node(50, null, 'SYSTEM') });
    expect(state.viewMode).toBe('3d');
    expect(state.layout).toBe('hierarchical');
    expect(state.depth).toBe(3);
    expect(state.perspective).toBeNull();
    expect(state.rootId).toBe(50);
  });

  it('MERGE_SUBGRAPH records truncation and merges overlay origins into "both"', () => {
    let state = loaded();
    state = graphReducer(state, {
      type: 'MERGE_SUBGRAPH',
      nodes: [{ ...node(3, 2), origin: 'overlay' }],
      edges: [],
      truncated: true,
    });
    expect(state.truncated).toBe(true);
    // Existing node had no origin recorded ('graph' by mapping); explicit
    // differing origins collapse to 'both'.
    state = graphReducer(state, {
      type: 'MERGE_SUBGRAPH',
      nodes: [{ ...node(3, 2), origin: 'graph' }],
      edges: [],
    });
    expect(state.nodes.get(3)?.origin).toBe('both');
  });
});

describe('edges and depths', () => {
  it('EDGE_UPSERT with replaceId swaps a derived edge for the persisted one', () => {
    let state = loaded();
    state = graphReducer(state, { type: 'SET_SELECTION', edgeIds: ['3->4'] });
    state = graphReducer(state, {
      type: 'EDGE_UPSERT',
      edge: { id: '777', source: 3, target: 4, types: ['CALL', 'REFERENCE'] },
      replaceId: '3->4',
    });
    expect(state.edges.has('3->4')).toBe(false);
    expect(state.edges.get('777')?.types).toEqual(['CALL', 'REFERENCE']);
    expect(state.adjacency.get(3)?.has('777')).toBe(true);
    expect(state.adjacency.get(3)?.has('3->4')).toBe(false);
    expect(state.selection.edgeIds.has('3->4')).toBe(false);
  });

  it('NODE_UPSERT merges updated node data in place', () => {
    let state = loaded();
    state = graphReducer(state, { type: 'NODE_UPSERT', node: { ...node(3, 2), data: { owner: 'team-a' } } });
    expect(state.nodes.get(3)?.data).toEqual({ owner: 'team-a' });
    expect(state.nodes.get(3)?.parentId).toBe(2);
  });

  it('containmentDepths measures distance from the root along parentId', () => {
    const depths = containmentDepths(loaded());
    expect(depths.get(1)).toBe(0);
    expect(depths.get(2)).toBe(1);
    expect(depths.get(3)).toBe(2);
    expect(depths.get(4)).toBe(1);
  });
});
