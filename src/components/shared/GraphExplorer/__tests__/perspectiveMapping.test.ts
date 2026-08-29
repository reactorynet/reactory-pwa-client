import { mapOverlay, mapPerspective, toPerspectiveInput } from '../utils/graphMapping';
import { GraphPerspective } from '../types';

describe('mapPerspective', () => {
  it('maps the full wire shape, including 3D positions and world-space camera', () => {
    const mapped = mapPerspective({
      id: 'abc',
      name: 'API review',
      owner: 'u1',
      isOwner: false,
      projectId: 'p1',
      rootNodeId: 42,
      nodePositions: [
        { nodeId: 1, x: 10, y: 20 },
        { nodeId: 2, x: 30, y: 40, z: 50 },
        { nodeId: 'bad', x: 0, y: 0 },
      ],
      expandedKeys: ['1', '2', 'x'],
      hiddenNodeIds: [7, 8],
      filters: { nodeTypes: ['FILE', 'nonsense'], linkTypes: [] },
      layout: 'force',
      viewMode: 'THREE_D',
      depth: 9,
      viewport: { targetX: 1, targetY: 2, targetZ: 3, cameraX: 4, cameraY: 5, cameraZ: 6, zoom: 1.5 },
      share: true,
      isDefault: true,
      updated: '2026-08-29T00:00:00.000Z',
    });
    expect(mapped).not.toBeNull();
    expect(mapped!.isOwner).toBe(false);
    expect(mapped!.catalogNodeId).toBe(42);
    expect(mapped!.positions).toEqual([
      { nodeId: 1, x: 10, y: 20 },
      { nodeId: 2, x: 30, y: 40, z: 50 },
    ]);
    expect(mapped!.expanded).toEqual([1, 2]);
    expect(mapped!.hiddenNodeIds).toEqual([7, 8]);
    expect(mapped!.filters).toEqual({ nodeTypes: ['FILE', 'UNKNOWN'], linkTypes: null });
    expect(mapped!.layout).toBe('force');
    expect(mapped!.viewMode).toBe('3d');
    expect(mapped!.depth).toBe(5); // clamped
    expect(mapped!.viewport).toEqual({
      target: { x: 1, y: 2, z: 3 },
      camera: { x: 4, y: 5, z: 6 },
      zoom: 1.5,
    });
    expect(mapped!.share).toBe(true);
    expect(mapped!.isDefault).toBe(true);
  });

  it('defaults sensibly for legacy records (positions only)', () => {
    const mapped = mapPerspective({ id: '1', name: 'old', rootNodeId: 5, nodePositions: [{ nodeId: 9, x: 1, y: 1 }] });
    expect(mapped).toMatchObject({
      isOwner: true,
      layout: 'radial',
      viewMode: '2d',
      depth: 1,
      hiddenNodeIds: [],
      filters: { nodeTypes: null, linkTypes: null },
      viewport: { target: { x: 0, y: 0, z: 0 }, camera: undefined, zoom: 1 },
      share: false,
      isDefault: false,
    });
  });

  it('rejects unusable input', () => {
    expect(mapPerspective(null)).toBeNull();
    expect(mapPerspective({ id: 'x' })).toBeNull();
  });
});

describe('toPerspectiveInput', () => {
  const perspective: GraphPerspective = {
    id: 'abc',
    name: 'view',
    isOwner: true,
    catalogNodeId: 42,
    projectId: 'p1',
    positions: [
      { nodeId: 1, x: 10, y: 20 },
      { nodeId: 2, x: 30, y: 40, z: 50 },
    ],
    expanded: [1, 2],
    hiddenNodeIds: [7],
    filters: { nodeTypes: ['FILE', 'UNKNOWN'], linkTypes: null },
    layout: 'hierarchical',
    viewMode: '3d',
    depth: 2,
    viewport: { target: { x: 1, y: 2, z: 3 }, camera: { x: 4, y: 5, z: 6 }, zoom: 2 },
    share: true,
    isDefault: false,
  };

  it('produces the ReactorGraphPerspectiveInput wire shape', () => {
    const input = toPerspectiveInput(perspective);
    expect(input).toMatchObject({
      id: 'abc',
      name: 'view',
      projectId: 'p1',
      rootNodeId: 42,
      nodePositions: [
        { nodeId: 1, x: 10, y: 20 },
        { nodeId: 2, x: 30, y: 40, z: 50 },
      ],
      expandedKeys: ['1', '2'],
      hiddenNodeIds: [7],
      filters: { nodeTypes: ['FILE'], linkTypes: null }, // UNKNOWN never reaches the enum
      layout: 'hierarchical',
      viewMode: 'THREE_D',
      depth: 2,
      viewport: { targetX: 1, targetY: 2, targetZ: 3, cameraX: 4, cameraY: 5, cameraZ: 6, zoom: 2 },
      share: true,
      isDefault: false,
    });
  });

  it('round-trips through mapPerspective', () => {
    const input = toPerspectiveInput(perspective);
    const back = mapPerspective({ ...input, isOwner: true });
    expect(back).toEqual({ ...perspective, owner: undefined, updated: undefined, filters: { nodeTypes: ['FILE'], linkTypes: null } });
  });
});

describe('mapOverlay', () => {
  it('normalizes host fragments into overlay-tagged nodes/edges with containment', () => {
    const { nodes, edges } = mapOverlay({
      nodes: [
        { id: '1', name: 'root', type: 'system' },
        { id: 2, name: 'child', type: 'folder', parentId: '1' },
        { id: 'nope', name: 'skip' },
      ],
      edges: [{ source: 1, target: 2 }, { source: 'x', target: 2 }],
    });
    expect(nodes.map((n) => [n.id, n.type, n.origin])).toEqual([
      [1, 'SYSTEM', 'overlay'],
      [2, 'FOLDER', 'overlay'],
    ]);
    // Explicit edge (CONNECTION default) plus synthesized CONTAINS from parentId.
    expect(edges.map((e) => [e.id, e.types[0], e.synthetic, e.origin])).toEqual([
      ['1->2', 'CONNECTION', true, 'overlay'],
      ['1->2', 'CONTAINS', true, 'overlay'],
    ]);
    expect(mapOverlay(null)).toEqual({ nodes: [], edges: [] });
  });
});
