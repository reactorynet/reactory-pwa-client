/**
 * NeuralBrainBackground — Three.js WebGL canvas that renders an immersive
 * "inside a living neural brain" ambient layer behind the chat.
 *
 * It visualizes two overlaid graph fragments:
 *  1. The synthesized conversation graph (ReactorSubgraph around the
 *     conversation node, produced by ProcessConversationWorkflow) supplied by
 *     the host as `graphData`.
 *  2. The agent's live graph perspective — nodes/edges the agent has touched
 *     through the reactor graph tools during the active session, extracted
 *     from tool results in the chat history (`messages`).
 *
 * This component is decoration only: pointer events are off, the camera
 * auto-orbits, and it never issues GraphQL requests. The interactive graph
 * viewer (side panel, `reactor.NeuralBackground@1.0.0`) is NeuralGraphViewer,
 * which runs the shared GraphExplorer engine in 3D.
 *
 * All Three.js resources are disposed on unmount.
 */

import React, { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';

export type NeuralGraphOrigin = 'conversation' | 'agent' | 'both';

export interface NeuralGraphNode {
  id: string | number;
  name: string;
  type?: string;
  /** Which perspective produced this node. Defaults to 'conversation'. */
  origin?: NeuralGraphOrigin;
  /** Custom data payload holding color, relativePath, etc. */
  data?: any;
  /** Custom node color override */
  color?: string;
}

export interface NeuralGraphEdge {
  sourceId: string | number;
  targetId: string | number;
  origin?: NeuralGraphOrigin;
}

export interface NeuralGraphData {
  nodes: NeuralGraphNode[];
  edges: NeuralGraphEdge[];
}

export interface NeuralBrainBackgroundProps {
  primaryColor: string;
  secondaryColor: string;
  /** 'dark' uses a deep navy fog; 'light' uses a pale indigo fog */
  mode?: 'dark' | 'light' | string;
  /** Whether to render labels above the major hub nodes / important nodes */
  showLabels?: boolean;
  /** Conversation graph to feed the neuron visualization */
  graphData?: NeuralGraphData | null;
  /** Chat history (UXChatMessage[]) for synthesizing the agent's overlay. */
  messages?: any[];
}

const NEURON_COUNT = 85;
const CLUSTER_COUNT = 6;
const HUB_COUNT = 10;
const SCENE_RADIUS = 14;
const MAX_AXON_DIST = 6.5;
const PULSE_POOL = 14;
const BURST_POOL = 6;
const FLASH_CONN_POOL = 5;
const GLIA_COUNT = 280;
const CAM_RADIUS = 20;
const CURSOR_PULSE_INTERVAL_MS = 700;
const MAX_LABELS = 24;
const FLASH_DURATION_MS = 3000;

// Aliases of the reactor graph macros whose results carry graph fragments.
const GRAPH_TOOL_ALIASES = [
  'searchgraph',
  'getgraphnode',
  'graphchildren',
  'exploregraph',
  'graphlinks',
  'createnodeedge',
];

/**
 * Synthesizes the agent's graph perspective from graph tool results embedded
 * in chat messages. Handles the payload shapes of all reactor graph macros
 * (data.nodes/links/endpoints/node/parent/link/source/target) defensively —
 * content may arrive as an object or a JSON string.
 */
export const extractAgentGraphFromMessages = (messages: any[]): NeuralGraphData => {
  const nodes = new Map<string, NeuralGraphNode>();
  const edges = new Map<string, NeuralGraphEdge>();
  const parentIds = new Map<string, string | number>();

  const addNode = (n: any) => {
    if (!n || n.id === undefined || n.id === null) return;
    const key = String(n.id);
    if (!nodes.has(key)) {
      nodes.set(key, { id: n.id, name: n.name ?? String(n.id), type: n.type, origin: 'agent' });
    }
    if (n.parentId !== undefined && n.parentId !== null) parentIds.set(key, n.parentId);
  };

  const addEdge = (l: any) => {
    if (!l) return;
    const s = l.sourceId ?? l.source;
    const t = l.targetId ?? l.target;
    if (s === undefined || s === null || t === undefined || t === null) return;
    const key = `${s}->${t}`;
    if (!edges.has(key)) edges.set(key, { sourceId: s, targetId: t, origin: 'agent' });
  };

  (messages ?? []).forEach((msg: any) => {
    (msg?.tool_results ?? []).forEach((result: any) => {
      let payload = result?.content;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch { return; }
      }
      if (!payload || typeof payload !== 'object') return;

      const toolName = String(payload.tool ?? result?.name ?? '').toLowerCase();
      if (!GRAPH_TOOL_ALIASES.some((alias) => toolName.includes(alias))) return;
      if (payload.success === false) return;

      const data = payload.data;
      if (!data || typeof data !== 'object') return;

      if (Array.isArray(data.nodes)) data.nodes.forEach(addNode);
      if (Array.isArray(data.endpoints)) data.endpoints.forEach(addNode);
      if (data.node) addNode(data.node);
      if (data.parent) {
        addNode(data.parent);
        if (Array.isArray(data.nodes)) {
          data.nodes.forEach((child: any) => addEdge({ sourceId: data.parent.id, targetId: child?.id }));
        }
      }
      if (data.source) addNode(data.source);
      if (data.target) addNode(data.target);
      if (Array.isArray(data.links)) data.links.forEach(addEdge);
      if (data.link) addEdge(data.link);
    });
  });

  // Synthesize containment edges from parentId when both ends are present.
  parentIds.forEach((parentId, childKey) => {
    if (nodes.has(String(parentId))) {
      addEdge({ sourceId: parentId, targetId: nodes.get(childKey)!.id });
    }
  });

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
};

