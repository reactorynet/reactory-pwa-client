# ReactoryForm — Agent Context

## What Is This Component

ReactoryForm is the central schema-driven form engine for the Reactory PWA Client. It renders
forms dynamically from JSON Schema definitions, supports multiple data backends (GraphQL, REST,
gRPC, WebSocket, local), a plugin-based widget/field system, multi-tenant UI schemas, and a
configurable toolbar. It is the single most important UI component in the Reactory platform —
virtually every data view and edit screen is rendered through ReactoryForm.

- **Export**: `ReactoryForm` from `src/components/reactory/ReactoryForm/index.ts`
- **Actual component**: `ReactoryFormEnhanced` (wraps base `ReactoryForm` with error boundary)
- **Component registry FQN**: `core.ReactoryForm@1.0.0` and `core.ReactoryForm@2.0.0`
- **Based on**: React JSON Schema Form (RJSF) via an internal `SchemaForm` adapter

---

## Directory Structure

```
ReactoryForm/
├── index.ts                        # Barrel — exports ReactoryFormEnhanced as ReactoryForm
├── ReactoryForm.tsx                # Core form component (~330 lines)
├── ReactoryFormEnhanced.tsx        # Error boundary wrapper (~270 lines) [PRODUCTION]
├── types.ts                        # Original type definitions (~176 lines)
├── types-v2.ts                     # Enhanced types with validators (~643 lines) [partial use]
├── constants.ts                    # Default schemas, loading/error form defs (~50 lines)
├── ErrorBoundary.tsx               # Error boundary with retry/recovery (~200 lines) [PRODUCTION]
├── errorLogging.ts                 # Error persistence and stats (~100 lines) [PRODUCTION]
├── components/
│   ├── index.ts                    # Component barrel
│   └── FormLoadingIndicator.tsx    # Multi-stage loading UI (~120 lines) [PRODUCTION]
├── hooks/
│   ├── index.ts                    # Hooks barrel (11 exports)
│   ├── useFormDefinition.tsx       # Master orchestration hook (~495 lines)
│   ├── useDataManager.tsx          # Data lifecycle hook (~360 lines)
│   ├── useUISchema.tsx             # UI schema selection (~520 lines)
│   ├── useSchema.tsx               # JSON schema resolution (~90 lines)
│   ├── useToolbar.tsx              # Toolbar builder (~290 lines)
│   ├── useErrorHandling.ts         # Error mgmt with retry/recovery (~600 lines)
│   ├── useContext.ts               # Form context (STUB — returns empty object)
│   ├── useExports.tsx              # Data export modal
│   ├── useReports.tsx              # Report viewer modal
│   ├── useHelp.tsx                 # Help modal
│   ├── useFormLoadingState.tsx     # 5-stage loading tracker (~80 lines)
│   ├── useFormRef.ts               # Imperative handle ref (not exported)
│   └── useDeveloper.tsx            # Dev tools (not exported)
├── DataManagers/
│   ├── index.ts                    # Data manager barrel
│   ├── types.ts                    # Data manager interfaces (~50 lines)
│   ├── useDataManagerProvider.ts   # Factory for all 5 managers (~20 lines)
│   ├── ReactoryFormDataManager.ts  # GraphQL result transformer (~100 lines)
│   ├── useGraphQLDataManager.ts    # GraphQL impl — FULL (~200+ lines)
│   ├── useLocalStoreDataManager.ts # In-memory — FULL (~45 lines)
│   ├── useRESTDataManager.ts       # REST — STUB (available: false)
│   ├── useGRPCDataManager.ts       # gRPC — STUB (available: false)
│   └── useSocketDataManager.ts     # WebSocket — STUB (available: false)
├── docs/
│   ├── specs.md                    # Technical specification
│   ├── progress.md                 # Upgrade progress (fact-checked)
│   └── todo.md                     # Prioritised remaining work
├── stateManagement/                # [NOT INTEGRATED] Centralized state (Phase 1.3)
├── performanceOptimization/        # [NOT INTEGRATED] Perf hooks (Phase 1.4)
├── phase2/                         # [NOT INTEGRATED] Rendering & data opt (Phase 2)
├── phase3/                         # [NOT INTEGRATED] Visual/UX improvements (Phase 3)
├── phase4/                         # [NOT INTEGRATED] Collaboration, validation, builder (Phase 4)
└── *.tests.ts, *Runner.js          # Test files for upgrade phases
```

