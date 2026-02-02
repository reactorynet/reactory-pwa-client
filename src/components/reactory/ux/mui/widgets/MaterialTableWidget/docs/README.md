# MaterialTableWidget

A powerful, flexible data table widget for the Reactory framework built with MUI (Material-UI). This widget provides comprehensive data display capabilities with support for remote data fetching, row selection, expandable details, filtering, pagination, and customizable actions.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Components](#components)
- [Hooks](#hooks)
- [Configuration](#configuration)
- [Related Documentation](#related-documentation)

## Overview

The MaterialTableWidget is a Reactory form widget designed for rendering tabular data with rich interactivity. It integrates seamlessly with the Reactory form system and supports both local data arrays and remote GraphQL queries.

### Key Characteristics

- **Framework Integration**: Built specifically for Reactory forms with full context support
- **TypeScript First**: Complete type definitions for all props, states, and configurations
- **MUI Based**: Leverages Material-UI components for consistent theming
- **GraphQL Ready**: Native support for remote data fetching via GraphQL queries

## Features

### Core Features

| Feature | Description |
|---------|-------------|
| **Data Display** | Render arrays of data with customizable columns |
| **Pagination** | Client and server-side pagination with configurable page sizes |
| **Row Selection** | Single and multi-select with header checkbox for select-all |
| **Expandable Rows** | Detail panels for each row with expand/collapse all |
| **Search** | Built-in search field with debounced input |
| **Sorting** | Column-based sorting support |
| **Actions** | Row and bulk actions with confirmation dialogs |

### Filtering System

| Component | Purpose |
|-----------|---------|
| `SearchBar` | Debounced text search with loading indicator |
| `QuickFilters` | Predefined filter buttons/chips for common filters |
| `AdvancedFilterPanel` | Drawer-based multi-field filtering with presets |

### Customization

- Custom column renderers via Reactory component registry
- Custom toolbar components
- Custom detail panel components
- Conditional row styling
- Theme integration for light/dark modes

## Installation

The MaterialTableWidget is part of the Reactory PWA Client. Import it directly:

```typescript
import { MaterialTableWidget } from '@reactory/client-core/components/reactory/ux/mui/widgets/MaterialTableWidget';
```

## Quick Start

### Basic Usage in a Reactory Form

```typescript
// schema.ts
export const schema: Reactory.Schema.ISchema = {
  type: 'object',
  properties: {
    users: {
      type: 'array',
      title: 'Users',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
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
        { field: 'name', title: 'Name' },
        { field: 'email', title: 'Email' },
      ],
      options: {
        selection: true,
        pageSize: 10,
        pageSizeOptions: [5, 10, 25, 50],
      },
    },
  },
};
```

### With Remote Data

```typescript
// uiSchema.ts
export const uiSchema: Reactory.Schema.IUISchema = {
  users: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      remoteData: true,
      query: 'listUsers', // References graphql.queries.listUsers
      columns: [
        { field: 'name', title: 'Name' },
        { field: 'email', title: 'Email' },
      ],
      variables: {
        'paging.page': 'query.page',
        'paging.pageSize': 'query.pageSize',
        'search': 'query.search',
      },
      resultMap: {
        'data': 'users',
        'paging': 'paging',
      },
    },
  },
};
```

## Architecture

```
MaterialTableWidget/
├── MaterialTableWidget.tsx    # Main widget component
├── index.ts                   # Module exports
├── components/                # Sub-components
│   ├── AdvancedFilterPanel.tsx
│   ├── ColumnHeader.tsx       # Enhanced column header renderer
│   ├── QuickFilters.tsx
│   ├── SearchBar.tsx
│   └── index.ts
├── hooks/                     # Custom React hooks
│   ├── useAdvancedFilters.ts
│   ├── useComponentLoader.ts  # Component loading with polling
│   ├── useDebounce.ts
│   ├── useQuickFilters.ts
│   └── index.ts
└── docs/                      # Documentation
    ├── README.md
    ├── ARCHITECTURE.md
    ├── API_REFERENCE.md
    ├── USAGE_EXAMPLES.md
    └── TESTING.md
```

## Components

### MaterialTableWidget

The main widget component that renders the data table.

```typescript
interface ReactoryMaterialTableProps {
  reactory: ReactoryApi;
  schema: Reactory.Schema.IArraySchema;
  uiSchema: ReactoryMaterialTableUISchema;
  idSchema: Reactory.Schema.IDSchema;
  formData: any[];
  formContext: any;
  onChange: (formData: any[]) => void;
}
```

### SearchBar

Debounced search input with loading state.

```typescript
<SearchBar
  onSearch={(text) => handleSearch(text)}
  placeholder="Search..."
  debounceDelay={300}
  showHelpTooltip
/>
```

### QuickFilters

Quick filter buttons or chips for common filtering scenarios.

```typescript
<QuickFilters
  filters={quickFilterDefinitions}
  onFilterChange={(activeFilters) => handleFilterChange(activeFilters)}
  variant="chips"
  multiSelect
/>
```

### ColumnHeader

Enhanced column header renderer with support for custom components, i18n, icons, and sort/filter indicators.

```typescript
// Column with enhanced header configuration
{
  field: 'status',
  title: 'Status',
  header: {
    // Use a custom header component via FQN
    headerComponent: 'custom.StatusColumnHeader@1.0.0',
    // Or use built-in features:
    titleKey: 'column.status.title',  // i18n translation key
    icon: 'check_circle',             // Material icon
    iconPosition: 'left',             // 'left' or 'right'
    iconColor: 'green',               // CSS color or theme color
    color: '#333',                    // Header text color
    backgroundColor: '#f5f5f5',       // Header cell background
    sortable: true,                   // Enable sort indicator
    filterable: true,                 // Enable filter indicator
    tooltip: 'Status of the item',    // Tooltip text
    tooltipKey: 'column.status.tooltip', // i18n tooltip key
    align: 'center',                  // 'left', 'center', 'right'
    variant: 'subtitle2',             // Typography variant
    minWidth: 120,                    // Minimum column width
    maxWidth: 200,                    // Maximum column width
    noWrap: true,                     // Prevent text wrapping
  }
}
```

#### Custom Header Component

Create a custom header component that receives all header context:

```typescript
// custom.StatusColumnHeader@1.0.0
const StatusColumnHeader: React.FC<ColumnHeaderProps> = ({
  field,
  title,
  reactory,
  theme,
  sortDirection,
  isFiltered,
  onSort,
  onFilter,
  data,
}) => {
  const translatedTitle = reactory.i18n.t(`column.${field}.title`, title);
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Icon color="primary">assessment</Icon>
      <Typography variant="subtitle2">{translatedTitle}</Typography>
      {sortDirection && (
        <IconButton size="small" onClick={() => onSort?.(field, sortDirection === 'asc' ? 'desc' : 'asc')}>
          <Icon>{sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}</Icon>
        </IconButton>
      )}
    </Box>
  );
};
```

### AdvancedFilterPanel

Drawer-based panel for complex multi-field filtering.

```typescript
<AdvancedFilterPanel
  open={isPanelOpen}
  onClose={() => setIsPanelOpen(false)}
  fields={filterFields}
  onFilterChange={(filters) => handleFilterChange(filters)}
  showPresets
/>
```

## Hooks

### useDebounce / useDebouncedSearch

Debounces a value or provides debounced search functionality.

```typescript
const debouncedValue = useDebounce(searchText, 300);

const { searchValue, setSearchValue, isSearching } = useDebouncedSearch({
  onSearch: (value) => console.log(value),
  delay: 300,
});
```

### useQuickFilters

Manages quick filter state with toggle functionality.

```typescript
const { activeFilters, toggleFilter, clearFilters, applyFilters } = useQuickFilters({
  filters: quickFilterDefinitions,
  multiSelect: false,
  onFilterChange: (filters) => console.log(filters),
});
```

### useAdvancedFilters

Manages complex filter state with preset support.

```typescript
const { filters, setFilter, removeFilter, clearFilters, savePreset, loadPreset } = useAdvancedFilters({
  fields: advancedFilterFields,
  onFilterChange: (filters) => console.log(filters),
});
```

## Configuration

### UI Options (`ui:options`)

| Option | Type | Description |
|--------|------|-------------|
| `columns` | `MaterialTableColumn[]` | Column definitions |
| `remoteData` | `boolean` | Enable remote data fetching |
| `query` | `string` | GraphQL query name |
| `variables` | `object` | Variable mapping for queries |
| `resultMap` | `object` | Result data mapping |
| `options` | `MaterialTableOptions` | Table behavior options |
| `actions` | `IMaterialTableWidgetAction[]` | Row/bulk actions |
| `componentMap` | `object` | Custom component mapping |
| `search` | `boolean` | Enable search field |
| `pagination` | `boolean` | Enable pagination |

### Table Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `selection` | `boolean` | `false` | Enable row selection |
| `toolbar` | `boolean` | `true` | Show toolbar |
| `pageSize` | `number` | `10` | Default page size |
| `pageSizeOptions` | `number[]` | `[5,10,25,50,100]` | Page size options |
| `grouping` | `boolean` | `false` | Enable grouping |
| `search` | `boolean` | `false` | Enable search |

## Related Documentation

- [Architecture Guide](./ARCHITECTURE.md) - Detailed component architecture
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Usage Examples](./USAGE_EXAMPLES.md) - Comprehensive usage examples
- [Testing Guide](./TESTING.md) - Testing strategies and TDD practices

## Contributing

When contributing to this widget, please follow the TDD principles outlined in the [Testing Guide](./TESTING.md) and the [Copilot Instructions](../.copilot-instructions.md).

## License

MIT License - See the project root LICENSE file for details.
