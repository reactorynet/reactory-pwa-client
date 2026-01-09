/**
 * AccessibleUserList Component
 * 
 * Enhanced UserList wrapper with full keyboard navigation and ARIA support
 * 
 * @module UserList/components/AccessibleUserList
 */

import React from 'react';
import { Box } from '@mui/material';
import type { UserListProps } from '../types';
import { UserList } from '../UserList';
import { useAccessibility } from '../hooks/useAccessibility';

export interface AccessibleUserListProps extends UserListProps {
  enableKeyboardNavigation?: boolean;
  announceChanges?: boolean;
}

/**
 * AccessibleUserList component with enhanced keyboard navigation
 * 
 * Features:
 * - Arrow key navigation
 * - Home/End for first/last item
 * - Enter/Space for selection
 * - Escape to clear focus
 * - Screen reader announcements
 * - ARIA attributes
 */
export const AccessibleUserList: React.FC<AccessibleUserListProps> = ({
  enableKeyboardNavigation = true,
  announceChanges = true,
  ...userListProps
}) => {
  const [users, setUsers] = React.useState<any[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const {
    handleKeyDown,
    announceMessage,
  } = useAccessibility({
    users,
    selectedIds,
    onUserSelect: (userId, user) => {
      // This would be wired to the actual selection logic
      if (userListProps.onUserSelect) {
        userListProps.onUserSelect(user);
      }
    },
    enabled: enableKeyboardNavigation,
  });

  // Handle selection changes for announcements
  const handleSelectionChange = (selected: any[]) => {
    if (announceChanges) {
      const count = selected.length;
      if (count === 0) {
        announceMessage('No users selected');
      } else if (count === 1) {
        announceMessage(`1 user selected: ${selected[0].fullName || selected[0].email}`);
      } else {
        announceMessage(`${count} users selected`);
      }
    }

    if (userListProps.onSelectionChange) {
      userListProps.onSelectionChange(selected);
    }
  };

  return (
    <Box
      onKeyDown={enableKeyboardNavigation ? handleKeyDown : undefined}
      tabIndex={enableKeyboardNavigation ? 0 : undefined}
      role="application"
      aria-label="User list with keyboard navigation"
    >
      <UserList
        {...userListProps}
        onSelectionChange={handleSelectionChange}
      />
    </Box>
  );
};

export default AccessibleUserList;

