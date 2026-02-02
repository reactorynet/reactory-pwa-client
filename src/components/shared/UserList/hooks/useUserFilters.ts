/**
 * useUserFilters Hook
 * 
 * Manages filter state and application for the UserList component.
 * Handles quick filters, advanced filters, and filter presets.
 * 
 * @module UserList/hooks/useUserFilters
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  QuickFilterDefinition,
  AdvancedFilter,
  FilterPreset,
  UserFilterInput,
  UseUserFiltersOptions,
  UseUserFiltersResult,
  FilterOperator,
} from '../types';
import { combineFilters } from '../utils/filterUtils';

const FILTER_PRESETS_STORAGE_KEY = 'userlist_filter_presets';

/**
 * Hook for managing filters in the UserList component
 * 
 * @param options - Configuration options
 * @returns Filter state and methods
 * 
 * @example
 * ```tsx
 * const {
 *   activeQuickFilters,
 *   toggleQuickFilter,
 *   advancedFilters,
 *   setAdvancedFilter,
 *   combinedFilters,
 *   clearAllFilters
 * } = useUserFilters({
 *   quickFilters: quickFilterDefs,
 *   onFilterChange: (filters) => refetch(filters)
 * });
 * ```
 */
export const useUserFilters = ({
  quickFilters = [],
  initialQuickFilters = [],
  advancedFilterFields = [],
  initialAdvancedFilters = [],
  onFilterChange,
}: UseUserFiltersOptions): UseUserFiltersResult => {
  // State: Active quick filter IDs
  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([]);

  // State: Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilter[]>([]);

  // State: Filter presets
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    try {
      const stored = localStorage.getItem(FILTER_PRESETS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load filter presets:', error);
    }
    return [];
  });

  // Get active quick filter definitions
  const activeQuickFilterDefs = useMemo(() => {
    return quickFilters.filter((qf) => activeQuickFilters.includes(qf.id));
  }, [quickFilters, activeQuickFilters]);

  // Combine all filters into a single filter object
  const combinedFilters = useMemo(() => {
    return combineFilters(
      {} as any,
      activeQuickFilterDefs,
      advancedFilters,
      '' // search string is handled separately in useUserList
    );
  }, [activeQuickFilterDefs, advancedFilters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return activeQuickFilters.length + advancedFilters.length;
  }, [activeQuickFilters, advancedFilters]);

  // Notify parent of filter changes
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({ quick: new Set(activeQuickFilters), advanced: advancedFilters });
    }
  }, [activeQuickFilters, advancedFilters, onFilterChange]);

  // Save presets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error('Failed to save filter presets:', error);
    }
  }, [presets]);

  /**
   * Toggle a quick filter on/off
   */
  const toggleQuickFilter = useCallback((filterId: string): void => {
    setActiveQuickFilters((prev) => {
      if (prev.includes(filterId)) {
        return prev.filter((id) => id !== filterId);
      } else {
        return [...prev, filterId];
      }
    });
  }, []);

  /**
   * Clear all quick filters
   */
  const clearQuickFilters = useCallback((): void => {
    setActiveQuickFilters([]);
  }, []);

  /**
   * Set or update an advanced filter
   */
  const setAdvancedFilter = useCallback(
    (field: string, value: any, operator: FilterOperator): void => {
      setAdvancedFilters((prev) => {
        const existingIndex = prev.findIndex((f) => f.field === field);

        // If value is empty/null, remove the filter
        if (
          value === null ||
          value === undefined ||
          value === '' ||
          (Array.isArray(value) && value.length === 0)
        ) {
          if (existingIndex >= 0) {
            const newFilters = [...prev];
            newFilters.splice(existingIndex, 1);
            return newFilters;
          }
          return prev;
        }

        // Find the field definition for the label
        const fieldDef = advancedFilterFields.find((f) => f.field === field);

        const newFilter: AdvancedFilter = {
          id: `filter-${field}-${Date.now()}`,
          field,
          value,
          operator,
        };

        if (existingIndex >= 0) {
          // Update existing filter
          const newFilters = [...prev];
          newFilters[existingIndex] = newFilter;
          return newFilters;
        } else {
          // Add new filter
          return [...prev, newFilter];
        }
      });
    },
    [advancedFilterFields]
  );

  /**
   * Remove an advanced filter by field
   */
  const removeAdvancedFilter = useCallback((field: string): void => {
    setAdvancedFilters((prev) => prev.filter((f) => f.field !== field));
  }, []);

  /**
   * Clear all advanced filters
   */
  const clearAdvancedFilters = useCallback((): void => {
    setAdvancedFilters([]);
  }, []);

  /**
   * Clear all filters (quick and advanced)
   */
  const clearAllFilters = useCallback((): void => {
    clearQuickFilters();
    clearAdvancedFilters();
  }, [clearQuickFilters, clearAdvancedFilters]);

  /**
   * Save current filters as a preset
   */
  const savePreset = useCallback(
    (name: string): void => {
      if (!name || !name.trim()) {
        return;
      }

      const newPreset: FilterPreset = {
        id: `preset_${Date.now()}`,
        name: name.trim(),
        filters: advancedFilters,
        createdAt: new Date(),
      };

      setPresets((prev) => [...prev, newPreset]);
    },
    [advancedFilters]
  );

  /**
   * Load a filter preset
   */
  const loadPreset = useCallback((presetId: string): void => {
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      setAdvancedFilters(preset.filters);
      // Clear quick filters when loading a preset
      clearQuickFilters();
    }
  }, [presets, clearQuickFilters]);

  /**
   * Delete a filter preset
   */
  const deletePreset = useCallback((presetId: string): void => {
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
  }, []);

  // Memoize the returned values to prevent unnecessary re-renders
  const quickFiltersSet = useMemo(() => new Set(activeQuickFilters), [activeQuickFilters]);

  return {
    quickFilters: quickFiltersSet,
    advancedFilters: advancedFilters,
    toggleQuickFilter,
    setAdvancedFilter,
    clearFilters: clearAllFilters,
    hasActiveFilters: activeFilterCount > 0,
    savePreset,
    loadPreset,
    deletePreset,
    presets,
  };
};

export default useUserFilters;

