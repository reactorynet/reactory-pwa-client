/**
 * Tests for useAdvancedFilters hook
 * @module MaterialTableWidget/hooks/__tests__/useAdvancedFilters
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useAdvancedFilters, AdvancedFilterField } from '../useAdvancedFilters';

const mockFields: AdvancedFilterField[] = [
  {
    id: 'status',
    label: 'Status',
    field: 'status',
    type: 'select',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
      { label: 'Pending', value: 'pending' },
    ],
  },
  {
    id: 'name',
    label: 'Name',
    field: 'name',
    type: 'text',
    placeholder: 'Enter name...',
  },
  {
    id: 'age',
    label: 'Age',
    field: 'age',
    type: 'number',
  },
  {
    id: 'roles',
    label: 'Roles',
    field: 'roles',
    type: 'multi-select',
    options: [
      { label: 'Admin', value: 'admin' },
      { label: 'User', value: 'user' },
      { label: 'Guest', value: 'guest' },
    ],
  },
  {
    id: 'createdAt',
    label: 'Created Date',
    field: 'createdAt',
    type: 'date-range',
  },
  {
    id: 'verified',
    label: 'Verified',
    field: 'verified',
    type: 'boolean',
  },
];

describe('useAdvancedFilters', () => {
  describe('initialization', () => {
    it('should initialize with empty filters', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      expect(result.current.filters).toEqual([]);
      expect(result.current.activeFilterCount).toBe(0);
    });

    it('should initialize with empty presets', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      expect(result.current.presets).toEqual([]);
    });
  });

  describe('setFilter', () => {
    it('should add a new filter', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });

      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0]).toEqual({
        field: 'status',
        value: 'active',
        operator: 'eq',
        label: 'Status',
      });
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('should update existing filter for same field', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });

      act(() => {
        result.current.setFilter('status', 'inactive', 'eq');
      });

      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0].value).toBe('inactive');
    });

    it('should use default operator eq when not specified', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active');
      });

      expect(result.current.filters[0].operator).toBe('eq');
    });

    it('should remove filter when value is empty string', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('name', 'John', 'contains');
      });

      expect(result.current.filters).toHaveLength(1);

      act(() => {
        result.current.setFilter('name', '', 'contains');
      });

      expect(result.current.filters).toHaveLength(0);
    });

    it('should remove filter when value is null', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('name', 'John', 'contains');
      });

      act(() => {
        result.current.setFilter('name', null, 'contains');
      });

      expect(result.current.filters).toHaveLength(0);
    });

    it('should remove filter when value is empty array', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('roles', ['admin', 'user'], 'in');
      });

      act(() => {
        result.current.setFilter('roles', [], 'in');
      });

      expect(result.current.filters).toHaveLength(0);
    });

    it('should call onFilterChange callback', () => {
      const onFilterChange = jest.fn();
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields, onFilterChange })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });

      expect(onFilterChange).toHaveBeenCalledWith([
        { field: 'status', value: 'active', operator: 'eq', label: 'Status' }
      ]);
    });
  });

  describe('removeFilter', () => {
    it('should remove a specific filter by field', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
        result.current.setFilter('name', 'John', 'contains');
      });

      expect(result.current.filters).toHaveLength(2);

      act(() => {
        result.current.removeFilter('status');
      });

      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0].field).toBe('name');
    });

    it('should call onFilterChange when removing filter', () => {
      const onFilterChange = jest.fn();
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields, onFilterChange })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });

      act(() => {
        result.current.removeFilter('status');
      });

      expect(onFilterChange).toHaveBeenLastCalledWith([]);
    });

    it('should handle removing non-existent filter gracefully', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });

      expect(() => {
        act(() => {
          result.current.removeFilter('nonexistent');
        });
      }).not.toThrow();

      expect(result.current.filters).toHaveLength(1);
    });
  });

  describe('clearFilters', () => {
    it('should remove all filters', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
        result.current.setFilter('name', 'John', 'contains');
        result.current.setFilter('age', 30, 'gte');
      });

      expect(result.current.filters).toHaveLength(3);

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toHaveLength(0);
      expect(result.current.activeFilterCount).toBe(0);
    });

    it('should call onFilterChange with empty array', () => {
      const onFilterChange = jest.fn();
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields, onFilterChange })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(onFilterChange).toHaveBeenLastCalledWith([]);
    });
  });

  describe('applyFilters - operators', () => {
    const testData = [
      { id: 1, name: 'John Doe', status: 'active', age: 30, verified: true },
      { id: 2, name: 'Jane Smith', status: 'inactive', age: 25, verified: false },
      { id: 3, name: 'Bob Johnson', status: 'active', age: 35, verified: true },
      { id: 4, name: 'Alice Williams', status: 'pending', age: 28, verified: null },
    ];

    it('should return all data when no filters applied', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(4);
    });

    it('should apply eq operator', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(item => item.status === 'active')).toBe(true);
    });

    it('should apply ne operator', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'ne');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(item => item.status !== 'active')).toBe(true);
    });

    it('should apply gt operator', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('age', 28, 'gt');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(2); // John (30) and Bob (35)
    });

    it('should apply gte operator', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('age', 28, 'gte');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(3); // John (30), Bob (35), Alice (28)
    });

    it('should apply lt operator', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('age', 30, 'lt');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(2); // Jane (25), Alice (28)
    });

    it('should apply lte operator', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('age', 30, 'lte');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(3); // Jane (25), Alice (28), John (30)
    });

    it('should apply in operator', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', ['active', 'pending'], 'in');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(3);
    });

    it('should apply not-in operator', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', ['inactive'], 'not-in');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(3);
    });

    it('should apply contains operator (case-insensitive)', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('name', 'john', 'contains');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(2); // John Doe and Bob Johnson
    });

    it('should apply starts-with operator (case-insensitive)', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('name', 'j', 'starts-with');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(2); // John and Jane
    });

    it('should apply ends-with operator (case-insensitive)', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('name', 'son', 'ends-with');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(1); // Bob Johnson
    });

    it('should apply between operator', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('age', [26, 32], 'between');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(2); // Alice (28) and John (30)
    });

    it('should apply is-null operator', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('verified', true, 'is-null');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(1); // Alice
    });

    it('should apply is-not-null operator', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('verified', true, 'is-not-null');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(3); // John, Jane, Bob
    });

    it('should apply multiple filters (AND logic)', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
        result.current.setFilter('age', 30, 'gte');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(2); // John (30) and Bob (35), both active
    });

    it('should handle nested field paths', () => {
      const nestedData = [
        { id: 1, user: { profile: { name: 'John' } } },
        { id: 2, user: { profile: { name: 'Jane' } } },
      ];

      const { result } = renderHook(() =>
        useAdvancedFilters({ 
          fields: [{ id: 'userName', label: 'User Name', field: 'user.profile.name', type: 'text' }]
        })
      );

      act(() => {
        result.current.setFilter('user.profile.name', 'John', 'eq');
      });

      const filtered = result.current.applyFilters(nestedData);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });
  });

  describe('presets', () => {
    it('should save current filters as a preset', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });
      
      act(() => {
        result.current.setFilter('age', 25, 'gte');
      });

      act(() => {
        result.current.savePreset('Active Adults');
      });

      expect(result.current.presets).toHaveLength(1);
      expect(result.current.presets[0].name).toBe('Active Adults');
      expect(result.current.presets[0].filters).toHaveLength(2);
    });

    it('should not save empty preset', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.savePreset('Empty Preset');
      });

      expect(result.current.presets).toHaveLength(0);
    });

    it('should load a preset', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      // First set a filter and save as preset
      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });
      
      act(() => {
        result.current.savePreset('Active Only');
      });

      // Verify preset was saved
      expect(result.current.presets).toHaveLength(1);
      const presetId = result.current.presets[0].id;

      // Clear filters
      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toHaveLength(0);

      // Load the preset
      act(() => {
        result.current.loadPreset(presetId);
      });

      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0].value).toBe('active');
    });

    it('should call onFilterChange when loading preset', () => {
      const onFilterChange = jest.fn();
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields, onFilterChange })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });
      
      act(() => {
        result.current.savePreset('Active Only');
      });

      expect(result.current.presets).toHaveLength(1);
      const presetId = result.current.presets[0].id;

      act(() => {
        result.current.clearFilters();
      });

      onFilterChange.mockClear();

      act(() => {
        result.current.loadPreset(presetId);
      });

      expect(onFilterChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ field: 'status', value: 'active' })
        ])
      );
    });

    it('should delete a preset', async () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      // Save first preset with status=active
      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });
      act(() => {
        result.current.savePreset('Preset 1');
      });

      expect(result.current.presets).toHaveLength(1);
      const preset1Id = result.current.presets[0].id;

      // Wait a tiny bit to ensure different timestamp for ID
      await new Promise(resolve => setTimeout(resolve, 2));

      // Save second preset with different filter (name instead of status)
      act(() => {
        result.current.setFilter('name', 'John', 'contains');
      });
      act(() => {
        result.current.savePreset('Preset 2');
      });

      expect(result.current.presets).toHaveLength(2);
      
      // Verify they have different IDs
      expect(result.current.presets[0].id).not.toBe(result.current.presets[1].id);

      // Delete the first preset
      act(() => {
        result.current.deletePreset(preset1Id);
      });

      expect(result.current.presets).toHaveLength(1);
      expect(result.current.presets[0].name).toBe('Preset 2');
    });

    it('should handle loading non-existent preset gracefully', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });

      expect(() => {
        act(() => {
          result.current.loadPreset('non-existent-id');
        });
      }).not.toThrow();

      // Filters should remain unchanged
      expect(result.current.filters).toHaveLength(1);
    });

    it('should generate unique preset IDs', async () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });
      
      act(() => {
        result.current.savePreset('Preset 1');
      });

      // Wait a tiny bit for unique ID generation based on Date.now()
      await new Promise(resolve => setTimeout(resolve, 2));

      act(() => {
        result.current.savePreset('Preset 2');
      });

      expect(result.current.presets).toHaveLength(2);
      expect(result.current.presets[0].id).not.toBe(result.current.presets[1].id);
    });
  });

  describe('activeFilterCount', () => {
    it('should track the number of active filters', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      expect(result.current.activeFilterCount).toBe(0);

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });

      expect(result.current.activeFilterCount).toBe(1);

      act(() => {
        result.current.setFilter('name', 'John', 'contains');
      });

      expect(result.current.activeFilterCount).toBe(2);

      act(() => {
        result.current.removeFilter('status');
      });

      expect(result.current.activeFilterCount).toBe(1);
    });
  });
});
