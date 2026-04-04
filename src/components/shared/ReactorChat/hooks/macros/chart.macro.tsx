import { Macro, MacroComponentDefinition, SidePanelAction, UXChatMessage } from "../../types";
import type {
  BarSeriesConfig,
  LineSeriesConfig,
  AreaSeriesConfig,
} from '../../../Charts/ChartTypes';

const CHART_COMPONENT_MAP: Record<string, string> = {
  'pie':      'core.PieChart@1.0.0',
  'bar':      'core.BarChart@1.0.0',
  'line':     'core.LineChart@1.0.0',
  'funnel':   'core.FunnelChart@1.0.0',
  'composed': 'core.ComposedChart@1.0.0',
};

const DEFAULT_DATA = [
  { name: 'Group A', value: 400 },
  { name: 'Group B', value: 300 },
  { name: 'Group C', value: 300 },
  { name: 'Group D', value: 200 },
];

/**
 * Translate the flat `options` bag from the AI tool call into the semantically
 * correct props expected by each shared Chart component.
 */
function buildChartProps(
  chartType: string,
  data: Record<string, any>[],
  title: string,
  options: Record<string, any>,
): Record<string, any> {
  const {
    width,
    height,
    colors,
    showLegend,
    showGrid,
    xAxisKey = 'name',
    dataKeys = [],
    stacked,
  } = options;

  const base: Record<string, any> = {
    data: data.length ? data : DEFAULT_DATA,
    title,
    ...(width !== undefined && { width }),
    ...(height !== undefined && { height }),
    ...(showLegend !== undefined && { showLegend }),
  };

  if (chartType === 'pie' || chartType === 'funnel') {
    // PieChart and FunnelChart accept data directly with no series config
    if (colors?.length) base.colors = colors;
    return base;
  }

  if (chartType === 'bar') {
    const bars: BarSeriesConfig[] = (dataKeys as string[]).length
      ? (dataKeys as string[]).map((key: string, idx: number) => ({
          dataKey: key,
          name: key,
          fill: colors?.[idx],
          ...(stacked && { stackId: 'stack' }),
        }))
      : [{ dataKey: 'value', fill: colors?.[0] }];
    return { ...base, xAxisKey, bars, ...(showGrid !== undefined && { showGrid }) };
  }

  if (chartType === 'line') {
    const series: LineSeriesConfig[] = (dataKeys as string[]).length
      ? (dataKeys as string[]).map((key: string, idx: number) => ({
          dataKey: key,
          name: key,
          stroke: colors?.[idx],
          type: 'monotone' as const,
        }))
      : [{ dataKey: 'value', type: 'monotone' as const }];
    return { ...base, xAxisKey, series, ...(showGrid !== undefined && { showGrid }) };
  }

  if (chartType === 'composed') {
    // Default composed layout: first dataKey → bar, rest → lines
    const keys: string[] = (dataKeys as string[]).length ? (dataKeys as string[]) : ['value'];
    const bars: BarSeriesConfig[] = [{ dataKey: keys[0], fill: colors?.[0], ...(stacked && { stackId: 'stack' }) }];
    const areas: AreaSeriesConfig[] = [];
    const lines: LineSeriesConfig[] = keys.slice(1).map((key: string, idx: number) => ({
      dataKey: key,
      name: key,
      stroke: colors?.[idx + 1],
      type: 'monotone' as const,
    }));
    return { ...base, xAxisKey, areas, bars, lines, ...(showGrid !== undefined && { showGrid }) };
  }

  return base;
}

// @ts-ignore
const ChartMacro: Macro<UXChatMessage> = async (args, chatState, reactory) => {
  const parsed = (args && typeof args === 'object' && !Array.isArray(args)) ? args as Record<string, any> : {};

  const action: SidePanelAction = parsed.action || 'add';
  const referenceId: string | undefined = parsed.referenceId;
  const title: string = parsed.title || 'Chart';

  if (!chatState.sidePanel) {
    reactory.error('ChartMacro: Side panel actions not available on chatState');
    return null;
  }

  // ── REMOVE ──
  if (action === 'remove') {
    if (!referenceId) {
      return {
        __typename: "ReactorChatMessage",
        role: "assistant",
        content: 'Cannot remove chart: `referenceId` is required for the remove action.',
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
      content: `Removed chart "${referenceId}" from the side panel.`,
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: [],
    };
  }

  // Build chart props for add/update
  const chartType: string = (parsed.type || 'pie').toLowerCase();
  const componentFqn = CHART_COMPONENT_MAP[chartType] || CHART_COMPONENT_MAP['pie'];
  const chartProps = buildChartProps(
    chartType,
    parsed.data || [],
    title,
    parsed.options || {},
  );

  // ── UPDATE ──
  if (action === 'update') {
    if (!referenceId) {
      return {
        __typename: "ReactorChatMessage",
        role: "assistant",
        content: 'Cannot update chart: `referenceId` is required for the update action.',
        id: reactory.utils.uuid(),
        rating: 0,
        timestamp: new Date(),
        tool_calls: [],
      };
    }
    const updates: Record<string, any> = {
      props: chartProps,
      title,
    };
    if (parsed.type) updates.componentFqn = componentFqn;
    chatState.sidePanel.updateItem(referenceId, updates);
    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content: `Updated chart "${referenceId}" in the side panel.`,
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: [],
    };
  }

  // ── ADD (default) ──
  const itemId = referenceId || reactory.utils.uuid();

  chatState.sidePanel.addItem({
    id: itemId,
    componentFqn,
    props: chartProps,
    title,
    addedAt: new Date(),
    type: 'component',
  });

  return {
    __typename: "ReactorChatMessage",
    role: "assistant",
    content: `Opened **${title}** (${chartType} chart) in the side panel (ref: \`${itemId}\`).`,
    id: reactory.utils.uuid(),
    rating: 0,
    timestamp: new Date(),
    tool_calls: [],
  };
};

