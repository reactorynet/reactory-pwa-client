import React from 'react';
import { Paper, Typography } from '@mui/material';

interface ChartTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number | string; color?: string }[];
  label?: string;
  /** Optional value formatter. Receives (value, name) and should return the display string. */
  formatter?: (value: number | string, name: string) => string;
}

/**
 * A shared styled tooltip component for use across all Reactory chart types.
 * Passes through Recharts' standard content-prop shape.
 */
const ChartTooltip: React.FC<ChartTooltipProps> = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;

  return (
    <Paper square variant="outlined" sx={{ p: 1, minWidth: 120 }}>
      {label && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          {label}
        </Typography>
      )}
      {payload.map((item, idx) => (
        <Typography key={idx} variant="body2" sx={{ color: item.color ?? 'text.primary' }}>
          {`${item.name}: ${formatter ? formatter(item.value, item.name) : item.value}`}
        </Typography>
      ))}
    </Paper>
  );
};

export default ChartTooltip;
