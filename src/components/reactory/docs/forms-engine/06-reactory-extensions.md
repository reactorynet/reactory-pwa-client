# 06 — Reactory Extensions on rjsf v5

The full implementation spec for the Reactory adapter layer. Each section pairs a feature with its TypeScript shape, where it lives, and the test cases that prove it.

All paths below are inside `src/components/reactory/form-engine/`.

## 1. ReactoryRegistry

**Location:** `registry/ReactoryRegistry.ts`, `registry/resolveFqn.ts`

**Purpose:** Map `ui:field` / `ui:widget` strings to React components, resolving FQN references via the Reactory SDK lazily.

```ts
export type FQN = `${string}.${string}` | `${string}.${string}@${string}`;

export interface ReactoryRegistryOptions {
  reactory: Reactory.Client.ReactorySDK;
  staticFields?: RegistryFieldsType;
  staticWidgets?: RegistryWidgetsType;
  onMiss?: (kind: 'field' | 'widget', name: string) => void;
}

export interface ReactoryRegistry {
  fields: RegistryFieldsType;     // Proxy: get(name) resolves FQNs lazily
  widgets: RegistryWidgetsType;   // Proxy: get(name) resolves FQNs lazily
  registerField(name: string, component: FieldComponent): void;
  registerWidget(name: string, component: WidgetComponent): void;
  resolveFqn(name: string, kind: 'field' | 'widget'): React.ComponentType | null;
}

export function createReactoryRegistry(options: ReactoryRegistryOptions): ReactoryRegistry;
```

**Resolution rules (in order):**

1. If `name` is already a function/component reference → return it.
2. If `name` matches `staticWidgets` (or `staticFields` for fields) → return it.
3. If `name` contains a `.` → call `reactory.getComponent(name)`. Strip `@version` suffix if present and log a debug warning that version pinning is not yet enforced.
4. If still nothing → return `null`. Caller (the dispatcher inside rjsf) decides how to render: typically `UnsupportedFieldTemplate`.

**Tests (≥30):**
- All four resolution paths
- Cycles: an FQN that resolves to itself
- Dotted names that aren't FQNs (e.g., `material.ui.something`)
- `@GLOBAL$` prefix (recognized → log warn → resolve without prefix)
- `@version` suffix variants
- Concurrent calls with same name (memoization correctness)

## 2. ReactoryTheme

**Location:** `ReactoryTheme.ts`

```ts
import type { ThemeProps } from '@rjsf/core';
import { templates } from './templates';
import { fields } from './fields';
import { widgets } from './widgets';

export const ReactoryTheme: ThemeProps = {
  templates,
  fields,
  widgets,
};
```

`templates`, `fields`, and `widgets` are barrels under their respective directories. Each member is a small component (≤200 LOC) with co-located tests.

## 3. Object-form ui:title / ui:description / ui:error

The fork accepts both string and object forms for these. v5 native templates only accept strings. The adapter templates re-implement the object form.

### TitleFieldTemplate

**Location:** `templates/TitleFieldTemplate.tsx`

```ts
interface UITitleFieldOptions {
  title?: string;
  field?: string;                 // FQN or registry key
  fieldOptions?: Record<string, unknown>;
  icon?: string;                  // material icon name
  iconOptions?: { color?: string; size?: number; position?: 'before' | 'after' };
}
```

Behaviour:

1. If `uiSchema['ui:title']` is a string → render the default rjsf title with that string.
2. If it is `false` → render nothing.
3. If it is an object → resolve `field` via `useReactoryRegistry()`, render the resolved component with `{ title, ...fieldOptions, icon, iconOptions, idSchema, registry, formContext }`. If no `field`, render the default title plus an icon if `icon` is set.

Tests cover: string, false, object with field, object without field, icon-only, recursion guard.

### DescriptionFieldTemplate

Identical shape and rules, with `description` instead of `title`.

### FieldErrorTemplate

Object form additionally receives `errorSchema` so custom error renderers can format per-field. Mirrors `useRegistry.tsx:177-219`.

## 4. ui:hidden

**Location:** `templates/FieldTemplate.tsx`

