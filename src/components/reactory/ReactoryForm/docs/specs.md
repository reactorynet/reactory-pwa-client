# ReactoryForm — Technical Specification

> Last updated: 2026-04-07

## 1. Overview

ReactoryForm is the central form rendering engine of the Reactory PWA Client. It dynamically
renders schema-driven forms with full support for multiple data backends, pluggable widgets,
multi-tenant UI schemas, toolbar customisation, and a plugin-based dependency system.

The component is exported as `ReactoryForm` from
`src/components/reactory/ReactoryForm/index.ts`. The export is an alias for
`ReactoryFormEnhanced`, which wraps the base `ReactoryForm` component with an error boundary
and error-handling layer.

---

## 2. Architecture

### 2.1 Component Hierarchy

```
index.ts
  └─ exports ReactoryFormEnhanced as ReactoryForm

ReactoryFormEnhanced.tsx        (error boundary + error handling wrapper)
  └─ ReactoryForm.tsx           (core form component)
       ├─ useFormDefinition()   (master orchestration hook)
       │   ├─ useUISchema()     → resolves active UI schema & options
       │   ├─ useSchema()       → resolves JSON schema (base or per-menu-item)
       │   ├─ useDataManager()  → data lifecycle (fetch, submit, validate)
       │   │   └─ useDataManagerProvider()
       │   │       ├─ useGraphQLDataManager()   [fully implemented]
       │   │       ├─ useLocalStoreDataManager() [implemented — in-memory]
       │   │       ├─ useRESTDataManager()       [stub — available: false]
       │   │       ├─ useGRPCDataManager()       [stub — available: false]
       │   │       └─ useSocketDataManager()     [stub — available: false]
       │   └─ useFormLoadingState() → multi-stage loading tracker
       ├─ useExports()          → data export modal
       ├─ useReports()          → report viewer modal
       ├─ useHelp()             → contextual help modal
       └─ useToolbar()          → toolbar (submit, refresh, schema selector, custom buttons)
```

### 2.2 File Map

| File | Lines | Purpose |
|------|-------|---------|
| `index.ts` | 1 | Re-exports `ReactoryFormEnhanced` as `ReactoryForm` |
| `ReactoryForm.tsx` | ~330 | Core form: dependency tracking, container rendering, SchemaForm integration |
| `ReactoryFormEnhanced.tsx` | ~270 | Wraps core form with `ReactoryFormErrorBoundary`, error logging, retry/recovery |
| `types.ts` | ~176 | Original type definitions (hook results, form state, data manager interfaces) |
| `types-v2.ts` | ~643 | Enhanced types with runtime validators and type guards (partially integrated) |
| `constants.ts` | ~50 | `DefaultLoadingSchema`, `DefaultUiSchema`, `ReactoryDefaultForm`, `ReactoryErrorForm` |
| `ErrorBoundary.tsx` | ~200 | Error boundary component with retry, recovery, and user-friendly messages |
| `errorLogging.ts` | ~100 | Error log persistence and statistics |
| `components/FormLoadingIndicator.tsx` | ~120 | Multi-stage loading UI (progress bar, stage list, skeleton preview) |

### 2.3 Hook Files

| Hook | File | Lines | Purpose |
|------|------|-------|---------|
| `useFormDefinition` | `hooks/useFormDefinition.tsx` | ~495 | Master hook — orchestrates all sub-hooks, resolves widgets/fields/templates |
| `useDataManager` | `hooks/useDataManager.tsx` | ~360 | Data lifecycle — fetch, change, submit, reset, paging |
| `useUISchema` | `hooks/useUISchema.tsx` | ~520 | UI schema selection (mode, screen size, query params, menu items) |
| `useSchema` | `hooks/useSchema.tsx` | ~90 | JSON schema resolution with merge strategies |
| `useToolbar` | `hooks/useToolbar.tsx` | ~290 | MUI toolbar with submit/refresh/back/help/custom buttons |
| `useErrorHandling` | `hooks/useErrorHandling.ts` | ~600 | Error classification, retry, recovery strategies, statistics |
| `useContext` | `hooks/useContext.ts` | ~180 | Form context factory (currently returns empty stub; legacy code commented out) |
| `useExports` | `hooks/useExports.tsx` | — | Export modal rendering |
| `useReports` | `hooks/useReports.tsx` | — | Report viewer modal |
| `useHelp` | `hooks/useHelp.tsx` | — | Help modal rendering |
| `useFormLoadingState` | `hooks/useFormLoadingState.tsx` | ~80 | Tracks 5 loading stages with progress |
| `useFormRef` | `hooks/useFormRef.ts` | — | Imperative handle ref (not exported from barrel) |
| `useDeveloper` | `hooks/useDeveloper.tsx` | — | Developer tooling (not exported from barrel) |

### 2.4 Data Manager Files

