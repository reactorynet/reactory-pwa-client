# Phase 5 Closeout

> Phase: **5 — Cleanup, carry-over completion, retirement**
> Status: **Partial — engine ready for production scale-out; fork retirement deferred**
> Closed: 2026-04-27
> Branch: `feature/forms-engine-modernization`
> Tip commit: `7f72ef36` (`feat(form-engine): public API barrel`)

## What landed

3 commits on top of Phase 4's `48bdb723`. Phase 5 focused on completing the Phase 4 carry-overs (hook integrations) and stabilizing the public API surface — the work that turns "tested adapter primitives" into "consumable engine".

| ID | Deliverable | Commit | Tests |
|---|---|---|---|
| P5.1 | Integrate `applyComputedFields` into `useReactoryForm.onChange` | `16475747` | +2 → 470 |
| P5.2 | Integrate `useAsyncValidation` into `useReactoryForm` (extraErrors path) | `ffc31132` | +3 → 473 |
| P5.4 | Public API barrel at `form-engine/index.ts` + surface-pinning test | `7f72ef36` | +44 → 517 |
| P5.5 | Phase 5 closeout (this doc) | (pending) | — |

**Total Phase 5 commits: 3.** Test count: **517 passing form-engine tests** (468 → 517, +49). `tsc --noEmit` clean across the project.

## What deferred (final state of the migration program)

Phase 5 explicitly does NOT retire the legacy fork or flip the global `forms.useV5Engine` flag. Both are tenant-readiness sign-off concerns that need product engagement, not engineering work. The remaining items, in priority order:

### Deferred: production rollout (gated on tenant readiness)

| Item | Effort | Owner |
|---|---|---|
| Migrate the next 3–5 forms via the recipe (FormEditor dialogs) | ~0.5 day each | Per-form PR |
| Migrate workflow designer PropertyForm (synthetic formDef plumbing) | 1.5 days | Single PR |
| Migrate ReactorChat form macros | 1 day | Single PR |
| Flip `forms.useV5Engine` global flag default to true | 1 line + monitoring | After ≥5 forms validated in production |

### Deferred: Phase 5 cleanup track (gated on global flag flip)

| Item | Effort | Reason |
|---|---|---|
| Codemod for deprecated import paths | 1 day | Gated on >0 forms migrated; codemod targets fork imports |
| Delete the legacy fork at `components/reactory/form/` | 0.5 day | Gated on every form being on v5 + 4-week soak per `13-rollback-and-coexistence.md` |
| Final retirement ADR | 0.5 day | Gated on fork deletion |
| Reactory release notes + downstream-app migration runbook | 1 day | Gated on fork deletion |

### Deferred: enterprise features (could land in any subsequent phase)

| Item | Effort | Reason |
|---|---|---|
| WizardField — multi-step / wizard layout | 2 days | Would land alongside the first multi-step form |
| Devtools form inspector | 2 days | Useful but not blocking; spawn a small "DX track" |
| Virtualized arrays via `@tanstack/react-virtual` | 1.5 days | Add when first form has >50 array items |
| Widget-level redaction (`'mask'`/`'omit'`/`'placeholder'`) | 1 day | Add when first form needs it (none today) |
| JSONata string-form `compute` | 1 day + ADR | Add when a form needs declarative formulas |

### Deferred: tooling and observability infrastructure

| Item | Effort | Reason |
|---|---|---|
| Storybook stories for templates (75 stories) | 1.5 days | Copilot bulk delegation candidate |
| `@storybook/test-runner` + `axe-playwright` CI gate | 1 day | Pulls 200MB Chromium; bundle with E2E |
| E2E Playwright test pass | 2 days | First E2E target should be the workflow designer |
| Bundle-size guard + perf budget CI | 1 day | Set initial budget, add a `size-limit` config |

## Estimate vs actuals

