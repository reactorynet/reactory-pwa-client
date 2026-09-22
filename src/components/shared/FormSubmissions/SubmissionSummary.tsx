import React, { useMemo } from 'react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';

export interface SubmissionSummaryProps {
  /** The submission's form data document. */
  formData?: Record<string, unknown>;
  /** How many fields to show before collapsing into a "+n" chip. */
  maxFields?: number;
  /** Characters to keep per value before truncating. */
  maxValueLength?: number;
}

/**
 * Renders a one line preview of a submission's data for the explorer table.
 *
 * The shape of `formData` is whatever the submitted form produced, so the cell
 * cannot assume any particular field. It shows the first few top level values
 * as chips, which reads well for the flat documents most forms produce and
 * degrades gracefully to a type marker for nested ones.
 */
const SubmissionSummary: React.FC<SubmissionSummaryProps> = ({
  formData,
  maxFields = 4,
  maxValueLength = 28,
}) => {
  const entries = useMemo(() => {
    if (!formData || typeof formData !== 'object') return [];
    return Object.entries(formData).filter(([key]) => key.startsWith('__') === false);
  }, [formData]);

  const describe = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
    if (typeof value === 'object') return '{…}';
    const text = String(value);
    return text.length > maxValueLength ? `${text.substring(0, maxValueLength)}…` : text;
  };

  if (entries.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        No data
      </Typography>
    );
  }

  const shown = entries.slice(0, maxFields);
  const remaining = entries.length - shown.length;

  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'nowrap', overflow: 'hidden' }}>
      {shown.map(([key, value]) => (
        <Tooltip key={key} title={`${key}: ${describe(value)}`}>
          <Chip
            size="small"
            variant="outlined"
            label={`${key}: ${describe(value)}`}
            sx={{ maxWidth: 220 }}
          />
        </Tooltip>
      ))}
      {remaining > 0 && (
        <Chip size="small" label={`+${remaining}`} />
      )}
    </Box>
  );
};

export default SubmissionSummary;
