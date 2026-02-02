# MaterialTableWidget Testing Guide

Comprehensive testing guide following Test-Driven Development (TDD) principles for the MaterialTableWidget module.

## Table of Contents

- [TDD Philosophy](#tdd-philosophy)
- [Test Environment Setup](#test-environment-setup)
- [Test Structure](#test-structure)
- [Hook Testing](#hook-testing)
- [Component Testing](#component-testing)
- [Integration Testing](#integration-testing)
- [Running Tests](#running-tests)
- [Coverage Requirements](#coverage-requirements)
- [Best Practices](#best-practices)

---

## TDD Philosophy

### The Red-Green-Refactor Cycle

When developing new features or fixing bugs in the MaterialTableWidget:

1. **RED**: Write a failing test that describes the expected behavior
2. **GREEN**: Write the minimum code necessary to make the test pass
3. **REFACTOR**: Improve the code while keeping tests green

### TDD Benefits for This Widget

- **Confidence in Changes**: Complex state management requires test coverage
- **Documentation**: Tests serve as living documentation of expected behavior
- **Regression Prevention**: Catch breaking changes early
- **Design Improvement**: TDD encourages better component interfaces

---

## Test Environment Setup

### Prerequisites

```bash
# Install dependencies
cd /path/to/reactory-pwa-client
yarn install

# Verify test setup
yarn test --listTests
```

### Test Configuration

The project uses Jest with the following configuration relevant to this widget:

```typescript
// jest.config.ts (relevant excerpt)
{
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@reactory/client-core/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{ts,tsx}',
  ],
}
```

### Required Test Utilities

```typescript
// Common imports for hook testing (React 17)
import { renderHook, act } from '@testing-library/react-hooks';

// Common imports for component testing
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
```

> **Note for React 17**: This project uses React 17, so hook testing requires `@testing-library/react-hooks`. 
> For React 18+, `renderHook` is exported directly from `@testing-library/react`.

---

## Test Structure

### Directory Structure

```
MaterialTableWidget/
├── __tests__/
│   ├── MaterialTableWidget.test.tsx    # Main component tests (33 tests)
│   └── README.md                       # Test-specific notes
├── components/
│   └── __tests__/
│       ├── AdvancedFilterPanel.test.tsx  # (31 tests)
│       ├── QuickFilters.test.tsx         # (28 tests)
│       ├── SearchBar.test.tsx            # (17 tests)
│       └── README.md
└── hooks/
    └── __tests__/
        ├── useAdvancedFilters.test.ts    # (30 tests)
        ├── useDebounce.test.ts           # (21 tests)
        ├── useQuickFilters.test.ts       # (28 tests)
        └── README.md
```

### Test Coverage Summary

| Category | Files | Tests |
|----------|-------|-------|
| Main Component | 1 | 33 |
| Sub-Components | 3 | 76 |
| Hooks | 3 | 79 |
| **Total** | **7** | **188** |

### Test File Naming Convention

| Pattern | Purpose |
|---------|---------|
| `*.test.ts(x)` | Unit tests |
| `*.spec.ts(x)` | Specification tests (BDD style) |
| `integration/*.test.tsx` | Integration tests |

---

## Hook Testing

### useDebounce Tests

```typescript
// hooks/__tests__/useDebounce.test.ts
// For React 17, use @testing-library/react-hooks
import { renderHook, act } from '@testing-library/react-hooks';
import { useDebounce, useDebouncedSearch } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic debouncing', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 300));
      expect(result.current).toBe('initial');
    });

    it('should debounce value changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });
      
      // Value should not change immediately
      expect(result.current).toBe('initial');
      
      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      // Now value should be updated
      expect(result.current).toBe('updated');
    });

    it('should reset timer on rapid changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'a' } }
      );

      // Rapid changes
      rerender({ value: 'b' });
      act(() => { jest.advanceTimersByTime(100); });
      
      rerender({ value: 'c' });
      act(() => { jest.advanceTimersByTime(100); });
      
      rerender({ value: 'd' });
      act(() => { jest.advanceTimersByTime(100); });

      // Still showing 'a' because timer keeps resetting
      expect(result.current).toBe('a');

      // Wait for full debounce period
      act(() => { jest.advanceTimersByTime(300); });
      
      // Now shows final value
      expect(result.current).toBe('d');
    });
  });
});

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with initial value', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedSearch({ onSearch, initialValue: 'test' })
    );

    expect(result.current.searchValue).toBe('test');
  });

  it('should show searching state while debouncing', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedSearch({ onSearch, delay: 300 })
    );

    act(() => {
      result.current.setSearchValue('query');
    });

    expect(result.current.isSearching).toBe(true);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.isSearching).toBe(false);
    expect(onSearch).toHaveBeenCalledWith('query');
  });

  it('should clear search value', () => {
    const onSearch = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedSearch({ onSearch, initialValue: 'test' })
    );

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchValue).toBe('');
  });
});
```

### useQuickFilters Tests

```typescript
// hooks/__tests__/useQuickFilters.test.ts
// For React 17, use @testing-library/react-hooks
import { renderHook, act } from '@testing-library/react-hooks';
import { useQuickFilters, QuickFilterDefinition } from '../useQuickFilters';

const mockFilters: QuickFilterDefinition[] = [
  {
    id: 'active',
    label: 'Active',
    filter: { field: 'status', value: 'active', operator: 'eq' },
  },
  {
    id: 'pending',
    label: 'Pending',
    filter: { field: 'status', value: 'pending', operator: 'eq' },
  },
  {
    id: 'admin',
    label: 'Admins',
    filter: { 
      field: 'role', 
      value: 'admin', 
      operator: 'eq',
      additionalFilters: [
        { field: 'status', value: 'active', operator: 'eq' }
      ]
    },
  },
];

describe('useQuickFilters', () => {
  describe('initialization', () => {
    it('should initialize with empty active filters', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters })
      );

      expect(result.current.activeFilters).toEqual([]);
    });
  });

  describe('single-select mode', () => {
    it('should activate a filter', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters, multiSelect: false })
      );

      act(() => {
        result.current.toggleFilter('active');
      });

      expect(result.current.activeFilters).toEqual(['active']);
      expect(result.current.isActive('active')).toBe(true);
    });

    it('should replace active filter when toggling another', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters, multiSelect: false })
      );

      act(() => {
        result.current.toggleFilter('active');
      });

      act(() => {
        result.current.toggleFilter('pending');
      });

      expect(result.current.activeFilters).toEqual(['pending']);
    });

    it('should deactivate filter when toggling same filter', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters, multiSelect: false })
      );

      act(() => {
        result.current.toggleFilter('active');
      });

      act(() => {
        result.current.toggleFilter('active');
      });

      expect(result.current.activeFilters).toEqual([]);
    });
  });

  describe('multi-select mode', () => {
    it('should allow multiple active filters', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters, multiSelect: true })
      );

      act(() => {
        result.current.toggleFilter('active');
        result.current.toggleFilter('admin');
      });

      expect(result.current.activeFilters).toContain('active');
      expect(result.current.activeFilters).toContain('admin');
    });
  });

  describe('applyFilters', () => {
    const testData = [
      { id: 1, status: 'active', role: 'admin' },
      { id: 2, status: 'active', role: 'user' },
      { id: 3, status: 'pending', role: 'user' },
      { id: 4, status: 'inactive', role: 'admin' },
    ];

    it('should return all data when no filters active', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters })
      );

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(4);
    });

    it('should filter data based on active filter', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters })
      );

      act(() => {
        result.current.toggleFilter('active');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(item => item.status === 'active')).toBe(true);
    });

    it('should apply additional filters', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters })
      );

      act(() => {
        result.current.toggleFilter('admin');
      });

      const filtered = result.current.applyFilters(testData);
      // Only active admins
      expect(filtered).toHaveLength(1);
      expect(filtered[0]).toEqual({ id: 1, status: 'active', role: 'admin' });
    });
  });

  describe('onFilterChange callback', () => {
    it('should call onFilterChange when filters change', () => {
      const onFilterChange = jest.fn();
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters, onFilterChange })
      );

      act(() => {
        result.current.toggleFilter('active');
      });

      expect(onFilterChange).toHaveBeenCalledWith(['active']);
    });
  });

  describe('clearFilters', () => {
    it('should clear all active filters', () => {
      const { result } = renderHook(() =>
        useQuickFilters({ filters: mockFilters, multiSelect: true })
      );

      act(() => {
        result.current.toggleFilter('active');
        result.current.toggleFilter('pending');
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.activeFilters).toEqual([]);
    });
  });
});
```

### useAdvancedFilters Tests

```typescript
// hooks/__tests__/useAdvancedFilters.test.ts
// For React 17, use @testing-library/react-hooks
import { renderHook, act } from '@testing-library/react-hooks';
import { useAdvancedFilters, AdvancedFilterField } from '../useAdvancedFilters';

const mockFields: AdvancedFilterField[] = [
  {
    id: 'status',
    label: 'Status',
    field: 'status',
    type: 'select',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ],
  },
  {
    id: 'name',
    label: 'Name',
    field: 'name',
    type: 'text',
  },
  {
    id: 'age',
    label: 'Age',
    field: 'age',
    type: 'number',
  },
];

describe('useAdvancedFilters', () => {
  describe('initialization', () => {
    it('should initialize with empty filters', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      expect(result.current.filters).toEqual([]);
      expect(result.current.activeFilterCount).toBe(0);
    });
  });

  describe('setFilter', () => {
    it('should add a new filter', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });

      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0]).toEqual({
        field: 'status',
        value: 'active',
        operator: 'eq',
        label: 'Status',
      });
    });

    it('should update existing filter', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });

      act(() => {
        result.current.setFilter('status', 'inactive', 'eq');
      });

      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0].value).toBe('inactive');
    });

    it('should remove filter when value is empty', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });

      act(() => {
        result.current.setFilter('status', '', 'eq');
      });

      expect(result.current.filters).toHaveLength(0);
    });
  });

  describe('removeFilter', () => {
    it('should remove a specific filter', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
        result.current.setFilter('name', 'John', 'contains');
      });

      act(() => {
        result.current.removeFilter('status');
      });

      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0].field).toBe('name');
    });
  });

  describe('applyFilters operators', () => {
    const testData = [
      { id: 1, name: 'John Doe', status: 'active', age: 30 },
      { id: 2, name: 'Jane Smith', status: 'inactive', age: 25 },
      { id: 3, name: 'Bob Johnson', status: 'active', age: 35 },
    ];

    it('should apply eq operator', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(2);
    });

    it('should apply contains operator', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('name', 'john', 'contains');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(2); // John Doe and Bob Johnson
    });

    it('should apply gt operator', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('age', 28, 'gt');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(2); // John (30) and Bob (35)
    });

    it('should apply between operator', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('age', [26, 32], 'between');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(1); // Only John (30)
    });

    it('should apply in operator', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', ['active', 'pending'], 'in');
      });

      const filtered = result.current.applyFilters(testData);
      expect(filtered).toHaveLength(2);
    });
  });

  describe('presets', () => {
    it('should save a preset', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
        result.current.savePreset('Active Users');
      });

      expect(result.current.presets).toHaveLength(1);
      expect(result.current.presets[0].name).toBe('Active Users');
    });

    it('should load a preset', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
        result.current.savePreset('Active Users');
      });

      const presetId = result.current.presets[0].id;

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toHaveLength(0);

      act(() => {
        result.current.loadPreset(presetId);
      });

      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0].value).toBe('active');
    });

    it('should delete a preset', () => {
      const { result } = renderHook(() =>
        useAdvancedFilters({ fields: mockFields })
      );

      act(() => {
        result.current.setFilter('status', 'active', 'eq');
        result.current.savePreset('Preset 1');
      });

      const presetId = result.current.presets[0].id;

      act(() => {
        result.current.deletePreset(presetId);
      });

      expect(result.current.presets).toHaveLength(0);
    });
  });
});
```

---

## Component Testing

### SearchBar Component Tests

```typescript
// components/__tests__/SearchBar.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../SearchBar';

describe('SearchBar', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render with placeholder', () => {
    render(<SearchBar onSearch={jest.fn()} placeholder="Search users..." />);
    
    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
  });

  it('should call onSearch after debounce', async () => {
    const onSearch = jest.fn();
    render(<SearchBar onSearch={onSearch} debounceDelay={300} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test query' } });
    
    expect(onSearch).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('test query');
    });
  });

  it('should show loading indicator while searching', async () => {
    render(<SearchBar onSearch={jest.fn()} debounceDelay={300} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('should clear search when clear button clicked', async () => {
    const onSearch = jest.fn();
    render(<SearchBar onSearch={onSearch} initialValue="test" />);
    
    const clearButton = screen.getByRole('button');
    fireEvent.click(clearButton);
    
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('');
    });
  });

  it('should show help tooltip when enabled', () => {
    render(
      <SearchBar 
        onSearch={jest.fn()} 
        showHelpTooltip 
        helpText="Custom help text" 
      />
    );
    
    expect(screen.getByLabelText('Custom help text')).toBeInTheDocument();
  });
});
```

### QuickFilters Component Tests

```typescript
// components/__tests__/QuickFilters.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickFilters } from '../QuickFilters';
import { QuickFilterDefinition } from '../../hooks';

const mockFilters: QuickFilterDefinition[] = [
  {
    id: 'active',
    label: 'Active',
    icon: 'check_circle',
    color: 'success',
    filter: { field: 'status', value: 'active', operator: 'eq' },
    badge: 10,
  },
  {
    id: 'pending',
    label: 'Pending',
    filter: { field: 'status', value: 'pending', operator: 'eq' },
  },
];

describe('QuickFilters', () => {
  describe('button variant', () => {
    it('should render filter buttons', () => {
      render(
        <QuickFilters
          filters={mockFilters}
          onFilterChange={jest.fn()}
          variant="buttons"
        />
      );
      
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should call onFilterChange when filter clicked', () => {
      const onFilterChange = jest.fn();
      render(
        <QuickFilters
          filters={mockFilters}
          onFilterChange={onFilterChange}
          variant="buttons"
        />
      );
      
      fireEvent.click(screen.getByText('Active'));
      
      expect(onFilterChange).toHaveBeenCalledWith(['active']);
    });

    it('should show badge when provided', () => {
      render(
        <QuickFilters
          filters={mockFilters}
          onFilterChange={jest.fn()}
          variant="buttons"
        />
      );
      
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  describe('chip variant', () => {
    it('should render filter chips', () => {
      render(
        <QuickFilters
          filters={mockFilters}
          onFilterChange={jest.fn()}
          variant="chips"
        />
      );
      
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  describe('clear button', () => {
    it('should show clear button when filters are active', () => {
      const { rerender } = render(
        <QuickFilters
          filters={mockFilters}
          onFilterChange={jest.fn()}
          showClearButton
        />
      );
      
      // Initially no clear button (no active filters)
      expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument();
      
      // Activate a filter
      fireEvent.click(screen.getByText('Active'));
      
      // Clear button should appear
      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });
  });
});
```

---

## Integration Testing

### Filtering Integration Test

```typescript
// __tests__/integration/filtering.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MaterialTableWidget } from '../../MaterialTableWidget';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock Reactory context
const mockReactoryContext = {
  getComponent: jest.fn((name) => {
    if (name === 'core.AlertDialog@1.0.0') return () => null;
    if (name === 'core.DropDownMenu@1.0.0') return () => null;
    return null;
  }),
  getComponents: jest.fn(() => ({ DropDownMenu: () => null })),
  utils: {
    objectMapper: jest.fn((input) => input),
    template: jest.fn((str) => () => str),
    lodash: { cloneDeep: jest.fn((obj) => JSON.parse(JSON.stringify(obj))) },
  },
  graphqlQuery: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  i18n: { t: jest.fn((key, fallback) => fallback || key) },
};

jest.mock('@reactory/client-core/api/ApiProvider', () => ({
  useReactory: () => mockReactoryContext,
  withReactory: (Component) => Component,
}));

const theme = createTheme();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('MaterialTableWidget Filtering Integration', () => {
  const testData = [
    { id: '1', name: 'John', status: 'active' },
    { id: '2', name: 'Jane', status: 'inactive' },
    { id: '3', name: 'Bob', status: 'active' },
  ];

  const defaultProps = {
    schema: {
      type: 'array' as const,
      items: { type: 'object' as const },
    },
    uiSchema: {
      'ui:widget': 'MaterialTableWidget',
      'ui:options': {
        columns: [
          { field: 'name', title: 'Name' },
          { field: 'status', title: 'Status' },
        ],
        search: true,
      },
    },
    idSchema: { $id: 'test-table' },
    formData: testData,
    formContext: { graphql: {} },
    onChange: jest.fn(),
  };

  it('should display all rows initially', () => {
    renderWithProviders(<MaterialTableWidget {...defaultProps} />);
    
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should filter rows based on search', async () => {
    renderWithProviders(<MaterialTableWidget {...defaultProps} />);
    
    const searchInput = screen.getByLabelText('Search');
    fireEvent.change(searchInput, { target: { value: 'John' } });
    fireEvent.keyPress(searchInput, { key: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.queryByText('Jane')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });
  });
});
```

---

## Running Tests

### Commands

```bash
# Run all tests
yarn test

# Run tests for MaterialTableWidget specifically
yarn test --testPathPattern="MaterialTableWidget"

# Run tests in watch mode
yarn test --watch --testPathPattern="MaterialTableWidget"

# Run tests with coverage
yarn test --coverage --testPathPattern="MaterialTableWidget"

# Run a specific test file
yarn test hooks/__tests__/useQuickFilters.test.ts

# Run tests matching a pattern
yarn test --testNamePattern="should filter"
```

### Debugging Tests

```bash
# Run with verbose output
yarn test --verbose --testPathPattern="MaterialTableWidget"

# Run with debug logging
DEBUG=true yarn test --testPathPattern="MaterialTableWidget"
```

---

## Coverage Requirements

### Minimum Coverage Targets

| Metric | Target | Priority |
|--------|--------|----------|
| Statements | 80% | High |
| Branches | 75% | High |
| Functions | 80% | High |
| Lines | 80% | High |

### Critical Paths (100% Coverage)

- Hook state management (all state transitions)
- Filter application logic
- Data transformation functions
- Event handler callbacks

### Coverage Report

```bash
# Generate coverage report
yarn test --coverage --collectCoverageFrom="src/components/reactory/ux/mui/widgets/MaterialTableWidget/**/*.{ts,tsx}"

# View HTML report
open coverage/lcov-report/index.html
```

---

## Best Practices

### Test Organization

1. **Group by behavior**: Use `describe` blocks for logical groupings
2. **Single assertion**: Each `it` block tests one behavior
3. **Clear naming**: Test names describe expected behavior

### Test Data

1. **Use factories**: Create helper functions for test data
2. **Minimal data**: Only include fields needed for the test
3. **Realistic data**: Use data that represents real-world scenarios

### Mocking

1. **Mock at boundaries**: Mock external dependencies, not internal functions
2. **Minimal mocking**: Only mock what's necessary
3. **Reset mocks**: Use `beforeEach` to reset mock state

### Async Testing

1. **Use `waitFor`**: For assertions that depend on async operations
2. **Fake timers**: Use `jest.useFakeTimers()` for debounce/throttle tests
3. **Cleanup**: Ensure async operations complete before test ends

### Example Test Template

```typescript
describe('ComponentName', () => {
  // Setup
  const defaultProps = { /* ... */ };
  
  const renderComponent = (overrides = {}) => {
    return render(<ComponentName {...defaultProps} {...overrides} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('feature/behavior group', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange
      const props = { /* specific props */ };
      
      // Act
      renderComponent(props);
      
      // Assert
      expect(screen.getByText('expected')).toBeInTheDocument();
    });
  });
});
```
