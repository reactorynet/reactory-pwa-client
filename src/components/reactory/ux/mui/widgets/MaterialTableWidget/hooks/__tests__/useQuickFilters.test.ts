/**
 * Tests for useQuickFilters hook
 * @module MaterialTableWidget/hooks/__tests__/useQuickFilters
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useQuickFilters, QuickFilterDefinition } from '../useQuickFilters';

const mockFilters: QuickFilterDefinition[] = [
  {
    id: 'active',
    label: 'Active',
    filter: { field: 'status', value: 'active', operator: 'eq' },
  },
  {
    id: 'pending',
    label: 'Pending',
    filter: { field: 'status', value: 'pending', operator: 'eq' },
  },
  {
    id: 'admin',
    label: 'Admins',
    filter: { 
      field: 'role', 
      value: 'admin', 
      operator: 'eq',
      additionalFilters: [
        { field: 'status', value: 'active', operator: 'eq' }
      ]
    },
  },
  {
    id: 'highValue',
    label: 'High Value',
    filter: { field: 'amount', value: 1000, operator: 'gt' },
  },
  {
    id: 'hasEmail',
    label: 'Has Email',
    filter: { field: 'email', value: null, operator: 'is-not-null' },
  },
  {
    id: 'searchName',
    label: 'Name Contains',
    filter: { field: 'name', value: 'john', operator: 'contains' },
  },
];

describe('useQuickFilters', () => {
  describe('initialization', () => {
    it('should initialize with empty active filters', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters })
      );

      expect(result.current.activeFilters).toEqual([]);
    });

    it('should initialize with provided filters array', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters })
      );

      expect(result.current.activeFilters).toHaveLength(0);
    });
  });

  describe('single-select mode (default)', () => {
    it('should activate a filter when toggled', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters, multiSelect: false })
      );

      act(() => {
        result.current.toggleFilter('active');
      });

      expect(result.current.activeFilters).toEqual(['active']);
      expect(result.current.isActive('active')).toBe(true);
      expect(result.current.isActive('pending')).toBe(false);
    });

    it('should replace active filter when toggling another', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters, multiSelect: false })
      );

      act(() => {
        result.current.toggleFilter('active');
      });

      act(() => {
        result.current.toggleFilter('pending');
      });

      expect(result.current.activeFilters).toEqual(['pending']);
      expect(result.current.isActive('active')).toBe(false);
      expect(result.current.isActive('pending')).toBe(true);
    });

    it('should deactivate filter when toggling same filter', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters, multiSelect: false })
      );

      act(() => {
        result.current.toggleFilter('active');
      });

      expect(result.current.activeFilters).toEqual(['active']);

      act(() => {
        result.current.toggleFilter('active');
      });

      expect(result.current.activeFilters).toEqual([]);
    });
  });

  describe('multi-select mode', () => {
    it('should allow multiple active filters', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters, multiSelect: true })
      );

      act(() => {
        result.current.toggleFilter('active');
      });

      act(() => {
        result.current.toggleFilter('admin');
      });

      expect(result.current.activeFilters).toContain('active');
      expect(result.current.activeFilters).toContain('admin');
      expect(result.current.activeFilters).toHaveLength(2);
    });

    it('should remove specific filter when toggled off', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters, multiSelect: true })
      );

      act(() => {
        result.current.toggleFilter('active');
        result.current.toggleFilter('pending');
        result.current.toggleFilter('admin');
      });

      expect(result.current.activeFilters).toHaveLength(3);

      act(() => {
        result.current.toggleFilter('pending');
      });

      expect(result.current.activeFilters).toHaveLength(2);
      expect(result.current.activeFilters).not.toContain('pending');
    });
  });

  describe('clearFilters', () => {
    it('should clear all active filters', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters, multiSelect: true })
      );

      act(() => {
        result.current.toggleFilter('active');
        result.current.toggleFilter('pending');
      });

      expect(result.current.activeFilters).toHaveLength(2);

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.activeFilters).toEqual([]);
    });

    it('should call onFilterChange with empty array when clearing', () => {
      const onFilterChange = jest.fn();
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters, onFilterChange })
      );

      act(() => {
        result.current.toggleFilter('active');
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(onFilterChange).toHaveBeenLastCalledWith([]);
    });
  });

  describe('isActive', () => {
    it('should return true for active filter', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters })
      );

      act(() => {
        result.current.toggleFilter('active');
      });

      expect(result.current.isActive('active')).toBe(true);
    });

    it('should return false for inactive filter', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters })
      );

      expect(result.current.isActive('active')).toBe(false);
    });

    it('should return false for non-existent filter id', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters })
      );

      expect(result.current.isActive('nonexistent')).toBe(false);
    });
  });

  describe('onFilterChange callback', () => {
    it('should call onFilterChange when filter is toggled on', () => {
      const onFilterChange = jest.fn();
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters, onFilterChange })
      );

      act(() => {
        result.current.toggleFilter('active');
      });

      expect(onFilterChange).toHaveBeenCalledWith(['active']);
    });

    it('should call onFilterChange when filter is toggled off', () => {
      const onFilterChange = jest.fn();
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters, onFilterChange })
      );

      act(() => {
        result.current.toggleFilter('active');
      });

      act(() => {
        result.current.toggleFilter('active');
      });

      expect(onFilterChange).toHaveBeenLastCalledWith([]);
    });

    it('should not fail if onFilterChange is not provided', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters })
      );

      expect(() => {
        act(() => {
          result.current.toggleFilter('active');
        });
      }).not.toThrow();
    });
  });

  describe('applyFilters', () => {
    const testData = [
      { id: 1, name: 'John Doe', status: 'active', role: 'admin', amount: 1500, email: 'john@test.com' },
      { id: 2, name: 'Jane Smith', status: 'active', role: 'user', amount: 500, email: 'jane@test.com' },
      { id: 3, name: 'Bob Johnson', status: 'pending', role: 'user', amount: 2000, email: null },
      { id: 4, name: 'Alice Williams', status: 'inactive', role: 'admin', amount: 100, email: 'alice@test.com' },
    ];

    it('should return all data when no filters active', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters })
      );

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(4);
    });

    it('should filter data using eq operator', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters })
      );

      act(() => {
        result.current.toggleFilter('active');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(item => item.status === 'active')).toBe(true);
    });

    it('should filter data using gt operator', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters })
      );

      act(() => {
        result.current.toggleFilter('highValue');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(2); // John (1500) and Bob (2000)
      expect(filtered.every(item => item.amount > 1000)).toBe(true);
    });

    it('should filter data using is-not-null operator', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters })
      );

      act(() => {
        result.current.toggleFilter('hasEmail');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(3); // All except Bob
      expect(filtered.every(item => item.email !== null)).toBe(true);
    });

    it('should filter data using contains operator', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters })
      );

      act(() => {
        result.current.toggleFilter('searchName');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(2); // John Doe and Bob Johnson
    });

    it('should apply additional filters', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters })
      );

      act(() => {
        result.current.toggleFilter('admin');
      });

      const filtered = result.current.applyFilters(testData);
      // Only active admins: John is active admin, Alice is inactive admin
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('John Doe');
    });

    it('should handle nested field paths', () => {
      const nestedFilters: QuickFilterDefinition[] = [
        {
          id: 'nested',
          label: 'Nested',
          filter: { field: 'user.profile.verified', value: true, operator: 'eq' },
        },
      ];

      const nestedData = [
        { id: 1, user: { profile: { verified: true } } },
        { id: 2, user: { profile: { verified: false } } },
      ];

      const { result } = renderHook(() =>
        useQuickFilters({ filters: nestedFilters })
      );

      act(() => {
        result.current.toggleFilter('nested');
      });

      const filtered = result.current.applyFilters(nestedData);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });

    it('should handle in multi-select mode by matching any active filter', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters, multiSelect: true })
      );

      act(() => {
        result.current.toggleFilter('active');
        result.current.toggleFilter('pending');
      });

      const filtered = result.current.applyFilters(testData);
      // Should match items that are either active OR pending
      expect(filtered).toHaveLength(3); // John, Jane (active), Bob (pending)
    });
  });
});