---

## How It Works

### Form Loading Pipeline

```
1. Props received (formId or formDef, formData, mode)
       │
2. useFormDefinition() — master hook
   ├── Fetches form definition from server (if formId provided)
   ├── useUISchema() — selects UI schema by mode, screen size, query params
   ├── useSchema() — resolves JSON schema (base or per-UI-schema-menu-item)
   ├── Maps widgets and fields from component registry via widgetMap/fieldMap
   ├── Injects external CSS/JS resources
   ├── useDataManager() — fetches initial data
   │   └── useDataManagerProvider() → 5 data managers (GraphQL primary)
   └── useFormLoadingState() — tracks 5 loading stages
       │
3. ReactoryForm.tsx renders:
   ├── FormLoadingIndicator (while loading)
   └── Container (div/card/paper/grid/form/...) containing:
       ├── Toolbar (top)
       ├── LinearProgress (when busy)
       ├── SchemaForm (RJSF-based form renderer)
       ├── Toolbar (bottom)
       ├── PagingWidget
       └── HelpModal
       │
4. ReactoryFormEnhanced.tsx wraps all above with:
   └── ErrorBoundary (retry, recovery, logging)
```

### Data Flow

```
getData() → local → graphql → rest → grpc → socket → merge → formData
onChange() → dirty flag → validation → setState
onSubmit() → onBeforeSubmit → delegate to active data managers → response
```

### Plugin/Dependency System

- Widgets and fields are referenced by FQN in `widgetMap` / `fieldMap`
- The form subscribes to component registration events
- When a plugin loads and registers a required component, form re-renders
- External resources (CSS/JS) are injected into the DOM at load time

---

## Key Interfaces

### Input Props

```typescript
interface IReactoryFormProps<TData> {
  formId?: string | Reactory.FQN;     // Load form by FQN
  formDef?: IReactoryForm;            // Provide form definition directly
  formData?: TData;                   // Initial data
  mode?: "edit" | "view" | "create" | "delete";
  watchList?: string[];               // Properties to watch for re-render
  debug?: boolean;
}
```

### Form Definition (server-provided)

```typescript
interface IReactoryForm {
  id: string;
  name: string;
  nameSpace: string;
  version: string;
  schema: AnySchema;                  // JSON Schema
  uiSchema: IFormUISchema;            // UI schema (or array of schemas)
  uiSchemas?: IUISchemaMenuItem[];    // Multiple view modes
  graphDefinition?: IFormGraphDefinition; // GraphQL queries/mutations
  widgetMap?: IWidgetMap;             // FQN → component mappings
  fieldMap?: IFieldMap;
  components?: IComponentDependency[];
  helpTopics?: string[];
  uiFramework?: string;
  __complete__?: boolean;
  registerAsComponent?: boolean;
  defaultFormValue?: any;
}
```

### UI Options

```typescript
interface IFormUIOptions {
  componentType?: 'div' | 'card' | 'paper' | 'grid' | 'form' | ...;
  toolbarPosition?: 'top' | 'bottom' | 'both';
  showSubmit?: boolean;
  showRefresh?: boolean;
  className?: string;
  style?: CSSProperties;
  toolbarStyle?: CSSProperties;
  buttons?: IToolbarButton[];
}
```

---

## Data Managers

