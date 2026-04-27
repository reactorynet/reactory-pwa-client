# Reactory Forms Engine — Modernization Design

> Status: **Proposal — pending review**
> Owner: Reactory Platform team
> Branch: `feature/forms-engine-modernization`
> Last updated: 2026-04-25

This folder contains the design and migration plan to retire the in-tree fork of `react-jsonschema-form` (rjsf) and re-build the Reactory forms engine on top of upstream **rjsf v5** with a Reactory adapter layer that preserves every existing capability and adds the enterprise features we currently work around.

## Why now

The current fork is based on **rjsf v4.2.0**. It is missing JSON Schema features that real Reactory schemas already try to use today (the `Telemetry` step's `if/then/else` block, the `ServiceInvoke` step's property-level `oneOf`). It also carries React 19-incompatible patterns (`UNSAFE_componentWillReceiveProps`), no test coverage in the form/ tree, and dual `.tsx`/`.jsx` files that have stalled mid-migration. Each new feature request increases the maintenance tax. See [`02-current-state.md`](./02-current-state.md).

## What we are proposing

A two-track approach:

1. **Replace the fork's render core** with `@rjsf/core` v5 + `@rjsf/validator-ajv8`, keeping `@reactory/client-core/components/reactory/form` and `…/ReactoryForm` as the public API surface so consumers see no churn.
2. **Build a `ReactoryTheme`** that re-implements every Reactory-specific extension (FQN component resolution, object-form `ui:title`/`ui:description`/`ui:error`, `formContext` extensions, `__additional_property` semantics, GraphQL data binding, screen-breakpoint awareness) as v5 templates / fields / widgets.

On top of that we land enterprise features the fork can't carry: conditional rendering, computed fields, async validators, RBAC-aware fields, autosave with conflict resolution, virtualized arrays, accessibility gates, i18n via the existing `reactory.i18n` service, telemetry, and a Storybook-driven dev playground. See [`08-enterprise-capabilities.md`](./08-enterprise-capabilities.md).

## Reading order

| # | Document | Purpose |
|---|---|---|
| 01 | [Vision & objectives](./01-vision-and-objectives.md) | What "done" looks like; non-goals; success metrics. |
| 02 | [Current state](./02-current-state.md) | Inventory of the fork and Reactory extensions, with file:line citations. |
| 03 | [Target architecture](./03-target-architecture.md) | Layered architecture, package boundaries, data flow. |
| 04 | [rjsf v5 reference](./04-rjsf-v5-reference.md) | Concise reference of the v5 APIs we depend on. |
| 05 | [Migration mapping](./05-migration-mapping.md) | Concept-by-concept fork → v5 mapping table. |
| 06 | [Reactory extensions on v5](./06-reactory-extensions.md) | Spec for each Reactory feature implemented as a v5 adapter. |
| 07 | [Public API](./07-public-api.md) | Stable surface for consumers (forms, ReactoryForm, types). |
| 08 | [Enterprise capabilities](./08-enterprise-capabilities.md) | Conditional logic, computed fields, RBAC, autosave, virtualization, telemetry. |
| 09 | [Test strategy](./09-test-strategy.md) | Unit, integration, visual, contract, a11y, perf — coverage targets. |
| 10 | [Non-functional requirements](./10-non-functional.md) | A11y (WCAG 2.1 AA), i18n, performance budgets, observability. |
| 11 | [Migration plan](./11-migration-plan.md) | Phased delivery, exit criteria per phase, ownership. |
| 12 | [Risk register](./12-risk-register.md) | Risks, mitigations, owners. |
| 13 | [Rollback & coexistence](./13-rollback-and-coexistence.md) | How fork and v5 coexist during migration; how to revert. |
| 14 | [Glossary](./14-glossary.md) | Terminology used across these documents. |
| 15 | [Execution strategy](./15-execution-strategy.md) | How Claude orchestrates and Copilot CLI handles bulk work; token-budget tactics. |
| ADR | [Architecture Decision Records](./adrs/README.md) | The decisions that shaped this plan. |
| Live | [Coverage baseline](./coverage-baseline.md) | Tracked test/coverage numbers, updated each phase exit. |
| Live | [Phase 1 closeout](./phase-1-closeout.md) | Phase 1 actuals vs estimate, deferrals, lessons, Phase 2 re-baseline. |
| Live | [Phase 2 closeout](./phase-2-closeout.md) | Phase 2 actuals vs estimate, deferrals, lessons, Phase 3 re-baseline. |
| Live | [Phase 3 closeout](./phase-3-closeout.md) | Phase 3 actuals vs estimate, deferrals, lessons, Phase 4 re-baseline. |
| Recipe | [Migrate a form to v5](./recipes/migrate-a-form-to-v5.md) | Per-form migration steps, rollback procedures, known limitations. |

## At a glance

- **Effort estimate:** 6–8 sprints across 5 phases (see [`11-migration-plan.md`](./11-migration-plan.md)).
- **Blast radius:** ~50 files use the form layer directly; ~33 files reference its types. See [`02-current-state.md`](./02-current-state.md#blast-radius).
- **Risk:** Medium-high — primarily around FQN resolution semantics and the `formContext` extension surface. Mitigated by a coexistence strategy where both engines can run side-by-side until every form is migrated. See [`13-rollback-and-coexistence.md`](./13-rollback-and-coexistence.md).
- **Public API:** Unchanged for the common consumer paths (`ReactoryForm`, `ReactoryFormRouter`, `Reactory.Schema.*` and `Reactory.Forms.*` types). Deep imports into `components/reactory/form/components/*` will be deprecated and replaced.

## Open questions

These are tracked in the relevant docs and need resolution before Phase 2 starts:

1. Do we keep `__additional_property` semantics or migrate to v5's `WrapIfAdditionalTemplate`? See [`05-migration-mapping.md`](./05-migration-mapping.md).
2. Does `formContext.graphql` belong in v5 `formContext` or in a separate Reactory data-manager context? See [`06-reactory-extensions.md`](./06-reactory-extensions.md).
3. Which MUI version do we target for the theme? The PWA is on MUI 6; `@rjsf/mui` has historically tracked MUI 5. See [`adrs/ADR-0004-mui-theme.md`](./adrs/ADR-0004-mui-theme.md).
4. Conditional rendering — native via templates or third-party `rjsf-conditionals`? See [`08-enterprise-capabilities.md`](./08-enterprise-capabilities.md).
