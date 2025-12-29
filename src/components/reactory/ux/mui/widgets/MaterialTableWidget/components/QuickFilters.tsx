import React from 'react';
import { Box, Button, Chip, Badge, Icon } from '@mui/material';
import { useQuickFilters, QuickFilterDefinition } from '../hooks/useQuickFilters';

export interface QuickFiltersProps {
  filters: QuickFilterDefinition[];
  onFilterChange: (activeFilters: string[]) => void;
  variant?: 'buttons' | 'chips';
  multiSelect?: boolean;
  showClearButton?: boolean;
}

/**
 * QuickFilters Component
 * 
 * Displays quick filter buttons or chips for fast data filtering
 * 
 * @example
 * <QuickFilters
 *   filters={quickFilterDefs}
 *   onFilterChange={(filters) => console.log(filters)}
 *   variant="buttons"
 *   multiSelect={false}
 * />
 */
export const QuickFilters: React.FC<QuickFiltersProps> = ({
  filters,
  onFilterChange,
  variant = 'buttons',
  multiSelect = false,
  showClearButton = true,
}) => {
  const { activeFilters, toggleFilter, clearFilters, isActive } = useQuickFilters({
    filters,
    multiSelect,
    onFilterChange,
  });

  const hasActiveFilters = activeFilters.length > 0;

  if (variant === 'chips') {
    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {filters.map((filter) => {
          const active = isActive(filter.id);
          const hasBadge = filter.badge !== undefined && filter.badge !== null;

          return (
            <Badge
              key={filter.id}
              badgeContent={hasBadge ? filter.badge : undefined}
              color={filter.color || 'primary'}
              max={999}
            >
              <Chip
                label={filter.label}
                icon={filter.icon ? <Icon>{filter.icon}</Icon> : undefined}
                onClick={() => toggleFilter(filter.id)}
                color={active ? (filter.color as any || 'primary') : 'default'}
                variant={active ? 'filled' : 'outlined'}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: 1,
                  },
                }}
              />
            </Badge>
          );
        })}
        {showClearButton && hasActiveFilters && (
          <Chip
            label="Clear Filters"
            icon={<Icon>clear</Icon>}
            onClick={clearFilters}
            color="default"
            variant="outlined"
            sx={{ cursor: 'pointer' }}
          />
        )}
      </Box>
    );
  }

  // Button variant
  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
      {filters.map((filter) => {
        const active = isActive(filter.id);
        const hasBadge = filter.badge !== undefined && filter.badge !== null;

        return (
          <Badge
            key={filter.id}
            badgeContent={hasBadge ? filter.badge : undefined}
            color={filter.color || 'primary'}
            max={999}
          >
            <Button
              variant={active ? 'contained' : 'outlined'}
              color={filter.color as any || 'primary'}
              startIcon={filter.icon ? <Icon>{filter.icon}</Icon> : undefined}
              onClick={() => toggleFilter(filter.id)}
              size="small"
              sx={{
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: 2,
                },
              }}
            >
              {filter.label}
            </Button>
          </Badge>
        );
      })}
      {showClearButton && hasActiveFilters && (
        <Button
          variant="outlined"
          color="primary"
          startIcon={<Icon>clear</Icon>}
          onClick={clearFilters}
          size="small"
        >
          Clear Filters
        </Button>
      )}
    </Box>
  );
};
