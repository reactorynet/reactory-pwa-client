import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import ChartTooltip from './ChartTooltip';
import type { BarSeriesConfig, ChartDataPoint, ChartDimensions } from './ChartTypes';

export interface BarChartProps extends ChartDimensions {
  /** Array of data objects. Each object maps category/axis keys to values. */
  data: ChartDataPoint[];
  /**
   * The key in each data object used to label the x-axis categories.
   * @default "name"
   */
  xAxisKey?: string;
  /**
   * One or more bar series to render. Each entry describes a bar layer with
   * its own `dataKey`, optional `name`, `fill`, and stacking behaviour.
   * Defaults to a single bar using dataKey "value".
   */
  bars?: BarSeriesConfig[];
  /** Optional chart title rendered above the chart */
  title?: string;
  /** Optional descriptive subtitle rendered below the title */
  description?: string;
  /** Show the recharts Legend component. @default true */
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

const DEFAULT_BARS: BarSeriesConfig[] = [{ dataKey: 'value', fill: '#4e79a7' }];

const DEFAULT_DATA: ChartDataPoint[] = [
  { name: 'A', value: 0 },
  { name: 'B', value: 0 },
  { name: 'C', value: 0 },
];

/**
 * A standalone Bar Chart component backed by Recharts.
 *
 * Unlike the ReactoryForm `BarChartWidget`, this component accepts data and
 * configuration through clearly named props rather than via `formData` or
 * uiSchema options. It is suitable for direct use in application screens,
 * dashboard layouts, and other non-form contexts.
 *
 * **Registration**: `core.BarChart@1.0.0`
 */
const BarChart: React.FC<BarChartProps> = ({
  data,
  xAxisKey = 'name',
  bars = DEFAULT_BARS,
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
        <RechartsBarChart data={chartData}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xAxisKey} {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip content={<ChartTooltip formatter={tooltipFormatter} />} />
          {showLegend && <Legend />}
          {bars.map((barConfig, idx) => (
            <Bar key={`bar-${idx}`} {...barConfig} />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export const BarChartComponentDefinition: Reactory.IReactoryComponentDefinition<typeof BarChart> = {
  nameSpace: 'core',
  name: 'BarChart',
  version: '1.0.0',
  component: BarChart,
  description:
    'A standalone responsive bar chart built on Recharts. Accepts data as an array of ' +
    'plain objects and exposes each axis and series through semantically named props. ' +
    'Supports grouped and stacked bar layouts, custom tooltips, optional legend and grid. ' +
    'For use in dashboards, report views, and any non-form context.',
  tags: ['chart', 'visualization', 'data', 'bar', 'recharts', 'shared'],
};

export default BarChart;
