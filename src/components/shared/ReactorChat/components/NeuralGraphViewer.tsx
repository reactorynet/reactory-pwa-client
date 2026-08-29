/**
 * NeuralGraphViewer — the chat's interactive graph viewer
 * (`reactor.NeuralBackground@1.0.0` when mounted in the side panel).
 *
 * A thin adapter over the shared GraphExplorer engine in 3D mode: the same
 * store, data layer, layouts and perspective lifecycle as the 2D explorer, so
 * both surfaces have identical capabilities. Chat-specific concerns are
 * mapped onto GraphExplorer props:
 *  - the conversation node becomes the root (`conversationId`);
 *  - the agent's touched nodes (graph tool results in the history) become an
 *    `overlay`, highlighted on top of the loaded graph;
 *  - `perspective` (from the loadGraphPerspective tool) steers the view;
 *  - pinning hands a perspective (+ selected node) back to the chat session.
 *
 * The ambient background behind the chat remains NeuralBrainBackground.
 */

import React, { useCallback, useMemo } from 'react';
import GraphExplorer from '@reactory/client-core/components/shared/GraphExplorer/GraphExplorer';
import {
  GraphNode,
  GraphOverlay,
  GraphPerspective,
  GraphPerspectiveRequest,
} from '@reactory/client-core/components/shared/GraphExplorer/types';
import {
  extractAgentGraphFromMessages,
  NeuralGraphData,
  toolResultSignature,
} from './NeuralBrainBackground';

/** Legacy perspective shape still produced by the loadGraphPerspective tool. */
export interface LegacyGraphPerspective {
  id?: string;
  label?: string;
  kind?: 'conversation' | 'agent' | 'root' | 'saved';
  rootId?: number;
  depth?: number;
  nodeIds?: number[];
  perspectiveId?: string;
}

export interface NeuralGraphViewerProps {
  primaryColor?: string;
  secondaryColor?: string;
  mode?: 'dark' | 'light' | string;
  backgroundColor?: string;
  showLabels?: boolean;
  /** Conversation subgraph supplied by the host (rendered as overlay when the conversation is not graphed). */
  graphData?: NeuralGraphData | null;
  reactory?: Reactory.Client.ReactorySDK;
  messages?: any[];
  sessionId?: string;
  backgroundMode?: boolean;
  perspective?: LegacyGraphPerspective | string;
  onPinPerspective?: (
    perspective: { label: string; kind: string; rootId?: number; id?: string },
    node: { id: number; name: string; type?: string } | null
  ) => Promise<void> | void;
  height?: number | string;
}

const toOverlay = (data: NeuralGraphData | null | undefined): GraphOverlay | null => {
  if (!data || data.nodes.length === 0) return null;
  return {
    nodes: data.nodes.map((n) => ({ id: n.id, name: n.name, type: n.type, data: n.data })),
    edges: data.edges.map((e) => ({ source: e.sourceId, target: e.targetId })),
  };
};

const mergeOverlays = (a: GraphOverlay | null, b: GraphOverlay | null): GraphOverlay | null => {
  if (!a) return b;
  if (!b) return a;
  const seen = new Set(a.nodes.map((n) => String(n.id)));
  return {
    nodes: [...a.nodes, ...b.nodes.filter((n) => !seen.has(String(n.id)))],
    edges: [...a.edges, ...b.edges],
  };
};

const toRequest = (perspective?: LegacyGraphPerspective | string): GraphPerspectiveRequest | null => {
  if (!perspective) return null;
  if (typeof perspective === 'string') return perspective;
  if (perspective.perspectiveId) return { perspectiveId: perspective.perspectiveId, label: perspective.label };
  if (perspective.kind === 'conversation' || perspective.kind === 'agent') return perspective.kind;
  if (perspective.rootId !== undefined) {
    return { rootId: perspective.rootId, depth: perspective.depth, label: perspective.label };
  }
  return perspective.label ?? null;
};

export default function NeuralGraphViewer(props: NeuralGraphViewerProps) {
  const {
    primaryColor,
    secondaryColor,
    mode = 'dark',
    backgroundColor,
    graphData,
    messages,
    sessionId,
    perspective,
    onPinPerspective,
    height = '100%',
  } = props;

  // Re-derive the agent overlay only when a tool result appears or changes.
  const signature = useMemo(() => toolResultSignature(messages), [messages]);
  const agentOverlay = useMemo(
    () => toOverlay(messages ? extractAgentGraphFromMessages(messages) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature]
  );
  const overlay = useMemo(
    () => mergeOverlays(agentOverlay, toOverlay(graphData)),
    [agentOverlay, graphData]
  );

  const request = useMemo(() => toRequest(perspective), [perspective]);

  const handlePin = useCallback(
    async (p: GraphPerspective, node: GraphNode | null) => {
      if (!onPinPerspective) return;
      await onPinPerspective(
        {
          label: p.name,
          kind: p.id ? 'saved' : sessionId && p.catalogNodeId === null ? 'conversation' : 'root',
          rootId: p.catalogNodeId ?? undefined,
          id: p.id,
        },
        node ? { id: node.id, name: node.name, type: node.type } : null
      );
    },
    [onPinPerspective, sessionId]
  );

  return (
    <GraphExplorer
      viewMode="3d"
      chrome="compact"
      conversationId={sessionId}
      overlay={overlay}
      perspective={request}
      onPinPerspective={onPinPerspective ? handlePin : undefined}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      backgroundColor={backgroundColor ?? (mode === 'light' ? '#f0f2f8' : '#0b0d17')}
      height={height}
    />
  );
}

export const NeuralGraphViewerComponentDefinition: Reactory.IReactoryComponentDefinition<typeof NeuralGraphViewer> = {
  nameSpace: 'reactor',
  name: 'NeuralBackground',
  version: '1.0.0',
  component: NeuralGraphViewer,
  description:
    'Interactive 3D system-graph viewer for the chat side panel — shares the GraphExplorer engine (perspectives, traversal, editing) and overlays the agent context.',
  tags: ['graph', 'chat', 'reactor', '3d', 'webgl'],
};
