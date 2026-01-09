/**
 * ActionButtons Component
 * 
 * Action buttons for user list toolbar (add, delete, refresh, etc.)
 * 
 * @module UserList/components/UserListToolbar/ActionButtons
 */

import React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Add,
  Delete,
  Refresh,
  ClearAll,
  ViewList,
  ViewModule,
  ViewComfy,
} from '@mui/icons-material';
import type { ViewMode } from '../../types';

export interface ActionButtonsProps {
  // View mode
  viewMode: ViewMode;
  allowViewModeChange: boolean;
  onViewModeChange: (mode: ViewMode) => void;

  // Add user
  enableAddUser: boolean;
  onAddUser?: () => void;

  // Delete users
  enableDeleteUsers: boolean;
  onDeleteUsers?: () => void;
  canDelete: boolean;

  // Selection
  selectedCount: number;
  onClearSelection?: () => void;

  // Refresh
  onRefresh?: () => void;
  isRefreshing: boolean;

  // Custom actions
  customActions?: React.ReactNode;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  viewMode,
  allowViewModeChange,
  onViewModeChange,
  enableAddUser,
  onAddUser,
  enableDeleteUsers,
  onDeleteUsers,
  canDelete,
  selectedCount,
  onClearSelection,
  onRefresh,
  isRefreshing,
  customActions,
}) => {
  const renderViewModeButton = (mode: ViewMode, Icon: typeof ViewList, label: string) => (
    <Tooltip title={label}>
      <IconButton
        size="small"
        onClick={() => onViewModeChange(mode)}
        color={viewMode === mode ? 'primary' : 'default'}
        aria-label={label}
        aria-pressed={viewMode === mode}
      >
        <Icon />
      </IconButton>
    </Tooltip>
  );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {/* View mode toggle */}
      {allowViewModeChange && (
        <Box sx={{ display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          {renderViewModeButton('list', ViewList, 'List view')}
          {renderViewModeButton('grid', ViewModule, 'Grid view')}
          {renderViewModeButton('cards', ViewComfy, 'Card view')}
        </Box>
      )}

      {/* Clear selection */}
      {selectedCount > 0 && onClearSelection && (
        <Tooltip title="Clear selection">
          <IconButton
            size="small"
            onClick={onClearSelection}
            aria-label="clear selection"
          >
            <Badge badgeContent={selectedCount} color="primary">
              <ClearAll />
            </Badge>
          </IconButton>
        </Tooltip>
      )}

      {/* Delete users */}
      {enableDeleteUsers && selectedCount > 0 && canDelete && onDeleteUsers && (
        <Tooltip title={`Delete ${selectedCount} user${selectedCount > 1 ? 's' : ''}`}>
          <IconButton
            size="small"
            color="error"
            onClick={onDeleteUsers}
            aria-label="delete selected users"
          >
            <Delete />
          </IconButton>
        </Tooltip>
      )}

      {/* Refresh */}
      {onRefresh && (
        <Tooltip title="Refresh">
          <IconButton
            size="small"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="refresh user list"
          >
            <Refresh className={isRefreshing ? 'rotating' : ''} />
          </IconButton>
        </Tooltip>
      )}

      {/* Add user */}
      {enableAddUser && onAddUser && (
        <Tooltip title="Add user">
          <IconButton
            size="small"
            color="primary"
            onClick={onAddUser}
            aria-label="add new user"
          >
            <Add />
          </IconButton>
        </Tooltip>
      )}

      {/* Custom actions */}
      {customActions}
    </Box>
  );
};

export default ActionButtons;