const TOOL_DESCRIPTION = `Mount, update, or remove a data chart in the persistent side panel. Charts remain visible as the conversation continues.

ACTIONS:
- "add" (default): Mount a new chart. Provide "type", "data", and optionally "title", "options", and "referenceId".
- "update": Replace the data, type, or options of an existing chart. Requires "referenceId".
- "remove": Remove a chart from the side panel. Requires "referenceId".

Use the "side_panel_state" tool first to see what is currently mounted and get reference IDs.

CHART TYPES:
- "pie": Proportional slices. Each data item needs { name, value }. Best for showing composition or share.
- "bar": Vertical or horizontal bars. Each item needs { name, <valueKey> }. Best for comparing quantities across categories.
- "line": Trend over time or ordered categories. Each item needs { name, <valueKey> }. Best for showing change.
- "funnel": Sequential stage drop-off. Each item needs { name, value }. Best for conversion/pipeline analysis.
- "composed": Combines bar and line series in one chart. Useful for overlaying volume and trend.

DATA FORMAT:
Each element in "data" is an object. At minimum every chart type requires a "name" key (category label) and a numeric value key. For pie and funnel charts that key must be "value". For bar, line, and composed charts you can use any key name(s) and reference them in "options.dataKeys".

OPTIONS (all optional):
- width: number — pixel width (default 400)
- height: number — pixel height (default 300)
- dataKeys: string[] — which numeric keys in the data to plot (bar/line/composed only)
- colors: string[] — hex or named colours for each series / slice
- showLegend: boolean — show a legend (default true)
- showTooltip: boolean — show hover tooltip (default true)
- showGrid: boolean — show background grid (default true for bar/line/composed)
- xAxisKey: string — key in each data item used as the x-axis label (default "name")
- stacked: boolean — stack bars/areas (bar/composed only)

EXAMPLES:

1) Pie chart of market share:
   { "type": "pie", "title": "Market Share Q1", "data": [{"name":"Product A","value":45},{"name":"Product B","value":30},{"name":"Product C","value":25}] }

2) Bar chart comparing monthly revenue:
   { "type": "bar", "title": "Monthly Revenue", "data": [{"name":"Jan","revenue":4200},{"name":"Feb","revenue":3800},{"name":"Mar","revenue":5100}], "options": { "dataKeys": ["revenue"], "height": 350 } }

3) Line chart showing user growth:
   { "type": "line", "title": "User Growth", "data": [{"name":"Week 1","users":120},{"name":"Week 2","users":145},{"name":"Week 3","users":180}], "options": { "dataKeys": ["users"] } }

4) Funnel for sales pipeline:
   { "type": "funnel", "title": "Sales Pipeline", "data": [{"name":"Leads","value":500},{"name":"Qualified","value":200},{"name":"Proposal","value":80},{"name":"Closed","value":30}] }

5) Update an existing chart with new data:
   { "action": "update", "referenceId": "abc-123", "data": [...] }

6) Remove:
   { "action": "remove", "referenceId": "abc-123" }`;

const ChartMacroDefinition: MacroComponentDefinition<typeof ChartMacro> = {
  name: "ChartMacro",
  description: "Mount, update, or remove a data chart in the persistent side panel. Supports pie, bar, line, funnel, and composed chart types.",
  component: ChartMacro,
  version: "1.0.0",
  nameSpace: "reactor-macros",
  roles: ['USER'],
  alias: 'chart',
  icon: "bar_chart",
  runat: 'client',
  tools: [
    {
      type: "function",
      runat: "client",
      safeForAutoExecution: false,
      function: {
        name: "chart",
        icon: "bar_chart",
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
              description: "Chart type to render.",
              enum: ["pie", "bar", "line", "funnel", "composed"],
            },
            title: {
              type: "string",
              description: "Title displayed in the side panel tab and above the chart.",
            },
            data: {
              type: "array",
              description: "Array of data objects. Each object must have a 'name' key plus one or more numeric value keys.",
              items: { type: "object" },
            },
            options: {
              type: "object",
              description: "Display options: width, height, dataKeys, colors, showLegend, showTooltip, showGrid, xAxisKey, stacked.",
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

export default ChartMacroDefinition;
