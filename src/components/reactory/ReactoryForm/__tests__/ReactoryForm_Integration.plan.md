# ReactoryForm Integration Test Plan

## Objective
Test the `ReactoryForm` component in `src/components/reactory/ReactoryForm/ReactoryForm.tsx` as an integrated unit, ensuring all hooks work together to render the form, handle data, and manage UI state.

## Test Scenarios

### 1. Initial Rendering & Form Resolution
- **Renders Loading Indicator**: Verify `FormLoadingIndicator` is shown when `form` is not yet resolved.
- **Resolves Form Definition**: Verify component renders a card/container once `form` is resolved.
- **Card Container**: Test `containerType="card"` renders an MUI `Card`.
- **Paper Container**: Test `containerType="paper"` renders an MUI `Paper`.
- **None/Flat Container**: Test `containerType="none"` renders a simple `Grid`.
- **Custom Mode Rendering**: Verify `form.mode` affects rendering if applicable.

### 2. Title & Help Integration
- **Renders Title**: Verify title is rendered from `props.title` or `form.title`.
- **Help Integration**: Verify clicking help icon triggers the help drawer (via `useHelp`).
- **Description**: Verify `form.description` is rendered if no title/header is present.

### 3. Toolbar & Actions
- **Toolbar Rendering**: Verify `ReactoryFormToolbar` is rendered when actions are present.
- **Refresh Action**: Verify clicking refresh calls `refresh` from `useFormDefinition`.
- **Export/Report Buttons**: Verify `ExportButton` and `ReportButton` are present if configured.

### 4. Form Engine Integration
- **Engine Selection**: Verify `EngineDispatchedForm` is used (rjsf v5 adapter path).
- **Fallback Selection**: (If applicable) Verify legacy `ISchemaForm` fallback.
- **Passing Context**: Verify `formContext` matches the expected structure.

### 5. Error Boundary & Error Handling
- **Graceful Error Catch**: Verify `ErrorBoundary` catches runtime crashes in the form.
- **Display Error State**: Verify `ErrorList` or error summary is shown on validation failure.
- **Global Error Handling**: Verify `useErrorHandling` notifications appear on network errors.

## Technical Details
- **Mocking**: Use `createMockReactory` for the SDK.
- **Testing Library**: `@testing-library/react`.
- **Mocks**: 
  - `useNavigate`, `useLocation`, `useParams` from `react-router`.
  - Nested components like `EngineDispatchedForm` to focus on integration vs detailed unit tests.
- **Environment**: JSDOM.

## Coverage Goals
- Statement/Branch coverage > 80% for `ReactoryForm.tsx`.
