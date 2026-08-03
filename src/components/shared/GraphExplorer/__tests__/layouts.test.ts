import { radialExpansionLayout } from '../layouts/radialExpansion';
import { forceLayoutEngine } from '../layouts/forceLayout';
import { hierarchicalLayout } from '../layouts/hierarchicalLayout';
import { LayoutRequest } from '../layouts/types';
import { Point } from '../types';

const nodes = (ids: number[], radius = 12) => ids.map((id) => ({ id, radius }));

describe('radialExpansionLayout', () => {
  it('fans children around the anchor at a consistent radius', () => {
    const anchorPos: Point = { x: 100, y: 100 };
    const request: LayoutRequest = {
      nodes: nodes([2, 3, 4, 5]),
      edges: [],
      pinned: new Map(),
      anchor: { parentId: 1, position: anchorPos, incomingAngle: 0 },
    };
    const { positions } = radialExpansionLayout.layout(request);
    expect(positions.size).toBe(4);
    for (const pos of positions.values()) {
      const dist = Math.hypot(pos.x - anchorPos.x, pos.y - anchorPos.y);
      expect(dist).toBeGreaterThan(50);
    }
    // Deterministic: same input, same output.
    const second = radialExpansionLayout.layout(request);
    expect(Array.from(second.positions.entries())).toEqual(Array.from(positions.entries()));
  });

  it('never moves pinned nodes', () => {
    const pinned = new Map<number, Point>([[2, { x: -500, y: -500 }]]);
    const { positions } = radialExpansionLayout.layout({
      nodes: nodes([2, 3]),
      edges: [],
      pinned,
      anchor: { parentId: 1, position: { x: 0, y: 0 }, incomingAngle: 0 },
    });
    expect(positions.get(2)).toEqual({ x: -500, y: -500 });
  });

  it('places distinct positions for every child (no stacking)', () => {
    const { positions } = radialExpansionLayout.layout({
      nodes: nodes([1, 2, 3, 4, 5, 6, 7, 8]),
      edges: [],
      pinned: new Map(),
      anchor: { parentId: 0, position: { x: 0, y: 0 }, incomingAngle: Math.PI / 2 },
    });
    const keys = new Set(
      Array.from(positions.values(), (p) => `${p.x.toFixed(2)}:${p.y.toFixed(2)}`)
    );
    expect(keys.size).toBe(8);
  });
});

describe('forceLayoutEngine', () => {
  it('separates connected nodes without moving pinned ones', () => {
    const pinned = new Map<number, Point>([[1, { x: 0, y: 0 }]]);
    const { positions } = forceLayoutEngine(100).layout({
      nodes: nodes([1, 2, 3]),
      edges: [
        { source: 1, target: 2 },
        { source: 1, target: 3 },
      ],
      pinned,
    });
    expect(positions.get(1)).toEqual({ x: 0, y: 0 });
    const p2 = positions.get(2)!;
    const p3 = positions.get(3)!;
    expect(Math.hypot(p2.x - p3.x, p2.y - p3.y)).toBeGreaterThan(20);
  });

  it('handles empty input', () => {
    expect(forceLayoutEngine(10).layout({ nodes: [], edges: [], pinned: new Map() }).positions.size).toBe(0);
  });
});

describe('hierarchicalLayout', () => {
  it('ranks children below parents (top-bottom)', () => {
    const { positions } = hierarchicalLayout.layout({
      nodes: nodes([1, 2, 3]),
      edges: [
        { source: 1, target: 2 },
        { source: 1, target: 3 },
      ],
      pinned: new Map(),
    });
    const root = positions.get(1)!;
    expect(positions.get(2)!.y).toBeGreaterThan(root.y);
    expect(positions.get(3)!.y).toBeGreaterThan(root.y);
  });

  it('respects pins over dagre placement', () => {
    const pinned = new Map<number, Point>([[2, { x: 777, y: 777 }]]);
    const { positions } = hierarchicalLayout.layout({
      nodes: nodes([1, 2]),
      edges: [{ source: 1, target: 2 }],
      pinned,
    });
    expect(positions.get(2)).toEqual({ x: 777, y: 777 });
  });
});
