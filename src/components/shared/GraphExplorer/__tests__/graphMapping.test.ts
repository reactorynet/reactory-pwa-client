import {
  mapEdge,
  mapEdges,
  mapNode,
  synthesizeContainment,
  toEndpointId,
} from '../utils/graphMapping';

describe('graphMapping', () => {
  describe('toEndpointId', () => {
    it('normalizes numbers, numeric strings and nested node objects', () => {
      expect(toEndpointId(42)).toBe(42);
      expect(toEndpointId('42')).toBe(42);
      expect(toEndpointId({ id: 42 })).toBe(42);
      expect(toEndpointId({ id: '42' })).toBe(42);
    });

    it('returns null for unresolvable values', () => {
      expect(toEndpointId(null)).toBeNull();
      expect(toEndpointId(undefined)).toBeNull();
      expect(toEndpointId('not-a-number')).toBeNull();
      expect(toEndpointId({})).toBeNull();
    });
  });

  describe('mapNode', () => {
    it('maps a wire node with attribute array to the model', () => {
      const node = mapNode({
        id: 7,
        key: '1|7',
        parentId: 1,
        type: 'FOLDER',
        name: 'src',
        attributes: [{ id: 1, key: 'kind', value: 'folder' }],
        data: { relativePath: 'src' },
      });
      expect(node).toMatchObject({
        id: 7,
        key: '1|7',
        parentId: 1,
        type: 'FOLDER',
        name: 'src',
        hasChildren: true,
      });
      expect(node!.attributes).toEqual({ kind: 'folder' });
    });

    it('marks symlink (noExpand) nodes as not expandable', () => {
      const node = mapNode({
        id: 8,
        type: 'FOLDER',
        name: 'link-to-dir',
        data: { kind: 'symlink', noExpand: true },
      });
      expect(node!.hasChildren).toBe(false);
    });

    it('falls back to UNKNOWN for unrecognized types and rejects id-less nodes', () => {
      expect(mapNode({ id: 9, type: 'ALIEN', name: 'x' })!.type).toBe('UNKNOWN');
      expect(mapNode({ name: 'no-id' })).toBeNull();
    });
  });

  describe('mapEdge', () => {
    it('prefers scalar sourceId/targetId fields', () => {
      const edge = mapEdge({
        id: 5,
        sourceId: 1,
        targetId: 2,
        source: { id: 999 },
        target: { id: 998 },
        types: ['DEPENDENCY'],
      });
      expect(edge).toMatchObject({ id: '5', source: 1, target: 2, types: ['DEPENDENCY'] });
    });

    it('normalizes object-shaped endpoints (the old widget bug)', () => {
      const edge = mapEdge({ id: 6, source: { id: 3 }, target: { id: 4 }, types: ['CALL'] });
      expect(edge).toMatchObject({ source: 3, target: 4 });
    });

    it('normalizes numeric endpoints and legacy single type field', () => {
      const edge = mapEdge({ source: 3, target: 4, type: 'symlink' });
      expect(edge).toMatchObject({ id: '3->4', source: 3, target: 4, types: ['SYMLINK'] });
    });

    it('drops edges with unresolvable endpoints', () => {
      expect(mapEdges([{ source: null, target: 4 }, { source: 1, target: 2 }])).toHaveLength(1);
    });
  });

  describe('synthesizeContainment', () => {
    const nodes = [
      mapNode({ id: 1, type: 'SYSTEM', name: 'root' })!,
      mapNode({ id: 2, parentId: 1, type: 'FOLDER', name: 'src' })!,
      mapNode({ id: 3, parentId: 99, type: 'FILE', name: 'orphan.ts' })!,
    ];

    it('creates CONTAINS edges only for present parents', () => {
      const edges = synthesizeContainment(nodes);
      expect(edges).toHaveLength(1);
      expect(edges[0]).toMatchObject({
        source: 1,
        target: 2,
        types: ['CONTAINS'],
        synthetic: true,
      });
    });

    it('skips pairs already covered by a CONTAINS edge', () => {
      const existing = mapEdge({ id: 12, sourceId: 1, targetId: 2, types: ['CONTAINS'] })!;
      expect(synthesizeContainment(nodes, [existing])).toHaveLength(0);
    });
  });
});
