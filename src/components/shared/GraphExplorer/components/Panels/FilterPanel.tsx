import React from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { ALL_LINK_TYPES, ALL_NODE_TYPES, GraphFilters, GraphLinkType, GraphNodeType } from '../../types';

export interface FilterPanelProps {
  filters: GraphFilters;
  /** Types present in the loaded graph — listed first so the panel stays relevant. */
  presentNodeTypes?: Set<GraphNodeType>;
  presentLinkTypes?: Set<GraphLinkType>;
  onChange(filters: Partial<GraphFilters>): void;
}

/**
 * Toggle chips over the complete type enums: no active set = show everything.
 * Every type is listed (types missing from the chip list used to be hidden
 * silently the moment any chip was toggled).
 */
export default function FilterPanel(props: FilterPanelProps) {
  const { filters, presentNodeTypes, presentLinkTypes, onChange } = props;

  const toggle = <T,>(current: Set<T> | null, value: T, all: T[]): Set<T> | null => {
    const active = current ?? new Set(all);
    const next = new Set(active);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    // Everything selected again -> clear the filter entirely.
    return next.size >= all.length ? null : next;
  };

  const solo = <T,>(value: T): Set<T> => new Set([value]);

  const order = <T,>(all: T[], present?: Set<T>): T[] =>
    present && present.size > 0
      ? [...all.filter((t) => present.has(t)), ...all.filter((t) => !present.has(t))]
      : all;

  const renderChips = <T extends string>(
    all: T[],
    present: Set<T> | undefined,
    current: Set<T> | null,
    key: 'nodeTypes' | 'linkTypes'
  ) =>
    order(all, present).map((type) => {
      const active = !current || current.has(type);
      const inGraph = !present || present.size === 0 || present.has(type);
      return (
        <Chip
          key={type}
          label={type.toLowerCase()}
          size="small"
          variant={active ? 'filled' : 'outlined'}
          sx={{ opacity: inGraph ? 1 : 0.45 }}
          onClick={() => onChange({ [key]: toggle(current, type, all) } as Partial<GraphFilters>)}
          onDoubleClick={() => onChange({ [key]: solo(type) } as Partial<GraphFilters>)}
        />
      );
    });

  const filtering = filters.nodeTypes !== null || filters.linkTypes !== null;

  return (
    <Box sx={{ px: 2, py: 1 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="overline">Node types</Typography>
        {filtering && (
          <Button size="small" onClick={() => onChange({ nodeTypes: null, linkTypes: null })}>
            Clear
          </Button>
        )}
      </Stack>
      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
        {renderChips(ALL_NODE_TYPES, presentNodeTypes, filters.nodeTypes, 'nodeTypes')}
      </Stack>
      <Typography variant="overline">Edge types</Typography>
      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
        {renderChips(ALL_LINK_TYPES, presentLinkTypes, filters.linkTypes, 'linkTypes')}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Click toggles a type; double-click shows only that type.
      </Typography>
    </Box>
  );
}
