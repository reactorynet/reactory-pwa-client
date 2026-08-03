import { Macro, MacroComponentDefinition, UXChatMessage } from "../../types";

/**
 * loadGraphPerspective — client tool that steers the Neural Graph viewer in
 * the side panel. Mounts the viewer when absent, otherwise updates its
 * `perspective` prop in place. Uses the same panel item id as ReactorChat's
 * Neural Graph button so the two never mount duplicate viewers, and
 * ReactorChat's live-props effect keeps the item fed with session data.
 *
 * This is a pure visualization change — it never reads the graph itself.
 * The agent should keep using the graph tools (searchGraph, exploreGraph,
 * getGraphNode, graphChildren, graphLinks) to answer questions.
 */

const PANEL_ID = 'neural-graph-viewer';
const VIEWER_FQN = 'reactor.NeuralBackground@1.0.0';

/** Parse a value from JSON string if needed (Gemini sends freeform objects as strings). */
const tryParseJSON = (val: unknown): unknown => {
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return val; }
};

const reply = (reactory: Reactory.Client.ReactorySDK, content: string): UXChatMessage => ({
  __typename: "ReactorChatMessage",
  role: "assistant",
  content,
  id: reactory.utils.uuid(),
  rating: 0,
  timestamp: new Date(),
  tool_calls: [],
} as unknown as UXChatMessage);

// @ts-ignore — Macro declares params: any[], but tool calls deliver the parsed arguments object
const GraphPerspectiveMacro: Macro<UXChatMessage> = async (args, chatState, reactory) => {
  const parsed = (args && typeof args === 'object' && !Array.isArray(args))
    ? args as Record<string, any>
    : {};

  if (!chatState.sidePanel) {
    return reply(reactory, 'The side panel is not available in this chat surface, so the graph viewer cannot be mounted.');
  }

  const rootIdRaw = tryParseJSON(parsed.rootId);
  const rootId = rootIdRaw !== undefined && rootIdRaw !== null && rootIdRaw !== ''
    ? Number(rootIdRaw)
    : undefined;
  const depthRaw = tryParseJSON(parsed.depth);
  const depth = depthRaw !== undefined && depthRaw !== null && depthRaw !== ''
    ? Math.min(Math.max(Number(depthRaw) || 2, 1), 5)
    : undefined;
  const perspectiveName = typeof parsed.perspective === 'string' ? parsed.perspective.trim() : '';

  if (rootId !== undefined && Number.isNaN(rootId)) {
    return reply(reactory, '`rootId` must be a numeric graph node id (use searchGraph/exploreGraph results to find one).');
  }
  if (rootId === undefined && !perspectiveName) {
    return reply(reactory, 'Provide either `perspective` (e.g. "conversation", "agent", or a project name) or a numeric `rootId` graph node id.');
  }

  // rootId wins: it is an exact node reference. A name is resolved by the
  // viewer against its perspective list (built-ins + projects + saved views).
  const perspectiveValue = rootId !== undefined
    ? {
      id: `root:${rootId}`,
      label: parsed.label || perspectiveName || `Node ${rootId}`,
      kind: 'root' as const,
      rootId,
      depth,
    }
    : perspectiveName;

  const label = typeof perspectiveValue === 'string' ? perspectiveValue : perspectiveValue.label;
  const state = chatState.sidePanel.getState();
  const existing = state.items.find((i) => i.id === PANEL_ID);

  if (existing) {
    chatState.sidePanel.updateItem(PANEL_ID, {
      props: { ...existing.props, perspective: perspectiveValue },
    });
    chatState.sidePanel.setActiveItem(PANEL_ID);
    if (!state.isOpen) chatState.sidePanel.togglePanel();
  } else {
    chatState.sidePanel.addItem({
      id: PANEL_ID,
      componentFqn: VIEWER_FQN,
      props: {
        reactory,
        backgroundMode: false,
        showLabels: true,
        perspective: perspectiveValue,
      },
      title: 'Neural Graph',
      addedAt: new Date(),
      addedBy: 'loadGraphPerspective',
      type: 'component',
    });
  }

  return reply(
    reactory,
    `Loaded the **${label}** perspective in the Neural Graph viewer (side panel item \`${PANEL_ID}\`).` +
    `\n\nThis only changes the visualization — use the graph tools (searchGraph, exploreGraph, getGraphNode, graphChildren, graphLinks) to actually read the graph when answering questions.`,
  );
};

const TOOL_DESCRIPTION = `Loads a system-graph perspective into the Neural Graph viewer in the side panel.

Use this when the user asks to view, load, show, or switch a graph perspective (e.g. "show me the pwa client graph", "load the conversation perspective", "focus the graph on that node").

Perspectives:
- "conversation" — the synthesized graph of the active conversation
- "agent" — only the nodes/edges this agent has touched via graph tools
- a project name (e.g. "reactory.reactory-pwa-client") — that project's graph
- rootId (numeric graph node id from searchGraph/exploreGraph results) — the neighbourhood around that node; optional depth 1-5

This tool ONLY changes the visualization. It does not read the graph — keep using searchGraph/exploreGraph/getGraphNode/graphChildren/graphLinks to answer questions.

Examples:
- { "perspective": "conversation" }
- { "perspective": "reactory.reactory-pwa-client" }
- { "rootId": 123456789, "depth": 2, "label": "UserService neighbourhood" }`;

const GraphPerspectiveMacroDefinition: MacroComponentDefinition<typeof GraphPerspectiveMacro> = {
  name: "GraphPerspectiveMacro",
  nameSpace: "reactor-macros",
  version: "1.0.0",
  description: "Loads a system graph perspective into the side panel Neural Graph viewer.",
  component: GraphPerspectiveMacro,
  roles: ['USER'],
  alias: 'loadGraphPerspective',
  runat: 'client',
  icon: 'hub',
  tools: [
    {
      type: "function",
      runat: "client",
      roles: ['USER'],
      safeForAutoExecution: true,
      function: {
        name: "loadGraphPerspective",
        description: TOOL_DESCRIPTION,
        parameters: {
          type: "object",
          properties: {
            perspective: {
              type: "string",
              description: "Perspective to load: 'conversation', 'agent', or a project name (namespace.name).",
            },
            rootId: {
              type: "number",
              description: "Numeric graph node id to focus the view around (from searchGraph/exploreGraph results). Takes precedence over `perspective`.",
            },
            depth: {
              type: "number",
              description: "Traversal depth for rootId perspectives (1-5, default 2).",
            },
            label: {
              type: "string",
              description: "Optional display label for a rootId perspective.",
            },
          },
          required: [],
        },
      },
    },
  ],
};

export default GraphPerspectiveMacroDefinition;
