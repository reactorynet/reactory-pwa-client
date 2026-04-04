import { Macro, MacroComponentDefinition, SidePanelAction, UXChatMessage } from "../../types";

// @ts-ignore
const D3Macro: Macro<UXChatMessage> = async (args, chatState, reactory) => {
  const parsed = (args && typeof args === 'object' && !Array.isArray(args)) ? args as Record<string, any> : {};

  const action: SidePanelAction = parsed.action || 'add';
  const referenceId: string | undefined = parsed.referenceId;
  const title: string | undefined = parsed.title;

  if (!chatState.sidePanel) {
    reactory.error('D3Macro: Side panel actions not available on chatState');
    return null;
  }

  // ── REMOVE ──
  if (action === 'remove') {
    if (!referenceId) {
      return {
        __typename: "ReactorChatMessage",
        role: "assistant",
        content: 'Cannot remove visualization: `referenceId` is required for the remove action.',
        id: reactory.utils.uuid(),
        rating: 0,
        timestamp: new Date(),
        tool_calls: [],
      };
    }
    chatState.sidePanel.removeItem(referenceId);
    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content: `Removed visualization "${referenceId}" from the side panel.`,
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: [],
    };
  }

  // Build visualization props for add/update
  const vizProps: Record<string, any> = {
    type: parsed.type || 'force-directed',
    title: title || parsed.title || 'D3 Visualization',
    data: parsed.data || [
      { id: 'node1', label: 'Node 1', group: 1 },
      { id: 'node2', label: 'Node 2', group: 1 },
      { id: 'node3', label: 'Node 3', group: 2 },
    ],
    links: parsed.links || [
      { source: 'node1', target: 'node2', value: 1 },
      { source: 'node2', target: 'node3', value: 2 },
    ],
    ...(parsed.options || {}),
  };

  // ── UPDATE ──
  if (action === 'update') {
    if (!referenceId) {
      return {
        __typename: "ReactorChatMessage",
        role: "assistant",
        content: 'Cannot update visualization: `referenceId` is required for the update action.',
        id: reactory.utils.uuid(),
        rating: 0,
        timestamp: new Date(),
        tool_calls: [],
      };
    }
    chatState.sidePanel.updateItem(referenceId, {
      props: { ...vizProps, reactory },
      title: title || vizProps.title || referenceId,
    });
    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content: `Updated visualization "${referenceId}" in the side panel.`,
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: [],
    };
  }

  // ── ADD (default) ──
  const itemId = referenceId || reactory.utils.uuid();
  const vizTitle = title || vizProps.title || 'D3 Visualization';

  chatState.sidePanel.addItem({
    id: itemId,
    componentFqn: 'widgets.ReactoryD3Widget',
    props: { ...vizProps, reactory },
    title: vizTitle,
    addedAt: new Date(),
    type: 'component',
  });

  return {
    __typename: "ReactorChatMessage",
    role: "assistant",
    content: `Opened D3 visualization **${vizTitle}** in the side panel (ref: \`${itemId}\`).`,
    id: reactory.utils.uuid(),
    rating: 0,
    timestamp: new Date(),
    tool_calls: [],
  };
};

