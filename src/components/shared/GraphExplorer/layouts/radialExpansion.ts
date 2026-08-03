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
