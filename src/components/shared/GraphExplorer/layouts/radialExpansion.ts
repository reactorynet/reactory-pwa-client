/**
 * radialExpansion — deterministic fan placement for freshly expanded children.
 *
 * Children spread over an arc sector centered on the direction away from the
 * grandparent (the anchor's incomingAngle), at a radius scaled by child count
 * so large fans do not overlap. Pinned nodes keep their positions.
 */

import {
  EXPANSION_RADIUS_BASE,
  EXPANSION_RADIUS_PER_10_CHILDREN,
} from '../constants';
import { GraphLayoutEngine, LayoutRequest, LayoutResult } from './types';
import { Point } from '../types';

/** Arc the fan may occupy (radians). Full circle for roots. */
const FAN_ARC = (Math.PI * 4) / 3; // 240°

export const radialExpansionLayout: GraphLayoutEngine = {
  name: 'radial-expansion',

  layout(request: LayoutRequest): LayoutResult {
    const positions = new Map<number, Point>();
    const anchor = request.anchor;
    const center: Point = anchor?.position ?? { x: 0, y: 0 };
    const baseAngle = anchor?.incomingAngle ?? 0;

    const toPlace = request.nodes.filter((n) => !request.pinned.has(n.id));
    for (const node of request.nodes) {
      const pinned = request.pinned.get(node.id);
      if (pinned) positions.set(node.id, { ...pinned });
    }
    if (toPlace.length === 0) return { positions };

    const count = toPlace.length;
    const radius =
      EXPANSION_RADIUS_BASE +
      Math.floor(count / 10) * EXPANSION_RADIUS_PER_10_CHILDREN;

    // A lone child continues straight out from the parent.
    if (count === 1) {
      positions.set(toPlace[0].id, {
        x: center.x + radius * Math.cos(baseAngle),
        y: center.y + radius * Math.sin(baseAngle),
      });
      return { positions };
    }

    // No anchor (root expansion): use the full circle; otherwise a sector
    // centered on the outgoing direction.
    const arc = anchor ? FAN_ARC : Math.PI * 2;
    const step = anchor ? arc / (count - 1) : arc / count;
    const start = baseAngle - arc / 2;

    toPlace.forEach((node, i) => {
      const angle = start + step * i;
      // Alternate two rings when the fan gets dense, so labels stay legible.
      const ring = count > 16 && i % 2 === 1 ? radius * 1.45 : radius;
      positions.set(node.id, {
        x: center.x + ring * Math.cos(angle),
        y: center.y + ring * Math.sin(angle),
      });
    });

    return { positions };
  },
};

export default radialExpansionLayout;

// ============================================================================
// 3D variant
// ============================================================================

/**
 * Places `count` children around `center` for the 3D renderer.
 *
 * Small fans stay in the horizontal plane (x/z — y is up in the orbit view)
 * on an arc centred on `baseAzimuth`, exactly like the 2D fan seen from
 * above. As the fan grows the arc widens to a full ring and the ring opens
 * into latitude bands above and below the plane, until very large fans cover
 * an evenly-spaced sphere shell (golden-angle spiral, equal-area in
 * elevation). Returns positions in insertion order.
 */
export const sphericalFan = (
  count: number,
  center: { x: number; y: number; z: number },
  radius: number,
  baseAzimuth: number,
  opts: { ringOnly?: boolean } = {}
): Array<{ x: number; y: number; z: number }> => {
  const out: Array<{ x: number; y: number; z: number }> = [];
  if (count <= 0) return out;
  // Up to this many children: a flat arc/ring. Beyond FULL_SPHERE_COUNT the
  // shell covers the whole sphere; in between the elevation band grows.
  const FLAT_COUNT = 8;
  const FULL_SPHERE_COUNT = 40;
  const spread = opts.ringOnly
    ? 0
    : Math.min(1, Math.max(0, (count - FLAT_COUNT) / (FULL_SPHERE_COUNT - FLAT_COUNT)));

  if (spread === 0) {
    // Flat: sector for small fans, full ring once it would get crowded.
    const arc = count <= 5 ? FAN_ARC : Math.PI * 2;
    const step = count === 1 ? 0 : arc >= Math.PI * 2 ? arc / count : arc / (count - 1);
    // A lone child continues straight out; sectors centre on the azimuth.
    const start = count === 1 || arc >= Math.PI * 2 ? baseAzimuth : baseAzimuth - arc / 2;
    for (let i = 0; i < count; i++) {
      const a = start + step * i;
      out.push({ x: center.x + radius * Math.cos(a), y: center.y, z: center.z + radius * Math.sin(a) });
    }
    return out;
  }

  // Golden-angle spiral, equal-area in elevation, limited to ±spread of the
  // full hemisphere so the fan grows out of the plane gradually.
  const golden = Math.PI * (3 - Math.sqrt(5));
  const maxSin = spread; // sin(max elevation) — 1 = poles reachable
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count; // 0..1
    const sinElev = maxSin * (2 * t - 1);
    const cosElev = Math.sqrt(Math.max(0, 1 - sinElev * sinElev));
    const a = baseAzimuth + i * golden;
    out.push({
      x: center.x + radius * cosElev * Math.cos(a),
      y: center.y + radius * sinElev,
      z: center.z + radius * cosElev * Math.sin(a),
    });
  }
  return out;
};

/** Radius for a fan of `count` children (shared with the 2D layout). */
export const fanRadius = (count: number): number =>
  EXPANSION_RADIUS_BASE + Math.floor(count / 10) * EXPANSION_RADIUS_PER_10_CHILDREN;
