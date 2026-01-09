/**
 * EmptyState Component
 * 
 * Displays empty state message when no users are found
 * 
 * @module UserList/components/UserListContent/EmptyState
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { PersonOff } from '@mui/icons-material';
import { getUserListStyles } from '../../styles/userList.styles';

export interface EmptyStateProps {
  message?: string;
  customEmptyState?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message = 'No users found',
  customEmptyState,
}) => {
  const theme = useTheme();
  const styles = getUserListStyles(theme);

  if (customEmptyState) {
    return <>{customEmptyState}</>;
  }

  return (
    <Box sx={styles.contentEmpty}>
      <PersonOff sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
      <Typography variant="h6" color="text.secondary">
        {message}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Try adjusting your search or filters
      </Typography>
    </Box>
  );
};

export default EmptyState;

