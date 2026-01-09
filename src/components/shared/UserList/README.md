# UserList Component

A modern, feature-rich user list component for the Reactory PWA Client with comprehensive search, filtering, selection, and accessibility features.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Architecture](#architecture)
- [Testing](#testing)
- [Accessibility](#accessibility)

## Features

### Core Features

- ✅ **Multiple Selection Modes**: None, single, or multiple user selection
- ✅ **Search**: Debounced search with real-time filtering
- ✅ **Quick Filters**: Predefined filter chips for common scenarios
- ✅ **Advanced Filters**: Complex filtering with field, operator, and value
- ✅ **Multiple View Modes**: List, grid, and card views
- ✅ **Pagination**: Server-side pagination with customizable page sizes
- ✅ **GraphQL Integration**: Built-in GraphQL queries and fragments
- ✅ **Custom Rendering**: Support for custom item renderers
- ✅ **Accessibility**: Full keyboard navigation and ARIA support
- ✅ **TypeScript**: Fully typed with comprehensive interfaces

### Selection Modes

```typescript
type SelectionMode = 'none' | 'single' | 'multiple';
```

- **none**: No selection, view-only mode
- **single**: Single user selection
- **multiple**: Multiple user selection with checkboxes

### View Modes

```typescript
type ViewMode = 'list' | 'grid' | 'cards';
```

- **list**: Vertical list view (default)
- **grid**: Grid layout for avatars
- **cards**: Card-based layout with more details

### Item Variants

```typescript
type ItemVariant = 'compact' | 'detailed' | 'custom';
```

- **compact**: Minimal user information (avatar, name, email)
- **detailed**: Extended information (business unit, roles, last login)
- **custom**: Use custom renderer function

## Installation

The component is part of the shared components in the PWA client:

```typescript
import { UserList } from '@reactory/client-core/components/shared/UserList';
```

## Basic Usage

### Simple List

```typescript
import React from 'react';
import { UserList } from '@reactory/client-core/components/shared/UserList';
import { REACTORY_USER_LIST_QUERY } from '@reactory/client-core/components/shared/UserList/graphql';

export const MyUserList: React.FC = () => {
  return (
    <UserList
      query={REACTORY_USER_LIST_QUERY}
      selectionMode="none"
      enableSearch={true}
      viewMode="list"
      itemVariant="compact"
    />
  );
};
```

### With Single Selection

```typescript
export const SelectableUserList: React.FC = () => {
  const [selectedUser, setSelectedUser] = React.useState<any>(null);

  const handleSelectionChange = (selected: any[]) => {
    setSelectedUser(selected[0] || null);
  };

  return (
    <UserList
      query={REACTORY_USER_LIST_QUERY}
      selectionMode="single"
      onSelectionChange={handleSelectionChange}
      enableSearch={true}
    />
  );
};
```

### With Multiple Selection and Actions

```typescript
export const ManageableUserList: React.FC = () => {
  const handleDeleteUsers = (users: any[]) => {
    console.log('Deleting users:', users);
  };

  const handleAddUser = () => {
    console.log('Adding new user');
  };

  return (
    <UserList
      query={REACTORY_USER_LIST_QUERY}
      selectionMode="multiple"
      enableSearch={true}
      enableAddUser={true}
      onAddUser={handleAddUser}
      enableDeleteUsers={true}
      onDeleteUsers={handleDeleteUsers}
      canDelete={true}
    />
  );
};
```

## API Reference

### UserListProps

```typescript
interface UserListProps {
  // Selection
  selectionMode?: SelectionMode;
  initialSelected?: Reactory.Models.IUser[];
  onSelectionChange?: (selected: Reactory.Models.IUser[]) => void;
  maxSelection?: number;

  // View and display
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
  quickFilters?: QuickFilter[];
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
  onUserSelect?: (user: Reactory.Models.IUser) => void;
  onUserClick?: (user: Reactory.Models.IUser) => void;
  onRefresh?: () => void;

  // Data
  query: DocumentNode;
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
```

### QuickFilter

```typescript
interface QuickFilter {
  id: string;
  label: string;
  value: any;
  count?: number;
}
```

### AdvancedFilter

```typescript
interface AdvancedFilter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
}

type FilterOperator =
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'not-in' | 'contains' | 'starts-with' | 'ends-with'
  | 'between' | 'is-null' | 'is-not-null';
```

### AdvancedFilterField

```typescript
interface AdvancedFilterField {
  field: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  operators: FilterOperator[];
  options?: Array<{ label: string; value: any }>;
}
```

## Examples

See [examples/BasicUsage.tsx](./examples/BasicUsage.tsx) for comprehensive examples:

1. Simple user list
2. Single selection
3. Multiple selection
4. Full-featured list with all options
5. Custom item renderer
6. Compact list for dialogs

## Architecture

### Component Structure

```
UserList/
├── components/
│   ├── AccessibleUserList.tsx      # Keyboard navigation wrapper
│   ├── Filters/
│   │   ├── QuickFilters.tsx        # Quick filter chips
│   │   └── AdvancedFilters.tsx     # Advanced filter dialog
│   ├── UserListContent/
│   │   ├── ListView.tsx            # List view renderer
│   │   ├── EmptyState.tsx          # Empty state component
│   │   └── index.tsx               # Content container
│   ├── UserListItem/
│   │   ├── UserListItemCompact.tsx # Compact item
│   │   └── UserListItemDetailed.tsx # Detailed item
│   ├── UserListPagination/
│   │   └── index.tsx               # Pagination controls
│   └── UserListToolbar/
│       ├── SearchBar.tsx           # Search input
│       ├── ActionButtons.tsx       # Action buttons
│       └── index.tsx               # Toolbar container
├── graphql/
│   ├── fragments.ts                # GraphQL fragments
│   ├── queries.ts                  # GraphQL queries
│   └── index.ts                    # GraphQL exports
├── hooks/
│   ├── useUserSelection.ts         # Selection logic
│   ├── useUserFilters.ts           # Filter logic
│   ├── useUserQuery.ts             # Data fetching
│   ├── useAccessibility.ts         # Keyboard navigation
│   └── __tests__/                  # Hook tests
├── styles/
│   └── userList.styles.ts          # MUI v6 styles
├── utils/
│   ├── filterUtils.ts              # Filter utilities
│   └── index.ts                    # Utils exports
├── examples/
│   └── BasicUsage.tsx              # Usage examples
├── types.ts                        # TypeScript definitions
├── UserList.tsx                    # Main component
├── index.tsx                       # Module exports
├── SPECIFICATION.md                # Detailed specification
└── README.md                       # This file
```

### Data Flow

```
UserList (Container)
  ↓
  ├─→ useUserSelection → Manages selection state
  ├─→ useUserFilters → Manages filter state
  └─→ useUserQuery → Fetches data via GraphQL
        ↓
        ├─→ UserListToolbar → Search, filters, actions
        ├─→ UserListContent → Renders users
        │     ↓
        │     └─→ ListView/GridView/CardView
        │           ↓
        │           └─→ UserListItem (Compact/Detailed/Custom)
        └─→ UserListPagination → Page controls
```

## Testing

### Running Tests

```bash
# Run all UserList tests
npx jest src/components/shared/UserList

# Run specific test file
npx jest src/components/shared/UserList/hooks/__tests__/useUserSelection.test.tsx

# Run with coverage
npx jest src/components/shared/UserList --coverage
```

### Test Coverage

- ✅ `useUserSelection` - Comprehensive selection logic tests
- ✅ `useUserFilters` - Filter state management tests
- ✅ `useUserQuery` - Data fetching and GraphQL tests

## Accessibility

### Keyboard Navigation

The `AccessibleUserList` component provides full keyboard support:

- **Arrow Up/Down**: Navigate between users
- **Home**: Jump to first user
- **End**: Jump to last user
- **Enter/Space**: Select/activate user
- **Escape**: Clear focus
- **Ctrl+A / Cmd+A**: Select all (when enabled)

### Screen Reader Support

- ARIA labels on all interactive elements
- Live region announcements for state changes
- Proper role attributes
- Focus management

### Usage

```typescript
import { AccessibleUserList } from '@reactory/client-core/components/shared/UserList';

<AccessibleUserList
  query={REACTORY_USER_LIST_QUERY}
  selectionMode="multiple"
  enableKeyboardNavigation={true}
  announceChanges={true}
/>
```

## GraphQL Integration

### Default Query

```graphql
query ReactoryUserListQuery(
  $paging: PagingRequest
  $searchString: String
  $filters: [FilterInput]
) {
  ReactoryUserList(
    paging: $paging
    searchString: $searchString
    filters: $filters
  ) {
    users {
      ...UserListUserFragment
    }
    paging {
      page
      pageSize
      total
      hasNext
    }
  }
}
```

### Fragments

- `UserListItemFragment` - Core user fields
- `UserListUserFragment` - Extended user fields
- `UserListMembershipFragment` - Membership data
- `UserListOrganizationFragment` - Organization data

### Custom Queries

You can provide your own GraphQL query:

```typescript
const MY_CUSTOM_QUERY = gql`
  query MyCustomUserQuery($paging: PagingRequest) {
    myUsers(paging: $paging) {
      users {
        id
        fullName
        email
      }
      paging {
        total
      }
    }
  }
`;

<UserList query={MY_CUSTOM_QUERY} />
```

## Advanced Usage

### Custom Item Renderer

```typescript
const customRenderer = (user, options) => {
  return (
    <div 
      style={{ 
        backgroundColor: options.selected ? '#e3f2fd' : 'white',
        padding: '16px',
      }}
      onClick={() => options.onSelect(user)}
    >
      <h3>{user.fullName}</h3>
      <p>{user.email}</p>
    </div>
  );
};

<UserList
  itemVariant="custom"
  customItemRenderer={customRenderer}
/>
```

### Filter Presets

```typescript
const quickFilters = [
  { id: 'active', label: 'Active Users', value: { deleted: false } },
  { id: 'admins', label: 'Admins', value: { role: 'ADMIN' } },
  { id: 'recent', label: 'Recently Added', value: { recent: true } },
];

<UserList
  enableQuickFilters={true}
  quickFilters={quickFilters}
/>
```

### Advanced Filters

```typescript
const advancedFilterFields = [
  {
    field: 'roles',
    label: 'Role',
    type: 'string',
    operators: ['in', 'not-in'],
  },
  {
    field: 'deleted',
    label: 'Status',
    type: 'boolean',
    operators: ['eq'],
  },
  {
    field: 'lastLogin',
    label: 'Last Login',
    type: 'date',
    operators: ['gt', 'lt', 'between'],
  },
];

<UserList
  enableAdvancedFilters={true}
  advancedFilterFields={advancedFilterFields}
/>
```

## Migration from UserListWithSearch

If you're migrating from the old `UserListWithSearch` component:

```typescript
// Old
<UserListWithSearch
  onUserSelect={handleSelect}
  organization_id={orgId}
  multiSelect={true}
  selected={selected}
/>

// New
<UserList
  query={REACTORY_USER_LIST_QUERY}
  selectionMode="multiple"
  initialSelected={selected}
  onSelectionChange={handleSelectionChange}
/>
```

## Contributing

When contributing to this component:

1. Follow the established patterns in hooks and components
2. Add tests for new features
3. Update types.ts for new interfaces
4. Maintain accessibility features
5. Update this README with new features

## License

Part of the Reactory Platform - Copyright Reactory

