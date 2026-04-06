/**
 * Shared type definitions for the Reactory D3Chart component.
 *
 * These types use semantically clear property names suitable for direct
 * consumption outside of the ReactoryForm engine.  All chart types accept
 * data through clearly named props and expose a `customRenderer` escape-hatch
 * for bespoke D3 visualisations.
 */

// ─── Chart type ───────────────────────────────────────────────────────────────

/**
 * Supported built-in D3 chart types.
 * Use `'custom'` together with `customRenderer` for fully bespoke D3
 * visualisations that still benefit from the responsive wrapper, title,
 * description, tooltip, and legend infrastructure.
 */
export type D3ChartType =
  | 'bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'histogram'
  | 'tree'
  | 'force'
  | 'custom';

// ─── Margins ──────────────────────────────────────────────────────────────────

/** Chart drawing margins in pixels */
export interface D3Margin {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

// ─── Data shapes ──────────────────────────────────────────────────────────────

/**
 * Generic flat data point used by bar, line, area, scatter, and histogram charts.
 * Each key maps to a string label or a numeric value.
 */
export interface D3DataPoint {
  [key: string]: string | number | undefined;
}

/**
 * Hierarchical node used by the `'tree'` chart type.
 * Provide a single root node; children are nested recursively.
 */
export interface D3HierarchyNode {
  name: string;
  value?: number;
  children?: D3HierarchyNode[];
  [key: string]: unknown;
}

/** Node datum for force-directed graphs */
export interface D3ForceNode {
  /** Unique identifier — used to match link `source` / `target` references */
  id: string | number;
  /** Human-readable label rendered beside the node */
  label?: string;
  /** Optional group used for colour-coding */
  group?: string | number;
  [key: string]: unknown;
}

/** Link datum for force-directed graphs */
export interface D3ForceLink {
  /** Source node `id` */
  source: string | number;
  /** Target node `id` */
  target: string | number;
  /** Optional numeric weight — affects link thickness */
  value?: number;
  [key: string]: unknown;
}

/**
 * Top-level data structure for `'force'` charts.
 * Provide flat arrays of nodes and links; the layout engine resolves
 * id-based references internally.
 */
export interface D3ForceGraphData {
  nodes: D3ForceNode[];
  links: D3ForceLink[];
}

// ─── Colour schemes ───────────────────────────────────────────────────────────

/**
 * Named D3 colour scheme presets drawn from `d3-scale-chromatic`.
 * Pass an explicit `string[]` to use arbitrary CSS colours instead.
 */
export type D3ColorScheme =
  | 'tableau10'
  | 'pastel1'
  | 'pastel2'
  | 'set1'
  | 'set2'
  | 'set3'
  | 'accent'
  | 'dark2'
  | 'paired'
  | 'category10';

// ─── Axis configuration ───────────────────────────────────────────────────────

/** Per-axis display configuration */
export interface D3AxisConfig {
  /** Label displayed alongside the axis */
  label?: string;
  /** Number of ticks to display */
  tickCount?: number;
  /** Custom tick value formatter */
  tickFormat?: (value: unknown) => string;
  /** Hide this axis entirely */
  hidden?: boolean;
}

// ─── Custom renderer context ──────────────────────────────────────────────────

/**
 * Context object provided to a custom renderer function.
 *
 * All dimensions are pre-computed so the renderer can skip boilerplate.
 * Draw all D3 content into `context.g` — the `<g>` element is already
 * translated by `margin.left / margin.top`.
 */
export interface D3ChartContext {
  /** Root SVG element */
  svg: SVGSVGElement;
  /** Pre-translated `<g>` drawing group — target for all D3 selections */
  g: SVGGElement;
  /** The raw input data (flat array, hierarchy or force graph) */
  data: D3DataPoint[] | D3HierarchyNode | D3ForceGraphData;
  /** Total SVG width in pixels */
  width: number;
  /** Total SVG height in pixels */
  height: number;
  /** Resolved drawing margins */
  margin: Required<D3Margin>;
  /** Usable drawing width (width − left margin − right margin) */
  innerWidth: number;
  /** Usable drawing height (height − top margin − bottom margin) */
  innerHeight: number;
  /** Resolved colour array */
  colors: string[];
  /**
   * Show the tooltip at coordinates relative to the chart container.
   * @param x  Horizontal offset from the container's left edge in pixels
   * @param y  Vertical offset from the container's top edge in pixels
   * @param html  HTML string to render inside the tooltip
   */
  showTooltip: (x: number, y: number, html: string) => void;
  /** Hide the tooltip */
  hideTooltip: () => void;
}

/**
 * Custom renderer function signature.
 *
 * Receives a `D3ChartContext` and should imperatively draw into `context.g`
 * using D3.  May return a cleanup function that will be called before the
 * next render or when the component unmounts (e.g. to stop a simulation).
 */
export type D3CustomRenderer = (context: D3ChartContext) => void | (() => void);

// ─── Styling ──────────────────────────────────────────────────────────────────

/** Visual styling overrides for the `D3Chart` component */
export interface D3StylingOptions {
  /** MUI `sx` prop applied to the outer Box wrapper */
  containerSx?: object;
  /** Typography variant for the optional chart title. @default 'h6' */
  titleVariant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2';
  /** Typography variant for the optional chart description. @default 'subtitle2' */
  descriptionVariant?: 'subtitle1' | 'subtitle2' | 'body1' | 'body2' | 'caption';
  /** Background colour applied to the SVG element */
  svgBackground?: string;
  /** CSS `border-radius` for the SVG element e.g. `'8px'` */
  svgBorderRadius?: string;
  /** Fill opacity for bars and arcs (0–1). @default 1 */
  fillOpacity?: number;
  /** Grid line stroke colour. @default '#e0e0e0' */
  gridColor?: string;
  /** Grid line `stroke-dasharray`. @default '3 3' */
  gridDasharray?: string;
  /** Axis line and tick label colour */
  axisColor?: string;
  /** Axis tick label font size in pixels. @default 11 */
  axisFontSize?: number;
  /** Enable D3 CSS transition animations. @default true */
  animate?: boolean;
  /** Animation transition duration in milliseconds. @default 400 */
  animationDuration?: number;
  /** Bar corner radius in pixels (bar and histogram charts). @default 2 */
  barRadius?: number;
  /** Node radius in pixels (scatter and force charts). @default 5 */
  nodeRadius?: number;
  /** Stroke width for lines and force links in pixels. @default 2 */
  strokeWidth?: number;
}

// ─── Component props ──────────────────────────────────────────────────────────

/**
 * Props for the `D3Chart` shared component.
 *
 * **Data shapes per chart type:**
 * | type | data |
 * |------|------|
 * | `bar`, `line`, `area`, `scatter`, `histogram` | `D3DataPoint[]` |
 * | `pie`, `donut` | `D3DataPoint[]` (one entry per slice) |
 * | `tree` | `D3HierarchyNode` (single root) |
 * | `force` | `D3ForceGraphData` ({ nodes, links }) |
 * | `custom` | any — passed to `customRenderer` |
 */
export interface D3ChartProps {
  /**
   * The chart type to render.
   * Use `'custom'` together with `customRenderer` for fully bespoke visualisations.
   * @default 'bar'
   */
  type?: D3ChartType;

