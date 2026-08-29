/**
 * useGraphWebGLCanvas — three.js lifecycle glue for the 2D graph canvas.
 *
 * Mirrors the proven useWebGLCanvas pattern from the WorkflowDesigner: all
 * managers live in refs, geometry is pushed imperatively when the store or
 * the PositionStore version changes, and a single rAF loop (SceneManager's)
 * drives WebGL + CSS2D rendering. React state is only touched for things the
 * DOM shell needs (hover id, zoom readout, marquee rectangle).
 *
 * Implements the renderer-agnostic GraphCanvasController contract shared with
 * the 3D canvas so the shell never branches on the renderer.
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
  OVERLAY_ACCENT_COLOR,
  SELECTION_RING_COLOR,
  VIEWPORT_ANIMATION_MS,
} from '../constants';
import {
  Bounds,
  GraphCameraState,
  GraphCanvasController,
  GraphEdge,
  GraphNode,
  GraphPoint,
  GraphSelection,
  Point,
  PositionStore,
} from '../types';
import { PositionAnimator } from '../utils/positionAnimator';
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

export interface UseGraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  positions: PositionStore;
  /** Position tween layer — stepped once per frame by this hook. */
  animator: PositionAnimator;
  selection: GraphSelection;
  focusNodeId: number | null;
  expanded: Set<number>;
  /** Nodes with saved/user-dragged positions — "tidy" leaves them alone. */
  pinned: Set<number>;
  events: Partial<GraphCanvasEvents>;
  /** Mount/unmount the renderer without unmounting the hook's owner. */
  active?: boolean;
}

export interface UseGraphWebGLCanvasReturn extends GraphCanvasController {
  viewport: CanvasViewport;
  setViewport(viewport: CanvasViewport): void;
}

const nodeRadius = (node: GraphNode): number =>
  NODE_TYPE_RADII[node.type] ?? DEFAULT_NODE_RADIUS;

/** World point at the viewport centre + zoom  <->  pan offsets. */
const cameraFromViewport = (v: CanvasViewport): GraphCameraState => ({
  target: {
    x: (v.bounds.width / 2 - v.panX) / v.zoom,
    y: (v.bounds.height / 2 - v.panY) / v.zoom,
    z: 0,
  },
  zoom: v.zoom,
});

const viewportFromCamera = (camera: GraphCameraState, bounds: Bounds): CanvasViewport => {
  const zoom = Math.min(4, Math.max(0.05, camera.zoom || 1));
  return {
    zoom,
    panX: bounds.width / 2 - camera.target.x * zoom,
    panY: bounds.height / 2 - camera.target.y * zoom,
    bounds,
  };
};

