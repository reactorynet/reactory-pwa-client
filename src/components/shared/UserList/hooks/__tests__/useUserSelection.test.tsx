/**
 * Tests for useUserSelection hook
 * Simplified tests to match the current API
 * @module UserList/hooks/__tests__/useUserSelection
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useUserSelection } from '../useUserSelection';
import type Reactory from '@reactory/reactory-core';

// Mock users for testing
const mockUsers: Reactory.Models.IUser[] = [
  { id: '1', email: 'user1@test.com', firstName: 'User', lastName: 'One' } as any as Reactory.Models.IUser,
  { id: '2', email: 'user2@test.com', firstName: 'User', lastName: 'Two' } as any as Reactory.Models.IUser,
  { id: '3', email: 'user3@test.com', firstName: 'User', lastName: 'Three' } as any as Reactory.Models.IUser,
  { id: '4', email: 'user4@test.com', firstName: 'User', lastName: 'Four' } as any as Reactory.Models.IUser,
];

describe('useUserSelection', () => {
  describe('initialization', () => {
    it('should initialize with empty selection', () => {
      const { result } = renderHook(() =>
        useUserSelection({
          mode: 'multiple',
        })
      );

      expect(result.current.selectedIds.size).toBe(0);
      expect(result.current.selectedUsers.length).toBe(0);
    });

    it('should initialize with provided initial selection', () => {
      const { result } = renderHook(() =>
        useUserSelection({
          mode: 'multiple',
          initialSelected: [mockUsers[0], mockUsers[1]],
        })
      );

      expect(result.current.selectedIds.size).toBe(2);
      expect(result.current.selectedIds.has('1')).toBe(true);
      expect(result.current.selectedIds.has('2')).toBe(true);
      expect(result.current.selectedUsers.length).toBe(2);
    });
  });

  describe('selection mode: none', () => {
    it('should not allow any selection when mode is none', () => {
      const { result } = renderHook(() =>
        useUserSelection({
          mode: 'none',
        })
      );

      act(() => {
        result.current.toggleSelection('1', mockUsers[0]);
      });

      expect(result.current.selectedIds.size).toBe(0);
    });
  });

  describe('selection mode: single', () => {
    it('should allow single selection', () => {
      const { result } = renderHook(() =>
        useUserSelection({
          mode: 'single',
        })
      );

      act(() => {
        result.current.toggleSelection('1', mockUsers[0]);
      });

      expect(result.current.selectedIds.size).toBe(1);
      expect(result.current.isSelected('1')).toBe(true);
      expect(result.current.selectedUsers[0].id).toBe('1');
    });

    it('should clear previous selection when selecting a new user', () => {
      const { result } = renderHook(() =>
        useUserSelection({
          mode: 'single',
        })
      );

      act(() => {
        result.current.toggleSelection('1', mockUsers[0]);
      });

      expect(result.current.selectedIds.size).toBe(1);

      act(() => {
        result.current.toggleSelection('2', mockUsers[1]);
      });

      expect(result.current.selectedIds.size).toBe(1);
      expect(result.current.isSelected('1')).toBe(false);
      expect(result.current.isSelected('2')).toBe(true);
    });

    it('should deselect when clicking the same user', () => {
      const { result } = renderHook(() =>
        useUserSelection({
          mode: 'single',
        })
      );

      act(() => {
        result.current.toggleSelection('1', mockUsers[0]);
      });

      expect(result.current.selectedIds.size).toBe(1);

      act(() => {
        result.current.toggleSelection('1', mockUsers[0]);
      });

      expect(result.current.selectedIds.size).toBe(0);
    });
  });

  describe('selection mode: multiple', () => {
    it('should allow multiple selections', () => {
      const { result } = renderHook(() =>
        useUserSelection({
          mode: 'multiple',
        })
      );

      act(() => {
        result.current.toggleSelection('1', mockUsers[0]);
        result.current.toggleSelection('2', mockUsers[1]);
        result.current.toggleSelection('3', mockUsers[2]);
      });

      expect(result.current.selectedIds.size).toBe(3);
      expect(result.current.isSelected('1')).toBe(true);
      expect(result.current.isSelected('2')).toBe(true);
      expect(result.current.isSelected('3')).toBe(true);
    });

    it('should toggle user selection on/off', () => {
      const { result } = renderHook(() =>
        useUserSelection({
          mode: 'multiple',
        })
      );

      act(() => {
        result.current.toggleSelection('1', mockUsers[0]);
      });

      expect(result.current.selectedIds.size).toBe(1);

      act(() => {
        result.current.toggleSelection('1', mockUsers[0]);
      });

      expect(result.current.selectedIds.size).toBe(0);
    });
  });

  describe('selectAll', () => {
    it('should select all provided users', () => {
      const { result } = renderHook(() =>
        useUserSelection({
          mode: 'multiple',
        })
      );

      act(() => {
        result.current.selectAll([...mockUsers, mockUsers[3]]);
      });

      expect(result.current.selectedIds.size).toBe(4);
      expect(result.current.selectedUsers.length).toBe(4);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selections', () => {
      const { result } = renderHook(() =>
        useUserSelection({
          mode: 'multiple',
          initialSelected: [mockUsers[0], mockUsers[1]],
        })
      );

      expect(result.current.selectedIds.size).toBe(2);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedIds.size).toBe(0);
      expect(result.current.selectedUsers.length).toBe(0);
    });
  });

  describe('maxSelection', () => {
    it('should respect max selection limit', () => {
      const { result } = renderHook(() =>
        useUserSelection({
          mode: 'multiple',
          maxSelection: 2,
        })
      );

      act(() => {
        result.current.toggleSelection('1', mockUsers[0]);
        result.current.toggleSelection('2', mockUsers[1]);
        result.current.toggleSelection('3', mockUsers[2]); // Should not add due to limit
      });

      expect(result.current.selectedIds.size).toBe(2);
      expect(result.current.isSelected('1')).toBe(true);
      expect(result.current.isSelected('2')).toBe(true);
      expect(result.current.isSelected('3')).toBe(false);
    });
  });

  describe('onSelectionChange callback', () => {
    it('should call onSelectionChange when selection changes', () => {
      const onSelectionChange = jest.fn();

      const { result } = renderHook(() =>
        useUserSelection({
          mode: 'multiple',
          onSelectionChange,
        })
      );

      act(() => {
        result.current.toggleSelection('1', mockUsers[0]);
      });

      expect(onSelectionChange).toHaveBeenCalled();
      expect(onSelectionChange).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ id: '1' })
      ]));
    });
  });
});
