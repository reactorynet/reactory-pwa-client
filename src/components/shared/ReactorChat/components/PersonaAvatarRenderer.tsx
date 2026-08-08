/**
 * PersonaAvatarRenderer — Three.js WebGL canvas that renders a persona's
 * 3D visual representation from appearance artefacts.
 *
 * Phase 1 (current):
 *  - Loads persona appearance (text descriptors + optional artefacts).
 *  - Renders a default wireframe avatar when no artefacts are provided.
 *  - Supports `wiremesh` artefacts by building a THREE.WireframeGeometry from
 *    inline JSON vertex/edge data.
 *  - Provides orbit/pan/zoom camera controls and a reset-view button.
 *
 * Future phases will load mesh/material/texture/shader/scene artefacts and
 * animate the avatar in response to chat state (speaking, listening, idle).
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { IAIAppearance, IAIAppearanceArtefact } from '../types';

export interface PersonaAvatarRendererProps {
  /** Persona display name (used for labels and fallback titles). */
  name?: string;
  /** Visual / auditory appearance descriptor from the persona. */
  appearance?: IAIAppearance | null;
  /** Primary theme color for the wireframe / fallback avatar. */
  primaryColor?: string;
  /** Secondary theme color for accents. */
  secondaryColor?: string;
  /** 'dark' | 'light' — drives background and fog colors. */
  mode?: 'dark' | 'light' | string;
  /** Custom background color for the wrapper container. */
  backgroundColor?: string;
}

const CAM_RADIUS = 6;

/** Parses a wiremesh artefact into vertices and edge indices. */
const parseWiremesh = (
  artefact: IAIAppearanceArtefact,
): { vertices: THREE.Vector3[]; edges: [number, number][] } | null => {
  let payload: any = artefact.data;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      return null;
    }
  }
  if (!payload || typeof payload !== 'object') return null;

  const rawVertices = payload.vertices ?? payload.nodes ?? [];
  const rawEdges = payload.edges ?? payload.lines ?? payload.links ?? [];

  const vertices: THREE.Vector3[] = rawVertices
    .map((v: any) => {
      if (Array.isArray(v) && v.length >= 3) {
        return new THREE.Vector3(Number(v[0]), Number(v[1]), Number(v[2]));
      }
      if (v && typeof v === 'object' && 'x' in v && 'y' in v && 'z' in v) {
        return new THREE.Vector3(Number(v.x), Number(v.y), Number(v.z));
      }
      return null;
    })
    .filter((v: THREE.Vector3 | null): v is THREE.Vector3 => v !== null);

  const edges: [number, number][] = rawEdges
    .map((e: any) => {
      if (Array.isArray(e) && e.length >= 2) {
        return [Number(e[0]), Number(e[1])] as [number, number];
      }
      if (e && typeof e === 'object') {
        const a = e.source ?? e.sourceId ?? e.a ?? e[0];
        const b = e.target ?? e.targetId ?? e.b ?? e[1];
        if (a !== undefined && b !== undefined) {
          return [Number(a), Number(b)] as [number, number];
        }
      }
      return null;
    })
    .filter((e: [number, number] | null): e is [number, number] => e !== null);

  if (vertices.length === 0) return null;
  return { vertices, edges };
};

/** Builds a default wireframe humanoid-ish avatar from simple primitives. */
const buildDefaultWiremesh = (): { vertices: THREE.Vector3[]; edges: [number, number][] } => {
  const vertices: THREE.Vector3[] = [];
  const edges: [number, number][] = [];
  const add = (x: number, y: number, z: number) => {
    vertices.push(new THREE.Vector3(x, y, z));
    return vertices.length - 1;
  };
  const line = (a: number, b: number) => edges.push([a, b]);

  // Head
  const headCenter = add(0, 1.6, 0);
  const headRadius = 0.35;
  const headRing: number[] = [];
  for (let i = 0; i < 8; i++) {
    const theta = (i / 8) * Math.PI * 2;
    headRing.push(add(Math.cos(theta) * headRadius, 1.6, Math.sin(theta) * headRadius));
  }
  for (let i = 0; i < headRing.length; i++) {
    line(headRing[i], headRing[(i + 1) % headRing.length]);
    line(headCenter, headRing[i]);
  }

  // Torso
  const neck = add(0, 1.25, 0);
  const shoulderL = add(-0.55, 1.15, 0);
  const shoulderR = add(0.55, 1.15, 0);
  const hipL = add(-0.35, 0.35, 0);
  const hipR = add(0.35, 0.35, 0);
  line(neck, shoulderL);
  line(neck, shoulderR);
  line(shoulderL, hipL);
  line(shoulderR, hipR);
  line(hipL, hipR);

  // Arms
  const elbowL = add(-0.9, 0.85, 0);
  const handL = add(-1.1, 0.35, 0);
  const elbowR = add(0.9, 0.85, 0);
  const handR = add(1.1, 0.35, 0);
  line(shoulderL, elbowL);
  line(elbowL, handL);
  line(shoulderR, elbowR);
  line(elbowR, handR);

  // Legs
  const kneeL = add(-0.35, -0.35, 0);
  const footL = add(-0.35, -1.1, 0);
  const kneeR = add(0.35, -0.35, 0);
  const footR = add(0.35, -1.1, 0);
  line(hipL, kneeL);
  line(kneeL, footL);
  line(hipR, kneeR);
  line(kneeR, footR);

  return { vertices, edges };
};

