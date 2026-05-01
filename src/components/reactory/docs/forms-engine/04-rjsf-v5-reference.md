# 04 — rjsf v5 Reference

A pragmatic reference of the rjsf v5 surface we depend on. Not a substitute for the [official docs](https://rjsf-team.github.io/react-jsonschema-form/) — every shape below has a canonical home upstream. Use this to orient before reading those.

## Package layout

| Package | Purpose | Notes |
|---|---|---|
| `@rjsf/core` | The `<Form>` component, `withTheme()` HOC, theme composition. | Default export: `Form`. |
| `@rjsf/utils` | Types, schema helpers (`retrieveSchema`, `getDefaultFormState`, `deepEquals`, `mergeDefaultsWithFormData`, `omitExtraData`, …), constants. | Validator-agnostic. |
| `@rjsf/validator-ajv8` | AJV 8 validator factory: `customizeValidator(...)`, `createPrecompiledValidator(...)`. | Required as of v5; `<Form>` will not render without a validator. |
| `@rjsf/mui` | Material-UI v5 theme. | We may use this directly, or fork into a Reactory theme depending on the MUI 6 decision (see ADR-0004). |
| `@rjsf/antd`, `@rjsf/chakra-ui`, `@rjsf/bootstrap-4`, `@rjsf/fluentui-rc`, `@rjsf/semantic-ui` | Other community themes. | Not used by Reactory. |

Consult the upstream changelog for the latest versions. Our work plans for **v5.x latest stable** at the time of Phase 1.

## Form props (the parts we use)

```ts
import type { FormProps } from '@rjsf/core';
import type { RJSFSchema, UiSchema, ValidatorType } from '@rjsf/utils';

interface FormProps<TFormData, TSchema = RJSFSchema, TFormContext = any> {
  schema: TSchema;
  validator: ValidatorType<TFormData, TSchema, TFormContext>;       // REQUIRED in v5
  formData?: TFormData;
  uiSchema?: UiSchema<TFormData, TSchema, TFormContext>;
  fields?: RegistryFieldsType<TFormData, TSchema, TFormContext>;
  widgets?: RegistryWidgetsType<TFormData, TSchema, TFormContext>;
  templates?: Partial<TemplatesType<TFormData, TSchema, TFormContext>>;
  formContext?: TFormContext;

  idPrefix?: string;
  idSeparator?: string;
  liveValidate?: boolean;
  liveOmit?: boolean;
  noValidate?: boolean;
  noHtml5Validate?: boolean;
  showErrorList?: false | 'top' | 'bottom';
  omitExtraData?: boolean;
  focusOnFirstError?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  tagName?: keyof JSX.IntrinsicElements | React.ComponentType;
  translateString?: (key: string, defaultValue: string) => string;

  customValidate?: (formData: TFormData, errors: FormValidation<TFormData>) => FormValidation<TFormData>;
  transformErrors?: (errors: RJSFValidationError[], uiSchema?: UiSchema) => RJSFValidationError[];
  extraErrors?: ErrorSchema<TFormData>;

  onChange?: (e: IChangeEvent<TFormData>, id?: string) => void;
  onBlur?: (id: string, value: any) => void;
  onFocus?: (id: string, value: any) => void;
  onSubmit?: (e: ISubmitEvent<TFormData>, ev: React.FormEvent) => void;
  onError?: (errors: RJSFValidationError[]) => void;

  experimental_defaultFormStateBehavior?: ExperimentalDefaultFormStateBehavior;
  experimental_customMergeAllOf?: Experimental_CustomMergeAllOf;
}
```

Confirm the exact shape against the version you install — minor versions add/rename props.

## Registry

`@rjsf/utils` exports a `Registry` interface that is constructed by `@rjsf/core` and passed to every field, widget, and template:

```ts
interface Registry<T = any, S extends RJSFSchema = RJSFSchema, F = any> {
  fields: RegistryFieldsType<T, S, F>;
  widgets: RegistryWidgetsType<T, S, F>;
  templates: TemplatesType<T, S, F>;
  rootSchema: S;
  formContext: F;
  schemaUtils: SchemaUtilsType<T, S, F>;
  translateString?: (key: string, defaultValue: string) => string;
}
```

Built-in fields are: `SchemaField`, `ObjectField`, `ArrayField`, `BooleanField`, `NumberField`, `StringField`, `NullField`, `MultiSchemaField` (the unified handler that resolves `oneOf`/`anyOf` at any nesting level — the v5 fix for our `ServiceInvoke` bug), `OneOfField`, `AnyOfField`.

Built-in widgets cover: `TextWidget`, `TextareaWidget`, `SelectWidget`, `RadioWidget`, `CheckboxWidget`, `CheckboxesWidget`, `RangeWidget`, `EmailWidget`, `URLWidget`, `PasswordWidget`, `DateWidget`, `DateTimeWidget`, `TimeWidget`, `AltDateWidget`, `AltDateTimeWidget`, `ColorWidget`, `FileWidget`, `HiddenWidget`, `UpDownWidget`.

## Templates

`TemplatesType` is the v5 consolidation of v4's separate `ArrayFieldTemplate` / `FieldTemplate` / `ObjectFieldTemplate` / `ErrorList` props. Confirm the full member list against the version pinned, but expect at least:

- `ArrayFieldTemplate`, `ArrayFieldItemTemplate`, `ArrayFieldDescriptionTemplate`, `ArrayFieldTitleTemplate`
- `BaseInputTemplate`
- `ButtonTemplates` (`SubmitButton`, `AddButton`, `MoveDownButton`, `MoveUpButton`, `RemoveButton`, `CopyButton`)
- `DescriptionFieldTemplate`
- `ErrorListTemplate`
- `FieldErrorTemplate`
- `FieldHelpTemplate`
- `FieldTemplate`
- `ObjectFieldTemplate`
- `TitleFieldTemplate`
- `UnsupportedFieldTemplate`
- `WrapIfAdditionalTemplate`

Each is a React component with a typed prop interface exported from `@rjsf/utils`.

## UI schema keys we use

| Key | Purpose |
|---|---|
| `ui:field` | Override the field component for this branch. Accepts a string key into `fields` registry, or a component reference. |
| `ui:widget` | Override the widget for this leaf. Accepts a string key into `widgets`, or a component. |
| `ui:options` | Free-form options object. Theme/widget/template-specific. |
| `ui:order` | Order properties; `'*'` placeholder for "all unspecified here". |
| `ui:title`, `ui:description`, `ui:help`, `ui:placeholder` | Override label/help text. (We extend `ui:title`/`ui:description` to also accept an object form — see [`06-reactory-extensions.md`](./06-reactory-extensions.md).) |
| `ui:disabled`, `ui:readonly`, `ui:hidden` | Field state flags. (`ui:hidden` is a v5 feature; check version.) |
| `ui:autofocus`, `ui:autocomplete` | HTML attributes. |
| `ui:enumDisabled` | Disable specific enum options. |
| `ui:globalOptions` | Options applied across the whole form. |
| `ui:fieldReplacesAnyOrOneOf` | Use `ui:field` instead of MultiSchemaField even when oneOf/anyOf is present. |
| `ui:submitButtonOptions` | Submit button text/visibility. |
| `ui:classNames`, `ui:style` | CSS overrides. |
| `ui:FieldTemplate`, `ui:ObjectFieldTemplate`, `ui:ArrayFieldTemplate` | Per-field template override (v5 feature). |

## Validation

The validator is constructed once and passed to `<Form>`:

```ts
import { customizeValidator } from '@rjsf/validator-ajv8';
import localize_en from 'ajv-i18n/localize/en';

export const validator = customizeValidator(
  {
    customFormats: {
      'reactory-fqn': (s) => /^[a-z][\w-]*\.[A-Za-z][\w-]*(?:@[\w.-]+)?$/.test(s),
    },
    ajvOptionsOverrides: {
      strict: false,
      allErrors: true,
      verbose: true,
    },
  },
  localize_en, // can be swapped to ajv-i18n/localize/<locale> at runtime
);
```

Custom validation runs through:
- `customValidate(formData, errors)` — synchronous; mutate `errors` in place via `errors.field.addError('msg')`.
- `transformErrors(errors, uiSchema)` — post-process AJV output before display. Common for translating codes to localized messages.

## JSON Schema features

v5 supports draft-07 fully. Notable improvements over our v4 fork:

- `oneOf`/`anyOf`/`allOf` at **any nesting level** via `MultiSchemaField`. Fixes the `ServiceInvoke` `arguments` field.
- `dependentRequired`, `dependentSchemas` (Draft-2019-09).
- `WrapIfAdditionalTemplate` standardizes the additional-properties UX without our `__additional_property` flag.

What v5 still **does not** render natively:

- `if`/`then`/`else` — AJV validates them, but rjsf does not auto-branch the UI. Two options:
  1. The Reactory adapter implements a `ReactoryConditionalField` that resolves the active branch and renders it via a nested `SchemaField`.
  2. Adopt the third-party [`rjsf-conditionals`](https://github.com/mvi-health/rjsf-conditionals) library.
  See [`08-enterprise-capabilities.md`](./08-enterprise-capabilities.md) for the recommendation.

## Theme composition

```ts
import { withTheme } from '@rjsf/core';

const ReactoryForm = withTheme(ReactoryTheme);
```

The theme object has the shape `{ widgets?, fields?, templates? }`. Anything not provided falls back to upstream defaults.

## Migration touchpoints from v4

| v4 | v5 |
|---|---|
| Built-in AJV 6 validator | `validator` prop required; use `@rjsf/validator-ajv8`. |
| Separate template props | Consolidated `templates` prop. |
| `enumOptions` use option values | Use indices; enables object values in select widgets. |
| `@rjsf/material-ui/v5` subpath | `@rjsf/mui` standalone package. |
| `showErrorList` boolean | `false | 'top' | 'bottom'`. |
| Types from `@rjsf/core` | Types moved to `@rjsf/utils`. |

## Things we deliberately don't do

- We don't rely on `experimental_*` props in production paths. They may change between minor versions.
- We don't import from rjsf internal modules (e.g., `@rjsf/core/lib/components/...`). Public exports only.
- We don't ship our own React build into rjsf. Single React tree across the app.

## See also

- [Official upgrade guide v4 → v5](https://rjsf-team.github.io/react-jsonschema-form/docs/migration-guides/v5.x%20upgrade%20guide/)
- [Custom themes](https://rjsf-team.github.io/react-jsonschema-form/docs/advanced-customization/custom-themes/)
- [Custom widgets and fields](https://rjsf-team.github.io/react-jsonschema-form/docs/advanced-customization/custom-widgets-fields/)
- [Custom templates](https://rjsf-team.github.io/react-jsonschema-form/docs/advanced-customization/custom-templates/)
- [Validation](https://rjsf-team.github.io/react-jsonschema-form/docs/usage/validation/)
- [uiSchema reference](https://rjsf-team.github.io/react-jsonschema-form/docs/api-reference/uiSchema/)
