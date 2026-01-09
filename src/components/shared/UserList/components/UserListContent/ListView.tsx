/**
 * ListView Component
 * 
 * Renders users in a vertical list format
 * 
 * @module UserList/components/UserListContent/ListView
 */

import React from 'react';
import { List, Box, useTheme } from '@mui/material';
import type Reactory from '@reactory/reactory-core';
import type { ItemVariant, SelectionMode, CustomItemRenderer, ItemRendererOptions } from '../../types';
import { UserListItemCompact, UserListItemDetailed } from '../UserListItem';
import { getUserListStyles } from '../../styles/userList.styles';

export interface ListViewProps {
  users: Reactory.Models.IUser[];
  itemVariant: ItemVariant;
  selectionMode: SelectionMode;
  selected: Set<string>;
  onUserSelect: (userId: string, user: Reactory.Models.IUser) => void;
  onUserClick?: (user: Reactory.Models.IUser) => void;
  customItemRenderer?: CustomItemRenderer;
  dense?: boolean;
}

export const ListView: React.FC<ListViewProps> = ({
  users,
  itemVariant,
  selectionMode,
  selected,
  onUserSelect,
  onUserClick,
  customItemRenderer,
  dense = false,
}) => {
  const theme = useTheme();
  const styles = getUserListStyles(theme);

  const showCheckbox = selectionMode === 'multiple';

  const renderUserItem = (user: Reactory.Models.IUser) => {
    const isSelected = selected.has(user.id);

    const handleSelect = (selectedUser: Reactory.Models.IUser) => {
      onUserSelect(selectedUser.id, selectedUser);
    };

    // Custom renderer
    if (itemVariant === 'custom' && customItemRenderer) {
      const options: ItemRendererOptions = {
        selected: isSelected,
        selectionMode,
        showCheckbox,
        onSelect: handleSelect,
        onClick: onUserClick,
        viewMode: 'list',
        itemVariant,
      };
      return customItemRenderer(user, options);
    }

    // Detailed variant
    if (itemVariant === 'detailed') {
      return (
        <UserListItemDetailed
          key={user.id}
          user={user}
          selected={isSelected}
          selectionMode={selectionMode}
          onSelect={handleSelect}
          onClick={onUserClick}
          showCheckbox={showCheckbox}
          showBusinessUnit={true}
          showRoles={true}
          showLastLogin={true}
        />
      );
    }

    // Compact variant (default)
    return (
      <UserListItemCompact
        key={user.id}
        user={user}
        selected={isSelected}
        selectionMode={selectionMode}
        onSelect={handleSelect}
        onClick={onUserClick}
        showCheckbox={showCheckbox}
      />
    );
  };

  return (
    <Box sx={styles.listView}>
      <List dense={dense}>
        {users.map((user) => renderUserItem(user))}
      </List>
    </Box>
  );
};

export default ListView;

