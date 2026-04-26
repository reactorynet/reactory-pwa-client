# 03 — Target Architecture

The post-migration architecture: where each responsibility lives, how the layers compose, and where the seams are.

## Principles

1. **Upstream where possible.** `@rjsf/core`, `@rjsf/utils`, `@rjsf/validator-ajv8` carry the schema-driven render logic. We do not re-implement what they ship.
2. **Adapters at the seams.** Reactory-specific behaviour lives in a `ReactoryTheme` and a `ReactoryRegistry`. These are the only places that know about FQN resolution, the SDK, and our `formContext` extensions.
3. **Stable public API.** The ReactoryForm wrapper, the `Reactory.Schema.*` and `Reactory.Forms.*` namespaces, and the small surface used by widget authors do not change. Internals are free to move.
4. **Coexistence-first.** A feature flag picks engine per form. Both engines compile and render until every form is migrated.
5. **Testable by construction.** Every adapter is a pure function or a small component with a clearly typed contract. Each one ships with unit tests on the same PR.

## Package boundaries

```
┌────────────────────────────────────────────────────────────────┐
│  Application code                                              │
│  - components/shared/WorkflowDesigner                          │
│  - components/shared/ReactorChat                               │
│  - components/reactory/FormEditor                              │
│  - …                                                           │
│  Imports: ReactoryForm, ReactoryFormRouter, types only         │
└────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│  Reactory Forms public API                                     │
│  components/reactory/ReactoryForm/*                            │
│  - ReactoryForm, ReactoryFormEnhanced, ReactoryFormRouter      │
│  - useFormDefinition, useDataManager, useUISchema, useContext  │
│  Loads form definitions, wires data managers and context       │
└────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│  Reactory adapter layer  (NEW)                                 │
│  components/reactory/form-engine/*                             │
│  - ReactoryTheme   — templates that honour ui:title/etc.       │
│  - ReactoryRegistry — FQN-aware fields/widgets resolver        │
│  - ReactoryValidator — AJV 8 + reactory.i18n localizer         │
│  - ReactoryFormContext — typed extension shape                 │
│  - ReactoryAdditionalPropertyTemplate — wraps WrapIfAdditional │
│  - useReactoryForm  — hook returning a configured rjsf <Form/> │
└────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│  Upstream rjsf v5                                              │
│  - @rjsf/core         (Form, withTheme, registry pipeline)     │
│  - @rjsf/utils        (types, schema utils, retrieveSchema)    │
│  - @rjsf/validator-ajv8 (validator factory)                    │
│  - @rjsf/mui          (or our own MUI templates if needed)     │
└────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│  Existing MUI widgets (preserved)                              │
│  components/reactory/ux/mui/widgets/* (47+ widgets)            │
│  Wrapped by ReactoryWidgetAdapter to translate rjsf            │
│  WidgetProps → Reactory widget props                           │
└────────────────────────────────────────────────────────────────┘
```

The fork at `components/reactory/form/` is **deleted** at the end of Phase 4 once every form is migrated and the contract suite is green on the v5 engine.

## Folder structure (target)

```
src/components/reactory/
├── ReactoryForm/                      # public wrapper, mostly unchanged
│   ├── ReactoryForm.tsx
│   ├── ReactoryFormEnhanced.tsx
│   ├── ReactoryFormRouter.tsx
│   └── hooks/                         # useFormDefinition, useDataManager, …
│
├── form-engine/                       # NEW — the adapter layer
│   ├── index.ts                       # public surface of the engine
│   ├── ReactoryTheme.ts               # withTheme(theme) seed
│   ├── registry/
│   │   ├── ReactoryRegistry.ts
│   │   ├── resolveFqn.ts              # ~150 lines, fully tested
│   │   └── widgetAdapter.tsx          # WidgetProps → Reactory widget props
│   ├── templates/
│   │   ├── FieldTemplate.tsx
│   │   ├── ObjectFieldTemplate.tsx
│   │   ├── ArrayFieldTemplate.tsx
│   │   ├── ArrayFieldItemTemplate.tsx
│   │   ├── BaseInputTemplate.tsx
│   │   ├── ButtonTemplates.tsx
│   │   ├── DescriptionFieldTemplate.tsx   # honours object-form ui:description
│   │   ├── ErrorListTemplate.tsx
│   │   ├── FieldErrorTemplate.tsx         # honours object-form ui:error
│   │   ├── FieldHelpTemplate.tsx
│   │   ├── TitleFieldTemplate.tsx         # honours object-form ui:title
│   │   ├── UnsupportedFieldTemplate.tsx
│   │   └── WrapIfAdditionalTemplate.tsx   # __additional_property semantics
│   ├── fields/
│   │   ├── ReactoryGridField.tsx         # replaces MaterialGridField
│   │   ├── ReactoryTabbedField.tsx       # replaces MaterialTabbedField (accordion/stepped/list)
│   │   └── ReactoryConditionalField.tsx  # if/then/else renderer
│   ├── validator/
│   │   ├── ReactoryValidator.ts          # customizeValidator(...)
│   │   └── localizer.ts                  # routes ajv-i18n via reactory.i18n
│   ├── context/
│   │   ├── ReactoryFormContext.ts        # typed extension shape
│   │   └── useReactoryFormContext.ts
│   ├── hooks/
│   │   └── useReactoryForm.ts            # primary entry — returns configured <Form/>
│   └── __tests__/                        # adapter unit tests
│
├── form/                              # LEGACY — kept during coexistence
│   └── …                              #   deleted at end of Phase 4
│
└── docs/forms-engine/                 # this design doc set
```

