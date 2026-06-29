/**
 * NeuralBrainBackground — Three.js WebGL canvas that renders an immersive
 * "inside a living neural brain" aesthetic with interactive responses:
 *
 *  - Neurons:          glowing point clusters with hub/peripheral hierarchy
 *  - Axons:            semi-transparent LineSegments connecting nearby neurons
 *  - Pulses:           bright spheres travelling along axons (electrochemical signals)
 *  - Glia:             ambient micro-particles drifting slowly (myelin/support cells)
 *  - Camera:           slow orbital rotation so it feels like floating inside the network
 *  - Fog:              exponential depth fog for the "deep tissue" feel
 *
 *  Interactivity:
 *  - Mouse move →      cursor pulse from nearest neuron + temporary flash connection
 *  - Keydown →         burst of fast pulses radiating from a random hub neuron + hub flash
 *
 * All Three.js resources are disposed on unmount.
 */

import React, { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';

export interface NeuralBrainBackgroundProps {
  primaryColor: string;
  secondaryColor: string;
  /** 'dark' uses a deep navy fog; 'light' uses a pale indigo fog */
  mode?: 'dark' | 'light' | string;
}

const NEURON_COUNT = 85;
const CLUSTER_COUNT = 6;
const HUB_COUNT = 10;
const SCENE_RADIUS = 14;
const MAX_AXON_DIST = 6.5;
const PULSE_POOL = 14;
const BURST_POOL = 6;       // interactive fast pulses
const FLASH_CONN_POOL = 5;  // temporary flash connections
const GLIA_COUNT = 280;
const CAM_RADIUS = 20;
const CURSOR_PULSE_INTERVAL_MS = 700;

const NeuralBrainBackground = memo(function NeuralBrainBackground({
  primaryColor,
  secondaryColor,
  mode = 'dark',
}: NeuralBrainBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);

    // ── Scene + fog ───────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const fogColor = mode === 'dark' ? 0x05050f : 0xeeeeff;
    scene.fog = new THREE.FogExp2(fogColor, 0.038);

    // ── Camera ────────────────────────────────────────────────────────────────
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    const camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 80);
    camera.position.set(0, 0, CAM_RADIUS);
    renderer.setSize(w, h, false);

    // ── Colors ────────────────────────────────────────────────────────────────
    const pColor = new THREE.Color(primaryColor);
    const sColor = new THREE.Color(secondaryColor);
    const pulseColor = pColor.clone().lerp(new THREE.Color(0xffffff), 0.45);
    const pulseColorAlt = sColor.clone().lerp(new THREE.Color(0xffffff), 0.35);

    // ── Neuron positions ──────────────────────────────────────────────────────
    const clusterCenters: THREE.Vector3[] = [];
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = SCENE_RADIUS * (0.3 + Math.random() * 0.55);
      clusterCenters.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ));
    }

    const neuronPos: THREE.Vector3[] = [];
    for (let i = 0; i < NEURON_COUNT; i++) {
      if (Math.random() < 0.72) {
        const c = clusterCenters[i % CLUSTER_COUNT];
        neuronPos.push(new THREE.Vector3(
          c.x + (Math.random() - 0.5) * 6,
          c.y + (Math.random() - 0.5) * 6,
          c.z + (Math.random() - 0.5) * 6,
        ));
      } else {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = SCENE_RADIUS * (0.25 + Math.random() * 0.75);
        neuronPos.push(new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
        ));
      }
    }

    // ── Hub neurons (larger, brighter) ────────────────────────────────────────
    const hubIndices = new Set<number>();
    while (hubIndices.size < HUB_COUNT) {
      hubIndices.add(Math.floor(Math.random() * NEURON_COUNT));
    }

    const mkPoints = (indices: number[], size: number, alpha: number) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(indices.length * 3);
      const colors = new Float32Array(indices.length * 3);
      indices.forEach((idx, i) => {
        pos[i * 3] = neuronPos[idx].x;
        pos[i * 3 + 1] = neuronPos[idx].y;
        pos[i * 3 + 2] = neuronPos[idx].z;
        const c = new THREE.Color().lerpColors(pColor, sColor, Math.random());
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      });
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        size,
        vertexColors: true,
        transparent: true,
        opacity: alpha,
        sizeAttenuation: true,
        depthWrite: false,
      });
      const mesh = new THREE.Points(geo, mat);
      scene.add(mesh);
      return { mesh, geo, mat };
    };

    const hubNeurons = mkPoints([...hubIndices], 0.5, 0.85);
    const regularIndices = Array.from({ length: NEURON_COUNT }, (_, i) => i)
      .filter(i => !hubIndices.has(i));
    const regularNeurons = mkPoints(regularIndices, 0.22, 0.6);

    // ── Axon connections ──────────────────────────────────────────────────────
    const connectionPairs: [number, number][] = [];
    for (let i = 0; i < NEURON_COUNT; i++) {
      let cnt = 0;
      for (let j = i + 1; j < NEURON_COUNT && cnt < 5; j++) {
        if (neuronPos[i].distanceTo(neuronPos[j]) < MAX_AXON_DIST && Math.random() < 0.55) {
          connectionPairs.push([i, j]);
          cnt++;
        }
      }
    }

    const axonGeo = new THREE.BufferGeometry();
    const axonPosArr = new Float32Array(connectionPairs.length * 6);
    const axonColArr = new Float32Array(connectionPairs.length * 6);
    connectionPairs.forEach(([a, b], i) => {
      const pa = neuronPos[a], pb = neuronPos[b];
      axonPosArr.set([pa.x, pa.y, pa.z, pb.x, pb.y, pb.z], i * 6);
      const c = new THREE.Color().lerpColors(pColor, sColor, Math.random());
      axonColArr.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    });
    axonGeo.setAttribute('position', new THREE.BufferAttribute(axonPosArr, 3));
    axonGeo.setAttribute('color', new THREE.BufferAttribute(axonColArr, 3));
    const axonMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
    });
    const axons = new THREE.LineSegments(axonGeo, axonMat);
    scene.add(axons);

    // ── Ambient micro-particles (glia / myelin) ───────────────────────────────
    const gliaGeo = new THREE.BufferGeometry();
    const gliaPosArr = new Float32Array(GLIA_COUNT * 3);
    for (let i = 0; i < GLIA_COUNT; i++) {
      gliaPosArr[i * 3] = (Math.random() - 0.5) * 55;
      gliaPosArr[i * 3 + 1] = (Math.random() - 0.5) * 55;
      gliaPosArr[i * 3 + 2] = (Math.random() - 0.5) * 55;
    }
    gliaGeo.setAttribute('position', new THREE.BufferAttribute(gliaPosArr, 3));
    const gliaMat = new THREE.PointsMaterial({
      size: 0.07,
      color: pColor.clone().lerp(new THREE.Color(0x9999ff), 0.45),
      transparent: true,
      opacity: 0.22,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const glia = new THREE.Points(gliaGeo, gliaMat);
    scene.add(glia);

    // ── Neural pulses (electrochemical signals) ────────────────────────────────
    interface Pulse {
      mesh: THREE.Mesh;
      connIdx: number;
      t: number;
      speed: number;
    }

    const pulseGeo = new THREE.SphereGeometry(0.17, 5, 5);
    const pulses: Pulse[] = Array.from({ length: PULSE_POOL }, (_, i) => {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? pulseColor.clone() : pulseColorAlt.clone(),
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(pulseGeo, mat);
      mesh.visible = false;
      scene.add(mesh);
      return {
        mesh,
        connIdx: Math.floor(Math.random() * connectionPairs.length),
        t: Math.random(),
        speed: 0.0035 + Math.random() * 0.006,
      };
    });

    // ── Resize handling ───────────────────────────────────────────────────────
    const resizeObserver = new ResizeObserver(() => {
      const cw = (canvas.parentElement?.clientWidth) || canvas.clientWidth;
      const ch = (canvas.parentElement?.clientHeight) || canvas.clientHeight;
      renderer.setSize(cw, ch, false);
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(canvas.parentElement || canvas);

    // ── Build connection index: neuron → list of connectionPair indices ────────
    const connsByNeuron: Map<number, number[]> = new Map();
    connectionPairs.forEach(([a, b], ci) => {
      if (!connsByNeuron.has(a)) connsByNeuron.set(a, []);
      if (!connsByNeuron.has(b)) connsByNeuron.set(b, []);
      connsByNeuron.get(a)!.push(ci);
      connsByNeuron.get(b)!.push(ci);
    });

    // ── Burst pulse pool (fast interactive pulses) ─────────────────────────────
    interface BurstPulse {
      mesh: THREE.Mesh;
      connIdx: number;
      t: number;
      speed: number;
      active: boolean;
    }

    const burstGeo = new THREE.SphereGeometry(0.22, 5, 5);
    const burstPulses: BurstPulse[] = Array.from({ length: BURST_POOL }, () => {
      const mat = new THREE.MeshBasicMaterial({
        color: pulseColor.clone().lerp(new THREE.Color(0xffffff), 0.3),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(burstGeo, mat);
      mesh.visible = false;
      scene.add(mesh);
      return { mesh, connIdx: 0, t: 0, speed: 0, active: false };
    });

    // ── Flash connections pool (temporary new-connection visuals) ──────────────
    interface FlashConn {
      line: THREE.Line;
      mat: THREE.LineBasicMaterial;
      geo: THREE.BufferGeometry;
      life: number;
    }

    const flashConns: FlashConn[] = Array.from({ length: FLASH_CONN_POOL }, () => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const mat = new THREE.LineBasicMaterial({
        color: pulseColor,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      scene.add(line);
      return { line, mat, geo, life: 0 };
    });

    // ── Hub flash intensities (0 = off, 1 = full flash, decays per tick) ───────
    const hubFlash = new Float32Array(HUB_COUNT);
    const hubFlashSpheres: THREE.Mesh[] = ([...hubIndices]).map(() => {
      const flashMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xffffff),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 7, 7), flashMat);
      mesh.visible = false;
      scene.add(mesh);
      return mesh;
    });
    const hubIndexArray = [...hubIndices];

    // ── Raycaster for cursor → neuron mapping ──────────────────────────────────
    const raycaster = new THREE.Raycaster();

    // ── Shared interaction state (refs updated by event listeners) ────────────
    const mouseState = { x: 0, y: 0, moved: false };
    const burstQueue: number[] = []; // hub array-index entries
    let lastCursorPulseMs = 0;

    // ── Cursor pulse helper ────────────────────────────────────────────────────
    const spawnCursorPulse = (neuronIdx: number) => {
      const conns = connsByNeuron.get(neuronIdx);
      if (!conns || conns.length === 0) return;
      const slot = burstPulses.find(bp => !bp.active);
      if (!slot) return;
      slot.connIdx = conns[Math.floor(Math.random() * conns.length)];
      slot.t = 0;
      slot.speed = 0.018 + Math.random() * 0.012;
      slot.active = true;
      slot.mesh.visible = true;
    };

    // ── Flash connection helper ────────────────────────────────────────────────
    const spawnFlashConn = (idxA: number, idxB: number) => {
      const slot = flashConns.find(fc => fc.life <= 0);
      if (!slot) return;
      const pa = neuronPos[idxA], pb = neuronPos[idxB];
      const posAttr = slot.geo.getAttribute('position') as THREE.BufferAttribute;
      posAttr.array[0] = pa.x; posAttr.array[1] = pa.y; posAttr.array[2] = pa.z;
      posAttr.array[3] = pb.x; posAttr.array[4] = pb.y; posAttr.array[5] = pb.z;
      posAttr.needsUpdate = true;
      slot.mat.color.copy(Math.random() < 0.5 ? pulseColor : pulseColorAlt);
      slot.life = 1;
    };

    // ── Hub burst helper ───────────────────────────────────────────────────────
    const spawnHubBurst = (hubArrayIdx: number) => {
      const neuronIdx = hubIndexArray[hubArrayIdx];
      const conns = connsByNeuron.get(neuronIdx) ?? [];
      const toFire = Math.min(conns.length, 4);
      for (let k = 0; k < toFire; k++) {
        const slot = burstPulses.find(bp => !bp.active);
        if (!slot) break;
        slot.connIdx = conns[k];
        slot.t = 0;
        slot.speed = 0.020 + Math.random() * 0.015;
        slot.active = true;
        slot.mesh.visible = true;
      }
      // Flash the hub sphere
      hubFlash[hubArrayIdx] = 1;
      const sphere = hubFlashSpheres[hubArrayIdx];
      const p = neuronPos[neuronIdx];
      sphere.position.set(p.x, p.y, p.z);
      sphere.visible = true;
      // Also spawn a flash connection to a random far neuron
      const farIdx = Math.floor(Math.random() * NEURON_COUNT);
      if (farIdx !== neuronIdx) spawnFlashConn(neuronIdx, farIdx);
    };

    // ── Event listeners ────────────────────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      mouseState.x = e.clientX;
      mouseState.y = e.clientY;
      mouseState.moved = true;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier-only keys
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;
      const hubIdx = Math.floor(Math.random() * HUB_COUNT);
      burstQueue.push(hubIdx);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: true });

    // ── Animation loop ────────────────────────────────────────────────────────
    let frameId: number;
    let t = 0;

    const tick = () => {
      frameId = requestAnimationFrame(tick);
      t += 0.003;

      // Orbital camera — floating slowly inside the network
      camera.position.x = Math.sin(t * 0.11) * CAM_RADIUS;
      camera.position.z = Math.cos(t * 0.11) * CAM_RADIUS;
      camera.position.y = Math.sin(t * 0.065) * 5;
      camera.lookAt(0, 0, 0);

      // Hub neurons breathe
      hubNeurons.mat.opacity = 0.65 + Math.sin(t * 0.9) * 0.22;
      // Axons gently brighten/dim
      axonMat.opacity = 0.09 + Math.sin(t * 0.4) * 0.04;

      // ── Process mouse: cursor pulse + flash connection ──
      const now = performance.now();
      if (mouseState.moved && now - lastCursorPulseMs > CURSOR_PULSE_INTERVAL_MS) {
        mouseState.moved = false;
        lastCursorPulseMs = now;

        // Unproject mouse to 3D ray and find nearest neuron
        const rect = canvas.getBoundingClientRect();
        const ndcX = ((mouseState.x - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((mouseState.y - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

        let minDist = Infinity;
        let closestNeuron = 0;
        neuronPos.forEach((pos, i) => {
          const d = raycaster.ray.distanceToPoint(pos);
          if (d < minDist) { minDist = d; closestNeuron = i; }
        });

        spawnCursorPulse(closestNeuron);

        // Flash connection between the hovered neuron and a random distant one
        const distantIdx = (closestNeuron + Math.floor(NEURON_COUNT / 2) + Math.floor(Math.random() * 10)) % NEURON_COUNT;
        spawnFlashConn(closestNeuron, distantIdx);
      }

      // ── Process burst queue (keyboard events) ──
      while (burstQueue.length > 0) {
        const hubIdx = burstQueue.shift()!;
        spawnHubBurst(hubIdx);
      }

      // ── Animate background pulses ──
      if (connectionPairs.length > 0) {
        pulses.forEach((pulse) => {
          pulse.t += pulse.speed;
          if (pulse.t >= 1) {
            pulse.t = 0;
            pulse.connIdx = Math.floor(Math.random() * connectionPairs.length);
            const mat = pulse.mesh.material as THREE.MeshBasicMaterial;
            mat.color.copy(Math.random() < 0.65 ? pulseColor : pulseColorAlt);
          }
          const [a, b] = connectionPairs[pulse.connIdx];
          if (a !== undefined && b !== undefined) {
            pulse.mesh.visible = true;
            pulse.mesh.position.lerpVectors(neuronPos[a], neuronPos[b], pulse.t);
            const mat = pulse.mesh.material as THREE.MeshBasicMaterial;
            const bright = Math.sin(pulse.t * Math.PI);
            mat.opacity = 0.35 + bright * 0.65;
            pulse.mesh.scale.setScalar(0.5 + bright * 1.1);
          }
        });
      }

      // ── Animate burst pulses (interactive, fast) ──
      burstPulses.forEach((bp) => {
        if (!bp.active) return;
        bp.t += bp.speed;
        if (bp.t >= 1) {
          bp.active = false;
          bp.mesh.visible = false;
          return;
        }
        const [a, b] = connectionPairs[bp.connIdx] ?? [];
        if (a !== undefined && b !== undefined) {
          bp.mesh.position.lerpVectors(neuronPos[a], neuronPos[b], bp.t);
          const mat = bp.mesh.material as THREE.MeshBasicMaterial;
          const bright = Math.sin(bp.t * Math.PI);
          mat.opacity = 0.7 + bright * 0.3;
          bp.mesh.scale.setScalar(0.8 + bright * 0.8);
        }
      });

      // ── Animate flash connections (fade out) ──
      flashConns.forEach((fc) => {
        if (fc.life <= 0) return;
        fc.life -= 0.018;
        fc.mat.opacity = Math.max(0, fc.life * 0.7);
        if (fc.life <= 0) fc.mat.opacity = 0;
      });

      // ── Animate hub flash spheres (decay) ──
      hubFlash.forEach((intensity, i) => {
        if (intensity <= 0) return;
        hubFlash[i] = Math.max(0, intensity - 0.025);
        const sphere = hubFlashSpheres[i];
        const mat = sphere.material as THREE.MeshBasicMaterial;
        mat.opacity = hubFlash[i] * 0.75;
        const scale = 1 + (1 - hubFlash[i]) * 1.5;
        sphere.scale.setScalar(scale);
        if (hubFlash[i] <= 0) sphere.visible = false;
      });

      // Glia particles drift slowly
      glia.rotation.y = t * 0.007;
      glia.rotation.x = Math.sin(t * 0.04) * 0.08;

      renderer.render(scene, camera);
    };

    tick();

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      hubNeurons.geo.dispose();
      hubNeurons.mat.dispose();
      regularNeurons.geo.dispose();
      regularNeurons.mat.dispose();
      axonGeo.dispose();
      axonMat.dispose();
      gliaGeo.dispose();
      gliaMat.dispose();
      pulseGeo.dispose();
      burstGeo.dispose();
      pulses.forEach(p => (p.mesh.material as THREE.Material).dispose());
      burstPulses.forEach(p => (p.mesh.material as THREE.Material).dispose());
      flashConns.forEach(fc => { fc.geo.dispose(); fc.mat.dispose(); });
      hubFlashSpheres.forEach(s => { (s.geometry as THREE.BufferGeometry).dispose(); (s.material as THREE.Material).dispose(); });
      renderer.dispose();
    };
  }, [primaryColor, secondaryColor, mode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        display: 'block',
      }}
    />
  );
});

export default NeuralBrainBackground;
