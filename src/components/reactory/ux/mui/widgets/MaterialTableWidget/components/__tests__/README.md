# MaterialTableWidget Component Tests

This directory contains unit tests for the UI components in the MaterialTableWidget module.

## Test Files

| File | Component | Tests |
|------|-----------|-------|
| `SearchBar.test.tsx` | SearchBar | Rendering, search functionality, clear, help tooltip, loading state |
| `QuickFilters.test.tsx` | QuickFilters | Buttons/chips variants, toggle, clear, multi-select, colors, badges |
| `AdvancedFilterPanel.test.tsx` | AdvancedFilterPanel | All field types, preset management, clear filters |

## Running Tests

```bash
# Run all component tests
yarn test --testPathPattern="MaterialTableWidget/components"

# Run a specific component test
yarn test --testPathPattern="SearchBar.test"
yarn test --testPathPattern="QuickFilters.test"
yarn test --testPathPattern="AdvancedFilterPanel.test"

# Run in watch mode
yarn test:watch --testPathPattern="MaterialTableWidget/components"

# Run with coverage
yarn test:coverage --testPathPattern="MaterialTableWidget/components"
```

## Test Patterns

### Component Testing with React Testing Library

```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const onClick = jest.fn();
    render(<MyComponent onClick={onClick} />);
    
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### Mocking Hooks

All component tests mock the underlying hooks to isolate component behavior:

```typescript
jest.mock('../../hooks/useMyHook', () => ({
  useMyHook: () => ({
    value: 'mocked value',
    setValue: jest.fn(),
  }),
}));
```

### Testing Material-UI Components

- Use `getByRole` for accessible elements (buttons, inputs, etc.)
- Use `getByLabelText` for form controls with labels
- Use `getByText` for text content
- Use `within` for scoped queries

### Async Testing

```typescript
// Wait for element to appear
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Wait for user interactions
await userEvent.type(input, 'text');
await userEvent.click(button);
```

## Coverage Requirements

Aim for at least 80% coverage on:
- **Statements**: Code paths executed
- **Branches**: if/else and ternary conditions
- **Functions**: Component functions and event handlers
- **Lines**: Individual lines of code

## TDD Process

1. **Write failing test** - Define the expected behavior
2. **Implement component** - Make the test pass
3. **Refactor** - Improve code while keeping tests green

## Related Documentation

- [TESTING.md](../../docs/TESTING.md) - Full testing guide
- [API_REFERENCE.md](../../docs/API_REFERENCE.md) - Component API documentation
- [.copilot-instructions.md](../../.copilot-instructions.md) - AI assistant guidelines