const PersonaAvatarRenderer = memo(function PersonaAvatarRenderer({
  name,
  appearance,
  primaryColor = '#1976d2',
  secondaryColor = '#dc004e',
  mode = 'dark',
  backgroundColor,
}: PersonaAvatarRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [labelsVisible, setLabelsVisible] = useState(true);
  const resetViewRef = useRef<() => void>(() => { });

  const effectiveBgColor =
    backgroundColor || (mode === 'light' ? 'rgba(240, 242, 248, 0.98)' : 'rgba(11, 13, 23, 0.98)');
  const overlayFg = mode === 'light' ? '#1a237e' : '#e0f7fa';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const fogColor = mode === 'dark' ? 0x05050f : 0xeeeeff;
    scene.fog = new THREE.FogExp2(fogColor, 0.045);

    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 0, CAM_RADIUS);
    renderer.setSize(w, h, false);

    const pColor = new THREE.Color(primaryColor);
    const sColor = new THREE.Color(secondaryColor);

    // Resolve wiremesh data: first explicit artefact, otherwise default.
    const artefact = appearance?.artefacts?.find((a) => a.type === 'wiremesh');
    const wireData = artefact ? parseWiremesh(artefact) : buildDefaultWiremesh();

    // Build geometry from vertices + edges.
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(wireData.edges.length * 6);
    wireData.edges.forEach(([a, b], i) => {
      const va = wireData.vertices[a] || new THREE.Vector3();
      const vb = wireData.vertices[b] || new THREE.Vector3();
      positions.set([va.x, va.y, va.z, vb.x, vb.y, vb.z], i * 6);
    });
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: pColor,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const wireframe = new THREE.LineSegments(geometry, material);
    scene.add(wireframe);

    // Soft particle field behind the avatar.
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 12;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.04,
      color: sColor.clone().lerp(new THREE.Color(0xffffff), 0.35),
      transparent: true,
      opacity: 0.35,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Label sprite for the persona name.
    let labelSprite: THREE.Sprite | null = null;
    if (name && labelsVisible) {
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 512;
      labelCanvas.height = 96;
      const ctx = labelCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
        ctx.font = 'Bold 32px monospace';
        ctx.fillStyle = mode === 'light' ? '#1a237e' : '#e0f7fa';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = mode === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.95)';
        ctx.shadowBlur = 6;
        ctx.fillText(name, labelCanvas.width / 2, labelCanvas.height / 2);
        const texture = new THREE.CanvasTexture(labelCanvas);
        const spriteMat = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
        });
        labelSprite = new THREE.Sprite(spriteMat);
        labelSprite.position.set(0, 2.2, 0);
        labelSprite.scale.set(3, 0.56, 1);
        scene.add(labelSprite);
      }
    }

    // Resize observer.
    const resizeObserver = new ResizeObserver(() => {
      const cw = canvas.parentElement?.clientWidth || canvas.clientWidth;
      const ch = canvas.parentElement?.clientHeight || canvas.clientHeight;
      renderer.setSize(cw, ch, false);
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(canvas.parentElement || canvas);

    // Camera rig.
    const camCtl = {
      theta: 0,
      phi: Math.PI / 2,
      radius: CAM_RADIUS,
      target: new THREE.Vector3(0, 0.2, 0),
      user: false,
    };

    const applyCamera = () => {
      const sinPhi = Math.sin(camCtl.phi);
      camera.position.set(
        camCtl.target.x + camCtl.radius * sinPhi * Math.sin(camCtl.theta),
        camCtl.target.y + camCtl.radius * Math.cos(camCtl.phi),
        camCtl.target.z + camCtl.radius * sinPhi * Math.cos(camCtl.theta),
      );
      camera.lookAt(camCtl.target);
    };

    const takeControl = () => {
      if (camCtl.user) return;
      const offset = camera.position.clone().sub(camCtl.target);
      camCtl.radius = Math.max(offset.length(), 0.001);
      camCtl.theta = Math.atan2(offset.x, offset.z);
      camCtl.phi = Math.acos(THREE.MathUtils.clamp(offset.y / camCtl.radius, -1, 1));
      camCtl.user = true;
    };

    resetViewRef.current = () => {
      camCtl.user = false;
      camCtl.target.set(0, 0.2, 0);
      camCtl.radius = CAM_RADIUS;
    };

    // Interaction.
    const dragState = { active: false, panning: false, x: 0, y: 0, startX: 0, startY: 0, moved: false, pointerId: -1 };
    const CLICK_SLOP_PX = 5;

    const releaseCapture = () => {
      if (dragState.pointerId >= 0 && canvas.hasPointerCapture?.(dragState.pointerId)) {
        try {
          canvas.releasePointerCapture?.(dragState.pointerId);
        } catch {
          // Pointer capture may already be released by the browser; ignore.
        }
      }
      dragState.pointerId = -1;
    };

    const onPointerDown = (e: PointerEvent) => {
      dragState.active = true;
      dragState.panning = e.button === 2 || e.shiftKey;
      dragState.x = e.clientX;
      dragState.y = e.clientY;
      dragState.startX = e.clientX;
      dragState.startY = e.clientY;
      dragState.moved = false;
      dragState.pointerId = e.pointerId;
      try {
        canvas.setPointerCapture?.(e.pointerId);
      } catch {
        // Ignore if setPointerCapture fails (e.g. pointer already released).
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragState.active) return;
      const dx = e.clientX - dragState.x;
      const dy = e.clientY - dragState.y;
      dragState.x = e.clientX;
      dragState.y = e.clientY;
      if (!dragState.moved) {
        const total = Math.abs(e.clientX - dragState.startX) + Math.abs(e.clientY - dragState.startY);
        if (total < CLICK_SLOP_PX) return;
        dragState.moved = true;
        takeControl();
        canvas.style.cursor = 'grabbing';
      }
      if (dragState.panning) {
        const panScale = camCtl.radius * 0.0014;
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
        camCtl.target.addScaledVector(right, -dx * panScale);
        camCtl.target.addScaledVector(up, dy * panScale);
      } else {
        camCtl.theta -= dx * 0.006;
        camCtl.phi = THREE.MathUtils.clamp(camCtl.phi - dy * 0.006, 0.15, Math.PI - 0.15);
      }
    };

    const onPointerUp = () => {
      dragState.active = false;
      releaseCapture();
      canvas.style.cursor = 'grab';
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      takeControl();
      camCtl.radius = THREE.MathUtils.clamp(camCtl.radius * (1 + e.deltaY * 0.001), 2, 20);
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);

    // Animation loop.
    let frameId: number;
    let t = 0;

    const tick = () => {
      frameId = requestAnimationFrame(tick);
      t += 0.005;

      if (camCtl.user) {
        applyCamera();
      } else {
        camera.position.x = Math.sin(t * 0.25) * CAM_RADIUS;
        camera.position.z = Math.cos(t * 0.25) * CAM_RADIUS;
        camera.position.y = Math.sin(t * 0.12) * 0.8;
        camera.lookAt(camCtl.target);
      }

      // Gentle idle breathing.
      wireframe.rotation.y = Math.sin(t * 0.3) * 0.08;
      wireframe.position.y = Math.sin(t * 0.8) * 0.04;
      particles.rotation.y = t * 0.02;

      renderer.render(scene, camera);
    };

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      resetViewRef.current = () => { };
      geometry.dispose();
      material.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      labelSprite?.material.map?.dispose();
      labelSprite?.material.dispose();
      renderer.dispose();
    };
  }, [appearance, primaryColor, secondaryColor, mode, name, labelsVisible]);

  const buttonStyle: React.CSSProperties = {
    width: 30,
    height: 30,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: '30px',
    padding: 0,
    background: mode === 'light' ? 'rgba(26,35,126,0.12)' : 'rgba(224,247,250,0.12)',
    color: overlayFg,
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 280,
        overflow: 'hidden',
        backgroundColor: effectiveBgColor,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'grab',
          touchAction: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1,
          display: 'flex',
          gap: 6,
        }}
      >
        <button
          type="button"
          style={{ ...buttonStyle, opacity: labelsVisible ? 1 : 0.5 }}
          title={labelsVisible ? 'Hide label' : 'Show label'}
          aria-label={labelsVisible ? 'Hide label' : 'Show label'}
          onClick={() => setLabelsVisible((v) => !v)}
        >
          Aa
        </button>
        <button
          type="button"
          style={buttonStyle}
          title="Reset view"
          aria-label="Reset view"
          onClick={() => resetViewRef.current()}
        >
          ⟲
        </button>
      </div>
    </div>
  );
});

export default PersonaAvatarRenderer;
