# 02 — Current State

A reference inventory of the forked rjsf and every Reactory-specific extension layered on top. Cited by file:line so migration work can verify each item directly.

## Lineage

The fork is rooted in **`@rjsf/core` v4.2.0**. Evidence:

- Bare `ajv` instance used for validation (`form/utils.tsx:1012-1046`); `@rjsf/validator-ajv8` does not exist here.
- v4-era helpers `retrieveSchema`, `toIdSchema`, `resolveSchema`, `getSchemaType` (`form/utils.tsx`).
- `UNSAFE_componentWillReceiveProps` in `form/components/FormClass.tsx:51` and `shouldComponentUpdate` at `:101`.
- PropTypes used throughout (`TitleField.tsx`, `StringField.tsx`, …).
- Class-component fields (`FormClass`, `ObjectField`, `ArrayField`).
- Dual `.tsx` / `.jsx` files indicating an incomplete TS migration. The `.tsx` is source; the `.jsx` is build output.

Total in-tree form code: roughly **3 656 LOC** across `form/`, plus ~76 files under `ReactoryForm/`.

## Layering

```
ReactoryFormRouter (route → formId)
  └── ReactoryFormEnhanced (error boundaries + retry)
       └── ReactoryForm (definition + context setup)
            └── useFormDefinition (load schema, uiSchema, form def)
                 └── SchemaForm (the inner schema renderer — what the user has open)
                      └── fields (ArrayField, ObjectField, StringField, …)
                           └── widgets (Material UI components)
```

`SchemaForm.tsx` is the inner rjsf-equivalent renderer. `ReactoryForm.tsx` is the outer Reactory orchestration that loads form definitions, wires data managers, and exposes the public API.

## JSON Schema feature support

| Keyword | Supported | Where | Notes |
|---|---|---|---|
| `type`, `enum`, `enumNames`, `default` | ✅ | `utils.tsx:395-409` | Standard. |
| `const` | ✅ | `utils.tsx:335-350` | `isConstant`/`toConstant`. |
| `$ref` (`#/definitions/`) | ✅ partial | `utils.tsx:411-431` | No nested chains, no external refs. |
| `dependencies` | ✅ | `utils.tsx:525-549` | Both schema and property dependencies. |
| `additionalProperties` | ✅ | `utils.tsx:454-483` | Stubbed via `__additional_property` flag. |
| `oneOf`/`anyOf` (root only, enum-like) | ✅ partial | `utils.tsx:352-368` | **Property-level not supported.** This is the bug behind `ServiceInvoke`. |
| `oneOf`/`anyOf` (mid-property) | ❌ | — | Falls through to `UnsupportedField`. |
| `allOf` | ✅ partial | `MaterialObjectField.tsx:12` via `json-schema-merge-allof` | Object-level merge only. |
| `if`/`then`/`else` | ❌ | — | Schema validates, UI does not branch. **This is the bug behind `Telemetry`.** |
| `patternProperties` | ❌ | — | Not implemented. |
| `readOnly` / `writeOnly` | ❌ | — | Not honored. |
| `dependentRequired` / `dependentSchemas` | ❌ | — | Draft-2019-09 keywords. |
| `unevaluatedProperties` | ❌ | — | Draft-2019-09. |

## UI schema feature support

| Key | Supported | Where | Notes |
|---|---|---|---|
| `ui:field`, `ui:widget` | ✅ | `SchemaField.tsx:29-44` | FQN resolution wraps this. |
| `ui:options` | ✅ | `utils.tsx:219-241` | |
| `ui:order` (with `*` wildcard) | ✅ | `utils.tsx:290-329` | |
| `ui:disabled`, `ui:readonly` | ✅ | `SchemaField.tsx:208-209` | |
| `ui:hidden` | ❌ | — | Only `ui:widget: 'hidden'` works; no boolean/callback hide. |
| `ui:globalOptions` | ❌ | — | |
| `ui:fieldReplacesAnyOrOneOf` | ❌ | — | |
| Per-field templates (e.g., `ui:FieldTemplate`) | ❌ | — | Templates are global only. |

## Reactory-specific extensions

These are real value-adds that **must survive** the migration. Each item below is a feature the v5 adapter needs to re-implement.

### FQN component resolution

- **File:** `form/components/hooks/useRegistry.tsx:6-75`
- **Contract:**
  - `ui:field` / `ui:widget` strings containing a `.` are treated as FQN and resolved via `reactory.getComponent()`.
  - Function references in `ui:field` are passed through unchanged.
  - Local `registry.fields` then `registry.widgets` is checked next.
  - Falls back to type-based `COMPONENT_TYPES` map (`SchemaField.tsx:25-26`).
  - On miss: returns `UnsupportedField` unless `returnNullComponent=true`.
