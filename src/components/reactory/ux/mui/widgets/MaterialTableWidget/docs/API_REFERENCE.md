# MaterialTableWidget API Reference

Complete API documentation for all components, hooks, and types in the MaterialTableWidget module.

## Table of Contents

- [Main Component](#main-component)
- [Sub-Components](#sub-components)
- [Hooks](#hooks)
- [Types](#types)
- [Configuration Options](#configuration-options)

---

## Main Component

### MaterialTableWidget

The primary widget component for rendering data tables in Reactory forms.

#### Props

```typescript
interface ReactoryMaterialTableProps {
  /** Reactory API instance */
  reactory: ReactoryApi;
  
  /** Theme object from MUI */
  theme: any;
  
  /** JSON Schema for the array field */
  schema: Reactory.Schema.IArraySchema;
  
  /** UI Schema with widget options */
  uiSchema: ReactoryMaterialTableUISchema;
  
  /** ID schema from RJSF */
  idSchema: Reactory.Schema.IDSchema;
  
  /** Array of data to display */
  formData: any[];
  
  /** Form context with graphql definitions and form state */
  formContext: any;
  
  /** Paging information (optional) */
  paging?: any;
  
  /** Initial search text (optional) */
  searchText?: any;
  
  /** Widget registry with fields and widgets */
  registry: {
    fields: { [key: string]: any };
    widgets: { [key: string]: any };
  };
  
  /** Callback when data changes */
  onChange: (formData: any[]) => void;
}
```

#### Usage

```tsx
// Typically used via Reactory form configuration, not direct instantiation
<ReactoryMaterialTable
  reactory={reactoryApi}
  schema={arraySchema}
  uiSchema={materialTableUISchema}
  idSchema={idSchema}
  formData={dataArray}
  formContext={formContext}
  registry={registry}
  onChange={handleDataChange}
/>
```

---

## Sub-Components

### SearchBar

A debounced search input with loading indicator and help tooltip.

#### Props

```typescript
interface SearchBarProps {
  /** Callback when search text changes (debounced) */
  onSearch: (searchText: string) => void;
  
  /** Input placeholder text */
  placeholder?: string;  // default: 'Search...'
  
  /** Debounce delay in milliseconds */
  debounceDelay?: number;  // default: 300
  
  /** Initial search value */
  initialValue?: string;  // default: ''
  
  /** Show manual search button */
  showSearchButton?: boolean;  // default: false
  
  /** Show help tooltip icon */
  showHelpTooltip?: boolean;  // default: false
  
  /** Help tooltip text */
  helpText?: string;  // default: 'Search across all fields'
  
  /** Expand to full width */
  fullWidth?: boolean;  // default: false
}
```

#### Usage

```tsx
<SearchBar
  onSearch={(text) => setSearchQuery(text)}
  placeholder="Search users..."
  debounceDelay={300}
  showHelpTooltip
  helpText="Search by name, email, or ID"
/>
```

---

### QuickFilters

Quick filter buttons or chips for predefined filtering scenarios.

#### Props

```typescript
interface QuickFiltersProps {
  /** Array of filter definitions */
  filters: QuickFilterDefinition[];
  
  /** Callback when active filters change */
  onFilterChange: (activeFilters: string[]) => void;
  
  /** Display variant */
  variant?: 'buttons' | 'chips';  // default: 'buttons'
  
  /** Allow multiple filters to be active */
  multiSelect?: boolean;  // default: false
  
  /** Show clear filters button */
  showClearButton?: boolean;  // default: true
}
```

#### Filter Definition

```typescript
interface QuickFilterDefinition {
  /** Unique identifier */
  id: string;
  
  /** Display label */
  label: string;
  
  /** Material icon name */
  icon?: string;
  
  /** MUI color variant */
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'default';
  
  /** Filter configuration */
  filter: {
    field: string;
    value: any;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not-in' | 'is-null' | 'is-not-null' | 'contains';
    additionalFilters?: Array<{
      field: string;
      value: any;
      operator: string;
    }>;
  };
  
  /** Badge content (count/label) */
  badge?: string | number;
}
```

#### Usage

```tsx
const filterDefs: QuickFilterDefinition[] = [
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
  },
];

<QuickFilters
  filters={filterDefs}
  onFilterChange={(activeIds) => handleFilterChange(activeIds)}
  variant="chips"
  multiSelect={false}
/>
```

---

### AdvancedFilterPanel

A slide-out drawer for complex multi-field filtering with preset support.

#### Props

```typescript
interface AdvancedFilterPanelProps {
  /** Whether the panel is open */
  open: boolean;
  
  /** Close handler */
  onClose: () => void;
  
  /** Array of filterable field definitions */
  fields: AdvancedFilterField[];
  
  /** Callback when filters change */
  onFilterChange: (filters: AdvancedFilter[]) => void;
  
  /** Show preset management UI */
  showPresets?: boolean;  // default: false
}
```

#### Field Definition

```typescript
interface AdvancedFilterField {
  /** Unique identifier */
  id: string;
  
  /** Display label */
  label: string;
  
  /** Data field path (supports dot notation) */
  field: string;
  
  /** Input type */
  type: 'select' | 'multi-select' | 'date-range' | 'text' | 'number' | 'boolean';
  
  /** Options for select/multi-select */
  options?: Array<{ label: string; value: any }>;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** Default value */
  defaultValue?: any;
}
```

#### Usage

```tsx
const filterFields: AdvancedFilterField[] = [
  {
    id: 'status',
    label: 'Status',
    field: 'status',
    type: 'multi-select',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ],
  },
  {
    id: 'createdAt',
    label: 'Created Date',
    field: 'createdAt',
    type: 'date-range',
  },
  {
    id: 'name',
    label: 'Name',
    field: 'name',
    type: 'text',
    placeholder: 'Search by name...',
  },
];

<AdvancedFilterPanel
  open={panelOpen}
  onClose={() => setPanelOpen(false)}
  fields={filterFields}
  onFilterChange={(filters) => applyFilters(filters)}
  showPresets
/>
```

---

## Hooks

### useDebounce

Generic debounce hook for any value type.

#### Signature

```typescript
function useDebounce<T>(value: T, delay: number): T
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `value` | `T` | The value to debounce |
| `delay` | `number` | Delay in milliseconds |

#### Returns

The debounced value of type `T`.

#### Usage

```typescript
const [searchText, setSearchText] = useState('');
const debouncedSearch = useDebounce(searchText, 300);

useEffect(() => {
  // Only runs when debouncedSearch changes
  performSearch(debouncedSearch);
}, [debouncedSearch]);
```

---

### useDebouncedSearch

Specialized hook for search functionality with loading state.

#### Signature

```typescript
function useDebouncedSearch(options: UseDebouncedSearchOptions): UseDebouncedSearchResult
```

#### Options

```typescript
interface UseDebouncedSearchOptions {
  /** Callback when debounced search is triggered */
  onSearch: (value: string) => void;
  
  /** Debounce delay in milliseconds */
  delay?: number;  // default: 300
  
  /** Initial search value */
  initialValue?: string;  // default: ''
}
```

#### Returns

```typescript
interface UseDebouncedSearchResult {
  /** Current input value */
  searchValue: string;
  
  /** Debounced value */
  debouncedValue: string;
  
  /** True while waiting for debounce */
  isSearching: boolean;
  
  /** Update the search value */
  setSearchValue: (value: string) => void;
  
  /** Clear the search value */
  clearSearch: () => void;
}
```

#### Usage

```typescript
const { searchValue, setSearchValue, isSearching, clearSearch } = useDebouncedSearch({
  onSearch: (value) => fetchResults(value),
  delay: 300,
  initialValue: '',
});

return (
  <TextField
    value={searchValue}
    onChange={(e) => setSearchValue(e.target.value)}
    InputProps={{
      endAdornment: isSearching ? <CircularProgress size={20} /> : null,
    }}
  />
);
```

---

### useQuickFilters

Hook for managing quick filter state and applying filters to data.

#### Signature

```typescript
function useQuickFilters(options: UseQuickFiltersOptions): UseQuickFiltersResult
```

#### Options

```typescript
interface UseQuickFiltersOptions {
  /** Array of filter definitions */
  filters: QuickFilterDefinition[];
  
  /** Allow multiple active filters */
  multiSelect?: boolean;  // default: false
  
  /** Callback when active filters change */
  onFilterChange?: (activeFilters: string[]) => void;
}
```

#### Returns

```typescript
interface UseQuickFiltersResult {
  /** Array of active filter IDs */
  activeFilters: string[];
  
  /** Toggle a filter on/off */
  toggleFilter: (filterId: string) => void;
  
  /** Clear all active filters */
  clearFilters: () => void;
  
  /** Check if a filter is active */
  isActive: (filterId: string) => boolean;
  
  /** Apply active filters to a data array */
  applyFilters: (data: any[]) => any[];
}
```

#### Usage

```typescript
const { activeFilters, toggleFilter, clearFilters, applyFilters } = useQuickFilters({
  filters: quickFilterDefs,
  multiSelect: true,
  onFilterChange: (filters) => console.log('Active:', filters),
});

// Apply filters to data
const filteredData = applyFilters(rawData);

// Toggle a filter
<Button onClick={() => toggleFilter('active')}>Active Users</Button>
```

---

### useAdvancedFilters

Hook for managing complex multi-field filters with preset support.

#### Signature

```typescript
function useAdvancedFilters(options: UseAdvancedFiltersOptions): UseAdvancedFiltersResult
```

#### Options

```typescript
interface UseAdvancedFiltersOptions {
  /** Array of filterable field definitions */
  fields: AdvancedFilterField[];
  
  /** Callback when filters change */
  onFilterChange?: (filters: AdvancedFilter[]) => void;
}
```

#### Returns

```typescript
interface UseAdvancedFiltersResult {
  /** Current active filters */
  filters: AdvancedFilter[];
  
  /** Set or update a filter */
  setFilter: (field: string, value: any, operator?: string) => void;
  
  /** Remove a filter by field */
  removeFilter: (field: string) => void;
  
  /** Clear all filters */
  clearFilters: () => void;
  
  /** Apply filters to a data array */
  applyFilters: (data: any[]) => any[];
  
  /** Number of active filters */
  activeFilterCount: number;
  
  /** Saved filter presets */
  presets: FilterPreset[];
  
  /** Save current filters as a preset */
  savePreset: (name: string) => void;
  
  /** Load a saved preset */
  loadPreset: (presetId: string) => void;
  
  /** Delete a preset */
  deletePreset: (presetId: string) => void;
}
```

#### Filter and Preset Types

```typescript
interface AdvancedFilter {
  field: string;
  value: any;
  operator: string;
  label?: string;
}

interface FilterPreset {
  id: string;
  name: string;
  filters: AdvancedFilter[];
  createdAt: Date;
}
```

#### Supported Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `status === 'active'` |
| `ne` | Not equals | `status !== 'deleted'` |
| `gt` | Greater than | `age > 18` |
| `gte` | Greater than or equal | `age >= 21` |
| `lt` | Less than | `price < 100` |
| `lte` | Less than or equal | `price <= 50` |
| `in` | In array | `status in ['active', 'pending']` |
| `not-in` | Not in array | `status not in ['deleted']` |
| `contains` | String contains (case-insensitive) | `name contains 'john'` |
| `starts-with` | String starts with | `name starts-with 'J'` |
| `ends-with` | String ends with | `email ends-with '@gmail.com'` |
| `between` | Value between range | `date between ['2024-01-01', '2024-12-31']` |
| `is-null` | Value is null/undefined | `deletedAt is null` |
| `is-not-null` | Value exists | `email is not null` |

#### Usage

```typescript
const {
  filters,
  setFilter,
  removeFilter,
  clearFilters,
  applyFilters,
  activeFilterCount,
  presets,
  savePreset,
  loadPreset,
  deletePreset,
} = useAdvancedFilters({
  fields: advancedFilterFields,
  onFilterChange: (filters) => fetchData({ filters }),
});

// Set a filter
setFilter('status', 'active', 'eq');

// Set a multi-select filter
setFilter('roles', ['admin', 'editor'], 'in');

// Set a date range filter
setFilter('createdAt', ['2024-01-01', '2024-12-31'], 'between');

// Apply filters client-side
const filteredData = applyFilters(rawData);

// Save current filters as preset
savePreset('My Active Users Filter');

// Load a preset
loadPreset(presets[0].id);
```

---

## Types

### MaterialTableRemoteDataResponse

```typescript
interface MaterialTableRemoteDataReponse {
  data: any[];
  paging: {
    page: number;
    pageSize: number;
    hasNext: boolean;
    total: number;
  };
}
```

### MaterialTableQuery

```typescript
interface MaterialTableQuery {
  pageSize: number;
  page: number;
  search: string;
  [key: string]: any;
}
```

### MaterialTableColumn

```typescript
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

### MaterialTableOptions

```typescript
interface MaterialTableOptions {
  rowStyle?: (rowData: any, idx: number) => any;
  rowSx?: SxProps<Theme>;
  headerStyle?: any;
  headerSx?: SxProps<Theme>;
  searchText?: string;
  sort?: boolean;
  sx?: SxProps<Theme>;
  grouping?: boolean;
  groupBy?: string[];
  search?: boolean;
  showTitle?: boolean;
  toolbar?: boolean;
  selection?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  allowOrder?: boolean;
  orderField?: string;
  sortFields?: { field: string; direction?: "asc" | "desc" }[];
  [key: string]: unknown;
}
```

### IRowState

```typescript
interface IRowState {
  selected?: boolean;
  hover?: boolean;
  editing?: boolean;
  saving?: boolean;
  dirty?: boolean;
  expanded?: boolean;
}
```

### MaterialTableRowState

```typescript
interface MaterialTableRowState {
  [key: number]: IRowState;
}
```

---

## Configuration Options

### UI Schema Options

Full reference for `ui:options` in the Reactory form UI schema:

```typescript
interface IMaterialTableWidgetOptions {
  // Column configuration
  columns: MaterialTableWidgetColumnDefinition[];
  columnsProperty?: string;
  columnsPropertyMap?: ObjectMap;
  
  // Data fetching
  remoteData?: boolean;
  query?: string;
  variables?: ObjectMap;
  resultMap?: ObjectMap;
  disablePaging?: boolean;
  
  // Table behavior
  options?: MaterialTableOptions;
  pagination?: boolean | null;
  search?: boolean;
  
  // Actions
  actions?: IMaterialTableWidgetAction[];
  allowAdd?: boolean;
  allowDelete?: boolean;
  addButtonProps?: {
    icon?: string;
    tooltip?: string;
    onClick?: string;
    onClickProps?: any;
    onClickPropsMap?: ObjectMap;
  };
  deleteButtonProps?: {
    icon?: string;
    tooltip?: string;
    onClick?: string;
    onClickProps?: any;
    onClickPropsMap?: ObjectMap;
  };
  
  // Custom components
  componentMap?: {
    Toolbar?: string;
    DetailsPanel?: string;
  };
  toolbarProps?: any;
  toolbarPropsMap?: ObjectMap;
  detailPanelProps?: any;
  detailPanelPropsMap?: ObjectMap;
  
  // Styling
  rowStyle?: React.CSSProperties;
  altRowStyle?: React.CSSProperties;
  selectedRowStyle?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
  conditionalRowStyling?: ConditionalRowStyling[];
  
  // Footer
  footerColumns?: any[];
  footerOptions?: {
    totals?: boolean;
    labelStyle?: React.CSSProperties;
    totalsRowStyle?: React.CSSProperties;
    totalsCellStyle?: React.CSSProperties;
    displayTotalsLabel?: boolean;
    paginationStyle?: React.CSSProperties;
  };
  
  // Events
  refreshEvents?: ReactoryEvent[];
  
  // Localization
  localization?: {
    body?: {
      emptyDataSourceMessage?: string;
    };
  };
}
```

### Column Definition Options

```typescript
interface MaterialTableWidgetColumnDefinition {
  field: string;
  title: string;
  
  // Custom rendering via component
  component?: string;
  components?: Array<{
    component: string;
    props?: any;
    propsMap?: ObjectMap;
  }>;
  props?: any;
  propsMap?: ObjectMap;
  
  // Responsive display
  breakpoint?: Breakpoint;
  
  // Styling
  sx?: SxProps<Theme>;
  
  // Formatting
  format?: string;  // Template string for cell formatting
  
  // Selection
  selected?: boolean;
}
```

### Action Definition

```typescript
interface IMaterialTableWidgetAction {
  key: string;
  title: string;
  icon?: string;
  iconProps?: any;
  tooltip?: string;
  isFreeAction?: boolean;  // True for toolbar actions, false for row actions
  
  // Mutation execution
  mutation?: string;
  
  // Event execution
  event?: {
    name: string;
    via: 'form' | 'api' | 'component';
    component?: string;
    params?: any;
    paramsMap?: ObjectMap;
  };
  
  // Confirmation dialog
  confirmation?: {
    title: string;
    content: string;
    acceptTitle: string;
    cancelTitle: string;
    titleProps?: any;
    contentProps?: any;
    confirmProps?: any;
    cancelProps?: any;
  };
  
  // Component rendering
  componentFqn?: string;
  propsMap?: ObjectMap;
}
```
