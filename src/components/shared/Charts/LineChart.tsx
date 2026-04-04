import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import ChartTooltip from './ChartTooltip';
import type { LineSeriesConfig, ChartDataPoint, ChartDimensions } from './ChartTypes';

export interface LineChartProps extends ChartDimensions {
  /** Array of data objects. Each object maps category/axis keys to values. */
  data: ChartDataPoint[];
  /**
   * The key in each data object used to label the x-axis categories.
   * @default "name"
   */
  xAxisKey?: string;
  /**
   * One or more line series to render. Each entry describes a line with its own
   * `dataKey`, optional `name`, `stroke`, interpolation `type`, and dot behaviour.
   * Defaults to a single monotone line using dataKey "value".
   */
  series?: LineSeriesConfig[];
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

const DEFAULT_SERIES: LineSeriesConfig[] = [
  { dataKey: 'value', stroke: '#4e79a7', type: 'monotone' },
];

const DEFAULT_DATA: ChartDataPoint[] = [
  { name: 'A', value: 0 },
  { name: 'B', value: 0 },
  { name: 'C', value: 0 },
];

/**
 * A standalone Line Chart component backed by Recharts.
 *
 * Unlike the ReactoryForm `LineChartWidget`, this component accepts data and
 * configuration through clearly named props rather than via `formData` or
 * uiSchema options. It supports multiple line series, custom interpolation,
 * and is suitable for time-series, trend, and comparison views.
 *
 * **Registration**: `core.LineChart@1.0.0`
 */
const LineChart: React.FC<LineChartProps> = ({
  data,
  xAxisKey = 'name',
  series = DEFAULT_SERIES,
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
        <RechartsLineChart data={chartData}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xAxisKey} {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip content={<ChartTooltip formatter={tooltipFormatter} />} />
          {showLegend && <Legend />}
          {series.map((seriesConfig, idx) => (
            <Line key={`line-${idx}`} {...seriesConfig} />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export const LineChartComponentDefinition: Reactory.IReactoryComponentDefinition<typeof LineChart> = {
  nameSpace: 'core',
  name: 'LineChart',
  version: '1.0.0',
  component: LineChart,
  description:
    'A standalone responsive line chart built on Recharts. Accepts data as an array of ' +
    'plain objects and supports multiple named series through the `series` prop. ' +
    'Configurable interpolation types (monotone, linear, step, etc.), optional dots, ' +
    'legend, and grid. Ideal for time-series, trend analysis, and comparison views.',
  tags: ['chart', 'visualization', 'data', 'line', 'time-series', 'recharts', 'shared'],
};

export default LineChart;