## Data flow

A render walk-through for a single form:

1. **Definition load.** `ReactoryForm` calls `useFormDefinition` which fetches `IReactoryForm` (server-driven via GraphQL or local registry). The definition contains `schema`, `uiSchema`, `graphql`, `widgetMap`, `components`, etc.
2. **Plugin resolution.** `ReactoryForm` watches `widgetMap` and `components` against the Reactory component registry; once required FQNs are loaded it proceeds to render.
3. **Engine selection.** `useReactoryForm` reads a feature flag (`useV5Engine`) defaulting to `true`; in coexistence mode an opt-out at form definition level can pin a form to the legacy renderer.
4. **Context build.** `useReactoryFormContext` builds the extended `formContext` (formInstanceId, signature, screenBreakPoint, graphql, reactory, i18n, …). Typed end-to-end via `ReactoryFormContextType`.
5. **Registry build.** `ReactoryRegistry.build({ formDef, reactory, formContext })` returns `{ fields, widgets, templates }` for rjsf. FQN resolution runs lazily inside the registry's `Proxy`-based map so we don't eagerly load every plugin.
6. **Validator build.** `ReactoryValidator(schema, { i18n, customFormats })` returns a `ValidatorType` configured with our localizer and any custom formats from `formDef.formats`.
7. **rjsf render.** `<Form schema={…} uiSchema={…} validator={validator} fields={…} widgets={…} templates={…} formContext={…} />` from `@rjsf/core` performs the schema walk and dispatches.
8. **Field render.** Each field's `FieldTemplate` is the Reactory-supplied template. It reads object-form `ui:title`/`ui:description`/`ui:error`, applies `ui:hidden`, and emits the correct ARIA attributes.
9. **Widget render.** Widgets receive standard rjsf `WidgetProps`. The `widgetAdapter` adds `formContext` typing and exposes `reactory.getComponent` shortcuts for compatibility with the existing 47-widget MUI catalogue.
10. **Validation.** On change/blur/submit, the validator runs. Errors flow through `transformErrors` → ErrorSchema → templates. The localizer translates messages using `reactory.i18n.t()` keyed by error code.
11. **Submit.** `onSubmit` is delegated to `useDataManager`; the engine itself does not know about GraphQL.

## Lifecycle events

A structured trace is emitted at:

| Event | When | Payload |
|---|---|---|
| `form.mount` | First render of `<Form>` | `formInstanceId`, `signature`, `schemaSize` |
| `form.validate` | Each validator invocation | `formInstanceId`, `errors.length`, `durationMs` |
| `form.change` | `onChange` callback | `formInstanceId`, `path`, `valueDigest` (hashed) |
| `form.submit.attempt` | `onSubmit` enter | `formInstanceId` |
| `form.submit.success` | After submit promise resolves | `formInstanceId`, `durationMs` |
| `form.submit.error` | After submit promise rejects | `formInstanceId`, `errorCode` |
| `form.unmount` | Cleanup | `formInstanceId` |

These events are routed through the existing telemetry pipeline (see `10-non-functional.md`).

## Key seams

The seams below are the **only** places that know about Reactory specifics. Anything else is upstream behaviour.

| Seam | Surface | Tested by |
|---|---|---|
| `ReactoryRegistry` | FQN → component resolution | `registry.test.ts` (≥30 cases) |
| `ReactoryTheme.templates.*` | Object-form `ui:title/description/error`, `ui:hidden`, `__additional_property` | `templates.test.tsx` |
| `ReactoryValidator` | AJV 8 + i18n + custom formats | `validator.test.ts` |
| `useReactoryFormContext` | Extended formContext typing | `formContext.test.ts` |
| `widgetAdapter` | rjsf WidgetProps → Reactory widget props | `widgetAdapter.test.tsx` |

## Hard rules

- **No mutation of `schema` or `uiSchema` at render time** by the engine. (The fork's `stubExistingAdditionalProperties` is replaced by v5's standard `WrapIfAdditionalTemplate` driving rendering from formData diff, not by mutating the schema.)
- **Templates do not import widgets directly.** Composition is via `props.children` and registry lookup.
- **`ReactoryRegistry` is the only owner of `reactory.getComponent` calls.** No template, field, or widget calls it directly; they receive resolved components via props.
- **No deep imports into rjsf internals.** We use only what `@rjsf/core` and `@rjsf/utils` export.