| File | Lines | Status |
|------|-------|--------|
| `DataManagers/types.ts` | ~50 | Interface definitions for data manager hooks |
| `DataManagers/useDataManagerProvider.ts` | ~20 | Factory — instantiates all 5 managers |
| `DataManagers/ReactoryFormDataManager.ts` | ~100 | GraphQL result transformer (resultType, resultKey, mergeStrategy) |
| `DataManagers/useGraphQLDataManager.ts` | ~200+ | Full implementation (queries, mutations, error handling) |
| `DataManagers/useLocalStoreDataManager.ts` | ~45 | In-memory via useState |
| `DataManagers/useRESTDataManager.ts` | ~25 | Stub (available: false) |
| `DataManagers/useGRPCDataManager.ts` | ~25 | Stub (available: false) |
| `DataManagers/useSocketDataManager.ts` | ~25 | Stub (available: false) |

---

## 3. Component Lifecycle

### 3.1 Loading Stages

The form tracks five sequential loading stages via `useFormLoadingState`:

1. **form-definition** — Fetch form definition via `formId` FQN or accept `formDef` prop
2. **ui-schema** — Resolve active UI schema (mode, screen size, query params)
3. **widgets** — Map widget and field components from component registry via `widgetMap`/`fieldMap`
4. **resources** — Inject external CSS/JS resources via DOM
5. **data** — Fetch initial data from active data manager(s)

A `FormLoadingIndicator` is displayed until `form.__complete__` is `true`.

### 3.2 Dependency Resolution

- The form extracts dependencies from `widgetMap` and `components` array at mount time
- Subscribes to `ReactoryApiEventNames.onComponentRegistered` and plugin-load events
- When a required component/plugin becomes available, increments a version counter to re-render

### 3.3 Data Flow

```
initialData / props.formData
        │
        ▼
useDataManager.getData()
  ├─ localDataManager.getData()  (in-memory)
  ├─ graphqlDataManager.getData() (Apollo query)
  ├─ restDataManager.getData()    (stub)
  ├─ grpcDataManager.getData()    (stub)
  └─ socketDataManager.getData()  (stub)
        │
        ▼
  merged formData  ─→  SchemaForm renders
        │
        ▼
  onChange → dirty flag, validation
  onSubmit → delegates to active data managers
```

### 3.4 Error Flow

```
Error occurs (network, validation, runtime)
        │
        ▼
useErrorHandling.handleError()
  ├─ classifies: network | validation | runtime | unknown
  ├─ assigns severity: error | warning | info
  ├─ logs via errorLogging.logError()
  └─ triggers auto-retry for network errors
        │
        ▼
ReactoryFormErrorBoundary catches render errors
  ├─ displays fallback UI with retry button
  └─ configurable maxRetries (default 3), retryDelay (default 1000ms)
```

---

## 4. Rendering

### 4.1 Container Types

The form wraps its children in a configurable container element based on
`uiOptions.componentType`:

| Value | Element |
|-------|---------|
| `div` | `<div>` |
| `article` | `<article>` |
| `section` | `<section>` |
| `card` | MUI `<Card>` |
| `grid` | MUI `<Grid>` |
| `paper` | MUI `<Paper>` |
| `paragraph` | `<p>` |
| default | `<form>` |

### 4.2 Children Layout

1. **Toolbar** (if `toolbarPosition` includes `top` or `both`)
2. **LinearProgress** (if form is busy — loading or validating)
3. **SchemaForm** (the actual RJSF-based form renderer)
4. **Toolbar** (if `toolbarPosition` includes `bottom` or `both`)
5. **PagingWidget** (if data manager returns paging)
6. **HelpModal** (if helpTopics defined)

### 4.3 Toolbar

Built by `useToolbar`, renders an MUI `<Toolbar>` with:

- Schema selector buttons (when multiple UI schemas exist)
- Submit button (FAB or standard, configurable icon)
- Refresh button
- Back button (if defined in `uiOptions`)
- Help button (if `helpTopics` defined on form)
- Custom buttons from `uiOptions.buttons` array (supports template strings, `nav://` commands)

---

## 5. UI Schema System

Forms can define multiple UI schemas for different modes, screen sizes, and user contexts.

### 5.1 Selection Logic

1. Filter schemas by `mode` (edit, view, create, delete) and screen size / `minWidth`
2. Check query parameters for `uiSchemaKey`
3. Fall back to first allowed schema or default

### 5.2 Schema Merge Strategies

When a UI schema menu item provides its own `schema`, it is merged using the strategy:

| Strategy | Behaviour |
|----------|-----------|
| `merge` | Shallow merge with base schema |
| `replace` | Fully replaces base schema |
| `remove` | Removes specified properties |

### 5.3 Graph Definitions per Schema

Each UI schema can carry its own `graphDefinition` (GraphQL queries/mutations), allowing
different data operations per view.

---

## 6. Data Managers

### 6.1 Provider Pattern

`useDataManagerProvider` instantiates all 5 data managers. `useDataManager` orchestrates
them: calls `getData()` on each manager that reports `available: true`, then merges results
based on the schema type.

### 6.2 GraphQL Data Manager

The primary data manager. Uses Apollo Client for:

