# MaterialTableWidget Hook Tests

This directory contains tests for the custom React hooks used by the MaterialTableWidget.

## Test Files

| File | Tests |
|------|-------|
| `useDebounce.test.ts` | Debounce utility and debounced search hook |
| `useQuickFilters.test.ts` | Quick filter state management and data filtering |
| `useAdvancedFilters.test.ts` | Advanced multi-field filtering with presets |

## Running Tests

```bash
# Run all hook tests
yarn test --testPathPattern="MaterialTableWidget/hooks/__tests__"

# Run specific test file
yarn test useDebounce.test.ts

# Run in watch mode
yarn test --watch --testPathPattern="MaterialTableWidget/hooks"

# Run with coverage
yarn test --coverage --testPathPattern="MaterialTableWidget/hooks"
```

## Test Patterns

### Hook Testing with `renderHook`

```typescript
// For React 17, use @testing-library/react-hooks
import { renderHook, act } from '@testing-library/react-hooks';

describe('useMyHook', () => {
  it('should update state', () => {
    const { result } = renderHook(() => useMyHook());
    
    act(() => {
      result.current.doSomething();
    });
    
    expect(result.current.state).toBe(expected);
  });
});
```

### Testing with Fake Timers

For hooks that use debouncing or timeouts:

```typescript
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

it('should debounce', () => {
  const { result } = renderHook(() => useDebounce(value, 300));
  
  act(() => {
    jest.advanceTimersByTime(300);
  });
  
  expect(result.current).toBe(expected);
});
```

### Testing Callbacks

```typescript
it('should call callback', () => {
  const callback = jest.fn();
  const { result } = renderHook(() => useMyHook({ onCallback: callback }));
  
  act(() => {
    result.current.triggerCallback();
  });
  
  expect(callback).toHaveBeenCalledWith(expected);
});
```

## Coverage Requirements

| Hook | Target Coverage |
|------|-----------------|
| useDebounce | 100% |
| useDebouncedSearch | 100% |
| useQuickFilters | 90%+ |
| useAdvancedFilters | 90%+ |

## TDD Process

When adding new functionality to hooks:

1. **Write the test first** describing expected behavior
2. Run test to confirm it fails
3. Implement the minimum code to pass
4. Refactor if needed
5. Verify all tests still pass

See [TESTING.md](../../docs/TESTING.md) for complete testing guidelines.
