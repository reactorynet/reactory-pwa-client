/**
 * NeuralBrainBackground — Three.js WebGL canvas that renders an immersive
 * "inside a living neural brain" aesthetic with interactive responses.
 *
 * Renders two overlaid graph perspectives:
 *  1. The synthesized conversation graph (ReactorSubgraph around the
 *     conversation node, produced by ProcessConversationWorkflow).
 *  2. The agent's live graph perspective — nodes/edges the agent has touched
 *     through the reactor graph tools (searchGraph, exploreGraph,
 *     getGraphNode, graphChildren, graphLinks, createNodeEdge) during the
 *     active session, extracted from tool results in the chat history.
 *
 * Operates in two modes:
 *  - Background mode (default): pointer-events-off ambient layer behind the
 *    chat, auto-orbiting camera.
 *  - Interactive mode (backgroundMode={false}, e.g. mounted directly as a
 *    component in the side panel): pause/resume, label toggle, reset view,
 *    and full camera control (drag to orbit, shift/right-drag to pan,
 *    wheel to zoom).
 *
 * Can fall back to a procedurally generated neural network of clusters,
 * hubs, and axons when no graph data is available.
 *
 * All Three.js resources are disposed on unmount.
 */

import React, { useEffect, useRef, memo, useState } from 'react';
import * as THREE from 'three';

export type NeuralGraphOrigin = 'conversation' | 'agent' | 'both';

import { Dialog, DialogContent, Box as MuiBox, Typography as MuiTypography, IconButton as MuiIconButton, Icon as MuiIcon, Popover, TextField, InputAdornment, MenuItem } from '@mui/material';
import File from '@reactory/client-core/components/shared/File';

export interface NeuralGraphNode {
  id: string | number;
  name: string;
  type?: string;
  /** Which perspective produced this node. Defaults to 'conversation'. */
  origin?: NeuralGraphOrigin;
  /** Number of descendants hidden because this node is collapsed. */
  collapsedCount?: number;
  /** Custom data payload holding color, relativePath, etc. */
  data?: any;
  /** Absolute source file path */
  source?: string;
  /** Relative source file path */
  path?: string;
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

/**
 * A named view into the system graph. Built-ins ('conversation', 'agent')
 * derive from session data; 'root' perspectives load a ReactorSubgraph around
 * a project root node; 'saved' perspectives come from ReactorGraphPerspectives.
 */
export interface GraphPerspective {
  id: string;
  label: string;
  kind: 'conversation' | 'agent' | 'root' | 'saved';
  /** System graph node id to load a subgraph around (root/saved kinds). */
  rootId?: number;
  depth?: number;
  /** Explicit array of saved node IDs for saved perspectives. */
  nodeIds?: number[];
  perspectiveId?: string;
}

export const BUILT_IN_PERSPECTIVES: GraphPerspective[] = [
  { id: 'conversation', label: 'Conversation', kind: 'conversation' },
  { id: 'agent', label: 'Agent perspective', kind: 'agent' },
];

export interface NeuralBrainBackgroundProps {
  primaryColor: string;
  secondaryColor: string;
  /** 'dark' uses a deep navy fog; 'light' uses a pale indigo fog */
  mode?: 'dark' | 'light' | string;
  /** Custom background color override for the wrapper container when in side panel or standalone mode */
  backgroundColor?: string;
  /** Whether to render labels above the major hub nodes / important nodes */
  showLabels?: boolean;
  /** Optional system graph data to feed the neuron visualization */
  graphData?: NeuralGraphData;
  /** Optional Reactory SDK instance for self-fetching graphData when mounted stand-alone */
  reactory?: Reactory.Client.ReactorySDK;
  /**
   * Chat history (UXChatMessage[]) for synthesizing the agent's graph
   * perspective from graph tool results. When omitted in stand-alone mode the
   * cached session history from localStorage is used instead.
   */
  messages?: any[];
  /**
   * Active chat session id for the stand-alone self-fetch. Falls back to the
   * cached session in localStorage when omitted.
   */
  sessionId?: string;
  /**
   * true (default): ambient background layer, no pointer events, auto-orbit.
   * false: interactive component — pause, labels toggle, pan/orbit/zoom.
   */
  backgroundMode?: boolean;
  /**
   * Perspective to activate — either a perspective id ('conversation',
   * 'agent', 'root:<rootId>', 'saved:<id>') or a full GraphPerspective.
   * Used by the loadGraphPerspective tool so the agent can steer the viewer.
   */
  perspective?: GraphPerspective | string;
  /**
   * Pins the active perspective (and the selected node, when present) to the
   * chat session so the agent knows the user's graph context. The host is
   * expected to persist it as a background user message (no inference run).
   */
  onPinPerspective?: (perspective: GraphPerspective, node: NeuralGraphNode | null) => Promise<void> | void;
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
// Background mode labels sparsely (ambient layer); the interactive viewer
// labels every node it can, prioritized, up to its own budget.
const MAX_LABELS = 24;
const MAX_LABELS_INTERACTIVE = 100;

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

/** Stable signature so identical graph payloads don't trigger scene rebuilds. */
export const graphSignature = (g: NeuralGraphData): string =>
  `${g.nodes.map((n) => String(n.id)).sort().join(',')}|${g.edges
    .map((e) => `${e.sourceId}>${e.targetId}`)
    .sort()
    .join(',')}`;

/** Merges the conversation subgraph with the agent perspective, tagging origins. */
const mergeGraphs = (
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
    if (existing) {
      nodes.set(key, { ...existing, origin: 'both' });
    } else {
      nodes.set(key, { ...n, origin: 'agent' });
    }
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
  backgroundColor,
  showLabels = true,
  graphData: externalGraphData,
  reactory,
  messages,
  sessionId,
  backgroundMode = true,
  perspective,
  onPinPerspective,
}: NeuralBrainBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [localGraphData, setLocalGraphData] = React.useState<NeuralGraphData | null>(null);
  const localSigRef = useRef('');
  const [agentGraph, setAgentGraph] = React.useState<NeuralGraphData | null>(null);
  const agentSigRef = useRef('');

  // Interactive-mode UI state. Pause lives in a ref so toggling it never
  // rebuilds the scene; state mirrors it for the button glyph.
  const [paused, setPaused] = React.useState(false);
  const pausedRef = useRef(false);
  const [labelsVisible, setLabelsVisible] = React.useState(showLabels);
  const resetViewRef = useRef<() => void>(() => { });

  // Node selection + collapse state (interactive mode). Selection never
  // rebuilds the scene (highlight is driven through a ref); collapsing does,
  // because it changes the visible node set.
  const [selectedNode, setSelectedNode] = React.useState<NeuralGraphNode | null>(null);
  const selectedNodeRef = useRef<NeuralGraphNode | null>(null);
  const [collapsedIds, setCollapsedIds] = React.useState<Set<string>>(() => new Set());

