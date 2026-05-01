# ADR-0007 — Implement `if`/`then`/`else` rendering ourselves; do not adopt `rjsf-conditionals`

**Status:** Proposed
**Date:** 2026-04-25

## Context

JSON Schema draft-07 has `if`/`then`/`else` conditionals. AJV validates them, but rjsf v5 does **not** auto-branch the UI when these keywords are present. Today the fork doesn't render them either, which is why the `Telemetry` step's `allOf`/`if`/`then` block silently failed.

Two ways forward:

1. **Adopt [`rjsf-conditionals`](https://github.com/mvi-health/rjsf-conditionals)**, a third-party library that wraps `<Form>` and applies a rule-based DSL on top of the schema.
2. **Implement our own `ReactoryConditionalField`** (this ADR) that walks `schema.if`/`then`/`else`, validates `formData` against `schema.if`, picks `then` or `else`, merges into a derived schema, and renders the merged schema via a nested `SchemaField`.

## Decision

We implement our own. `ReactoryConditionalField` lives at `form-engine/fields/ReactoryConditionalField.tsx`. It auto-activates when a schema contains `if`/`then`/`else` (gated by a feature flag during rollout). The merged schema is cached per `(schemaHash, formDataDigest)` to avoid validation thrash.

## Consequences

**Positive**

- Schema authors use plain JSON Schema. No second DSL to learn.
- The schema remains the single source of truth; tooling (validators, exporters) understands it without special-casing.
- Cost is small: estimated 2–4 working days for the implementation and tests.
- Caching keeps re-render cost manageable on large forms.

**Negative**

- We own the implementation. Bug fixes are on us.
- Cycle detection: `then.if.then.if.…` infinite recursion is theoretically possible. Bounded with a depth limit (default 10).

## Rejected

- **`rjsf-conditionals`.** Adds a runtime dependency, a parallel rule DSL, and a maintenance vector outside our control. Schema authors would have to choose between expressing logic in JSON Schema or in the rule DSL — the kind of "two ways to do it" trap that erodes consistency.

## See also

- [`08-enterprise-capabilities.md#1-conditional-rendering--ifthenelse-must`](../08-enterprise-capabilities.md#1-conditional-rendering--ifthenelse-must)
- [`06-reactory-extensions.md#10-reactoryconditionalfield-ifthenelse`](../06-reactory-extensions.md#10-reactoryconditionalfield-ifthenelse)
