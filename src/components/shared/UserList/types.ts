/**
 * TypeScript type definitions for UserList component
 * @module UserList/types
 */

import type Reactory from '@reactory/reactory-core';

// ============================================================================
// Selection Types
// ============================================================================

export type SelectionMode = 'single' | 'multiple' | 'none';

export interface SelectionState {
  selectedIds: Set<string>;
  selectedUsers: Map<string, Reactory.Models.IUser>;
  excludedIds: Set<string>;
  mode: SelectionMode;
}

// ============================================================================
// View Types
// ============================================================================

export type ViewMode = 'list' | 'grid' | 'cards';
export type ItemVariant = 'compact' | 'detailed' | 'custom';

// ============================================================================
// Filter Types
// ============================================================================

export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not-in'
  | 'contains'
  | 'starts-with'
  | 'ends-with'
  | 'between'
  | 'after'
  | 'before'
  | 'is-null'
  | 'is-not-null'
  | 'within-last';

// Alias for backward compatibility
export type QuickFilter = QuickFilterDefinition;

export interface QuickFilterDefinition {
  id: string;
  label: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  badge?: number | string;
  filter: {
    field: string;
    value: any;
    operator: FilterOperator;
    additionalFilters?: Record<string, any>;
  };
}

export type AdvancedFilterFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'text'
  | 'select'
  | 'multiselect'
  | 'daterange';

export interface AdvancedFilterField {
  field: string;
  label: string;
  type: AdvancedFilterFieldType;
  operators: FilterOperator[];
  options?: { label: string; value: any }[];
  defaultOperator?: FilterOperator;
  placeholder?: string;
  helpText?: string;
}

export interface AdvancedFilter {
  id: string;
  field: string;
  value: any;
  operator: FilterOperator;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: AdvancedFilter[];
  createdAt: Date;
  isDefault?: boolean;
}

export interface UserFilterInput {
  organizationId?: string;
  businessUnitId?: string;
  teamId?: string;
  roles?: string[];
  includeDeleted?: boolean;
  searchString?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
  firstName?: string;
  lastName?: string;
  email?: string;
  customFilters?: Record<string, any>;
}

// ============================================================================
// Bulk Actions Types
// ============================================================================

export interface BulkActionDefinition {
  id: string;
  label: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'error' | 'warning';
  confirmRequired?: boolean;
  confirmMessage?: string;
  handler: (users: Reactory.Models.IUser[]) => void | Promise<void>;
  isEnabled?: (users: Reactory.Models.IUser[]) => boolean;
}

// ============================================================================
// Rendering Types
// ============================================================================

export interface ItemRendererOptions {
  selected: boolean;
  selectionMode: SelectionMode;
  showCheckbox: boolean;
  onSelect: (user: Reactory.Models.IUser) => void;
  onClick?: (user: Reactory.Models.IUser) => void;
  viewMode: ViewMode;
  itemVariant: ItemVariant;
}

export type CustomItemRenderer = (
  user: Reactory.Models.IUser,
  options: ItemRendererOptions
) => React.ReactNode;

// ============================================================================
// Component Props
// ============================================================================

export interface UserListProps {
  // Required
  query: any; // GraphQL DocumentNode

  // Selection Configuration
  selectionMode?: SelectionMode;
  initialSelected?: Reactory.Models.IUser[];
  maxSelection?: number;
  onSelectionChange?: (selected: Reactory.Models.IUser[]) => void;
  onUserSelect?: (user: Reactory.Models.IUser) => void;

  // View Configuration
  viewMode?: ViewMode;
  allowViewModeChange?: boolean;
  itemVariant?: ItemVariant;
  dense?: boolean;
  height?: string | number;

  // Search
  enableSearch?: boolean;
  initialSearchString?: string;
  searchPlaceholder?: string;
  onSearchChange?: (searchString: string) => void;

  // Filters
  enableQuickFilters?: boolean;
  quickFilters?: QuickFilterDefinition[];
  initialQuickFilters?: string[];
  enableAdvancedFilters?: boolean;
  advancedFilterFields?: AdvancedFilterField[];
  initialAdvancedFilters?: AdvancedFilter[];
  onFilterChange?: (filters: { quick: Set<string>; advanced: AdvancedFilter[] }) => void;

  // Pagination
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number, pageSize: number) => void;

  // Actions
  enableAddUser?: boolean;
  onAddUser?: () => void;
  enableDeleteUsers?: boolean;
  onDeleteUsers?: (users: Reactory.Models.IUser[]) => void;
  canDelete?: boolean;
  customActions?: React.ReactNode;

  // Events
  onUserClick?: (user: Reactory.Models.IUser) => void;
  onRefresh?: () => void;

  // Data
  pollInterval?: number;
  skip?: boolean;

  // Customization
  customEmptyState?: React.ReactNode;
  emptyStateMessage?: string;
  customItemRenderer?: CustomItemRenderer;
  customLoadingState?: React.ReactNode;

  // GraphQL options
  context?: Record<string, any>;
}

// ============================================================================
// Hook Types
// ============================================================================

export interface UseUserSelectionOptions {
  mode: SelectionMode;
  initialSelected?: Reactory.Models.IUser[];
  maxSelection?: number;
  onSelectionChange?: (selected: Reactory.Models.IUser[]) => void;
}

export interface UseUserSelectionResult {
  selectedIds: Set<string>;
  selectedUsers: Reactory.Models.IUser[];
  toggleSelection: (userId: string, user: Reactory.Models.IUser) => void;
  selectAll: (users: Reactory.Models.IUser[]) => void;
  clearSelection: () => void;
  isSelected: (userId: string) => boolean;
}

