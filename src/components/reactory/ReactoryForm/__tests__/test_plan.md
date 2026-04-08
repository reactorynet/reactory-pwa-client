# ReactoryForm Production Test Suite — Plan

## Scope
Production-level tests for the ReactoryForm component, hooks, and data managers.

## Test Files

### hooks/__tests__/useContext.test.ts
- Context object contains all IReactoryFormContext fields
- Screen breakpoint detection
- Memoization (context reference stability)
- Default fallbacks for getData/setFormData
- Reactory SDK and i18n inclusion
- Context updates when formData changes

### DataManagers/__tests__/useRESTDataManager.test.ts
- Availability based on REST definition presence
- GET request execution with correct URL/headers
- POST/PUT/DELETE for mutations by mode
- HTTP error handling (4xx, 5xx)
- 204 No Content handling
- Server-side call skipping
- onChange no-op behavior

### Future Tests (not yet created)
- hooks/__tests__/useFormDefinition.test.tsx — form resolution, loading stages, widget mapping
- hooks/__tests__/useDataManager.test.tsx — data flow orchestration, manager delegation
- DataManagers/__tests__/useGraphQLDataManager.test.ts — query/mutation execution
- __tests__/ReactoryForm.test.tsx — component rendering, container types, ARIA attributes
