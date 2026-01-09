/**
 * QuickFilters Component
 * 
 * Quick filter chips for common user filters
 * 
 * @module UserList/components/Filters/QuickFilters
 */

import React from 'react';
import { Box, Chip, useTheme } from '@mui/material';
import { Check } from '@mui/icons-material';
import type { QuickFilter } from '../../types';
import { getUserListStyles } from '../../styles/userList.styles';

export interface QuickFiltersProps {
  filters: QuickFilter[];
  activeFilters: Set<string>;
  onToggle: (filterId: string) => void;
}

export const QuickFilters: React.FC<QuickFiltersProps> = ({
  filters,
  activeFilters,
  onToggle,
}) => {
  const theme = useTheme();
  const styles = getUserListStyles(theme);

  if (!filters || filters.length === 0) {
    return null;
  }

  return (
    <Box 
      sx={styles.filterChips} 
      role="group" 
      aria-label="Quick filters"
    >
      {filters.map((filter) => {
        const isActive = activeFilters.has(filter.id);

        return (
          <Chip
            key={filter.id}
            label={filter.label}
            onClick={() => onToggle(filter.id)}
            color={isActive ? 'primary' : 'default'}
            variant={isActive ? 'filled' : 'outlined'}
            icon={isActive ? <Check /> : undefined}
            clickable
            aria-pressed={isActive}
            aria-label={`${filter.label} filter ${isActive ? 'active' : 'inactive'}`}
          />
        );
      })}
    </Box>
  );
};

export default QuickFilters;

