# Recipe: Migrate a form to the v5 engine

> Audience: form authors and product engineers
> Status: live recipe (Phase 3 — first migration completed for `core.ReactoryNewFormInput` at commit `<this commit>`)

## When to use this

You have an `IReactoryForm` definition (in code or stored server-side) that you want to render on the v5 form engine. This recipe walks the change.

Choose your first form by **risk-ascending order** (per [`13-rollback-and-coexistence.md`](../13-rollback-and-coexistence.md#migration-rollout-order)):

1. **Internal devtools forms** ← `core.ReactoryNewFormInput` is the Phase 3 starting point
2. Workflow designer step properties
3. Common system forms (login, profile)
4. Tenant-facing CRUD forms
5. Plugin-provided forms

## Steps

### 1. Confirm prerequisites

- The form's schema renders cleanly on the v5 engine. Run the contract baseline survey to check:

  ```bash
  npx jest --testPathPattern="form-engine/__tests__/contract" --verbose 2>&1 | grep -E "missing widgets|Affected"
  ```

  If your form references a widget in the "missing widgets" list, that widget needs adapter wiring first (see [`08-enterprise-capabilities.md`](../08-enterprise-capabilities.md) and the `form-engine/widgets/index.tsx` barrel).

- The form has no `if`/`then`/`else` clauses unless you've already added `ui:field: 'ConditionalField'` (per [`ADR-0007`](../adrs/ADR-0007-conditional-rendering.md)).

### 2. Pin the engine

Add `options.engine: 'v5'` to the form definition.

#### In-tree code-defined form

```ts
// e.g. src/components/reactory/formDefinitions/MyForm.ts
import Reactory from '@reactorynet/reactory-core';
// Side-effect import: augments Reactory.Forms.IReactoryForm with options.engine typing.
import '@reactory/client-core/components/reactory/form-engine/types';

const MyForm: Reactory.Forms.IReactoryForm = {
  id: 'tenant.MyForm',
  name: 'MyForm',
  // ...
  options: {
    engine: 'v5',
  },
  schema: { /* ... */ },
};
```

#### Server-driven form (loaded via GraphQL)

Update the form record in your form definition store:

```diff
{
  id: "tenant.MyForm",
+  options: { engine: "v5" },
  schema: { ... }
}
```

### 3. Add it to the migration parity test

Append the form to `MIGRATED_FORMS` in
`src/components/reactory/form-engine/__tests__/integration/migratedForms.test.tsx`:

```ts
const MIGRATED_FORMS: MigratedFormSpec[] = [
  {
    formDef: ReactoryNewFormInput,
    description: 'core.ReactoryNewFormInput — first Phase 3 migration',
  },
+  {
+    formDef: MyForm,
+    description: 'tenant.MyForm — <one-line context>',
+  },
];
```

The test guarantees that the engine dispatcher picks v5 for the form. Any future regression that reverts the pin shows up here.

### 4. Smoke-test in dev

```bash
bin/start.sh <client-key> <environment>
```

Open the form in the running app. Expect:

- The form renders without crashes.
- Required fields show the asterisk indicator (Reactory `FieldTemplate`).
- Validation errors appear in `role="alert"` regions with stable `${id}-error` IDs.
- Browser DevTools → Network → no fork-only widget requests.
- Browser DevTools → console → telemetry events emitted: `form.mount`, then per interaction `form.change`, `form.validate`, `form.submit.*`.

### 5. Watch in production

After deployment, monitor:

- `form.fqn.miss` events (any FQN string in `ui:field` or `ui:widget` that didn't resolve).
- `form.submit.error` rate vs. baseline.
- Bug reports tagged with the form's `signature`.

If anything looks wrong, **roll back** with one line — see the next section.

## Rollback

### Per-form rollback (recommended)

```diff
options: {
-  engine: 'v5',
+  engine: 'fork',
}
```

The dispatcher picks `'fork'` immediately on the next render. No code changes elsewhere; no redeploy needed if the form is server-driven.

### Global rollback

In emergencies, set the feature flag:

```ts
// reactory.featureFlags
'forms.useV5Engine': false
```

This affects every form that doesn't have an explicit per-form pin. Forms with `engine: 'v5'` set explicitly continue to use v5 — flip those individually if needed.

### Catastrophic rollback

`git revert` the commit that introduced `EngineDispatchedForm` (the seam point) — see [`13-rollback-and-coexistence.md`](../13-rollback-and-coexistence.md#catastrophic-engine-failure-unlikely).

## What you do NOT need to do

- Touch the form's schema or uiSchema (unless you're adding a v5-only feature like `ui:field: 'ConditionalField'`).
- Change widgets or fields elsewhere in the codebase.
- Migrate dependent forms — they continue on the fork until you migrate them individually.

## Known limitations (Phase 3)

- The widget catalogue is wired (`reactoryWidgets()` from `form-engine/widgets`), but heavy widgets still require their existing dependencies (Apollo, MermaidDiagram, localforage). If your form uses one of those widgets, verify rendering in dev — automated tests can't load these under jsdom.
- `ui:permission` is wired (P3.5) but the FieldTemplate integration that applies the resolved decisions is deferred to the first form that needs RBAC. If your form uses `ui:permission`, that's the right PR to pull the integration into.
- Widget-level redaction (`'mask'`/`'omit'`/`'placeholder'`) is Phase 4. Phase 3 hides + readonly-only.

## See also

- [ADR-0006 — Coexistence strategy](../adrs/ADR-0006-coexistence-strategy.md)
- [ADR-0007 — Conditional rendering](../adrs/ADR-0007-conditional-rendering.md)
- [Rollback and coexistence runbook](../13-rollback-and-coexistence.md)
- [Migration mapping](../05-migration-mapping.md)