| Phase 5 metric | Re-baseline (post-P4) | Actuals |
|---|---|---|
| Calendar duration | ~5.5 weeks | **~1 hour focused effort** (P5.1, P5.2, P5.4 only) |
| Engineering effort | ~22 working days | ~1 hour focused Claude time |
| Tests added | — | **+49** (468 → 517) |
| TS clean | — | Throughout |
| Anthropic budget | n/a | Light — three small integrations + one barrel + tests |

The compression came from scoping Phase 5 to "complete the integrations and stabilize the surface" rather than absorbing everything. The remaining items above are listed honestly, not buried in a closeout that claims completion.

## Acceptance against the original Phase 5 exit criteria

Per [`11-migration-plan.md`](./11-migration-plan.md):

| Exit criterion | Status |
|---|---|
| Fork deleted from `master` | ⚠ Deferred — needs every form migrated + 4-week soak first. |
| No deep imports into legacy paths | ⚠ Pending codemod (deferred). |
| All forms in production on v5 engine for ≥4 weeks | ⚠ One form on v5; production rollout pending tenant sign-off. |
| Public API documentation up to date | ✅ Surface barrel + surface-pinning test landed. `07-public-api.md` matches reality. |

One ✅, three ⚠ — all the ⚠s are explicitly product-coordination work, not engineering blockers. **Recommended call: Phase 5 exits as "Partial — engine ready for production scale-out". Post-Phase-5 work continues as per-form migration PRs and a final retirement phase when product is ready.**

## Lessons for the post-Phase-5 work

1. **Mock at the test boundary, not in the engine.** Three Jest config additions in this branch (`apollo-upload-client`, `mermaid`, plus integration-test mocks of widgets) consistently let the engine compile and load under jsdom while keeping production code paths heavy and real. This pattern scales to future ESM dependencies that ts-jest can't transform.

2. **Reference equality is a useful contract.** `applyComputedFields` returning the input by reference when no directive fires is what made the P5.1 integration trivial — the `onChange` wrapper just forwards the event when nothing changed. Same pattern works for any future render-time transform.

3. **`extraErrors` is the right pipeline for async validation.** Pumping the hook's output straight to `<Form extraErrors>` means rjsf handles error rendering, surface positioning, and submit-blocking semantics for free. Fighting rjsf's error pipeline would have cost twice as much and produced an inferior UX.

4. **A surface-pinning test catches regressions cheaply.** Forty-one one-line `expect(engine.X).toBeDefined()` assertions cost almost nothing to run and prevent the kind of "I accidentally removed an export" bug that breaks every downstream consumer at deploy time. Reuse the pattern for every public package.

5. **Document deferrals in shape, not in scope.** Each Phase 1→5 closeout listed deferrals with reasons and effort estimates. The remaining work is therefore plannable rather than ambiguous; product engagement can pull items into specific PRs rather than negotiating "what's left".

## Final state of the migration program

Five phases, **30 commits** on `feature/forms-engine-modernization`, **517 passing tests** (47 → 517, +470), **8 ADRs**, **5 closeout docs**, **1 migration recipe**, **1 form on v5**, **0 production incidents** (none possible — nothing pushed).

| Phase | Commits | Tests at exit | Key deliverables |
|---|---|---|---|
| 1 — Test foundation | 11 | 47 | AGENTS.md, mockReactorySDK, contract harness, 27-fixture corpus |
| 2 — Adapter layer | 10 | 377 | rjsf v5.24.13 install, registry, validator, 11 templates, widgets barrel, telemetry hook |
| 3 — Migration | 6 | 425 | EngineDispatchedForm, ConditionalField, RBAC resolver, first form migrated, recipe doc |
| 4 — Enterprise features | 3 | 468 | RBAC into FieldTemplate, computed fields, async validation |
| 5 — Cleanup | 3 | 517 | Hook integrations into useReactoryForm, public API barrel |

**The forms engine is production-capable.** Every adapter primitive is fully tested, the public API is stable and pinned, the migration recipe is documented, and the engine ships behind a feature flag with per-form rollback. The remaining work is product-coordination (which forms to migrate when) and follow-up tooling (Storybook, axe, E2E) that the per-form migrations will demand naturally.

The branch is ready to push when product is ready to start migrating forms in production.
