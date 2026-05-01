# 14 — Glossary

Terms used across the design doc set, in plain language.

| Term | Meaning |
|---|---|
| **Adapter layer** | The new code under `form-engine/` that sits between Reactory's wrapper and upstream rjsf, translating Reactory concepts into v5 idioms. |
| **AJV** | The JSON Schema validator we use. v4 fork ships AJV 6; v5 uses AJV 8 via `@rjsf/validator-ajv8`. |
| **Contract suite** | A test suite that asserts the fork and v5 adapter produce equivalent rendered output and validation errors for the same `(schema, uiSchema, formData)` triple. |
| **Coexistence** | The phase where both engines compile and ship; a feature flag and per-form override pick which engine renders a given form. |
| **FQN** | Fully Qualified Name. A string of the form `namespace.Name` or `namespace.Name@version` used by Reactory to look up plugin-registered components. |
| **Fork** | The current in-tree react-jsonschema-form code at `components/reactory/form/`. Based on rjsf v4.2.0. |
| **`formContext`** | The object passed by the form to every field/widget/template. Reactory extends it with the SDK handle, i18n service, screen breakpoint, GraphQL config, and other extras. See [`02-current-state.md`](./02-current-state.md#reactory-specific-extensions). |
| **`formData`** | The current value object the form is editing. |
| **`formDef`** | An `IReactoryForm` definition: schema + uiSchema + GraphQL config + plugin dependencies. Loaded server-side or from a local registry. |
| **JSON Schema draft-07** | The schema language Reactory authors. We support draft-07 and (via AJV 8) selected Draft-2019-09 keywords. |
| **MultiSchemaField** | rjsf v5's unified field component for `oneOf`/`anyOf`/`allOf` at any nesting level. The fix for our `ServiceInvoke.arguments` `oneOf` bug. |
| **Object-form `ui:title`** | A Reactory-specific extension: `ui:title` may be a string (default rjsf behaviour) or an object `{ title, field, fieldOptions, icon, iconOptions }` directing custom rendering. |
| **Public API** | The exports consumers can rely on across versions. See [`07-public-api.md`](./07-public-api.md). |
| **rjsf** | `react-jsonschema-form`. The upstream library at https://rjsf-team.github.io/react-jsonschema-form/. |
| **`registry`** | rjsf's runtime lookup table for fields, widgets, templates, formContext, schemaUtils. Reactory's adapter wraps this with FQN resolution. |
| **SchemaForm** | The inner schema-driven renderer (currently `form/components/SchemaForm.tsx`). Distinct from `ReactoryForm`, the outer wrapper that loads form definitions and wires data managers. |
| **SDK** | `Reactory.Client.ReactorySDK`, the client-side handle to the Reactory platform. Exposes `getComponent`, `i18n`, `featureFlags`, `telemetry`, and friends. |
| **Template** | A v5 component that controls layout/structure (e.g., `FieldTemplate` wraps every field; `ObjectFieldTemplate` lays out object properties). Distinct from a field (chooses which input to render) and a widget (the input itself). |
| **uiSchema** | A parallel object tree to the schema that controls rendering hints (`ui:widget`, `ui:options`, `ui:title`, `ui:order`, …). |
| **`__additional_property`** | A flag the fork sets on schema entries derived from `additionalProperties` so that the field renders an editable key input. Replaced by v5's `WrapIfAdditionalTemplate`. |
| **WCAG 2.1 AA** | The accessibility conformance level we target. |
| **Widget** | A leaf input component (e.g., `SelectWidget`, `TextWidget`). 47+ Reactory-specific widgets live in `components/reactory/ux/mui/widgets/`. |
| **withTheme** | rjsf v5 HOC that produces a themed Form component from a `{ widgets, fields, templates }` object. |
