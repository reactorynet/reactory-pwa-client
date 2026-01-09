/**
 * UserList Module Exports
 * @module UserList
 */

// Main component
export { UserList } from './UserList';
export { default } from './UserList';
export { AccessibleUserList } from './components/AccessibleUserList';

// Types
export type {
  UserListProps,
  UserListConfig,
  SelectionMode,
  ViewMode,
  ItemVariant,
  QuickFilter,
  AdvancedFilter,
  FilterOperator,
  PredefinedFilter,
  CustomItemRenderer,
  ItemRendererOptions,
  FilterPreset,
  PagingRequest,
  PagingResult,
  UserListQueryVariables,
  UserListQueryResult,
} from './types';

// Hooks
export {
  useUserSelection,
  useUserFilters,
  useUserQuery,
  useAccessibility,
} from './hooks';

// Components (for advanced customization)
export { UserListToolbar } from './components/UserListToolbar';
export { UserListContent } from './components/UserListContent';
export { UserListPagination } from './components/UserListPagination';
export { UserListItemCompact, UserListItemDetailed } from './components/UserListItem';
export { QuickFilters, AdvancedFilters } from './components/Filters';

// GraphQL
export * from './graphql';

// Utils
export * from './utils';

// Styles
export { getUserListStyles } from './styles/userList.styles';

