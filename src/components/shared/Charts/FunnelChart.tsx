import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  FunnelChart as RechartsFunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ChartTooltip from './ChartTooltip';
import type { FunnelStageEntry, ChartDimensions } from './ChartTypes';

/** Default fill colours applied to funnel stages in order */
const DEFAULT_COLORS = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
];

export interface FunnelChartProps extends ChartDimensions {
  /**
   * Array of funnel stage definitions. Each entry must have at least `name` and `value`.
   * Stages should be ordered from widest (largest value) to narrowest.
   * An optional per-stage `fill` colour overrides the default palette.
   */
  data: FunnelStageEntry[];
  /**
   * The key in each data object used as the numeric segment width.
   * @default "value"
   */
  dataKey?: string;
  /**
   * The key in each data object used as the stage label.
   * @default "name"
   */
  nameKey?: string;
  /**
   * Whether to display labels beside each funnel segment.
   * @default true
   */
  showLabels?: boolean;
  /**
   * Colour palette applied to stages in order. Individual stage `fill` values
   * take precedence over palette colours.
   * @default DEFAULT_COLORS
   */
  colors?: string[];
  /** Optional chart title rendered above the chart */
  title?: string;
  /** Optional descriptive subtitle rendered below the title */
  description?: string;
  /**
   * Optional value formatter used in the tooltip.
   * Receives (value, stageName) and should return a display string.
   */
  tooltipFormatter?: (value: number | string, name: string) => string;
}

/**
 * A standalone Funnel Chart component backed by Recharts.
 *
 * Unlike the ReactoryForm `FunnelChartWidget`, this component accepts data and
 * configuration through clearly named props rather than via `formData` or
 * uiSchema options. Suitable for conversion funnels, pipeline stage views,
 * and any sequential-reduction visualisation.
 *
 * **Registration**: `core.FunnelChart@1.0.0`
 */
const FunnelChart: React.FC<FunnelChartProps> = ({
  data,
  dataKey = 'value',
  nameKey = 'name',
  showLabels = true,
  colors = DEFAULT_COLORS,
  title,
  description,
  height = 300,
  width = '100%',
  tooltipFormatter,
}) => {
  // Attach colours to each stage entry so Recharts Cell props can be omitted
  const coloredData = data?.map((entry, idx) => ({
    ...entry,
    fill: entry.fill ?? colors[idx % colors.length],
  }));

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
        <RechartsFunnelChart>
          <Tooltip content={<ChartTooltip formatter={tooltipFormatter} />} />
          <Funnel dataKey={dataKey} data={coloredData} isAnimationActive>
            {showLabels && (
              <LabelList position="right" fill="#000" stroke="none" dataKey={nameKey} />
            )}
          </Funnel>
        </RechartsFunnelChart>
      </ResponsiveContainer>
    </Box>
  );
};

export const FunnelChartComponentDefinition: Reactory.IReactoryComponentDefinition<typeof FunnelChart> = {
  nameSpace: 'core',
  name: 'FunnelChart',
  version: '1.0.0',
  component: FunnelChart,
  description:
    'A standalone responsive funnel chart built on Recharts. ' +
    'Accepts an array of stage objects (name, value) ordered from widest to narrowest, ' +
    'representing sequential drop-off across a pipeline or conversion flow. ' +
    'Supports per-stage fill colours, optional stage labels, and custom tooltips. ' +
    'Suitable for sales funnels, onboarding flows, and process step analysis.',
  tags: ['chart', 'visualization', 'data', 'funnel', 'pipeline', 'conversion', 'recharts', 'shared'],
};

export default FunnelChart;
