/**
 * Shared type definitions for Reactory Chart components.
 * These types use semantically clear property names designed for
 * direct consumption outside of the ReactoryForm engine.
 */

export interface ChartDataPoint {
  [key: string]: string | number | undefined;
}

export interface BarSeriesConfig {
  /** The key in each data point to use as the bar value */
  dataKey: string;
  /** Display name shown in legend and tooltip */
  name?: string;
  /** Fill colour for the bar */
  fill?: string;
  /** Stack identifier — bars sharing the same stackId are stacked */
  stackId?: string;
  /** Recharts bar radius */
  radius?: number | [number, number, number, number];
  [key: string]: unknown;
}

export interface LineSeriesConfig {
  /** The key in each data point to use as the line value */
  dataKey: string;
  /** Display name shown in legend and tooltip */
  name?: string;
  /** Stroke colour */
  stroke?: string;
  /** Interpolation type */
  type?: 'basis' | 'linear' | 'monotone' | 'natural' | 'step' | 'stepAfter' | 'stepBefore';
  /** Whether to show dots on data points */
  dot?: boolean | object;
  /** Whether the line is dashed */
  strokeDasharray?: string;
  [key: string]: unknown;
}

export interface AreaSeriesConfig {
  /** The key in each data point to use as the area value */
  dataKey: string;
  /** Display name shown in legend and tooltip */
  name?: string;
  /** Fill colour for the area */
  fill?: string;
  /** Stroke colour */
  stroke?: string;
  /** Interpolation type */
  type?: 'basis' | 'linear' | 'monotone' | 'natural' | 'step';
  /** Fill opacity (0–1) */
  fillOpacity?: number;
  [key: string]: unknown;
}

export interface PieSliceEntry {
  /** Label for this slice — used in legend and tooltip */
  name: string;
  /** Numeric value that determines the arc size */
  value: number;
  /** Optional explicit fill colour for this slice */
  fill?: string;
  [key: string]: unknown;
}

export interface FunnelStageEntry {
  /** Label for this stage */
  name: string;
  /** Numeric value that determines the segment width */
  value: number;
  /** Optional explicit fill colour */
  fill?: string;
  [key: string]: unknown;
}

/** Common sizing properties shared across all chart components */
export interface ChartDimensions {
  /** Chart height in pixels. Defaults to 300. */
  height?: number;
  /** Chart width — can be a pixel value or a CSS percentage string. Defaults to "100%". */
  width?: number | string;
}

/**
 * Optional styling overrides that can be applied to any shared Chart component.
 * These props are separate from data and layout configuration so that visual
 * adjustments can be made without touching the data model.
 */
export interface ChartStylingOptions {
  /**
   * MUI `sx` prop applied to the outer `Box` wrapper.
   * Use this to control padding, background colour, border, shadow, etc.
   * e.g. `{ p: 2, bgcolor: 'background.paper', borderRadius: 2 }`
   */
  containerSx?: object;
  /**
   * MUI Typography variant for the chart title.
   * @default "h6"
   */
  titleVariant?: 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2' | 'body1' | 'body2';
  /**
   * MUI Typography variant for the description subtitle.
   * @default "subtitle2"
   */
  descriptionVariant?: 'subtitle1' | 'subtitle2' | 'body1' | 'body2' | 'caption';
  /**
   * Recharts chart margin applied inside the SVG canvas.
   * Useful to prevent axis labels being clipped.
   */
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  /**
   * Recharts animation duration in milliseconds.
   * Set to `0` to disable all animations.
   * @default 400
   */
  animationDuration?: number;
  /**
   * Stroke colour for CartesianGrid lines.
   * Accepts any CSS colour value (hex, rgb, named).
   * @default "#e0e0e0"
   */
  gridColor?: string;
  /**
   * `strokeDasharray` pattern for CartesianGrid lines.
   * Use `"3 3"` for a standard dashed grid, `"0"` for solid lines.
   * @default "3 3"
   */
  gridDasharray?: string;
  /**
   * Font size in px applied to all axis tick labels.
   * @default 12
   */
  axisFontSize?: number;
  /**
   * CSS colour applied to all axis tick labels and axis lines.
   * Accepts any CSS colour value.
   */
  axisColor?: string;
  /**
   * Corner radius applied to all bar segments.
   * Supply a single number for uniform rounding, or `[topLeft, topRight, bottomRight, bottomLeft]`.
   * @default 0
   */
  barRadius?: number | [number, number, number, number];
  /**
   * Opacity applied to all bar segments (0 = transparent, 1 = opaque).
   * @default 1
   */
  barOpacity?: number;
  /**
   * Stroke width in px applied to all line series.
   * @default 2
   */
  lineStrokeWidth?: number;
  /**
   * Whether to render a dot at each data point on line series.
   * @default false
   */
  showDots?: boolean;
  /**
   * Dot radius in px when `showDots` is true.
   * @default 4
   */
  dotRadius?: number;
  /**
   * SVG `strokeDasharray` pattern applied to all line series to create dashes.
   * e.g. `"5 5"` (dash-gap), `"8 3 2 3"` (dash-dot).
   * Leave unset for solid lines.
   */
  lineDasharray?: string;
  /**
   * Fill opacity applied to all area series (0–1).
   * @default 0.6
   */
  areaFillOpacity?: number;
  /**
   * Inner radius in px for pie charts. Values > 0 produce a donut chart.
   * Overridden by the top-level `innerRadius` prop if both are set.
   * @default 0
   */
  pieInnerRadius?: number;
  /**
   * Outer radius in px for pie charts.
   * Overridden by the top-level `outerRadius` prop if both are set.
   * Defaults to `height / 2 - 20`.
   */
  pieOuterRadius?: number;
  /**
   * Label position for funnel chart stage labels.
   * @default "right"
   */
  funnelLabelPosition?: 'right' | 'left' | 'inside' | 'insideTop' | 'insideBottom';
}
