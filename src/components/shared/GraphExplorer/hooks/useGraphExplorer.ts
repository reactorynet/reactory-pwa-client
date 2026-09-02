/**
 * useGraphExplorer — the orchestrator: wires the data layer to the store and
 * drives expand/collapse, traversal (dependencies, dependents, paths),
 * search-jump, edge/node editing, visibility, layouts and the perspective
 * lifecycle. Renderer-agnostic — the 2D and 3D canvas hooks both consume the
 * state this exposes, and the shell passes the renderer's camera in/out.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useReactory } from '@reactory/client-core/api';
import {
  GraphCameraState,
  GraphEdge,
  GraphLayoutKind,
  GraphLinkType,
  GraphNode,
  GraphOverlay,
  GraphPerspective,
  GraphPoint,
  GraphViewMode,
  PositionStore,
} from '../types';
import { useGraphData, UseGraphDataReturn } from './useGraphData';
import {
  collapsibleSubtree,
  containmentDepths,
  containmentSubtree,
  useGraphStore,
  UseGraphStoreReturn,
} from './useGraphStore';
import { fanRadius, forceLayoutEngine, hierarchicalLayout, radialExpansionLayout, sphericalFan } from '../layouts';
import { DEFAULT_CAMERA, mapOverlay, synthesizeContainment } from '../utils/graphMapping';
import { DEFAULT_NODE_RADIUS, EXPANSION_REFINE_TICKS, NODE_TYPE_RADII, Z_LAYER_SPACING } from '../constants';

export interface PathResult {
  found: boolean;
  nodeIds: number[];
  edgeIds: string[];
}

export interface UseGraphExplorerReturn {
  store: UseGraphStoreReturn;
  data: UseGraphDataReturn;
  loadRoot(catalogNodeId: number, nodeKey?: string, depth?: number): Promise<GraphNode | null>;
  /** Re-fetch the current root's neighbourhood and merge new nodes/edges. */
  refreshRoot(): Promise<void>;
  /** Merge another project root (+1 hop) into the current view (the "+" action). */
  addRootNeighborhood(node: GraphNode): Promise<GraphNode | null>;
  /** Load a root, then apply the owner's default perspective if one exists. */
  openRoot(catalogNodeId: number, nodeKey?: string, depth?: number): Promise<GraphPerspective | null>;
  expandNode(node: GraphNode): Promise<void>;
  collapseNode(nodeId: number): void;
  toggleNode(node: GraphNode): Promise<void>;
  showRelated(node: GraphNode, direction: 'dependencies' | 'dependents'): Promise<void>;
  jumpToSearchResult(node: GraphNode): Promise<GraphNode | null>;
  /** Deep link: hydrate a node by id (ancestry included), select and focus it. */
  hydrateNode(nodeId: number): Promise<GraphNode | null>;
  /** Server shortest path; merges it into the view and selects it. */
  findPathBetween(sourceId: number, targetId: number): Promise<PathResult>;
  createEdge(from: number, to: number, types: GraphLinkType[], title?: string, description?: string): Promise<GraphEdge | null>;
  updateEdge(edge: GraphEdge, types: GraphLinkType[], title?: string, description?: string): Promise<GraphEdge | null>;
  deleteEdge(edgeId: string): Promise<boolean>;
  updateNodeData(nodeId: number, data: Record<string, unknown>): Promise<GraphNode | null>;
  /** Force-directed re-alignment of a node's containment subtree (drag end). */
  realignChildren(nodeId: number): void;
  /** Remove nodes from the canvas (view only — never touches server data). */
  removeNodes(nodeIds: number[]): void;
  /** Hide nodes (persisted in the perspective; Unhide restores them). */
  hideNodes(nodeIds: number[]): void;
  unhideAll(): void;
  /** Re-run a whole-graph layout; unpins everything. */
  applyLayout(layout: GraphLayoutKind, animate?: boolean): void;
  setViewMode(viewMode: GraphViewMode): void;
  /** Merge a host-provided overlay (chat agent nodes/edges) into the view. */
  applyOverlay(overlay: GraphOverlay | null | undefined): void;
  // -- perspectives ---------------------------------------------------------
  snapshotPerspective(camera: GraphCameraState, overrides?: Partial<GraphPerspective>): GraphPerspective;
  /** Update the current perspective in place (must be owned), else create. */
  savePerspective(camera: GraphCameraState, name?: string): Promise<GraphPerspective | null>;
  /** Always create a new perspective from the current view. */
  saveAsPerspective(name: string, camera: GraphCameraState, opts?: { share?: boolean; isDefault?: boolean }): Promise<GraphPerspective | null>;
  renamePerspective(perspective: GraphPerspective, name: string): Promise<GraphPerspective | null>;
  duplicatePerspective(perspective: GraphPerspective, name: string): Promise<GraphPerspective | null>;
  setPerspectiveShare(perspective: GraphPerspective, share: boolean): Promise<GraphPerspective | null>;
  setPerspectiveDefault(perspective: GraphPerspective, isDefault: boolean): Promise<GraphPerspective | null>;
  deletePerspective(perspective: GraphPerspective): Promise<boolean>;
  listPerspectives(): Promise<GraphPerspective[]>;
  /** Materialize + position a perspective; returns its camera for the renderer. */
  applyPerspective(perspective: GraphPerspective): Promise<GraphCameraState>;
  /** Load a perspective by id (root switches if needed). */
  loadPerspectiveById(id: string): Promise<{ perspective: GraphPerspective; camera: GraphCameraState } | null>;
  clearPerspective(): void;
}

const nodeRadius = (node: GraphNode | undefined): number =>
  (node && NODE_TYPE_RADII[node.type]) || DEFAULT_NODE_RADIUS;

