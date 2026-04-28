# 01 — Vision & Objectives

## Vision

> Reactory forms are the fastest path from a JSON Schema definition to an enterprise-grade, accessible, testable, observable UI — without forking the framework that powers them.

The forms engine should be **boring infrastructure**: when product teams need a new form, they author a schema, register a few FQN-resolved widgets, and ship. They should never need to read the form engine's source to understand why a field rendered as `UnsupportedField`.

## Objectives

### Functional

1. **Full JSON Schema draft-07+ support.** Today's gaps — `if`/`then`/`else`, property-level `oneOf`/`anyOf`, `patternProperties`, `readOnly`/`writeOnly`, `dependentRequired`/`dependentSchemas`, nested `$ref` chains — all work without authors needing to know the engine's quirks.
2. **Every Reactory extension preserved.** FQN component resolution, the object-form `ui:title`/`ui:description`/`ui:error` shapes, `formContext` extensions, GraphQL data manager, plugin/runtime widget loading, and `__additional_property` key-rename semantics all continue to work for existing forms with zero schema changes.
3. **No public API regression.** `ReactoryForm`, `ReactoryFormRouter`, and the `Reactory.Forms.*` / `Reactory.Schema.*` types keep their current surfaces. Deep imports into form internals are replaced with a documented, stable adapter API.

### Non-functional

4. **WCAG 2.1 AA** for every default field/widget/template; automated axe-core gate in CI.
5. **i18n** for all built-in messages (validation errors, button labels, empty states) routed through `reactory.i18n`.
6. **Performance budget**: a 300-field form renders in ≤500 ms cold, ≤50 ms on incremental change; large arrays virtualized at >50 items.
7. **Test coverage**: ≥85 % statements / ≥80 % branches across the engine, with a contract test suite that proves Reactory adapter parity with vanilla rjsf.
8. **Observability**: a structured trace per form lifecycle event (mount, validate, submit, error) routed through the existing telemetry pipeline.

### Process

9. **Coexistence first.** Both engines run side-by-side, switchable per form, until every consumer is migrated. No big-bang cutover.
10. **Documented decisions.** Every architectural choice has an ADR. Future contributors can read the trail without spelunking through git history.

## Success metrics

| Metric | Baseline | Target |
|---|---|---|
| JSON Schema feature coverage (draft-07 keywords) | ~60 % | 100 % |
| Form-engine test coverage (statements) | 0 % in `form/` tree | ≥85 % |
| WCAG 2.1 AA axe violations on default forms | unmeasured | 0 |
| Cold render time, 300-field form | unmeasured (~suspected >2 s) | ≤500 ms |
| Incremental render time (single field change) | unmeasured | ≤50 ms |
| Average open issues blamed on the form engine | (track from issue tracker) | -50 % within 2 quarters |
| Bundle size (forms engine) | (measure baseline) | not regressed by >10 % vs baseline |

## Non-goals

- **Replacing every Material UI widget.** The 47+ MUI widgets stay; only their *integration* with the form engine changes.
- **A new form authoring DSL.** Schemas remain JSON Schema + ui:schema. No bespoke Reactory schema language.
- **Removing GraphQL data managers.** `useDataManager` and friends are out of scope; the engine integrates with them via `formContext`.
- **Mobile / React Native parity.** This effort targets `reactory-pwa-client` only. `reactory-native` may follow but is a separate program.
- **Server-side rendering.** Not a current Reactory requirement.
- **Migrating away from MongoDB / PostgreSQL / Apollo.** Storage and transport layers are unaffected.

## Acceptance gates

The migration is complete when **all** of the following are true:

- The forked code under `components/reactory/form/` has no runtime path; only adapter glue remains.
- All forms in `formDefinitions/` and the workflow designer step definitions render without `UnsupportedField`.
- The contract test suite passes against both the legacy fork (during coexistence) and v5 adapter.
- The CI pipeline runs axe-core, Storybook visual diffs, and bundle-size checks on every PR touching the form layer.
- A migration runbook exists for downstream apps consuming `@reactory/client-core` (see [`13-rollback-and-coexistence.md`](./13-rollback-and-coexistence.md)).
