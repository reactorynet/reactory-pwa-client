import { useState, useCallback, useMemo } from 'react';

export interface AdvancedFilterField {
  id: string;
  label: string;
  field: string;
  type: 'select' | 'multi-select' | 'date-range' | 'text' | 'number' | 'boolean';
  options?: Array<{ label: string; value: any }>;
  placeholder?: string;
  defaultValue?: any;
}

export interface AdvancedFilter {
  field: string;
  value: any;
  operator: string;
  label?: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: AdvancedFilter[];
  createdAt: Date;
}

export interface UseAdvancedFiltersOptions {
  fields: AdvancedFilterField[];
  onFilterChange?: (filters: AdvancedFilter[]) => void;
}

export interface UseAdvancedFiltersResult {
  filters: AdvancedFilter[];
  setFilter: (field: string, value: any, operator?: string) => void;
  removeFilter: (field: string) => void;
  clearFilters: () => void;
  applyFilters: (data: any[]) => any[];
  activeFilterCount: number;
  // Preset management
  presets: FilterPreset[];
  savePreset: (name: string) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
}

/**
 * Hook for managing advanced filters with preset functionality
 * 
 * @param options - Configuration options for advanced filters
 * @returns Advanced filter state and methods
 * 
 * @example
 * const { filters, setFilter, applyFilters, savePreset } = useAdvancedFilters({
 *   fields: advancedFilterFields,
 *   onFilterChange: (filters) => console.log(filters)
 * });
 */
export const useAdvancedFilters = ({
  fields,
  onFilterChange,
}: UseAdvancedFiltersOptions): UseAdvancedFiltersResult => {
  const [filters, setFilters] = useState<AdvancedFilter[]>([]);
  const [presets, setPresets] = useState<FilterPreset[]>([]);

  const setFilter = useCallback(
    (field: string, value: any, operator: string = 'eq') => {
      setFilters((prev) => {
        const fieldDef = fields.find((f) => f.field === field);
        const existingIndex = prev.findIndex((f) => f.field === field);

        // If value is empty/null, remove the filter
        if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
          if (existingIndex >= 0) {
            const newFilters = [...prev];
            newFilters.splice(existingIndex, 1);
            onFilterChange?.(newFilters);
            return newFilters;
          }
          return prev;
        }

        const newFilter: AdvancedFilter = {
          field,
          value,
          operator,
          label: fieldDef?.label || field,
        };

        const newFilters = existingIndex >= 0 
          ? prev.map((f, i) => (i === existingIndex ? newFilter : f))
          : [...prev, newFilter];

        onFilterChange?.(newFilters);
        return newFilters;
      });
    },
    [fields, onFilterChange]
  );

  const removeFilter = useCallback(
    (field: string) => {
      setFilters((prev) => {
        const newFilters = prev.filter((f) => f.field !== field);
        onFilterChange?.(newFilters);
        return newFilters;
      });
    },
    [onFilterChange]
  );

  const clearFilters = useCallback(() => {
    setFilters([]);
    onFilterChange?.([]);
  }, [onFilterChange]);

  const applyFilters = useCallback(
    (data: any[]) => {
      if (filters.length === 0) {
        return data;
      }

      return data.filter((item) => {
        return filters.every((filter) => {
          const fieldValue = filter.field.split('.').reduce((obj, key) => obj?.[key], item);

          switch (filter.operator) {
            case 'eq':
              return fieldValue === filter.value;
            case 'ne':
              return fieldValue !== filter.value;
            case 'gt':
              return fieldValue > filter.value;
            case 'gte':
              return fieldValue >= filter.value;
            case 'lt':
              return fieldValue < filter.value;
            case 'lte':
              return fieldValue <= filter.value;
            case 'in':
              return Array.isArray(filter.value) && filter.value.includes(fieldValue);
            case 'not-in':
              return Array.isArray(filter.value) && !filter.value.includes(fieldValue);
            case 'contains':
              return (
                typeof fieldValue === 'string' &&
                typeof filter.value === 'string' &&
                fieldValue.toLowerCase().includes(filter.value.toLowerCase())
              );
            case 'starts-with':
              return (
                typeof fieldValue === 'string' &&
                typeof filter.value === 'string' &&
                fieldValue.toLowerCase().startsWith(filter.value.toLowerCase())
              );
            case 'ends-with':
              return (
                typeof fieldValue === 'string' &&
                typeof filter.value === 'string' &&
                fieldValue.toLowerCase().endsWith(filter.value.toLowerCase())
              );
            case 'between':
              if (Array.isArray(filter.value) && filter.value.length === 2) {
                return fieldValue >= filter.value[0] && fieldValue <= filter.value[1];
              }
              return false;
            case 'is-null':
              return fieldValue === null || fieldValue === undefined;
            case 'is-not-null':
              return fieldValue !== null && fieldValue !== undefined;
            default:
              return true;
          }
        });
      });
    },
    [filters]
  );

  const activeFilterCount = useMemo(() => filters.length, [filters]);

  const savePreset = useCallback(
    (name: string) => {
      if (filters.length === 0) return;

      const newPreset: FilterPreset = {
        id: `preset-${Date.now()}`,
        name,
        filters: [...filters],
        createdAt: new Date(),
      };

      setPresets((prev) => [...prev, newPreset]);
    },
    [filters]
  );

  const loadPreset = useCallback(
    (presetId: string) => {
      const preset = presets.find((p) => p.id === presetId);
      if (preset) {
        setFilters(preset.filters);
        onFilterChange?.(preset.filters);
      }
    },
    [presets, onFilterChange]
  );

  const deletePreset = useCallback((presetId: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
  }, []);

  return {
    filters,
    setFilter,
    removeFilter,
    clearFilters,
    applyFilters,
    activeFilterCount,
    presets,
    savePreset,
    loadPreset,
    deletePreset,
  };
};