  // Perspective state (interactive mode): which named view of the graph is
  // active, the list the dropdown offers, and the loaded root subgraph.
  const [activePerspective, setActivePerspective] = React.useState<GraphPerspective>(BUILT_IN_PERSPECTIVES[0]);
  const [availablePerspectives, setAvailablePerspectives] = React.useState<GraphPerspective[]>(BUILT_IN_PERSPECTIVES);
  const [perspectiveGraph, setPerspectiveGraph] = React.useState<NeuralGraphData | null>(null);
  const perspectiveSigRef = useRef('');
  const [pinBusy, setPinBusy] = React.useState(false);
  const [pinnedKeys, setPinnedKeys] = React.useState<Set<string>>(() => new Set());
  const [previewFilePath, setPreviewFilePath] = React.useState<string | null>(null);

  // Search filter and anchor state for searchable perspective dropdown
  const [perspectiveSearchFilter, setPerspectiveSearchFilter] = React.useState('');
  const [perspectiveMenuAnchor, setPerspectiveMenuAnchor] = React.useState<null | HTMLElement>(null);

  const filteredPerspectives = React.useMemo(() => {
    if (!perspectiveSearchFilter.trim()) return availablePerspectives;
    const term = perspectiveSearchFilter.toLowerCase();
    return availablePerspectives.filter(
      (p) => p.label.toLowerCase().includes(term) || p.id.toLowerCase().includes(term)
    );
  }, [availablePerspectives, perspectiveSearchFilter]);

  const applyAgentGraph = React.useCallback((g: NeuralGraphData) => {
    const sig = graphSignature(g);
    if (sig === agentSigRef.current) return;
    agentSigRef.current = sig;
    setAgentGraph(g.nodes.length > 0 ? g : null);
  }, []);

  // Agent perspective from live chat history (when hosted by ReactorChat).
  React.useEffect(() => {
    if (!messages) return;
    applyAgentGraph(extractAgentGraphFromMessages(messages));
  }, [messages, applyAgentGraph]);

