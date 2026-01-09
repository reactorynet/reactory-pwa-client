/**
 * UserListItemCompact Component
 * 
 * Compact user list item renderer with minimal information
 * 
 * @module UserList/components/UserListItem/UserListItemCompact
 */

import React from 'react';
import {
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Checkbox,
  Chip,
  Box,
  useTheme,
} from '@mui/material';
import type Reactory from '@reactory/reactory-core';
import type { UserListItemProps } from '../../types';
import { getUserListStyles } from '../../styles/userList.styles';

export const UserListItemCompact: React.FC<UserListItemProps> = ({
  user,
  selected,
  selectionMode,
  onSelect,
  onClick,
  showCheckbox,
}) => {
  const theme = useTheme();
  const styles = getUserListStyles(theme);

  const handleClick = () => {
    if (onClick) {
      onClick(user);
    } else if (selectionMode !== 'none') {
      onSelect(user);
    }
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    onSelect(user);
  };

  const getAvatarSrc = () => {
    if (user.avatar) {
      return user.avatar;
    }
    // Generate avatar from initials
    return undefined;
  };

  const getAvatarContent = () => {
    if (!user.avatar) {
      const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
      return initials || '?';
    }
    return undefined;
  };

  return (
    <ListItem
      onClick={handleClick}
      sx={{
        ...styles.listView['& .MuiListItem-root'],
        cursor: 'pointer',
      }}
    >
      {showCheckbox && selectionMode === 'multiple' && (
        <Checkbox
          checked={selected}
          onChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          inputProps={{
            'aria-label': `Select ${user.fullName}`,
          }}
        />
      )}

      <ListItemAvatar>
        <Avatar
          src={getAvatarSrc()}
          alt={String(user.fullName || '')}
          sx={styles.userItemAvatar}
        >
          {getAvatarContent()}
        </Avatar>
      </ListItemAvatar>

      <ListItemText
        primary={user.fullName || `${user.firstName} ${user.lastName}`}
        secondary={
          <Box component="span" sx={styles.userItemSecondary}>
            <span>{user.email}</span>
            {user.deleted && (
              <Chip
                label="Deleted"
                size="small"
                color="error"
                sx={{ height: 20 }}
              />
            )}
          </Box>
        }
        sx={styles.userItemContent}
      />

      {user.roles && Array.isArray(user.roles) && user.roles.length > 0 && user.roles[0] !== 'USER' && (
        <Chip
          label={user.roles[0]}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ ml: 1 }}
        />
      )}
    </ListItem>
  );
};

export default UserListItemCompact;