/**
 * Cheap signature over just the parts of a conversation that can change the
 * agent graph: only `tool_results` feed the graph, and token deltas only ever
 * mutate the last assistant message's text — so keying on the result ids plus
 * their content lengths re-runs the (expensive) parse exactly when a tool
 * result appears or changes, and never for a streamed token.
 */
export const toolResultSignature = (messages: any[] | null | undefined): string => {
  if (!messages || messages.length === 0) return '';
  let sig = '';
  for (const msg of messages) {
    const results = msg?.tool_results;
    if (!results || results.length === 0) continue;
    for (const r of results) {
      sig += `${r?.id ?? r?.toolCallId ?? ''}:${typeof r?.content === 'string' ? r.content.length : 0}|`;
    }
  }
  return sig;
};

/** Stable signature so identical graph payloads don't trigger scene rebuilds. */
export const graphSignature = (g: NeuralGraphData): string =>
  `${g.nodes.map((n) => String(n.id)).sort().join(',')}|${g.edges
    .map((e) => `${e.sourceId}>${e.targetId}`)
    .sort()
    .join(',')}`;

/** Merges the conversation subgraph with the agent perspective, tagging origins. */
export const mergeGraphs = (
  conversation: NeuralGraphData | null | undefined,
  agent: NeuralGraphData | null | undefined,
): NeuralGraphData | null => {
  const hasConv = !!conversation?.nodes?.length;
  const hasAgent = !!agent?.nodes?.length;
  if (!hasConv && !hasAgent) return null;
  if (!hasAgent) {
    return {
      nodes: conversation!.nodes.map((n) => ({ ...n, origin: n.origin ?? 'conversation' })),
      edges: (conversation!.edges ?? []).map((e) => ({ ...e, origin: e.origin ?? 'conversation' })),
    };
  }

  const nodes = new Map<string, NeuralGraphNode>();
  const edges = new Map<string, NeuralGraphEdge>();
  (conversation?.nodes ?? []).forEach((n) => {
    nodes.set(String(n.id), { ...n, origin: 'conversation' });
  });
  agent!.nodes.forEach((n) => {
    const key = String(n.id);
    const existing = nodes.get(key);
    nodes.set(key, existing ? { ...existing, origin: 'both' } : { ...n, origin: 'agent' });
  });
  const edgeKey = (e: NeuralGraphEdge) => `${e.sourceId}->${e.targetId}`;
  (conversation?.edges ?? []).forEach((e) => edges.set(edgeKey(e), { ...e, origin: 'conversation' }));
  agent!.edges.forEach((e) => {
    const key = edgeKey(e);
    const existing = edges.get(key);
    edges.set(key, existing ? { ...existing, origin: 'both' } : { ...e, origin: 'agent' });
  });
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
};

