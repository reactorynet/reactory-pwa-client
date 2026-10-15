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
  UseUserFiltersOptions,
  UseUserFiltersResult,
  FilterOperator,
} from '../types';
import { combineFilters } from '../utils/filterUtils';

const FILTER_PRESETS_STORAGE_KEY = 'userlist_filter_presets';

interface UserFiltersState {
  quick: string[];
  advanced: AdvancedFilter[];
  presets: FilterPreset[];
}

const loadStoredPresets = (): FilterPreset[] => {
  try {
    const stored = localStorage.getItem(FILTER_PRESETS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Guard against a corrupted/legacy non-array payload rather than letting
      // it propagate into state and crash `.map`/`.find` consumers.
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to load filter presets:', error);
  }
  return [];
};

/**
 * Hook for managing filters in the UserList component
 *
 * @param options - Configuration options
 * @returns Filter state and methods
 *
 * @example
 * ```tsx
 * const {
 *   quickFilters,
 *   toggleQuickFilter,
 *   advancedFilters,
 *   setAdvancedFilter,
 *   clearFilters
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
  // Single source of truth: quick filter ids, advanced filters and presets.
  // Every mutation below uses a functional update so that several calls batched
  // into one `act()`/event handler always observe the latest state. (With the
  // previous separate `useState` cells, `savePreset` captured a stale closure and
  // persisted empty filters.)
  const [state, setState] = useState<UserFiltersState>(() => ({
    quick: [...initialQuickFilters],
    advanced: [...initialAdvancedFilters],
    presets: loadStoredPresets(),
  }));

  const { quick: activeQuickFilters, advanced: advancedFilters, presets } = state;

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
  const activeFilterCount = activeQuickFilters.length + advancedFilters.length;

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
    setState((prev) => ({
      ...prev,
      quick: prev.quick.includes(filterId)
        ? prev.quick.filter((id) => id !== filterId)
        : [...prev.quick, filterId],
    }));
  }, []);

  /**
   * Set or update an advanced filter
   */
  const setAdvancedFilter = useCallback(
    (field: string, value: any, operator: FilterOperator): void => {
      setState((prev) => {
        const existingIndex = prev.advanced.findIndex((f) => f.field === field);

        // If value is empty/null, remove the filter
        if (
          value === null ||
          value === undefined ||
          value === '' ||
          (Array.isArray(value) && value.length === 0)
        ) {
          if (existingIndex >= 0) {
            const nextAdvanced = [...prev.advanced];
            nextAdvanced.splice(existingIndex, 1);
            return { ...prev, advanced: nextAdvanced };
          }
          return prev;
        }

        const newFilter: AdvancedFilter = {
          id: `filter-${field}-${Date.now()}`,
          field,
          value,
          operator,
        };

        if (existingIndex >= 0) {
          // Update existing filter
          const nextAdvanced = [...prev.advanced];
          nextAdvanced[existingIndex] = newFilter;
          return { ...prev, advanced: nextAdvanced };
        }

        // Add new filter
        return { ...prev, advanced: [...prev.advanced, newFilter] };
      });
    },
    []
  );

  /**
   * Remove an advanced filter by field
   */
  const removeAdvancedFilter = useCallback((field: string): void => {
    setState((prev) => ({
      ...prev,
      advanced: prev.advanced.filter((f) => f.field !== field),
    }));
  }, []);

  /**
   * Clear all filters (quick and advanced)
   */
  const clearAllFilters = useCallback((): void => {
    setState((prev) => ({ ...prev, quick: [], advanced: [] }));
  }, []);

  /**
   * Save current filters as a preset
   * Captures both quick and advanced filters so a preset can be fully restored.
   */
  const savePreset = useCallback((name: string): void => {
    if (!name || !name.trim()) {
      return;
    }

    setState((prev) => {
      const newPreset: FilterPreset = {
        id: `preset_${Date.now()}`,
        name: name.trim(),
        filters: prev.advanced,
        quickFilters: prev.quick,
        createdAt: new Date(),
      };
      return { ...prev, presets: [...prev.presets, newPreset] };
    });
  }, []);

  /**
   * Load a filter preset
   */
  const loadPreset = useCallback((presetId: string): void => {
    setState((prev) => {
      const preset = prev.presets.find((p) => p.id === presetId);
      if (!preset) {
        return prev;
      }
      return {
        ...prev,
        advanced: preset.filters,
        quick: preset.quickFilters ? [...preset.quickFilters] : [],
      };
    });
  }, []);

  /**
   * Delete a filter preset
   */
  const deletePreset = useCallback((presetId: string): void => {
    setState((prev) => ({
      ...prev,
      presets: prev.presets.filter((p) => p.id !== presetId),
    }));
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
