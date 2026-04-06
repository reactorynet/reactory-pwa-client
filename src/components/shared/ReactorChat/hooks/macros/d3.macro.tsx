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

  // ── Build D3ChartProps ──────────────────────────────────────────────────────
  //
  // The AI provides args that map directly onto the D3Chart shared component's
  // typed props (D3ChartProps from src/components/shared/D3Chart/D3Types.ts).
  // For the 'force' type the AI passes { nodes, links } as `data`; for all
  // cartesian/pie types `data` is a flat array of { [xKey]: ..., [yKey]: ... }.
  // For 'tree' `data` is a single root node { name, value?, children? }.

  const chartType: string = parsed.type || 'bar';

  // Normalise force-graph data: legacy { data: [...nodes], links: [...] } shape
  // → new { nodes, links } shape expected by D3ForceGraphData
  let chartData: unknown;
  if (chartType === 'force') {
    const nodesInput = parsed.data?.nodes ?? parsed.data ?? [];
    const linksInput = parsed.data?.links ?? parsed.links ?? [];
    chartData = { nodes: nodesInput, links: linksInput };
  } else {
    chartData = parsed.data ?? [];
  }

  const vizProps: Record<string, any> = {
    // Core
    type:        chartType,
    data:        chartData,
    // Axis keys
    xKey:        parsed.xKey        ?? 'name',
    yKey:        parsed.yKey        ?? 'value',
    ...(parsed.y2Key     !== undefined ? { y2Key:        parsed.y2Key }        : {}),
    ...(parsed.seriesKeys !== undefined ? { seriesKeys:  parsed.seriesKeys }   : {}),
    // Dimensions
    height:      parsed.height ?? 400,
    width:       parsed.width  ?? '100%',
    // Labels
    ...(title !== undefined ? { title } : {}),
    ...(parsed.description !== undefined ? { description: parsed.description } : {}),
    // Axes / grid / tooltip
    showAxes:    parsed.showAxes    ?? true,
    showGrid:    parsed.showGrid    ?? true,
    showTooltip: parsed.showTooltip ?? true,
    // Legend
    showLegend:  parsed.showLegend  ?? false,
    ...(parsed.legendLabels !== undefined ? { legendLabels: parsed.legendLabels } : {}),
    // Colour scheme
    ...(parsed.colorScheme !== undefined ? { colorScheme: parsed.colorScheme }   : {}),
    // Margin override
    ...(parsed.margin !== undefined ? { margin: parsed.margin } : {}),
    // Styling overrides
    ...(parsed.styling !== undefined ? { styling: parsed.styling } : {}),
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
      props: vizProps,
      title: title ?? referenceId,
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
  const vizTitle = title ?? 'D3 Visualization';

  chatState.sidePanel.addItem({
    id: itemId,
    componentFqn: 'core.D3Chart@1.0.0',
    props: vizProps,
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

const TOOL_DESCRIPTION = `Mount, update, or remove a D3 data visualization in the persistent side panel using the \`core.D3Chart@1.0.0\` shared component. Visualizations remain visible as the conversation continues.

ACTIONS:
- "add" (default): Mount a new D3 chart. Provide "type", "data", and any optional display props.
- "update": Update data or config of an existing chart. Requires "referenceId".
- "remove": Remove a chart from the side panel. Requires "referenceId".

Use the "side_panel_state" tool first to see what is currently mounted and obtain reference IDs.

──────────────────────────────────────────────────────
CHART TYPES AND DATA SHAPES
──────────────────────────────────────────────────────

All flat chart types accept "data" as an array of objects (D3DataPoint[]):
  data: [{ "<xKey>": ..., "<yKey>": ..., ...extraFields }]

"bar" — grouped or single-series bar chart
  data: [{ "name": "Jan", "revenue": 4200, "expenses": 3100 }, ...]
  xKey: "name"            (x-axis category key, default "name")
  yKey: "revenue"         (primary series key, default "value")
  seriesKeys: ["revenue", "expenses"]  (optional — draws one bar group per key)

"line" — multi-series line chart
  Same flat data and key props as bar. Use seriesKeys for multiple lines.

"area" — filled area chart
  Same flat data and key props as bar/line.

"pie" — pie chart
  data: [{ "name": "Chrome", "value": 65 }, { "name": "Firefox", "value": 20 }]
  xKey: "name"  (slice label)
  yKey: "value" (arc size)

"donut" — same as pie but with a hollow centre

"scatter" — scatter plot
  data: [{ "x": 12, "y": 34, "region": "EMEA" }, ...]
  xKey: "x", yKey: "y"
  y2Key: "region"  (optional — colour-codes points by a third dimension)

"histogram" — frequency histogram over a single numeric field
  data: [{ "duration": 142 }, { "duration": 98 }, ...]
  xKey: "duration"  (the numeric field to bin)

"tree" — vertical tree layout (D3HierarchyNode)
  data: { "name": "CEO", "children": [{ "name": "VP Eng", "children": [{ "name": "Lead FE" }] }] }
  No xKey/yKey needed. Optional "value" field on each node controls node size.

"force" — draggable force-directed graph (D3ForceGraphData)
  data: {
    "nodes": [{ "id": "api", "label": "API Gateway", "group": "backend" }, ...],
    "links": [{ "source": "api", "target": "db", "value": 3 }, ...]
  }
  node.id   — required unique identifier used in link source/target
  node.label — display label (falls back to id if omitted)
  node.group — optional string/number used for colour-coding
  link.value — optional numeric weight (affects link thickness)

"custom" — not available through this tool (requires a React customRenderer prop)

──────────────────────────────────────────────────────
OPTIONAL DISPLAY PROPS
──────────────────────────────────────────────────────

height: number          — SVG height in pixels (default 400)
width: number|string    — SVG width in pixels or CSS % string (default "100%")
showAxes: boolean       — show x/y axes on cartesian charts (default true)
showGrid: boolean       — show background grid lines (default true)
showTooltip: boolean    — show hover tooltip (default true)
showLegend: boolean     — show colour-swatch legend below chart (default false)
legendLabels: string[]  — override auto-derived legend labels
colorScheme: string     — colour scheme: "tableau10" (default), "set1", "set2",
                          "set3", "pastel1", "pastel2", "accent", "dark2",
                          "paired", "category10"
                          OR an explicit array of CSS colour strings.
margin: { top, right, bottom, left }  — chart drawing margins in pixels
styling:
  containerSx: object   — MUI sx prop on outer Box
  svgBackground: string — SVG background colour
  svgBorderRadius: string
  fillOpacity: number   — bar/arc fill opacity 0–1 (default 1)
  gridColor: string     — grid line colour (default "#e0e0e0")
  axisColor: string     — axis tick label colour
  axisFontSize: number  — axis font size px (default 11)
  animate: boolean      — enable D3 transitions (default true)
  animationDuration: number — ms (default 400)
  barRadius: number     — bar corner radius px (default 2)
  nodeRadius: number    — scatter/force node radius px (default 5)
  strokeWidth: number   — line/force link stroke width px (default 2)

──────────────────────────────────────────────────────
EXAMPLES
──────────────────────────────────────────────────────

1) Grouped bar chart — monthly revenue vs expenses:
{
  "type": "bar",
  "title": "Monthly P&L",
  "data": [{"name":"Jan","revenue":42000,"expenses":31000},{"name":"Feb","revenue":51000,"expenses":34000}],
  "xKey": "name",
  "yKey": "revenue",
  "seriesKeys": ["revenue","expenses"],
  "showLegend": true
}

2) Multi-series line chart:
{
  "type": "line",
  "title": "User Growth",
  "data": [{"month":"Jan","mobile":1200,"web":900},{"month":"Feb","mobile":1500,"web":1100}],
  "xKey": "month",
  "seriesKeys": ["mobile","web"],
  "colorScheme": "set2",
  "showLegend": true
}

3) Pie chart — market share:
{
  "type": "pie",
  "title": "Market Share",
  "data": [{"name":"Chrome","value":65},{"name":"Firefox","value":20},{"name":"Other","value":15}]
}

4) Force-directed graph — microservice dependencies:
{
  "type": "force",
  "title": "Service Map",
  "data": {
    "nodes": [{"id":"gateway","label":"API Gateway","group":"edge"},{"id":"auth","label":"Auth","group":"core"},{"id":"db","label":"Database","group":"storage"}],
    "links": [{"source":"gateway","target":"auth","value":5},{"source":"gateway","target":"db","value":3}]
  },
  "height": 500,
  "styling": { "nodeRadius": 8 }
}

5) Org / hierarchy tree:
{
  "type": "tree",
  "title": "Engineering Org",
  "data": {"name":"CTO","children":[{"name":"FE Lead","children":[{"name":"Alice"},{"name":"Bob"}]},{"name":"BE Lead","children":[{"name":"Carol"}]}]}
}

6) Scatter plot with group colouring:
{
  "type": "scatter",
  "title": "Latency vs Throughput",
  "data": [{"rps":120,"latency":45,"tier":"free"},{"rps":800,"latency":22,"tier":"pro"}],
  "xKey": "rps",
  "yKey": "latency",
  "y2Key": "tier",
  "showLegend": true
}

7) Update an existing chart's data:
{ "action": "update", "referenceId": "abc-123", "data": [...] }

8) Remove:
{ "action": "remove", "referenceId": "abc-123" }`;

const D3MacroDefinition: MacroComponentDefinition<typeof D3Macro> = {
  name: "D3Macro",
  description: "Mount, update, or remove a D3 data visualization (core.D3Chart@1.0.0) in the persistent side panel.",
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
              description: "Operation: 'add' (default), 'update', or 'remove'.",
              enum: ["add", "update", "remove"],
            },
            type: {
              type: "string",
              description: "D3 chart type to render.",
              enum: ["bar", "line", "area", "pie", "donut", "scatter", "histogram", "tree", "force"],
            },
            title: {
              type: "string",
              description: "Display title shown in the side panel tab and above the chart.",
            },
            description: {
              type: "string",
              description: "Optional subtitle rendered below the title.",
            },
            data: {
              type: "object",
              description: "Chart data. Flat D3DataPoint[] for bar/line/area/pie/donut/scatter/histogram; D3HierarchyNode (root object) for tree; D3ForceGraphData ({ nodes, links }) for force.",
            },
            xKey: {
              type: "string",
              description: "Key in each data object used for the x-axis category or scatter x dimension. Default 'name'.",
            },
            yKey: {
              type: "string",
              description: "Key in each data object used for the primary y-axis or arc size. Default 'value'.",
            },
            y2Key: {
              type: "string",
              description: "Optional second key used as the group/colour dimension in scatter plots.",
            },
            seriesKeys: {
              type: "array",
              description: "Array of value keys for multi-series bar, line, and area charts. Each key becomes a separate series.",
              items: { type: "string" },
            },
            height: {
              type: "number",
              description: "SVG height in pixels. Default 400.",
            },
            width: {
              type: "string",
              description: "SVG width in pixels or a CSS percentage string e.g. '100%'. Default '100%'.",
            },
            showAxes: {
              type: "boolean",
              description: "Show x/y axes on cartesian chart types. Default true.",
            },
            showGrid: {
              type: "boolean",
              description: "Show background grid lines. Default true.",
            },
            showTooltip: {
              type: "boolean",
              description: "Show hover tooltip. Default true.",
            },
            showLegend: {
              type: "boolean",
              description: "Show colour-swatch legend below the chart. Default false.",
            },
            legendLabels: {
              type: "array",
              description: "Optional override for auto-derived legend item labels.",
              items: { type: "string" },
            },
            colorScheme: {
              type: "string",
              description: "Named D3 colour scheme ('tableau10', 'set1', 'set2', 'set3', 'pastel1', 'pastel2', 'accent', 'dark2', 'paired', 'category10') or an explicit string[] of CSS colours.",
            },
            margin: {
              type: "object",
              description: "Chart drawing margins in pixels with keys: top, right, bottom, left (all numbers).",
            },
            styling: {
              type: "object",
              description: "Visual styling overrides: containerSx, svgBackground, svgBorderRadius, fillOpacity, gridColor, axisColor, axisFontSize, animate, animationDuration, barRadius, nodeRadius, strokeWidth.",
            },
            referenceId: {
              type: "string",
              description: "Stable ID for the side panel item. Required for 'update' and 'remove'. Auto-generated for 'add' if omitted.",
            },
          },
          required: [],
        },
      },
    },
  ],
};

export default D3MacroDefinition;

