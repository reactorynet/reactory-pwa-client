# 05 — Migration Mapping

Concept-by-concept map of how each piece of the fork translates onto rjsf v5 + Reactory adapter. This document is the contract: every row here is a thing the Reactory adapter must implement, and every test in [`09-test-strategy.md`](./09-test-strategy.md) verifies a row.

## Core engine

| Fork concept | Where today | v5 + adapter | Notes |
|---|---|---|---|
| `<Form>` from `form/components/SchemaForm.tsx` | functional, calls `getRegistry()` inline | `withTheme(ReactoryTheme)` from `@rjsf/core` | `ReactoryTheme` provides templates + widgets adapter. |
| `FormClass.tsx` lifecycle | `UNSAFE_componentWillReceiveProps` | gone — rjsf manages state | Removes React 19 blocker. |
| `getDefaultRegistry()` (`form/utils.tsx:67-91`) | manual map | rjsf's `Registry`, augmented by `ReactoryRegistry` | Same shape, different ownership. |
| `retrieveSchema`, `toIdSchema`, `resolveSchema`, `getSchemaType` | own implementations in `form/utils.tsx` | `@rjsf/utils` exports | Drop ~600 lines of fork code. |
| `validateFormData`, `transformAjvErrors`, `toErrorSchema`, `toErrorList` | own pipeline (`utils.tsx:880-1046`) | `customizeValidator` from `@rjsf/validator-ajv8` + ajv-i18n localizer routed through `reactory.i18n` | Tested against the same fixture corpus. |
| `createErrorHandler` (proxy supporting `handler.field.addError(...)`) | own implementation | rjsf's `customValidate(formData, errors)` exposes `errors.field.addError(...)` directly | API equivalent. |
| `mergeObjects` (recursive merge for errors) | own implementation | rjsf's internal merge | One less utility to maintain. |

## Field dispatch

| Fork concept | Where | v5 + adapter | Notes |
|---|---|---|---|
| Type → component map (`SchemaField.tsx:17-26`) | `COMPONENT_TYPES` constant | rjsf's `SchemaField` does this | Drop the constant; rjsf already covers it. |
| `oneOf`/`anyOf` falling through to `UnsupportedField` (root only) | `utils.tsx:352-368` | `MultiSchemaField` at every level | Fixes `ServiceInvoke` `arguments` field. |
| `if`/`then`/`else` not rendered | not implemented | `ReactoryConditionalField` (custom) OR `rjsf-conditionals` library | Decision in [`08-enterprise-capabilities.md`](./08-enterprise-capabilities.md). |
| `patternProperties` not implemented | not implemented | rjsf v5 supports via `additionalProperties` engine | Tested separately. |
| `readOnly`/`writeOnly` not honored | not implemented | rjsf v5 honours `readOnly`; `writeOnly` is application-level | Adapter passes through. |

## FQN component resolution

The single biggest piece of Reactory glue.

| Fork concept | Where | v5 + adapter | Test |
|---|---|---|---|
| `useRegistry.tsx:42-51` — strings containing `.` resolved via `reactory.getComponent()` | hook | `ReactoryRegistry.resolveFqn(name, kind: 'field' | 'widget')` returns the component or `null`; the registry presents a `Proxy`-backed `fields`/`widgets` object whose `get(key)` calls `resolveFqn(key)` lazily on miss | `registry.test.ts` cases for: simple names, dotted FQNs, `@version` suffix (new, see ADR-0003), missing FQN, function refs |
| Function references in `ui:field` | hook | unchanged — rjsf accepts component refs | Direct passthrough |
| Local registry then global SDK lookup order | hook | preserved | Test ordering |
| `UnsupportedField` fallback | `SchemaField.tsx` | `UnsupportedFieldTemplate` from theme; logs a structured warning with `formInstanceId`, `path`, `schema.type` | Test ensures missing FQN renders the template, not a crash |

## UI schema extensions

| Fork concept | Where | v5 + adapter | Notes |
|---|---|---|---|
| Object-form `ui:title` `{ title, field, fieldOptions, icon, iconOptions }` | `useRegistry.tsx:77-126` | `ReactoryTitleFieldTemplate` reads the same shape | Same exact API. |
| Object-form `ui:description` | `useRegistry.tsx:128-175` | `ReactoryDescriptionFieldTemplate` | |
| Object-form `ui:error` (with `errorSchema` injection) | `useRegistry.tsx:177-219` | `ReactoryFieldErrorTemplate` | |
| `ui:hidden` not supported | n/a | rjsf v5 supports it natively; adapter accepts boolean **or** function `(formData, formContext) => boolean` | New capability. |
| `ui:rootFieldId` | rjsf prop | `idPrefix` in v5 | Trivial rename. |

## formContext shape

The full extension surface, preserved verbatim. Each key keeps its current setter and consumer.

