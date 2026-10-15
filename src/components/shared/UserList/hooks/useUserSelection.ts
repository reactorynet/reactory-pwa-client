/**
 * useUserSelection Hook
 * 
 * Manages user selection state and logic for the UserList component.
 * Supports single, multiple, and no selection modes.
 * 
 * @module UserList/hooks/useUserSelection
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type Reactory from '@reactorynet/reactory-core';
import type {
  SelectionMode,
  UseUserSelectionOptions,
  UseUserSelectionResult,
} from '../types';

/**
 * Hook for managing user selection in the UserList component
 * 
 * @param options - Configuration options
 * @returns Selection state and methods
 * 
 * @example
 * ```tsx
 * const {
 *   selected,
 *   selectedUsers,
 *   selectUser,
 *   toggleUser,
 *   clearSelection
 * } = useUserSelection({
 *   mode: 'multiple',
 *   onSelectionChange: (users) => console.log(users)
 * });
 * ```
 */
export const useUserSelection = ({
  mode,
  initialSelected = [],
  maxSelection,
  onSelectionChange,
}: UseUserSelectionOptions): UseUserSelectionResult => {
  // State: Set of selected user IDs for O(1) lookup
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(initialSelected.map((u) => u.id));
  });

  // State: Map of selected user objects for easy access
  const [selectedUsers, setSelectedUsers] = useState<Map<string, Reactory.Models.IUser>>(
    () => {
      const map = new Map<string, Reactory.Models.IUser>();
      initialSelected.forEach((user) => {
        map.set(user.id, user);
      });
      return map;
    }
  );

  // Excluded users not supported in this version
  const excludedIds = useMemo(() => new Set<string>(), []);

  // Convert selected users map to array
  const selectedUsersArray = useMemo(() => {
    return Array.from(selectedUsers.values());
  }, [selectedUsers]);

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedUsersArray);
    }
  }, [selectedUsersArray, onSelectionChange]);

  /**
   * Check if a user is currently selected
   */
  const isSelected = useCallback(
    (userId: string): boolean => {
      return selectedIds.has(userId);
    },
    [selectedIds]
  );

  /**
   * Check if a user can be selected (not in excluded list)
   */
  const canSelect = useCallback(
    (userId: string): boolean => {
      return mode !== 'none' && !excludedIds.has(userId);
    },
    [mode, excludedIds]
  );

  /**
   * Select a user
   * In single mode, clears existing selection first.
   * In multiple mode, never exceeds `maxSelection` (when provided).
   */
  const selectUser = useCallback(
    (userId: string, user: Reactory.Models.IUser): void => {
      if (!canSelect(userId)) {
        return;
      }

      // `selectedIds` and `selectedUsers` are kept in lock-step; the same rule is
      // applied to each updater so they stay consistent.
      setSelectedIds((prev) => {
        if (prev.has(userId)) {
          return prev;
        }
        if (mode === 'single') {
          return new Set<string>([userId]);
        }
        if (typeof maxSelection === 'number' && prev.size >= maxSelection) {
          return prev;
        }
        const newSet = new Set(prev);
        newSet.add(userId);
        return newSet;
      });

      setSelectedUsers((prev) => {
        if (prev.has(userId)) {
          return prev;
        }
        if (mode === 'single') {
          const newMap = new Map<string, Reactory.Models.IUser>();
          newMap.set(userId, user);
          return newMap;
        }
        if (typeof maxSelection === 'number' && prev.size >= maxSelection) {
          return prev;
        }
        const newMap = new Map(prev);
        newMap.set(userId, user);
        return newMap;
      });
    },
    [mode, canSelect, maxSelection]
  );

  /**
   * Deselect a user
   */
  const deselectUser = useCallback((userId: string): void => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });

    setSelectedUsers((prev) => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
  }, []);

  /**
   * Toggle a user's selection status
   */
  const toggleSelection = useCallback(
    (userId: string, user: Reactory.Models.IUser): void => {
      if (isSelected(userId)) {
        deselectUser(userId);
      } else {
        selectUser(userId, user);
      }
    },
    [isSelected, deselectUser, selectUser]
  );

  /**
   * Select all users from the provided list
   * Only works in multiple selection mode
   * Skips excluded users and respects `maxSelection` (when provided)
   */
  const selectAll = useCallback(
    (users: Reactory.Models.IUser[]): void => {
      if (mode !== 'multiple') {
        return;
      }

      const newSelectedIds = new Set<string>();
      const newSelectedUsers = new Map<string, Reactory.Models.IUser>();

      users.forEach((user) => {
        if (excludedIds.has(user.id)) {
          return;
        }
        if (typeof maxSelection === 'number' && newSelectedIds.size >= maxSelection) {
          return;
        }
        newSelectedIds.add(user.id);
        newSelectedUsers.set(user.id, user);
      });

      setSelectedIds(newSelectedIds);
      setSelectedUsers(newSelectedUsers);
    },
    [mode, excludedIds, maxSelection]
  );

  /**
   * Clear all selections
   */
  const clearSelection = useCallback((): void => {
    setSelectedIds(new Set());
    setSelectedUsers(new Map());
  }, []);

  return {
    selectedIds,
    selectedUsers: selectedUsersArray,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
  };
};

export default useUserSelection;