Accepts:

```ts
type UIHidden =
  | boolean
  | ((args: { formData: any; formContext: ReactoryFormContextType; idSchema: IdSchema }) => boolean);
```

If `true` (or callback returns `true`), the field is not rendered, and `omitExtraData` semantics determine whether its data is preserved. By default, hidden fields **are not validated** (matches modern rjsf). Documented explicitly to avoid surprises.

## 5. WrapIfAdditionalTemplate (replaces __additional_property)

**Location:** `templates/WrapIfAdditionalTemplate.tsx`

Renders the key-rename input alongside the value input for properties that came in via `additionalProperties`. Does not mutate the schema; relies on rjsf's `additionalProperties` machinery.

For one minor version we also expose:

```ts
/**
 * @deprecated Use the WrapIfAdditionalTemplate. Kept for compatibility.
 */
export const ADDITIONAL_PROPERTY_FLAG = '__additional_property';
```

## 6. ReactoryValidator

**Location:** `validator/ReactoryValidator.ts`

```ts
import { customizeValidator } from '@rjsf/validator-ajv8';
import { localizerFor } from './localizer';

export interface ReactoryValidatorOptions {
  reactory: Reactory.Client.ReactorySDK;
  customFormats?: Record<string, RegExp | ((value: any) => boolean)>;
  customKeywords?: Array<{ keyword: string; validate: (...args: any[]) => boolean }>;
  ajvOptionsOverrides?: Record<string, unknown>;
  locale?: string;
}

export function createReactoryValidator(options: ReactoryValidatorOptions): ValidatorType;
```

Built-in custom formats:

- `reactory-fqn` — `^[a-z][\w-]*\.[A-Za-z][\w-]*(?:@[\w.-]+)?$`
- `reactory-username`, `reactory-tenant-id`, `reactory-uuid`

`localizerFor(reactory)` returns a function compatible with ajv-i18n's localize signature, but instead of writing canned English strings into `error.message` it writes a translation key (e.g., `reactory.validation.required`). `transformErrors` then runs `reactory.i18n.t(key, { defaultValue: error.message })` for each error.

## 7. ReactoryFormContext

**Location:** `context/ReactoryFormContext.ts`

```ts
export interface ReactoryFormContextType<TData = unknown> extends Reactory.Forms.ReactoryFormContext {
  formInstanceId: string;
  signature: string;
  version: number;
  reactory: Reactory.Client.ReactorySDK;
  formData: TData;
  formDef: Reactory.Forms.IReactoryForm;
  graphql?: Reactory.Forms.IFormGraphQLDefinition;
  query?: any;
  screenBreakPoint: 'xl' | 'lg' | 'md' | 'sm' | 'xs';
  i18n: Reactory.Client.II18N;
  refresh(): void;
  reset(): void;
  getData(): Promise<TData>;
  setFormData(data: TData): Promise<void>;
  $formElement?: React.RefObject<HTMLFormElement | HTMLDivElement>;
  $submit?: () => boolean;
}

export const useReactoryFormContext = <TData = unknown>(): ReactoryFormContextType<TData>;
```

Note: `$formElement`, `$submit`, `$formData` are exposed via React refs/callbacks rather than the v4 anti-pattern of mutating `formContext` at render time.

## 8. useReactoryForm

**Location:** `hooks/useReactoryForm.ts`

The primary entry hook. Returns a fully configured `<Form>` element ready to render.

```ts
interface UseReactoryFormArgs<TData> {
  schema: RJSFSchema;
  uiSchema?: UiSchema;
  formData?: TData;
  formContext: ReactoryFormContextType<TData>;
  formats?: Record<string, RegExp | ((value: any) => boolean)>;
  onChange?: (e: IChangeEvent<TData>) => void;
  onSubmit?: (e: ISubmitEvent<TData>) => void;
  onError?: (errors: RJSFValidationError[]) => void;
}

export function useReactoryForm<TData>(args: UseReactoryFormArgs<TData>): {
  form: React.ReactElement;          // <Form ... />
  validator: ValidatorType;
  registry: ReactoryRegistry;
  submit(): boolean;
};
```

