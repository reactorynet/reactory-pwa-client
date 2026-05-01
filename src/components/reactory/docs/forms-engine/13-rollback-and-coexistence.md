# 13 — Rollback & Coexistence

The migration is not a flag-day cutover. Both engines coexist for the duration of Phase 2 → Phase 5. This document is the operations runbook.

## Coexistence model

A single feature flag (`forms.useV5Engine`) and a per-form override (`formDef.options.engine`) decide which engine renders a given form.

```ts
function pickEngine(formDef: IReactoryForm, reactory: ReactorySDK): 'v5' | 'fork' {
  // Per-form override takes precedence.
  if (formDef.options?.engine) return formDef.options.engine;

  // Global flag.
  return reactory.featureFlags.get('forms.useV5Engine') ? 'v5' : 'fork';
}
```

**Phase 2 default:** `forms.useV5Engine = false`. v5 engine ships, lights up only via opt-in.

**Phase 3 default:** `forms.useV5Engine = true`. v5 is primary; opt-out per form is the rollback.

**Phase 5:** flag deleted. Fork code path deleted.

## Per-form override

Form definitions can pin themselves:

```yaml
id: my-tenant.SensitiveForm
nameSpace: my-tenant
name: SensitiveForm
version: 1.0.0
options:
  engine: 'fork'   # pin to legacy engine until verified
schema: { ... }
uiSchema: { ... }
```

Used for:
- Forms that hit edge cases not yet covered by the contract suite.
- Forms owned by tenants who haven't yet validated the migration in their staging environment.
- Emergency rollback of a single form without disabling v5 globally.

## Rollback procedures

### Single form regression in production

```
1. On-call confirms the regression is engine-blamed.
2. Open `formDef` in the form definition store.
3. Set `options.engine: 'fork'`.
4. Save. Tenants pulling fresh definitions see the rollback within 1 ping cycle (default 30s).
5. File a ticket with the regression details + form ID.
6. Add a fixture covering the regression to `form-engine/__tests__/fixtures/`.
7. Fix in v5 engine; remove the override.
```

### Global v5 engine regression

```
1. On-call sets `forms.useV5Engine = false` via the feature flag console.
2. All forms revert to fork on the next render.
3. Investigate; produce a root-cause analysis within 24 hours.
4. Re-enable only after the regression is fixed and the new fixture lands.
```

### Catastrophic engine failure (unlikely)

```
1. Revert the v5 engine code via PR (`git revert`).
2. Rebuild and redeploy.
3. Fork-only path is still live; no functional impact for existing forms.
```

## Migration rollout order

Forms migrate in **risk-ascending order**:

1. **Internal devtools forms** — FormEditor dialogs, debug panels. Lowest blast radius.
2. **Workflow designer step properties** — Reactory-internal authors only.
3. **Common system forms** — login, profile, password reset (low-traffic on edit, high-traffic on read).
4. **Tenant-facing CRUD forms** — CRM record edit, KYC application. Highest blast radius.
5. **Plugin-provided forms** — once plugin authors confirm.

A "form migration scoreboard" page (built in Phase 3) shows for each form: engine, last seen render count, last seen error count, owner.

## What changes at the consumer level

**Schema authors:** nothing. Existing schemas work on both engines.

**uiSchema authors:** nothing for the existing keys. New `ui:hidden`, `ui:permission`, etc., only available on v5.

**Plugin / widget authors:** nothing if they use the public API (`reactory.registerComponent`). If they import from `form/components/*` directly, the codemod rewrites the import; otherwise the deprecated shim works for one minor version.

**Form definition authors:** can opt out via `options.engine: 'fork'`. Recommended only when a real bug is found; default should always be v5 once Phase 3 starts.

## Communication plan

| Audience | Channel | Cadence |
|---|---|---|
| Reactory Platform team | Slack #reactory-platform | Weekly during phases 2–4 |
| Plugin authors | Reactory release notes | At each phase exit |
| Tenants / consumer teams | Email + release notes | Phase 2 announcement, Phase 3 cutover, Phase 5 deprecation deadline |
| End users | None | Engine swap should be invisible |

## Acceptance for full retirement (Phase 5)

The fork can be deleted when **all** of the following hold for ≥4 weeks:

- Zero forms with `options.engine: 'fork'`.
- Zero engine-blamed production incidents.
- Codemod has run across all in-house consumers.
- Deprecated exports have a `console.warn` in dev that no one is hitting (counter at 0).
- Bundle-size budget continues to hold without the fork code excluded.

## Reverting the migration

If after Phase 4 we collectively decide v5 is the wrong direction:

1. Set `forms.useV5Engine = false` globally.
2. Engineering pause on `form-engine/` development.
3. Decide whether to delete `form-engine/` or keep it dormant. Recommended: keep one minor version, then delete via ADR.

This is unlikely — the design's coexistence strategy is specifically chosen so reverting is cheap. If we get to Phase 4 and the v5 engine is producing real pain, we have not lost any of the test net or feature work; the contract suite still drives correctness on the fork.