- **Not supported:** `@version` suffix, `$GLOBAL$` prefix, runtime version negotiation.

### Object-form `ui:title` / `ui:description` / `ui:error`

- **File:** `form/components/hooks/useRegistry.tsx:77-219`
- **Shape:**
  ```ts
  {
    title?: string;          // override label text
    field?: string;          // FQN of custom component
    fieldOptions?: object;   // spread into component props
    icon?: string;           // material icon name
    iconOptions?: object;    // icon config (color, size, etc.)
  }
  ```
- Equivalent shape used for `ui:description` (`UIDescriptionFieldOptions`) and `ui:error` (`UIErrorFieldOptions`, lines 177-219).
- For `ui:error`, the wrapped component additionally receives `errorSchema`.

### `formContext` extensions

Defined in `ReactoryForm/hooks/useContext.ts:25-73`. Keys carried:

| Key | Set by | Read by | Purpose |
|---|---|---|---|
| `$ref` | useFormContext | (rare) | Pass-through props ref. |
| `formData` | useFormContext | widgets | Current form data snapshot. |
| `formDef` | useFormContext | widgets | The full `IReactoryForm` definition. |
| `formInstanceId` | useFormContext | telemetry/widgets | UUID per form mount. |
| `getData` / `setFormData` | useFormContext | widgets | Async data accessors. |
| `graphql` | useFormContext | widgets via `useUISchema.tsx:55` | GraphQL operation config. |
| `query` | useFormContext | reserved | Currently unused. |
| `refresh` / `reset` | useFormContext | widgets | Lifecycle handlers. |
| `screenBreakPoint` | useFormContext | layout widgets | MUI breakpoint (`xl`/`lg`/`md`/`sm`/`xs`). |
| `signature` | useFormContext | telemetry | `FQN:instanceId` identifier. |
| `version` | useFormContext | reserved | Form version (currently `0`). |
| `reactory` | useFormContext | every consumer | Reactory SDK singleton. |
| `props` | useFormContext | widgets | Original component props. |
| `i18n` | useFormContext | widgets | i18n service handle. |
| `$formElement` | `SchemaForm.tsx:149` | widgets | Reference to form DOM node. |
| `$submit` | `SchemaForm.tsx:150` | widgets | Submit function. |
| `$formData` | `SchemaForm.tsx:151` | widgets | Current data (duplicates `formData`). |

### `__additional_property` flag

- **File:** `form/utils.tsx:14, 480` (write); `SchemaField.tsx:128`, `MaterialSchemaField.tsx:146` (read).
- Marks dynamically-added object properties so the field renders an editable key input.
- Without this, `additionalProperties: true` schemas can't have their keys renamed.

### Schema preprocessing

`retrieveSchema(schema, definitions, formData)` at `form/utils.tsx:510-523` runs:

1. `resolveReference()` — only `#/definitions/`.
2. `resolveDependencies()` — both array (additional required) and object (subschema injection).
3. `stubExistingAdditionalProperties()` — injects schema entries for keys present in formData but missing from `properties`, marking each with `__additional_property`.

There is **no `${variable}` interpolation, no macro substitution, no context injection at render time** in the engine itself. Any string interpolation is done in widget code or upstream of the form.

### Validation pipeline

`form/utils.tsx:1012-1046`:

1. `ajv.validate(schema, formData)` (bare AJV, version pinned by package.json).
2. `transformAjvErrors(ajv.errors)` → `{name, property, message, params, stack}` shape (lines 987-1004).
3. Optional user `transformErrors` hook.
4. `toErrorSchema(errors)` builds nested `{field: {__errors: [...]}}` tree (lines 880-926).
5. Optional `customValidate` called with an `errorHandler` proxy that supports `errorHandler.field.subfield.addError("msg")`.
6. `mergeObjects` combines schema and custom errors.
7. `toErrorList(...)` flattens to `[{stack: "field: msg"}]` for display.

There is no built-in i18n here. Error messages flow through verbatim from AJV.

### Plugin / runtime widget loading

- `ReactoryForm.tsx:137-170` — `getInitialDepencyState()` scans `form?.widgetMap` (FQN entries) and `form?.components` (FQN strings with `@` or `.`).
- Listens for `componentRegistered` events; on match, increments a version counter to force re-render.

### Custom widgets / fields catalogue

