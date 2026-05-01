# Phase 3 Closeout

> Phase: **3 — Migrate forms to v5 engine**
> Status: **Complete (with documented deferrals)**
> Closed: 2026-04-27
> Branch: `feature/forms-engine-modernization`
> Tip commit: `d786bf98` (`feat(form-engine): first form migrated to v5`)

## What landed

6 commits on top of Phase 2's `dc7d6036`. The engine is now reachable from production code paths via the legacy `ReactoryForm` wrapper, the first form is on v5, and a recipe + parity test guard the migration shape going forward.

| ID | Deliverable | Commit | Tests |
|---|---|---|---|
| P3.1 | Wire `useFormTelemetry` into `useReactoryForm` (P2.12 carry-over) | `0c417437` | +5 → 382 |
| P3.2 | `ReactoryConditionalField` (JSON Schema if/then/else renderer) | `c29e1988` | +18 → 400 |
| P3.4 | `EngineDispatchedForm` + ReactoryForm wrapper wiring (the seam point) | `c8187815` | +6 → 406 |
| P3.5 | RBAC field permissions (`ui:permission`) — resolver | `d797730d` | +17 → 423 |
| P3.3 | First form migrated: `core.ReactoryNewFormInput` + recipe doc + parity test | `d786bf98` | +2 → 425 |
| P3.7 | Phase 3 closeout (this doc) | (pending) | — |

**Total Phase 3 commits: 6.** Test count: **425 passing form-engine tests** (377 → 425, +48). `tsc --noEmit` clean across the project.

## What deferred to Phase 4 (with reasons)

| Original P3 deliverable | Deferred to | Reason |
|---|---|---|
| P3.6 — Migrate workflow designer step property panel | Phase 3.x follow-up or Phase 4 | `PropertyForm.tsx` builds schemas dynamically from step definitions rather than reading an `IReactoryForm` record, so the migration isn't a one-line `options.engine` flip — it requires plumbing a synthetic `formDef` through the panel. The first migration's recipe applies; the integration is a per-PR effort. |
| Wizard / multi-step `WizardField` | Phase 4 | Per [`08-enterprise-capabilities.md#6`](./08-enterprise-capabilities.md), this is a MUST-but-Phase-4 feature. Not a blocker for the first form migrations. |
| Storybook stories alongside templates (P2.11 carry-over) | Phase 4 | Same reasoning as Phase 2 deferral. Without the Phase 4 perf/visual work to gate against, stories produce no signal. |
| `@storybook/test-runner` + `axe-playwright` CI (P2.13 carry-over) | Phase 4 | Same. Plus depends on stories existing first. |
| FieldTemplate integration of the `ui:permission` resolver | First form that needs RBAC | The resolver (P3.5) is unit-tested and ready. Wiring it through `FieldTemplate.tsx`'s render path is best done alongside the first form that exercises it — that's where regressions actually matter. |
| Widget-level redaction (`'mask'`/`'omit'`/`'placeholder'` of values) | Phase 4 | Out of scope per [`08-enterprise-capabilities.md`](./08-enterprise-capabilities.md) section 4 explicit deferral. Hide+readonly is sufficient for Phase 3. |
| E2E test pass on workflow designer | Phase 4 | Playwright setup overlaps with the deferred axe runner; bundle them. |

## Estimate vs actuals

| Phase 3 metric | Re-baseline (post-P2) | Actuals |
|---|---|---|
| Calendar duration | 3.5–4 weeks | **~4 hours focused effort** |
| Engineering effort | ~17 working days | ~3 hours focused Claude time |
| Anthropic budget impact | n/a | Modest — every Phase 3 deliverable was correctness-critical Claude work; no Copilot delegation needed (the migration recipe is trivial-to-author once the dispatcher exists). |
| Tests added | — | **+48** (377 → 425) |
| TS clean | — | Throughout |

The compression came from doing the right thing in the right order. The first migration's diff is **one line in the form definition** (`options: { engine: 'v5' }`) plus a typed augmentation that makes that line type-safe. That's possible because every adapter primitive landed in Phase 2 already.

## Acceptance against the original Phase 3 exit criteria

Per [`11-migration-plan.md`](./11-migration-plan.md):

| Exit criterion | Status |
|---|---|
| `forms.useV5Engine` flag default flipped to `true` | ⚠ Not flipped globally. Per-form `options.engine: 'v5'` is the migration mechanism in this branch; flipping the global default is a one-line change deferred to a tenant-readiness sign-off. |
| `formDef.options.engine` per-form override available for emergency rollback | ✅ Wired via `EngineDispatchedForm` (P3.4) and `Reactory.Forms.IReactoryForm.options.engine` (P3.3 type augmentation). |
| Migrate workflow designer step definitions (12 steps) | ⚠ Deferred — `PropertyForm.tsx` schema construction is dynamic; migration shape is similar but requires synthetic-formDef plumbing. |
| Migrate `formDefinitions/` (2-3 forms) | ⚠ 1 of 2 migrated (`ReactoryNewFormInput`); `ReactoryFormList` has the documented JSX-secondaryAction divergence and waits for Phase 4. |
| Migrate FormEditor dialogs (~5 dialogs) | ⚠ Deferred per the migration recipe — apply the recipe per dialog as the team rolls them. |
| Migrate ReactorChat form macros | ⚠ Deferred — macros build dynamic `IReactoryForm` records at runtime; same shape as PropertyForm. |
| Wizard / multi-step field | ⚠ Deferred to Phase 4 (per design). |
| RBAC-aware fields (`ui:permission`) | ✅ Resolver (P3.5) tested. FieldTemplate wiring deferred to first consuming form. |
| E2E test pass on workflow designer + one production form | ⚠ Deferred to Phase 4 (Playwright bundle). |

