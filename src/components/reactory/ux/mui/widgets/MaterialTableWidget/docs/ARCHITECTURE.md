# MaterialTableWidget Architecture

This document describes the internal architecture, design patterns, and component relationships within the MaterialTableWidget.

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [Component Hierarchy](#component-hierarchy)
- [State Management](#state-management)
- [Data Flow](#data-flow)
- [Integration Points](#integration-points)
- [Type System](#type-system)

## Design Philosophy

### Core Principles

1. **Composition over Inheritance**: Components are composed from smaller, reusable pieces
2. **Separation of Concerns**: UI logic, state management, and data fetching are separated
3. **Type Safety**: Full TypeScript coverage for compile-time safety
4. **Framework Integration**: Deep integration with Reactory's form system and API

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Hooks for logic | Enables reuse and testing of business logic separately from UI |
| MUI components | Consistent theming and accessibility out of the box |
| GraphQL integration | Native support for Reactory's data layer |
| Event-driven updates | Supports real-time updates via Reactory events |

## Component Hierarchy

```
MaterialTableWidget (Main Container)
├── Toolbar
│   ├── Title
│   ├── SearchField
│   ├── Actions Menu (DropDownMenu)
│   ├── Add Button
│   └── Delete Button
├── Table
│   ├── TableHead
│   │   ├── Expand All Toggle (if detail panel)
│   │   ├── Select All Checkbox (if selection enabled)
│   │   └── Column Headers
│   ├── TableBody
│   │   └── TableRow (for each data item)
│   │       ├── Expand Toggle Cell
│   │       ├── Selection Checkbox Cell
│   │       ├── Data Cells (rendered via columns)
│   │       └── Detail Panel Row (if expanded)
│   └── TableFooter
│       └── Footer Columns (aggregate calculations)
├── Pagination
│   └── TablePagination
└── Confirmation Dialog (AlertDialog)
```

## State Management

### Local State

The widget manages several pieces of local state:

```typescript
// Selection state
const [selectedRows, setSelectedRows] = useState([]);
const [allChecked, setAllChecked] = useState<boolean>(false);
const [rowsState, setRowState] = useState<MaterialTableRowState>({});

// Expansion state
const [allExpanded, setAllExpanded] = useState<boolean>(false);

// Pagination state
const [rowsPerPage, setRowsPerPage] = useState<number>(10);
const [page, setActivePage] = useState<number>(0);

// Query state (for remote data)
const [query, setQuery] = useState<MaterialTableQuery>({ 
  page: 1, 
  pageSize: 10, 
  search: "" 
});

// Data state
const [data, setData] = useState<MaterialTableRemoteDataReponse>({
  data: formData || [],
  paging: { hasNext: false, page: 0, pageSize: 10, total: 0 }
});

// UI state
const [version, setVersion] = useState(0); // Force re-render trigger
const [is_refreshing, setIsRefreshing] = useState(false);
const [activeAction, setActiveAction] = useState({ show: false, rowsSelected: [], action: null });
```

### Row State Interface

```typescript
interface IRowState {
  selected?: boolean;   // Row is selected
  hover?: boolean;      // Row has hover state
  editing?: boolean;    // Row is in edit mode
  saving?: boolean;     // Row is being saved
  dirty?: boolean;      // Row data has changed
  expanded?: boolean;   // Row detail panel is expanded
}

interface MaterialTableRowState {
  [rowIndex: number]: IRowState;
}
```

### State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interaction                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Event Handlers                                │
│  • toggleSelectAll()    • toggleDetailsPanel()                  │
│  • toggleSelect()       • onPageChange()                        │
│  • onMenuSelect()       • onSearchChange()                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    State Updates                                 │
│  • setRowState()        • setQuery()                            │
│  • setAllChecked()      • setActiveAction()                     │
│  • setAllExpanded()     • setData()                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    useEffect Hooks                               │
│  • Sync allChecked with rowsState                               │
│  • Initialize row states on data change                         │
│  • Fetch data on query change                                   │
│  • Bind/unbind refresh events                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Re-render                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Local Data Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  formData    │───▶│    $rows     │───▶│   getBody()  │
│  (prop)      │    │  (computed)  │    │   renders    │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Remote Data Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    query     │───▶│   getData()  │───▶│   setData()  │
│   (state)    │    │  GraphQL     │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
                                               │
                                               ▼
                    ┌──────────────┐    ┌──────────────┐
                    │   getBody()  │◀───│  data.data   │
                    │   renders    │    │   (state)    │
                    └──────────────┘    └──────────────┘
```

### Data Fetching Process

```typescript
const getData = async (): Promise<MaterialTableRemoteDataReponse> => {
  // 1. Get query definition from form context
  const queryDefinition = formContext.graphql.query || formContext.graphql.queries[uiOptions.query];
  
  // 2. Map variables using object mapper
  let variables = reactory.utils.objectMapper({ formContext, query, props: queryDefinition.props }, variableMap);
  
  // 3. Execute GraphQL query
  const queryResult = await reactory.graphqlQuery(queryDefinition.text, variables, options);
  
  // 4. Map result data
  const $data = reactory.utils.objectMapper(queryResult.data[queryDefinition.name], uiOptions.resultMap);
  
  // 5. Update state
  setData(response);
};
```

## Integration Points

### Reactory API Integration

```typescript
// Component registration lookup
const reactory = useReactory();
const AlertDialog = reactory.getComponent('core.AlertDialog@1.0.0');
const DropDownMenu = reactory.getComponent('core.DropDownMenu@1.0.0');

// Custom renderers
const ColRenderer = reactory.getComponent(columnDef.component);
const ToolbarComponent = reactory.getComponent(uiOptions.componentMap.Toolbar);
const DetailsPanelComponent = reactory.getComponent(uiOptions.componentMap.DetailsPanel);
```

### Form Context Integration

```typescript
interface FormContext {
  graphql: {
    query?: IReactoryFormQuery;
    queries?: Record<string, IReactoryFormQuery>;
    mutation?: Record<string, IReactoryFormMutation>;
  };
  $formData: any;
  $ref: any;  // Reference to form instance
  $selectedRows?: { current: any[] };
  signature: string;
}
```

### Event System Integration

```typescript
// Binding refresh events
uiOptions.refreshEvents.forEach((reactoryEvent) => {
  reactory.on(reactoryEvent.name, refresh);
});

// Emitting events after mutations
if (mutationDefinition.onSuccessEvent) {
  reactory.emit(mutationDefinition.onSuccessEvent.name, data);
}

// Cleanup on unmount
const willUnmount = () => {
  uiOptions.refreshEvents.forEach((reactoryEvent) => {
    reactory.removeListener(reactoryEvent.name, refresh);
  });
};
```

### Theme Integration

```typescript
const theme: Theme & { MaterialTableWidget: any } = useTheme();

// Theme-based styling
if (theme.MaterialTableWidget) {
  const view_mode = localStorage.getItem('$reactory$theme_mode') || "light";
  theme_row_style = theme.MaterialTableWidget[view_mode].rowStyle;
  theme_alt_rowStyle = theme.MaterialTableWidget[view_mode].altRowStyle;
  theme_selected_style = theme.MaterialTableWidget[view_mode].selectedRowStyle;
  theme_header_style = theme.MaterialTableWidget[view_mode].headerStyle;
}
```

## Type System

### Core Types

```typescript
// Remote data response structure
interface MaterialTableRemoteDataReponse {
  data: any[];
  paging: {
    page: number;
    pageSize: number;
    hasNext: boolean;
    total: number;
  };
}

// Query state for remote data
interface MaterialTableQuery {
  pageSize: number;
  page: number;
  search: string;
  [key: string]: any;  // Extensible for custom filters
}

// Column definition
interface MaterialTableColumn<TRow> {
  field: string;
  title: string;
  renderRow?: (rowData: TRow, rowIndex: number, rowState: MaterialTableRowState) => JSX.Element;
  renderHeader?: (data: TRow[], rowState: MaterialTableRowState) => JSX.Element;
  renderFooter?: (data: TRow[], rowState: MaterialTableRowState) => JSX.Element;
  renderCell?: (cellData: any, cellIndex: number, rowData: TRow[], rowIndex: number) => JSX.Element;
  footerProps?: any;
  headerProps?: any;
  rowProps?: any;
  altRowProps?: any;
  cellProps?: any;
  sx?: SxProps<Theme>;
  format?: string;
}
```

### Widget Options Type

```typescript
interface IMaterialTableWidgetOptions {
  columns: MaterialTableWidgetColumnDefinition[];
  remoteData?: boolean;
  query?: string;
  variables?: ObjectMap;
  resultMap?: ObjectMap;
  options?: MaterialTableOptions;
  actions?: IMaterialTableWidgetAction[];
  componentMap?: {
    Toolbar?: string;
    DetailsPanel?: string;
  };
  toolbarProps?: any;
  toolbarPropsMap?: ObjectMap;
  detailPanelProps?: any;
  detailPanelPropsMap?: ObjectMap;
  search?: boolean;
  pagination?: boolean | null;
  allowAdd?: boolean;
  allowDelete?: boolean;
  addButtonProps?: ButtonProps;
  deleteButtonProps?: ButtonProps;
  refreshEvents?: ReactoryEvent[];
  // Styling
  rowStyle?: React.CSSProperties;
  altRowStyle?: React.CSSProperties;
  selectedRowStyle?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
  conditionalRowStyling?: ConditionalRowStyling[];
  // Localization
  localization?: {
    body?: {
      emptyDataSourceMessage?: string;
    };
  };
}
```

### Hook Types

See [API_REFERENCE.md](./API_REFERENCE.md) for complete hook type definitions.

## Performance Considerations

### Memoization Opportunities

1. **Column rendering**: Column definitions could be memoized when not dependent on row state
2. **Row components**: Individual rows could use `React.memo` with custom comparison
3. **Filter functions**: `applyFilters` in hooks use `useCallback` for stability

### Current Optimizations

- Uses `useState` with functional updates to avoid stale closures
- Effect dependencies are properly specified
- Debounced search prevents excessive re-renders

### Areas for Improvement

1. Consider virtualization for large datasets
2. Add `useMemo` for expensive column computations
3. Implement row-level memoization
4. Consider pagination-aware caching for remote data

## Error Handling

```typescript
try {
  return (
    <>
      {getToolbar()}
      <Table>{/* ... */}</Table>
      {getPagination()}
      {confirmDialog}
    </>
  );
} catch (err) {
  reactory.log(`Error rendering MaterialTable:\n${err.message}`, { error: err });
  return (
    <>
      Something went wrong during the render of the data table, please{' '}
      <Button onClick={() => setVersion(version + 1)}>Retry</Button>
    </>
  );
}
```

## Extension Points

### Custom Column Renderer

```typescript
// In column definition
{
  field: 'status',
  title: 'Status',
  component: 'my-org.StatusBadge@1.0.0',
  propsMap: {
    'status': 'cellData',
    'rowId': 'rowData.id'
  }
}
```

### Custom Toolbar

```typescript
// In ui:options
{
  componentMap: {
    Toolbar: 'my-org.CustomTableToolbar@1.0.0'
  },
  toolbarPropsMap: {
    'filters': 'formContext.activeFilters',
    'onExport': 'formContext.handleExport'
  }
}
```

### Custom Detail Panel

```typescript
// In ui:options
{
  componentMap: {
    DetailsPanel: 'my-org.UserDetailPanel@1.0.0'
  },
  detailPanelProps: {
    showActions: true
  }
}
```
