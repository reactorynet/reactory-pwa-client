/**
 * useGraph3DCanvas — three.js perspective-camera renderer for the graph.
 *
 * Same inputs and the same GraphCanvasController contract as the 2D canvas
 * hook, so the shell, toolbar, perspective manager and keyboard handling are
 * shared verbatim. Differences are purely presentational:
 *  - orbit camera (drag rotates, shift/right-drag pans, wheel dollies);
 *  - instanced spheres coloured by node type, line segments for edges,
 *    sprite labels with distance LOD, ambient particles;
 *  - node drag on the camera-facing plane through the node;
 *  - raycast hit testing against the instanced mesh (no per-node loop).
 *
 * Positions come from the shared PositionStore; `z` is read when present so
 * a perspective saved in 3D round-trips exactly, and 2D perspectives simply
 * render flat until the user spreads or tidies them.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  CAMERA_3D_DISTANCE,
  CAMERA_3D_FOV,
  CAMERA_3D_MAX_DISTANCE,
  CAMERA_3D_MIN_DISTANCE,
  DEFAULT_NODE_RADIUS,
  FOCUS_RING_COLOR,
  FORCE_FRAME_BUDGET_MS,
  LABEL_3D_MAX_DISTANCE,
  LINK_TYPE_COLORS,
  MAX_VISIBLE_LABELS_3D,
  NODE_3D_RADIUS_SCALE,
  NODE_TYPE_COLORS,
  NODE_TYPE_RADII,
  OVERLAY_ACCENT_COLOR,
  SELECTION_RING_COLOR,
  SPACE_BACKGROUND,
  VIEWPORT_ANIMATION_MS,
} from '../constants';
import {
  GraphCameraState,
  GraphCanvasController,
  GraphInteractionEvent,
  GraphNode,
  GraphPoint,
} from '../types';
import { createSteppingForceLayout, LayoutRequest, SteppingForceLayout } from '../layouts';
import { UseGraphCanvasProps } from './useGraphWebGLCanvas';

export interface UseGraph3DCanvasProps extends UseGraphCanvasProps {
  backgroundColor?: number;
  primaryColor?: string;
  secondaryColor?: string;
}

interface OrbitState {
  target: THREE.Vector3;
  theta: number;
  phi: number;
  distance: number;
}

interface CameraTween {
  from: OrbitState;
  to: OrbitState;
  start: number;
}

const nodeRadius = (node: GraphNode): number =>
  (NODE_TYPE_RADII[node.type] ?? DEFAULT_NODE_RADIUS) * NODE_3D_RADIUS_SCALE;

const orbitToCamera = (orbit: OrbitState): GraphCameraState => {
  const sinPhi = Math.sin(orbit.phi);
  return {
    target: { x: orbit.target.x, y: orbit.target.y, z: orbit.target.z },
    camera: {
      x: orbit.target.x + orbit.distance * sinPhi * Math.sin(orbit.theta),
      y: orbit.target.y + orbit.distance * Math.cos(orbit.phi),
      z: orbit.target.z + orbit.distance * sinPhi * Math.cos(orbit.theta),
    },
    zoom: CAMERA_3D_DISTANCE / Math.max(orbit.distance, 1),
  };
};

const cameraToOrbit = (camera: GraphCameraState): OrbitState => {
  const target = new THREE.Vector3(camera.target.x, camera.target.y, camera.target.z ?? 0);
  if (!camera.camera) {
    // 2D perspective: look straight down the z axis from a zoom-derived distance.
    return {
      target,
      theta: 0,
      phi: Math.PI / 2 - 0.35,
      distance: THREE.MathUtils.clamp(
        CAMERA_3D_DISTANCE / Math.max(camera.zoom || 1, 0.05),
        CAMERA_3D_MIN_DISTANCE,
        CAMERA_3D_MAX_DISTANCE
      ),
    };
  }
  const offset = new THREE.Vector3(camera.camera.x, camera.camera.y, camera.camera.z).sub(target);
  const distance = Math.max(offset.length(), CAMERA_3D_MIN_DISTANCE);
  return {
    target,
    theta: Math.atan2(offset.x, offset.z),
    phi: Math.acos(THREE.MathUtils.clamp(offset.y / distance, -1, 1)),
    distance,
  };
};

const cloneOrbit = (orbit: OrbitState): OrbitState => ({ ...orbit, target: orbit.target.clone() });

/** Canvas-texture label sprite cache keyed by text so re-syncs reuse textures. */
class LabelSprites {
  private cache = new Map<string, THREE.Sprite>();
  private active = new Set<string>();
  constructor(private scene: THREE.Scene, private color: string) {}