- **Queries**: Fetches data via `graphDefinition.query`
- **Mutations**: Submits data via `graphDefinition.mutation`
- **Result Transformation**: Uses `ReactoryFormDataManager.fromGraphResult()` with configurable
  `resultType` (array/object), `resultKey` path, and `resultMap` property mapping

### 6.3 Local Store Data Manager

Simple in-memory manager using `useState`. Stores form data locally without network calls.

### 6.4 Stub Managers

REST, gRPC, and Socket managers are defined but return `available: false`. The architecture
is ready for future implementation.

---

## 7. Props Interface

```typescript
interface IReactoryFormProps<TData> {
  formId?: string | Reactory.FQN;           // Form FQN to load from server
  formDef?: Reactory.Forms.IReactoryForm;   // Direct form definition
  formData?: TData;                         // Initial data
  watchList?: string[];                     // Properties to watch for changes
  mode?: "edit" | "view" | "create" | "delete";
  debug?: boolean;
  warning?: boolean;
  error?: boolean;
}
```

### 7.1 Enhanced Props (ReactoryFormEnhanced)

```typescript
interface ReactoryFormEnhancedProps extends IReactoryFormProps<unknown> {
  errorHandling?: {
    enableErrorBoundary?: boolean;
    enableAutoRetry?: boolean;
    enableErrorRecovery?: boolean;
    maxRetries?: number;
    retryDelay?: number;
    showTechnicalDetails?: boolean;
    errorMessages?: { default, network, validation, runtime, unknown };
    onError?: (error: ReactoryComponentError) => void;
    onRetry?: (error: ReactoryComponentError) => Promise<void>;
    onRecovery?: (error: ReactoryComponentError) => Promise<boolean>;
  };
  errorBoundary?: {
    fallback?: React.ComponentType;
    maxRetries?: number;
    retryDelay?: number;
    showTechnicalDetails?: boolean;
  };
}
```

---

## 8. Plugin & Dependency System

- Components are registered in a global registry and referenced by FQN
  (`namespace.ComponentName@version`)
- Forms declare dependencies via `widgetMap` (maps schema field types to component FQNs)
  and `components` array
- The form subscribes to plugin-load events; when a dependency becomes available,
  it triggers a re-render via version increment
- Resource injection: external CSS/JS files defined in the form are injected into the DOM

---

## 9. Feature Flags

A feature flag system was implemented (Phase 0) using `@zepz/feature-flags-ts` with
memory and API providers. Feature flags are defined for each upgrade phase but are not
currently wired into the production form component. The flags are designed for gradual
rollout of new features.

| Flag Category | Flags |
|---------------|-------|
| Phase 1 | `REACTORY_FORM_TYPES_V2`, `REACTORY_FORM_ERROR_HANDLING_V2`, `REACTORY_FORM_STATE_V2` |
| Phase 2 | `REACTORY_FORM_PERFORMANCE_V2`, `REACTORY_FORM_DATA_V2`, `REACTORY_FORM_MEMORY_V2` |
| Phase 3 | `REACTORY_FORM_UI_V2`, `REACTORY_FORM_MOBILE_V2`, `REACTORY_FORM_ACCESSIBILITY_V2` |
| Phase 4 | `REACTORY_FORM_COLLABORATION`, `REACTORY_FORM_VALIDATION_V2`, `REACTORY_FORM_BUILDER` |
| Phase 5 | `REACTORY_FORM_TESTING_V2`, `REACTORY_FORM_DOCS_V2`, `REACTORY_FORM_DEV_TOOLS` |
| Phase 6 | `REACTORY_FORM_HOOKS_V2`, `REACTORY_FORM_PLUGINS_V2`, `REACTORY_FORM_I18N_V2` |

---

## 10. External Dependencies

| Library | Usage |
|---------|-------|
| React 17 | Component framework |
| Material UI v6 | UI components (Card, Grid, Paper, Toolbar, LinearProgress) |
| Apollo Client 3.x | GraphQL data manager |
| Lodash | `find`, `template`, `isArray`, `isNil`, `isString`, `isEmpty`, `throttle`, `filter` |
| React Router 6 | `useNavigate`, `useLocation`, `useParams` |
| SchemaForm (RJSF-based) | `@reactory/client-core/components/reactory/form/components/SchemaForm` |

---

## 11. Type System

### 11.1 Original Types (`types.ts`)

Core interfaces for hook results and form state. 20+ properties on `ReactoryFormState`
covering loading, UI framework, form data, validation, modals, errors, and meta fields.

### 11.2 Enhanced Types (`types-v2.ts`)

Adds:
- Extended `ReactoryComponentError` with `timestamp`, `context`, `userMessage`
- Runtime validators: `isValidFormState()`, `isValidSchema()`, `isValidUISchema()`, etc.
- Type guards: `isReactoryComponentError()`, `isReactoryFormState()`
- Enhanced paging: `hasNext`, `hasPrevious`, `items`
- Metadata fields on hook results: `isValid`, `lastValidated`, `lastModified`

**Integration status**: Only the error-related types from `types-v2.ts` are actively used.
The runtime validators and type guards are not connected to the production code.
