/**
 * Layout engine contracts — pure functions over plain data so they are
 * unit-testable without three.js/DOM and portable to a web worker later.
 */

import { Bounds, Point } from '../types';

export interface LayoutNode {
  id: number;
  radius: number;
}

export interface LayoutEdge {
  source: number;
  target: number;
}

export interface LayoutRequest {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  /** Saved/user-dragged positions — never moved by any layout. */
  pinned: Map<number, Point>;
  /** Initial (movable) positions to seed iterative layouts with. */
  seeds?: Map<number, Point>;
  /** Expansion locality: fan new nodes around this parent. */
  anchor?: {
    parentId: number;
    position: Point;
    /** Direction (radians) away from the grandparent; children fan around it. */
    incomingAngle: number;
  };
  bounds?: Bounds;
}

export interface LayoutResult {
  positions: Map<number, Point>;
}

export interface GraphLayoutEngine {
  readonly name: 'radial-expansion' | 'force' | 'hierarchical';
  layout(request: LayoutRequest): LayoutResult;
}
