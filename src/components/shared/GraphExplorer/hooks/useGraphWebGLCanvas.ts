/**
 * useGraphWebGLCanvas — three.js lifecycle glue for the graph canvas.
 *
 * Mirrors the proven useWebGLCanvas pattern from the WorkflowDesigner: all
 * managers live in refs, geometry is pushed imperatively when the store or
 * the PositionStore version changes, and a single rAF loop (SceneManager's)
 * drives WebGL + CSS2D rendering. React state is only touched for things the
 * DOM shell needs (hover id, metrics).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { SceneManager, GridRenderer, CanvasViewport } from '../../webgl-canvas';
import {
  BOARD_BACKGROUND,
  BOARD_GRID_PRIMARY,
  BOARD_GRID_SECONDARY,
  DASHED_LINK_TYPES,
  DEFAULT_NODE_RADIUS,
  FOCUS_RING_COLOR,
  FORCE_FRAME_BUDGET_MS,
  LINK_TYPE_COLORS,
  LOD_ICON_RADIUS_PX,
  LOD_LABEL_RADIUS_PX,
  NODE_TYPE_COLORS,
  NODE_TYPE_RADII,
  SELECTION_RING_COLOR,
} from '../constants';
import {
  GraphEdge,
  GraphNode,
  GraphSelection,
  Point,
  PositionStore,
} from '../types';
import { PositionAnimator } from '../utils/positionAnimator';
import { VIEWPORT_ANIMATION_MS } from '../constants';
import { SpatialHash } from '../utils/spatialHash';
import { NodeRenderer } from '../renderers/NodeRenderer';
import { EdgeRenderer } from '../renderers/EdgeRenderer';
import { GraphLabelRenderer } from '../renderers/GraphLabelRenderer';
import { GraphInteractionManager } from '../renderers/GraphInteractionManager';
import {
  EdgeGeometryData,
  GraphCanvasEvents,
  NodeGeometryData,
  NodeLodTier,
} from '../renderers/types';
import { createSteppingForceLayout, LayoutRequest, SteppingForceLayout } from '../layouts';

export interface UseGraphWebGLCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  positions: PositionStore;
  /** Position tween layer — stepped once per frame by this hook. */
  animator: PositionAnimator;
  selection: GraphSelection;
  focusNodeId: number | null;
  expanded: Set<number>;
  events: Partial<GraphCanvasEvents>;
}

export interface UseGraphWebGLCanvasReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  hoveredNodeId: number | null;
  viewport: CanvasViewport;
  setViewport(viewport: CanvasViewport): void;
  fitToContent(): void;
  focusOn(position: Point): void;
  /** Start a chunked global force relayout ("tidy graph"). */
  runForceLayout(): void;
  setEdgePreview(from: Point | null, to?: Point): void;
  worldToScreen(position: Point): Point;
}

const nodeRadius = (node: GraphNode): number =>
  NODE_TYPE_RADII[node.type] ?? DEFAULT_NODE_RADIUS;

