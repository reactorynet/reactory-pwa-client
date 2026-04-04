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
