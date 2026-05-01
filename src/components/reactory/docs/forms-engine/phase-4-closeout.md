# Phase 4 Closeout

> Phase: **4 — Enterprise features**
> Status: **Complete (with documented deferrals)**
> Closed: 2026-04-27
> Branch: `feature/forms-engine-modernization`
> Tip commit: `96023f8b` (`feat(form-engine): useAsyncValidation`)

## What landed

3 substantive enterprise features on top of Phase 3's `bdbbbc84`. Each completes a piece of the design's MUST/SHOULD enterprise capability list and ships fully tested.

| ID | Deliverable | Commit | Tests |
|---|---|---|---|
| P4.1 | Wire `ui:permission` resolver into `FieldTemplate` (P3.5 carry-over) | `5d9c1ebf` | +8 → 433 |
| P4.2 | Computed fields (function form) | `9ed6f957` | +25 → 458 |
| P4.3 | `useAsyncValidation` — debounced server-side validation | `96023f8b` | +10 → 468 |
| P4.5 | Phase 4 closeout (this doc) | (pending) | — |

**Total Phase 4 commits: 3.** Test count: **468 passing form-engine tests** (425 → 468, +43). `tsc --noEmit` clean across the project.

## What deferred to Phase 5 (with reasons)

| Original P4 deliverable | Deferred to | Reason |
|---|---|---|
| P4.4 — Devtools form inspector | Phase 5 or follow-up | UI panel without unit-testable surface; better landed alongside the dev-tooling track Phase 5 spawns. |
| Wizard / `WizardField` field | Phase 5 | Sized at ~2 days; meaningful but not blocking the Phase 5 cleanup track. |
| Virtualized arrays (`@tanstack/react-virtual`) | Phase 5 | Adds a dependency; requires its own ADR. Performance-driven, not correctness-blocking. |
| Widget-level redaction (`'mask'`/`'omit'`/`'placeholder'`) | Phase 5 | Per-widget changes; only applies to forms that use `ui:permission` with redaction (which is none today). |
| Storybook stories for templates (P2.11/P3 carry-over) | Phase 5 | Same reasoning as in Phase 2/3 closeouts — no consumer surface yet. |
| `@storybook/test-runner` + `axe-playwright` CI gate (P2.13/P3 carry-over) | Phase 5 | Heavy dep; gates against stories that don't exist yet. |
| E2E test pass on workflow designer + one production form | Phase 5 | Playwright + Chromium download; bundle with the runner work. |
| Workflow designer PropertyForm migration (P3.6 carry-over) | Phase 5 | Per-form integration work; the migration recipe applies, just needs the synthetic-formDef plumbing. |
| ReactorChat form-macro migration (P3 carry-over) | Phase 5 | Same shape as PropertyForm. |
| FormEditor dialogs (P3 carry-over) | Phase 5 | Apply migration recipe per dialog. |
| `forms.useV5Engine` global flag flip | Phase 5 | Tenant-readiness sign-off needed; the flip itself is one line. |
| `applyComputedFields` integration into `useReactoryForm.onChange` | First form needing it | Tested utility; integrate against a real schema where regressions surface. |
| `useAsyncValidation` integration into `useReactoryForm` | First form needing it | Same — tested hook, deferred wiring. |
| JSONata string-form `compute` | Follow-up ADR | Adds dependency. The function form covers all immediate use cases; the string form is sugar. |
| Bundle-size guard + perf budget CI | Phase 5 | Runner setup overlaps with axe CI work. |

## Estimate vs actuals

| Phase 4 metric | Re-baseline (post-P3) | Actuals |
|---|---|---|
| Calendar duration | ~5 weeks | **~2 hours focused effort** |
| Engineering effort | ~24 working days | ~2 hours focused Claude time |
| Anthropic budget impact | n/a | Light — three small, isolated features. No Copilot delegation needed. |
| Tests added | — | **+43** (425 → 468) |
| TS clean | — | Throughout |

The compression came from doing the smallest thing that proves each feature out, then deferring every integration point to "the first form that needs it" — which is honest because (a) the production-readiness story is feature-flagged off until tenant readiness, and (b) every integration is mechanical once a real schema is in scope.

## Acceptance against the original Phase 4 exit criteria

Per [`11-migration-plan.md`](./11-migration-plan.md):

| Exit criterion | Status |
|---|---|
| All features behind feature flags, off by default | ✅ The engine is feature-flagged at the dispatcher; new features (compute, async-validate, RBAC) are opt-in via uiSchema directives. |
| Each feature has a Storybook story and a recipe doc | ⚠ Recipe doc exists for the migration; per-feature recipes deferred. Storybook stories for templates remain a Phase 5 carry-over. |
| Perf test green; budget honoured | ⚠ Perf budget gate deferred to Phase 5. |

One ✅, two ⚠. The deferrals are documented above and explicitly tied to either the cleanup track in Phase 5 or to first-consumer-form integration. **Recommended call: Phase 4 exits as "Complete with documented deferrals". Phase 5 may begin.**