  begin(): void {
    this.active.clear();
  }

  place(id: number, text: string, position: GraphPoint, radius: number, emphasis: boolean): void {
    const key = `${id}`;
    let sprite = this.cache.get(key);
    if (!sprite || sprite.userData.text !== text || sprite.userData.emphasis !== emphasis) {
      if (sprite) {
        this.scene.remove(sprite);
        (sprite.material as THREE.SpriteMaterial).map?.dispose();
        sprite.material.dispose();
      }
      sprite = this.make(text, emphasis);
      sprite.userData.text = text;
      sprite.userData.emphasis = emphasis;
      this.cache.set(key, sprite);
      this.scene.add(sprite);
    }
    sprite.position.set(position.x, position.y + radius + 14, position.z ?? 0);
    sprite.visible = true;
    this.active.add(key);
  }

  end(): void {
    for (const [key, sprite] of this.cache) {
      if (!this.active.has(key)) sprite.visible = false;
    }
  }

  private make(text: string, emphasis: boolean): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = emphasis ? 'bold 40px monospace' : '34px monospace';
      ctx.fillStyle = this.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 8;
      let display = text;
      const maxWidth = canvas.width - 24;
      while (ctx.measureText(display).width > maxWidth && display.length > 4) display = display.slice(0, -2);
      if (display !== text) display += '…';
      ctx.fillText(display, canvas.width / 2, canvas.height / 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(emphasis ? 160 : 128, emphasis ? 30 : 24, 1);
    return sprite;
  }

  dispose(): void {
    for (const sprite of this.cache.values()) {
      this.scene.remove(sprite);
      (sprite.material as THREE.SpriteMaterial).map?.dispose();
      sprite.material.dispose();
    }
    this.cache.clear();
  }
}

