/**
 * AdvancedFilters Component
 * 
 * Advanced filter panel with field, operator, and value inputs
 * 
 * @module UserList/components/Filters/AdvancedFilters
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  useTheme,
  Stack,
} from '@mui/material';
import {
  FilterList,
  Close,
  Add,
} from '@mui/icons-material';
import type { AdvancedFilter, AdvancedFilterField, FilterOperator } from '../../types';
import { getUserListStyles } from '../../styles/userList.styles';

export interface AdvancedFiltersProps {
  fields: AdvancedFilterField[];
  filters: AdvancedFilter[];
  onChange: (filters: AdvancedFilter[]) => void;
  onApply?: (filters: AdvancedFilter[]) => void;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  fields,
  filters,
  onChange,
  onApply,
}) => {
  const theme = useTheme();
  const styles = getUserListStyles(theme);

  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<AdvancedFilter[]>(filters);

  const handleOpen = () => {
    setLocalFilters(filters);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleApply = () => {
    onChange(localFilters);
    if (onApply) {
      onApply(localFilters);
    }
    setOpen(false);
  };

  const handleClear = () => {
    const cleared: AdvancedFilter[] = [];
    setLocalFilters(cleared);
    onChange(cleared);
    if (onApply) {
      onApply(cleared);
    }
  };

  const handleAddFilter = () => {
    if (fields.length === 0) return;

    const newFilter: AdvancedFilter = {
      id: `filter-${Date.now()}`,
      field: fields[0].field,
      operator: fields[0].operators[0],
      value: '',
    };

    setLocalFilters([...localFilters, newFilter]);
  };

  const handleRemoveFilter = (filterId: string) => {
    setLocalFilters(localFilters.filter((f) => f.id !== filterId));
  };

  const handleFilterChange = (
    filterId: string,
    updates: Partial<AdvancedFilter>
  ) => {
    setLocalFilters(
      localFilters.map((f) =>
        f.id === filterId ? { ...f, ...updates } : f
      )
    );
  };

  const getFieldConfig = (fieldName: string): AdvancedFilterField | undefined => {
    return fields.find((f) => f.field === fieldName);
  };

  const renderFilterRow = (filter: AdvancedFilter) => {
    const fieldConfig = getFieldConfig(filter.field);
    if (!fieldConfig) return null;

    return (
      <Box
        key={filter.id}
        sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          mb: 2,
        }}
      >
        {/* Field selector */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Field</InputLabel>
          <Select
            value={filter.field}
            label="Field"
            onChange={(e) =>
              handleFilterChange(filter.id, {
                field: e.target.value,
                operator: getFieldConfig(e.target.value)?.operators[0] || 'eq',
              })
            }
          >
            {fields.map((field) => (
              <MenuItem key={field.field} value={field.field}>
                {field.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Operator selector */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Operator</InputLabel>
          <Select
            value={filter.operator}
            label="Operator"
            onChange={(e) =>
              handleFilterChange(filter.id, {
                operator: e.target.value as FilterOperator,
              })
            }
          >
            {fieldConfig.operators.map((op) => (
              <MenuItem key={op} value={op}>
                {op}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Value input */}
        {filter.operator !== 'is-null' && filter.operator !== 'is-not-null' && (
          <TextField
            size="small"
            label="Value"
            value={filter.value as string}
            onChange={(e) =>
              handleFilterChange(filter.id, { value: e.target.value })
            }
            type={fieldConfig.type === 'number' || fieldConfig.type === 'string' ? 'text' : 'text'}
            sx={{ flex: 1 }}
          />
        )}

        {/* Remove button */}
        <IconButton
          size="small"
          onClick={() => handleRemoveFilter(filter.id)}
          aria-label="Remove filter"
        >
          <Close />
        </IconButton>
      </Box>
    );
  };

  // Render active filter chips
  const renderActiveChips = () => {
    if (filters.length === 0) return null;

    return (
      <Box sx={styles.filterChips}>
        {filters.map((filter) => {
          const fieldConfig = getFieldConfig(filter.field);
          const label = `${fieldConfig?.label || filter.field} ${filter.operator} ${filter.value}`;

          return (
            <Chip
              key={filter.id}
              label={label}
              onDelete={() => {
                const updated = filters.filter((f) => f.id !== filter.id);
                onChange(updated);
              }}
              color="primary"
              variant="outlined"
              size="small"
            />
          );
        })}
        <Button
          size="small"
          onClick={handleClear}
          startIcon={<Close />}
        >
          Clear All
        </Button>
      </Box>
    );
  };

  return (
    <>
      {/* Trigger button */}
      <Button
        startIcon={<FilterList />}
        onClick={handleOpen}
        variant={filters.length > 0 ? 'contained' : 'outlined'}
        size="small"
      >
        Filters {filters.length > 0 && `(${filters.length})`}
      </Button>

      {/* Active filter chips */}
      {renderActiveChips()}

      {/* Filter dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        aria-labelledby="advanced-filters-dialog"
      >
        <DialogTitle id="advanced-filters-dialog">
          Advanced Filters
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {localFilters.map((filter) => renderFilterRow(filter))}

            {localFilters.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                No filters added. Click "Add Filter" to start.
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button
            startIcon={<Add />}
            onClick={handleAddFilter}
            disabled={fields.length === 0}
          >
            Add Filter
          </Button>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleClear} color="error">
              Clear All
            </Button>
            <Button onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleApply} variant="contained">
              Apply
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AdvancedFilters;

