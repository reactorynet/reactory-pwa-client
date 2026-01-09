/**
 * UserListToolbar Component
 * 
 * Main toolbar containing search, filters, view mode toggle, and actions
 * 
 * @module UserList/components/UserListToolbar
 */

import React from 'react';
import { Box, Divider, useTheme } from '@mui/material';
import type { UserListToolbarProps } from '../../types';
import { SearchBar } from './SearchBar';
import { ActionButtons } from './ActionButtons';
import { QuickFilters } from '../Filters/QuickFilters';
import { AdvancedFilters } from '../Filters/AdvancedFilters';
import { getUserListStyles } from '../../styles/userList.styles';

export const UserListToolbar: React.FC<UserListToolbarProps> = ({
  enableSearch,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  enableQuickFilters,
  quickFilters,
  activeQuickFilters,
  onQuickFilterToggle,
  enableAdvancedFilters,
  advancedFilterFields,
  advancedFilters,
  onAdvancedFilterChange,
  viewMode,
  allowViewModeChange,
  onViewModeChange,
  enableAddUser,
  onAddUser,
  enableDeleteUsers,
  onDeleteUsers,
  canDelete,
  selectedCount,
  totalCount,
  customActions,
  onRefresh,
  isRefreshing,
}) => {
  const theme = useTheme();
  const styles = getUserListStyles(theme);

  const handleClearSelection = () => {
    // This will be wired up when we integrate with the main component
  };

  return (
    <Box sx={styles.toolbar}>
      {/* Top row: Search and primary actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, width: '100%' }}>
        {/* Search */}
        {enableSearch && (
          <SearchBar
            value={searchValue}
            placeholder={searchPlaceholder}
            onChange={onSearchChange}
          />
        )}

        {/* Spacer */}
        <Box sx={{ flex: 1, minWidth: 20 }} />

        {/* Actions */}
        <ActionButtons
          viewMode={viewMode}
          allowViewModeChange={allowViewModeChange}
          onViewModeChange={onViewModeChange}
          enableAddUser={enableAddUser}
          onAddUser={onAddUser}
          enableDeleteUsers={enableDeleteUsers}
          onDeleteUsers={onDeleteUsers}
          canDelete={canDelete}
          selectedCount={selectedCount}
          onClearSelection={handleClearSelection}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          customActions={customActions}
        />
      </Box>

      {/* Bottom row: Quick filters (if enabled) */}
      {enableQuickFilters && quickFilters && quickFilters.length > 0 && (
        <>
          <Divider sx={{ width: '100%' }} />
          <Box sx={styles.toolbarSection}>
            <QuickFilters
              filters={quickFilters}
              activeFilters={new Set(activeQuickFilters)}
              onToggle={onQuickFilterToggle}
            />
          </Box>
        </>
      )}

      {/* Advanced filters */}
      {enableAdvancedFilters && advancedFilterFields && advancedFilterFields.length > 0 && (
        <>
          <Divider sx={{ width: '100%' }} />
          <Box sx={styles.toolbarSection}>
            <AdvancedFilters
              fields={advancedFilterFields}
              filters={advancedFilters}
              onChange={onAdvancedFilterChange}
            />
          </Box>
        </>
      )}
    </Box>
  );
};

export default UserListToolbar;