| Key | Source | Implemented in adapter as |
|---|---|---|
| `formData`, `formDef`, `formInstanceId`, `getData`, `setFormData`, `refresh`, `reset`, `signature`, `version`, `props`, `i18n`, `reactory`, `screenBreakPoint`, `graphql`, `query` | `ReactoryForm/hooks/useContext.ts` | Same hook, same shape, type tightened to `ReactoryFormContextType`. |
| `$formElement`, `$submit`, `$formData` | `SchemaForm.tsx:149-151` (mutates context at render!) | `useReactoryForm` exposes them via a stable callback ref, not by mutating context. Old fields kept as deprecated aliases for one minor version. |

`ReactoryFormContextType` is exported from `form-engine/context/ReactoryFormContext.ts` and **becomes the canonical type** going forward. Existing `Reactory.Forms.ReactoryFormContext` is realiased to it; old imports continue to work.

## Templates

| Reactory need | Template (v5 adapter) |
|---|---|
| Render label honoring object-form `ui:title` | `TitleFieldTemplate` |
| Render help honoring object-form `ui:description` | `DescriptionFieldTemplate` |
| Render error honoring object-form `ui:error` | `FieldErrorTemplate` |
| Apply `ui:hidden` (boolean or callback) | `FieldTemplate` |
| Apply `ui:disabled`/`ui:readonly` | `FieldTemplate` (rjsf default already does this) |
| Material grid layouts | `ReactoryGridField` (replaces `MaterialGridField`) — registers as `ui:field: 'GridField'` |
| Tabs / accordion / stepper layouts | `ReactoryTabbedField` (replaces `MaterialTabbedField` aliases) |
| Submit button with custom labels/icons | `ButtonTemplates.SubmitButton` |
| Empty/loading states for async-bound forms | `FieldTemplate` reads `formContext.dataManager.status` |

## Widgets

The 47+ MUI widgets in `components/reactory/ux/mui/widgets/` are **kept**. They are wrapped by a single `widgetAdapter` that translates rjsf `WidgetProps` to the existing `Reactory.Forms.IReactoryWidgetProps` shape so widget code does not change.

```
rjsf WidgetProps                       Reactory widget props
  id, value, onChange, onBlur,    ──►   id, formData, onChange, onBlur,
  schema, uiSchema, options,            schema, uiSchema, options,
  formContext, registry                 formContext (typed),
                                        reactory (from formContext.reactory)
```

Each widget gets a one-line registration:

```ts
ReactoryRegistry.registerWidget('SelectWidget', adaptWidget(SelectWidget));
```

## `__additional_property` flag

| Fork | v5 + adapter |
|---|---|
| Schema mutated to inject stub property defs marked `__additional_property: true` | Replaced by `WrapIfAdditionalTemplate`. The template sees that the property is not in `schema.properties` and renders the key edit + value input. No schema mutation. |
| Reads at `SchemaField.tsx:128` and `MaterialSchemaField.tsx:146` | Move into `ReactoryWrapIfAdditionalTemplate`. |
| Constant `ADDITIONAL_PROPERTY_FLAG` exported from `form/utils.tsx:14` | Re-exported from `form-engine/index.ts` as `@deprecated` — kept for one major version, then removed. |

## GraphQL data binding

Out of scope for the engine. `ReactoryForm` continues to own data managers (REST/GraphQL/local-store). The engine just exposes `formContext.graphql` to widgets that need it, and calls `formContext.dataManager.onSubmit` on submit (already the case via `useDataManager.tsx:224`).

## Plugin / runtime widget loading

| Fork | v5 + adapter |
|---|---|
| `getInitialDepencyState()` scans `widgetMap` and `components` for FQN strings | Unchanged — lives in `ReactoryForm.tsx`. |
| `componentRegistered` event listener triggers re-render | Unchanged. |
| Field/widget lookup uses `reactory.getComponent` lazily | Now happens inside `ReactoryRegistry`'s Proxy, called at render time. |

## Deprecated paths

Anything in this column **stays exporting for one major version** so consumers don't break, then is removed in the version after.

| Deprecated | Replacement |
|---|---|
| `import Form from '@reactory/.../components/reactory/form'` | `import { ReactoryForm } from '@reactory/.../components/reactory'` |
| `import { UnsupportedField } from '.../form/components/fields/UnsupportedField'` | Use the template via theme; no direct import needed |
| `import { useRegistry } from '.../form/components/hooks/useRegistry'` | `import { useReactoryRegistry } from '.../form-engine'` |
| `ADDITIONAL_PROPERTY_FLAG` constant | n/a — `WrapIfAdditionalTemplate` handles it |
| `ReactoryFormUtilities` type | `ReactoryFormEngineUtils` from `form-engine` |

A `codemod` script under `scripts/forms-engine-codemod.ts` rewrites the common deprecated imports for downstream apps.

## Open mapping questions

These are tracked in [`12-risk-register.md`](./12-risk-register.md):

1. **`@version` suffix in FQNs** — should `core.MyField@1.0.0` resolve to a specific version? The fork doesn't support it; we can add it during the migration. Default behaviour: ignore version, log a warning.
2. **`ui:hidden` semantics for validation** — should hidden fields validate? Recommended: no. Match modern rjsf default. Document explicitly.
3. **`ui:title.field` returning a component that itself has `ui:title`** — recursion bound. Recommended: hard cap at depth 3, log warning.
