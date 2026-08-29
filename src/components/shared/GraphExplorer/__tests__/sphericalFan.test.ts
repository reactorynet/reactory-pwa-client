import { fanRadius, sphericalFan } from '../layouts';

const dist = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

describe('sphericalFan (3D child placement)', () => {
  const center = { x: 10, y: 20, z: 30 };

  it('keeps small fans in the horizontal plane at the fan radius', () => {
    const r = fanRadius(4);
    const points = sphericalFan(4, center, r, 0);
    expect(points).toHaveLength(4);
    for (const p of points) {
      expect(p.y).toBeCloseTo(center.y); // y is up — no vertical spread
      expect(dist(p, center)).toBeCloseTo(r);
    }
  });

  it('a single child continues straight along the base azimuth', () => {
    const [p] = sphericalFan(1, center, 100, Math.PI / 2);
    expect(p.x).toBeCloseTo(center.x);
    expect(p.z).toBeCloseTo(center.z + 100);
    expect(p.y).toBeCloseTo(center.y);
  });

  it('spreads out of the plane as the fan grows, symmetrically above and below', () => {
    const r = fanRadius(24);
    const points = sphericalFan(24, center, r, 0);
    const ys = points.map((p) => p.y - center.y);
    expect(Math.max(...ys)).toBeGreaterThan(r * 0.2);
    expect(Math.min(...ys)).toBeLessThan(-r * 0.2);
    // Still not reaching the poles — partial spread.
    expect(Math.max(...ys.map(Math.abs))).toBeLessThan(r * 0.95);
    for (const p of points) expect(dist(p, center)).toBeCloseTo(r);
  });

  it('covers the whole sphere for very large fans', () => {
    const r = fanRadius(80);
    const points = sphericalFan(80, center, r, 0);
    const ys = points.map((p) => (p.y - center.y) / r);
    expect(Math.max(...ys)).toBeGreaterThan(0.9);
    expect(Math.min(...ys)).toBeLessThan(-0.9);
    // Even spacing: no two points closer than a fraction of the mean spacing.
    const meanSpacing = Math.sqrt((4 * Math.PI * r * r) / 80);
    let minPair = Infinity;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) minPair = Math.min(minPair, dist(points[i], points[j]));
    }
    expect(minPair).toBeGreaterThan(meanSpacing * 0.5);
  });

  it('ringOnly forces a flat ring regardless of count', () => {
    const points = sphericalFan(60, center, 200, 0, { ringOnly: true });
    for (const p of points) expect(p.y).toBeCloseTo(center.y);
  });
});