export function useGraphWebGLCanvas(props: UseGraphWebGLCanvasProps): UseGraphWebGLCanvasReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneManager | null>(null);
  const gridRef = useRef<GridRenderer | null>(null);
  const nodeRendererRef = useRef<NodeRenderer | null>(null);
  const edgeRendererRef = useRef<EdgeRenderer | null>(null);
  const labelRendererRef = useRef<GraphLabelRenderer | null>(null);
  const interactionRef = useRef<GraphInteractionManager | null>(null);
  const spatialHashRef = useRef(new SpatialHash());
  const forceLayoutRef = useRef<SteppingForceLayout | null>(null);
  const viewportTweenRef = useRef<{
    from: CanvasViewport;
    to: CanvasViewport;
    start: number;
  } | null>(null);

  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [viewport, setViewportState] = useState<CanvasViewport>({
    zoom: 1,
    panX: 0,
    panY: 0,
    bounds: { x: 0, y: 0, width: 800, height: 600 },
  });

  // Latest props readable from stable callbacks / the render loop.
  const propsRef = useRef(props);
  propsRef.current = props;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const lastPositionsVersion = useRef(-1);

  // -- Geometry sync ---------------------------------------------------------

  const syncGeometry = useCallback(() => {
    const { nodes, edges, positions, selection, focusNodeId } = propsRef.current;
    const zoom = viewportRef.current.zoom;
    const hash = spatialHashRef.current;
    const nodeRenderer = nodeRendererRef.current;
    const edgeRenderer = edgeRendererRef.current;
    const labelRenderer = labelRendererRef.current;
    if (!nodeRenderer || !edgeRenderer) return;

    const byId = new Map<number, { node: GraphNode; position: Point; radius: number }>();
    const nodeGeometry: NodeGeometryData[] = [];

    for (const node of nodes) {
      const position = positions.get(node.id) ?? { x: 0, y: 0 };
      const radius = nodeRadius(node);
      byId.set(node.id, { node, position, radius });
      hash.set(node.id, position.x, position.y, radius);

      const screenRadius = radius * zoom;
      const lodTier: NodeLodTier =
        screenRadius >= LOD_LABEL_RADIUS_PX ? 2 : screenRadius >= LOD_ICON_RADIUS_PX ? 1 : 0;
      const selected = selection.nodeIds.has(node.id);
      const focused = focusNodeId === node.id;
      const collapsed = node.hasChildren && !propsRef.current.expanded.has(node.id);

      const accent = NODE_TYPE_COLORS[node.type] ?? NODE_TYPE_COLORS.UNKNOWN;
      nodeGeometry.push({
        id: node.id,
        position,
        radius,
        color: accent,
        // PCB pad ring: selection gold / focus cyan / type accent otherwise.
        ringColor: focused ? FOCUS_RING_COLOR : selected ? SELECTION_RING_COLOR : accent,
        iconIndex: nodeRenderer.iconIndexFor(node.type),
        selected,
        focused,
        dimmed: false,
        collapsedChildCount: collapsed ? node.childCount ?? 1 : 0,
        label: node.name,
        lodTier,
      });
    }

    // Prune hash entries for removed nodes.
    if (hash.size > nodes.length) {
      const present = new Set(nodes.map((n) => n.id));
      for (const geometry of nodeGeometry) present.add(geometry.id);
      // SpatialHash has no iteration API; rebuild when counts diverge a lot.
      if (hash.size > nodes.length * 1.5 + 16) {
        hash.clear();
        for (const { node, position, radius } of byId.values()) {
          hash.set(node.id, position.x, position.y, radius);
        }
      }
    }

    const edgeGeometry: EdgeGeometryData[] = [];
    for (const edge of edges) {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      if (!source || !target) continue;
      // Shorten endpoints to the node rims so arrows sit outside the circle.
      const dx = target.position.x - source.position.x;
      const dy = target.position.y - source.position.y;
      const length = Math.hypot(dx, dy) || 1;
      const ux = dx / length;
      const uy = dy / length;
      const primaryType = edge.types[0] ?? 'UNKNOWN';
      edgeGeometry.push({
        id: edge.id,
        source: {
          x: source.position.x + ux * source.radius,
          y: source.position.y + uy * source.radius,
        },
        target: {
          x: target.position.x - ux * target.radius,
          y: target.position.y - uy * target.radius,
        },
        color: LINK_TYPE_COLORS[primaryType] ?? LINK_TYPE_COLORS.UNKNOWN,
        width: 1.5,
        directed: primaryType !== 'CONTAINS' && primaryType !== 'CONNECTION',
        dashed: edge.types.some((t) => DASHED_LINK_TYPES.includes(t)),
        selected: selection.edgeIds.has(edge.id),
      });
    }

    nodeRenderer.updateNodes(nodeGeometry);
    edgeRenderer.updateEdges(edgeGeometry);
    labelRenderer?.updateLabels(nodeGeometry);
    interactionRef.current?.updateState(hash, edgeGeometry, viewportRef.current);
  }, []);

  // -- Viewport --------------------------------------------------------------

  const applyViewport = useCallback((next: CanvasViewport) => {
    viewportTweenRef.current = null; // direct set cancels any running tween
    viewportRef.current = next;
    setViewportState(next);
    sceneRef.current?.setViewport(next);
    gridRef.current?.update(next);
    syncGeometry(); // LOD tiers depend on zoom
    propsRef.current.events.onViewportChange?.(next);
  }, [syncGeometry]);

  /** Tween pan/zoom toward a target; stepped by the render loop. */
  const animateViewportTo = useCallback((to: CanvasViewport) => {
    viewportTweenRef.current = {
      from: { ...viewportRef.current, bounds: { ...viewportRef.current.bounds } },
      to,
      start: performance.now(),
    };
  }, []);

  const fitToContent = useCallback(() => {
    const { nodes, positions } = propsRef.current;
    const bounds = viewportRef.current.bounds;
    if (nodes.length === 0) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of nodes) {
      const p = positions.get(node.id);
      if (!p) continue;
      const r = nodeRadius(node);
      minX = Math.min(minX, p.x - r);
      minY = Math.min(minY, p.y - r);
      maxX = Math.max(maxX, p.x + r);
      maxY = Math.max(maxY, p.y + r);
    }
    if (!Number.isFinite(minX)) return;
    const contentWidth = Math.max(maxX - minX, 1);
    const contentHeight = Math.max(maxY - minY, 1);
    const zoom = Math.min(
      3,
      Math.max(0.05, Math.min((bounds.width * 0.85) / contentWidth, (bounds.height * 0.85) / contentHeight))
    );
    animateViewportTo({
      ...viewportRef.current,
      zoom,
      panX: bounds.width / 2 - (minX + contentWidth / 2) * zoom,
      panY: bounds.height / 2 - (minY + contentHeight / 2) * zoom,
    });
  }, [animateViewportTo]);

  const focusOn = useCallback(
    (position: Point) => {
      const { bounds, zoom } = viewportRef.current;
      const targetZoom = Math.max(zoom, 0.8);
      animateViewportTo({
        ...viewportRef.current,
        zoom: targetZoom,
        panX: bounds.width / 2 - position.x * targetZoom,
        panY: bounds.height / 2 - position.y * targetZoom,
      });
    },
    [animateViewportTo]
  );

  // -- Chunked global force layout --------------------------------------------

  const runForceLayout = useCallback(() => {
    const { nodes, edges, positions } = propsRef.current;
    const pinned = new Map<number, Point>();
    // Seed the simulation with current positions but let everything move —
    // pins are respected by expansion layouts; "tidy" reflows the whole graph.
    const request: LayoutRequest = {
      nodes: nodes.map((n) => ({ id: n.id, radius: nodeRadius(n) })),
      edges: edges.map((e) => ({ source: e.source, target: e.target })),
      pinned,
    };
    forceLayoutRef.current?.stop();
    forceLayoutRef.current = createSteppingForceLayout(request);
  }, []);

  // -- Initialization ----------------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    // PCB theme: dark green board with copper-mask grid lines.
    const scene = new SceneManager({}, { backgroundColor: BOARD_BACKGROUND });
    scene.initialize(container);
    sceneRef.current = scene;

    const grid = new GridRenderer({
      primaryColor: BOARD_GRID_PRIMARY,
      secondaryColor: BOARD_GRID_SECONDARY,
      opacity: 0.55,
    });
    grid.initialize(scene.getScene());
    gridRef.current = grid;

    const nodeRenderer = new NodeRenderer();
    nodeRenderer.initialize(scene.getScene());
    nodeRendererRef.current = nodeRenderer;

    const edgeRenderer = new EdgeRenderer();
    edgeRenderer.initialize(scene.getScene());
    edgeRendererRef.current = edgeRenderer;

    const labelRenderer = new GraphLabelRenderer();
    labelRenderer.initialize(
      scene.getScene(),
      container,
      container.clientWidth || 800,
      container.clientHeight || 600
    );
    labelRendererRef.current = labelRenderer;
    scene.setResizeCallback((width, height) => {
      labelRenderer.resize(width, height);
      const next = { ...viewportRef.current, bounds: { ...viewportRef.current.bounds, width, height } };
      viewportRef.current = next;
      setViewportState(next);
    });

    const interaction = new GraphInteractionManager();
    const canvas = scene.getCanvas();
    if (canvas) {
      interaction.initialize(canvas);
      interaction.setEventHandlers({
        onNodeClick: (id, e) => propsRef.current.events.onNodeClick?.(id, e),
        onNodeDoubleClick: (id, e) => propsRef.current.events.onNodeDoubleClick?.(id, e),
        onNodeContextMenu: (id, e) => propsRef.current.events.onNodeContextMenu?.(id, e),
        onNodeHover: (id) => {
          setHoveredNodeId(id);
          nodeRendererRef.current?.setHighlight(id);
          propsRef.current.events.onNodeHover?.(id);
        },
        onNodeDrag: (id, position, phase) => {
          // A user drag overrides any in-flight tween for the node.
          propsRef.current.animator.cancel(id);
          propsRef.current.positions.set(id, position);
          propsRef.current.events.onNodeDrag?.(id, position, phase);
          syncGeometry();
        },
        onEdgeClick: (id, e) => propsRef.current.events.onEdgeClick?.(id, e),
        onCanvasClick: (p, e) => propsRef.current.events.onCanvasClick?.(p, e),
        onCanvasContextMenu: (p, e) => propsRef.current.events.onCanvasContextMenu?.(p, e),
        onMarqueeSelect: (bounds, e) => propsRef.current.events.onMarqueeSelect?.(bounds, e),
        onViewportChange: (v) => applyViewport(v),
      });
    }
    interactionRef.current = interaction;

    // Per-frame: step position tweens (expand/collapse animation) and any
    // running chunked force layout, advance viewport tweens, then re-sync
    // when the PositionStore version moved (drag, tween, layout, perspective).
    scene.setPostRenderCallback(() => {
      propsRef.current.animator.step(propsRef.current.positions);

      const stepping = forceLayoutRef.current;
      if (stepping) {
        const active = stepping.step(FORCE_FRAME_BUDGET_MS);
        propsRef.current.positions.setMany(Array.from(stepping.positions().entries()));
        if (!active) forceLayoutRef.current = null;
      }

      const tween = viewportTweenRef.current;
      if (tween) {
        const t = Math.min(1, (performance.now() - tween.start) / VIEWPORT_ANIMATION_MS);
        const eased = 1 - Math.pow(1 - t, 3);
        const next: CanvasViewport = {
          ...tween.to,
          bounds: viewportRef.current.bounds,
          zoom: tween.from.zoom + (tween.to.zoom - tween.from.zoom) * eased,
          panX: tween.from.panX + (tween.to.panX - tween.from.panX) * eased,
          panY: tween.from.panY + (tween.to.panY - tween.from.panY) * eased,
        };
        // Refs + scene only while tweening; React state commits once at the end.
        viewportRef.current = next;
        scene.setViewport(next);
        gridRef.current?.update(next);
        syncGeometry();
        if (t >= 1) {
          viewportTweenRef.current = null;
          setViewportState(next);
          propsRef.current.events.onViewportChange?.(next);
        }
      }

      if (propsRef.current.positions.version !== lastPositionsVersion.current) {
        lastPositionsVersion.current = propsRef.current.positions.version;
        syncGeometry();
      }
      labelRenderer.render(scene.getCamera());
    });

    scene.startRenderLoop();

    return () => {
      forceLayoutRef.current?.stop();
      interaction.dispose();
      labelRenderer.dispose();
      edgeRenderer.dispose();
      nodeRenderer.dispose();
      grid.dispose();
      scene.dispose();
      sceneRef.current = null;
      gridRef.current = null;
      nodeRendererRef.current = null;
      edgeRendererRef.current = null;
      labelRendererRef.current = null;
      interactionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync when the store-derived render set changes.
  useEffect(() => {
    syncGeometry();
  }, [props.nodes, props.edges, props.selection, props.focusNodeId, props.expanded, syncGeometry]);

  const setEdgePreview = useCallback((from: Point | null, to?: Point) => {
    edgeRendererRef.current?.setPreview(from, to);
  }, []);

  const worldToScreen = useCallback(
    (position: Point): Point =>
      interactionRef.current?.worldToScreen(position) ?? position,
    []
  );

  return {
    containerRef,
    hoveredNodeId,
    viewport,
    setViewport: applyViewport,
    fitToContent,
    focusOn,
    runForceLayout,
    setEdgePreview,
    worldToScreen,
  };
}

export default useGraphWebGLCanvas;
