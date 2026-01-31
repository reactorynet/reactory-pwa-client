# MaterialTableWidget Main Component Tests

This directory contains unit tests for the main MaterialTableWidget component.

## Test Files

| File | Tests | Description |
|------|-------|-------------|
| `MaterialTableWidget.test.tsx` | 33 | Comprehensive tests for the main table widget |

## Complete Test Suite Summary

The full MaterialTableWidget test suite includes:

| Directory | File | Tests | Description |
|-----------|------|-------|-------------|
| `__tests__/` | `MaterialTableWidget.test.tsx` | 33 | Main component tests |
| `hooks/__tests__/` | `useDebounce.test.ts` | 21 | Debounce hook tests |
| `hooks/__tests__/` | `useQuickFilters.test.ts` | 28 | Quick filters hook tests |
| `hooks/__tests__/` | `useAdvancedFilters.test.ts` | 30 | Advanced filters hook tests |
| `components/__tests__/` | `SearchBar.test.tsx` | 17 | SearchBar component tests |
| `components/__tests__/` | `QuickFilters.test.tsx` | 28 | QuickFilters component tests |
| `components/__tests__/` | `AdvancedFilterPanel.test.tsx` | 31 | AdvancedFilterPanel component tests |
| **Total** | | **188** | |

## Test Coverage Areas

### Rendering
- Table structure (headers, rows, cells)
- Empty state handling
- Custom localization messages

### Selection
- Individual row selection
- Select all / deselect all
- Indeterminate checkbox state
- Selected count display

### Pagination
- Pagination controls
- Page navigation
- Rows per page

### Search
- Search field rendering
- Search input handling

### Toolbar
- Toolbar rendering
- Add/delete buttons
- Custom toolbar components

### Expand/Collapse
- Detail panel expansion
- Expand all / collapse all
- Row-level expand state

### Column Formatting
- Format templates
- Custom cell renderers

### Conditional Row Styling
- Style conditions
- Style application

### Actions
- Action menu display
- Confirmation dialogs
- Mutation execution

### Remote Data
- GraphQL query execution
- Data mapping
- Pagination with remote data

### Refresh Events
- Event binding on mount
- Event cleanup on unmount

### Accessibility
- Table structure
- Checkbox accessibility
- Keyboard navigation

### Custom Components
- Custom toolbar
- Custom detail panel
- Custom cell renderers

## Running Tests

```bash
# Run main component tests
yarn test --testPathPattern="MaterialTableWidget/__tests__/MaterialTableWidget.test"

# Run all MaterialTableWidget tests (hooks + components + main)
yarn test --testPathPattern="MaterialTableWidget"

# Run with coverage
yarn test --coverage --testPathPattern="MaterialTableWidget"
```

## Mocking Strategy

The tests mock several dependencies:

### Reactory API
```typescript
const createMockReactory = () => ({
  getComponent: jest.fn(),
  graphqlQuery: jest.fn(),
  graphqlMutation: jest.fn(),
  utils: { objectMapper, template, lodash },
  // ... other methods
});
```

### React Router
```typescript
jest.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));
```

### Custom Hooks
```typescript
jest.mock('@reactory/client-core/components/hooks/useSizeSpec', () => ({
  useSizeSpec: () => ({ innerWidth: 1920, breakpoint: 'lg' }),
}));
```

## Test Patterns

### Component Testing
```typescript
render(<MaterialTableWidget {...props} />);
expect(screen.getByRole('table')).toBeInTheDocument();
```

### User Interaction
```typescript
const checkbox = screen.getAllByRole('checkbox')[1];
await userEvent.click(checkbox);
expect(checkbox).toBeChecked();
```

### Async Operations
```typescript
await waitFor(() => {
  expect(mockReactoryInstance.graphqlQuery).toHaveBeenCalled();
});
```

## Related Documentation

- [docs/TESTING.md](../docs/TESTING.md) - Full testing guide
- [hooks/__tests__/README.md](../hooks/__tests__/README.md) - Hook tests
- [components/__tests__/README.md](../components/__tests__/README.md) - Sub-component tests