export function useGraph3DCanvas(props: UseGraph3DCanvasProps): GraphCanvasController {
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const active = props.active !== false;

  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const orbitRef = useRef<OrbitState>({
    target: new THREE.Vector3(0, 0, 0),
    theta: 0.4,
    phi: Math.PI / 2 - 0.35,
    distance: CAMERA_3D_DISTANCE,
  });
  const cameraTweenRef = useRef<CameraTween | null>(null);
  const syncRef = useRef<() => void>(() => undefined);
  const forceLayoutRef = useRef<SteppingForceLayout | null>(null);
  const edgePreviewFromRef = useRef<number | null>(null);
  const edgePreviewToRef = useRef<THREE.Vector3 | null>(null);

  // -- Controller API ----------------------------------------------------------

  const getCamera = useCallback(
    (): GraphCameraState => orbitToCamera(cameraTweenRef.current?.to ?? orbitRef.current),
    []
  );

  const animateTo = useCallback((to: OrbitState) => {
    cameraTweenRef.current = { from: cloneOrbit(orbitRef.current), to: cloneOrbit(to), start: performance.now() };
  }, []);

  const setCamera = useCallback(
    (camera: GraphCameraState, animate = true) => {
      const orbit = cameraToOrbit(camera);
      if (animate) animateTo(orbit);
      else {
        cameraTweenRef.current = null;
        orbitRef.current = orbit;
        setZoom(CAMERA_3D_DISTANCE / orbit.distance);
      }
    },
    [animateTo]
  );

  const fitToContent = useCallback(() => {
    const { nodes, positions } = propsRef.current;
    if (nodes.length === 0) return;
    const box = new THREE.Box3();
    for (const node of nodes) {
      const p = positions.get(node.id);
      if (p) box.expandByPoint(new THREE.Vector3(p.x, p.y, p.z ?? 0));
    }
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length() || 1;
    const distance = THREE.MathUtils.clamp(
      (size / 2) / Math.tan(THREE.MathUtils.degToRad(CAMERA_3D_FOV / 2)) * 1.15 + 60,
      CAMERA_3D_MIN_DISTANCE,
      CAMERA_3D_MAX_DISTANCE
    );
    animateTo({ ...orbitRef.current, target: center, distance });
  }, [animateTo]);

  const focusOn = useCallback(
    (nodeId: number) => {
      const p = propsRef.current.positions.get(nodeId);
      if (!p) return;
      animateTo({
        ...orbitRef.current,
        target: new THREE.Vector3(p.x, p.y, p.z ?? 0),
        distance: Math.min(orbitRef.current.distance, CAMERA_3D_DISTANCE * 0.6),
      });
    },
    [animateTo]
  );

  const runForceLayout = useCallback(() => {
    const { nodes, edges, positions, pinned: pinnedIds } = propsRef.current;
    const pinned = new Map<number, GraphPoint>();
    const seeds = new Map<number, GraphPoint>();
    for (const n of nodes) {
      const p = positions.get(n.id);
      if (!p) continue;
      seeds.set(n.id, p);
      if (pinnedIds.has(n.id)) pinned.set(n.id, p);
    }
    const request: LayoutRequest = {
      nodes: nodes.map((n) => ({ id: n.id, radius: nodeRadius(n) })),
      edges: edges.map((e) => ({ source: e.source, target: e.target })),
      pinned: pinned.size >= nodes.length ? new Map() : pinned,
      seeds,
    };
    forceLayoutRef.current?.stop();
    forceLayoutRef.current = createSteppingForceLayout(request);
  }, []);

  const setEdgePreview = useCallback((fromNodeId: number | null) => {
    edgePreviewFromRef.current = fromNodeId;
    if (fromNodeId === null) edgePreviewToRef.current = null;
  }, []);

  // -- Scene lifecycle -----------------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !active) return undefined;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(propsRef.current.backgroundColor ?? SPACE_BACKGROUND, 1);
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'grab';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(propsRef.current.backgroundColor ?? SPACE_BACKGROUND, 0.00035);
    const camera = new THREE.PerspectiveCamera(CAMERA_3D_FOV, width / height, 1, 20000);
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(1, 1.5, 2);
    scene.add(key);

    // Ambient particles (kept subtle; purely decorative).
    const particleCount = 400;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) particlePos[i] = (Math.random() - 0.5) * 6000;
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 4,
      color: new THREE.Color(propsRef.current.primaryColor ?? '#7986cb').lerp(new THREE.Color(0x9999ff), 0.4),
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Nodes: one instanced sphere mesh; per-instance colour + scale.
    const sphereGeo = new THREE.SphereGeometry(1, 20, 16);
    const nodeMat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.25, vertexColors: false });
    let nodeMesh = new THREE.InstancedMesh(sphereGeo, nodeMat, 1);
    nodeMesh.count = 0;
    scene.add(nodeMesh);
    let instanceIds: number[] = [];

    // Rings for selected / focused / hovered nodes.
    const ringGeo = new THREE.SphereGeometry(1, 16, 12);
    const makeRing = (color: number) => {
      const mesh = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.55, depthWrite: false })
      );
      mesh.visible = false;
      scene.add(mesh);
      return mesh;
    };
    const ringPool: THREE.Mesh[] = Array.from({ length: 64 }, () => makeRing(SELECTION_RING_COLOR));
    const focusRing = makeRing(FOCUS_RING_COLOR);
    const hoverRing = makeRing(0xffffff);

    // Edges: line segments with vertex colours.
    const edgeGeo = new THREE.BufferGeometry();
    const edgeMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false });
    const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
    scene.add(edgeLines);
    // Selected edges drawn again, brighter, on top.
    const selectedEdgeGeo = new THREE.BufferGeometry();
    const selectedEdgeMat = new THREE.LineBasicMaterial({ color: 0x00bcd4, transparent: true, opacity: 1, depthWrite: false });
    const selectedEdgeLines = new THREE.LineSegments(selectedEdgeGeo, selectedEdgeMat);
    scene.add(selectedEdgeLines);
    // Edge-creation ghost.
    const previewGeo = new THREE.BufferGeometry();
    previewGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const previewLine = new THREE.Line(
      previewGeo,
      new THREE.LineDashedMaterial({ color: 0xffd700, dashSize: 12, gapSize: 8, transparent: true, opacity: 0.9 })
    );
    previewLine.visible = false;
    scene.add(previewLine);

    const labels = new LabelSprites(scene, propsRef.current.secondaryColor ? '#e0f7fa' : '#e0f7fa');
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const tmpMatrix = new THREE.Matrix4();
    const tmpColor = new THREE.Color();
    const tmpVec = new THREE.Vector3();

    let lastPositionsVersion = -1;
    let lastSyncNodesRef: GraphNode[] | null = null;

    const applyOrbit = () => {
      const o = orbitRef.current;
      const sinPhi = Math.sin(o.phi);
      camera.position.set(
        o.target.x + o.distance * sinPhi * Math.sin(o.theta),
        o.target.y + o.distance * Math.cos(o.phi),
        o.target.z + o.distance * sinPhi * Math.cos(o.theta)
      );
      camera.lookAt(o.target);
    };

    const sync = () => {
      const { nodes, edges, positions, selection, focusNodeId, expanded } = propsRef.current;
      lastSyncNodesRef = nodes;

      // Grow the instanced mesh when needed.
      if (nodeMesh.instanceMatrix.count < nodes.length) {
        scene.remove(nodeMesh);
        nodeMesh.dispose();
        nodeMesh = new THREE.InstancedMesh(sphereGeo, nodeMat, Math.max(nodes.length * 2, 64));
        scene.add(nodeMesh);
      }
      nodeMesh.count = nodes.length;
      instanceIds = new Array(nodes.length);
      const byId = new Map<number, { p: GraphPoint; r: number }>();
      nodes.forEach((node, i) => {
        const p = positions.get(node.id) ?? { x: 0, y: 0, z: 0 };
        const r = nodeRadius(node);
        const collapsed = node.hasChildren && !expanded.has(node.id);
        const scale = collapsed ? r * 1.15 : r;
        byId.set(node.id, { p, r });
        instanceIds[i] = node.id;
        tmpMatrix.makeScale(scale, scale, scale);
        tmpMatrix.setPosition(p.x, p.y, p.z ?? 0);
        nodeMesh.setMatrixAt(i, tmpMatrix);
        const accent =
          node.origin === 'overlay' || node.origin === 'both'
            ? OVERLAY_ACCENT_COLOR
            : NODE_TYPE_COLORS[node.type] ?? NODE_TYPE_COLORS.UNKNOWN;
        nodeMesh.setColorAt(i, tmpColor.setHex(accent));
      });
      nodeMesh.instanceMatrix.needsUpdate = true;
      if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true;
      nodeMesh.computeBoundingSphere();

      // Selection rings.
      let ringIndex = 0;
      for (const id of selection.nodeIds) {
        const entry = byId.get(id);
        const ring = ringPool[ringIndex++];
        if (!entry || !ring) continue;
        ring.visible = true;
        ring.position.set(entry.p.x, entry.p.y, entry.p.z ?? 0);
        ring.scale.setScalar(entry.r * 1.45);
      }
      for (; ringIndex < ringPool.length; ringIndex++) ringPool[ringIndex].visible = false;
      const focus = focusNodeId !== null ? byId.get(focusNodeId) : undefined;
      focusRing.visible = Boolean(focus);
      if (focus) {
        focusRing.position.set(focus.p.x, focus.p.y, focus.p.z ?? 0);
        focusRing.scale.setScalar(focus.r * 1.7);
      }

      // Edges.
      const positionsArr = new Float32Array(edges.length * 6);
      const colorsArr = new Float32Array(edges.length * 6);
      const selectedArr: number[] = [];
      let n = 0;
      for (const edge of edges) {
        const a = byId.get(edge.source);
        const b = byId.get(edge.target);
        if (!a || !b) continue;
        const color = tmpColor.setHex(
          edge.origin === 'overlay'
            ? OVERLAY_ACCENT_COLOR
            : LINK_TYPE_COLORS[edge.types[0] ?? 'UNKNOWN'] ?? LINK_TYPE_COLORS.UNKNOWN
        );
        positionsArr.set([a.p.x, a.p.y, a.p.z ?? 0, b.p.x, b.p.y, b.p.z ?? 0], n * 6);
        colorsArr.set([color.r, color.g, color.b, color.r, color.g, color.b], n * 6);
        if (selection.edgeIds.has(edge.id)) {
          selectedArr.push(a.p.x, a.p.y, a.p.z ?? 0, b.p.x, b.p.y, b.p.z ?? 0);
        }
        n++;
      }
      edgeGeo.setAttribute('position', new THREE.BufferAttribute(positionsArr.subarray(0, n * 6), 3));
      edgeGeo.setAttribute('color', new THREE.BufferAttribute(colorsArr.subarray(0, n * 6), 3));
      edgeGeo.computeBoundingSphere();
      selectedEdgeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(selectedArr), 3));
      selectedEdgeGeo.computeBoundingSphere();

      // Labels: nearest N within range, selection/focus always shown.
      labels.begin();
      const camPos = camera.position;
      const candidates = nodes
        .map((node) => {
          const entry = byId.get(node.id)!;
          const d = tmpVec.set(entry.p.x, entry.p.y, entry.p.z ?? 0).distanceTo(camPos);
          const important = selection.nodeIds.has(node.id) || focusNodeId === node.id || node.id === propsRef.current.nodes[0]?.id;
          return { node, entry, d, important };
        })
        .filter((c) => c.important || c.d < LABEL_3D_MAX_DISTANCE)
        .sort((a, b) => Number(b.important) - Number(a.important) || a.d - b.d)
        .slice(0, MAX_VISIBLE_LABELS_3D);
      for (const c of candidates) labels.place(c.node.id, c.node.name, c.entry.p, c.entry.r, c.important);
      labels.end();

      // Edge preview.
      const from = edgePreviewFromRef.current !== null ? byId.get(edgePreviewFromRef.current) : undefined;
      const to = edgePreviewToRef.current;
      if (from && to) {
        const attr = previewGeo.getAttribute('position') as THREE.BufferAttribute;
        attr.setXYZ(0, from.p.x, from.p.y, from.p.z ?? 0);
        attr.setXYZ(1, to.x, to.y, to.z);
        attr.needsUpdate = true;
        previewLine.computeLineDistances();
        previewLine.visible = true;
      } else {
        previewLine.visible = false;
      }
    };
    syncRef.current = sync;

    // -- Interaction ---------------------------------------------------------

    const screenFromEvent = (e: PointerEvent | MouseEvent | WheelEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top, rect };
    };

    const pick = (e: PointerEvent | MouseEvent): number | null => {
      const { x, y, rect } = screenFromEvent(e);
      pointer.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(nodeMesh, false);
      const hit = hits.find((h) => h.instanceId !== undefined);
      return hit && hit.instanceId !== undefined ? instanceIds[hit.instanceId] ?? null : null;
    };

    const worldOnPlane = (e: PointerEvent, plane: THREE.Plane): THREE.Vector3 | null => {
      const { x, y, rect } = screenFromEvent(e);
      pointer.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const out = new THREE.Vector3();
      return raycaster.ray.intersectPlane(plane, out) ? out : null;
    };

    const eventFor = (e: MouseEvent | PointerEvent | WheelEvent, world: THREE.Vector3): GraphInteractionEvent => {
      const { x, y } = screenFromEvent(e);
      return {
        originalEvent: e,
        screenPosition: { x, y },
        worldPosition: { x: world.x, y: world.y, z: world.z },
        modifiers: { ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, meta: e.metaKey },
        button: (e as MouseEvent).button ?? 0,
      };
    };

    const targetPlane = () => {
      const normal = camera.getWorldDirection(new THREE.Vector3()).negate();
      return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, orbitRef.current.target);
    };

    const drag = {
      active: false,
      mode: 'none' as 'none' | 'orbit' | 'pan' | 'node',
      moved: false,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      nodeId: null as number | null,
      plane: new THREE.Plane(),
      lastClickAt: 0,
      lastClickNode: null as number | null,
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 2) return;
      canvas.setPointerCapture?.(e.pointerId);
      cameraTweenRef.current = null;
      drag.active = true;
      drag.moved = false;
      drag.startX = drag.lastX = e.clientX;
      drag.startY = drag.lastY = e.clientY;
      const hit = e.button === 0 && !e.shiftKey ? pick(e) : null;
      if (hit !== null) {
        drag.mode = 'node';
        drag.nodeId = hit;
        const p = propsRef.current.positions.get(hit) ?? { x: 0, y: 0, z: 0 };
        const normal = camera.getWorldDirection(new THREE.Vector3()).negate();
        drag.plane.setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(p.x, p.y, p.z ?? 0));
      } else {
        drag.mode = e.button === 2 || e.shiftKey ? 'pan' : 'orbit';
        drag.nodeId = null;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drag.active) {
        const hit = pick(e);
        if (hit !== hoverRing.userData.id) {
          hoverRing.userData.id = hit;
          setHoveredNodeId(hit);
          propsRef.current.events.onNodeHover?.(hit);
          canvas.style.cursor = hit !== null ? 'pointer' : 'grab';
        }
        if (edgePreviewFromRef.current !== null) {
          const world = worldOnPlane(e, targetPlane());
          if (world) {
            edgePreviewToRef.current = world;
            propsRef.current.events.onCanvasPointerMove?.({ x: world.x, y: world.y, z: world.z });
            sync();
          }
        }
        return;
      }
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      if (!drag.moved) {
        if (Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) < 5) return;
        drag.moved = true;
        canvas.style.cursor = 'grabbing';
        if (drag.mode === 'node' && drag.nodeId !== null) {
          const p = propsRef.current.positions.get(drag.nodeId);
          if (p) propsRef.current.events.onNodeDrag?.(drag.nodeId, p, 'start');
        }
      }
      const o = orbitRef.current;
      if (drag.mode === 'node' && drag.nodeId !== null) {
        const world = worldOnPlane(e, drag.plane);
        if (world) {
          propsRef.current.animator.cancel(drag.nodeId);
          const next = { x: world.x, y: world.y, z: world.z };
          propsRef.current.positions.set(drag.nodeId, next);
          propsRef.current.events.onNodeDrag?.(drag.nodeId, next, 'move');
        }
      } else if (drag.mode === 'pan') {
        const panScale = o.distance * 0.0016;
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
        o.target.addScaledVector(right, -dx * panScale);
        o.target.addScaledVector(up, dy * panScale);
      } else {
        o.theta -= dx * 0.005;
        o.phi = THREE.MathUtils.clamp(o.phi - dy * 0.005, 0.12, Math.PI - 0.12);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!drag.active) return;
      canvas.releasePointerCapture?.(e.pointerId);
      const wasClick = !drag.moved;
      const mode = drag.mode;
      const nodeId = drag.nodeId;
      drag.active = false;
      drag.mode = 'none';
      drag.nodeId = null;
      canvas.style.cursor = 'grab';

      const world = worldOnPlane(e, targetPlane()) ?? orbitRef.current.target.clone();
      const event = eventFor(e, world);
      if (!wasClick) {
        if (mode === 'node' && nodeId !== null) {
          const p = propsRef.current.positions.get(nodeId);
          if (p) propsRef.current.events.onNodeDrag?.(nodeId, p, 'end');
        }
        return;
      }
      if (e.button === 2) return; // context menu handled separately
      const hit = pick(e);
      const now = performance.now();
      if (hit !== null) {
        const isDouble = now - drag.lastClickAt < 300 && drag.lastClickNode === hit;
        if (isDouble) {
          propsRef.current.events.onNodeDoubleClick?.(hit, event);
          drag.lastClickAt = 0;
          drag.lastClickNode = null;
        } else {
          propsRef.current.events.onNodeClick?.(hit, event);
          drag.lastClickAt = now;
          drag.lastClickNode = hit;
        }
      } else {
        propsRef.current.events.onCanvasClick?.(event.worldPosition, event);
        drag.lastClickNode = null;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraTweenRef.current = null;
      const o = orbitRef.current;
      o.distance = THREE.MathUtils.clamp(
        o.distance * Math.exp(e.deltaY * 0.001),
        CAMERA_3D_MIN_DISTANCE,
        CAMERA_3D_MAX_DISTANCE
      );
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (drag.moved) return;
      const hit = pick(e);
      const world = orbitRef.current.target.clone();
      const event = eventFor(e, world);
      if (hit !== null) propsRef.current.events.onNodeContextMenu?.(hit, event);
      else propsRef.current.events.onCanvasContextMenu?.(event.worldPosition, event);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth || width;
      const h = container.clientHeight || height;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    // -- Render loop ---------------------------------------------------------

    let frame = 0;
    let lastZoomCommit = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const now = performance.now();

      propsRef.current.animator.step(propsRef.current.positions, now);

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

      const tween = cameraTweenRef.current;
      if (tween) {
        const t = Math.min(1, (now - tween.start) / VIEWPORT_ANIMATION_MS);
        const k = 1 - Math.pow(1 - t, 3);
        const o = orbitRef.current;
        o.target.lerpVectors(tween.from.target, tween.to.target, k);
        o.theta = tween.from.theta + (tween.to.theta - tween.from.theta) * k;
        o.phi = tween.from.phi + (tween.to.phi - tween.from.phi) * k;
        o.distance = tween.from.distance + (tween.to.distance - tween.from.distance) * k;
        if (t >= 1) cameraTweenRef.current = null;
      }

      applyOrbit();

      if (propsRef.current.positions.version !== lastPositionsVersion || lastSyncNodesRef !== propsRef.current.nodes) {
        lastPositionsVersion = propsRef.current.positions.version;
        sync();
      }

      // Hover ring follows the hovered node.
      const hoverId = hoverRing.userData.id as number | null | undefined;
      const hp = hoverId !== null && hoverId !== undefined ? propsRef.current.positions.get(hoverId) : undefined;
      hoverRing.visible = Boolean(hp);
      if (hp) {
        const node = propsRef.current.nodes.find((n) => n.id === hoverId);
        hoverRing.position.set(hp.x, hp.y, hp.z ?? 0);
        hoverRing.scale.setScalar((node ? nodeRadius(node) : DEFAULT_NODE_RADIUS) * 1.3);
      }

      particles.rotation.y += 0.00015;

      if (now - lastZoomCommit > 120) {
        lastZoomCommit = now;
        setZoom(CAMERA_3D_DISTANCE / orbitRef.current.distance);
      }

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      forceLayoutRef.current?.stop();
      labels.dispose();
      sphereGeo.dispose();
      nodeMat.dispose();
      nodeMesh.dispose();
      ringGeo.dispose();
      for (const ring of [...ringPool, focusRing, hoverRing]) (ring.material as THREE.Material).dispose();
      edgeGeo.dispose();
      edgeMat.dispose();
      selectedEdgeGeo.dispose();
      selectedEdgeMat.dispose();
      previewGeo.dispose();
      (previewLine.material as THREE.Material).dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
      if (canvas.parentElement === container) container.removeChild(canvas);
      syncRef.current = () => undefined;
      setHoveredNodeId(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Re-sync when the store-derived render set changes.
  useEffect(() => {
    syncRef.current();
  }, [props.nodes, props.edges, props.selection, props.focusNodeId, props.expanded]);

  return {
    containerRef,
    hoveredNodeId,
    getCamera,
    setCamera,
    fitToContent,
    focusOn,
    runForceLayout,
    setEdgePreview,
    marquee: null,
    zoom,
  };
}

export default useGraph3DCanvas;
