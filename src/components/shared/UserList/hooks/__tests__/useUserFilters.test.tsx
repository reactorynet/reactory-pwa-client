/**
 * Tests for useUserFilters hook
 * Simplified tests to match the current API
 * @module UserList/hooks/__tests__/useUserFilters
 */

import { renderHook, act } from '@testing-library/react';
import { useUserFilters } from '../useUserFilters';
import type { QuickFilterDefinition, AdvancedFilterField } from '../../types';

const mockQuickFilters: QuickFilterDefinition[] = [
  { id: 'active', label: 'Active Users', filter: { field: 'deleted', value: false, operator: 'eq' } },
  { id: 'admins', label: 'Admins', filter: { field: 'roles', value: 'ADMIN', operator: 'contains' } },
];

const mockAdvancedFilterFields: AdvancedFilterField[] = [
  {
    field: 'businessUnit',
    label: 'Business Unit',
    type: 'multiselect',
    operators: ['in', 'not-in'],
    options: [
      { label: 'Engineering', value: 'eng-1' },
      { label: 'Sales', value: 'sales-1' },
    ],
  },
  {
    field: 'firstName',
    label: 'First Name',
    type: 'text',
    operators: ['contains', 'starts-with', 'ends-with'],
  },
];

describe('useUserFilters', () => {
  describe('initialization', () => {
    it('should initialize with empty filters', () => {
      const { result } = renderHook(() => useUserFilters({}));

      expect(Array.from(result.current.quickFilters).length).toBe(0);
      expect(result.current.advancedFilters.length).toBe(0);
      expect(result.current.hasActiveFilters).toBe(false);
    });

    it('should initialize with initial quick filters', () => {
      const { result } = renderHook(() =>
        useUserFilters({
          quickFilters: mockQuickFilters,
          initialQuickFilters: ['active'],
        })
      );

      expect(Array.from(result.current.quickFilters)).toContain('active');
    });
  });

  describe('quick filters', () => {
    it('should toggle quick filter on', () => {
      const { result } = renderHook(() =>
        useUserFilters({
          quickFilters: mockQuickFilters,
        })
      );

      act(() => {
        result.current.toggleQuickFilter('active');
      });

      expect(Array.from(result.current.quickFilters)).toContain('active');
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should toggle quick filter off', () => {
      const { result } = renderHook(() =>
        useUserFilters({
          quickFilters: mockQuickFilters,
          initialQuickFilters: ['active'],
        })
      );

      act(() => {
        result.current.toggleQuickFilter('active');
      });

      expect(Array.from(result.current.quickFilters)).not.toContain('active');
      expect(result.current.hasActiveFilters).toBe(false);
    });

    it('should allow multiple quick filters', () => {
      const { result } = renderHook(() =>
        useUserFilters({
          quickFilters: mockQuickFilters,
        })
      );

      act(() => {
        result.current.toggleQuickFilter('active');
        result.current.toggleQuickFilter('admins');
      });

      expect(Array.from(result.current.quickFilters)).toContain('active');
      expect(Array.from(result.current.quickFilters)).toContain('admins');
      expect(result.current.hasActiveFilters).toBe(true);
    });
  });

  describe('advanced filters', () => {
    it('should add advanced filter', () => {
      const { result } = renderHook(() =>
        useUserFilters({
          advancedFilterFields: mockAdvancedFilterFields,
        })
      );

      act(() => {
        result.current.setAdvancedFilter('firstName', 'John', 'contains');
      });

      expect(result.current.advancedFilters.length).toBe(1);
      expect(result.current.advancedFilters[0].field).toBe('firstName');
      expect(result.current.advancedFilters[0].value).toBe('John');
      expect(result.current.advancedFilters[0].operator).toBe('contains');
    });

    it('should update existing advanced filter', () => {
      const { result } = renderHook(() =>
        useUserFilters({
          advancedFilterFields: mockAdvancedFilterFields,
        })
      );

      act(() => {
        result.current.setAdvancedFilter('firstName', 'John', 'contains');
      });

      expect(result.current.advancedFilters[0].value).toBe('John');

      act(() => {
        result.current.setAdvancedFilter('firstName', 'Jane', 'starts-with');
      });

      expect(result.current.advancedFilters.length).toBe(1);
      expect(result.current.advancedFilters[0].value).toBe('Jane');
      expect(result.current.advancedFilters[0].operator).toBe('starts-with');
    });
  });

  describe('filter management', () => {
    it('should track active filter count', () => {
      const { result } = renderHook(() =>
        useUserFilters({
          quickFilters: mockQuickFilters,
          advancedFilterFields: mockAdvancedFilterFields,
        })
      );

      expect(result.current.hasActiveFilters).toBe(false);

      act(() => {
        result.current.toggleQuickFilter('active');
      });

      expect(result.current.hasActiveFilters).toBe(true);

      act(() => {
        result.current.setAdvancedFilter('firstName', 'John', 'contains');
      });

      expect(result.current.hasActiveFilters).toBe(true);

      act(() => {
        result.current.toggleQuickFilter('admins');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should clear all filters', () => {
      const { result } = renderHook(() =>
        useUserFilters({
          quickFilters: mockQuickFilters,
          advancedFilterFields: mockAdvancedFilterFields,
        })
      );

      act(() => {
        result.current.toggleQuickFilter('active');
        result.current.toggleQuickFilter('admins');
        result.current.setAdvancedFilter('firstName', 'John', 'contains');
      });

      expect(result.current.hasActiveFilters).toBe(true);

      act(() => {
        result.current.clearFilters();
      });

      expect(Array.from(result.current.quickFilters).length).toBe(0);
      expect(result.current.advancedFilters.length).toBe(0);
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe('filter presets', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should save filter preset', () => {
      const { result } = renderHook(() =>
        useUserFilters({
          quickFilters: mockQuickFilters,
          advancedFilterFields: mockAdvancedFilterFields,
        })
      );

      act(() => {
        result.current.toggleQuickFilter('active');
        result.current.setAdvancedFilter('firstName', 'John', 'contains');
        result.current.savePreset('My Preset');
      });

      expect(result.current.presets.length).toBeGreaterThan(0);
      expect(result.current.presets[0].name).toBe('My Preset');
    });

    it('should load filter preset', () => {
      const { result } = renderHook(() =>
        useUserFilters({
          quickFilters: mockQuickFilters,
          advancedFilterFields: mockAdvancedFilterFields,
        })
      );

      // Save a preset
      act(() => {
        result.current.toggleQuickFilter('active');
        result.current.setAdvancedFilter('firstName', 'John', 'contains');
        result.current.savePreset('My Preset');
      });

      const presetId = result.current.presets[0].id;

      // Clear filters
      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.hasActiveFilters).toBe(false);

      // Load preset
      act(() => {
        result.current.loadPreset(presetId);
      });

      expect(result.current.hasActiveFilters).toBe(true);
      expect(Array.from(result.current.quickFilters)).toContain('active');
      expect(result.current.advancedFilters.length).toBeGreaterThan(0);
    });

    it('should delete filter preset', () => {
      const { result } = renderHook(() =>
        useUserFilters({
          quickFilters: mockQuickFilters,
          advancedFilterFields: mockAdvancedFilterFields,
        })
      );

      // Save a preset
      act(() => {
        result.current.toggleQuickFilter('active');
        result.current.savePreset('My Preset');
      });

      const initialPresetCount = result.current.presets.length;
      const presetId = result.current.presets[0].id;

      // Delete preset
      act(() => {
        result.current.deletePreset(presetId);
      });

      expect(result.current.presets.length).toBe(initialPresetCount - 1);
    });
  });
});
