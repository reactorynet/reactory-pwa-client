# UserAvatar Widget Integration with New UserList Component

**Date**: January 9, 2026  
**Status**: ✅ Complete - Single Selection Integrated

## Overview

The `UserAvatar` widget has been successfully integrated with the new `UserList` component to provide a modern, fully-featured user selection dialog with single-selection mode.

## Changes Made

### 1. Import Statement Updated

```typescript
import { REACTORY_USER_LIST_QUERY } from '@reactory/client-core/components/shared/UserList/graphql';
```

Added direct import of the GraphQL query from the new UserList module.

### 2. Component Reference Updated

```typescript
// Old
const UserListWithSearch = useMemo(() => {
  if (!reactory || !options.editable) return null;
  const componentDefs = reactory.getComponents<{
    UserListWithSearch: React.FC;
  }>(['core.UserListWithSearch']);
  return componentDefs?.UserListWithSearch || null;
}, [reactory, options.editable]);

// New
const { UserList } = useMemo(() => {
  if (!reactory || !options.editable) return { UserList: null };
  return reactory.getComponents<{
    UserList: React.FC<any>;
  }>(['core.UserList']);
}, [reactory, options.editable]);
```

### 3. Dialog Implementation

The user selector dialog now uses the new `UserList` component with:

#### Single Selection Configuration
```typescript
<UserList
  query={REACTORY_USER_LIST_QUERY}
  selectionMode="single"  // ✅ Single selection only
  initialSelected={user ? [user as Reactory.Models.IUser] : []}
  onUserSelect={handleUserSelected}
  // ... other props
/>
```

#### Search Configuration
```typescript
enableSearch={true}
searchPlaceholder="Search users..."
```

#### Filter Configuration
```typescript
enableQuickFilters={options.showFilters}
quickFilters={options.showFilters ? [
  {
    id: 'active',
    label: 'Active Users',
    icon: 'check_circle',
    color: 'success' as const,
    filter: {
      field: 'deleted',
      value: false,
      operator: 'eq' as const,
    },
  },
  {
    id: 'admins',
    label: 'Admins',
    icon: 'admin_panel_settings',
    color: 'primary' as const,
    filter: {
      field: 'roles',
      value: 'ADMIN',
      operator: 'contains' as const,
    },
  },
] : undefined}
```

#### Display Configuration
```typescript
viewMode="list"
itemVariant="detailed"
dense={false}
height="calc(80vh - 180px)"
initialPageSize={25}
pageSizeOptions={[10, 25, 50, 100]}
```

## Features

### ✅ Single User Selection
- Only one user can be selected at a time
- Current user is pre-selected in the dialog
- Selection automatically closes dialog and triggers `onChange`

### ✅ Search Functionality
- Full-text search across user properties
- Search placeholder: "Search users..."
- Real-time filtering

### ✅ Quick Filters (Optional)
- **Active Users**: Shows only non-deleted users
- **Admins**: Shows only users with ADMIN role
- Controlled by `showFilters` option
- Toggleable filters with icons and colors

### ✅ Organization & Business Unit Filtering
- Automatic filtering by `organizationId`
- Optional `businessUnitId` filtering
- Falls back to `formContext.organizationId` if not specified

### ✅ Pagination
- Default page size: 25
- Configurable page sizes: 10, 25, 50, 100
- Server-side pagination for performance

### ✅ Modern UI
- List view with detailed user items
- User avatars with fallback initials
- User roles displayed as chips
- Email and other metadata visible
- Responsive dialog (80vh height, max 800px)

## Usage Examples

### Basic Editable Avatar

```json
{
  "type": "object",
  "properties": {
    "assignedTo": {
      "type": "object",
      "title": "Assigned To"
    }
  },
  "ui:schema": {
    "assignedTo": {
      "ui:widget": "UserAvatar",
      "ui:options": {
        "variant": "chip",
        "size": "medium",
        "editable": true,
        "organizationId": "org-123"
      }
    }
  }
}
```

### Advanced with Custom Dialog Title

```json
{
  "assignedTo": {
    "ui:widget": "UserAvatar",
    "ui:options": {
      "variant": "avatar-name",
      "size": "medium",
      "editable": true,
      "dialogTitle": "Select Ticket Assignee",
      "unassignedText": "Click to assign",
      "showFilters": true,
      "businessUnitId": "bu-456"
    }
  }
}
```

### Using formContext for Organization

```json
{
  "createdBy": {
    "ui:widget": "UserAvatar",
    "ui:options": {
      "variant": "chip",
      "editable": true,
      "dialogTitle": "Select Creator",
      "showFilters": false
    }
  }
}
```
Note: `organizationId` will be automatically taken from `formContext.organizationId`

## Component Options

### UserAvatarOptions Interface