  // Stand-alone mode: self-fetch the conversation subgraph and synthesize the
  // agent perspective from the cached session history.
  React.useEffect(() => {
    if (externalGraphData || !reactory) return;

    let active = true;

    const fetchGraph = async () => {
      try {
        const saved = localStorage.getItem('reactorChat.cachedSession');
        const cachedChatState = saved ? JSON.parse(saved)?.chatState : undefined;
        const activeSessionId = sessionId ?? cachedChatState?.id;
        if (!activeSessionId) return;

        // Agent perspective from the cached history (no server round-trip).
        if (!messages && Array.isArray(cachedChatState?.history)) {
          applyAgentGraph(extractAgentGraphFromMessages(cachedChatState.history));
        }

        // 1. Search for the node representing the conversation
        const searchRes = await reactory.graphqlQuery<any, any>(`
          query GetConversationNode($term: String!) {
            ReactorNodesByTerm(term: $term) {
              id
              name
              type
            }
          }
        `, { term: activeSessionId });

        const node = searchRes.data?.ReactorNodesByTerm?.[0];
        if (!node || !active) return;

        // 2. Fetch its neighborhood subgraph
        const subgraphRes = await reactory.graphqlQuery<any, any>(`
          query ConversationSubgraph($rootId: Int!) {
            ReactorSubgraph(rootId: $rootId, depth: 2, limit: 120, materialize: true) {
              nodes {
                id
                name
                type
              }
              links {
                id
                sourceId
                targetId
              }
            }
          }
        `, { rootId: node.id });

        if (!active) return;

        const subgraph = subgraphRes.data?.ReactorSubgraph;
        if (subgraph && subgraph.nodes && subgraph.nodes.length > 0) {
          const data: NeuralGraphData = {
            nodes: subgraph.nodes.map((n: any) => ({ id: n.id, name: n.name, type: n.type })),
            edges: subgraph.links.map((l: any) => ({ sourceId: l.sourceId, targetId: l.targetId })),
          };
          // Only update state (and rebuild the scene) when the graph changed.
          const sig = graphSignature(data);
          if (sig !== localSigRef.current) {
            localSigRef.current = sig;
            setLocalGraphData(data);
          }
        }
      } catch (err) {
        reactory.log('Failed to fetch local graph data for background', { err }, 'warn');
      }
    };

    fetchGraph();

    // Re-check periodically
    const interval = setInterval(fetchGraph, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [externalGraphData, reactory, messages, sessionId, applyAgentGraph]);

  // ── Perspective plumbing (interactive mode) ────────────────────────────────

  // Enumerate available perspectives: built-ins + one root per cataloged
  // project (ReactorCatalogNodes — `index` carries the numeric root id) +
  // the user's saved graph perspectives.
  React.useEffect(() => {
    if (backgroundMode || !reactory) return;
    let active = true;
    (async () => {
      try {
        const [catalogRes, savedRes] = await Promise.all([
          reactory.graphqlQuery<any, any>(`
            query ReactorGraphPerspectiveRoots {
              ReactorCatalogNodes {
                nodes { id index name nameSpace type }
              }
            }
          `, {}),
          reactory.graphqlQuery<any, any>(`
            query ReactorSavedGraphPerspectives {
              ReactorGraphPerspectives { id name rootNodeId projectId nodePositions { nodeId } }
            }
          `, {}).catch(() => ({ data: undefined })),
        ]);
        if (!active) return;
        const roots: GraphPerspective[] = (catalogRes.data?.ReactorCatalogNodes?.nodes ?? [])
          .filter((n: any) => n?.index !== undefined && n?.index !== null)
          .map((n: any) => ({
            id: `root:${n.index}`,
            label: n.nameSpace ? `${n.nameSpace}.${n.name}` : n.name,
            kind: 'root' as const,
            rootId: n.index,
          }));
        const saved: GraphPerspective[] = ((savedRes as any)?.data?.ReactorGraphPerspectives ?? [])
          .map((p: any) => {
            let rootId = p.rootNodeId;
            if (rootId === undefined || rootId === null) {
              const matchedRoot = roots.find((r) => r.label.toLowerCase().includes((p.name || '').toLowerCase()));
              if (matchedRoot) rootId = matchedRoot.rootId;
            }
            const savedNodeIds = (p.nodePositions || [])
              .map((np: any) => Number(np.nodeId))
              .filter((n: number) => !isNaN(n) && n !== 0);
            return {
              id: `saved:${p.id}`,
              label: `★ ${p.name}`,
              kind: 'saved' as const,
              rootId: rootId ?? undefined,
              nodeIds: savedNodeIds.length > 0 ? savedNodeIds : undefined,
              perspectiveId: p.id,
            };
          });
        setAvailablePerspectives([...BUILT_IN_PERSPECTIVES, ...roots, ...saved]);
      } catch (err) {
        reactory.log('Failed to enumerate graph perspectives', { err }, 'warn');
      }
    })();
    return () => { active = false; };
  }, [backgroundMode, reactory]);

  // Honor the `perspective` prop (set by the loadGraphPerspective tool).
  // Each prop value is applied once — after that the user's own dropdown
  // choices win, even if the same prop is re-pushed by the host.
  const appliedPerspectiveRef = useRef<GraphPerspective | string | null>(null);
  React.useEffect(() => {
    if (!perspective || appliedPerspectiveRef.current === perspective) return;
    if (typeof perspective === 'string') {
      const term = perspective.toLowerCase();
      const match = availablePerspectives.find(
        (p) => p.id.toLowerCase() === term || p.label.toLowerCase().includes(term),
      );
      if (match) {
        appliedPerspectiveRef.current = perspective;
        setActivePerspective(match);
      }
      // No match yet — leave unapplied so a later availablePerspectives
      // refresh can resolve it.
      return;
    }
    if (perspective.kind || perspective.rootId !== undefined) {
      appliedPerspectiveRef.current = perspective;
      setActivePerspective({
        id: perspective.id ?? (perspective.rootId !== undefined ? `root:${perspective.rootId}` : 'conversation'),
        label: perspective.label ?? String(perspective.id ?? perspective.rootId),
        kind: perspective.kind ?? 'root',
        rootId: perspective.rootId,
        depth: perspective.depth,
      });
    }
  }, [perspective, availablePerspectives]);

  // Load (and slowly refresh) the subgraph for root/saved perspectives.
  // Direct GraphQL — perspective browsing never triggers agent tool calls.
  React.useEffect(() => {
    if (backgroundMode || !reactory) return;

    // Reset graph state, selections, and signatures immediately on perspective change
    perspectiveSigRef.current = '';
    setPerspectiveGraph(null);
    selectedNodeRef.current = null;
    setSelectedNode(null);
    setCollapsedIds(new Set());

    const rootId = activePerspective?.rootId;
    const nodeIds = activePerspective?.nodeIds;
    const perspectiveId = activePerspective?.perspectiveId;

    if (rootId === undefined && rootId === null && (!nodeIds || nodeIds.length === 0) && !perspectiveId) {
      return;
    }

    let active = true;
    const fetchPerspective = async () => {
      try {
        let fetchedNodes: any[] = [];
        let fetchedEdges: any[] = [];

        // 1. Fetch nodes by explicit nodeIds if present (saved perspectives)
        if (nodeIds && nodeIds.length > 0) {
          const res = await reactory.graphqlQuery<any, any>(`
            query LoadSavedPerspectiveNodes($ids: [Int!]!) {
              ReactorNodes(ids: $ids) { id index name type }
              ReactorNodeLinks(sources: $ids, targets: $ids, paging: { page: 1, pageSize: 500 }) {
                links { id sourceId targetId }
              }
            }
          `, { ids: nodeIds });
          if (!active) return;
          if (res.data?.ReactorNodes) {
            fetchedNodes = res.data.ReactorNodes;
          }
          if (res.data?.ReactorNodeLinks?.links) {
            fetchedEdges = res.data.ReactorNodeLinks.links;
          }
        }

        // 2. Fetch subgraph for rootId if present
        if (rootId !== undefined && rootId !== null) {
          const subRes = await reactory.graphqlQuery<any, any>(`
            query LoadGraphPerspective($rootId: Int!, $depth: Int) {
              ReactorSubgraph(rootId: $rootId, depth: $depth, direction: BOTH, limit: 500, includeContainment: true, materialize: true) {
                nodes { id index name type }
                links { id sourceId targetId }
              }
            }
          `, { rootId, depth: activePerspective.depth ?? 2 });
          if (!active) return;
          const sg = subRes.data?.ReactorSubgraph;
          if (sg?.nodes?.length) {
            const existingNodeIds = new Set(fetchedNodes.map((n: any) => n.index ?? Number(n.id)));
            sg.nodes.forEach((n: any) => {
              const nid = n.index ?? Number(n.id);
              if (!existingNodeIds.has(nid)) {
                existingNodeIds.add(nid);
                fetchedNodes.push(n);
              }
            });
            if (sg.links) {
              fetchedEdges = [...fetchedEdges, ...sg.links];
            }
          }
        }

        // 3. Fallback for saved perspectives without pre-loaded nodeIds
        if (fetchedNodes.length === 0 && activePerspective.kind === 'saved' && perspectiveId) {
          const pRes = await reactory.graphqlQuery<any, any>(`
            query LoadFullSavedPerspective($id: String!) {
              ReactorGraphPerspective(id: $id) {
                id
                rootNodeId
                nodePositions { nodeId }
              }
            }
          `, { id: perspectiveId });
          if (!active) return;
          const pData = pRes.data?.ReactorGraphPerspective;
          if (pData) {
            const detailNodeIds = (pData.nodePositions || [])
              .map((np: any) => Number(np.nodeId))
              .filter((n: number) => !isNaN(n) && n !== 0);
            const detailRootId = pData.rootNodeId;

            if (detailNodeIds.length > 0) {
              const nodesRes = await reactory.graphqlQuery<any, any>(`
                query LoadSavedNodesDetail($ids: [Int!]!) {
                  ReactorNodes(ids: $ids) { id index name type }
                  ReactorNodeLinks(sources: $ids, targets: $ids, paging: { page: 1, pageSize: 500 }) {
                    links { id sourceId targetId }
                  }
                }
              `, { ids: detailNodeIds });
              if (!active) return;
              if (nodesRes.data?.ReactorNodes) fetchedNodes = nodesRes.data.ReactorNodes;
              if (nodesRes.data?.ReactorNodeLinks?.links) fetchedEdges = nodesRes.data.ReactorNodeLinks.links;
            }

            if (fetchedNodes.length === 0 && detailRootId !== undefined && detailRootId !== null) {
              const subRes = await reactory.graphqlQuery<any, any>(`
                query LoadGraphPerspectiveSub($rootId: Int!, $depth: Int) {
                  ReactorSubgraph(rootId: $rootId, depth: $depth, direction: BOTH, limit: 500, includeContainment: true, materialize: true) {
                    nodes { id index name type }
                    links { id sourceId targetId }
                  }
                }
              `, { rootId: detailRootId, depth: activePerspective.depth ?? 2 });
              if (!active) return;
              const sg = subRes.data?.ReactorSubgraph;
              if (sg?.nodes?.length) {
                fetchedNodes = sg.nodes;
                fetchedEdges = sg.links || [];
              }
            }
          }
        }

        if (!active) return;

        if (fetchedNodes.length > 0) {
          const data: NeuralGraphData = {
            nodes: fetchedNodes.map((n: any) => ({
              id: n.index !== undefined && n.index !== null ? n.index : (isNaN(Number(n.id)) ? n.id : Number(n.id)),
              name: n.name,
              type: n.type,
            })),
            edges: (fetchedEdges || []).map((l: any) => ({
              sourceId: l.sourceId ?? l.source,
              targetId: l.targetId ?? l.target,
            })),
          };
          const sig = graphSignature(data);
          if (sig !== perspectiveSigRef.current) {
            perspectiveSigRef.current = sig;
            setPerspectiveGraph(data);
          }
        } else {
          setPerspectiveGraph(null);
        }
      } catch (err) {
        reactory.log('Failed to load graph perspective subgraph', { err, activePerspective }, 'warn');
        if (active) setPerspectiveGraph(null);
      }
    };

    fetchPerspective();
    const interval = setInterval(fetchPerspective, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [backgroundMode, reactory, activePerspective]);

  const conversationGraph = externalGraphData || localGraphData;

  // The base graph the active perspective provides; the agent's perspective
  // overlay merges on top of whichever base is showing.
  const baseGraph =
    backgroundMode || activePerspective.kind === 'conversation' ? conversationGraph
      : activePerspective.kind === 'agent' ? null
        : perspectiveGraph;

  const graphData = React.useMemo(() => {
    if (activePerspective.kind === 'root' || activePerspective.kind === 'saved') {
      return baseGraph;
    }
    return mergeGraphs(baseGraph, agentGraph);
  }, [baseGraph, agentGraph, activePerspective.kind]);

  // Direct child counts (outgoing edges) — decides whether a node is collapsible.
  const childCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    (graphData?.edges ?? []).forEach((e) => {
      const key = String(e.sourceId);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [graphData]);
  const childCountsRef = useRef(childCounts);
  childCountsRef.current = childCounts;

  // Children render by default; collapsing a node hides its whole subtree
  // (BFS over outgoing edges, cycle-safe) and stamps the node with the count
  // of hidden descendants so its label can show "(+N)".
  const visibleGraph = React.useMemo(() => {
    if (!graphData) return null;
    if (collapsedIds.size === 0) return graphData;
    const out = new Map<string, string[]>();
    graphData.edges.forEach((e) => {
      const s = String(e.sourceId);
      if (!out.has(s)) out.set(s, []);
      out.get(s)!.push(String(e.targetId));
    });
    const hidden = new Set<string>();
    const hiddenCounts = new Map<string, number>();
    collapsedIds.forEach((rootKey) => {
      let count = 0;
      const seen = new Set<string>([rootKey]);
      const queue = [...(out.get(rootKey) ?? [])];
      while (queue.length > 0) {
        const key = queue.shift()!;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!hidden.has(key)) {
          hidden.add(key);
          count++;
        }
        (out.get(key) ?? []).forEach((next) => {
          if (!seen.has(next)) queue.push(next);
        });
      }
      hiddenCounts.set(rootKey, count);
    });
    if (hidden.size === 0) return graphData;
    const nodes = graphData.nodes
      .filter((n) => !hidden.has(String(n.id)))
      .map((n) => {
        const count = hiddenCounts.get(String(n.id));
        return count ? { ...n, collapsedCount: count } : n;
      });
    const keep = new Set(nodes.map((n) => String(n.id)));
    const edges = graphData.edges.filter(
      (e) => keep.has(String(e.sourceId)) && keep.has(String(e.targetId)),
    );
    return { nodes, edges };
  }, [graphData, collapsedIds]);

  // Click semantics: first click selects; a second click on the selected node
  // toggles its subtree; clicking empty space deselects.
  const handleNodeClick = React.useCallback((node: NeuralGraphNode | null) => {
    if (!node) {
      selectedNodeRef.current = null;
      setSelectedNode(null);
      return;
    }
    const key = String(node.id);
    if (selectedNodeRef.current && String(selectedNodeRef.current.id) === key) {
      if ((childCountsRef.current.get(key) ?? 0) > 0) {
        setCollapsedIds((prev) => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key); else next.add(key);
          return next;
        });
      }
      return;
    }
    selectedNodeRef.current = node;
    setSelectedNode(node);
  }, []);
  const handleNodeClickRef = useRef(handleNodeClick);
  handleNodeClickRef.current = handleNodeClick;

  const toggleCollapseSelected = React.useCallback(() => {
    const node = selectedNodeRef.current;
    if (!node) return;
    const key = String(node.id);
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // Pin the active perspective (+ selected node) into the chat session.
  const pinKey = `${activePerspective.id}|${selectedNode ? String(selectedNode.id) : ''}`;
  const isPinned = pinnedKeys.has(pinKey);
  const handlePin = React.useCallback(async () => {
    if (!onPinPerspective || pinBusy) return;
    const node = selectedNodeRef.current;
    const key = `${activePerspective.id}|${node ? String(node.id) : ''}`;
    setPinBusy(true);
    try {
      await onPinPerspective(activePerspective, node);
      setPinnedKeys((prev) => new Set(prev).add(key));
    } catch (err) {
      reactory?.log?.('Failed to pin graph perspective', { err }, 'warn');
    } finally {
      setPinBusy(false);
    }
  }, [onPinPerspective, pinBusy, activePerspective, reactory]);

  // Drop the selection when the node leaves the graph (e.g. new perspective).
  React.useEffect(() => {
    const sel = selectedNodeRef.current;
    if (!sel) return;
    const stillThere = (graphData?.nodes ?? []).some((n) => String(n.id) === String(sel.id));
    if (!stillThere) {
      selectedNodeRef.current = null;
      setSelectedNode(null);
    }
  }, [graphData]);

  const effectiveShowLabels = backgroundMode ? showLabels : labelsVisible;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const interactive = !backgroundMode;

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
      let h = 0;
      const str = String(seed);
      for (let i = 0; i < str.length; i++) {
        h = Math.imul(31, h) + str.charCodeAt(i) | 0;
      }
      const x = Math.sin(h) * 10000;
      return x - Math.floor(x);
    };

    // ── Neuron positions, hubs, and axons ──────────────────────────────────────
    const neuronPos: THREE.Vector3[] = [];
    const hubIndices = new Set<number>();
    const connectionPairs: [number, number][] = [];
    const connectionOrigins: NeuralGraphOrigin[] = [];
    const nodes = visibleGraph?.nodes || [];
    let activeNeuronCount = NEURON_COUNT;
    let activeHubCount = HUB_COUNT;

    if (nodes.length > 0) {
      activeNeuronCount = nodes.length;

      // Group nodes by type to find cluster centers
      const types = Array.from(new Set(nodes.map(n => n.type || 'UNKNOWN')));
      const typeCenters: Record<string, THREE.Vector3> = {};
      types.forEach((type, tIdx) => {
        const theta = (tIdx / types.length) * Math.PI * 2;
        const r = SCENE_RADIUS * 0.6;
        //@ts-ignore
        typeCenters[type] = new THREE.Vector3(
          r * Math.cos(theta),
          //@ts-ignore
          (seedRandom(type) - 0.5) * 6,
          r * Math.sin(theta)
        );
      });

      // Position each node near its type's cluster center
      nodes.forEach((node, idx) => {
        const center = typeCenters[node.type || 'UNKNOWN'] || new THREE.Vector3();
        const randX = (seedRandom(String(node.id) + '_x') - 0.5) * 7;
        const randY = (seedRandom(String(node.id) + '_y') - 0.5) * 7;
        const randZ = (seedRandom(String(node.id) + '_z') - 0.5) * 7;
        neuronPos.push(new THREE.Vector3(
          center.x + randX,
          center.y + randY,
          center.z + randZ
        ));
      });

      // Map edges to connection pairs
      const idToIdx = new Map<string | number, number>();
      nodes.forEach((n, idx) => idToIdx.set(n.id, idx));

      // Calculate degree of each node to find hubs
      const degrees = new Array(activeNeuronCount).fill(0);
      (visibleGraph?.edges ?? []).forEach(edge => {
        const a = idToIdx.get(edge.sourceId);
        const b = idToIdx.get(edge.targetId);
        if (a !== undefined && b !== undefined) {
          connectionPairs.push([a, b]);
          connectionOrigins.push(edge.origin ?? 'conversation');
          degrees[a]++;
          degrees[b]++;
        }
      });

      // If there are no edges, let's add some default nearby connections so it's not empty
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

      // Find top degree nodes or FOLDER/CONVERSATION types as hubs
      const nodeScores = nodes.map((node, idx) => {
        let score = degrees[idx] * 2;
        if (node.type === 'FOLDER' || node.type === 'CONVERSATION' || node.type === 'PROJECT') score += 10;
        return { idx, score };
      });
      nodeScores.sort((a, b) => b.score - a.score);

      activeHubCount = Math.min(Math.max(5, Math.floor(activeNeuronCount * 0.15)), HUB_COUNT, activeNeuronCount);
      for (let i = 0; i < activeHubCount; i++) {
        if (nodeScores[i]) hubIndices.add(nodeScores[i].idx);
      }
    } else {
      // Procedurally generate cluster centers and neuron positions (Fallback)
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

    // Agent-perspective nodes render brighter — closer to white — so the
    // agent's active focus stands out from the ambient conversation graph.
    const colorForNode = (idx: number): THREE.Color => {
      const customColor = nodes[idx]?.data?.color || nodes[idx]?.color;
      if (customColor) {
        return new THREE.Color(customColor);
      }
      const base = new THREE.Color().lerpColors(pColor, sColor, Math.random());
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

    const hubNeurons = mkPoints([...hubIndices], 0.5, 0.85);
    const allIndices = Array.from({ length: activeNeuronCount }, (_, i) => i)
      .filter(i => !hubIndices.has(i));
    const agentIndices = allIndices.filter(i => nodes[i]?.origin === 'agent' || nodes[i]?.origin === 'both');
    const regularIndices = allIndices.filter(i => !(nodes[i]?.origin === 'agent' || nodes[i]?.origin === 'both'));
    const regularNeurons = mkPoints(regularIndices, 0.22, 0.6);
    // Slightly larger + brighter points for the agent's perspective.
    const agentNeurons = mkPoints(agentIndices, 0.32, 0.85);

    // ── Label sprites ─────────────────────────────────────────────────────────
    // Background mode: only hubs and important types, to keep the ambient
    // layer quiet. Interactive mode: every node gets a label, prioritized
    // (agent focus > important types > hubs > rest) within the budget so the
    // most relevant names survive the cap on large graphs.
    const labelSprites: THREE.Sprite[] = [];
    const spriteNodeMap = new Map<THREE.Sprite, number>();
    if (effectiveShowLabels && visibleGraph) {
      const mkLabelSprite = (node: NeuralGraphNode, pos: THREE.Vector3, major: boolean, idx: number) => {
        let name = String(node.name ?? '').trim();
        if (!name) return;
        if (node.collapsedCount) name = `${name} (+${node.collapsedCount})`;
        const canvas = document.createElement('canvas');
        canvas.width = major ? 512 : 256;
        canvas.height = major ? 128 : 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = major ? 'Bold 32px monospace' : 'Bold 22px monospace';

        // Light mode uses darker text, dark mode uses glowing text.
        // Agent-perspective labels get a warm tint to stand apart.
        const agentTinted = node.origin === 'agent' || node.origin === 'both';
        ctx.fillStyle = mode === 'light'
          ? (agentTinted ? '#4a148c' : '#1a237e')
          : (agentTinted ? '#fff8e1' : '#e0f7fa');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Shadow/Outline for better contrast
        ctx.shadowColor = mode === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.95)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        // Truncate names that overflow the sprite canvas.
        let display = name;
        const maxWidth = canvas.width - 16;
        while (ctx.measureText(display).width > maxWidth && display.length > 4) {
          display = display.slice(0, -2);
        }
        if (display !== name) display += '…';

        ctx.fillText(display, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          opacity: major ? 1 : 0.85,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(pos.x, pos.y + (major ? 0.65 : 0.45), pos.z);
        if (major) {
          sprite.scale.set(3.5, 0.875, 1);
        } else {
          sprite.scale.set(2.4, 0.6, 1);
        }
        scene.add(sprite);
        labelSprites.push(sprite);
        spriteNodeMap.set(sprite, idx);
      };

      const candidates = nodes
        .map((node, idx) => {
          const isHub = hubIndices.has(idx);
          const isImportantType = node.type === 'PROJECT' || node.type === 'CONVERSATION' || node.type === 'SYSTEM';
          const isAgentFocus = node.origin === 'agent' || node.origin === 'both';
          let priority = 0;
          if (isHub) priority += 2;
          if (isImportantType) priority += 3;
          if (isAgentFocus) priority += 4;
          if (node.collapsedCount) priority += 5;
          return { node, idx, priority, major: isHub || isImportantType || !!node.collapsedCount };
        })
        .filter((c) => interactive || c.priority > 0)
        .sort((a, b) => b.priority - a.priority)
        .slice(0, interactive ? MAX_LABELS_INTERACTIVE : MAX_LABELS);

      candidates.forEach(({ node, idx, major }) => {
        const pos = neuronPos[idx];
        if (pos) mkLabelSprite(node, pos, major, idx);
      });
    }

    // ── Axon connections ──────────────────────────────────────────────────────
    const axonGeo = new THREE.BufferGeometry();
    const axonPosArr = new Float32Array(connectionPairs.length * 6);
    const axonColArr = new Float32Array(connectionPairs.length * 6);
    connectionPairs.forEach(([a, b], i) => {
      const pa = neuronPos[a], pb = neuronPos[b];
      if (pa && pb) {
        axonPosArr.set([pa.x, pa.y, pa.z, pb.x, pb.y, pb.z], i * 6);
      }
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
        connIdx: connectionPairs.length > 0 ? Math.floor(Math.random() * connectionPairs.length) : 0,
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
    const hubFlash = new Float32Array(activeHubCount);
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

    // ── Node lookup + selection marker (interactive) ──────────────────────────
    const idxByKey = new Map<string, number>();
    nodes.forEach((n, i) => idxByKey.set(String(n.id), i));
    const selectionMat = new THREE.MeshBasicMaterial({
      color: pulseColor.clone(),
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      wireframe: true,
    });
    const selectionMesh = new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 12), selectionMat);
    selectionMesh.visible = false;
    scene.add(selectionMesh);

    // ── Shared interaction state (refs updated by event listeners) ────────────
    const mouseState = { x: 0, y: 0, moved: false };
    const burstQueue: number[] = []; // hub array-index entries
    let lastCursorPulseMs = 0;

    // ── Camera rig: auto-orbit until the user takes control (interactive) ─────
    const camCtl = {
      theta: 0,
      phi: Math.PI / 2,
      radius: CAM_RADIUS,
      target: new THREE.Vector3(0, 0, 0),
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
      // Seed spherical coords from wherever the auto-orbit left the camera so
      // there is no jump when the user grabs the view.
      const offset = camera.position.clone().sub(camCtl.target);
      camCtl.radius = Math.max(offset.length(), 0.001);
      camCtl.theta = Math.atan2(offset.x, offset.z);
      camCtl.phi = Math.acos(THREE.MathUtils.clamp(offset.y / camCtl.radius, -1, 1));
      camCtl.user = true;
    };

    resetViewRef.current = () => {
      camCtl.user = false;
      camCtl.target.set(0, 0, 0);
      camCtl.radius = CAM_RADIUS;
    };

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
      if (!pa || !pb) return;
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
      if (p && sphere) {
        sphere.position.set(p.x, p.y, p.z);
        sphere.visible = true;
      }
      // Also spawn a flash connection to a random far neuron
      const farIdx = Math.floor(Math.random() * activeNeuronCount);
      if (farIdx !== neuronIdx) spawnFlashConn(neuronIdx, farIdx);
    };

    // ── Event listeners ────────────────────────────────────────────────────────
    const dragState = { active: false, panning: false, x: 0, y: 0, startX: 0, startY: 0, moved: false };

    const onMouseMove = (e: MouseEvent) => {
      mouseState.x = e.clientX;
      mouseState.y = e.clientY;
      mouseState.moved = true;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier-only keys
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;
      if (activeHubCount > 0) {
        const hubIdx = Math.floor(Math.random() * activeHubCount);
        burstQueue.push(hubIdx);
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: true });

    // ── Interactive camera controls (orbit / pan / zoom) + click-to-select ────
    const CLICK_SLOP_PX = 5;

    // ── 3D Node Dragging logic ────────────────────────────────────────────────
    let draggedNodeIndex = -1;
    const dragPlane = new THREE.Plane();

    const updateGeometryPositions = () => {
      // 1. Update hub neurons
      if (hubNeurons?.mesh) {
        const posAttr = hubNeurons.geo.getAttribute('position') as THREE.BufferAttribute;
        const hubIndexArray = [...hubIndices];
        hubIndexArray.forEach((idx, i) => {
          if (neuronPos[idx]) {
            posAttr.setXYZ(i, neuronPos[idx].x, neuronPos[idx].y, neuronPos[idx].z);
          }
        });
        posAttr.needsUpdate = true;
      }

      // 2. Update regular neurons
      if (regularNeurons?.mesh) {
        const posAttr = regularNeurons.geo.getAttribute('position') as THREE.BufferAttribute;
        regularIndices.forEach((idx, i) => {
          if (neuronPos[idx]) {
            posAttr.setXYZ(i, neuronPos[idx].x, neuronPos[idx].y, neuronPos[idx].z);
          }
        });
        posAttr.needsUpdate = true;
      }

      // 3. Update axons (lines)
      if (axonGeo) {
        const posAttr = axonGeo.getAttribute('position') as THREE.BufferAttribute;
        connectionPairs.forEach(([a, b], i) => {
          const pa = neuronPos[a], pb = neuronPos[b];
          if (pa && pb) {
            posAttr.setXYZ(i * 2, pa.x, pa.y, pa.z);
            posAttr.setXYZ(i * 2 + 1, pb.x, pb.y, pb.z);
          }
        });
        posAttr.needsUpdate = true;
      }

      // 4. Update label sprites position
      if (labelSprites && spriteNodeMap) {
        labelSprites.forEach((sprite) => {
          const idx = spriteNodeMap.get(sprite);
          if (idx !== undefined && neuronPos[idx]) {
            sprite.position.set(neuronPos[idx].x, neuronPos[idx].y + 0.65, neuronPos[idx].z);
          }
        });
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      dragState.active = true;
      dragState.panning = e.button === 2 || e.shiftKey;
      dragState.x = e.clientX;
      dragState.y = e.clientY;
      dragState.startX = e.clientX;
      dragState.startY = e.clientY;
      dragState.moved = false;
      canvas.setPointerCapture?.(e.pointerId);

      // Check if we clicked on a node to drag
      if (e.button !== 2 && !e.shiftKey && nodes.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
        
        let best = -1;
        let bestDist = Infinity;
        neuronPos.forEach((pos, i) => {
          const d = raycaster.ray.distanceToPoint(pos);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        
        if (best >= 0 && bestDist < 1.1) {
          draggedNodeIndex = best;
          const normal = new THREE.Vector3();
          camera.getWorldDirection(normal);
          normal.negate();
          dragPlane.setFromNormalAndCoplanarPoint(normal, neuronPos[best]);
          takeControl();
        } else {
          draggedNodeIndex = -1;
        }
      } else {
        draggedNodeIndex = -1;
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
        if (total < CLICK_SLOP_PX) return; // still a potential click
        dragState.moved = true;
        takeControl();
        canvas.style.cursor = 'grabbing';
      }

      if (draggedNodeIndex >= 0) {
        const rect = canvas.getBoundingClientRect();
        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
        
        const intersection = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
          neuronPos[draggedNodeIndex].copy(intersection);
          updateGeometryPositions();
        }
      } else if (dragState.panning) {
        const panScale = camCtl.radius * 0.0016;
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
        camCtl.target.addScaledVector(right, -dx * panScale);
        camCtl.target.addScaledVector(up, dy * panScale);
      } else {
        camCtl.theta -= dx * 0.005;
        camCtl.phi = THREE.MathUtils.clamp(camCtl.phi - dy * 0.005, 0.15, Math.PI - 0.15);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasClick = dragState.active && !dragState.moved;
      dragState.active = false;
      draggedNodeIndex = -1;
      canvas.releasePointerCapture?.(e.pointerId);
      canvas.style.cursor = 'grab';

      // A click (no drag) selects the nearest neuron under the cursor, or
      // deselects when the click lands in empty space.
      if (wasClick && e.button !== 2 && nodes.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
        let best = -1;
        let bestDist = Infinity;
        neuronPos.forEach((pos, i) => {
          const d = raycaster.ray.distanceToPoint(pos);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        if (best >= 0 && bestDist < 1.1 && nodes[best]) {
          handleNodeClickRef.current(nodes[best]);
        } else {
          handleNodeClickRef.current(null);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      takeControl();
      camCtl.radius = THREE.MathUtils.clamp(camCtl.radius * (1 + e.deltaY * 0.001), 4, 60);
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    if (interactive) {
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', onPointerUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      canvas.addEventListener('contextmenu', onContextMenu);
    }

    // ── Animation loop ────────────────────────────────────────────────────────
    let frameId: number;
    let t = 0;

    const tick = () => {
      frameId = requestAnimationFrame(tick);
      const isPaused = pausedRef.current;
      if (!isPaused) t += 0.003;

      if (camCtl.user) {
        // User-driven camera (interactive mode)
        applyCamera();
      } else {
        // Orbital camera — floating slowly inside the network
        camera.position.x = Math.sin(t * 0.11) * CAM_RADIUS;
        camera.position.z = Math.cos(t * 0.11) * CAM_RADIUS;
        camera.position.y = Math.sin(t * 0.065) * 5;
        camera.lookAt(0, 0, 0);
      }

      if (!isPaused) {
        // Hub neurons breathe
        hubNeurons.mat.opacity = 0.65 + Math.sin(t * 0.9) * 0.22;
        // Axons gently brighten/dim
        axonMat.opacity = 0.09 + Math.sin(t * 0.4) * 0.04;

        // ── Process mouse: cursor pulse + flash connection ──
        const now = performance.now();
        if (mouseState.moved && !dragState.active && now - lastCursorPulseMs > CURSOR_PULSE_INTERVAL_MS && activeNeuronCount > 0) {
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
          const distantIdx = (closestNeuron + Math.floor(activeNeuronCount / 2) + Math.floor(Math.random() * 10)) % activeNeuronCount;
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
              const pa = neuronPos[a], pb = neuronPos[b];
              if (pa && pb) {
                pulse.mesh.visible = true;
                pulse.mesh.position.lerpVectors(pa, pb, pulse.t);
                const mat = pulse.mesh.material as THREE.MeshBasicMaterial;
                const bright = Math.sin(pulse.t * Math.PI);
                mat.opacity = 0.35 + bright * 0.65;
                pulse.mesh.scale.setScalar(0.5 + bright * 1.1);
              }
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
            const pa = neuronPos[a], pb = neuronPos[b];
            if (pa && pb) {
              bp.mesh.position.lerpVectors(pa, pb, bp.t);
              const mat = bp.mesh.material as THREE.MeshBasicMaterial;
              const bright = Math.sin(bp.t * Math.PI);
              mat.opacity = 0.7 + bright * 0.3;
              bp.mesh.scale.setScalar(0.8 + bright * 0.8);
            }
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
          if (sphere) {
            const mat = sphere.material as THREE.MeshBasicMaterial;
            mat.opacity = hubFlash[i] * 0.75;
            const scale = 1 + (1 - hubFlash[i]) * 1.5;
            sphere.scale.setScalar(scale);
            if (hubFlash[i] <= 0) sphere.visible = false;
          }
        });

        // Glia particles drift slowly
        glia.rotation.y = t * 0.007;
        glia.rotation.x = Math.sin(t * 0.04) * 0.08;
      }

      // Selection marker follows the selected node (runs even while paused).
      const sel = selectedNodeRef.current;
      if (sel) {
        const selIdx = idxByKey.get(String(sel.id));
        const selPos = selIdx !== undefined ? neuronPos[selIdx] : undefined;
        if (selPos) {
          selectionMesh.visible = true;
          selectionMesh.position.copy(selPos);
          selectionMesh.scale.setScalar(1 + Math.sin(performance.now() * 0.004) * 0.18);
        } else {
          selectionMesh.visible = false;
        }
      } else {
        selectionMesh.visible = false;
      }

      renderer.render(scene, camera);
    };

    tick();

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      if (interactive) {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        canvas.removeEventListener('wheel', onWheel);
        canvas.removeEventListener('contextmenu', onContextMenu);
      }
      resetViewRef.current = () => { };
      selectionMesh.geometry.dispose();
      selectionMat.dispose();
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
      pulses.forEach(p => (p.mesh.material as THREE.Material).dispose());
      burstPulses.forEach(p => (p.mesh.material as THREE.Material).dispose());
      flashConns.forEach(fc => { fc.geo.dispose(); fc.mat.dispose(); });
      hubFlashSpheres.forEach(s => { (s.geometry as THREE.BufferGeometry).dispose(); (s.material as THREE.Material).dispose(); });
      labelSprites.forEach(sprite => {
        sprite.material.map?.dispose();
        sprite.material.dispose();
      });
      renderer.dispose();
    };
  }, [primaryColor, secondaryColor, mode, visibleGraph, effectiveShowLabels, backgroundMode]);

  const canvasEl = (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: backgroundMode ? 'none' : 'auto',
        zIndex: 0,
        display: 'block',
        cursor: backgroundMode ? undefined : 'grab',
        touchAction: backgroundMode ? undefined : 'none',
      }}
    />
  );

  if (backgroundMode) return canvasEl;

  // Derive theme-sensitive dark container background color matching chat input
  const effectiveBgColor = backgroundColor || (
    mode === 'light'
      ? 'rgba(240, 242, 248, 0.98)'
      : 'rgba(11, 13, 23, 0.98)'
  );

  // Interactive mode: local stacking context + overlay controls. Plain HTML
  // controls keep this component dependency-free (react + three only).
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
    color: mode === 'light' ? '#1a237e' : '#e0f7fa',
  };

  const overlayFg = mode === 'light' ? '#1a237e' : '#e0f7fa';
  const overlayBg = mode === 'light' ? 'rgba(255,255,255,0.78)' : 'rgba(5,5,15,0.78)';

  const selectStyle: React.CSSProperties = {
    height: 30,
    maxWidth: 220,
    border: 'none',
    borderRadius: 6,
    padding: '0 8px',
    fontSize: 12,
    fontFamily: 'monospace',
    cursor: 'pointer',
    background: mode === 'light' ? 'rgba(26,35,126,0.12)' : 'rgba(224,247,250,0.12)',
    color: overlayFg,
  };

  const chipButtonStyle: React.CSSProperties = {
    border: 'none',
    borderRadius: 5,
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'monospace',
    padding: '3px 7px',
    background: mode === 'light' ? 'rgba(26,35,126,0.12)' : 'rgba(224,247,250,0.15)',
    color: overlayFg,
  };

  const selectedKey = selectedNode ? String(selectedNode.id) : '';
  const selectedChildCount = selectedNode ? (childCounts.get(selectedKey) ?? 0) : 0;
  const selectedCollapsed = selectedNode ? collapsedIds.has(selectedKey) : false;

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
      {canvasEl}
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1,
          display: 'flex',
          gap: 6,
          alignItems: 'center',
        }}
      >
        {/* Searchable perspective trigger button */}
        <button
          type="button"
          onClick={(e) => setPerspectiveMenuAnchor(e.currentTarget)}
          style={{
            ...selectStyle,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title="Search & select graph perspective"
          aria-label="Search & select graph perspective"
        >
          <span style={{ fontSize: 12, opacity: 0.8 }}>🔍</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
            {activePerspective.label}
          </span>
          <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
        </button>

        {/* Searchable Perspective Popover Menu */}
        <Popover
          open={Boolean(perspectiveMenuAnchor)}
          anchorEl={perspectiveMenuAnchor}
          onClose={() => {
            setPerspectiveMenuAnchor(null);
            setPerspectiveSearchFilter('');
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: {
              width: 280,
              maxHeight: 360,
              bgcolor: mode === 'dark' ? 'rgba(15, 17, 26, 0.96)' : 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(16px)',
              color: overlayFg,
              p: 1,
              borderRadius: 2,
              border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            },
          }}
        >
          <TextField
            autoFocus
            size="small"
            fullWidth
            placeholder="Search perspectives..."
            value={perspectiveSearchFilter}
            onChange={(e) => setPerspectiveSearchFilter(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MuiIcon sx={{ fontSize: 18, color: overlayFg, opacity: 0.7 }}>search</MuiIcon>
                </InputAdornment>
              ),
              sx: {
                color: overlayFg,
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                borderRadius: 1,
                mb: 1,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                },
              },
            }}
          />
          <MuiBox sx={{ overflowY: 'auto', maxHeight: 270 }}>
            {filteredPerspectives.length === 0 ? (
              <MuiTypography variant="caption" sx={{ display: 'block', p: 1.5, textAlign: 'center', opacity: 0.6 }}>
                No perspectives found
              </MuiTypography>
            ) : (
              filteredPerspectives.map((p) => (
                <MenuItem
                  key={p.id}
                  selected={p.id === activePerspective.id}
                  onClick={() => {
                    setActivePerspective(p);
                    setPerspectiveMenuAnchor(null);
                    setPerspectiveSearchFilter('');
                  }}
                  sx={{
                    borderRadius: 1,
                    py: 0.75,
                    px: 1.25,
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    color: overlayFg,
                    '&.Mui-selected': {
                      bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                      fontWeight: 'bold',
                    },
                    '&:hover': {
                      bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                >
                  <MuiTypography variant="caption" noWrap sx={{ fontFamily: 'monospace' }}>
                    {p.label}
                  </MuiTypography>
                </MenuItem>
              ))
            )}
          </MuiBox>
        </Popover>
        {onPinPerspective && (
          <button
            type="button"
            style={{ ...buttonStyle, opacity: pinBusy ? 0.5 : 1 }}
            disabled={pinBusy || isPinned}
            title={isPinned ? 'Pinned to chat session' : `Pin ${activePerspective.label}${selectedNode ? ` + ${selectedNode.name}` : ''} to chat`}
            aria-label="Pin perspective to chat"
            onClick={handlePin}
          >
            {isPinned ? '✓' : '📌'}
          </button>
        )}
        <button
          type="button"
          style={buttonStyle}
          title={paused ? 'Resume animation' : 'Pause animation'}
          aria-label={paused ? 'Resume animation' : 'Pause animation'}
          onClick={() => {
            pausedRef.current = !pausedRef.current;
            setPaused(pausedRef.current);
          }}
        >
          {paused ? '▶' : '⏸'}
        </button>
        <button
          type="button"
          style={{ ...buttonStyle, opacity: labelsVisible ? 1 : 0.5 }}
          title={labelsVisible ? 'Hide labels' : 'Show labels'}
          aria-label={labelsVisible ? 'Hide labels' : 'Show labels'}
          onClick={() => setLabelsVisible(v => !v)}
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
      {selectedNode && (
        <div
          style={{
            position: 'absolute',
            left: 8,
            bottom: 8,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            borderRadius: 8,
            maxWidth: '75%',
            background: overlayBg,
            color: overlayFg,
            fontFamily: 'monospace',
            fontSize: 12,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedNode.name}
            {selectedNode.type ? ` · ${selectedNode.type}` : ''}
          </span>
          {selectedChildCount > 0 && (
            <button type="button" style={chipButtonStyle} onClick={toggleCollapseSelected}>
              {selectedCollapsed ? `Expand (+${selectedNode.collapsedCount ?? selectedChildCount})` : 'Collapse'}
            </button>
          )}
          {selectedNode.type === 'FILE' && (selectedNode.source || selectedNode.path) && (
            <button
              type="button"
              style={chipButtonStyle}
              onClick={() => setPreviewFilePath(selectedNode.source || selectedNode.path || null)}
              title="View file content"
            >
              👁 View File
            </button>
          )}
          {onPinPerspective && (
            <button
              type="button"
              style={chipButtonStyle}
              disabled={pinBusy || isPinned}
              onClick={handlePin}
              title="Pin this node with the active perspective"
            >
              {isPinned ? 'Pinned' : 'Pin'}
            </button>
          )}
          <button
            type="button"
            style={chipButtonStyle}
            onClick={() => handleNodeClick(null)}
            title="Deselect"
            aria-label="Deselect node"
          >
            ✕
          </button>
        </div>
      )}
      {previewFilePath && (
        <Dialog
          open={Boolean(previewFilePath)}
          onClose={() => setPreviewFilePath(null)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              borderRadius: 2,
              p: 1,
              zIndex: 1300
            }
          }}
        >
          <MuiBox sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
            <MuiTypography variant="subtitle1" noWrap sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
              {previewFilePath.split('/').pop()}
            </MuiTypography>
            <MuiIconButton onClick={() => setPreviewFilePath(null)} size="small">
              <MuiIcon>close</MuiIcon>
            </MuiIconButton>
          </MuiBox>
          <DialogContent sx={{ p: 0, height: '65vh', overflow: 'hidden' }}>
            <File
              path={previewFilePath}
              scope="server"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
});

export default NeuralBrainBackground;
