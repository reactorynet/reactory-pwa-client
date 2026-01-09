# UserList Component Specification

**Version:** 2.0.0  
**Namespace:** core  
**Component Name:** UserList  
**Location:** `/src/components/shared/UserList/`  
**Created:** January 7, 2026  
**Status:** Draft

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Component Structure](#component-structure)
4. [Props & Configuration](#props--configuration)
5. [Subcomponents](#subcomponents)
6. [Features](#features)
7. [State Management](#state-management)
8. [GraphQL Integration](#graphql-integration)
9. [Filtering System](#filtering-system)
10. [Selection Management](#selection-management)
11. [Styling & Theming](#styling--theming)
12. [Accessibility](#accessibility)
13. [Usage Examples](#usage-examples)
14. [Migration Path](#migration-path)

---

## Overview

The `UserList` component is a comprehensive, highly configurable user selection and display component for the Reactory PWA application. It replaces the legacy `UserListWithSearch` component with a modern, modular architecture that supports:

- Single and multi-user selection
- Advanced filtering (quick filters, search, and advanced filters)
- Multiple view modes (list, grid, cards)
- Pagination
- Real-time updates
- Customizable rendering
- Integration with the existing Reactory component ecosystem

### Design Principles

1. **Modularity**: Break down into focused subcomponents
2. **Reusability**: Share components across different contexts
3. **Configurability**: Support extensive customization without code changes
4. **Performance**: Efficient rendering with large datasets
5. **Accessibility**: Full keyboard navigation and screen reader support
6. **Consistency**: Follow Material-UI v6 patterns and Reactory conventions

---

## Architecture

### Component Hierarchy

```
UserList/
├── index.tsx                    # Main component export
├── UserList.tsx                 # Container component
├── types.ts                     # TypeScript definitions
├── hooks/
│   ├── useUserList.ts          # Main state management hook
│   ├── useUserSelection.ts     # Selection logic
│   ├── useUserFilters.ts       # Filter management
│   └── useUserQuery.ts         # GraphQL query management
├── components/
│   ├── UserListToolbar/
│   │   ├── index.tsx           # Toolbar container
│   │   ├── SearchBar.tsx       # Search input
│   │   ├── FilterControls.tsx  # Filter buttons/chips
│   │   └── ActionButtons.tsx   # Action buttons (add, delete, etc)
│   ├── UserListContent/
│   │   ├── index.tsx           # Content container
│   │   ├── ListView.tsx        # List view renderer
│   │   ├── GridView.tsx        # Grid view renderer
│   │   ├── CardView.tsx        # Card view renderer
│   │   └── EmptyState.tsx      # Empty/loading states
│   ├── UserListItem/
│   │   ├── index.tsx           # Item wrapper
│   │   ├── UserListItemCompact.tsx    # Compact list item
│   │   ├── UserListItemDetailed.tsx   # Detailed list item
│   │   ├── UserCard.tsx               # Card item
│   │   └── UserGridItem.tsx           # Grid item
│   ├── UserListFilters/
│   │   ├── QuickFilters.tsx    # Quick filter chips/buttons
│   │   ├── AdvancedFilters.tsx # Advanced filter panel
│   │   └── FilterPresets.tsx   # Filter preset management
│   ├── UserListPagination/
│   │   └── index.tsx           # Pagination controls
│   └── UserSelectionSummary/
│       └── index.tsx           # Selection summary/actions
├── utils/
│   ├── filterUtils.ts          # Filter processing utilities
│   ├── sortUtils.ts            # Sorting utilities
│   └── userUtils.ts            # User data utilities
├── graphql/
│   ├── queries.ts              # GraphQL queries
│   └── fragments.ts            # GraphQL fragments
└── styles/
    └── userList.styles.ts      # Shared styles
```

---

## Component Structure

### Main Component: UserList

**File:** `UserList.tsx`

The main container component that orchestrates all subcomponents and manages the overall state.

```typescript
interface UserListProps extends Reactory.IReactoryComponentProps {
  // Selection Configuration
  selectionMode?: 'single' | 'multiple' | 'none';
  selected?: Reactory.Models.IUser[];
  excluded?: Reactory.Models.IUser[];
  onSelectionChange?: (selected: Reactory.Models.IUser[]) => void;
  onUserSelect?: (user: Reactory.Models.IUser) => void;
  
  // View Configuration
  viewMode?: 'list' | 'grid' | 'cards';
  defaultViewMode?: 'list' | 'grid' | 'cards';
  allowViewModeChange?: boolean;
  itemVariant?: 'compact' | 'detailed' | 'custom';
  
  // Filter Configuration
  enableSearch?: boolean;
  searchPlaceholder?: string;
  enableQuickFilters?: boolean;
  quickFilters?: QuickFilterDefinition[];
  enableAdvancedFilters?: boolean;
  advancedFilterFields?: AdvancedFilterField[];
  predefinedFilters?: UserFilterInput;
  
  // Pagination Configuration
  enablePagination?: boolean;
  page?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  
  // Data Configuration
  organizationId?: string;
  businessUnitId?: string;
  teamId?: string;
  roles?: string[];
  includeDeleted?: boolean;
  
  // Action Configuration
  enableAddUser?: boolean;
  onAddUser?: () => void;
  enableDeleteUsers?: boolean;
  onDeleteUsers?: (users: Reactory.Models.IUser[]) => void;
  enableBulkActions?: boolean;
  bulkActions?: BulkActionDefinition[];
  
  // Customization
  customItemRenderer?: (user: Reactory.Models.IUser, options: ItemRendererOptions) => React.ReactNode;
  customToolbarActions?: React.ReactNode;
  customEmptyState?: React.ReactNode;
  
  // Event Handlers
  onUserClick?: (user: Reactory.Models.IUser) => void;
  onUserDoubleClick?: (user: Reactory.Models.IUser) => void;
  onUserContextMenu?: (user: Reactory.Models.IUser, event: React.MouseEvent) => void;
  
  // Real-time Updates
  refreshEvents?: string[];
  autoRefresh?: boolean;
  autoRefreshInterval?: number;
  
  // Styling
  height?: string | number;
  maxHeight?: string | number;
  compact?: boolean;
  dense?: boolean;
}
```

---

## Props & Configuration

### Selection Configuration

#### `selectionMode: 'single' | 'multiple' | 'none'`
- **Default:** `'none'`
- **Description:** Controls how users can be selected
  - `'single'`: Only one user can be selected at a time
  - `'multiple'`: Multiple users can be selected
  - `'none'`: Selection is disabled

#### `selected: Reactory.Models.IUser[]`
- **Default:** `[]`
- **Description:** Currently selected users (controlled)

#### `onSelectionChange: (selected: Reactory.Models.IUser[]) => void`
- **Description:** Callback fired when selection changes

### View Configuration

#### `viewMode: 'list' | 'grid' | 'cards'`
- **Default:** `'list'`
- **Description:** Current view mode
  - `'list'`: Traditional list view with avatars
  - `'grid'`: Grid of user cards
  - `'cards'`: Detailed card layout

#### `itemVariant: 'compact' | 'detailed' | 'custom'`
- **Default:** `'compact'`
- **Description:** Determines the level of detail shown per user

### Filter Configuration

#### `enableSearch: boolean`
- **Default:** `true`
- **Description:** Enable/disable search bar

#### `quickFilters: QuickFilterDefinition[]`
- **Description:** Quick filter definitions (similar to MaterialTableWidget)

```typescript
interface QuickFilterDefinition {
  id: string;
  label: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  badge?: number | string;
  filter: {
    field: string;
    value: any;
    operator: FilterOperator;
  };
}
```

#### `advancedFilterFields: AdvancedFilterField[]`
- **Description:** Advanced filter field definitions

```typescript
interface AdvancedFilterField {
  field: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'boolean';
  options?: { label: string; value: any }[];
  operators?: FilterOperator[];
  defaultOperator?: FilterOperator;
}
```

#### `predefinedFilters: UserFilterInput`
- **Description:** Filters applied by default (cannot be changed by user)

```typescript
interface UserFilterInput {
  organizationId?: string;
  businessUnitId?: string;
  teamId?: string;
  roles?: string[];
  includeDeleted?: boolean;
  searchString?: string;
  customFilters?: Record<string, any>;
}
```

### Pagination Configuration

#### `enablePagination: boolean`
- **Default:** `true`
- **Description:** Enable/disable pagination

#### `page: number`
- **Default:** `1`
- **Description:** Current page (1-indexed)

#### `pageSize: number`
- **Default:** `25`
- **Description:** Number of items per page

#### `pageSizeOptions: number[]`
- **Default:** `[10, 25, 50, 100]`
- **Description:** Available page size options

---

## Subcomponents

### 1. UserListToolbar

**Location:** `components/UserListToolbar/`

The toolbar component that contains search, filters, and actions.

#### Props
```typescript
interface UserListToolbarProps {
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
```

#### Subcomponents

##### SearchBar
- Text input with search icon
- Debounced search (300ms)
- Clear button when text present
- Keyboard shortcuts (Enter to search, Esc to clear)

##### FilterControls
- Quick filter chips/buttons
- Advanced filter button with badge showing active filter count
- Clear all filters button

##### ActionButtons
- Add user button (if enabled)
- Delete users button (if enabled and users selected)
- Clear selection button (if users selected)
- Confirm selection button (if selection mode active)
- Refresh button
- View mode toggle buttons

---

### 2. UserListContent

**Location:** `components/UserListContent/`

The main content area that renders users in different view modes.

#### Props
```typescript
interface UserListContentProps {
  users: Reactory.Models.IUser[];
  viewMode: ViewMode;
  itemVariant: ItemVariant;
  
  // Selection
  selectionMode: SelectionMode;
  selected: Set<string>; // user IDs
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
  customItemRenderer?: (user: Reactory.Models.IUser, options: ItemRendererOptions) => React.ReactNode;
  
  // Styling
  height?: string | number;
  dense?: boolean;
}
```

#### View Mode Implementations

##### ListView
- Vertical list of users
- Uses Material-UI List components
- Supports compact and detailed variants
- Virtualization for large lists (react-window)

##### GridView
- CSS Grid layout
- Responsive columns (1-6 depending on screen size)
- Square aspect ratio items
- User avatar centered with name overlay

##### CardView
- Material-UI Card components
- More detailed information per user
- 2-3 columns on desktop, 1 on mobile

---

### 3. UserListItem

**Location:** `components/UserListItem/`

Individual user item renderers for different view modes and variants.

#### Variants

##### UserListItemCompact
```typescript
interface UserListItemCompactProps {
  user: Reactory.Models.IUser;
  selected: boolean;
  selectionMode: SelectionMode;
  onSelect: (user: Reactory.Models.IUser) => void;
  onClick?: (user: Reactory.Models.IUser) => void;
  showCheckbox: boolean;
}
```

**Layout:**
- Checkbox (if multi-select)
- Avatar (40px)
- Primary text: Full name
- Secondary text: Email
- Optional: Role badge
- Optional: Status indicator

##### UserListItemDetailed
```typescript
interface UserListItemDetailedProps extends UserListItemCompactProps {
  showBusiness Unit: boolean;
  showRoles: boolean;
  showLastLogin: boolean;
}
```

**Layout:**
- Checkbox (if multi-select)
- Avatar (56px)
- Primary text: Full name
- Secondary text: Email
- Tertiary text: Business unit
- Chip array: Roles
- Last login timestamp (relative)

##### UserCard
```typescript
interface UserCardProps extends UserListItemCompactProps {
  elevation?: number;
  showActions?: boolean;
  actions?: CardActionDefinition[];
}
```

**Layout (Material-UI Card):**
- Card Header: Avatar + Name + Email
- Card Content: Business unit, roles, last login
- Card Actions: Custom action buttons

##### UserGridItem
```typescript
interface UserGridItemProps extends UserListItemCompactProps {
  size?: 'small' | 'medium' | 'large';
}
```

**Layout:**
- Square container
- Avatar (centered, 80-120px depending on size)
- Name overlay (bottom)
- Selection indicator (top-right corner)
- Hover effect with quick actions

---

### 4. UserListFilters

**Location:** `components/UserListFilters/`

Advanced filtering components.

#### QuickFilters

Reuses the pattern from `MaterialTableWidget/components/QuickFilters.tsx`:

```typescript
interface UserQuickFiltersProps {
  filters: QuickFilterDefinition[];
  onFilterChange: (activeFilters: string[]) => void;
  variant?: 'buttons' | 'chips';
  multiSelect?: boolean;
  showClearButton?: boolean;
}
```

**Example Quick Filters:**
- "Active Users" (deleted: false)
- "Admins" (roles includes 'ADMIN')
- "My Business Unit" (businessUnit: currentUser.businessUnit)
- "Recently Active" (lastLogin within 7 days)

#### AdvancedFilters

Similar to `MaterialTableWidget/components/AdvancedFilterPanel`:

```typescript
interface UserAdvancedFiltersProps {
  fields: AdvancedFilterField[];
  filters: AdvancedFilter[];
  onFilterChange: (filters: AdvancedFilter[]) => void;
  open: boolean;
  onClose: () => void;
}
```

**Available Filter Fields:**
- First Name (text, contains/starts-with/ends-with)
- Last Name (text, contains/starts-with/ends-with)
- Email (text, contains/equals)
- Business Unit (multiselect)
- Roles (multiselect)
- Last Login (date range)
- Created Date (date range)
- Status (select: active/deleted)

#### FilterPresets

```typescript
interface FilterPresetsProps {
  presets: FilterPreset[];
  onLoadPreset: (preset: FilterPreset) => void;
  onSavePreset: (name: string, filters: AdvancedFilter[]) => void;
  onDeletePreset: (presetId: string) => void;
}
```

---

### 5. UserListPagination

**Location:** `components/UserListPagination/`

Pagination controls at the bottom of the list.

```typescript
interface UserListPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  variant?: 'standard' | 'compact';
}
```

**Features:**
- Page number input
- Previous/Next buttons
- First/Last page buttons
- Page size selector
- Total count display
- "X-Y of Z" display

---

### 6. UserSelectionSummary

**Location:** `components/UserSelectionSummary/`

Summary bar shown when users are selected (similar to Gmail selection bar).

```typescript
interface UserSelectionSummaryProps {
  selectedCount: number;
  totalCount: number;
  selectionMode: SelectionMode;
  onClearSelection: () => void;
  onSelectAll?: () => void;
  onConfirmSelection?: () => void;
  bulkActions?: BulkActionDefinition[];
}
```

**Layout:**
- Selected count indicator
- "Clear selection" button
- "Select all" checkbox
- Bulk action buttons
- "Confirm selection" button (if in selection mode)

---

## Features

### 1. Selection Management

#### Single Selection
- Click on user to select
- Previous selection automatically cleared
- Visual indicator on selected user

#### Multiple Selection
- Checkbox on each user item
- Click checkbox or user to toggle selection
- "Select all" checkbox in toolbar
- Bulk selection via Shift+Click (range select)
- Excluded users cannot be selected

#### Controlled vs Uncontrolled
- Controlled: Parent manages `selected` state
- Uncontrolled: Component manages internal state

### 2. Filtering System

#### Three-Tier Filtering

1. **Predefined Filters** (fixed, not visible to user)
   - Set via props
   - Cannot be modified
   - Applied first
   - Example: Limit to specific organization

2. **Quick Filters** (one-click toggle)
   - Visible as chips/buttons
   - Single or multi-select
   - Visual indicator when active
   - Combines with other filters

3. **Advanced Filters** (complex criteria)
   - Multi-field filtering
   - Multiple operators per field
   - Save/load filter presets
   - Modal or slide-out panel

#### Filter Operators

Supported operators based on field type:

**Text Fields:**
- `eq` - Equals
- `ne` - Not equals
- `contains` - Contains
- `starts-with` - Starts with
- `ends-with` - Ends with
- `is-null` - Is empty
- `is-not-null` - Is not empty

**Select/Multi-select:**
- `eq` - Equals
- `ne` - Not equals
- `in` - Is one of
- `not-in` - Is not one of

**Date Fields:**
- `eq` - On date
- `before` - Before date
- `after` - After date
- `between` - Between dates
- `within-last` - Within last X days/weeks/months

**Boolean:**
- `eq` - True/False

#### Filter Combination

- All filters combined with AND logic by default
- Within multi-select filters, values combined with OR
- Example: `(role = ADMIN OR role = SUPPORT) AND businessUnit = Engineering AND deleted = false`

### 3. Search

#### Features
- Debounced input (300ms delay)
- Searches across multiple fields:
  - First name
  - Last name
  - Email
  - Username (if different from email)
- Clear button
- Search icon with loading spinner during search
- Keyboard shortcuts (Enter to search, Esc to clear)

#### Integration
- Search combines with filters using AND logic
- Search value highlighted in results
- Search state persists during navigation

### 4. View Modes

#### List View
- **Compact variant:**
  - Minimal height per item
  - Essential info only
  - Dense spacing
  - Best for large lists

- **Detailed variant:**
  - More spacing
  - Additional user info
  - Role chips
  - Last login info

#### Grid View
- Responsive columns
- Square aspect ratio
- Avatar-centric
- Hover effects
- Best for visual browsing

#### Card View
- Detailed information
- Action buttons
- Most space per user
- Best for selection with context

### 5. Pagination

#### Features
- Server-side pagination (GraphQL)
- Page size selection
- Jump to page input
- Previous/Next navigation
- First/Last page buttons
- "X-Y of Z" display
- Sticky pagination bar

#### Behavior
- Maintains page number when filters change (if possible)
- Resets to page 1 when search changes
- Preserves selection across pages
- Loading indicator during page load

### 6. Real-time Updates

#### Event-based Refresh
```typescript
refreshEvents: [
  'user.created',
  'user.updated',
  'user.deleted'
]
```

#### Auto-refresh
```typescript
autoRefresh: true,
autoRefreshInterval: 60000 // 1 minute
```

#### Manual Refresh
- Refresh button in toolbar
- Pull-to-refresh on mobile (future)
- Subscription-based updates (future)

### 7. Bulk Actions

```typescript
interface BulkActionDefinition {
  id: string;
  label: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'error' | 'warning';
  confirmRequired?: boolean;
  confirmMessage?: string;
  handler: (users: Reactory.Models.IUser[]) => void | Promise<void>;
  isEnabled?: (users: Reactory.Models.IUser[]) => boolean;
}
```

**Example Bulk Actions:**
- Assign to team
- Change business unit
- Add role
- Remove role
- Export to CSV
- Send email
- Delete users

---

## State Management

### Hook: useUserList

Main state management hook that coordinates all aspects.

```typescript
interface UseUserListOptions {
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

interface UseUserListResult {
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
```

### Hook: useUserSelection

Manages user selection state and logic.

```typescript
interface UseUserSelectionOptions {
  mode: SelectionMode;
  initialSelected?: Reactory.Models.IUser[];
  excluded?: Reactory.Models.IUser[];
  onSelectionChange?: (selected: Reactory.Models.IUser[]) => void;
}

interface UseUserSelectionResult {
  selected: Set<string>;
  selectedUsers: Reactory.Models.IUser[];
  isSelected: (userId: string) => boolean;
  canSelect: (userId: string) => boolean;
  selectUser: (userId: string, user: Reactory.Models.IUser) => void;
  deselectUser: (userId: string) => void;
  toggleUser: (userId: string, user: Reactory.Models.IUser) => void;
  selectAll: (users: Reactory.Models.IUser[]) => void;
  clearSelection: () => void;
}
```

### Hook: useUserFilters

Manages filter state and filter application.

```typescript
interface UseUserFiltersOptions {
  quickFilters?: QuickFilterDefinition[];
  advancedFilterFields?: AdvancedFilterField[];
  predefinedFilters?: UserFilterInput;
  onFilterChange?: (combinedFilters: UserFilterInput) => void;
}

interface UseUserFiltersResult {
  // Quick Filters
  activeQuickFilters: string[];
  toggleQuickFilter: (filterId: string) => void;
  clearQuickFilters: () => void;
  
  // Advanced Filters
  advancedFilters: AdvancedFilter[];
  setAdvancedFilter: (field: string, value: any, operator: FilterOperator) => void;
  removeAdvancedFilter: (field: string) => void;
  clearAdvancedFilters: () => void;
  
  // Combined
  combinedFilters: UserFilterInput;
  activeFilterCount: number;
  clearAllFilters: () => void;
  
  // Presets
  savePreset: (name: string) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  presets: FilterPreset[];
}
```

### Hook: useUserQuery

Manages GraphQL query execution and data fetching.

```typescript
interface UseUserQueryOptions {
  organizationId?: string;
  filters: UserFilterInput;
  page: number;
  pageSize: number;
  skip?: boolean;
}

interface UseUserQueryResult {
  users: Reactory.Models.IUser[];
  totalCount: number;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  fetchMore: (page: number) => void;
}
```

---

## GraphQL Integration

### New Query: ReactoryUsers

We need to create a new, more flexible user query to support the filtering requirements.

```graphql
input ReactoryUserFilterInput {
  # Organization/Structure
  organizationId: String
  businessUnitId: String
  teamId: String
  
  # Search
  searchString: String
  
  # User Properties
  roles: [String]
  includeDeleted: Boolean
  
  # Date Filters
  createdAfter: Date
  createdBefore: Date
  lastLoginAfter: Date
  lastLoginBefore: Date
  
  # Custom Filters
  firstName: String
  lastName: String
  email: String
  
  # Advanced
  customFilters: Any
}

type ReactoryUsersQueryResult {
  users: [User!]!
  paging: PagingResult!
}

extend type Query {
  ReactoryUsers(
    filter: ReactoryUserFilterInput
    paging: PagingRequest
  ): ReactoryUsersQueryResult
}
```

### Query Implementation

**File:** `graphql/queries.ts`

```typescript
import { gql } from '@apollo/client';
import { USER_FRAGMENT } from './fragments';

export const REACTORY_USERS_QUERY = gql`
  ${USER_FRAGMENT}
  
  query ReactoryUsers(
    $filter: ReactoryUserFilterInput
    $paging: PagingRequest
  ) {
    ReactoryUsers(filter: $filter, paging: $paging) {
      users {
        ...UserFragment
      }
      paging {
        page
        pageSize
        total
        hasNext
      }
    }
  }
`;
```

**File:** `graphql/fragments.ts`

```typescript
import { gql } from '@apollo/client';

export const USER_FRAGMENT = gql`
  fragment UserFragment on User {
    id
    firstName
    lastName
    fullName
    fullNameWithEmail
    email
    mobileNumber
    avatar
    deleted
    lastLogin
    roles
    createdAt
    updatedAt
    organization {
      id
      name
    }
    businessUnit {
      id
      name
    }
    activeMembership {
      id
      roles
      enabled
    }
  }
`;
```

### Fallback to Existing Query

If the new `ReactoryUsers` query is not available (backward compatibility), fall back to `searchUser`:

```typescript
export const SEARCH_USER_QUERY = gql`
  ${USER_FRAGMENT}
  
  query SearchUser($searchString: String!, $sort: String) {
    searchUser(searchString: $searchString, sort: $sort) {
      ...UserFragment
    }
  }
`;
```

---

## Filtering System

### Filter Processing Pipeline

```
User Input
  ↓
[Predefined Filters] → Always applied, not visible
  ↓
[Quick Filters] → Toggle-based, visible as chips
  ↓
[Advanced Filters] → Complex criteria, modal/panel
  ↓
[Search String] → Text search across fields
  ↓
Combined Filter Object → Sent to GraphQL
  ↓
GraphQL Query Execution
  ↓
Filtered Results
```

### Filter Combination Logic

**File:** `utils/filterUtils.ts`

```typescript
export function combineFilters(
  predefinedFilters: UserFilterInput,
  activeQuickFilters: QuickFilterDefinition[],
  advancedFilters: AdvancedFilter[],
  searchString: string
): UserFilterInput {
  const combined: UserFilterInput = {
    ...predefinedFilters,
  };
  
  // Apply quick filters
  activeQuickFilters.forEach(qf => {
    applyQuickFilter(combined, qf);
  });
  
  // Apply advanced filters
  advancedFilters.forEach(af => {
    applyAdvancedFilter(combined, af);
  });
  
  // Apply search
  if (searchString) {
    combined.searchString = searchString;
  }
  
  return combined;
}
```

### Client-Side vs Server-Side Filtering

- **Server-side (preferred):** All filters sent to GraphQL, filtering done in database
- **Client-side (fallback):** If GraphQL doesn't support certain filters, apply them to results after fetch

---

## Selection Management

### Selection State

```typescript
interface SelectionState {
  // Set of user IDs for O(1) lookup
  selectedIds: Set<string>;
  
  // Full user objects for easy access
  selectedUsers: Map<string, Reactory.Models.IUser>;
  
  // Excluded user IDs (cannot be selected)
  excludedIds: Set<string>;
  
  // Selection mode
  mode: 'single' | 'multiple' | 'none';
}
```

### Selection Actions

```typescript
// Select a user
function selectUser(userId: string, user: Reactory.Models.IUser): void {
  if (mode === 'none' || excludedIds.has(userId)) return;
  
  if (mode === 'single') {
    // Clear existing selection
    selectedIds.clear();
    selectedUsers.clear();
  }
  
  selectedIds.add(userId);
  selectedUsers.set(userId, user);
  
  notifySelectionChange();
}

// Deselect a user
function deselectUser(userId: string): void {
  selectedIds.delete(userId);
  selectedUsers.delete(userId);
  
  notifySelectionChange();
}

// Toggle a user
function toggleUser(userId: string, user: Reactory.Models.IUser): void {
  if (selectedIds.has(userId)) {
    deselectUser(userId);
  } else {
    selectUser(userId, user);
  }
}

// Select all users
function selectAll(users: Reactory.Models.IUser[]): void {
  if (mode !== 'multiple') return;
  
  users.forEach(user => {
    if (!excludedIds.has(user.id)) {
      selectedIds.add(user.id);
      selectedUsers.set(user.id, user);
    }
  });
  
  notifySelectionChange();
}

// Clear selection
function clearSelection(): void {
  selectedIds.clear();
  selectedUsers.clear();
  notifySelectionChange();
}
```

### Range Selection (Shift+Click)

```typescript
let lastSelectedIndex: number = -1;

function handleUserClick(index: number, userId: string, user: Reactory.Models.IUser, shiftKey: boolean): void {
  if (mode !== 'multiple' || !shiftKey || lastSelectedIndex === -1) {
    toggleUser(userId, user);
    lastSelectedIndex = index;
    return;
  }
  
  // Select range from lastSelectedIndex to current index
  const start = Math.min(lastSelectedIndex, index);
  const end = Math.max(lastSelectedIndex, index);
  
  for (let i = start; i <= end; i++) {
    const rangeUser = users[i];
    if (!excludedIds.has(rangeUser.id)) {
      selectUser(rangeUser.id, rangeUser);
    }
  }
  
  lastSelectedIndex = index;
}
```

---

## Styling & Theming

### Style Approach

- Use Material-UI `sx` prop (v6 standard)
- Shared styles in `styles/userList.styles.ts`
- Theme-aware colors and spacing
- Responsive design with breakpoints

### Responsive Breakpoints

```typescript
const breakpoints = {
  xs: 0,     // Mobile
  sm: 600,   // Tablet
  md: 960,   // Small desktop
  lg: 1280,  // Desktop
  xl: 1920   // Large desktop
};
```

### View Mode Grid Columns

```typescript
const gridColumns = {
  xs: 1,   // Mobile: 1 column
  sm: 2,   // Tablet: 2 columns
  md: 3,   // Small desktop: 3 columns
  lg: 4,   // Desktop: 4 columns
  xl: 6    // Large desktop: 6 columns
};
```

### Common Styles

**File:** `styles/userList.styles.ts`

```typescript
import { Theme } from '@mui/material/styles';

export const getUserListStyles = (theme: Theme) => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: theme.palette.background.default,
  },
  
  toolbar: {
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(2),
    position: 'sticky',
    top: 0,
    zIndex: theme.zIndex.appBar - 1,
  },
  
  content: {
    flex: 1,
    overflow: 'auto',
    padding: theme.spacing(2),
  },
  
  listView: {
    '& .MuiListItem-root': {
      marginBottom: theme.spacing(1),
      borderRadius: theme.shape.borderRadius,
      '&:hover': {
        backgroundColor: theme.palette.action.hover,
      },
      '&.Mui-selected': {
        backgroundColor: theme.palette.action.selected,
      },
    },
  },
  
  gridView: {
    display: 'grid',
    gap: theme.spacing(2),
    gridTemplateColumns: {
      xs: 'repeat(1, 1fr)',
      sm: 'repeat(2, 1fr)',
      md: 'repeat(3, 1fr)',
      lg: 'repeat(4, 1fr)',
      xl: 'repeat(6, 1fr)',
    },
  },
  
  cardView: {
    display: 'grid',
    gap: theme.spacing(3),
    gridTemplateColumns: {
      xs: 'repeat(1, 1fr)',
      sm: 'repeat(1, 1fr)',
      md: 'repeat(2, 1fr)',
      lg: 'repeat(3, 1fr)',
    },
  },
  
  pagination: {
    backgroundColor: theme.palette.background.paper,
    borderTop: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(2),
    position: 'sticky',
    bottom: 0,
  },
  
  selectionSummary: {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    padding: theme.spacing(1, 2),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
});
```

---

## Accessibility

### ARIA Labels

- `role="listbox"` on list container
- `role="option"` on list items
- `aria-selected` on selected items
- `aria-label` on action buttons
- `aria-busy` during loading
- `aria-live="polite"` for selection announcements

### Keyboard Navigation

#### List Navigation
- `↑/↓` or `j/k`: Navigate up/down
- `Space`: Toggle selection of focused item
- `Shift+Space`: Range select
- `Enter`: Activate/click focused item
- `Ctrl+A`: Select all (if multi-select enabled)
- `Escape`: Clear selection

#### Search
- `/`: Focus search input
- `Escape`: Clear search and blur input

#### Filters
- `f`: Toggle filter panel
- `Escape`: Close filter panel

### Screen Reader Support

- Announce total count: "25 users found"
- Announce selection: "User John Doe selected. 3 users selected."
- Announce filters: "Filter applied: Active users only"
- Announce pagination: "Page 2 of 5"

### Focus Management

- Trap focus in modals (filter panel, dialogs)
- Restore focus after modal close
- Visible focus indicators
- Skip links for keyboard users

---

## Usage Examples

### Example 1: Basic List with Search

```tsx
import { UserList } from '@/components/shared/UserList';

function MyComponent() {
  return (
    <UserList
      enableSearch={true}
      enablePagination={true}
      organizationId="org-123"
      viewMode="list"
      itemVariant="compact"
    />
  );
}
```

### Example 2: Multi-Select with Quick Filters

```tsx
import { UserList, QuickFilterDefinition } from '@/components/shared/UserList';

const quickFilters: QuickFilterDefinition[] = [
  {
    id: 'admins',
    label: 'Admins',
    icon: 'admin_panel_settings',
    color: 'error',
    filter: {
      field: 'roles',
      value: 'ADMIN',
      operator: 'in',
    },
  },
  {
    id: 'active',
    label: 'Active',
    icon: 'check_circle',
    color: 'success',
    filter: {
      field: 'deleted',
      value: false,
      operator: 'eq',
    },
  },
];

function SelectUsersDialog() {
  const [selected, setSelected] = useState<Reactory.Models.IUser[]>([]);
  
  return (
    <UserList
      selectionMode="multiple"
      selected={selected}
      onSelectionChange={setSelected}
      enableSearch={true}
      enableQuickFilters={true}
      quickFilters={quickFilters}
      viewMode="list"
    />
  );
}
```

### Example 3: Grid View with Advanced Filters

```tsx
import { UserList, AdvancedFilterField } from '@/components/shared/UserList';

const advancedFilterFields: AdvancedFilterField[] = [
  {
    field: 'businessUnit',
    label: 'Business Unit',
    type: 'multiselect',
    options: [
      { label: 'Engineering', value: 'eng-bu-1' },
      { label: 'Sales', value: 'sales-bu-1' },
      { label: 'Marketing', value: 'marketing-bu-1' },
    ],
  },
  {
    field: 'lastLogin',
    label: 'Last Login',
    type: 'daterange',
    operators: ['between', 'after', 'before'],
  },
];

function UserBrowser() {
  return (
    <UserList
      viewMode="grid"
      enableSearch={true}
      enableAdvancedFilters={true}
      advancedFilterFields={advancedFilterFields}
      allowViewModeChange={true}
    />
  );
}
```

### Example 4: Single Select with Confirmation

```tsx
function SelectManagerDialog({ onSelect, onCancel }) {
  const [selectedUser, setSelectedUser] = useState<Reactory.Models.IUser | null>(null);
  
  const handleConfirm = () => {
    if (selectedUser) {
      onSelect(selectedUser);
    }
  };
  
  return (
    <Dialog open onClose={onCancel}>
      <DialogTitle>Select Manager</DialogTitle>
      <DialogContent>
        <UserList
          selectionMode="single"
          selected={selectedUser ? [selectedUser] : []}
          onSelectionChange={(users) => setSelectedUser(users[0] || null)}
          enableSearch={true}
          height={500}
          predefinedFilters={{
            roles: ['MANAGER', 'ADMIN'],
            includeDeleted: false,
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button 
          onClick={handleConfirm} 
          disabled={!selectedUser}
          variant="contained"
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

### Example 5: Custom Item Renderer

```tsx
function UserListWithCustomItems() {
  const customRenderer = (user: Reactory.Models.IUser, options: ItemRendererOptions) => {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', padding: 2 }}>
        <Avatar src={user.avatar} sx={{ width: 64, height: 64, mr: 2 }} />
        <Box flex={1}>
          <Typography variant="h6">{user.fullName}</Typography>
          <Typography variant="body2" color="text.secondary">
            {user.email}
          </Typography>
          <Typography variant="caption">
            Last login: <RelativeTime date={user.lastLogin} />
          </Typography>
        </Box>
        {options.showCheckbox && (
          <Checkbox 
            checked={options.selected} 
            onChange={() => options.onSelect(user)} 
          />
        )}
      </Box>
    );
  };
  
  return (
    <UserList
      selectionMode="multiple"
      customItemRenderer={customRenderer}
      itemVariant="custom"
    />
  );
}
```

### Example 6: With Bulk Actions

```tsx
const bulkActions: BulkActionDefinition[] = [
  {
    id: 'assign-team',
    label: 'Assign to Team',
    icon: 'group_add',
    color: 'primary',
    handler: async (users) => {
      // Show team selection dialog
      const teamId = await selectTeam();
      if (teamId) {
        await assignUsersToTeam(users, teamId);
      }
    },
  },
  {
    id: 'export',
    label: 'Export to CSV',
    icon: 'download',
    color: 'secondary',
    handler: (users) => {
      exportUsersToCSV(users);
    },
  },
  {
    id: 'delete',
    label: 'Delete Users',
    icon: 'delete',
    color: 'error',
    confirmRequired: true,
    confirmMessage: 'Are you sure you want to delete the selected users?',
    handler: async (users) => {
      await deleteUsers(users.map(u => u.id));
    },
    isEnabled: (users) => users.every(u => !u.deleted),
  },
];

function UserManagement() {
  return (
    <UserList
      selectionMode="multiple"
      enableBulkActions={true}
      bulkActions={bulkActions}
      enableSearch={true}
      enableQuickFilters={true}
    />
  );
}
```

---

## Migration Path

### From Legacy `UserListWithSearch`

1. **Props Mapping:**

| Legacy Prop | New Prop | Notes |
|------------|----------|-------|
| `multiSelect` | `selectionMode: 'multiple'` | Changed to enum |
| `mode: 'list'` | `viewMode: 'list'` | Same values |
| `filters: ["search"]` | `enableSearch: true` | Simplified |
| `filters: ["business_unit"]` | Use `quickFilters` or `advancedFilterFields` | More flexible |
| `onAcceptSelection` | `onSelectionChange` | Different signature |
| `onUserSelect` | `onUserClick` | Clearer naming |
| `onNewUserClick` | `onAddUser` | Simplified |
| `onDeleteUsersClick` | Use `bulkActions` | More flexible |
| `allowDelete` | `enableDeleteUsers` | Clearer naming |
| `refreshEvents` | `refreshEvents` | Same |

2. **Component Registration:**

Update in `/src/components/index.tsx`:

```typescript
// OLD
{
  nameSpace: 'core',
  name: 'UserListWithSearch',
  component: UserListWithSearch,
  version: '1.0.0',
}

// NEW (keep old for backward compatibility)
{
  nameSpace: 'core',
  name: 'UserListWithSearch',
  component: UserListWithSearchLegacy, // Wrapper that maps old props
  version: '1.0.0',
},
{
  nameSpace: 'core',
  name: 'UserList',
  component: UserList,
  version: '2.0.0',
}
```

3. **Compatibility Wrapper:**

Create a wrapper component that translates old props to new props:

```typescript
// UserListWithSearchLegacy.tsx
export const UserListWithSearchLegacy = (props: OldProps) => {
  const newProps = transformLegacyProps(props);
  return <UserList {...newProps} />;
};
```

4. **Gradual Migration:**
   - Phase 1: Add new `UserList` alongside old component
   - Phase 2: Update new code to use `UserList`
   - Phase 3: Migrate existing usage one-by-one
   - Phase 4: Deprecate old component
   - Phase 5: Remove old component (major version bump)

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create folder structure
- [ ] Define TypeScript types
- [ ] Implement `useUserSelection` hook
- [ ] Implement `useUserFilters` hook
- [ ] Implement basic `UserList` container
- [ ] Create GraphQL queries and fragments

### Phase 2: Core Components (Week 2)
- [ ] Implement `UserListToolbar` with search
- [ ] Implement `UserListContent` with ListView
- [ ] Implement `UserListItem` variants (compact, detailed)
- [ ] Implement `UserListPagination`
- [ ] Add loading and empty states

### Phase 3: Filtering (Week 3)
- [ ] Implement `QuickFilters` component
- [ ] Implement `AdvancedFilters` component
- [ ] Implement `FilterPresets` component
- [ ] Integrate filters with query

### Phase 4: Additional Views (Week 4)
- [ ] Implement GridView
- [ ] Implement CardView
- [ ] Implement view mode switching
- [ ] Add responsive behavior

### Phase 5: Advanced Features (Week 5)
- [ ] Implement bulk actions
- [ ] Implement `UserSelectionSummary`
- [ ] Add keyboard navigation
- [ ] Add accessibility features
- [ ] Implement real-time updates

### Phase 6: Polish & Documentation (Week 6)
- [ ] Add animations and transitions
- [ ] Performance optimization (virtualization)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write component documentation
- [ ] Create Storybook stories
- [ ] Update component registry

---

## Testing Strategy

### Unit Tests
- Hook logic (`useUserSelection`, `useUserFilters`)
- Filter utilities (`combineFilters`, etc.)
- Individual components (toolbar, items, etc.)

### Integration Tests
- Full component with different prop combinations
- Selection workflows
- Filter workflows
- Pagination workflows

### E2E Tests
- User selection scenarios
- Search and filter combinations
- Bulk actions
- Keyboard navigation

### Visual Regression Tests
- Storybook snapshots for each variant
- Different view modes
- Loading/empty states

---

## Performance Considerations

### Virtualization

For large user lists (>100 users), implement virtualization:

```tsx
import { FixedSizeList } from 'react-window';

function VirtualizedListView({ users, ...props }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={users.length}
      itemSize={72}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <UserListItem user={users[index]} {...props} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

### Memoization

Memoize expensive computations and components:

```typescript
const MemoizedUserListItem = React.memo(UserListItem, (prev, next) => {
  return (
    prev.user.id === next.user.id &&
    prev.selected === next.selected &&
    prev.selectionMode === next.selectionMode
  );
});
```

### Debouncing

Debounce search input and filter changes:

```typescript
const debouncedSearch = useMemo(
  () => debounce((value: string) => {
    setSearchValue(value);
  }, 300),
  []
);
```

### GraphQL Optimization

- Use query batching
- Implement query caching
- Use pagination (offset-based or cursor-based)
- Only request needed fields

---

## Future Enhancements

### v2.1
- [ ] Saved views (user preferences)
- [ ] Column customization (for list view)
- [ ] Drag-and-drop sorting
- [ ] Export functionality (CSV, Excel, PDF)

### v2.2
- [ ] Mobile-optimized views
- [ ] Pull-to-refresh
- [ ] Offline support
- [ ] Progressive loading (infinite scroll)

### v2.3
- [ ] GraphQL subscriptions for real-time updates
- [ ] User grouping/categorization
- [ ] Comparison mode (side-by-side)
- [ ] Advanced visualizations

### v3.0
- [ ] Full customization API
- [ ] Plugin system for extensions
- [ ] Themeable via props
- [ ] Headless mode (bring your own UI)

---

## Appendix

### Type Definitions

```typescript
// Selection
type SelectionMode = 'single' | 'multiple' | 'none';

// View
type ViewMode = 'list' | 'grid' | 'cards';
type ItemVariant = 'compact' | 'detailed' | 'custom';

// Filters
type FilterOperator = 
  | 'eq' | 'ne' 
  | 'gt' | 'gte' | 'lt' | 'lte' 
  | 'in' | 'not-in' 
  | 'contains' | 'starts-with' | 'ends-with'
  | 'between'
  | 'is-null' | 'is-not-null';

interface QuickFilterDefinition {
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

interface AdvancedFilterField {
  field: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'boolean';
  options?: { label: string; value: any }[];
  operators?: FilterOperator[];
  defaultOperator?: FilterOperator;
  placeholder?: string;
  helpText?: string;
}

interface AdvancedFilter {
  field: string;
  value: any;
  operator: FilterOperator;
  label: string;
}

interface FilterPreset {
  id: string;
  name: string;
  filters: AdvancedFilter[];
  createdAt: Date;
  isDefault?: boolean;
}

interface UserFilterInput {
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

// Bulk Actions
interface BulkActionDefinition {
  id: string;
  label: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'error' | 'warning';
  confirmRequired?: boolean;
  confirmMessage?: string;
  handler: (users: Reactory.Models.IUser[]) => void | Promise<void>;
  isEnabled?: (users: Reactory.Models.IUser[]) => boolean;
}

// Rendering
interface ItemRendererOptions {
  selected: boolean;
  selectionMode: SelectionMode;
  showCheckbox: boolean;
  onSelect: (user: Reactory.Models.IUser) => void;
  onClick?: (user: Reactory.Models.IUser) => void;
  viewMode: ViewMode;
  itemVariant: ItemVariant;
}
```

---

## Summary

This specification outlines a comprehensive, modern user list component that addresses the limitations of the legacy `UserListWithSearch` component. Key improvements include:

1. **Modularity:** Clear separation of concerns with focused subcomponents
2. **Flexibility:** Extensive configuration options without code changes
3. **Usability:** Modern UX patterns (quick filters, advanced filters, multiple views)
4. **Performance:** Optimized for large datasets with virtualization and memoization
5. **Accessibility:** Full keyboard navigation and screen reader support
6. **Maintainability:** Clear architecture, TypeScript types, and comprehensive testing

The component follows Reactory and Material-UI conventions, integrates seamlessly with GraphQL, and provides a smooth migration path from the legacy component.

---

**Next Steps:**
1. Review and approve this specification
2. Create implementation plan with milestones
3. Begin Phase 1 implementation
4. Set up Storybook for component development
5. Define acceptance criteria for each phase