export interface UseUserFiltersOptions {
  quickFilters?: QuickFilterDefinition[];
  initialQuickFilters?: string[];
  advancedFilterFields?: AdvancedFilterField[];
  initialAdvancedFilters?: AdvancedFilter[];
  onFilterChange?: (filters: { quick: Set<string>; advanced: AdvancedFilter[] }) => void;
}

export interface UseUserFiltersResult {
  quickFilters: Set<string>;
  advancedFilters: AdvancedFilter[];
  toggleQuickFilter: (filterId: string) => void;
  setAdvancedFilter: (field: string, value: any, operator: FilterOperator) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  savePreset: (name: string) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  presets: FilterPreset[];
}

export interface UseUserQueryOptions {
  query: any;
  initialPage?: number;
  initialPageSize?: number;
  initialSearchString?: string;
  quickFilters?: Set<string>;
  advancedFilters?: AdvancedFilter[];
  pollInterval?: number;
  skip?: boolean;
  context?: Record<string, any>;
}

export interface UseUserQueryResult {
  users: Reactory.Models.IUser[];
  loading: boolean;
  error: any;
  totalCount: number;
  page: number;
  pageSize: number;
  searchString: string;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearchString: (search: string) => void;
  refetch: () => void;
}

export interface UseUserListOptions {
  // Initial state
  initialPage?: number;
  initialPageSize?: number;
  initialViewMode?: ViewMode;
  initialFilters?: UserFilterInput;

  // Configuration
  selectionMode: SelectionMode;
  enableSearch: boolean;
  enableFilters: boolean;
  enablePagination: boolean;

  // Data source
  organizationId?: string;
  predefinedFilters?: UserFilterInput;

  // Callbacks
  onSelectionChange?: (selected: Reactory.Models.IUser[]) => void;
}

export interface UseUserListResult {
  // Data
  users: Reactory.Models.IUser[];
  totalCount: number;
  isLoading: boolean;
  error: Error | null;

  // Pagination
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Search
  searchValue: string;
  setSearchValue: (value: string) => void;

  // Filters
  quickFilters: string[];
  toggleQuickFilter: (filterId: string) => void;
  advancedFilters: AdvancedFilter[];
  setAdvancedFilters: (filters: AdvancedFilter[]) => void;
  clearFilters: () => void;

  // Selection
  selected: Set<string>;
  selectUser: (userId: string, user: Reactory.Models.IUser) => void;
  deselectUser: (userId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  toggleUser: (userId: string, user: Reactory.Models.IUser) => void;

  // View
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Actions
  refresh: () => void;
  refetch: () => void;
}

// ============================================================================
// Subcomponent Props
// ============================================================================

export interface UserListToolbarProps {
  // Search
  enableSearch: boolean;
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;

  // Filters
  enableQuickFilters: boolean;
  quickFilters?: QuickFilterDefinition[];
  activeQuickFilters: string[];
  onQuickFilterToggle: (filterId: string) => void;

  enableAdvancedFilters: boolean;
  advancedFilterFields?: AdvancedFilterField[];
  advancedFilters: AdvancedFilter[];
  onAdvancedFilterChange: (filters: AdvancedFilter[]) => void;

  // View Mode
  viewMode: ViewMode;
  allowViewModeChange: boolean;
  onViewModeChange: (mode: ViewMode) => void;

  // Actions
  enableAddUser: boolean;
  onAddUser?: () => void;

  enableDeleteUsers: boolean;
  onDeleteUsers?: () => void;
  canDelete: boolean;

  selectedCount: number;
  totalCount: number;

  // Custom Actions
  customActions?: React.ReactNode;

  // Refresh
  onRefresh?: () => void;
  isRefreshing: boolean;
}

export interface UserListContentProps {
  users: Reactory.Models.IUser[];
  viewMode: ViewMode;
  itemVariant: ItemVariant;

  // Selection
  selectionMode: SelectionMode;
  selected: Set<string>;
  onUserSelect: (userId: string, user: Reactory.Models.IUser) => void;

  // Events
  onUserClick?: (user: Reactory.Models.IUser) => void;
  onUserDoubleClick?: (user: Reactory.Models.IUser) => void;

  // Loading/Empty States
  isLoading: boolean;
  isEmpty: boolean;
  emptyStateMessage?: string;
  customEmptyState?: React.ReactNode;

  // Customization
  customItemRenderer?: CustomItemRenderer;

  // Styling
  height?: string | number;
  dense?: boolean;
}

export interface UserListItemProps {
  user: Reactory.Models.IUser;
  selected: boolean;
  selectionMode: SelectionMode;
  onSelect: (user: Reactory.Models.IUser) => void;
  onClick?: (user: Reactory.Models.IUser) => void;
  showCheckbox: boolean;
}

export interface UserListPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  variant?: 'standard' | 'compact';
}

export interface UserSelectionSummaryProps {
  selectedCount: number;
  totalCount: number;
  selectionMode: SelectionMode;
  onClearSelection: () => void;
  onSelectAll?: () => void;
  onConfirmSelection?: () => void;
  bulkActions?: BulkActionDefinition[];
}

// Backward compatibility aliases
export type PredefinedFilter = QuickFilterDefinition;
export type UserListConfig = UserListProps;
export type PagingRequest = { page: number; pageSize: number };
export type PagingResult = { page: number; pageSize: number; total: number; hasNext: boolean };
export type UserListQueryVariables = any;
export type UserListQueryResult = any;

