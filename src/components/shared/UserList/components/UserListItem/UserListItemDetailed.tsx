/**
 * UserListItemDetailed Component
 * 
 * Detailed user list item renderer with additional information
 * 
 * @module UserList/components/UserListItem/UserListItemDetailed
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
  Typography,
  useTheme,
} from '@mui/material';
import type Reactory from '@reactory/reactory-core';
import type { UserListItemProps } from '../../types';
import { getUserListStyles } from '../../styles/userList.styles';

export interface UserListItemDetailedProps extends UserListItemProps {
  showBusinessUnit?: boolean;
  showRoles?: boolean;
  showLastLogin?: boolean;
}

export const UserListItemDetailed: React.FC<UserListItemDetailedProps> = ({
  user,
  selected,
  selectionMode,
  onSelect,
  onClick,
  showCheckbox,
  showBusinessUnit = true,
  showRoles = true,
  showLastLogin = true,
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
    return undefined;
  };

  const getAvatarContent = () => {
    if (!user.avatar) {
      const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
      return initials || '?';
    }
    return undefined;
  };

  const formatLastLogin = () => {
    if (!user.lastLogin) return 'Never logged in';
    
    const date = new Date(user.lastLogin as string | number | Date);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <ListItem
      onClick={handleClick}
      sx={{
        ...styles.listView['& .MuiListItem-root'],
        padding: theme.spacing(2),
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
          sx={{ width: 56, height: 56, mr: 2 }}
        >
          {getAvatarContent()}
        </Avatar>
      </ListItemAvatar>

      <ListItemText
        primary={
          <Box>
            <Typography variant="h6" component="span">
              {user.fullName || `${user.firstName} ${user.lastName}`}
            </Typography>
            {user.deleted && (
              <Chip
                label="Deleted"
                size="small"
                color="error"
                sx={{ ml: 1, height: 20 }}
              />
            )}
          </Box>
        }
        secondary={
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>

            {showBusinessUnit && (user.businessUnit as any)?.name && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {(user.businessUnit as any).name}
              </Typography>
            )}

            {showRoles && user.roles && Array.isArray(user.roles) && user.roles.length > 0 && (
              <Box sx={styles.userItemRoles}>
                {user.roles.map((role, index) => (
                  <Chip
                    key={index}
                    label={role}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}

            {showLastLogin && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Last login: {formatLastLogin()}
              </Typography>
            )}
          </Box>
        }
        sx={styles.userItemContent}
      />
    </ListItem>
  );
};

export default UserListItemDetailed;