| Manager | Status | Backend | Use Case |
|---------|--------|---------|----------|
| GraphQL | ✅ Full | Apollo Client | Primary — most forms use this |
| Local Store | ✅ Full | useState | Client-only forms, no network |
| REST | ✅ Full | fetch API | Client-side REST APIs (runat: 'client') |
| gRPC | ⏳ Stub | — | Planned for protobuf services |
| Socket | ⏳ Stub | — | Planned for real-time data |

---

## Known Issues & Technical Debt

1. ~~**useContext hook returns empty stub**~~ — RESOLVED: rebuilt as useFormContext, integrated into useFormDefinition
2. ~~**Naming confusion**~~ — RESOLVED: Phase 3 renamed to `AnimatedReactoryForm.tsx`
3. **~70% of upgrade code is unintegrated** — Phases 1.3 and 1.4 are now feature-flagged;
   Phases 2.x, 3.x, 4.x remain standalone
4. **Duplicate implementations** — virtual scrolling and intelligent cache hooks exist in
   both `performanceOptimization/` and `phase2/`
5. ~~**REST data manager is a stub**~~ — RESOLVED: fully implemented with fetch API.
   gRPC/Socket data managers remain stubs.
6. **Growing test coverage** — initial test suite for useContext and useRESTDataManager;
   more tests needed for other hooks and the main component
7. ~~**No accessibility improvements**~~ — PARTIAL: ARIA labels, roles, aria-busy, and
   aria-live regions added to form containers. Further work needed for keyboard nav.

---

## Upgrade Status

An upgrade process was started on 2024-08-01 with a 6-phase plan. It was paused after
producing code for Phases 0–4, but only Phase 1.2 (Error Handling) was fully integrated.

See [docs/progress.md](docs/progress.md) for detailed phase-by-phase status and
[docs/todo.md](docs/todo.md) for prioritised remaining work.

---

## Important Conventions

- Forms are identified by **FQN**: `namespace.FormName@version`
- The component auto-generates an **instanceId** (UUID) per mount
- The **SIGN** format is `${FQN}:${instanceId}` for debugging
- UI schemas can be switched at runtime via selector buttons or query params
- Toolbar buttons support template strings (Lodash `template()`) and `nav://` commands
- Error messages are translated via `formTranslationMaps` lookup

---

## Dependencies

| Package | Version | Usage |
|---------|---------|-------|
| React | 17.0.2 | Component framework |
| Material UI | v6.5.0 | Card, Grid, Paper, Toolbar, LinearProgress |
| Apollo Client | 3.10.8 | GraphQL data manager |
| React Router | 6.24.1 | useNavigate, useLocation, useParams |
| Lodash | — | find, template, isArray, isNil, isEmpty, throttle, filter |
| SchemaForm | internal | RJSF-based form renderer from @reactory/client-core |

---

## For Agents Working on This Component

1. **Read the production code** — `ReactoryForm.tsx`, `ReactoryFormEnhanced.tsx`, and the
   hooks in `hooks/` are the actual running code. The `phase2/`, `phase3/`, `phase4/`,
   `stateManagement/`, and `performanceOptimization/` directories contain prototype code
   that is NOT in the execution path.

2. **The index.ts export** re-exports `ReactoryFormEnhanced` as `ReactoryForm`. Any import
   of `ReactoryForm` from this directory gets the enhanced (error-boundary-wrapped) version.

3. **`useFormDefinition`** is the master hook — it calls `useUISchema`, `useSchema`,
   `useDataManager`, and `useFormLoadingState`. If you need to understand how the form
   assembles itself, start there.

4. **`useDataManager`** orchestrates all 5 data manager hooks. For most forms, only the
   GraphQL manager is active. Data flows through `getData()` → merge → `formData`.

5. **Do not confuse** `ReactoryFormEnhanced.tsx` (the production wrapper at root level)
   with `phase3/components/EnhancedReactoryForm.tsx` (an unused prototype).

6. **Before integrating upgrade code**, check [docs/todo.md](docs/todo.md) for the
   recommended approach and known issues with each phase's code.
