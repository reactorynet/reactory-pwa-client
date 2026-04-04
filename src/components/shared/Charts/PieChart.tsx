import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import ChartTooltip from './ChartTooltip';
import type { PieSliceEntry, ChartDimensions } from './ChartTypes';

/** Default colour palette used when slice-level colours are not specified */
const DEFAULT_COLORS = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2',
  '#59a14f', '#edc948', '#b07aa1', '#ff9da7',
  '#9c755f', '#bab0ac',
];

export interface PieChartProps extends ChartDimensions {
  /**
   * Array of slice definitions. Each entry must have at least `name` and `value`.
   * An optional per-slice `fill` colour overrides the palette.
   */
  data: PieSliceEntry[];
  /**
   * The key in each data object whose value is used to determine arc size.
   * @default "value"
   */
  dataKey?: string;
  /**
   * The key in each data object used as the slice label in the legend and tooltip.
   * @default "name"
   */
  nameKey?: string;
  /**
   * Colour palette applied to slices in order. Individual slice `fill` values
   * take precedence over palette colours.
   * @default DEFAULT_COLORS
   */
  colors?: string[];
  /**
   * Inner radius in pixels. Set > 0 to render a donut chart.
   * @default 0
   */
  innerRadius?: number;
  /**
   * Outer radius in pixels. Defaults to ~80% of half the chart height.
   */
  outerRadius?: number;
  /** Optional chart title rendered above the chart */
  title?: string;
  /** Optional descriptive subtitle rendered below the title */
  description?: string;
  /** Show the recharts Legend. @default true */
  showLegend?: boolean;
  /**
   * Optional value formatter used in the tooltip.
   * Receives (value, sliceName) and should return a display string.
   */
  tooltipFormatter?: (value: number | string, name: string) => string;
}

/**
 * A standalone Pie / Donut Chart component backed by Recharts.
 *
 * Unlike the ReactoryForm `PieChartWidget`, this component accepts data and
 * configuration through clearly named props rather than via `formData` or
 * uiSchema options. Setting `innerRadius > 0` renders a donut chart.
 *
 * **Registration**: `core.PieChart@1.0.0`
 */
const PieChart: React.FC<PieChartProps> = ({
  data,
  dataKey = 'value',
  nameKey = 'name',
  colors = DEFAULT_COLORS,
  innerRadius = 0,
  outerRadius,
  title,
  description,
  height = 300,
  width = '100%',
  showLegend = true,
  tooltipFormatter,
}) => {
  const derivedOuterRadius = outerRadius ?? Math.floor(height / 2) - 20;

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
        <RechartsPieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={derivedOuterRadius}
          >
            {data.map((entry, idx) => (
              <Cell
                key={`slice-${idx}`}
                fill={entry.fill ?? colors[idx % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip formatter={tooltipFormatter} />} />
          {showLegend && <Legend />}
        </RechartsPieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export const PieChartComponentDefinition: Reactory.IReactoryComponentDefinition<typeof PieChart> = {
  nameSpace: 'core',
  name: 'PieChart',
  version: '1.0.0',
  component: PieChart,
  description:
    'A standalone responsive pie and donut chart built on Recharts. ' +
    'Accepts an array of { name, value } slice objects and an optional colour palette. ' +
    'Setting innerRadius > 0 converts the chart to a donut. Per-slice fill colours ' +
    'override the palette. Suitable for proportion, composition, and part-of-whole views.',
  tags: ['chart', 'visualization', 'data', 'pie', 'donut', 'composition', 'recharts', 'shared'],
};

export default PieChart;