const NeuralBrainBackground = memo(function NeuralBrainBackground({
  primaryColor,
  secondaryColor,
  mode = 'dark',
  showLabels = true,
  graphData: conversationGraph,
  messages,
}: NeuralBrainBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [agentGraph, setAgentGraph] = React.useState<NeuralGraphData | null>(null);
  const agentSigRef = useRef('');

  // Flash newly arrived nodes/edges from live graph updates. Entries are
  // pruned once they age out so the maps never grow with the session.
  const nodeBirthTimesRef = useRef<Map<string, number>>(new Map());
  const edgeBirthTimesRef = useRef<Map<string, number>>(new Map());
  const lastGraphSigRef = useRef('');

  // Agent perspective from live chat history — keyed on the tool-result
  // signature rather than on `messages` (which changes on every token).
  const messagesRef = React.useRef(messages);
  messagesRef.current = messages;
  const messagesToolSignature = React.useMemo(() => toolResultSignature(messages), [messages]);
  React.useEffect(() => {
    if (!messagesRef.current) return;
    const g = extractAgentGraphFromMessages(messagesRef.current);
    const sig = graphSignature(g);
    if (sig === agentSigRef.current) return;
    agentSigRef.current = sig;
    setAgentGraph(g.nodes.length > 0 ? g : null);
  }, [messagesToolSignature]);

  const graphData = React.useMemo(
    () => mergeGraphs(conversationGraph, agentGraph),
    [conversationGraph, agentGraph]
  );

  // Track newly arrived nodes/edges so the render loop can flash them.
  React.useEffect(() => {
    if (!graphData) {
      lastGraphSigRef.current = '';
      nodeBirthTimesRef.current.clear();
      edgeBirthTimesRef.current.clear();
      return;
    }
    const sig = graphSignature(graphData);
    if (sig === lastGraphSigRef.current) return;
    const now = performance.now();
    const prevSig = lastGraphSigRef.current;
    lastGraphSigRef.current = sig;
    // First sighting of a graph: mark everything as old so the whole scene
    // does not flash; afterwards only genuinely new keys get a birth time.
    const stamp = prevSig ? now : now - FLASH_DURATION_MS;
    graphData.nodes.forEach((n) => {
      const key = String(n.id);
      if (!nodeBirthTimesRef.current.has(key)) nodeBirthTimesRef.current.set(key, stamp);
    });
    graphData.edges.forEach((e) => {
      const key = `${e.sourceId}>${e.targetId}`;
      if (!edgeBirthTimesRef.current.has(key)) edgeBirthTimesRef.current.set(key, stamp);
    });
  }, [graphData]);

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

    // ── Seed-based stable random utility ──────────────────────────────────────
    const seedRandom = (seed: string | number) => {
      let hash = 0;
      const str = String(seed);
      for (let i = 0; i < str.length; i++) {
        hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
      }
      const x = Math.sin(hash) * 10000;
      return x - Math.floor(x);
    };

    // ── Neuron positions, hubs, and axons ──────────────────────────────────────
    const neuronPos: THREE.Vector3[] = [];
    const hubIndices = new Set<number>();
    const connectionPairs: [number, number][] = [];
    const connectionOrigins: NeuralGraphOrigin[] = [];
    const nodes = graphData?.nodes || [];
    let activeNeuronCount = NEURON_COUNT;

    if (nodes.length > 0) {
      activeNeuronCount = nodes.length;

      // Group nodes by type to find cluster centers
      const types = Array.from(new Set(nodes.map((n) => n.type || 'UNKNOWN')));
      const typeCenters = new Map<string, THREE.Vector3>();
      types.forEach((type, tIdx) => {
        const theta = (tIdx / types.length) * Math.PI * 2;
        const r = SCENE_RADIUS * 0.6;
        typeCenters.set(type, new THREE.Vector3(r * Math.cos(theta), (seedRandom(type) - 0.5) * 6, r * Math.sin(theta)));
      });

      // Position each node near its type's cluster center
      nodes.forEach((node) => {
        const center = typeCenters.get(node.type || 'UNKNOWN') || new THREE.Vector3();
        const randX = (seedRandom(String(node.id) + '_x') - 0.5) * 7;
        const randY = (seedRandom(String(node.id) + '_y') - 0.5) * 7;
        const randZ = (seedRandom(String(node.id) + '_z') - 0.5) * 7;
        neuronPos.push(new THREE.Vector3(center.x + randX, center.y + randY, center.z + randZ));
      });

      // Map edges to connection pairs
      const idToIdx = new Map<string, number>();
      nodes.forEach((n, idx) => idToIdx.set(String(n.id), idx));

      // Calculate degree of each node to find hubs
      const degrees = new Array(activeNeuronCount).fill(0);
      (graphData?.edges ?? []).forEach((edge) => {
        const a = idToIdx.get(String(edge.sourceId));
        const b = idToIdx.get(String(edge.targetId));
        if (a !== undefined && b !== undefined) {
          connectionPairs.push([a, b]);
          connectionOrigins.push(edge.origin ?? 'conversation');
          degrees[a]++;
          degrees[b]++;
        }
      });

      // No edges: connect nearby neurons so the scene is not empty.
      if (connectionPairs.length === 0) {
        for (let i = 0; i < activeNeuronCount; i++) {
          let cnt = 0;
          for (let j = i + 1; j < activeNeuronCount && cnt < 3; j++) {
            if (neuronPos[i].distanceTo(neuronPos[j]) < MAX_AXON_DIST) {
              connectionPairs.push([i, j]);
              connectionOrigins.push(nodes[i]?.origin ?? 'conversation');
              cnt++;
            }
          }
        }
      }

      // Top-degree nodes and important types act as hubs.
      const nodeScores = nodes.map((node, idx) => {
        let score = degrees[idx] * 2;
        if (node.type === 'FOLDER' || node.type === 'CONVERSATION' || node.type === 'PROJECT' || node.type === 'SYSTEM') score += 10;
        return { idx, score };
      });
      nodeScores.sort((a, b) => b.score - a.score);
      const hubTarget = Math.min(Math.max(5, Math.floor(activeNeuronCount * 0.15)), HUB_COUNT, activeNeuronCount);
      for (let i = 0; i < hubTarget && i < nodeScores.length; i++) hubIndices.add(nodeScores[i].idx);
    } else {
      // Procedurally generate cluster centers and neuron positions (fallback)
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

      while (hubIndices.size < HUB_COUNT) {
        hubIndices.add(Math.floor(Math.random() * NEURON_COUNT));
      }

      for (let i = 0; i < NEURON_COUNT; i++) {
        let cnt = 0;
        for (let j = i + 1; j < NEURON_COUNT && cnt < 5; j++) {
          if (neuronPos[i].distanceTo(neuronPos[j]) < MAX_AXON_DIST && Math.random() < 0.55) {
            connectionPairs.push([i, j]);
            connectionOrigins.push('conversation');
            cnt++;
          }
        }
      }
    }
    const hubIndexArray = [...hubIndices];
    const activeHubCount = hubIndexArray.length;

    // Agent-perspective nodes render brighter — closer to white — so the
    // agent's active focus stands out from the ambient conversation graph.
    const colorForNode = (idx: number): THREE.Color => {
      const customColor = nodes[idx]?.data?.color || nodes[idx]?.color;
      if (customColor) return new THREE.Color(customColor);
      const base = new THREE.Color().lerpColors(pColor, sColor, seedRandom(String(nodes[idx]?.id ?? idx) + '_c'));
      const origin = nodes[idx]?.origin;
      if (origin === 'agent') return base.lerp(new THREE.Color(0xffffff), 0.45);
      if (origin === 'both') return base.lerp(new THREE.Color(0xffffff), 0.6);
      return base;
    };

    const mkPoints = (indices: number[], size: number, alpha: number) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(indices.length * 3);
      const colors = new Float32Array(indices.length * 3);
      indices.forEach((idx, i) => {
        if (neuronPos[idx]) {
          pos[i * 3] = neuronPos[idx].x;
          pos[i * 3 + 1] = neuronPos[idx].y;
          pos[i * 3 + 2] = neuronPos[idx].z;
        }
        const c = colorForNode(idx);
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

    const hubNeurons = mkPoints(hubIndexArray, 0.5, 0.85);
    const allIndices = Array.from({ length: activeNeuronCount }, (_, i) => i).filter((i) => !hubIndices.has(i));
    const agentIndices = allIndices.filter((i) => nodes[i]?.origin === 'agent' || nodes[i]?.origin === 'both');
    const regularIndices = allIndices.filter((i) => !(nodes[i]?.origin === 'agent' || nodes[i]?.origin === 'both'));
    const regularNeurons = mkPoints(regularIndices, 0.22, 0.6);
    const agentNeurons = mkPoints(agentIndices, 0.32, 0.85);

    // ── Label sprites (hubs and important types only — ambient layer) ────────
    const labelSprites: THREE.Sprite[] = [];
    if (showLabels && graphData) {
      const mkLabelSprite = (node: NeuralGraphNode, pos: THREE.Vector3, major: boolean) => {
        const name = String(node.name ?? '').trim();
        if (!name) return;
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = major ? 512 : 256;
        labelCanvas.height = major ? 128 : 64;
        const ctx = labelCanvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
        ctx.font = major ? 'Bold 32px monospace' : 'Bold 22px monospace';
        const agentTinted = node.origin === 'agent' || node.origin === 'both';
        ctx.fillStyle = mode === 'light'
          ? (agentTinted ? '#4a148c' : '#1a237e')
          : (agentTinted ? '#fff8e1' : '#e0f7fa');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = mode === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.95)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        let display = name;
        const maxWidth = labelCanvas.width - 16;
        while (ctx.measureText(display).width > maxWidth && display.length > 4) display = display.slice(0, -2);
        if (display !== name) display += '…';
        ctx.fillText(display, labelCanvas.width / 2, labelCanvas.height / 2);

        const texture = new THREE.CanvasTexture(labelCanvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: major ? 1 : 0.85 });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(pos.x, pos.y + (major ? 0.65 : 0.45), pos.z);
        sprite.scale.set(major ? 3.5 : 2.4, major ? 0.875 : 0.6, 1);
        scene.add(sprite);
        labelSprites.push(sprite);
      };

      nodes
        .map((node, idx) => {
          const isHub = hubIndices.has(idx);
          const isImportantType = node.type === 'PROJECT' || node.type === 'CONVERSATION' || node.type === 'SYSTEM';
          const isAgentFocus = node.origin === 'agent' || node.origin === 'both';
          let priority = 0;
          if (isHub) priority += 2;
          if (isImportantType) priority += 3;
          if (isAgentFocus) priority += 4;
          return { node, idx, priority, major: isHub || isImportantType };
        })
        .filter((c) => c.priority > 0)
        .sort((a, b) => b.priority - a.priority)
        .slice(0, MAX_LABELS)
        .forEach(({ node, idx, major }) => {
          const pos = neuronPos[idx];
          if (pos) mkLabelSprite(node, pos, major);
        });
    }

    // ── Axon connections ──────────────────────────────────────────────────────
    const axonGeo = new THREE.BufferGeometry();
    const axonPosArr = new Float32Array(connectionPairs.length * 6);
    const axonColArr = new Float32Array(connectionPairs.length * 6);
    connectionPairs.forEach(([a, b], i) => {
      const pa = neuronPos[a];
      const pb = neuronPos[b];
      if (pa && pb) axonPosArr.set([pa.x, pa.y, pa.z, pb.x, pb.y, pb.z], i * 6);
      const colorA = nodes[a]?.data?.color ? new THREE.Color(nodes[a].data.color) : null;
      const colorB = nodes[b]?.data?.color ? new THREE.Color(nodes[b].data.color) : null;
      const cA = colorA || new THREE.Color().lerpColors(pColor, sColor, Math.random());
      const cB = colorB || new THREE.Color().lerpColors(sColor, pColor, Math.random());
      const origin = connectionOrigins[i];
      if (origin === 'agent' || origin === 'both') {
        cA.lerp(new THREE.Color(0xffffff), 0.5);
        cB.lerp(new THREE.Color(0xffffff), 0.5);
      }
      axonColArr.set([cA.r, cA.g, cA.b, cB.r, cB.g, cB.b], i * 6);
    });
    axonGeo.setAttribute('position', new THREE.BufferAttribute(axonPosArr, 3));
    axonGeo.setAttribute('color', new THREE.BufferAttribute(axonColArr, 3));
    const axonMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.13, depthWrite: false });
    const axons = new THREE.LineSegments(axonGeo, axonMat);
    scene.add(axons);

    // ── Ambient micro-particles (glia / myelin) ───────────────────────────────
    const gliaGeo = new THREE.BufferGeometry();
    const gliaPosArr = new Float32Array(GLIA_COUNT * 3);
    for (let i = 0; i < GLIA_COUNT * 3; i++) gliaPosArr[i] = (Math.random() - 0.5) * 55;
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
    interface Pulse { mesh: THREE.Mesh; connIdx: number; t: number; speed: number }
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
        connIdx: connectionPairs.length > 0 ? Math.floor(Math.random() * connectionPairs.length) : 0,
        t: Math.random(),
        speed: 0.0035 + Math.random() * 0.006,
      };
    });

    // ── Resize handling ───────────────────────────────────────────────────────
    const resizeObserver = new ResizeObserver(() => {
      const cw = canvas.parentElement?.clientWidth || canvas.clientWidth;
      const ch = canvas.parentElement?.clientHeight || canvas.clientHeight;
      renderer.setSize(cw, ch, false);
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(canvas.parentElement || canvas);

    // ── Connection index: neuron → connectionPair indices ─────────────────────
    const connsByNeuron: Map<number, number[]> = new Map();
    connectionPairs.forEach(([a, b], ci) => {
      if (!connsByNeuron.has(a)) connsByNeuron.set(a, []);
      if (!connsByNeuron.has(b)) connsByNeuron.set(b, []);
      connsByNeuron.get(a)!.push(ci);
      connsByNeuron.get(b)!.push(ci);
    });

    // ── Burst pulse pool ───────────────────────────────────────────────────────
    interface BurstPulse { mesh: THREE.Mesh; connIdx: number; t: number; speed: number; active: boolean }
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

    // ── Flash connections pool ─────────────────────────────────────────────────
    interface FlashConn { line: THREE.Line; mat: THREE.LineBasicMaterial; geo: THREE.BufferGeometry; life: number }
    const flashConns: FlashConn[] = Array.from({ length: FLASH_CONN_POOL }, () => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const mat = new THREE.LineBasicMaterial({ color: pulseColor, transparent: true, opacity: 0, depthWrite: false });
      const line = new THREE.Line(geo, mat);
      scene.add(line);
      return { line, mat, geo, life: 0 };
    });

    // ── Hub flash spheres ──────────────────────────────────────────────────────
    const hubFlash = new Float32Array(activeHubCount);
    const hubFlashSpheres: THREE.Mesh[] = hubIndexArray.map(() => {
      const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 7, 7), flashMat);
      mesh.visible = false;
      scene.add(mesh);
      return mesh;
    });

    // ── New-node flash pool ────────────────────────────────────────────────────
    const NODE_FLASH_POOL = 20;
    const nodeFlashSpheres: THREE.Mesh[] = Array.from({ length: NODE_FLASH_POOL }, () => {
      const mat = new THREE.MeshBasicMaterial({
        color: pulseColor.clone(),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), mat);
      mesh.visible = false;
      scene.add(mesh);
      return mesh;
    });
    const nodeFlashLife = new Float32Array(NODE_FLASH_POOL);
    const flashedNodes = new Set<string>();
    const flashedEdges = new Set<string>();

    const raycaster = new THREE.Raycaster();
    const idxByKey = new Map<string, number>();
    nodes.forEach((n, i) => idxByKey.set(String(n.id), i));

    // ── Interaction: cursor pulses only while the pointer is over the canvas ──
    const mouseState = { x: 0, y: 0, moved: false };
    let lastCursorPulseMs = 0;
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
      mouseState.x = e.clientX;
      mouseState.y = e.clientY;
      mouseState.moved = true;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const spawnCursorPulse = (neuronIdx: number) => {
      const conns = connsByNeuron.get(neuronIdx);
      if (!conns || conns.length === 0) return;
      const slot = burstPulses.find((bp) => !bp.active);
      if (!slot) return;
      slot.connIdx = conns[Math.floor(Math.random() * conns.length)];
      slot.t = 0;
      slot.speed = 0.018 + Math.random() * 0.012;
      slot.active = true;
      slot.mesh.visible = true;
    };

    const spawnFlashConn = (idxA: number, idxB: number) => {
      const slot = flashConns.find((fc) => fc.life <= 0);
      if (!slot) return;
      const pa = neuronPos[idxA];
      const pb = neuronPos[idxB];
      if (!pa || !pb) return;
      const posAttr = slot.geo.getAttribute('position') as THREE.BufferAttribute;
      posAttr.setXYZ(0, pa.x, pa.y, pa.z);
      posAttr.setXYZ(1, pb.x, pb.y, pb.z);
      posAttr.needsUpdate = true;
      slot.mat.color.copy(Math.random() < 0.5 ? pulseColor : pulseColorAlt);
      slot.life = 1;
    };

    const spawnHubBurst = (hubArrayIdx: number) => {
      const neuronIdx = hubIndexArray[hubArrayIdx];
      if (neuronIdx === undefined) return;
      const conns = connsByNeuron.get(neuronIdx) ?? [];
      const toFire = Math.min(conns.length, 4);
      for (let k = 0; k < toFire; k++) {
        const slot = burstPulses.find((bp) => !bp.active);
        if (!slot) break;
        slot.connIdx = conns[k];
        slot.t = 0;
        slot.speed = 0.02 + Math.random() * 0.015;
        slot.active = true;
        slot.mesh.visible = true;
      }
      hubFlash[hubArrayIdx] = 1;
      const sphere = hubFlashSpheres[hubArrayIdx];
      const p = neuronPos[neuronIdx];
      if (p && sphere) {
        sphere.position.copy(p);
        sphere.visible = true;
      }
      const farIdx = Math.floor(Math.random() * activeNeuronCount);
      if (farIdx !== neuronIdx) spawnFlashConn(neuronIdx, farIdx);
    };

    // ── Animation loop ────────────────────────────────────────────────────────
    let frameId: number;
    let t = 0;
    let nextAmbientBurst = performance.now() + 2500;

    const tick = () => {
      frameId = requestAnimationFrame(tick);
      t += 0.003;
      const now = performance.now();

      // Orbital camera — floating slowly inside the network
      camera.position.x = Math.sin(t * 0.11) * CAM_RADIUS;
      camera.position.z = Math.cos(t * 0.11) * CAM_RADIUS;
      camera.position.y = Math.sin(t * 0.065) * 5;
      camera.lookAt(0, 0, 0);

      hubNeurons.mat.opacity = 0.65 + Math.sin(t * 0.9) * 0.22;
      axonMat.opacity = 0.09 + Math.sin(t * 0.4) * 0.04;

      // Cursor pulse + flash connection while hovering the canvas
      if (mouseState.moved && now - lastCursorPulseMs > CURSOR_PULSE_INTERVAL_MS && activeNeuronCount > 0) {
        mouseState.moved = false;
        lastCursorPulseMs = now;
        const rect = canvas.getBoundingClientRect();
        const ndcX = ((mouseState.x - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((mouseState.y - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
        let minDist = Infinity;
        let closestNeuron = 0;
        for (let i = 0; i < neuronPos.length; i++) {
          const d = raycaster.ray.distanceToPoint(neuronPos[i]);
          if (d < minDist) {
            minDist = d;
            closestNeuron = i;
          }
        }
        spawnCursorPulse(closestNeuron);
        const distantIdx = (closestNeuron + Math.floor(activeNeuronCount / 2) + Math.floor(Math.random() * 10)) % activeNeuronCount;
        spawnFlashConn(closestNeuron, distantIdx);
      }

      // Ambient hub bursts on a gentle random cadence
      if (now > nextAmbientBurst && activeHubCount > 0) {
        spawnHubBurst(Math.floor(Math.random() * activeHubCount));
        nextAmbientBurst = now + 1800 + Math.random() * 3200;
      }

      // Background pulses
      if (connectionPairs.length > 0) {
        pulses.forEach((pulse) => {
          pulse.t += pulse.speed;
          if (pulse.t >= 1) {
            pulse.t = 0;
            pulse.connIdx = Math.floor(Math.random() * connectionPairs.length);
            (pulse.mesh.material as THREE.MeshBasicMaterial).color.copy(Math.random() < 0.65 ? pulseColor : pulseColorAlt);
          }
          const [a, b] = connectionPairs[pulse.connIdx];
          const pa = neuronPos[a];
          const pb = neuronPos[b];
          if (pa && pb) {
            pulse.mesh.visible = true;
            pulse.mesh.position.lerpVectors(pa, pb, pulse.t);
            const bright = Math.sin(pulse.t * Math.PI);
            (pulse.mesh.material as THREE.MeshBasicMaterial).opacity = 0.35 + bright * 0.65;
            pulse.mesh.scale.setScalar(0.5 + bright * 1.1);
          }
        });
      }

      // Burst pulses
      burstPulses.forEach((bp) => {
        if (!bp.active) return;
        bp.t += bp.speed;
        if (bp.t >= 1) {
          bp.active = false;
          bp.mesh.visible = false;
          return;
        }
        const pair = connectionPairs[bp.connIdx];
        if (!pair) return;
        const pa = neuronPos[pair[0]];
        const pb = neuronPos[pair[1]];
        if (pa && pb) {
          bp.mesh.position.lerpVectors(pa, pb, bp.t);
          const bright = Math.sin(bp.t * Math.PI);
          (bp.mesh.material as THREE.MeshBasicMaterial).opacity = 0.7 + bright * 0.3;
          bp.mesh.scale.setScalar(0.8 + bright * 0.8);
        }
      });

      // Flash connections fade out
      flashConns.forEach((fc) => {
        if (fc.life <= 0) return;
        fc.life -= 0.018;
        fc.mat.opacity = Math.max(0, fc.life * 0.7);
      });

      // Hub flash spheres decay
      for (let i = 0; i < hubFlash.length; i++) {
        if (hubFlash[i] <= 0) continue;
        hubFlash[i] = Math.max(0, hubFlash[i] - 0.025);
        const sphere = hubFlashSpheres[i];
        if (sphere) {
          (sphere.material as THREE.MeshBasicMaterial).opacity = hubFlash[i] * 0.75;
          sphere.scale.setScalar(1 + (1 - hubFlash[i]) * 1.5);
          if (hubFlash[i] <= 0) sphere.visible = false;
        }
      }

      // Newly arrived nodes/edges flash once, then their birth entries are pruned.
      nodeBirthTimesRef.current.forEach((birthTime, key) => {
        if (now - birthTime >= FLASH_DURATION_MS) {
          nodeBirthTimesRef.current.delete(key);
          flashedNodes.delete(key);
          return;
        }
        if (flashedNodes.has(key)) return;
        const idx = idxByKey.get(key);
        if (idx === undefined) return;
        const slotIdx = nodeFlashLife.findIndex((life) => life <= 0);
        if (slotIdx < 0) return;
        const p = neuronPos[idx];
        if (!p) return;
        const slot = nodeFlashSpheres[slotIdx];
        slot.position.copy(p);
        slot.visible = true;
        nodeFlashLife[slotIdx] = 1;
        (slot.material as THREE.MeshBasicMaterial).color.copy(pulseColor);
        flashedNodes.add(key);
      });
      edgeBirthTimesRef.current.forEach((birthTime, key) => {
        if (now - birthTime >= FLASH_DURATION_MS) {
          edgeBirthTimesRef.current.delete(key);
          flashedEdges.delete(key);
          return;
        }
        if (flashedEdges.has(key)) return;
        const [sourceKey, targetKey] = key.split('>');
        const sourceIdx = idxByKey.get(sourceKey);
        const targetIdx = idxByKey.get(targetKey);
        if (sourceIdx !== undefined && targetIdx !== undefined) {
          spawnFlashConn(sourceIdx, targetIdx);
          flashedEdges.add(key);
        }
      });

      nodeFlashSpheres.forEach((mesh, i) => {
        if (nodeFlashLife[i] <= 0) return;
        nodeFlashLife[i] -= 0.018;
        const life = Math.max(0, nodeFlashLife[i]);
        (mesh.material as THREE.MeshBasicMaterial).opacity = life * 0.85;
        mesh.scale.setScalar(1 + (1 - life) * 1.8);
        if (life <= 0) mesh.visible = false;
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
      hubNeurons.geo.dispose();
      hubNeurons.mat.dispose();
      regularNeurons.geo.dispose();
      regularNeurons.mat.dispose();
      agentNeurons.geo.dispose();
      agentNeurons.mat.dispose();
      axonGeo.dispose();
      axonMat.dispose();
      gliaGeo.dispose();
      gliaMat.dispose();
      pulseGeo.dispose();
      burstGeo.dispose();
      pulses.forEach((p) => (p.mesh.material as THREE.Material).dispose());
      burstPulses.forEach((p) => (p.mesh.material as THREE.Material).dispose());
      flashConns.forEach((fc) => { fc.geo.dispose(); fc.mat.dispose(); });
      hubFlashSpheres.forEach((s) => { (s.geometry as THREE.BufferGeometry).dispose(); (s.material as THREE.Material).dispose(); });
      nodeFlashSpheres.forEach((s) => { (s.geometry as THREE.BufferGeometry).dispose(); (s.material as THREE.Material).dispose(); });
      labelSprites.forEach((sprite) => {
        sprite.material.map?.dispose();
        sprite.material.dispose();
      });
      renderer.dispose();
    };
  }, [primaryColor, secondaryColor, mode, graphData, showLabels]);

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
