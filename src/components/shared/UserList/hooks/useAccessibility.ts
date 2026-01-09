/**
 * useAccessibility Hook
 * 
 * Provides keyboard navigation and accessibility features for UserList
 * 
 * @module UserList/hooks/useAccessibility
 */

import { useEffect, useCallback, useRef } from 'react';
import type Reactory from '@reactory/reactory-core';

export interface UseAccessibilityOptions {
  users: Reactory.Models.IUser[];
  selectedIds: Set<string>;
  onUserSelect: (userId: string, user: Reactory.Models.IUser) => void;
  onUserActivate?: (user: Reactory.Models.IUser) => void;
  enabled?: boolean;
}

export interface UseAccessibilityResult {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
  announceMessage: (message: string) => void;
}

/**
 * Custom hook for keyboard navigation and accessibility
 */
export const useAccessibility = ({
  users,
  selectedIds,
  onUserSelect,
  onUserActivate,
  enabled = true,
}: UseAccessibilityOptions): UseAccessibilityResult => {
  const focusedIndexRef = useRef<number>(-1);
  const announcerRef = useRef<HTMLDivElement | null>(null);

  // Create live region for screen reader announcements
  useEffect(() => {
    if (!enabled) return;

    // Create announcer element if it doesn't exist
    if (!announcerRef.current) {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      document.body.appendChild(announcer);
      announcerRef.current = announcer;
    }

    return () => {
      if (announcerRef.current) {
        document.body.removeChild(announcerRef.current);
        announcerRef.current = null;
      }
    };
  }, [enabled]);

  /**
   * Announce a message to screen readers
   */
  const announceMessage = useCallback((message: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = message;
    }
  }, []);

  /**
   * Set focused index
   */
  const setFocusedIndex = useCallback((index: number) => {
    focusedIndexRef.current = index;
    
    if (index >= 0 && index < users.length) {
      const user = users[index];
      announceMessage(`Focused on ${user.fullName || user.email}`);
    }
  }, [users, announceMessage]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!enabled || users.length === 0) return;

      const currentIndex = focusedIndexRef.current;

      switch (event.key) {
        case 'ArrowDown':
        case 'Down':
          event.preventDefault();
          {
            const nextIndex = Math.min(currentIndex + 1, users.length - 1);
            setFocusedIndex(nextIndex);
          }
          break;

        case 'ArrowUp':
        case 'Up':
          event.preventDefault();
          {
            const prevIndex = Math.max(currentIndex - 1, 0);
            setFocusedIndex(prevIndex);
          }
          break;

        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          break;

        case 'End':
          event.preventDefault();
          setFocusedIndex(users.length - 1);
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          if (currentIndex >= 0 && currentIndex < users.length) {
            const user = users[currentIndex];
            if (onUserActivate) {
              onUserActivate(user);
              announceMessage(`Activated ${user.fullName || user.email}`);
            } else {
              onUserSelect(user.id, user);
              const isSelected = selectedIds.has(user.id);
              announceMessage(
                `${isSelected ? 'Selected' : 'Deselected'} ${user.fullName || user.email}`
              );
            }
          }
          break;

        case 'a':
        case 'A':
          // Select all (Ctrl+A / Cmd+A)
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            // This would require access to selectAll function
            announceMessage('Select all users');
          }
          break;

        case 'Escape':
          event.preventDefault();
          // Clear focus
          setFocusedIndex(-1);
          announceMessage('Cleared focus');
          break;

        default:
          break;
      }
    },
    [enabled, users, selectedIds, onUserSelect, onUserActivate, setFocusedIndex, announceMessage]
  );

  return {
    focusedIndex: focusedIndexRef.current,
    setFocusedIndex,
    handleKeyDown,
    announceMessage,
  };
};

export default useAccessibility;

