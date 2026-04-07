import { Macro, MacroComponentDefinition, SidePanelAction, UXChatMessage } from "../../types";
import type {
  BarSeriesConfig,
  LineSeriesConfig,
  AreaSeriesConfig,
  ChartStylingOptions,
} from '../../../Charts/ChartTypes';

/** Parse a value from JSON string if needed (Gemini sends freeform objects as strings). */
const tryParseJSON = (val: unknown): unknown => {
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return val; }
};

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
 * Extract a ChartStylingOptions object from the flat options bag.
 * All keys are optional — only defined values are forwarded.
 */
function buildStyling(options: Record<string, any>): ChartStylingOptions | undefined {
  const styling: ChartStylingOptions = {};
  if (options.containerSx !== undefined) styling.containerSx = options.containerSx;
  if (options.titleVariant !== undefined) styling.titleVariant = options.titleVariant;
  if (options.descriptionVariant !== undefined) styling.descriptionVariant = options.descriptionVariant;
  if (options.margin !== undefined) styling.margin = options.margin;
  if (options.animationDuration !== undefined) styling.animationDuration = options.animationDuration;
  if (options.gridColor !== undefined) styling.gridColor = options.gridColor;
  if (options.gridDasharray !== undefined) styling.gridDasharray = options.gridDasharray;
  if (options.axisFontSize !== undefined) styling.axisFontSize = options.axisFontSize;
  if (options.axisColor !== undefined) styling.axisColor = options.axisColor;
  if (options.barRadius !== undefined) styling.barRadius = options.barRadius;
  if (options.barOpacity !== undefined) styling.barOpacity = options.barOpacity;
  if (options.lineStrokeWidth !== undefined) styling.lineStrokeWidth = options.lineStrokeWidth;
  if (options.showDots !== undefined) styling.showDots = options.showDots;
  if (options.dotRadius !== undefined) styling.dotRadius = options.dotRadius;
  if (options.lineDasharray !== undefined) styling.lineDasharray = options.lineDasharray;
  if (options.areaFillOpacity !== undefined) styling.areaFillOpacity = options.areaFillOpacity;
  if (options.pieInnerRadius !== undefined) styling.pieInnerRadius = options.pieInnerRadius;
  if (options.pieOuterRadius !== undefined) styling.pieOuterRadius = options.pieOuterRadius;
  if (options.funnelLabelPosition !== undefined) styling.funnelLabelPosition = options.funnelLabelPosition;
  return Object.keys(styling).length > 0 ? styling : undefined;
}

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
    // composed-specific series layout override
    composedLayout,
  } = options;

  const styling = buildStyling(options);

  const base: Record<string, any> = {
    data: data.length ? data : DEFAULT_DATA,
    title,
    ...(width !== undefined && { width }),
    ...(height !== undefined && { height }),
    ...(showLegend !== undefined && { showLegend }),
    ...(styling && { styling }),
  };

  if (chartType === 'pie') {
    if (colors?.length) base.colors = colors;
    // pieInnerRadius / pieOuterRadius can also be passed as top-level option shorthands
    if (options.innerRadius !== undefined) base.innerRadius = options.innerRadius;
    if (options.outerRadius !== undefined) base.outerRadius = options.outerRadius;
    return base;
  }

  if (chartType === 'funnel') {
    if (colors?.length) base.colors = colors;
    if (options.showLabels !== undefined) base.showLabels = options.showLabels;
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
    // composedLayout allows explicit control: { areaKeys, barKeys, lineKeys }
    const layout = composedLayout ?? {};
    const areaKeys: string[] = layout.areaKeys ?? [];
    const explicitBarKeys: string[] = layout.barKeys ?? [];
    const lineKeys: string[] = layout.lineKeys ?? [];

    // Fall back to legacy dataKeys behaviour when composedLayout is not provided
    const allKeys: string[] = (dataKeys as string[]).length ? (dataKeys as string[]) : ['value'];
    const resolvedBarKeys = explicitBarKeys.length
      ? explicitBarKeys
      : areaKeys.length || lineKeys.length
        ? []
        : [allKeys[0]];
    const resolvedLineKeys = lineKeys.length
      ? lineKeys
      : areaKeys.length || explicitBarKeys.length
        ? []
        : allKeys.slice(1);

    const colorOffset = areaKeys.length + resolvedBarKeys.length;

    const areas: AreaSeriesConfig[] = areaKeys.map((key: string, idx: number) => ({
      dataKey: key,
      name: key,
      fill: colors?.[idx],
      stroke: colors?.[idx],
      type: 'monotone' as const,
    }));
    const bars: BarSeriesConfig[] = resolvedBarKeys.map((key: string, idx: number) => ({
      dataKey: key,
      name: key,
      fill: colors?.[areaKeys.length + idx],
      ...(stacked && { stackId: 'stack' }),
    }));
    const lines: LineSeriesConfig[] = resolvedLineKeys.map((key: string, idx: number) => ({
      dataKey: key,
      name: key,
      stroke: colors?.[colorOffset + idx],
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
    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content: 'Cannot manage charts: side panel is not available.',
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: [],
    };
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
    (tryParseJSON(parsed.data) || []) as any[],
    title,
    (tryParseJSON(parsed.options) || {}) as Record<string, any>,
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
- "composed": Combines area, bar, and line series in one chart. Useful for overlaying volume, distribution, and trend.

DATA FORMAT:
Each element in "data" is an object. At minimum every chart type requires a "name" key (category label) and a numeric value key. For pie and funnel that key must be "value". For bar, line, and composed you can use any key name(s) — reference them with "options.dataKeys".

═══════════════════════════════════════
OPTIONS REFERENCE
═══════════════════════════════════════

── LAYOUT ──────────────────────────────
  width: number           Pixel width of the chart canvas. Default: fills container.
  height: number          Pixel height. Default: 300.
  margin: object          Inner SVG margin { top, right, bottom, left } to prevent label clipping.

── DATA SERIES ─────────────────────────
  dataKeys: string[]      Keys in each data object to plot as series (bar / line / composed).
  xAxisKey: string        Key used as the x-axis category label. Default: "name".
  stacked: boolean        Stack bars or areas sharing the same axis. Default: false.
  showLegend: boolean     Show the series legend. Default: true.
  showGrid: boolean       Show CartesianGrid background. Default: true (cartesian charts).

── COMPOSED LAYOUT ─────────────────────
  composedLayout: object  Explicit series type assignment for composed charts.
    .areaKeys: string[]   Keys rendered as filled Area series.
    .barKeys: string[]    Keys rendered as Bar series.
    .lineKeys: string[]   Keys rendered as Line series.
  Example: { "areaKeys": ["volume"], "barKeys": ["revenue"], "lineKeys": ["growth"] }

── PIE / DONUT ─────────────────────────
  innerRadius: number     Donut hole radius in px. 0 = solid pie. Default: 0.
  outerRadius: number     Outer radius in px. Default: height/2 - 20.

── FUNNEL ──────────────────────────────
  showLabels: boolean     Show stage name labels beside each segment. Default: true.

── COLOUR ──────────────────────────────
  colors: string[]        Fill / stroke colours for each series or slice, applied in order.
                          Accepts hex (#4e79a7), rgb(r,g,b), or named CSS colours.
                          For composed charts the order matches: areas → bars → lines.
  gridColor: string       CartesianGrid line colour. Default: "#e0e0e0".
  axisColor: string       Colour for axis tick labels and axis lines.

── TYPOGRAPHY ──────────────────────────
  titleVariant: string    MUI Typography variant for the chart title.
                          Values: "h4" | "h5" | "h6" | "subtitle1" | "subtitle2" | "body1" | "body2"
                          Default: "h6".
  descriptionVariant: string  MUI Typography variant for the subtitle.
                          Values: "subtitle1" | "subtitle2" | "body1" | "body2" | "caption"
                          Default: "subtitle2".
  axisFontSize: number    Font size in px for axis tick labels. Default: 12.

── GRID & AXES ─────────────────────────
  gridDasharray: string   SVG strokeDasharray for CartesianGrid. "3 3" = dashes, "0" = solid.

── BAR STYLING ─────────────────────────
  barRadius: number       Corner radius for bar segments in px. Default: 0 (square corners).
  barOpacity: number      Opacity for bar segments (0–1). Default: 1.

── LINE STYLING ────────────────────────
  lineStrokeWidth: number Stroke width in px for all line series. Default: 2.
  showDots: boolean       Show a dot at each data point on lines. Default: false.
  dotRadius: number       Dot radius in px when showDots is true. Default: 4.
  lineDasharray: string   SVG strokeDasharray to make lines dashed. e.g. "5 5".

── AREA STYLING ────────────────────────
  areaFillOpacity: number Fill opacity for all area series below the line (0–1). Default: 0.6.

── ANIMATION ───────────────────────────
  animationDuration: number  Chart animation duration in ms. Set to 0 to disable. Default: 400.

── CONTAINER ───────────────────────────
  containerSx: object     MUI sx props for the outer Box wrapper.
                          e.g. { "p": 2, "bgcolor": "background.paper", "borderRadius": 2 }

═══════════════════════════════════════
EXAMPLES
═══════════════════════════════════════

1) Pie chart of market share:
   { "type": "pie", "title": "Market Share Q1",
     "data": [{"name":"Product A","value":45},{"name":"Product B","value":30},{"name":"Product C","value":25}],
     "options": { "colors": ["#4e79a7","#f28e2b","#e15759"], "innerRadius": 60 } }

2) Donut chart (pie with hole):
   { "type": "pie", "title": "Budget Allocation",
     "data": [{"name":"Engineering","value":50},{"name":"Marketing","value":30},{"name":"Operations","value":20}],
     "options": { "innerRadius": 70, "height": 320 } }

3) Grouped bar chart with custom colours and rounded bars:
   { "type": "bar", "title": "Monthly Revenue",
     "data": [{"name":"Jan","revenue":4200,"cost":2100},{"name":"Feb","revenue":3800,"cost":1900}],
     "options": { "dataKeys": ["revenue","cost"], "colors": ["#4e79a7","#e15759"],
                  "barRadius": 4, "height": 350 } }

4) Stacked bar chart:
   { "type": "bar", "title": "Stacked Support Tickets",
     "data": [{"name":"Mon","open":12,"closed":8},{"name":"Tue","open":9,"closed":14}],
     "options": { "dataKeys": ["open","closed"], "stacked": true,
                  "colors": ["#e15759","#59a14f"] } }

