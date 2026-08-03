/**
 * useGraphExplorer — the orchestrator: wires the data layer to the store and
 * drives expand/collapse, follow-edges, search-jump, edge CRUD and
 * perspective save/load. The canvas hook consumes the state this exposes.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useReactory } from '@reactory/client-core/api';
import {
  GraphEdge,
  GraphLinkType,
  GraphNode,
  GraphPerspective,
  Point,
  PositionStore,
} from '../types';
import { useGraphData, UseGraphDataReturn } from './useGraphData';
import {
  collapsibleSubtree,
  containmentSubtree,
  useGraphStore,
  UseGraphStoreReturn,
} from './useGraphStore';
import { forceLayoutEngine, radialExpansionLayout } from '../layouts';
import { synthesizeContainment } from '../utils/graphMapping';
import { DEFAULT_NODE_RADIUS, EXPANSION_REFINE_TICKS } from '../constants';

export interface UseGraphExplorerReturn {
  store: UseGraphStoreReturn;
  data: UseGraphDataReturn;
  loadRoot(catalogNodeId: number, nodeKey?: string): Promise<void>;
  expandNode(node: GraphNode): Promise<void>;
  collapseNode(nodeId: number): void;
  toggleNode(node: GraphNode): Promise<void>;
  showRelated(node: GraphNode, direction: 'dependencies' | 'dependents'): Promise<void>;
  jumpToSearchResult(node: GraphNode): Promise<GraphNode | null>;
  createEdge(from: number, to: number, types: GraphLinkType[], title?: string): Promise<GraphEdge | null>;
  deleteEdge(edgeId: string): Promise<void>;
  /** Force-directed re-alignment of a node's containment subtree (drag end). */
  realignChildren(nodeId: number): void;
  /** Remove nodes from the canvas (view only — never touches server data). */
  removeNodes(nodeIds: number[]): void;
  saveCurrentPerspective(name: string, viewport: { zoom: number; panX: number; panY: number }): Promise<boolean>;
  listPerspectives(catalogNodeId: number | null): Promise<GraphPerspective[]>;
  applyPerspective(perspective: GraphPerspective): Promise<void>;
  restorePerspective(catalogNodeId: number | null): Promise<GraphPerspective | null>;
  deletePerspective(perspective: GraphPerspective): Promise<boolean>;
}

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

  /**
   * Auto-layout for newly merged nodes: deterministic radial fan around the
   * anchor, refined by a bounded synchronous force pass (anchor + existing
   * neighbours pinned), then animated out of the anchor's position.
   */
  const layoutNewNodes = useCallback(
    (newNodes: GraphNode[], edges: GraphEdge[], anchorNode?: GraphNode) => {
      const unplaced = newNodes.filter((n) => !positions.get(n.id));
      if (unplaced.length === 0) return;
      const anchorPosition: Point =
        (anchorNode && positions.get(anchorNode.id)) ?? { x: 0, y: 0 };

      // 1. Deterministic radial targets.
      const { positions: radial } = radialExpansionLayout.layout({
        nodes: unplaced.map((n) => ({ id: n.id, radius: DEFAULT_NODE_RADIUS })),
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
      const pinned = new Map<number, Point>();
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
        nodes: Array.from(participants, (id) => ({ id, radius: DEFAULT_NODE_RADIUS })),
        edges: localEdges.map((e) => ({ source: e.source, target: e.target })),
        pinned,
        seeds: radial,
        anchor: anchorNode
          ? { parentId: anchorNode.id, position: anchorPosition, incomingAngle: 0 }
          : undefined,
      });

      // 3. Spawn at the anchor and tween outward to the refined targets.
      const tweens: Array<{ id: number; from: Point; to: Point }> = [];
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

  const loadRoot = useCallback(
    async (catalogNodeId: number, nodeKey?: string) => {
      const root = await data.getNode(catalogNodeId, nodeKey);
      if (!root) {
        reactory.log(`GraphExplorer: catalog node ${catalogNodeId} not found`, {}, 'warn');
        return;
      }
      dispatch({ type: 'SET_ROOT', node: root });
      positions.clear();
      positions.set(root.id, { x: 0, y: 0 });

      dispatch({ type: 'NODE_LOADING', nodeId: root.id, loading: true });
      try {
        const result = await data.getNeighborhood(root.id, 1);
        layoutNewNodes(result.nodes.filter((n) => n.id !== root.id), result.edges, root);
        dispatch({
          type: 'MERGE_SUBGRAPH',
          nodes: result.nodes,
          edges: result.edges,
          expandedNodeId: root.id,
        });
      } catch (err) {
        dispatch({ type: 'NODE_LOADING', nodeId: root.id, loading: false });
        throw err;
      }
    },
    [data, dispatch, positions, layoutNewNodes, reactory]
  );

  const expandNode = useCallback(
    async (node: GraphNode) => {
      if (stateRef.current.loading.has(node.id)) return;
      dispatch({ type: 'NODE_LOADING', nodeId: node.id, loading: true });
      try {
        const result = await data.getChildren(node.id, node.key);
        layoutNewNodes(result.nodes.filter((n) => n.id !== node.id), result.edges, node);
        dispatch({
          type: 'MERGE_SUBGRAPH',
          nodes: result.nodes,
          edges: result.edges,
          expandedNodeId: node.id,
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
          .filter((t): t is { id: number; from: Point; to: Point } => t !== null),
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
      // Anchor placement on the deepest already-positioned ancestor.
      const anchor = [...ancestorNodes].reverse().find((a) => positions.get(a.id));
      layoutNewNodes(merged, [], anchor ?? undefined);
      dispatch({ type: 'MERGE_SUBGRAPH', nodes: merged, edges: [] });
      dispatch({ type: 'SET_FOCUS', nodeId: resolved.id });
      dispatch({ type: 'SET_SELECTION', nodeIds: [resolved.id] });
      return resolved;
    },
    [data, dispatch, layoutNewNodes, positions]
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
      const pinned = new Map<number, Point>([[nodeId, anchorPosition]]);
      for (const id of subtree) {
        if (current.pinned.has(id)) {
          const p = positions.get(id);
          if (p) pinned.set(id, p);
        }
      }

      const seeds = new Map<number, Point>();
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
        nodes: Array.from(participants, (id) => ({ id, radius: DEFAULT_NODE_RADIUS })),
        edges,
        pinned,
        seeds,
        anchor: { parentId: nodeId, position: anchorPosition, incomingAngle: 0 },
      });

      const tweens: Array<{ id: number; from: Point; to: Point }> = [];
      for (const id of subtree) {
        if (pinned.has(id)) continue;
        const from = positions.get(id);
        const to = refined.get(id);
        if (from && to && (from.x !== to.x || from.y !== to.y)) {
          tweens.push({ id, from, to });
        }
      }
      animator.animateMany(tweens);
    },
    [positions, animator]
  );

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

  const createEdge = useCallback(
    async (from: number, to: number, types: GraphLinkType[], title?: string) => {
      const edge = await data.createLink({ from, to, types, title });
      if (edge) dispatch({ type: 'EDGE_UPSERT', edge });
      return edge;
    },
    [data, dispatch]
  );

  const deleteEdge = useCallback(
    async (edgeId: string) => {
      await data.deleteLink(edgeId);
      dispatch({ type: 'EDGE_DELETE', edgeId });
    },
    [data, dispatch]
  );

  const saveCurrentPerspective = useCallback(
    async (name: string, viewport: { zoom: number; panX: number; panY: number }) => {
      const current = stateRef.current;
      const snapshot = positions.snapshot();
      const perspective: GraphPerspective = {
        name,
        catalogNodeId: current.rootId,
        positions: Array.from(snapshot.entries(), ([nodeId, p]) => ({ nodeId, x: p.x, y: p.y })),
        expanded: Array.from(current.expanded),
        viewport,
      };
      const saved = await data.savePerspective(perspective);
      if (saved) dispatch({ type: 'PIN_NODES', nodeIds: Array.from(snapshot.keys()) });
      return saved;
    },
    [data, dispatch, positions]
  );

  const applyPerspective = useCallback(
    async (perspective: GraphPerspective) => {
      const current = stateRef.current;
      const savedIds = perspective.positions.map((p) => p.nodeId);

      // A perspective stores positions, not node data — re-materialize any
      // saved node that is not currently in the store, plus the persisted
      // edges among the whole saved set, before applying positions.
      const missing = savedIds.filter((id) => !current.nodes.has(id));
      if (missing.length > 0 || perspective.expanded.length > 0) {
        const [fetchedNodes, edges] = await Promise.all([
          missing.length > 0 ? data.getNodes(missing) : Promise.resolve([] as GraphNode[]),
          missing.length > 0 ? data.getEdgesAmong(savedIds) : Promise.resolve([]),
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
      }

      // Nodes already on screen glide to their saved spots; newly
      // materialized ones are placed directly.
      const tweens: Array<{ id: number; from: Point; to: Point }> = [];
      const direct: Array<[number, Point]> = [];
      for (const p of perspective.positions) {
        const target = { x: p.x, y: p.y };
        const existing = current.nodes.has(p.nodeId) ? positions.get(p.nodeId) : undefined;
        if (existing) tweens.push({ id: p.nodeId, from: existing, to: target });
        else direct.push([p.nodeId, target]);
      }
      positions.setMany(direct);
      animator.animateMany(tweens);
      dispatch({ type: 'PIN_NODES', nodeIds: savedIds });
    },
    [data, dispatch, positions, animator]
  );

  const listPerspectives = useCallback(
    (catalogNodeId: number | null) => data.listPerspectives(catalogNodeId),
    [data]
  );

  const deletePerspective = useCallback(
    (perspective: GraphPerspective) => data.deletePerspective(perspective),
    [data]
  );

  const restorePerspective = useCallback(
    async (catalogNodeId: number | null) => {
      const perspective = await data.loadPerspective(catalogNodeId);
      if (!perspective) return null;
      await applyPerspective(perspective);
      return perspective;
    },
    [data, applyPerspective]
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
    expandNode,
    collapseNode,
    toggleNode,
    showRelated,
    jumpToSearchResult,
    createEdge,
    deleteEdge,
    realignChildren,
    removeNodes,
    saveCurrentPerspective,
    listPerspectives,
    applyPerspective,
    restorePerspective,
    deletePerspective,
  };
}

export default useGraphExplorer;
