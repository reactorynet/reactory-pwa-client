/**
 * forceLayout — headless d3-force over plain data.
 *
 * Runs a fixed number of synchronous ticks (no rAF, no DOM) and returns final
 * positions. Pinned nodes are fixed via fx/fy so saved/user-dragged layouts
 * are never disturbed. Also exports a stepping API used by the canvas hook to
 * run the global "tidy graph" relayout as time-budgeted chunks inside its own
 * render loop.
 */

import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  Simulation,
} from 'd3-force';
import { GraphLayoutEngine, LayoutRequest, LayoutResult } from './types';
import { Point } from '../types';

interface SimNode {
  id: number;
  radius: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

const buildSimulation = (request: LayoutRequest): Simulation<SimNode, any> => {
  const simNodes: SimNode[] = request.nodes.map((node) => {
    const pinned = request.pinned.get(node.id);
    const seed = request.seeds?.get(node.id);
    return {
      id: node.id,
      radius: node.radius,
      x: pinned?.x ?? seed?.x,
      y: pinned?.y ?? seed?.y,
      fx: pinned ? pinned.x : null,
      fy: pinned ? pinned.y : null,
    };
  });

  const present = new Set(simNodes.map((n) => n.id));
  const simEdges = request.edges
    .filter((e) => present.has(e.source) && present.has(e.target))
    .map((e) => ({ source: e.source, target: e.target }));

  const center = request.anchor?.position ?? { x: 0, y: 0 };

  return forceSimulation<SimNode>(simNodes)
    .force(
      'link',
      forceLink<SimNode, any>(simEdges)
        .id((d: SimNode) => d.id)
        .distance(90)
        .strength(0.4)
    )
    .force('charge', forceManyBody().strength(-220))
    .force('collide', forceCollide<SimNode>().radius((d) => d.radius + 8))
    .force('x', forceX(center.x).strength(0.03))
    .force('y', forceY(center.y).strength(0.03))
    .stop();
};

const extractPositions = (simulation: Simulation<SimNode, any>): Map<number, Point> => {
  const positions = new Map<number, Point>();
  for (const node of simulation.nodes()) {
    positions.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 });
  }
  return positions;
};

/** One-shot layout: run a fixed tick count synchronously. */
export const forceLayoutEngine = (ticks = 200): GraphLayoutEngine => ({
  name: 'force',
  layout(request: LayoutRequest): LayoutResult {
    if (request.nodes.length === 0) return { positions: new Map() };
    const simulation = buildSimulation(request);
    for (let i = 0; i < ticks; i++) simulation.tick();
    return { positions: extractPositions(simulation) };
  },
});

export const forceLayout = forceLayoutEngine();

/**
 * Stepping handle for chunked global relayout: the caller ticks it inside a
 * frame budget and writes intermediate positions into the PositionStore so
 * the graph visibly settles.
 */
export interface SteppingForceLayout {
  /** Ticks until timeBudgetMs elapses. Returns false once converged. */
  step(timeBudgetMs: number): boolean;
  positions(): Map<number, Point>;
  stop(): void;
}

export const createSteppingForceLayout = (request: LayoutRequest): SteppingForceLayout => {
  const simulation = buildSimulation(request);
  let remaining = 300;
  return {
    step(timeBudgetMs: number): boolean {
      const deadline = performance.now() + timeBudgetMs;
      while (remaining > 0 && performance.now() < deadline) {
        simulation.tick();
        remaining--;
      }
      return remaining > 0;
    },
    positions: () => extractPositions(simulation),
    stop: () => {
      remaining = 0;
    },
  };
};
