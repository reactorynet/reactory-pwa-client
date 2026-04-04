import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  ComposedChart as RechartsComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import ChartTooltip from './ChartTooltip';
import type {
  AreaSeriesConfig,
  BarSeriesConfig,
  LineSeriesConfig,
  ChartDataPoint,
  ChartDimensions,
} from './ChartTypes';

export interface ComposedChartProps extends ChartDimensions {
  /** Array of data objects. Each object maps category/axis keys to values. */
  data: ChartDataPoint[];
  /**
   * The key in each data object used to label the x-axis categories.
   * @default "name"
   */
  xAxisKey?: string;
  /**
   * Area series layers to render beneath the other series.
   * Each entry describes a filled area with its own `dataKey`, colour, and interpolation.
   */
  areas?: AreaSeriesConfig[];
  /**
   * Bar series layers to render.
   * Each entry describes a bar layer with its own `dataKey`, fill, and stacking behaviour.
   */
  bars?: BarSeriesConfig[];
  /**
   * Line series layers to render on top.
   * Each entry describes a line with its own `dataKey`, stroke, and interpolation `type`.
   */
  lines?: LineSeriesConfig[];
  /** Optional chart title rendered above the chart */
  title?: string;
  /** Optional descriptive subtitle rendered below the title */
  description?: string;
  /** Show the recharts Legend. @default true */
  showLegend?: boolean;
  /** Show the CartesianGrid. @default true */
  showGrid?: boolean;
  /** Extra props passed directly to the Recharts XAxis */
  xAxisProps?: object;
  /** Extra props passed directly to the Recharts YAxis */
  yAxisProps?: object;
  /**
   * Optional value formatter used in the tooltip.
   * Receives (value, seriesName) and should return a display string.
   */
  tooltipFormatter?: (value: number | string, name: string) => string;
}

const DEFAULT_DATA: ChartDataPoint[] = [
  { name: 'A', area: 0, bar: 0, line: 0 },
  { name: 'B', area: 0, bar: 0, line: 0 },
  { name: 'C', area: 0, bar: 0, line: 0 },
];

/**
 * A standalone Composed Chart component backed by Recharts.
 *
 * Renders any combination of Area, Bar, and Line series within a single chart.
 * Unlike the ReactoryForm `ComposedChartWidget`, props are explicitly named
 * (`areas`, `bars`, `lines`) rather than nested inside `formData` or uiSchema.
 *
 * **Registration**: `core.ComposedChart@1.0.0`
 */
const ComposedChart: React.FC<ComposedChartProps> = ({
  data,
  xAxisKey = 'name',
  areas = [],
  bars = [],
  lines = [],
  title,
  description,
  height = 300,
  width = '100%',
  showLegend = true,
  showGrid = true,
  xAxisProps,
  yAxisProps,
  tooltipFormatter,
}) => {
  const chartData = data?.length ? data : DEFAULT_DATA;

  return (
    <Box>
      {title && (
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          {title}
        </Typography>
      )}
      {description && (
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
          {description}
        </Typography>
      )}
      <ResponsiveContainer width={width} height={height}>
        <RechartsComposedChart data={chartData}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xAxisKey} {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip content={<ChartTooltip formatter={tooltipFormatter} />} />
          {showLegend && <Legend />}
          {areas.map((areaConfig, idx) => (
            <Area key={`area-${idx}`} {...areaConfig} />
          ))}
          {bars.map((barConfig, idx) => (
            <Bar key={`bar-${idx}`} {...barConfig} />
          ))}
          {lines.map((lineConfig, idx) => (
            <Line key={`line-${idx}`} {...lineConfig} />
          ))}
        </RechartsComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};

export const ComposedChartComponentDefinition: Reactory.IReactoryComponentDefinition<typeof ComposedChart> = {
  nameSpace: 'core',
  name: 'ComposedChart',
  version: '1.0.0',
  component: ComposedChart,
  description:
    'A standalone responsive composed chart built on Recharts that can render ' +
    'Area, Bar, and Line series side-by-side in a single chart canvas. ' +
    'Each series type is passed through its own named prop array (`areas`, `bars`, `lines`), ' +
    'making the composition explicit and easy to configure from application code. ' +
    'Ideal for dashboards that need to compare volume (bars), distribution (areas), ' +
    'and trend (lines) in a unified view.',
  tags: ['chart', 'visualization', 'data', 'composed', 'area', 'bar', 'line', 'recharts', 'shared'],
};

export default ComposedChart;
