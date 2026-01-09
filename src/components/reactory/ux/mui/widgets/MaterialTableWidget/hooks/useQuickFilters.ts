import { useState, useCallback, useMemo } from 'react';

export interface QuickFilterDefinition {
  id: string;
  label: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'default';
  filter: {
    field: string;
    value: any;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not-in' | 'is-null' | 'is-not-null' | 'contains';
    additionalFilters?: Array<{
      field: string;
      value: any;
      operator: string;
    }>;
  };
  badge?: string | number;
}

export interface UseQuickFiltersOptions {
  filters: QuickFilterDefinition[];
  multiSelect?: boolean;
  onFilterChange?: (activeFilters: string[]) => void;
}

export interface UseQuickFiltersResult {
  activeFilters: string[];
  toggleFilter: (filterId: string) => void;
  clearFilters: () => void;
  isActive: (filterId: string) => boolean;
  applyFilters: (data: any[]) => any[];
}

/**
 * Hook for managing quick filter state and logic
 * 
 * @param options - Configuration options for quick filters
 * @returns Quick filter state and methods
 * 
 * @example
 * const { activeFilters, toggleFilter, applyFilters } = useQuickFilters({
 *   filters: quickFilterDefs,
 *   multiSelect: false,
 *   onFilterChange: (filters) => console.log(filters)
 * });
 */
export const useQuickFilters = ({
  filters,
  multiSelect = false,
  onFilterChange,
}: UseQuickFiltersOptions): UseQuickFiltersResult => {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const toggleFilter = useCallback(
    (filterId: string) => {
      setActiveFilters((prev) => {
        let newFilters: string[];

        if (multiSelect) {
          // Multi-select mode: toggle filter in array
          if (prev.includes(filterId)) {
            newFilters = prev.filter((id) => id !== filterId);
          } else {
            newFilters = [...prev, filterId];
          }
        } else {
          // Single-select mode: replace or clear
          newFilters = prev.includes(filterId) ? [] : [filterId];
        }

        onFilterChange?.(newFilters);
        return newFilters;
      });
    },
    [multiSelect, onFilterChange]
  );

  const clearFilters = useCallback(() => {
    setActiveFilters([]);
    onFilterChange?.([]);
  }, [onFilterChange]);

  const isActive = useCallback(
    (filterId: string) => activeFilters.includes(filterId),
    [activeFilters]
  );

  const applyFilters = useCallback(
    (data: any[]) => {
      if (activeFilters.length === 0) {
        return data;
      }

      const activeFilterDefs = filters.filter((f) => activeFilters.includes(f.id));

      return data.filter((item) => {
        // In single-select mode, item must match the active filter
        // In multi-select mode, item must match at least one active filter
        return activeFilterDefs.some((filterDef) => {
          const { field, value, operator, additionalFilters } = filterDef.filter;

          // Get the field value from the item (supports nested paths like 'user.name')
          const fieldValue = field.split('.').reduce((obj, key) => obj?.[key], item);

          // Apply the operator
          let matches = false;
          switch (operator) {
            case 'eq':
              matches = fieldValue === value;
              break;
            case 'ne':
              matches = fieldValue !== value;
              break;
            case 'gt':
              matches = fieldValue > value;
              break;
            case 'gte':
              matches = fieldValue >= value;
              break;
            case 'lt':
              matches = fieldValue < value;
              break;
            case 'lte':
              matches = fieldValue <= value;
              break;
            case 'in':
              matches = Array.isArray(value) && value.includes(fieldValue);
              break;
            case 'not-in':
              matches = Array.isArray(value) && !value.includes(fieldValue);
              break;
            case 'is-null':
              matches = fieldValue === null || fieldValue === undefined;
              break;
            case 'is-not-null':
              matches = fieldValue !== null && fieldValue !== undefined;
              break;
            case 'contains':
              matches = 
                typeof fieldValue === 'string' &&
                typeof value === 'string' &&
                fieldValue.toLowerCase().includes(value.toLowerCase());
              break;
            default:
              matches = false;
          }

          // If additional filters are specified, apply them too
          if (matches && additionalFilters && additionalFilters.length > 0) {
            matches = additionalFilters.every((addFilter) => {
              const addFieldValue = addFilter.field.split('.').reduce((obj, key) => obj?.[key], item);
              
              switch (addFilter.operator) {
                case 'eq':
                  return addFieldValue === addFilter.value;
                case 'in':
                  return Array.isArray(addFilter.value) && addFilter.value.includes(addFieldValue);
                default:
                  return true;
              }
            });
          }

          return matches;
        });
      });
    },
    [activeFilters, filters]
  );

  return {
    activeFilters,
    toggleFilter,
    clearFilters,
    isActive,
    applyFilters,
  };
};