  /**
   * Chart data. Shape depends on `type` — see the table in the component JSDoc.
   */
  data: D3DataPoint[] | D3HierarchyNode | D3ForceGraphData;

  /**
   * Key in each flat data point used for the x-axis / category.
   * Ignored by `pie`, `donut`, `tree`, `force`.
   * @default 'name'
   */
  xKey?: string;

  /**
   * Key in each flat data point used for the primary y-axis / value.
   * For `pie` and `donut` this determines the arc size.
   * @default 'value'
   */
  yKey?: string;

  /**
   * Second numeric key — used as the colour-grouping dimension in scatter plots.
   * Ignored by other chart types.
   */
  y2Key?: string;

  /**
   * Additional series keys for multi-series line, area, and grouped bar charts.
   * When provided, each key is rendered as a separate series using the colour scheme.
   * If omitted the single `yKey` series is used.
   */
  seriesKeys?: string[];

  /** X-axis display configuration */
  xAxis?: D3AxisConfig;

  /** Y-axis display configuration */
  yAxis?: D3AxisConfig;

  /** Chart height in pixels. @default 300 */
  height?: number;

  /**
   * Chart width in pixels or a CSS percentage string.
   * When a percentage string is given the component tracks its container size
   * via `ResizeObserver` and renders responsively.
   * @default '100%'
   */
  width?: number | string;

  /**
   * Colour scheme preset name or an explicit array of CSS colour strings.
   * @default 'tableau10'
   */
  colorScheme?: D3ColorScheme | string[];

  /** Optional title rendered above the chart */
  title?: string;

  /** Optional subtitle rendered below the title */
  description?: string;

  /** Show the x and y axes for cartesian chart types. @default true */
  showAxes?: boolean;

  /** Show background grid lines for cartesian chart types. @default true */
  showGrid?: boolean;

  /** Show a tooltip on hover. @default true */
  showTooltip?: boolean;

  /**
   * Show a colour-swatch legend below the chart.
   * Legend labels default to `seriesKeys` or `yKey`.
   * @default false
   */
  showLegend?: boolean;

  /** Override the auto-derived legend item labels */
  legendLabels?: string[];

  /** Chart drawing margins in pixels */
  margin?: D3Margin;

  /** Visual styling overrides */
  styling?: D3StylingOptions;

  /**
   * Custom renderer for `type === 'custom'` or to fully override a built-in.
   * Receives a `D3ChartContext`; all drawing should target `context.g`.
   * May return a cleanup function (e.g. to stop a force simulation).
   */
  customRenderer?: D3CustomRenderer;

  /**
   * Tooltip HTML builder for built-in chart types.
   * Receives the hovered datum and should return an HTML string.
   * When omitted a default `key: value` tooltip is shown.
   */
  tooltipFormatter?: (datum: D3DataPoint) => string;
}
