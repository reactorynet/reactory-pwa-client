# ADR-0001 — Adopt rjsf v5 with a Reactory adapter; retire the fork

**Status:** Proposed
**Date:** 2026-04-25
**Decision drivers:** maintenance burden of the fork, missing JSON Schema features, React 19 compatibility, test coverage gap.

## Context

The Reactory PWA forms engine is a fork of `react-jsonschema-form` (rjsf) at version 4.2.0. The fork carries:

- ~3 656 lines of in-tree rjsf code under `components/reactory/form/`.
- No tests in the form/ tree.
- `UNSAFE_componentWillReceiveProps` (incompatible with React 19).
- Bare AJV (not `@rjsf/validator-ajv8`).
- Missing JSON Schema features: property-level `oneOf`/`anyOf`, `if`/`then`/`else`, `patternProperties`, `readOnly`/`writeOnly`, `dependentRequired`/`dependentSchemas`, nested `$ref`.
- Dual `.tsx`/`.jsx` files from a stalled migration.

Two recent bugs demonstrate the cost of the fork:

- `ServiceInvoke.arguments` rendered `UnsupportedField` because the fork doesn't dispatch property-level `oneOf`.
- `Telemetry` step's `allOf`/`if`/`then` block raised `uiSchema order list contains extraneous properties` because the fork doesn't expand draft-07 conditionals when validating `ui:order`.

We considered three options:

1. **Patch the fork to feature parity with rjsf v5.** Effort: ~12–21 working days. We forever own all upstream bug fixes and security patches. No upstream gravy train.
2. **Swap to upstream rjsf v5 with a Reactory adapter (this ADR).** Effort: similar order of magnitude (~15–25 working days for the engine swap), plus the migration overhead. Once done, we are back on the upstream maintained library.
3. **Replace rjsf entirely with a different schema-driven library** (e.g., `formily`, `react-hook-form` + JSON Schema, custom). Effort: very large; lose all rjsf knowledge in the codebase; lose draft-07 native validation. No clear win.

## Decision

**Option 2.** We adopt `@rjsf/core` v5 as the render core, build a Reactory adapter under `components/reactory/form-engine/`, and retire the fork over five phases (see [`../11-migration-plan.md`](../11-migration-plan.md)).

The adapter implements every Reactory extension (FQN component resolution, object-form `ui:title`/`ui:description`/`ui:error`, `formContext` extensions, `__additional_property` semantics, plugin/runtime widget loading, GraphQL data binding seam) on top of v5's official extension points (templates, custom fields, custom widgets, custom validator).

## Consequences

**Positive**

- Property-level `oneOf`/`anyOf` works (via `MultiSchemaField`). Fixes `ServiceInvoke`.
- `if`/`then`/`else` is renderable via a small custom field — much easier on v5's spread-merge primitives than on the fork.
- AJV 8 — better JSON Schema support, better error reporting, modular validator.
- React 19 readiness comes free.
- We can re-use `@rjsf/utils` schema utilities instead of maintaining ~600 lines of `retrieveSchema`/`toIdSchema`/`resolveSchema`.
- Future rjsf bug fixes and features land via dependency upgrade rather than manual port.
- A shared design vocabulary with the wider rjsf community.

**Negative**

- Initial cost: ~16 calendar weeks across 8 sprints, end-to-end (see migration plan).
- Coexistence period during which two engines must be supported.
- Adapter layer is itself code we own; it's smaller than the fork (~1 500 LOC estimated) but non-zero.
- Risk: a v5 minor version may rename or change a prop the adapter depends on. Mitigated by pinning and tracking the upstream changelog.

**Neutral**

- The 47+ MUI widgets stay; only their integration changes via `widgetAdapter`.
- The `Reactory.Forms.*` and `Reactory.Schema.*` types stay; no consumer churn.

## Rejected alternatives

- **Patch the fork (Option 1).** Same total cost, with no upstream benefit. Future security patches and JSON Schema improvements would still be on us.
- **Different library (Option 3).** Loss of all rjsf institutional knowledge, no clear win.
- **Rewrite from scratch.** Not even considered; too expensive, no upside.

## See also

- [`02-current-state.md`](../02-current-state.md) — what the fork carries today.
- [`05-migration-mapping.md`](../05-migration-mapping.md) — concept-by-concept translation.
- [`11-migration-plan.md`](../11-migration-plan.md) — phases and timing.