const TOOL_DESCRIPTION = `Mount, update, or remove a D3 data visualization in the persistent side panel. Visualizations remain visible as the conversation continues.

ACTIONS:
- "add" (default): Mount a new D3 visualization. Provide visualization "type", "data", and optionally "links", "title", "options", and "referenceId".
- "update": Replace the data or configuration of an existing visualization. Requires "referenceId".
- "remove": Remove a visualization from the side panel. Requires "referenceId".

Use the "side_panel_state" tool first to see what is currently mounted and get reference IDs.

VISUALIZATION TYPES:
- "force-directed": Node-link graph where nodes repel and links attract. Needs "data" (nodes with id/label/group) and "links" (source/target/value). Best for network topology, org charts, dependency graphs.
- "tree": Hierarchical tree layout. Needs "data" as a nested { id, label, children[] } tree. Best for org charts, file trees, taxonomies.
- "sankey": Flow diagram showing volume between stages. Needs "data" (nodes) and "links" (source/target/value). Best for budget flows, user journeys, energy flows.
- "chord": Inter-relationship matrix. Needs a square "matrix" array plus "labels" array. Best for mutual dependencies or traffic between groups.
- "treemap": Nested rectangles sized by value. Needs "data" as a nested hierarchy with leaf "value" fields. Best for showing proportional hierarchical composition.
- "circle-packing": Nested circles sized by value. Same structure as treemap. Best for hierarchical part-to-whole.
- "heatmap": Grid of coloured cells. Needs "data" as [{ row, col, value }]. Best for correlation matrices, calendars, frequency maps.

DATA FORMAT EXAMPLES:

Force-directed:
  data: [{ "id": "A", "label": "Service A", "group": 1 }, ...]
  links: [{ "source": "A", "target": "B", "value": 10 }, ...]

Tree:
  data: { "id": "root", "label": "CEO", "children": [{ "id": "vp1", "label": "VP Eng", "children": [] }] }

Sankey:
  data: [{ "id": "src", "label": "Source" }, { "id": "dst", "label": "Destination" }]
  links: [{ "source": "src", "target": "dst", "value": 42 }]

OPTIONS (all optional):
- width: number (default 600)
- height: number (default 400)
- nodeRadius: number — radius of nodes in force-directed graphs (default 10)
- linkDistance: number — resting distance of links (default 100)
- colors: string[] — colour palette for groups/categories
- showLabels: boolean — show node/cell labels (default true)
- colorScheme: string — named D3 colour scheme e.g. "schemeTableau10"

EXAMPLES:

1) Network graph of microservices:
   { "type": "force-directed", "title": "Service Dependencies", "data": [{"id":"api","label":"API Gateway","group":1},{"id":"auth","label":"Auth Service","group":2},{"id":"db","label":"Database","group":3}], "links": [{"source":"api","target":"auth","value":5},{"source":"api","target":"db","value":3}] }

2) Org chart:
   { "type": "tree", "title": "Engineering Org", "data": {"id":"cto","label":"CTO","children":[{"id":"fe","label":"Frontend Lead","children":[]},{"id":"be","label":"Backend Lead","children":[]}]} }

3) Update an existing visualization:
   { "action": "update", "referenceId": "abc-123", "data": [...], "links": [...] }

4) Remove:
   { "action": "remove", "referenceId": "abc-123" }`;

const D3MacroDefinition: MacroComponentDefinition<typeof D3Macro> = {
  name: "D3Macro",
  description: "Mount, update, or remove a D3 data visualization in the persistent side panel.",
  component: D3Macro,
  version: "1.0.0",
  nameSpace: "reactor-macros",
  roles: ['USER'],
  alias: 'd3',
  icon: "bubble_chart",
  runat: 'client',
  tools: [
    {
      type: "function",
      runat: "client",
      safeForAutoExecution: false,
      function: {
        name: "d3",
        icon: "bubble_chart",
        description: TOOL_DESCRIPTION,
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description: "The operation to perform: 'add' (default), 'update', or 'remove'.",
              enum: ["add", "update", "remove"],
            },
            type: {
              type: "string",
              description: "D3 visualization type.",
              enum: ["force-directed", "tree", "sankey", "chord", "treemap", "circle-packing", "heatmap"],
            },
            title: {
              type: "string",
              description: "Display title for the side panel tab and visualization header.",
            },
            data: {
              type: "object",
              description: "Node data or hierarchical root object. Shape depends on visualization type — see tool description.",
            },
            links: {
              type: "array",
              description: "Link/edge data connecting nodes. Required for force-directed and sankey types.",
              items: { type: "object" },
            },
            options: {
              type: "object",
              description: "Display options: width, height, nodeRadius, linkDistance, colors, showLabels, colorScheme.",
            },
            referenceId: {
              type: "string",
              description: "Unique reference ID. Required for 'update' and 'remove'. Optional for 'add' (auto-generated if omitted).",
            },
          },
          required: [],
        },
      },
    },
  ],
};

export default D3MacroDefinition;
