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

- Global flag: `core.FormsEngineV5@1.0.0` (declared in the
  `reactory-express-server` core module's `featureFlags` array; per-client
  values configured under `data/clientConfigs/<client>/index.ts`; default
  `value: false` ships in the reactory client config).
- Per-form override: `formDef.options.engine: 'v5' | 'fork'`.
- The dispatch lives in `EngineDispatchedForm` (the integration shim) which
  reads the flag via Apollo using a small `useReactoryFeatureFlag` hook
  backed by the new `ReactoryEffectiveFeatureFlags` GraphQL query. The
  hook is cache-first, so one network round-trip per session powers
  every form mount thereafter.

```ts
// in EngineDispatchedForm.tsx
const { value: v5FlagOn } = useReactoryFeatureFlag(FORMS_ENGINE_V5_FQN, false);
const engine = formDef?.options?.engine
  ?? (v5FlagOn ? 'v5' : 'fork');
```

`useReactoryForm` itself does NOT read feature flags; it accepts the resolved
`engine` value via its args. This separation lets unit tests of the hook
avoid Apollo wiring entirely.

Phase 5 deletes the fork code path. The flag stays in the catalogue for
audit purposes; clients that don't want v5 anymore set `value: false` in
their config.

### Earlier (incorrect) note

An earlier revision of this ADR described the dispatcher as reading
`reactory.featureFlags.get('forms.useV5Engine')`. That method does not
exist on the Reactory SDK; the optional chaining made the call always
return `undefined`, so the global-flag path silently never engaged.
The P5.7 patch wired the real Reactory feature-flag system as
described above.

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
