/**
 * UserListContent Component
 * 
 * Main content area that renders users in different view modes
 * 
 * @module UserList/components/UserListContent
 */

import React from 'react';
import { Box, CircularProgress, useTheme } from '@mui/material';
import type { UserListContentProps } from '../../types';
import { ListView } from './ListView';
import { EmptyState } from './EmptyState';
import { getUserListStyles } from '../../styles/userList.styles';

export const UserListContent: React.FC<UserListContentProps> = ({
  users,
  viewMode,
  itemVariant,
  selectionMode,
  selected,
  onUserSelect,
  onUserClick,
  isLoading,
  isEmpty,
  emptyStateMessage,
  customEmptyState,
  customItemRenderer,
  height,
  dense = false,
}) => {
  const theme = useTheme();
  const styles = getUserListStyles(theme);

  const contentStyles = {
    ...styles.content,
    ...(height && { height }),
  };

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ ...contentStyles, ...styles.contentLoading }}>
        <CircularProgress />
      </Box>
    );
  }

  // Empty state
  if (isEmpty || users.length === 0) {
    return (
      <Box sx={contentStyles}>
        <EmptyState
          message={emptyStateMessage}
          customEmptyState={customEmptyState}
        />
      </Box>
    );
  }

  // Render based on view mode
  const renderContent = () => {
    switch (viewMode) {
      case 'grid':
        // Grid view will be implemented in Phase 4
        return (
          <Box sx={styles.gridView}>
            {/* Grid implementation will be added */}
            <ListView
              users={users}
              itemVariant={itemVariant}
              selectionMode={selectionMode}
              selected={selected}
              onUserSelect={onUserSelect}
              onUserClick={onUserClick}
              customItemRenderer={customItemRenderer}
              dense={dense}
            />
          </Box>
        );

      case 'cards':
        // Card view will be implemented in Phase 4
        return (
          <Box sx={styles.cardView}>
            {/* Card implementation will be added */}
            <ListView
              users={users}
              itemVariant={itemVariant}
              selectionMode={selectionMode}
              selected={selected}
              onUserSelect={onUserSelect}
              onUserClick={onUserClick}
              customItemRenderer={customItemRenderer}
              dense={dense}
            />
          </Box>
        );

      case 'list':
      default:
        return (
          <ListView
            users={users}
            itemVariant={itemVariant}
            selectionMode={selectionMode}
            selected={selected}
            onUserSelect={onUserSelect}
            onUserClick={onUserClick}
            customItemRenderer={customItemRenderer}
            dense={dense}
          />
        );
    }
  };

  return (
    <Box sx={contentStyles} role="region" aria-label="User list content">
      {renderContent()}
    </Box>
  );
};

export default UserListContent;

