import { SpatialHash } from '../utils/spatialHash';

describe('SpatialHash', () => {
  it('finds entries intersecting a bounds query, including across cell borders', () => {
    const hash = new SpatialHash(100);
    hash.set(1, 50, 50, 10);
    hash.set(2, 95, 95, 10); // straddles the 100-boundary
    hash.set(3, 500, 500, 10);

    const hits = hash.queryBounds({ x: 0, y: 0, width: 100, height: 100 }).sort();
    expect(hits).toEqual([1, 2]);
  });

  it('excludes entries outside the bounds even when sharing a cell', () => {
    const hash = new SpatialHash(1000);
    hash.set(1, 10, 10, 5);
    hash.set(2, 900, 900, 5); // same cell, far away
    expect(hash.queryBounds({ x: 0, y: 0, width: 50, height: 50 })).toEqual([1]);
  });

  it('hit-tests circles with tolerance, preferring the smallest radius', () => {
    const hash = new SpatialHash(100);
    hash.set(1, 50, 50, 30); // big node
    hash.set(2, 55, 55, 8); // small node on top
    expect(hash.hitTest({ x: 55, y: 55 })).toBe(2);
    expect(hash.hitTest({ x: 50, y: 22 })).toBe(1);
    expect(hash.hitTest({ x: 50, y: 15 })).toBeNull();
    expect(hash.hitTest({ x: 50, y: 15 }, 10)).toBe(1);
  });

  it('supports moves and removals', () => {
    const hash = new SpatialHash(100);
    hash.set(1, 50, 50, 10);
    hash.set(1, 250, 250, 10); // move
    expect(hash.queryBounds({ x: 0, y: 0, width: 100, height: 100 })).toEqual([]);
    expect(hash.queryBounds({ x: 200, y: 200, width: 100, height: 100 })).toEqual([1]);
    hash.remove(1);
    expect(hash.size).toBe(0);
    expect(hash.queryBounds({ x: 200, y: 200, width: 100, height: 100 })).toEqual([]);
  });
});
