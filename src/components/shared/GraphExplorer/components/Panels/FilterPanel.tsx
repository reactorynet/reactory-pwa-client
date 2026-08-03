import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { GraphFilters, GraphLinkType, GraphNodeType } from '../../types';

const FILTERABLE_NODE_TYPES: GraphNodeType[] = ['SYSTEM', 'FOLDER', 'FILE', 'FUNCTION', 'PROCESS', 'DATASTORE'];
const FILTERABLE_LINK_TYPES: GraphLinkType[] = ['CONTAINS', 'DEPENDENCY', 'CALL', 'INHERITS', 'IMPLEMENTS', 'SYMLINK', 'REFERENCE'];

export interface FilterPanelProps {
  filters: GraphFilters;
  onChange(filters: Partial<GraphFilters>): void;
}

/** Toggle chips: no active set = show everything. */
export default function FilterPanel(props: FilterPanelProps) {
  const { filters, onChange } = props;

  const toggle = <T,>(current: Set<T> | null, value: T, all: T[]): Set<T> | null => {
    const active = current ?? new Set(all);
    const next = new Set(active);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    // Everything selected again -> clear the filter entirely.
    return next.size === all.length ? null : next;
  };

  return (
    <Box sx={{ px: 2, py: 1 }}>
      <Typography variant="overline">Node types</Typography>
      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
        {FILTERABLE_NODE_TYPES.map((type) => {
          const active = !filters.nodeTypes || filters.nodeTypes.has(type);
          return (
            <Chip
              key={type}
              label={type.toLowerCase()}
              size="small"
              variant={active ? 'filled' : 'outlined'}
              onClick={() =>
                onChange({ nodeTypes: toggle(filters.nodeTypes, type, FILTERABLE_NODE_TYPES) })
              }
            />
          );
        })}
      </Stack>
      <Typography variant="overline">Edge types</Typography>
      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
        {FILTERABLE_LINK_TYPES.map((type) => {
          const active = !filters.linkTypes || filters.linkTypes.has(type);
          return (
            <Chip
              key={type}
              label={type.toLowerCase()}
              size="small"
              variant={active ? 'filled' : 'outlined'}
              onClick={() =>
                onChange({ linkTypes: toggle(filters.linkTypes, type, FILTERABLE_LINK_TYPES) })
              }
            />
          );
        })}
      </Stack>
    </Box>
  );
}