This is what `ReactoryForm.tsx` calls internally during Phase 2.

## 9. widgetAdapter

**Location:** `registry/widgetAdapter.tsx`

Wraps an existing Reactory widget so it can be registered with rjsf:

```ts
export function adaptWidget<TWidgetProps>(
  Widget: React.ComponentType<TWidgetProps>,
): React.ComponentType<WidgetProps>;
```

Translation rules:

| rjsf prop | Reactory widget prop |
|---|---|
| `value` | `formData` (legacy alias `value` kept) |
| `onChange(value)` | `onChange(value)` |
| `onBlur(id, value)` | `onBlur(id, value)` |
| `id` | `id`, `idSchema.$id` |
| `options` | `options` |
| `schema` | `schema` |
| `uiSchema` | `uiSchema` |
| `formContext` | `formContext` (typed as `ReactoryFormContextType`) |
| `registry` | `registry` |
| (derived) | `reactory` (extracted from `formContext.reactory`) |

## 10. ReactoryConditionalField (if/then/else)

**Location:** `fields/ReactoryConditionalField.tsx`

Field component that watches the schema for `if`/`then`/`else` and re-evaluates on every formData change.

Algorithm:

1. Validate `formData` against `schema.if` using the configured validator.
2. If valid → merge `schema.then` into a derived schema (via `experimental_customMergeAllOf`-style logic).
3. Else → merge `schema.else`.
4. Render the merged schema via a nested `<SchemaField>` from rjsf's registry.

Registered under the `ui:field: 'ConditionalField'` key, and **automatically activated** when the schema contains `if`/`then`/`else` (without requiring authors to set `ui:field`). This auto-activation is gated by a feature flag for safety.

## 11. ReactoryGridField & ReactoryTabbedField

These replace `MaterialGridField` and `MaterialTabbedField` (which currently aliases AccordionLayout/SteppedLayout/ListLayout). They are direct replacements — same `ui:field` keys, same `ui:options` shape — implemented over rjsf's `ObjectFieldTemplate` props rather than the fork's mutation-heavy approach.

## 12. Schema preprocessing (interpolation)

The fork does **not** do `${variable}` substitution; widget code does. We preserve that boundary — the engine remains pure with respect to schema/uiSchema.

If a workflow form needs variable substitution (e.g., `ServiceInvoke.arguments` referencing a workflow variable), the substitution happens **inside the widget** (`RichEditorWidget` already does this for JSON content) and **inside the data manager** (when posting to the service), not in the form engine.

## 13. Engine selection (coexistence)

**Location:** `hooks/useReactoryForm.ts`

```ts
const engine = formDef?.options?.engine
  ?? (reactory.featureFlags.get('forms.useV5Engine') ? 'v5' : 'fork');

if (engine === 'fork') {
  return renderLegacyFork(args);
}
return renderV5(args);
```

Per-form opt-out lets us migrate one form at a time. The flag default flips to `'v5'` at the start of Phase 3.

## 14. Telemetry

The engine emits structured events listed in [`03-target-architecture.md#lifecycle-events`](./03-target-architecture.md). All routed via `reactory.telemetry.emit(...)`. No PII in payloads — values are hashed (SHA-256 first 8 chars) for `form.change`.

## 15. Public surface of `form-engine/`

```ts
// form-engine/index.ts
export { ReactoryTheme } from './ReactoryTheme';
export { createReactoryRegistry, useReactoryRegistry } from './registry';
export { createReactoryValidator } from './validator';
export {
  type ReactoryFormContextType,
  useReactoryFormContext,
  ReactoryFormContextProvider,
} from './context';
export { useReactoryForm } from './hooks/useReactoryForm';
export { adaptWidget } from './registry/widgetAdapter';
export { ReactoryConditionalField } from './fields/ReactoryConditionalField';

// Deprecated re-exports for one minor version
export { ADDITIONAL_PROPERTY_FLAG } from './deprecated';
```

`ReactoryForm`, `ReactoryFormRouter`, and the public types stay where they are. `form-engine/` is consumed only by the wrappers and by app code that needs to register custom fields/widgets.
