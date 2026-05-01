# 07 — Public API

What downstream consumers (other Reactory apps and plugin authors) can rely on, and what they must not import.

## Stability tiers

| Tier | Guarantee | Examples |
|---|---|---|
| **Stable** | Semver-respected. Breaking changes only at major bumps with codemods. | `ReactoryForm`, `ReactoryFormRouter`, `Reactory.Schema.*`, `Reactory.Forms.*` |
| **Public** | Semver-respected for the engine. | Everything exported from `form-engine/index.ts`. |
| **Internal** | No guarantees. May change in minor versions. | Anything not in the two lists above. |
| **Deprecated** | Works for one major version, with deprecation warnings. Removed thereafter. | See [`05-migration-mapping.md#deprecated-paths`](./05-migration-mapping.md). |

## Stable surface (unchanged)

### Components

```ts
import {
  ReactoryForm,
  ReactoryFormEnhanced,
  ReactoryFormRouter,
} from '@reactory/client-core/components/reactory';
```

`<ReactoryForm>` props are unchanged. The current `IReactoryFormProps<TData>` contract holds.

### Types

The `Reactory` global namespace continues to expose:

```ts
Reactory.Schema.ISchema
Reactory.Schema.IUISchema
Reactory.Schema.IDSchema
Reactory.Forms.IReactoryForm
Reactory.Forms.ReactoryFormContext        // realiased to ReactoryFormContextType
Reactory.Forms.ReactoryFieldComponent
Reactory.Forms.IReactoryFormUtilities     // realiased to ReactoryFormEngineUtils
```

`Reactory.Forms.ReactoryFormContext` becomes a type alias for the new `ReactoryFormContextType` (a strict superset). Existing code that destructures only the v4-era keys continues to compile and run.

### Hooks (called by app code)

```ts
useFormDefinition(formId)
useDataManager(formDef, formContext)
useUISchema(formDef, screenBreakPoint)
useFormContext(props)
```

These remain in `ReactoryForm/hooks/`. Their return shapes are unchanged.

## Public engine surface (new)

### Engine entry hook

```ts
import { useReactoryForm, ReactoryTheme } from '@reactory/client-core/components/reactory/form-engine';

const { form, validator, registry, submit } = useReactoryForm({
  schema,
  uiSchema,
  formData,
  formContext,
  onChange,
  onSubmit,
  onError,
});

return form;
```

### Registry access

```ts
import { useReactoryRegistry } from '@reactory/client-core/components/reactory/form-engine';

const registry = useReactoryRegistry();
const Component = registry.resolveFqn('myorg.MyCustomField', 'field');
```

Plugin authors should prefer registering at startup time:

```ts
reactory.registerComponent({
  nameSpace: 'myorg',
  name: 'MyCustomField',
  version: '1.0.0',
  component: MyCustomField,
});
```

The registry will pick it up via `reactory.getComponent` lazily; no special engine API needed.

### Custom widgets

```ts
import { adaptWidget } from '@reactory/client-core/components/reactory/form-engine';

const MyWidget = adaptWidget(({ formData, onChange, formContext }) => {
  // ... existing Reactory widget signature
});
```

### Custom validation

```ts
import { createReactoryValidator } from '@reactory/client-core/components/reactory/form-engine';

const validator = createReactoryValidator({
  reactory,
  customFormats: {
    'positive-int': (v) => Number.isInteger(v) && v > 0,
  },
  locale: 'en',
});
```

### Form context typing

```ts
import { useReactoryFormContext, type ReactoryFormContextType } from '@reactory/client-core/components/reactory/form-engine';

const ctx = useReactoryFormContext<MyFormData>();
```

## What is **not** public

Importing any of the following is unsupported:

- Anything from `components/reactory/form/` (legacy fork) other than the default export.
- Anything from `components/reactory/form-engine/templates/`, `form-engine/fields/`, `form-engine/registry/`, `form-engine/validator/`, `form-engine/context/` other than via the index re-exports.
- Internal helpers like `resolveFqn`, `localizerFor`.

A lint rule (`no-restricted-imports`) enforces this in CI starting Phase 2.

## Public deprecation policy

When a public API is renamed:

1. Add the new export.
2. Re-export the old name with `@deprecated` JSDoc.
3. Add a runtime `console.warn` in dev builds (suppressed in production).
4. Ship a codemod under `scripts/forms-engine-codemod.ts` that rewrites consumer code.
5. Remove at the next major version.

## Versioning

The PWA client itself is not currently versioned independently of its tenant deployments. We propose:

- **`form-engine` carries an internal version constant** (`FORM_ENGINE_VERSION`) exported from `form-engine/index.ts`.
- The constant is bumped per ADR. Plugins can read it to gate behaviour.
- ADR-0001 carries the inception version `1.0.0`.

## Migration support

For each removed-but-not-yet-replaced API, we publish a migration recipe in `docs/forms-engine/recipes/` (created in Phase 4). Each recipe is a single markdown file with: before/after code snippet, codemod command, manual steps if any.

Initial recipes (Phase 4):

- `recipes/migrate-from-form-default-export.md`
- `recipes/migrate-from-useRegistry.md`
- `recipes/migrate-from-additional-property-flag.md`
- `recipes/register-custom-widget.md`
- `recipes/register-custom-field.md`
- `recipes/register-custom-validator.md`
- `recipes/migrate-from-MaterialGridField.md`
- `recipes/migrate-from-MaterialTabbedField.md`