```typescript
interface UserAvatarOptions {
  // Display
  variant?: 'chip' | 'avatar' | 'avatar-name';
  size?: 'small' | 'medium';
  showEmail?: boolean;
  showFullName?: boolean;
  
  // Interaction
  clickable?: boolean;
  editable?: boolean; // ✅ Enables UserList dialog
  
  // Filtering (for UserList)
  organizationId?: string;
  businessUnitId?: string;
  showFilters?: boolean; // ✅ Shows quick filters
  
  // Dialog Configuration
  dialogTitle?: string;
  unassignedText?: string;
  unassignedIcon?: string;
  
  // Templates
  labelFormat?: string;
  tooltipFormat?: string;
  
  // Styling
  style?: React.CSSProperties;
  
  // Callbacks
  onClick?: (user: Partial<Reactory.Models.IUser> | null) => void;
}
```

## Integration Flow

```
1. User clicks editable avatar
   ↓
2. Dialog opens with UserList component
   ↓
3. UserList displays users with:
   - Single selection mode
   - Search bar
   - Optional quick filters
   - Pagination controls
   ↓
4. User selects a user from the list
   ↓
5. handleUserSelected is called
   ↓
6. onChange is triggered (form updates)
   ↓
7. Dialog closes automatically
   ↓
8. Avatar updates to show selected user
```

## Benefits

### For Developers
- ✅ Simple configuration via `ui:options`
- ✅ Automatic organization filtering
- ✅ Consistent UX across all user selection dialogs
- ✅ Type-safe props
- ✅ No custom code needed

### For Users
- ✅ Modern, responsive interface
- ✅ Fast search and filtering
- ✅ Clear visual feedback
- ✅ Keyboard navigation support
- ✅ Accessible design

## Migration from Old Component

### Before (Old UserListWithSearch)

```typescript
<UserListWithSearch
  organizationId={orgId}
  businessUnitId={options.businessUnitId}
  multiSelect={false}
  onUserSelect={handleUserSelected}
  selected={user?.id ? [user.id] : []}
  businessUnitFilter={!!options.businessUnitId}
  showFilters={options.showFilters}
/>
```

### After (New UserList)

```typescript
<UserList
  query={REACTORY_USER_LIST_QUERY}
  selectionMode="single"
  initialSelected={user ? [user as Reactory.Models.IUser] : []}
  onUserSelect={handleUserSelected}
  organizationId={orgId}
  businessUnitId={options.businessUnitId}
  enableSearch={true}
  searchPlaceholder="Search users..."
  enableQuickFilters={options.showFilters}
  quickFilters={[...]}
  viewMode="list"
  itemVariant="detailed"
  height="calc(80vh - 180px)"
  initialPageSize={25}
  pageSizeOptions={[10, 25, 50, 100]}
/>
```

## Testing Checklist

- [ ] Click editable avatar opens dialog
- [ ] Search functionality works
- [ ] Quick filters toggle correctly
- [ ] Single user selection works
- [ ] Selected user is pre-selected in dialog
- [ ] Selecting user closes dialog
- [ ] Avatar updates after selection
- [ ] Cancel button closes dialog without changes
- [ ] organizationId filtering works
- [ ] businessUnitId filtering works
- [ ] formContext.organizationId fallback works
- [ ] Pagination works
- [ ] Unassigned state displays correctly
- [ ] Tooltips show email
- [ ] Responsive design works on mobile

## Performance Considerations

1. **Server-side Pagination**: Only loads 25 users at a time
2. **Memoized Components**: UserList reference is memoized
3. **GraphQL Query**: Efficient data fetching with fragments
4. **Lazy Dialog**: Dialog content only renders when open

## Known Limitations

1. **Single Selection Only**: Multi-select not supported in UserAvatar
2. **GraphQL Required**: Requires GraphQL endpoint with `ReactoryUserListQuery`
3. **Organization Required**: Must provide `organizationId` (via prop or formContext)

## Future Enhancements

- [ ] Add custom filter configurations via options
- [ ] Support for role-based filtering
- [ ] Add user creation from dialog
- [ ] Support for team filtering
- [ ] Add recent selections
- [ ] Add favorites/pinned users

## Related Components

- **UserList**: `/src/components/shared/UserList/`
- **REACTORY_USER_LIST_QUERY**: `/src/components/shared/UserList/graphql/queries.ts`
- **UserAvatar**: `/src/components/reactory/ux/mui/widgets/UserAvatar/`

## Compilation Status

✅ **Zero TypeScript Errors**
✅ **All Imports Resolved**
✅ **Type Safety Maintained**

---

**Integration Complete!** The UserAvatar widget now provides a modern, fully-featured single-user selection experience powered by the new UserList component. 🎉