- **Form-layer fields** (9): `ArrayField`, `BooleanField`, `NumberField`, `ObjectField`, `SchemaField`, `StringField`, `TitleField`, `DescriptionField`, `UnsupportedField`.
- **MUI field overrides** (10): `MaterialArrayField`, `MaterialBooleanField`, `MaterialDescriptionField`, `MaterialGridField`, `MaterialNumberfield`, `MaterialObjectField`, `MaterialSchemaField`, `MaterialStringField`, `MaterialTabbedField` (alias for accordion/stepped/list layouts), `MaterialTitleField`, `MaterialUnsupportedField`.
- **MUI widgets (47+):** the full catalogue from `ux/mui/widgets/index.tsx` — listed in detail in [`05-migration-mapping.md`](./05-migration-mapping.md). Notable non-standard behaviours:
  - `MaterialStringField:60-70` keeps a local `localValue` to prevent cursor jumping during parent re-renders.
  - `MaterialObjectField:67-138` implements `onPropertyChange` for granular updates.

## Lifecycle / state quirks

- `UNSAFE_componentWillReceiveProps` (`FormClass.tsx:51`) — incompatible with React 19.
- `shouldComponentUpdate` with manual `deepEquals` (`FormClass.tsx:101-104`) — replaceable with `React.memo`.
- `SchemaForm.tsx` is functional but mutates the registry inline at render (`getRegistry()` call in render path) — non-idempotent, may cause stale references.

## i18n & accessibility status

- **i18n:** `formContext.i18n` is exposed but only widget code uses it; the engine itself does not localize error messages or built-in UI text.
- **A11y:** Default templates emit `<label htmlFor>` and `class="control-label"`. **No `aria-describedby`, `aria-invalid`, `aria-required` attributes are emitted by the form core**; widgets inherit MUI's a11y but the form-level wiring is missing.

## Tests

| Location | Coverage |
|---|---|
| `form/components/**` | None. |
| `ReactoryForm/hooks/__tests__/useContext.test.ts` | Wrapper-level. |
| `ReactoryForm/DataManagers/__tests__/useRESTDataManager.test.ts` | Data manager. |
| `ReactoryForm/phase3/**`, `phase4/**` | Animation, loading, validation experiments. |

**No co-located tests inside `form/`**. This is the largest single risk for any refactor.

## Public API surface in use

| Path | Imported by | Notes |
|---|---|---|
| `@reactory/client-core/components/reactory/ReactoryForm` | 24 files | Public — `ReactoryForm`, `ReactoryFormRouter`. |
| `@reactory/client-core/components/reactory/form` | 1 file | Default-exports `SchemaForm`. |
| `@reactory/client-core/components/reactory/form/components/SchemaForm` | 1 file | `ISchemaForm` interface. |
| `@reactory/client-core/components/reactory/form/utils` | 8 files | `deepEquals`, `getDefaultFormState`, `getUiOptions`, `toIdSchema`, etc. |
| `@reactory/client-core/components/reactory/form/types` | 11 files | `ReactoryFormUtilities` type. |
| Deep imports into `form/components/fields/UnsupportedField` | 3 files | **Footgun** — to be sealed via the public adapter. |
| Deep imports into `form/components/hooks/useRegistry` | 2 files | **Footgun** — must be exposed via adapter. |

## Type usage across the PWA

| Type | Files |
|---|---|
| `Reactory.Schema.ISchema` | 18 |
| `Reactory.Schema.IUISchema` | 15 |
| `Reactory.Forms.IReactoryForm` | 12 |
| `Reactory.Forms.ReactoryFormContext` | 5 |
| `Reactory.Schema.IDSchema` | 3 |

## Blast radius

Roughly **50 files** consume the form layer directly. **Heaviest concentrations:**

- `components/reactory/ux/mui/` — fields/widgets/templates (~12 files).
- `components/shared/WorkflowDesigner/` — schemas + property panel (12 step definitions, the `PropertyForm.tsx` panel).
- `components/shared/ReactorChat/hooks/macros/form.macro.tsx` — dynamic schema generation.
- `components/reactory/FormEditor/` — schema/uiSchema editing dialogs.

A **transparent swap** (preserving the public API) requires changes to ~10 files; everything else continues to work via the adapter. A **clean v5 migration** that updates each call site to v5 idioms is 50–80 files. We recommend the transparent swap first; opportunistic call-site migration second.

## Migration risk highlights (top 5)

1. **FQN resolution semantics.** Reactory's dotted-path lookup has no v5 equivalent. Entire plugin ecosystem depends on it.
2. **`formContext` shape**. 16+ keys across the app. Contract test required to lock down.
3. **`__additional_property` flag**. Strip-or-keep decision affects every form using `additionalProperties: true`.
4. **No tests today.** Any refactor without a test net is reckless. Foundation work is non-negotiable.
5. **`UNSAFE_componentWillReceiveProps`** is a forced clock — React 19 ships without it.