export function useGraphWebGLCanvas(props: UseGraphCanvasProps): UseGraphWebGLCanvasReturn {
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
  const edgePreviewFromRef = useRef<number | null>(null);

  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [marquee, setMarquee] = useState<Bounds | null>(null);
  const [viewport, setViewportState] = useState<CanvasViewport>({
    zoom: 1,
    panX: 400,
    panY: 300,
    bounds: { x: 0, y: 0, width: 800, height: 600 },
  });

  // Latest props readable from stable callbacks / the render loop.
  const propsRef = useRef(props);
  propsRef.current = props;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const lastPositionsVersion = useRef(-1);
  const active = props.active !== false;

  // -- Geometry sync ---------------------------------------------------------

  const syncGeometry = useCallback(() => {
    const { nodes, edges, positions, selection, focusNodeId } = propsRef.current;
    const zoom = viewportRef.current.zoom;
    const hash = spatialHashRef.current;
    const nodeRenderer = nodeRendererRef.current;
    const edgeRenderer = edgeRendererRef.current;
    const labelRenderer = labelRendererRef.current;
    if (!nodeRenderer || !edgeRenderer) return;

    const byId = new Map<number, { node: GraphNode; position: GraphPoint; radius: number }>();
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

      const accent =
        node.origin === 'overlay'
          ? OVERLAY_ACCENT_COLOR
          : NODE_TYPE_COLORS[node.type] ?? NODE_TYPE_COLORS.UNKNOWN;
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

    // Evict hash entries for nodes no longer rendered — otherwise removed or
    // hidden nodes stay clickable at their last position.
    if (hash.size > nodes.length) {
      for (const id of Array.from(hash.ids())) {
        if (!byId.has(id)) hash.remove(id);
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
        color:
          edge.origin === 'overlay'
            ? OVERLAY_ACCENT_COLOR
            : LINK_TYPE_COLORS[primaryType] ?? LINK_TYPE_COLORS.UNKNOWN,
        width: selection.edgeIds.has(edge.id) ? 3 : 1.5,
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
    (nodeId: number) => {
      const position = propsRef.current.positions.get(nodeId);
      if (!position) return;
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

  const getCamera = useCallback((): GraphCameraState => {
    // Read the tween target when one is running so a save mid-animation
    // persists where the camera is going, not where it started.
    const v = viewportTweenRef.current?.to ?? viewportRef.current;
    return cameraFromViewport({ ...v, bounds: viewportRef.current.bounds });
  }, []);

  const setCamera = useCallback(
    (camera: GraphCameraState, animate = true) => {
      const next = viewportFromCamera(camera, viewportRef.current.bounds);
      if (animate) animateViewportTo(next);
      else applyViewport(next);
    },
    [animateViewportTo, applyViewport]
  );

  // -- Chunked global force layout --------------------------------------------

  const runForceLayout = useCallback(() => {
    const { nodes, edges, positions, pinned: pinnedIds } = propsRef.current;
    // Seed with current positions; user-dragged / perspective-restored nodes
    // stay fixed so "tidy" never undoes deliberate placement.
    const pinned = new Map<number, Point>();
    const seeds = new Map<number, Point>();
    for (const n of nodes) {
      const p = positions.get(n.id);
      if (!p) continue;
      seeds.set(n.id, p);
      if (pinnedIds.has(n.id)) pinned.set(n.id, p);
    }
    // If everything is pinned the layout would be a no-op — let it move all.
    const effectivePinned = pinned.size >= nodes.length ? new Map<number, Point>() : pinned;
    const request: LayoutRequest = {
      nodes: nodes.map((n) => ({ id: n.id, radius: nodeRadius(n) })),
      edges: edges.map((e) => ({ source: e.source, target: e.target })),
      pinned: effectivePinned,
      seeds,
    };
    forceLayoutRef.current?.stop();
    forceLayoutRef.current = createSteppingForceLayout(request);
  }, []);

  const setEdgePreview = useCallback((fromNodeId: number | null) => {
    edgePreviewFromRef.current = fromNodeId;
    if (fromNodeId === null) edgeRendererRef.current?.setPreview(null);
  }, []);

  // -- Initialization ----------------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !active) return undefined;

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

    // Initial viewport: keep the current camera framing at the real size.
    const initialBounds = {
      x: 0,
      y: 0,
      width: container.clientWidth || 800,
      height: container.clientHeight || 600,
    };
    const initial = viewportFromCamera(cameraFromViewport(viewportRef.current), initialBounds);
    viewportRef.current = initial;
    setViewportState(initial);
    scene.setViewport(initial);
    grid.update(initial);

    scene.setResizeCallback((width, height) => {
      labelRenderer.resize(width, height);
      // Preserve the world centre across resizes.
      const camera = cameraFromViewport(viewportRef.current);
      const next = viewportFromCamera(camera, { ...viewportRef.current.bounds, width, height });
      viewportRef.current = next;
      setViewportState(next);
      scene.setViewport(next);
      gridRef.current?.update(next);
      syncGeometry();
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
          const existing = propsRef.current.positions.get(id);
          propsRef.current.positions.set(id, { ...position, z: existing?.z });
          propsRef.current.events.onNodeDrag?.(id, position, phase);
          syncGeometry();
        },
        onEdgeClick: (id, e) => propsRef.current.events.onEdgeClick?.(id, e),
        onCanvasClick: (p, e) => propsRef.current.events.onCanvasClick?.(p, e),
        onCanvasContextMenu: (p, e) => propsRef.current.events.onCanvasContextMenu?.(p, e),
        onMarqueeSelect: (bounds, e) => propsRef.current.events.onMarqueeSelect?.(bounds, e),
        onMarqueeUpdate: (bounds) => {
          setMarquee(bounds);
          propsRef.current.events.onMarqueeUpdate?.(bounds);
        },
        onCanvasPointerMove: (world) => {
          const from = edgePreviewFromRef.current;
          if (from !== null) {
            const origin = propsRef.current.positions.get(from);
            if (origin) edgeRendererRef.current?.setPreview(origin, world);
          }
          propsRef.current.events.onCanvasPointerMove?.(world);
        },
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
        const running = stepping.step(FORCE_FRAME_BUDGET_MS);
        const entries: Array<[number, GraphPoint]> = [];
        for (const [id, p] of stepping.positions()) {
          const existing = propsRef.current.positions.get(id);
          entries.push([id, { ...p, z: existing?.z }]);
        }
        propsRef.current.positions.setMany(entries);
        if (!running) forceLayoutRef.current = null;
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
    syncGeometry();

    return () => {
      forceLayoutRef.current?.stop();
      interaction.dispose();
      labelRenderer.dispose();
      edgeRenderer.dispose();
      nodeRenderer.dispose();
      grid.dispose();
      scene.dispose();
      spatialHashRef.current.clear();
      sceneRef.current = null;
      gridRef.current = null;
      nodeRendererRef.current = null;
      edgeRendererRef.current = null;
      labelRendererRef.current = null;
      interactionRef.current = null;
      setMarquee(null);
      setHoveredNodeId(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Re-sync when the store-derived render set changes.
  useEffect(() => {
    syncGeometry();
  }, [props.nodes, props.edges, props.selection, props.focusNodeId, props.expanded, syncGeometry]);

  return {
    containerRef,
    hoveredNodeId,
    viewport,
    setViewport: applyViewport,
    getCamera,
    setCamera,
    fitToContent,
    focusOn,
    runForceLayout,
    setEdgePreview,
    marquee,
    zoom: viewport.zoom,
  };
}

export default useGraphWebGLCanvas;