/** Direction (radians) from a node's parent toward it — expansion fans outward. */
const outgoingAngle = (positions: PositionStore, node: GraphNode): number => {
  const own = positions.get(node.id);
  const parent = node.parentId !== null ? positions.get(node.parentId) : undefined;
  if (!own || !parent) return Math.random() * Math.PI * 2;
  return Math.atan2(own.y - parent.y, own.x - parent.x);
};

export function useGraphExplorer(): UseGraphExplorerReturn {
  const reactory = useReactory();
  const store = useGraphStore();
  const data = useGraphData();
  const { state, dispatch, positions, animator } = store;
  const stateRef = useRef(state);
  stateRef.current = state;
  /** Nodes whose collapse animation is in flight (guards double-collapse). */
  const collapsingRef = useRef(new Set<number>());

  // -- Layout helpers ----------------------------------------------------------

  /**
   * 3D: y is up. Containment depth gives a gentle vertical offset so nested
   * fans do not sit exactly in the parent's plane.
   */
  const yForDepth = (depth: number, maxDepth: number): number =>
    (depth - maxDepth / 2) * Z_LAYER_SPACING * 0.35;

  /** Azimuth (x/z plane) from a node's parent toward it — 3D fans face outward. */
  const outgoingAzimuth = (node: GraphNode): number => {
    const own = positions.get(node.id);
    const parent = node.parentId !== null ? positions.get(node.parentId) : undefined;
    if (!own || !parent) return Math.random() * Math.PI * 2;
    return Math.atan2((own.z ?? 0) - (parent.z ?? 0), own.x - parent.x);
  };

  /**
   * Auto-layout for newly merged nodes: deterministic radial fan around the
   * anchor, refined by a bounded synchronous force pass (anchor + existing
   * neighbours pinned), then animated out of the anchor's position.
   */
  const layoutNewNodes = useCallback(
    (newNodes: GraphNode[], edges: GraphEdge[], anchorNode?: GraphNode) => {
      const unplaced = newNodes.filter((n) => !positions.get(n.id));
      if (unplaced.length === 0) return;
      const anchorPosition: GraphPoint =
        (anchorNode && positions.get(anchorNode.id)) ?? { x: 0, y: 0, z: 0 };

      if (stateRef.current.viewMode === '3d') {
        // 3D: fan in the horizontal plane around the anchor, opening onto a
        // sphere shell as the fan grows (see sphericalFan).
        const center = { x: anchorPosition.x, y: anchorPosition.y, z: anchorPosition.z ?? 0 };
        const targets = sphericalFan(
          unplaced.length,
          center,
          fanRadius(unplaced.length),
          anchorNode ? outgoingAzimuth(anchorNode) : 0
        );
        const tweens3d: Array<{ id: number; from: GraphPoint; to: GraphPoint }> = [];
        unplaced.forEach((node, i) => {
          positions.set(node.id, { ...center });
          tweens3d.push({ id: node.id, from: { ...center }, to: targets[i] });
        });
        animator.animateMany(tweens3d);
        return;
      }

      // 1. Deterministic radial targets.
      const { positions: radial } = radialExpansionLayout.layout({
        nodes: unplaced.map((n) => ({ id: n.id, radius: nodeRadius(n) })),
        edges: [],
        pinned: new Map(),
        anchor: anchorNode
          ? {
              parentId: anchorNode.id,
              position: anchorPosition,
              incomingAngle: outgoingAngle(positions, anchorNode),
            }
          : undefined,
      });

      // 2. Bounded force refinement seeded from the radial fan; the anchor and
      //    every already-positioned node are pinned so the rest of the graph
      //    never shifts under the user.
      const unplacedIds = new Set(unplaced.map((n) => n.id));
      const pinned = new Map<number, GraphPoint>();
      if (anchorNode) pinned.set(anchorNode.id, anchorPosition);
      const participants = new Set(unplacedIds);
      if (anchorNode) participants.add(anchorNode.id);
      const localEdges = edges.filter(
        (e) => participants.has(e.source) && participants.has(e.target)
      );
      for (const edge of localEdges) {
        for (const endpoint of [edge.source, edge.target]) {
          if (!unplacedIds.has(endpoint)) {
            const existing = positions.get(endpoint);
            if (existing) {
              pinned.set(endpoint, existing);
              participants.add(endpoint);
            }
          }
        }
      }
      const { positions: refined } = forceLayoutEngine(EXPANSION_REFINE_TICKS).layout({
        nodes: Array.from(participants, (id) => ({ id, radius: nodeRadius(stateRef.current.nodes.get(id)) })),
        edges: localEdges.map((e) => ({ source: e.source, target: e.target })),
        pinned,
        seeds: radial,
        anchor: anchorNode
          ? { parentId: anchorNode.id, position: anchorPosition, incomingAngle: 0 }
          : undefined,
      });

      // 3. Spawn at the anchor and tween outward to the refined targets.
      const tweens: Array<{ id: number; from: GraphPoint; to: GraphPoint }> = [];
      for (const node of unplaced) {
        const target = refined.get(node.id) ?? radial.get(node.id);
        if (!target) continue;
        positions.set(node.id, { ...anchorPosition });
        tweens.push({ id: node.id, from: { ...anchorPosition }, to: target });
      }
      animator.animateMany(tweens);
    },
    [positions, animator]
  );

  /**
   * Whole-graph relayout with the chosen engine. Every node moves (the user
   * asked for a fresh arrangement) and pins are cleared afterwards.
   */
  const applyLayout = useCallback(
    (layout: GraphLayoutKind, animate = true) => {
      const current = stateRef.current;
      const nodes = Array.from(current.nodes.values()).filter((n) => !current.hidden.has(n.id));
      if (nodes.length === 0) {
        dispatch({ type: 'SET_LAYOUT', layout });
        return;
      }
      const present = new Set(nodes.map((n) => n.id));
      const edges = Array.from(current.edges.values()).filter(
        (e) => present.has(e.source) && present.has(e.target)
      );
      const rootId = current.rootId ?? nodes[0].id;
      const rootPosition: GraphPoint = positions.get(rootId) ?? { x: 0, y: 0, z: 0 };
      const is3d = current.viewMode === '3d';
      const seeds = new Map<number, GraphPoint>();
      for (const n of nodes) {
        const p = positions.get(n.id);
        if (p) seeds.set(n.id, p);
      }
      const layoutNodes = nodes.map((n) => ({ id: n.id, radius: nodeRadius(n) }));
      const layoutEdges = edges.map((e) => ({ source: e.source, target: e.target }));

      let result: Map<number, GraphPoint>;
      if (layout === 'force') {
        result = forceLayoutEngine(200).layout({
          nodes: layoutNodes,
          edges: layoutEdges,
          pinned: new Map([[rootId, rootPosition]]),
          seeds,
          anchor: { parentId: rootId, position: rootPosition, incomingAngle: 0 },
        }).positions;
      } else if (layout === 'hierarchical') {
        result = hierarchicalLayout.layout({
          nodes: layoutNodes,
          edges: edges
            .filter((e) => e.types.includes('CONTAINS'))
            .map((e) => ({ source: e.source, target: e.target })),
          pinned: new Map(),
        }).positions;
        // Re-centre on the root's current position so the view does not jump.
        const laidRoot = result.get(rootId);
        if (laidRoot) {
          const dx = rootPosition.x - laidRoot.x;
          const dy = rootPosition.y - laidRoot.y;
          for (const [id, p] of result) result.set(id, { x: p.x + dx, y: p.y + dy });
        }
      } else if (is3d) {
        // Radial 3D: BFS over containment; each parent's children fan out in
        // the horizontal plane (opening onto a sphere for large fans).
        result = new Map<number, GraphPoint>([[rootId, { ...rootPosition, z: rootPosition.z ?? 0 }]]);
        const children = new Map<number, GraphNode[]>();
        for (const n of nodes) {
          if (n.parentId !== null && present.has(n.parentId)) {
            const list = children.get(n.parentId) ?? [];
            list.push(n);
            children.set(n.parentId, list);
          }
        }
        const queue: Array<{ id: number; azimuth: number }> = [{ id: rootId, azimuth: 0 }];
        const seen = new Set<number>([rootId]);
        while (queue.length) {
          const { id, azimuth } = queue.shift()!;
          const kids = (children.get(id) ?? []).filter((k) => !seen.has(k.id));
          if (kids.length === 0) continue;
          const anchorPos = result.get(id)!;
          const center = { x: anchorPos.x, y: anchorPos.y, z: anchorPos.z ?? 0 };
          const fan = sphericalFan(kids.length, center, fanRadius(kids.length), azimuth);
          kids.forEach((kid, i) => {
            const p = fan[i];
            seen.add(kid.id);
            result.set(kid.id, p);
            queue.push({ id: kid.id, azimuth: Math.atan2(p.z - center.z, p.x - center.x) });
          });
        }
        // Orphans (no containment path to the root): ring around the root.
        const orphans = layoutNodes.filter((n) => !result.has(n.id));
        if (orphans.length) {
          const ring = sphericalFan(
            orphans.length,
            { x: rootPosition.x, y: rootPosition.y, z: rootPosition.z ?? 0 },
            fanRadius(orphans.length) * 2.2,
            0,
            { ringOnly: true }
          );
          orphans.forEach((o, i) => result.set(o.id, ring[i]));
        }
      } else {
        // Radial: BFS over containment from the root, fanning each parent's
        // children around it with the shared expansion layout.
        result = new Map<number, GraphPoint>([[rootId, rootPosition]]);
        const children = new Map<number, GraphNode[]>();
        for (const n of nodes) {
          if (n.parentId !== null && present.has(n.parentId)) {
            const list = children.get(n.parentId) ?? [];
            list.push(n);
            children.set(n.parentId, list);
          }
        }
        const queue: Array<{ id: number; angle: number }> = [{ id: rootId, angle: 0 }];
        const seen = new Set<number>([rootId]);
        while (queue.length) {
          const { id, angle } = queue.shift()!;
          const kids = (children.get(id) ?? []).filter((k) => !seen.has(k.id));
          if (kids.length === 0) continue;
          const anchorPos = result.get(id)!;
          const fan = radialExpansionLayout.layout({
            nodes: kids.map((k) => ({ id: k.id, radius: nodeRadius(k) })),
            edges: [],
            pinned: new Map(),
            anchor: { parentId: id, position: anchorPos, incomingAngle: angle },
          }).positions;
          for (const kid of kids) {
            const p = fan.get(kid.id);
            if (!p) continue;
            seen.add(kid.id);
            result.set(kid.id, p);
            queue.push({ id: kid.id, angle: Math.atan2(p.y - anchorPos.y, p.x - anchorPos.x) });
          }
        }
        // Orphans (no containment path to the root) keep a force pass.
        const orphans = layoutNodes.filter((n) => !result.has(n.id));
        if (orphans.length) {
          const forced = forceLayoutEngine(120).layout({
            nodes: [...orphans, ...Array.from(result.keys(), (id) => ({ id, radius: nodeRadius(current.nodes.get(id)) }))],
            edges: layoutEdges,
            pinned: new Map(result),
            seeds,
            anchor: { parentId: rootId, position: rootPosition, incomingAngle: 0 },
          }).positions;
          for (const o of orphans) {
            const p = forced.get(o.id);
            if (p) result.set(o.id, p);
          }
        }
      }

      // 3D + a flat (force/hierarchical) layout: lay the plane horizontally
      // (2D y -> z) and stack containment depth gently along the vertical.
      if (is3d && layout !== 'radial') {
        const depths = containmentDepths(current);
        const maxDepth = Math.max(0, ...Array.from(depths.values()));
        for (const [id, p] of result) {
          result.set(id, { x: p.x, y: rootPosition.y + yForDepth(depths.get(id) ?? 0, maxDepth), z: p.y });
        }
      }

      const tweens: Array<{ id: number; from: GraphPoint; to: GraphPoint }> = [];
      const direct: Array<[number, GraphPoint]> = [];
      for (const [id, to] of result) {
        const from = positions.get(id);
        if (from && animate) tweens.push({ id, from, to });
        else direct.push([id, to]);
      }
      positions.setMany(direct);
      animator.animateMany(tweens);
      dispatch({ type: 'UNPIN_ALL' });
      dispatch({ type: 'SET_LAYOUT', layout });
    },
    [dispatch, positions, animator]
  );

  const setViewMode = useCallback(
    (viewMode: GraphViewMode) => {
      const current = stateRef.current;
      if (current.viewMode === viewMode) return;
      dispatch({ type: 'SET_VIEW_MODE', viewMode });
      if (viewMode === '3d') {
        // A flat 2D arrangement is a vertical wall in the orbit view — re-run
        // the current layout in 3D so fans lie in the horizontal plane.
        const snapshot = positions.snapshot();
        const flat = Array.from(snapshot.values()).every((p) => p.z === undefined || p.z === 0);
        if (flat && snapshot.size > 1) {
          // stateRef still holds the 2D view mode; applyLayout reads it, so
          // defer until the dispatch above has landed.
          setTimeout(() => applyLayout(current.layout), 0);
        }
      }
    },
    [dispatch, positions, applyLayout]
  );

  // -- Loading -----------------------------------------------------------------

  const loadRoot = useCallback(
    async (catalogNodeId: number, nodeKey?: string, depth?: number): Promise<GraphNode | null> => {
      const root = await data.getNode(catalogNodeId, nodeKey);
      if (!root) {
        reactory.log(`GraphExplorer: catalog node ${catalogNodeId} not found`, {}, 'warn');
        return null;
      }
      const effectiveDepth = Math.min(Math.max(depth ?? stateRef.current.depth ?? 1, 1), 5);
      dispatch({ type: 'SET_ROOT', node: root });
      dispatch({ type: 'SET_DEPTH', depth: effectiveDepth });
      dispatch({ type: 'MARK_DIRTY', dirty: false });
      animator.clear();
      positions.clear();
      positions.set(root.id, { x: 0, y: 0, z: 0 });

      dispatch({ type: 'NODE_LOADING', nodeId: root.id, loading: true });
      try {
        const result = await data.getNeighborhood(root.id, effectiveDepth);
        layoutNewNodes(result.nodes.filter((n) => n.id !== root.id), result.edges, root);
        const expandedIds = new Set<number>([root.id]);
        // Every node that has children in the result counts as expanded.
        for (const n of result.nodes) if (n.parentId !== null) expandedIds.add(n.parentId);
        dispatch({
          type: 'MERGE_SUBGRAPH',
          nodes: result.nodes,
          edges: result.edges,
          expandedNodeIds: Array.from(expandedIds),
          truncated: result.truncated,
        });
        dispatch({ type: 'MARK_DIRTY', dirty: false });
      } catch (err) {
        dispatch({ type: 'NODE_LOADING', nodeId: root.id, loading: false });
        throw err;
      }
      return root;
    },
    [data, dispatch, positions, animator, layoutNewNodes, reactory]
  );

  /**
   * Merge another project's root + first hop into the CURRENT view without
   * resetting it — the "+" affordance for composing a perspective out of
   * several projects. The new root is placed to the right of the existing
   * content and its children fan out from there.
   */
  const addRootNeighborhood = useCallback(
    async (node: GraphNode): Promise<GraphNode | null> => {
      const current = stateRef.current;
      if (current.loading.has(node.id)) return null;
      dispatch({ type: 'NODE_LOADING', nodeId: node.id, loading: true });
      try {
        // Hydrate via the ancestry key first — the subgraph query alone can
        // return a placeholder for projects that are lazily materialized.
        const hydrated = (await data.getNode(node.id, node.key)) ?? node;
        const result = await data.getNeighborhood(node.id, 1);
        const root = { ...(result.nodes.find((n) => n.id === node.id) ?? {}), ...hydrated };
        if (!result.nodes.some((n) => n.id === node.id)) result.nodes.push(root);
        // Place the incoming root beside the existing content.
        if (!positions.get(node.id)) {
          let maxX = -Infinity;
          let sumY = 0;
          let sumZ = 0;
          let count = 0;
          for (const [id, p] of positions.snapshot()) {
            if (!current.nodes.has(id)) continue;
            maxX = Math.max(maxX, p.x);
            sumY += p.y;
            sumZ += p.z ?? 0;
            count += 1;
          }
          positions.set(node.id, {
            x: (Number.isFinite(maxX) ? maxX : 0) + fanRadius(result.nodes.length) + 260,
            y: count ? sumY / count : 0,
            z: count ? sumZ / count : 0,
          });
        }
        const nodes = result.nodes.map((n) => (n.id === node.id ? root : n));
        layoutNewNodes(nodes.filter((n) => n.id !== node.id), result.edges, root);
        dispatch({
          type: 'MERGE_SUBGRAPH',
          nodes,
          edges: result.edges,
          expandedNodeId: node.id,
          truncated: result.truncated,
        });
        return root;
      } catch (err) {
        dispatch({ type: 'NODE_LOADING', nodeId: node.id, loading: false });
        reactory.log(`GraphExplorer: add-to-view failed for node ${node.id}`, { err }, 'error');
        return null;
      }
    },
    [data, dispatch, positions, layoutNewNodes, reactory]
  );

  /**
   * Re-fetch the root neighbourhood and merge — keeps a live perspective
   * (e.g. the chat conversation) growing without resetting the view.
   */
  const refreshRoot = useCallback(async () => {
    const current = stateRef.current;
    if (current.rootId === null) return;
    const root = current.nodes.get(current.rootId);
    try {
      const result = await data.getNeighborhood(current.rootId, current.depth);
      const fresh = result.nodes.filter((n) => !current.nodes.has(n.id));
      if (fresh.length === 0 && result.edges.every((e) => current.edges.has(e.id))) return;
      layoutNewNodes(fresh, result.edges, root);
      dispatch({
        type: 'MERGE_SUBGRAPH',
        nodes: result.nodes,
        edges: result.edges,
        truncated: result.truncated,
      });
    } catch (err) {
      reactory.log('GraphExplorer: root refresh failed', { err }, 'warn');
    }
  }, [data, dispatch, layoutNewNodes, reactory]);

  const expandNode = useCallback(
    async (node: GraphNode) => {
      if (stateRef.current.loading.has(node.id)) return;
      dispatch({ type: 'NODE_LOADING', nodeId: node.id, loading: true });
      try {
        // One hop of the real graph (containment + dependency edges), not just
        // children — this is what makes expanded siblings show their links.
        const result = await data.getNeighborhood(node.id, 1, { includeContainment: true });
        layoutNewNodes(result.nodes.filter((n) => n.id !== node.id), result.edges, node);
        dispatch({
          type: 'MERGE_SUBGRAPH',
          nodes: result.nodes,
          edges: result.edges,
          expandedNodeId: node.id,
          truncated: result.truncated,
        });
      } catch (err) {
        dispatch({ type: 'NODE_LOADING', nodeId: node.id, loading: false });
        reactory.log(`GraphExplorer: expand failed for node ${node.id}`, { err }, 'error');
      }
    },
    [data, dispatch, layoutNewNodes, reactory]
  );

  /**
   * Animated collapse: the removable subtree tweens back into the collapsed
   * node, then the store prunes it (and its positions) in one dispatch.
   */
  const collapseNode = useCallback(
    (nodeId: number) => {
      if (collapsingRef.current.has(nodeId)) return;
      const current = stateRef.current;
      const center = positions.get(nodeId);
      const doomed = Array.from(collapsibleSubtree(current, nodeId));

      const finish = () => {
        collapsingRef.current.delete(nodeId);
        dispatch({ type: 'COLLAPSE_NODE', nodeId });
        for (const id of doomed) positions.remove(id);
      };

      if (!center || doomed.length === 0) {
        finish();
        return;
      }

      collapsingRef.current.add(nodeId);
      animator.animateMany(
        doomed
          .map((id) => {
            const from = positions.get(id);
            return from ? { id, from, to: { ...center } } : null;
          })
          .filter((t): t is { id: number; from: GraphPoint; to: GraphPoint } => t !== null),
        { onComplete: finish }
      );
    },
    [dispatch, positions, animator]
  );

  const toggleNode = useCallback(
    async (node: GraphNode) => {
      if (stateRef.current.expanded.has(node.id)) collapseNode(node.id);
      else await expandNode(node);
    },
    [collapseNode, expandNode]
  );

  const showRelated = useCallback(
    async (node: GraphNode, direction: 'dependencies' | 'dependents') => {
      const result =
        direction === 'dependencies'
          ? await data.getDependencies(node.id)
          : await data.getDependents(node.id);
      layoutNewNodes(result.nodes.filter((n) => n.id !== node.id), result.edges, node);
      dispatch({ type: 'MERGE_SUBGRAPH', nodes: result.nodes, edges: result.edges });
    },
    [data, dispatch, layoutNewNodes]
  );

  /**
   * Search-jump: hydrate the result's ancestry (walking the `key` path so
   * lazily-materialized nodes resolve), merge, then focus it.
   */
  const jumpToSearchResult = useCallback(
    async (node: GraphNode): Promise<GraphNode | null> => {
      const resolved = (await data.getNode(node.id, node.key)) ?? node;
      const ancestors = resolved.key
        .split('|')
        .map(Number)
        .filter((id) => Number.isFinite(id) && id !== resolved.id);
      const ancestorNodes = await data.getNodes(ancestors);
      const merged = [...ancestorNodes, resolved];
      const containment = synthesizeContainment(merged, Array.from(stateRef.current.edges.values()));
      // Anchor placement on the deepest already-positioned ancestor.
      const anchor = [...ancestorNodes].reverse().find((a) => positions.get(a.id));
      layoutNewNodes(merged, containment, anchor ?? undefined);
      dispatch({ type: 'MERGE_SUBGRAPH', nodes: merged, edges: containment });
      dispatch({ type: 'UNHIDE_NODES', nodeIds: [resolved.id] });
      dispatch({ type: 'SET_FOCUS', nodeId: resolved.id });
      dispatch({ type: 'SET_SELECTION', nodeIds: [resolved.id] });
      return resolved;
    },
    [data, dispatch, layoutNewNodes, positions]
  );

  const hydrateNode = useCallback(
    async (nodeId: number): Promise<GraphNode | null> => {
      const known = stateRef.current.nodes.get(nodeId);
      const node = known ?? (await data.getNode(nodeId));
      if (!node) return null;
      return jumpToSearchResult(node);
    },
    [data, jumpToSearchResult]
  );

  /** BFS over the edges already in the store (containment included). */
  const findLocalPath = useCallback((sourceId: number, targetId: number): PathResult => {
    const current = stateRef.current;
    if (!current.nodes.has(sourceId) || !current.nodes.has(targetId)) {
      return { found: false, nodeIds: [], edgeIds: [] };
    }
    const discoveredBy = new Map<number, GraphEdge>();
    const visited = new Set<number>([sourceId]);
    let frontier = [sourceId];
    while (frontier.length > 0 && !visited.has(targetId)) {
      const next: number[] = [];
      for (const id of frontier) {
        for (const edgeId of current.adjacency.get(id) ?? []) {
          const edge = current.edges.get(edgeId);
          if (!edge) continue;
          const other = edge.source === id ? edge.target : edge.source;
          if (visited.has(other)) continue;
          visited.add(other);
          discoveredBy.set(other, edge);
          next.push(other);
        }
      }
      frontier = next;
    }
    if (!visited.has(targetId)) return { found: false, nodeIds: [], edgeIds: [] };
    const nodeIds = [targetId];
    const edgeIds: string[] = [];
    let cursor = targetId;
    while (cursor !== sourceId) {
      const via = discoveredBy.get(cursor);
      if (!via) break;
      edgeIds.unshift(via.id);
      cursor = via.source === cursor ? via.target : via.source;
      nodeIds.unshift(cursor);
    }
    return { found: true, nodeIds, edgeIds };
  }, []);

  const findPathBetween = useCallback(
    async (sourceId: number, targetId: number): Promise<PathResult> => {
      const result = await data.findPath(sourceId, targetId).catch(() => ({
        found: false,
        nodes: [] as GraphNode[],
        edges: [] as GraphEdge[],
        truncated: false,
      }));
      if (!result.found) {
        // The server walks the persisted graph; the view may hold containment
        // or overlay edges it cannot see — fall back to what is on canvas.
        const local = findLocalPath(sourceId, targetId);
        if (local.found) {
          dispatch({ type: 'UNHIDE_NODES', nodeIds: local.nodeIds });
          dispatch({ type: 'SET_SELECTION', nodeIds: local.nodeIds, edgeIds: local.edgeIds });
        }
        return local;
      }
      const anchor = stateRef.current.nodes.get(sourceId);
      layoutNewNodes(result.nodes, result.edges, anchor);
      dispatch({ type: 'MERGE_SUBGRAPH', nodes: result.nodes, edges: result.edges });
      const nodeIds = result.nodes.map((n) => n.id);
      const edgeIds = result.edges.map((e) => e.id);
      dispatch({ type: 'UNHIDE_NODES', nodeIds });
      dispatch({ type: 'SET_SELECTION', nodeIds, edgeIds });
      return { found: true, nodeIds, edgeIds };
    },
    [data, dispatch, layoutNewNodes]
  );

  /**
   * Drag-end auto layout: the dragged node's containment subtree follows to
   * the new position via a bounded force pass (dragged node + user-pinned
   * children fixed, everything else seeded from where it is), animated.
   */
  const realignChildren = useCallback(
    (nodeId: number) => {
      const current = stateRef.current;
      const anchorPosition = positions.get(nodeId);
      if (!anchorPosition) return;
      const subtree = containmentSubtree(current, nodeId);
      if (subtree.size === 0) return;

      const participants = new Set<number>([nodeId, ...subtree]);
      const pinned = new Map<number, GraphPoint>([[nodeId, anchorPosition]]);
      for (const id of subtree) {
        if (current.pinned.has(id)) {
          const p = positions.get(id);
          if (p) pinned.set(id, p);
        }
      }

      const seeds = new Map<number, GraphPoint>();
      for (const id of participants) {
        const p = positions.get(id);
        if (p) seeds.set(id, p);
      }

      const edges: Array<{ source: number; target: number }> = [];
      for (const edge of current.edges.values()) {
        if (participants.has(edge.source) && participants.has(edge.target)) {
          edges.push({ source: edge.source, target: edge.target });
        }
      }

      const { positions: refined } = forceLayoutEngine(EXPANSION_REFINE_TICKS).layout({
        nodes: Array.from(participants, (id) => ({ id, radius: nodeRadius(current.nodes.get(id)) })),
        edges,
        pinned,
        seeds,
        anchor: { parentId: nodeId, position: anchorPosition, incomingAngle: 0 },
      });

      const tweens: Array<{ id: number; from: GraphPoint; to: GraphPoint }> = [];
      for (const id of subtree) {
        if (pinned.has(id)) continue;
        const from = positions.get(id);
        const to = refined.get(id);
        if (from && to && (from.x !== to.x || from.y !== to.y)) {
          tweens.push({ id, from, to: { ...to, z: from.z } });
        }
      }
      animator.animateMany(tweens);
    },
    [positions, animator]
  );

  // -- Visibility ---------------------------------------------------------------

  const removeNodes = useCallback(
    (nodeIds: number[]) => {
      const removable = nodeIds.filter((id) => id !== stateRef.current.rootId);
      if (removable.length === 0) return;
      dispatch({ type: 'REMOVE_NODES', nodeIds: removable });
      for (const id of removable) {
        animator.cancel(id);
        positions.remove(id);
      }
    },
    [dispatch, positions, animator]
  );

  const hideNodes = useCallback(
    (nodeIds: number[]) => {
      const hideable = nodeIds.filter((id) => id !== stateRef.current.rootId);
      if (hideable.length) dispatch({ type: 'HIDE_NODES', nodeIds: hideable });
    },
    [dispatch]
  );

  const unhideAll = useCallback(() => dispatch({ type: 'UNHIDE_NODES' }), [dispatch]);

  // -- Editing ------------------------------------------------------------------

  const createEdge = useCallback(
    async (from: number, to: number, types: GraphLinkType[], title?: string, description?: string) => {
      const edge = await data.createLink({ from, to, types, title, description });
      if (edge) dispatch({ type: 'EDGE_UPSERT', edge });
      return edge;
    },
    [data, dispatch]
  );

  const updateEdge = useCallback(
    async (edge: GraphEdge, types: GraphLinkType[], title?: string, description?: string) => {
      const updated = await data.updateLink({ from: edge.source, to: edge.target, types, title, description });
      if (updated) dispatch({ type: 'EDGE_UPSERT', edge: updated, replaceId: edge.id });
      return updated;
    },
    [data, dispatch]
  );

  const deleteEdge = useCallback(
    async (edgeId: string): Promise<boolean> => {
      const edge = stateRef.current.edges.get(edgeId);
      if (edge?.synthetic) {
        // Derived/containment edges are not rows — drop them from the view only.
        dispatch({ type: 'EDGE_DELETE', edgeId });
        return false;
      }
      const deleted = await data.deleteLink(edgeId);
      if (deleted) dispatch({ type: 'EDGE_DELETE', edgeId });
      return deleted;
    },
    [data, dispatch]
  );

  const updateNodeData = useCallback(
    async (nodeId: number, payload: Record<string, unknown>) => {
      const updated = await data.updateNodeData(nodeId, payload);
      if (updated) dispatch({ type: 'NODE_UPSERT', node: updated });
      return updated;
    },
    [data, dispatch]
  );

  // -- Overlay ------------------------------------------------------------------

  const applyOverlay = useCallback(
    (overlay: GraphOverlay | null | undefined) => {
      const { nodes, edges } = mapOverlay(overlay);
      if (nodes.length === 0 && edges.length === 0) return;
      const current = stateRef.current;
      const anchor = current.rootId !== null ? current.nodes.get(current.rootId) : undefined;
      const fresh = nodes.filter((n) => !current.nodes.has(n.id));
      layoutNewNodes(fresh, edges, anchor);
      dispatch({ type: 'MERGE_SUBGRAPH', nodes, edges });
    },
    [dispatch, layoutNewNodes]
  );

  // -- Perspectives ---------------------------------------------------------------

  const snapshotPerspective = useCallback(
    (camera: GraphCameraState, overrides: Partial<GraphPerspective> = {}): GraphPerspective => {
      const current = stateRef.current;
      const snapshot = positions.snapshot();
      const base = current.perspective;
      return {
        id: base?.id,
        name: base?.name ?? 'view',
        owner: base?.owner,
        isOwner: base?.isOwner ?? true,
        catalogNodeId: current.rootId,
        projectId: base?.projectId,
        positions: Array.from(snapshot.entries())
          .filter(([nodeId]) => current.nodes.has(nodeId))
          .map(([nodeId, p]) =>
            current.viewMode === '3d' && p.z !== undefined
              ? { nodeId, x: p.x, y: p.y, z: p.z }
              : { nodeId, x: p.x, y: p.y }
          ),
        expanded: Array.from(current.expanded),
        hiddenNodeIds: Array.from(current.hidden),
        filters: {
          nodeTypes: current.filters.nodeTypes ? Array.from(current.filters.nodeTypes) : null,
          linkTypes: current.filters.linkTypes ? Array.from(current.filters.linkTypes) : null,
        },
        layout: current.layout,
        viewMode: current.viewMode,
        depth: current.depth,
        viewport: camera,
        share: base?.share ?? false,
        isDefault: base?.isDefault ?? false,
        ...overrides,
      };
    },
    [positions]
  );

  const persist = useCallback(
    async (perspective: GraphPerspective): Promise<GraphPerspective | null> => {
      const saved = await data.savePerspective(perspective);
      if (saved) {
        dispatch({ type: 'SET_PERSPECTIVE', perspective: saved });
        dispatch({ type: 'PIN_NODES', nodeIds: saved.positions.map((p) => p.nodeId) });
      }
      return saved;
    },
    [data, dispatch]
  );

  const savePerspective = useCallback(
    async (camera: GraphCameraState, name?: string) => {
      const current = stateRef.current.perspective;
      const ownsCurrent = current?.id && current.isOwner;
      const snapshot = snapshotPerspective(camera, {
        id: ownsCurrent ? current!.id : undefined,
        name: name ?? current?.name ?? 'view',
        // A shared (foreign) perspective saves as a new private copy.
        share: ownsCurrent ? current!.share : false,
        isDefault: ownsCurrent ? current!.isDefault : false,
        owner: ownsCurrent ? current!.owner : undefined,
        isOwner: true,
      });
      return persist(snapshot);
    },
    [snapshotPerspective, persist]
  );

  const saveAsPerspective = useCallback(
    async (name: string, camera: GraphCameraState, opts: { share?: boolean; isDefault?: boolean } = {}) =>
      persist(
        snapshotPerspective(camera, {
          id: undefined,
          owner: undefined,
          isOwner: true,
          name,
          share: opts.share ?? false,
          isDefault: opts.isDefault ?? false,
        })
      ),
    [snapshotPerspective, persist]
  );

  /** Metadata-only update — never touches positions/expansion of a stored view. */
  const patchPerspective = useCallback(
    async (perspective: GraphPerspective, patch: Partial<GraphPerspective>) => {
      if (!perspective.id || !perspective.isOwner) return null;
      const saved = await data.savePerspective({ ...perspective, ...patch });
      if (saved && stateRef.current.perspective?.id === saved.id) {
        dispatch({ type: 'SET_PERSPECTIVE', perspective: saved });
      }
      return saved;
    },
    [data, dispatch]
  );

  const renamePerspective = useCallback(
    (perspective: GraphPerspective, name: string) => patchPerspective(perspective, { name }),
    [patchPerspective]
  );
  const setPerspectiveShare = useCallback(
    (perspective: GraphPerspective, share: boolean) => patchPerspective(perspective, { share }),
    [patchPerspective]
  );
  const setPerspectiveDefault = useCallback(
    (perspective: GraphPerspective, isDefault: boolean) => patchPerspective(perspective, { isDefault }),
    [patchPerspective]
  );

  const duplicatePerspective = useCallback(
    (perspective: GraphPerspective, name: string) => data.duplicatePerspective(perspective, name),
    [data]
  );

  const deletePerspective = useCallback(
    async (perspective: GraphPerspective) => {
      const deleted = await data.deletePerspective(perspective);
      if (deleted && stateRef.current.perspective?.id === perspective.id) {
        dispatch({ type: 'SET_PERSPECTIVE', perspective: null });
      }
      return deleted;
    },
    [data, dispatch]
  );

  // The manager lists EVERYTHING the user can see (own + shared, any project)
  // — loading one re-roots the view as needed. Only the default-perspective
  // lookup in openRoot stays scoped to its root.
  const listPerspectives = useCallback(() => data.listPerspectives({}), [data]);

  const applyPerspective = useCallback(
    async (perspective: GraphPerspective): Promise<GraphCameraState> => {
      const current = stateRef.current;
      const savedIds = perspective.positions.map((p) => p.nodeId);

      // View settings first so layout/z decisions below see them.
      dispatch({ type: 'SET_VIEW_MODE', viewMode: perspective.viewMode });
      dispatch({ type: 'SET_LAYOUT', layout: perspective.layout });
      dispatch({ type: 'SET_DEPTH', depth: perspective.depth });
      dispatch({
        type: 'SET_FILTERS',
        filters: {
          nodeTypes: perspective.filters.nodeTypes ? new Set(perspective.filters.nodeTypes) : null,
          linkTypes: perspective.filters.linkTypes ? new Set(perspective.filters.linkTypes) : null,
        },
      });

      // A perspective stores positions, not node data — re-materialize any
      // saved node that is not currently in the store, plus the persisted
      // edges among the whole saved set, before applying positions.
      const missing = savedIds.filter((id) => !current.nodes.has(id));
      const [fetchedNodes, edges] = await Promise.all([
        missing.length > 0 ? data.getNodes(missing) : Promise.resolve([] as GraphNode[]),
        savedIds.length > 0 ? data.getEdgesAmong(savedIds) : Promise.resolve([] as GraphEdge[]),
      ]);
      const presentNodes = savedIds
        .map((id) => current.nodes.get(id))
        .filter((n): n is GraphNode => n !== undefined);
      const containment = synthesizeContainment([...presentNodes, ...fetchedNodes], edges);
      dispatch({
        type: 'MERGE_SUBGRAPH',
        nodes: fetchedNodes,
        edges: [...edges, ...containment],
        expandedNodeIds: perspective.expanded,
      });

      // Nodes already on screen glide to their saved spots; newly
      // materialized ones are placed directly.
      const is3d = perspective.viewMode === '3d';
      const tweens: Array<{ id: number; from: GraphPoint; to: GraphPoint }> = [];
      const direct: Array<[number, GraphPoint]> = [];
      for (const p of perspective.positions) {
        const target: GraphPoint = is3d ? { x: p.x, y: p.y, z: p.z ?? 0 } : { x: p.x, y: p.y, z: p.z };
        const existing = current.nodes.has(p.nodeId) ? positions.get(p.nodeId) : undefined;
        if (existing) tweens.push({ id: p.nodeId, from: existing, to: target });
        else direct.push([p.nodeId, target]);
      }
      positions.setMany(direct);
      animator.animateMany(tweens);

      dispatch({ type: 'UNHIDE_NODES' });
      if (perspective.hiddenNodeIds.length) dispatch({ type: 'HIDE_NODES', nodeIds: perspective.hiddenNodeIds });
      dispatch({ type: 'PIN_NODES', nodeIds: savedIds });
      dispatch({ type: 'SET_PERSPECTIVE', perspective });
      return perspective.viewport ?? DEFAULT_CAMERA;
    },
    [data, dispatch, positions, animator]
  );

  const openRoot = useCallback(
    async (catalogNodeId: number, nodeKey?: string, depth?: number): Promise<GraphPerspective | null> => {
      const root = await loadRoot(catalogNodeId, nodeKey, depth);
      if (!root) return null;
      try {
        const perspectives = await data.listPerspectives({ catalogNodeId: root.id });
        const preferred = perspectives.find((p) => p.isDefault && p.isOwner) ?? null;
        if (preferred) await applyPerspective(preferred);
        return preferred;
      } catch (err) {
        reactory.log('GraphExplorer: default perspective lookup failed', { err }, 'warn');
        return null;
      }
    },
    [loadRoot, data, applyPerspective, reactory]
  );

  const loadPerspectiveById = useCallback(
    async (id: string) => {
      const perspective = await data.getPerspective(id);
      if (!perspective) return null;
      if (perspective.catalogNodeId !== null && perspective.catalogNodeId !== stateRef.current.rootId) {
        await loadRoot(perspective.catalogNodeId, undefined, perspective.depth);
      }
      const camera = await applyPerspective(perspective);
      return { perspective, camera };
    },
    [data, loadRoot, applyPerspective]
  );

  const clearPerspective = useCallback(
    () => dispatch({ type: 'SET_PERSPECTIVE', perspective: null }),
    [dispatch]
  );

  // Surface data-layer errors through the client logger once.
  useEffect(() => {
    if (data.error) reactory.log(`GraphExplorer data error: ${data.error}`, {}, 'error');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.error]);

  return {
    store,
    data,
    loadRoot,
    openRoot,
    refreshRoot,
    addRootNeighborhood,
    expandNode,
    collapseNode,
    toggleNode,
    showRelated,
    jumpToSearchResult,
    hydrateNode,
    findPathBetween,
    createEdge,
    updateEdge,
    deleteEdge,
    updateNodeData,
    realignChildren,
    removeNodes,
    hideNodes,
    unhideAll,
    applyLayout,
    setViewMode,
    applyOverlay,
    snapshotPerspective,
    savePerspective,
    saveAsPerspective,
    renamePerspective,
    duplicatePerspective,
    setPerspectiveShare,
    setPerspectiveDefault,
    deletePerspective,
    listPerspectives,
    applyPerspective,
    loadPerspectiveById,
    clearPerspective,
  };
}

export default useGraphExplorer;