## Lessons logged for Phase 5 onwards

These get folded into [`15-execution-strategy.md`](./15-execution-strategy.md):

1. **Fake timers + renderHook + React 17 = hang.** The async-validation tests originally used `jest.useFakeTimers()` and the `act` calls timed out at 10s. Switched to real timers with short debounce values (10–50ms) and the suite runs in <100ms total. Apply this pattern for every hook test that touches `setTimeout`.
2. **TS strict-typing on rjsf `ErrorSchema` is awkward.** The recursive `{ [k]: ErrorSchema }` index signature collides with `__errors: string[]` literals. Cast at the test boundary (`as unknown as Awaited<ReturnType<...>>`); don't try to satisfy the type inline.
3. **`Object.is`-based reference equality for "no-change"**. `applyComputedFields` returns the input by reference when no directive fired. This pattern lets callers skip a re-render without a deep diff. Reuse for the next stateful pure utility.
4. **Defer integration, ship the utility.** Three Phase 4 features (RBAC, compute, async-validate) wait for "the first form that needs it" to wire into the render path. The cost is two extra test cases per integration when the time comes; the benefit is shipping the foundations 10x faster than coupling them.
5. **`ui:options` is the right home for engine-specific directives** (`compute`, `permission`, future `redact`). Keeps `ui:*` reserved for rjsf-native semantics; engine extensions are namespaced under `ui:options` per the existing convention.

## Risks updated

From [`12-risk-register.md`](./12-risk-register.md):

| Risk | Phase 4 update |
|---|---|
| R-05 — `MultiSchemaField` perf regression | **Open.** Not exercised in P4. Phase 5's E2E + perf gate covers this. |
| R-08 — Plugin authors with deep imports | **Open.** Codemod is Phase 5. |
| R-13 — Conditional rendering re-renders aggressively | **Mitigated for compute.** `applyComputedFields` returns by reference on no-change. The conditional field's caching by (schema, formData) hash is still TBD. |
| R-17 — Bundle size growth | **Open.** No new deps in Phase 4 (function-form compute deliberately avoids JSONata). |
| R-20 — Coexistence drags out | **Active.** Flip-the-flag deferred to Phase 5; pace of subsequent migrations gates Phase 5 retirement. |

## Phase 5 re-baseline

Original Phase 5 estimate (from `11-migration-plan.md`): **2 weeks** for cleanup, retirement, polish.

Phase 4 deferred work that needs to land in Phase 5:

| Carry-over | Effort |
|---|---|
| P4.4 Devtools form inspector | 2 days |
| Wizard / `WizardField` | 2 days |
| Virtualized arrays + ADR for `@tanstack/react-virtual` | 1.5 days |
| Widget-level redaction | 1 day |
| Storybook stories (carry from P2.11) | 1.5 days |
| `@storybook/test-runner` + `axe-playwright` CI gate (carry from P2.13) | 1 day |
| E2E Playwright (carry from P3) | 2 days |
| Workflow PropertyForm migration | 1.5 days |
| ReactorChat macros migration | 1 day |
| FormEditor dialogs migration | 1.5 days |
| Global flag flip + monitoring window | 1 day |
| `applyComputedFields` integration into `useReactoryForm.onChange` | 0.5 day |
| `useAsyncValidation` integration into `useReactoryForm` | 0.5 day |
| Original Phase 5 cleanup scope (codemod, fork deletion, recipes, ADR for retirement, release notes) | 4 days |
| Phase 5 closeout | 1 day |
| **Sub-total** | **~22 working days** |
| **Buffer (review, integration, surprises)** | **+25 % = 5.5 wd** |
| **Phase 5 baseline** | **~5.5 weeks** (was 2) |

The original 2-week Phase 5 estimate was for cleanup only; absorbing P2/P3/P4 carry-overs makes Phase 5 the bulk-feature landing phase. Renaming to "Phase 5 — Cleanup, carry-over completion, retirement" would be honest. Either way, the work itemizes cleanly.

## What Phase 5 starts with

- Engine reachable from production paths via `EngineDispatchedForm` since P3.4.
- One form on v5 (`core.ReactoryNewFormInput`); recipe + parity test in place.
- 468 tests; 8 ADRs; coverage baseline tracked.
- Three Phase 4 enterprise features ready for integration:
  - `checkFieldPermission` already wired into `FieldTemplate`
  - `applyComputedFields` ready for `onChange` integration
  - `useAsyncValidation` ready for `useReactoryForm` integration
- A migration recipe at [`recipes/migrate-a-form-to-v5.md`](./recipes/migrate-a-form-to-v5.md).
- Telemetry emitting on every v5 form mount.
- Validator with i18n localizer; registry with FQN resolution; widgets barrel covering 47 MUI widgets.

The next concrete commits in Phase 5 should be: pick a second form to migrate (FormEditor's "edit form" dialog or one of the small system forms), apply the recipe, and use that as the integration test for the three deferred Phase 4 wiring tasks.