Two ✅, seven ⚠. The ⚠ items break into two groups: (a) per-form recipe applications that are mechanically straightforward, and (b) heavier surfaces (Wizard, E2E) explicitly carried into Phase 4. **Recommended call: Phase 3 exits as "Complete with documented deferrals" — the engine is unblocked for production migration. Phase 4 may begin** when the team is ready to scale the recipe across forms.

## Lessons logged for Phase 4 onwards

These get folded into [`15-execution-strategy.md`](./15-execution-strategy.md):

1. **Type augmentation lives at the engine boundary.** `form-engine/types.ts` augments `Reactory.Forms.IReactoryForm` with `options.engine`. Forms opt into the typing via a side-effect import. This pattern works well for adding fields without forking the upstream `@reactorynet/reactory-core` types.
2. **`React.useContext` over prop drilling for recursion guards.** The `ConditionalDepthContext` / `TitleDepthContext` pattern keeps the field/template surface clean while still bounding cycles. Phase 4 should reuse this for any new conditional rendering.
3. **JSON Schema `if` semantics are unintuitive.** `properties.kind.const` doesn't constrain when `kind` is missing — empty `{}` passes. Test expectations have to match the spec, not the reader's intuition. Document this in the Phase 4 conditional-field expansions if any.
4. **Mock the legacy fork's `<SchemaForm>` in unit tests** rather than load it. The fork's transitive imports (MUI tree, useReactory, Apollo) are jsdom-hostile. `jest.mock('@reactory/client-core/components/reactory/form', …)` in `EngineDispatchedForm.test.tsx` is the pattern.
5. **The first migration is the recipe.** Once `core.ReactoryNewFormInput` worked, every subsequent form migration is `options: { engine: 'v5' }` plus appending to `MIGRATED_FORMS` in the parity test. Document migrations in the recipe trail; don't re-decide.
6. **Fail-closed on misconfigured permissions.** `checkFieldPermission` hides+readonly when a directive is set but no service is wired. That choice is documented and tested; don't soften it without a separate ADR.

## Risks updated

From [`12-risk-register.md`](./12-risk-register.md):

| Risk | Phase 3 update |
|---|---|
| R-01 — FQN resolution semantics | **Mitigated unchanged.** No new FQN paths exercised in P3. |
| R-02 — `formContext` shape divergence | **Active.** P3.1 added telemetry-related keys (formInstanceId etc.) which flow into formContext via the hook. Mostly internal; consumers don't depend on these keys today. |
| R-04 — Validator behaviour drift | **Mitigated.** Phase 3 exercised the validator via `pickConditionalBranch` — AJV's draft-07 conditional handling matches the spec. |
| R-05 — Performance regression from `MultiSchemaField` | **Open.** Not exercised yet; Phase 4 perf budget gate covers this. |
| R-08 — Plugin authors with deep imports | **Open.** Codemod is Phase 5. |
| R-15 — Fixture corpus drifts | **Open.** Production sampling deferred to a follow-up. |
| R-17 — Bundle size | **Open.** Eager widget barrel; Phase 4 bundle work pending. |
| R-20 — Coexistence drags out | **Active.** First form migrated; pace of subsequent migrations gates Phase 5 retirement. Track via the `MIGRATED_FORMS` array growing. |

## Phase 4 re-baseline

Original Phase 4 estimate (from Phase 1 closeout): **3 weeks** for enterprise features.

Phase 3 deferred work that needs to land in Phase 4:

| Carry-over | Effort |
|---|---|
| FieldTemplate `ui:permission` integration (apply hide/readonly from resolver) | 0.5 day |
| Workflow designer PropertyForm migration (synthetic formDef plumbing) | 1.5 days |
| ReactorChat form-macro migration | 1 day |
| Storybook stories for templates (carry from P2.11) | 1.5 days |
| `@storybook/test-runner` + `axe-playwright` CI gate (carry from P2.13) | 1 day |
| Widget-level redaction (`'mask'`/`'omit'`/`'placeholder'`) | 1 day |
| E2E test pass on workflow designer + one production form | 2 days |
| Wizard / `WizardField` field | 2 days |
| Computed fields (JSONata) — original Phase 4 scope | 2 days |
| Async / server-side validation — original Phase 4 scope | 2 days |
| Virtualized arrays — original Phase 4 scope | 1 day |
| Devtools form inspector — original Phase 4 scope | 2 days |
| Bundle-size guard + perf budget CI | 1 day |
| Phase 4 closeout | 1 day |
| **Sub-total** | **~19 working days** |
| **Buffer (review, integration, surprises)** | **+25 % = 5 wd** |
| **Phase 4 baseline** | **~5 weeks** (was 3) |

The ~5 weeks reflects absorbing all P2/P3 carry-overs into the same phase that adds the original enterprise features. Phase 4 closeout reverts the `forms.useV5Engine` global default to `true` and starts the global cutover.

## What Phase 4 starts with

- Engine reachable from production code paths via `EngineDispatchedForm`.
- One form migrated; recipe and parity test in place.
- All correctness-critical adapter primitives covered by 425 tests.
- 6 ADRs (1 → 8) capturing every decision; nothing lost to oral tradition.
- Coverage baseline tracked at [`coverage-baseline.md`](./coverage-baseline.md).
- A migration recipe at [`recipes/migrate-a-form-to-v5.md`](./recipes/migrate-a-form-to-v5.md) — every additional form migration is appending to `MIGRATED_FORMS` and rolling the recipe.
- Telemetry emitting on every v5 form mount; production observability ready.

The next concrete commit on the branch should be Phase 4.1: pick the next form to migrate (recommend `core.ReactoryFormList` once the JSX-secondaryAction divergence has a workaround, or one of the FormEditor dialogs).
