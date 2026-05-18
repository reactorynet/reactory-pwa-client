# TDD Plan: useErrorHandling Hook

The `useErrorHandling` hook provides comprehensive error tracking, categorization, retry logic, and recovery strategies for the `ReactoryForm`.

## Technical Information

- **Path**: `src/components/reactory/ReactoryForm/hooks/useErrorHandling.ts`
- **Dependencies**: React (useState, useCallback, useRef, useEffect), `ReactoryComponentError` type.
- **Coverage Goal**: 80%+ statements, 100% core logic.

## Test Scenarios

### 1. Initialization
- [ ] Hook initializes with null error and empty history.
- [ ] Options (maxRetries, componentName, etc.) are correctly handled with defaults.

### 2. Error Handling & Analysis
- [ ] `handleError` updates state with enhanced error information.
- [ ] Correctly identifies 'network' errors based on message content.
- [ ] Correctly identifies 'validation' errors based on message content.
- [ ] Correctly identifies 'runtime' errors based on error name.
- [ ] Assigns correct severity based on error type (network -> warning, others -> error).
- [ ] Maps correct user-friendly messages for different error types.
- [ ] Triggers `onError` callback if provided.

### 3. Retry Logic
- [ ] `retry` does nothing if no error exists.
- [ ] `retry` calls `onRetry` and clears error on success.
- [ ] `retry` handles failure in `onRetry` by updating state and retry count.
- [ ] `retry` respects `maxRetries` (stops trying after limit).
- [ ] `enableAutoRetry` correctly triggers `retry` automatically for network errors.

### 4. Recovery Logic
- [ ] `recover` calls `onRecovery` and cleared error on successful custom recovery.
- [ ] `recover` executes `recoveryStrategies` in priority order.
- [ ] `recover` stops at first successful strategy and updates `recoveryStrategies` list.
- [ ] `recover` handles failures in recovery strategies gracefully.

### 5. Utility & Life Cycle
- [ ] `clearError` resets only active error state (keeps history).
- [ ] `reset` clears all state including history.
- [ ] `getErrorStats` returns correct aggregations from history.
- [ ] Effects/Cleanup: ensure timeouts are cleared (logic check, though mostly state-based).

## Mocking Strategy
- No complex external dependencies; standard `renderHook` and `act` from `@testing-library/react-hooks`.
- Timer-based tests (auto-retry, retry delays) will use `jest.useFakeTimers()`.

## Success Criteria
- [ ] All 20+ tests passing.
- [ ] Coverage for `useErrorHandling.ts` >= 85%.
- [ ] No regression in types.
