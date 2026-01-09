/**
 * UserList Component
 * 
 * Main container component for displaying and managing user lists
 * with search, filters, selection, and multiple view modes.
 * 
 * @module UserList
 */

import React, { useEffect, useCallback } from 'react';
import { Box, useTheme } from '@mui/material';
import type Reactory from '@reactory/reactory-core';
import type { UserListProps } from './types';
import { useUserSelection, useUserFilters, useUserQuery } from './hooks';
import { UserListToolbar } from './components/UserListToolbar';
import { UserListContent } from './components/UserListContent';
import { UserListPagination } from './components/UserListPagination';
import { getUserListStyles } from './styles/userList.styles';

/**
 * UserList Component
 * 
 * A comprehensive user list component with:
 * - Multiple selection modes (none, single, multiple)
 * - Search and filtering capabilities
 * - Multiple view modes (list, grid, cards)
 * - Pagination
 * - Custom rendering options
 * - GraphQL integration
 */
export const UserList: React.FC<UserListProps> = (props) => {
  const {
    // Selection
    selectionMode = 'none',
    initialSelected = [],
    onSelectionChange,
    maxSelection,

    // View and display
    viewMode = 'list',
    allowViewModeChange = true,
    itemVariant = 'compact',
    dense = false,
    height,

    // Search
    enableSearch = true,
    initialSearchString = '',
    searchPlaceholder = 'Search users...',
    onSearchChange,

    // Filters
    enableQuickFilters = false,
    quickFilters = [],
    initialQuickFilters = [],
    enableAdvancedFilters = false,
    advancedFilterFields = [],
    initialAdvancedFilters = [],
    onFilterChange,

    // Pagination
    initialPage = 1,
    initialPageSize = 25,
    pageSizeOptions = [10, 25, 50, 100],
    onPageChange,

    // Actions
    enableAddUser = false,
    onAddUser,
    enableDeleteUsers = false,
    onDeleteUsers,
    canDelete = false,
    customActions,

    // Events
    onUserSelect,
    onUserClick,
    onRefresh,

    // Data
    query,
    pollInterval,
    skip = false,

    // Customization
    customEmptyState,
    emptyStateMessage,
    customItemRenderer,
    customLoadingState,

    // GraphQL options
    context,
  } = props;

  const theme = useTheme();
  const styles = getUserListStyles(theme);

  // Initialize hooks
  const {
    selectedIds,
    selectedUsers,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
  } = useUserSelection({
    mode: selectionMode,
    initialSelected,
    maxSelection,
    onSelectionChange,
  });

  const {
    quickFilters: activeQuickFilters,
    advancedFilters: activeAdvancedFilters,
    toggleQuickFilter,
    setAdvancedFilter,
    clearFilters,
    hasActiveFilters,
  } = useUserFilters({
    quickFilters,
    initialQuickFilters,
    advancedFilterFields,
    initialAdvancedFilters,
    onFilterChange,
  });

  const {
    users,
    loading,
    error,
    totalCount,
    page,
    pageSize,
    searchString,
    setPage,
    setPageSize,
    setSearchString,
    refetch,
  } = useUserQuery({
    query,
    initialPage,
    initialPageSize,
    initialSearchString,
    quickFilters: activeQuickFilters,
    advancedFilters: activeAdvancedFilters,
    pollInterval,
    skip,
    context,
  });

  // Internal state for view mode
  const [currentViewMode, setCurrentViewMode] = React.useState(viewMode);

  // Handle search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchString(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  }, [setSearchString, onSearchChange]);

  // Handle view mode changes
  const handleViewModeChange = useCallback((mode: typeof viewMode) => {
    setCurrentViewMode(mode);
  }, []);

  // Handle page changes
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    if (onPageChange) {
      onPageChange(newPage, pageSize);
    }
  }, [setPage, onPageChange, pageSize]);

  // Handle page size changes
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page
    if (onPageChange) {
      onPageChange(1, newPageSize);
    }
  }, [setPageSize, setPage, onPageChange]);

  // Handle user selection
  const handleUserSelect = useCallback((userId: string, user: Reactory.Models.IUser) => {
    toggleSelection(userId, user);
    if (onUserSelect) {
      onUserSelect(user);
    }
  }, [toggleSelection, onUserSelect]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetch();
    if (onRefresh) {
      onRefresh();
    }
  }, [refetch, onRefresh]);

  // Handle delete users
  const handleDeleteUsers = useCallback(() => {
    if (onDeleteUsers && selectedUsers.length > 0) {
      onDeleteUsers(selectedUsers);
    }
  }, [onDeleteUsers, selectedUsers]);

  // Clear selection when selection mode changes
  useEffect(() => {
    if (selectionMode === 'none') {
      clearSelection();
    }
  }, [selectionMode, clearSelection]);

  // Convert selectedIds Set to array for rendering
  const selectedIdsSet = selectedIds;

  return (
    <Box
      sx={styles.container}
      role="region"
      aria-label="User list"
      aria-busy={loading}
    >
      {/* Toolbar */}
      <UserListToolbar
        enableSearch={enableSearch}
        searchValue={searchString}
        searchPlaceholder={searchPlaceholder}
        onSearchChange={handleSearchChange}
        enableQuickFilters={enableQuickFilters}
        quickFilters={quickFilters}
        activeQuickFilters={Array.from(activeQuickFilters)}
        onQuickFilterToggle={toggleQuickFilter}
        enableAdvancedFilters={enableAdvancedFilters}
        advancedFilterFields={advancedFilterFields}
        advancedFilters={activeAdvancedFilters}
        onAdvancedFilterChange={(filters) => {
          // Handle array of filters
          filters.forEach(filter => {
            setAdvancedFilter(filter.field, filter.value, filter.operator);
          });
        }}
        viewMode={currentViewMode}
        allowViewModeChange={allowViewModeChange}
        onViewModeChange={handleViewModeChange}
        enableAddUser={enableAddUser}
        onAddUser={onAddUser}
        enableDeleteUsers={enableDeleteUsers}
        onDeleteUsers={handleDeleteUsers}
        canDelete={canDelete && selectedUsers.length > 0}
        selectedCount={selectedUsers.length}
        totalCount={totalCount}
        customActions={customActions}
        onRefresh={handleRefresh}
        isRefreshing={loading}
      />

      {/* Content */}
      <UserListContent
        users={users}
        viewMode={currentViewMode}
        itemVariant={itemVariant}
        selectionMode={selectionMode}
        selected={selectedIdsSet}
        onUserSelect={handleUserSelect}
        onUserClick={onUserClick}
        isLoading={loading}
        isEmpty={!loading && users.length === 0}
        emptyStateMessage={emptyStateMessage}
        customEmptyState={customEmptyState}
        customItemRenderer={customItemRenderer}
        height={height}
        dense={dense}
      />

      {/* Pagination */}
      {!loading && users.length > 0 && (
        <UserListPagination
          page={page}
          pageSize={pageSize}
          total={totalCount}
          pageSizeOptions={pageSizeOptions}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          variant="standard"
        />
      )}

      {/* Error display (basic for now) */}
      {error && (
        <Box sx={{ p: 2, color: 'error.main' }}>
          Error loading users: {error.message}
        </Box>
      )}
    </Box>
  );
};

export default UserList;

