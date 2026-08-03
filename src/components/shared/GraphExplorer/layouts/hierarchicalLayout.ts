/**
 * hierarchicalLayout — dagre-based layered tree layout for containment mode
 * (SYSTEM → FOLDER → FILE → symbols).
 */

import * as dagre from 'dagre';
import { GraphLayoutEngine, LayoutRequest, LayoutResult } from './types';
import { Point } from '../types';

export const hierarchicalLayout: GraphLayoutEngine = {
  name: 'hierarchical',

  layout(request: LayoutRequest): LayoutResult {
    const positions = new Map<number, Point>();
    if (request.nodes.length === 0) return { positions };

    const graph = new dagre.graphlib.Graph();
    graph.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 90, marginx: 20, marginy: 20 });
    graph.setDefaultEdgeLabel(() => ({}));

    for (const node of request.nodes) {
      const diameter = node.radius * 2;
      graph.setNode(String(node.id), { width: diameter + 24, height: diameter + 24 });
    }
    const present = new Set(request.nodes.map((n) => n.id));
    for (const edge of request.edges) {
      if (present.has(edge.source) && present.has(edge.target)) {
        graph.setEdge(String(edge.source), String(edge.target));
      }
    }

    dagre.layout(graph);

    for (const node of request.nodes) {
      const laid = graph.node(String(node.id));
      const pinned = request.pinned.get(node.id);
      positions.set(
        node.id,
        pinned ? { ...pinned } : { x: laid?.x ?? 0, y: laid?.y ?? 0 }
      );
    }

    return { positions };
  },
};

export default hierarchicalLayout;