5) Line chart with dots and custom stroke:
   { "type": "line", "title": "Weekly Active Users",
     "data": [{"name":"W1","users":120},{"name":"W2","users":145},{"name":"W3","users":180}],
     "options": { "dataKeys": ["users"], "showDots": true, "lineStrokeWidth": 3,
                  "colors": ["#4e79a7"] } }

6) Dashed multi-line chart:
   { "type": "line", "title": "Plan vs Actual",
     "data": [{"name":"Q1","plan":100,"actual":92},{"name":"Q2","plan":110,"actual":108}],
     "options": { "dataKeys": ["plan","actual"], "lineDasharray": "5 5",
                  "colors": ["#4e79a7","#e15759"] } }

7) Funnel for sales pipeline:
   { "type": "funnel", "title": "Sales Pipeline",
     "data": [{"name":"Leads","value":500},{"name":"Qualified","value":200},{"name":"Proposal","value":80},{"name":"Closed","value":30}],
     "options": { "colors": ["#4e79a7","#f28e2b","#e15759","#59a14f"], "funnelLabelPosition": "right" } }

8) Composed chart — areas for volume, bars for revenue, lines for growth:
   { "type": "composed", "title": "Business Overview",
     "data": [{"name":"Jan","volume":400,"revenue":2400,"growth":5},{"name":"Feb","volume":300,"revenue":1398,"growth":3}],
     "options": { "composedLayout": { "areaKeys": ["volume"], "barKeys": ["revenue"], "lineKeys": ["growth"] },
                  "colors": ["#76b7b2","#4e79a7","#f28e2b"], "areaFillOpacity": 0.3 } }

9) Update an existing chart with new data and a new colour theme:
   { "action": "update", "referenceId": "abc-123",
     "options": { "colors": ["#e15759","#59a14f","#f28e2b"] },
     "data": [...] }

10) Remove:
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
              description: "Layout, data, colour, typography, and styling options. See tool description for the full reference. Key groups: layout (width, height, margin), series (dataKeys, xAxisKey, stacked, showLegend, showGrid), composed series assignment (composedLayout.areaKeys/barKeys/lineKeys), colour (colors, gridColor, axisColor), typography (titleVariant, descriptionVariant, axisFontSize), grid/axes (gridDasharray), bar styling (barRadius, barOpacity), line styling (lineStrokeWidth, showDots, dotRadius, lineDasharray), area styling (areaFillOpacity), pie/donut (innerRadius, outerRadius), funnel (showLabels, funnelLabelPosition), animation (animationDuration), container (containerSx).",
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
