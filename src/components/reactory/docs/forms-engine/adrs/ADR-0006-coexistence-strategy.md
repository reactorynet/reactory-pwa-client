# ADR-0006 — Coexistence via feature flag + per-form override; no big-bang cutover

**Status:** Proposed
**Date:** 2026-04-25

## Context

The fork serves dozens of forms across multiple tenants. A flag-day cutover risks taking everything down at once if the v5 adapter has a hidden defect.

Two coexistence patterns:

1. **Branch-based.** Maintain a long-lived feature branch; merge to master only at the end. Operationally hard, painful merge conflicts, no production validation until cutover.
2. **Runtime feature flag with per-form override (this ADR).** Both engines compile and ship; a flag picks per render. Each form can be migrated and validated independently.

## Decision

We pick option 2:

- Global flag: `forms.useV5Engine` (default `false` during Phase 2; flipped to `true` at start of Phase 3).
- Per-form override: `formDef.options.engine: 'v5' | 'fork'`.
- The selector lives in `useReactoryForm`; both engines are compiled and tree-shaken on demand.

```ts
function pickEngine(formDef, reactory) {
  if (formDef.options?.engine) return formDef.options.engine;
  return reactory.featureFlags.get('forms.useV5Engine') ? 'v5' : 'fork';
}
```

Phase 5 deletes the fork code path and the flag.

## Consequences

**Positive**

- Granular rollback: regress one form, pin only that form to fork until the bug is fixed.
- Production validation throughout the migration, not just at the end.
- No long-lived branch.
- Cuts over per tenant if needed (different tenants can have different `forms.useV5Engine` setting).

**Negative**

- Bundle size temporarily includes both engines. Measured: under our budget.
- Two code paths to maintain during phases 2–5. Mitigated by the contract suite which runs against both.

## See also

- [`13-rollback-and-coexistence.md`](../13-rollback-and-coexistence.md)
- [`11-migration-plan.md`](../11-migration-plan.md)
