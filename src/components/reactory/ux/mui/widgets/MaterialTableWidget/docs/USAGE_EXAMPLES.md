# MaterialTableWidget Usage Examples

Comprehensive examples demonstrating various features and configurations of the MaterialTableWidget.

## Table of Contents

- [Basic Examples](#basic-examples)
- [Remote Data Examples](#remote-data-examples)
- [Selection Examples](#selection-examples)
- [Filtering Examples](#filtering-examples)
- [Custom Renderers](#custom-renderers)
- [Actions and Events](#actions-and-events)
- [Styling Examples](#styling-examples)
- [Advanced Configurations](#advanced-configurations)

---

## Basic Examples

### Simple Table with Local Data

```typescript
// schema.ts
export const schema: Reactory.Schema.ISchema = {
  type: 'object',
  properties: {
    users: {
      type: 'array',
      title: 'User List',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string' },
        },
      },
    },
  },
};

// uiSchema.ts
export const uiSchema: Reactory.Schema.IUISchema = {
  users: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { field: 'id', title: 'ID' },
        { field: 'name', title: 'Name' },
        { field: 'email', title: 'Email' },
        { field: 'role', title: 'Role' },
      ],
      options: {
        pageSize: 10,
        pageSizeOptions: [5, 10, 25],
      },
    },
  },
};
```

### Table with Formatted Columns

```typescript
// uiSchema.ts - Using format templates
export const uiSchema: Reactory.Schema.IUISchema = {
  orders: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { field: 'orderNumber', title: 'Order #' },
        { field: 'customer', title: 'Customer' },
        { 
          field: 'amount', 
          title: 'Amount',
          // Use template for formatting
          format: '$${utils.formatNumber(cellData, 2)}',
        },
        {
          field: 'createdAt',
          title: 'Created',
          format: '${utils.formatDate(cellData, "MMM dd, yyyy")}',
        },
        {
          field: 'status',
          title: 'Status',
          format: '${cellData.toUpperCase()}',
        },
      ],
    },
  },
};
```

---

## Remote Data Examples

### Basic Remote Data with GraphQL

```typescript
// graphql.ts
export const graphql = {
  query: {
    name: 'listUsers',
    text: `
      query ListUsers($paging: PagingInput!, $search: String) {
        listUsers(paging: $paging, search: $search) {
          data {
            id
            name
            email
            role
            createdAt
          }
          paging {
            page
            pageSize
            total
            hasNext
          }
        }
      }
    `,
    variables: {
      'paging.page': 'query.page',
      'paging.pageSize': 'query.pageSize',
      'search': 'query.search',
    },
    resultMap: {
      'data': 'data',
      'paging': 'paging',
    },
  },
};

// uiSchema.ts
export const uiSchema: Reactory.Schema.IUISchema = {
  users: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      remoteData: true,
      search: true,
      columns: [
        { field: 'name', title: 'Name' },
        { field: 'email', title: 'Email' },
        { field: 'role', title: 'Role' },
      ],
      options: {
        pageSize: 10,
        pageSizeOptions: [10, 25, 50, 100],
      },
    },
  },
};
```

### Multiple Queries with Query Switching

```typescript
// graphql.ts
export const graphql = {
  queries: {
    allUsers: {
      name: 'listUsers',
      text: `query ListUsers($paging: PagingInput!) { ... }`,
      variables: { 'paging': 'query' },
    },
    activeUsers: {
      name: 'listActiveUsers',
      text: `query ListActiveUsers($paging: PagingInput!) { ... }`,
      variables: { 'paging': 'query' },
    },
    adminUsers: {
      name: 'listAdminUsers',
      text: `query ListAdminUsers($paging: PagingInput!) { ... }`,
      variables: { 'paging': 'query' },
    },
  },
};

// uiSchema.ts - Switch query based on selection
export const uiSchema: Reactory.Schema.IUISchema = {
  users: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      remoteData: true,
      query: 'activeUsers', // Use activeUsers query by default
      columns: [/* ... */],
    },
  },
};
```

### Remote Data with Refresh Events

```typescript
// graphql.ts
export const graphql = {
  query: {
    name: 'listTickets',
    text: `...`,
    refreshEvents: [
      { name: 'TICKET_CREATED' },
      { name: 'TICKET_UPDATED' },
      { name: 'TICKET_DELETED' },
    ],
  },
};

// uiSchema.ts
export const uiSchema: Reactory.Schema.IUISchema = {
  tickets: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      remoteData: true,
      refreshEvents: [
        { name: 'TICKET_STATUS_CHANGED' },
      ],
      columns: [/* ... */],
    },
  },
};
```

---

## Selection Examples

### Single Row Selection

```typescript
// uiSchema.ts
export const uiSchema: Reactory.Schema.IUISchema = {
  users: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [/* ... */],
      options: {
        selection: true,
      },
    },
  },
};
```

### Selection with Actions

```typescript
// uiSchema.ts
export const uiSchema: Reactory.Schema.IUISchema = {
  users: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [/* ... */],
      options: {
        selection: true,
        toolbar: true,
      },
      actions: [
        {
          key: 'delete',
          title: 'Delete ${selected.length} user(s)',
          icon: 'delete',
          isFreeAction: true,
          mutation: 'deleteUsers',
          confirmation: {
            title: 'Confirm Delete',
            content: 'Are you sure you want to delete ${selected.length} user(s)?',
            acceptTitle: 'Delete',
            cancelTitle: 'Cancel',
          },
        },
        {
          key: 'export',
          title: 'Export Selected',
          icon: 'download',
          isFreeAction: true,
          event: {
            name: 'exportUsers',
            via: 'form',
          },
        },
      ],
    },
  },
};

// graphql.ts
export const graphql = {
  mutation: {
    deleteUsers: {
      name: 'deleteUsers',
      text: `
        mutation DeleteUsers($ids: [ID!]!) {
          deleteUsers(ids: $ids) {
            success
            deletedCount
          }
        }
      `,
      variables: {
        'ids': 'selected.map(u => u.id)',
      },
      notification: {
        title: 'Deleted ${result.data.deleteUsers.deletedCount} users',
      },
      refreshEvents: [{ name: 'USERS_DELETED' }],
    },
  },
};
```

---

## Filtering Examples

### Using SearchBar Component

```tsx
import { SearchBar } from './components';

const MyTableToolbar: React.FC<{ onSearch: (text: string) => void }> = ({ onSearch }) => {
  return (
    <Toolbar>
      <SearchBar
        onSearch={onSearch}
        placeholder="Search users by name or email..."
        debounceDelay={300}
        showHelpTooltip
        helpText="Search is case-insensitive and matches partial text"
      />
    </Toolbar>
  );
};
```

### Using QuickFilters Component

```tsx
import { QuickFilters } from './components';
import { QuickFilterDefinition } from './hooks';

const filterDefs: QuickFilterDefinition[] = [
  {
    id: 'all',
    label: 'All',
    icon: 'list',
    filter: { field: 'id', value: null, operator: 'is-not-null' },
  },
  {
    id: 'active',
    label: 'Active',
    icon: 'check_circle',
    color: 'success',
    filter: { field: 'status', value: 'active', operator: 'eq' },
    badge: 42,
  },
  {
    id: 'pending',
    label: 'Pending',
    icon: 'pending',
    color: 'warning',
    filter: { field: 'status', value: 'pending', operator: 'eq' },
    badge: 5,
  },
  {
    id: 'admin',
    label: 'Admins Only',
    icon: 'admin_panel_settings',
    color: 'primary',
    filter: { 
      field: 'role', 
      value: 'admin', 
      operator: 'eq',
      additionalFilters: [
        { field: 'status', value: 'active', operator: 'eq' },
      ],
    },
  },
];

const MyTableToolbar: React.FC = () => {
  const handleFilterChange = (activeFilters: string[]) => {
    // Update query or local filter state
    console.log('Active filters:', activeFilters);
  };

  return (
    <Box sx={{ p: 2 }}>
      <QuickFilters
        filters={filterDefs}
        onFilterChange={handleFilterChange}
        variant="chips"
        multiSelect={false}
        showClearButton
      />
    </Box>
  );
};
```

### Using AdvancedFilterPanel

```tsx
import { useState } from 'react';
import { Button, Icon } from '@mui/material';
import { AdvancedFilterPanel } from './components';
import { AdvancedFilterField } from './hooks';

const filterFields: AdvancedFilterField[] = [
  {
    id: 'status',
    label: 'Status',
    field: 'status',
    type: 'multi-select',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
      { label: 'Pending', value: 'pending' },
    ],
  },
  {
    id: 'role',
    label: 'Role',
    field: 'role',
    type: 'select',
    options: [
      { label: 'Admin', value: 'admin' },
      { label: 'Editor', value: 'editor' },
      { label: 'Viewer', value: 'viewer' },
    ],
  },
  {
    id: 'name',
    label: 'Name',
    field: 'name',
    type: 'text',
    placeholder: 'Enter name...',
  },
  {
    id: 'createdAt',
    label: 'Created Date',
    field: 'createdAt',
    type: 'date-range',
  },
  {
    id: 'verified',
    label: 'Email Verified',
    field: 'emailVerified',
    type: 'boolean',
  },
];

const MyTableWithAdvancedFilters: React.FC = () => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);

  return (
    <>
      <Button
        startIcon={<Icon>filter_list</Icon>}
        onClick={() => setPanelOpen(true)}
      >
        Advanced Filters ({activeFilters.length})
      </Button>

      <AdvancedFilterPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        fields={filterFields}
        onFilterChange={setActiveFilters}
        showPresets
      />
    </>
  );
};
```

### Using Hooks Directly

```tsx
import { useQuickFilters, useAdvancedFilters, useDebouncedSearch } from './hooks';

const MyCustomFilteredTable: React.FC<{ data: any[] }> = ({ data }) => {
  // Debounced search
  const { searchValue, setSearchValue, isSearching } = useDebouncedSearch({
    onSearch: (value) => console.log('Search:', value),
    delay: 300,
  });

  // Quick filters
  const quickFilters = useQuickFilters({
    filters: quickFilterDefs,
    multiSelect: false,
  });

  // Advanced filters
  const advancedFilters = useAdvancedFilters({
    fields: advancedFilterFields,
  });

  // Combine all filters
  const filteredData = useMemo(() => {
    let result = data;
    
    // Apply search
    if (searchValue) {
      result = result.filter(item => 
        item.name.toLowerCase().includes(searchValue.toLowerCase())
      );
    }
    
    // Apply quick filters
    result = quickFilters.applyFilters(result);
    
    // Apply advanced filters
    result = advancedFilters.applyFilters(result);
    
    return result;
  }, [data, searchValue, quickFilters.activeFilters, advancedFilters.filters]);

  return (
    <Table>
      {/* Render filtered data */}
    </Table>
  );
};
```

---

## Custom Renderers

### Custom Column Component

```typescript
// Register a custom component
// components/StatusBadge.tsx
const StatusBadge: React.FC<{ cellData: string; rowData: any }> = ({ cellData, rowData }) => {
  const colors: Record<string, string> = {
    active: 'success',
    pending: 'warning',
    inactive: 'error',
  };
  
  return (
    <Chip
      label={cellData}
      color={colors[cellData] as any || 'default'}
      size="small"
    />
  );
};

// Register component with Reactory
reactory.registerComponent('myapp.StatusBadge@1.0.0', StatusBadge);

// uiSchema.ts
export const uiSchema: Reactory.Schema.IUISchema = {
  users: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { field: 'name', title: 'Name' },
        {
          field: 'status',
          title: 'Status',
          component: 'myapp.StatusBadge@1.0.0',
          propsMap: {
            'status': 'cellData',
            'user': 'rowData',
          },
        },
      ],
    },
  },
};
```

### Custom Toolbar Component

```typescript
// components/CustomToolbar.tsx
interface CustomToolbarProps {
  data: { data: any[]; paging: any; selected: any[] };
  formContext: any;
  onDataChange: () => void;
  searchText: string;
}

const CustomToolbar: React.FC<CustomToolbarProps> = ({ 
  data, 
  formContext, 
  searchText 
}) => {
  return (
    <Toolbar>
      <Typography variant="h6">
        {formContext.title || 'Data Table'}
      </Typography>
      <Box sx={{ flex: 1 }} />
      <Typography variant="body2">
        Showing {data.data.length} of {data.paging.total}
      </Typography>
      {data.selected.length > 0 && (
        <Chip label={`${data.selected.length} selected`} />
      )}
    </Toolbar>
  );
};

// uiSchema.ts
export const uiSchema: Reactory.Schema.IUISchema = {
  users: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      componentMap: {
        Toolbar: 'myapp.CustomToolbar@1.0.0',
      },
      columns: [/* ... */],
    },
  },
};
```

### Custom Detail Panel

```typescript
// components/UserDetailPanel.tsx
interface UserDetailPanelProps {
  rowData: any;
  rid: number;
  state: IRowState;
  formContext: any;
}

const UserDetailPanel: React.FC<UserDetailPanelProps> = ({ 
  rowData, 
  formContext 
}) => {
  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2">Contact Information</Typography>
          <Typography>Email: {rowData.email}</Typography>
          <Typography>Phone: {rowData.phone}</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2">Account Details</Typography>
          <Typography>Created: {rowData.createdAt}</Typography>
          <Typography>Last Login: {rowData.lastLoginAt}</Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

// uiSchema.ts
export const uiSchema: Reactory.Schema.IUISchema = {
  users: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      componentMap: {
        DetailsPanel: 'myapp.UserDetailPanel@1.0.0',
      },
      detailPanelProps: {
        showActions: true,
      },
      columns: [/* ... */],
    },
  },
};
```

---

## Actions and Events

### Mutation Actions with Confirmation

```typescript
// uiSchema.ts
export const uiSchema: Reactory.Schema.IUISchema = {
  users: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      options: { selection: true },
      actions: [
        {
          key: 'deactivate',
          title: 'Deactivate Users',
          icon: 'block',
          isFreeAction: true,
          mutation: 'deactivateUsers',
          confirmation: {
            title: 'Deactivate Users?',
            content: 'This will prevent ${selected.length} user(s) from logging in.',
            acceptTitle: 'Deactivate',
            cancelTitle: 'Cancel',
          },
        },
      ],
      columns: [/* ... */],
    },
  },
};

// graphql.ts
export const graphql = {
  mutation: {
    deactivateUsers: {
      name: 'deactivateUsers',
      text: `
        mutation DeactivateUsers($ids: [ID!]!) {
          deactivateUsers(ids: $ids) {
            success
            message
          }
        }
      `,
      variables: {
        'ids': 'selected.map(u => u.id)',
      },
      notification: {
        title: 'Users deactivated successfully',
      },
      onSuccessEvent: {
        name: 'USERS_DEACTIVATED',
        dataMap: {
          'userIds': 'ids',
        },
      },
    },
  },
};
```

### Event-Based Actions

```typescript
// uiSchema.ts
export const uiSchema: Reactory.Schema.IUISchema = {
  users: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      actions: [
        // Via form handler
        {
          key: 'export',
          title: 'Export to CSV',
          icon: 'download',
          isFreeAction: true,
          event: {
            name: 'onExportUsers',
            via: 'form',
            params: { format: 'csv' },
            paramsMap: {
              'users': 'selected',
            },
          },
        },
        // Via Reactory API event
        {
          key: 'notify',
          title: 'Send Notification',
          icon: 'notifications',
          isFreeAction: true,
          event: {
            name: 'SEND_USER_NOTIFICATION',
            via: 'api',
            paramsMap: {
              'userIds': 'selected.map(u => u.id)',
            },
          },
        },
        // Via component method
        {
          key: 'openModal',
          title: 'Bulk Edit',
          icon: 'edit',
          isFreeAction: true,
          event: {
            name: 'openBulkEditModal',
            via: 'component',
            component: 'myapp.UserBulkEditor@1.0.0',
            paramsMap: {
              'users': 'selected',
            },
          },
        },
      ],
      columns: [/* ... */],
    },
  },
};
```

### Add and Delete Buttons

```typescript
// uiSchema.ts
export const uiSchema: Reactory.Schema.IUISchema = {
  users: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      allowAdd: true,
      allowDelete: true,
      addButtonProps: {
        icon: 'person_add',
        tooltip: 'Add new user',
        onClick: 'navigation/navigate',
        onClickProps: {
          path: '/users/new',
        },
      },
      deleteButtonProps: {
        icon: 'delete',
        tooltip: 'Delete selected users',
        onClick: 'myapp.UserManager@1.0.0/deleteUsers',
        onClickPropsMap: {
          'userIds': 'rows.filter(r => rowsState[r.id]?.selected).map(r => r.id)',
        },
      },
      columns: [/* ... */],
    },
  },
};
```

---

## Styling Examples

### Conditional Row Styling

```typescript
// uiSchema.ts
export const uiSchema: Reactory.Schema.IUISchema = {
  orders: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      // Base row styling
      rowStyle: {
        height: '48px',
      },
      altRowStyle: {
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
      },
      selectedRowStyle: {
        backgroundColor: 'rgba(25, 118, 210, 0.12)',
      },
      headerStyle: {
        fontWeight: 'bold',
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
      },
      
      // Conditional styling
      conditionalRowStyling: [
        // Using regex
        {
          field: 'status',
          condition: '^overdue$',
          style: {
            backgroundColor: 'rgba(211, 47, 47, 0.1)',
            color: '#d32f2f',
          },
        },
        // Using template
        {
          field: 'priority',
          condition: '${rowData.priority === "high"}',
          style: {
            fontWeight: 'bold',
            borderLeft: '4px solid #ff9800',
          },
        },
        // Using function
        {
          field: 'amount',
          condition: '(rowData) => rowData.amount > 10000',
          style: {
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
          },
        },
      ],
      
      columns: [/* ... */],
    },
  },
};
```

### Theme Integration

```typescript
// theme.ts - Add MaterialTableWidget theme
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  // ... other theme options
  MaterialTableWidget: {
    light: {
      rowStyle: {
        backgroundColor: '#ffffff',
      },
      altRowStyle: {
        backgroundColor: '#fafafa',
      },
      selectedRowStyle: {
        backgroundColor: '#e3f2fd',
      },
      headerStyle: {
        backgroundColor: '#f5f5f5',
        fontWeight: 600,
      },
    },
    dark: {
      rowStyle: {
        backgroundColor: '#1e1e1e',
      },
      altRowStyle: {
        backgroundColor: '#252525',
      },
      selectedRowStyle: {
        backgroundColor: '#1a3a5c',
      },
      headerStyle: {
        backgroundColor: '#2d2d2d',
        fontWeight: 600,
      },
    },
  },
});
```

---

## Advanced Configurations

### Footer with Totals

```typescript
// uiSchema.ts
export const uiSchema: Reactory.Schema.IUISchema = {
  invoices: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { field: 'invoiceNumber', title: 'Invoice #' },
        { field: 'customer', title: 'Customer' },
        { field: 'amount', title: 'Amount' },
        { field: 'tax', title: 'Tax' },
        { field: 'total', title: 'Total' },
      ],
      footerColumns: [
        { field: 'invoiceNumber' },
        { field: 'customer' },
        { field: 'amount', value: 'SUM' },
        { field: 'tax', value: 'SUM' },
        { field: 'total', value: 'SUM' },
      ],
      footerOptions: {
        totals: true,
        displayTotalsLabel: true,
        labelStyle: { fontWeight: 'bold' },
        totalsRowStyle: { borderTop: '2px solid #000' },
        totalsCellStyle: { textAlign: 'right' },
      },
    },
  },
};
```

### Dynamic Columns from Data

```typescript
// uiSchema.ts
export const uiSchema: Reactory.Schema.IUISchema = {
  report: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      // Get columns from a property in formData
      columnsProperty: 'reportColumns',
      columnsPropertyMap: {
        'field': 'key',
        'title': 'label',
        'selected': 'visible',
      },
      remoteData: true,
      query: 'getReportData',
    },
  },
};

// formData structure
const formData = {
  reportColumns: [
    { key: 'date', label: 'Date', visible: true },
    { key: 'metric1', label: 'Sales', visible: true },
    { key: 'metric2', label: 'Revenue', visible: true },
    { key: 'metric3', label: 'Costs', visible: false },
  ],
  // Data will be loaded via remote query
};
```

### Multiple Components in a Column

```typescript
// uiSchema.ts
export const uiSchema: Reactory.Schema.IUISchema = {
  users: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          field: 'actions',
          title: 'Actions',
          components: [
            {
              component: 'core.IconButton@1.0.0',
              props: { icon: 'edit', size: 'small' },
              propsMap: {
                'onClick': '() => formContext.handleEdit(rowData)',
              },
            },
            {
              component: 'core.IconButton@1.0.0',
              props: { icon: 'delete', size: 'small', color: 'error' },
              propsMap: {
                'onClick': '() => formContext.handleDelete(rowData)',
              },
            },
            {
              component: 'core.IconButton@1.0.0',
              props: { icon: 'visibility', size: 'small' },
              propsMap: {
                'onClick': '() => formContext.handleView(rowData)',
              },
            },
          ],
        },
      ],
    },
  },
};
```

### Responsive Columns with Breakpoints

```typescript
// uiSchema.ts
export const uiSchema: Reactory.Schema.IUISchema = {
  users: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { field: 'name', title: 'Name' },  // Always visible
        { field: 'email', title: 'Email' }, // Always visible
        { field: 'phone', title: 'Phone', breakpoint: 'md' },  // Hidden on md and below
        { field: 'department', title: 'Department', breakpoint: 'lg' }, // Hidden on lg and below
        { field: 'location', title: 'Location', breakpoint: 'xl' }, // Hidden on xl and below
      ],
    },
  },
};
```
