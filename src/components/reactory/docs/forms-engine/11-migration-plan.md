# 11 — Migration Plan

A phased delivery plan with explicit exit criteria. Phases gate each other — no phase starts before the previous one's exit criteria are green.

## Estimate at a glance

| Phase | Duration | Engineers | Calendar weeks |
|---|---|---|---|
| Phase 0 — Surface fixes & branch hygiene | 2 days | 1 | 0.5 |
| Phase 1 — Test foundation | 1 sprint | 1 | 2 |
| Phase 2 — Adapter layer + coexistence | 2 sprints | 1–2 | 4 |
| Phase 3 — Migrate forms to v5 engine | 2 sprints | 2 | 4 |
| Phase 4 — Enterprise features | 2 sprints | 2 | 4 |
| Phase 5 — Cleanup, retirement, polish | 1 sprint | 1 | 2 |
| **Total** | | | **~16.5 weeks** (8 sprints, with buffer) |

Add a 25–35 % calendar buffer for review, integration, and unanticipated coupling. Realistic landing: **end of Q3 2026** if started early Q2.

## Phase 0 — Surface fixes & branch hygiene (2 days)

Already partially done on `feature/forms-engine-modernization`. Tidy and merge the small fixes ahead of the design landing so they're not blocked.

**Deliverables**
- Fix `ServiceInvoke.arguments` `oneOf` → `string` (already done).
- Fix `Telemetry` `allOf`/`if`/`then` extraction → flat `properties` (already done).
- Land design docs (this folder) on `feature/forms-engine-modernization`.

**Exit criteria**
- Both definitions render without `UnsupportedField`.
- Design docs reviewed by Reactory Platform team and at least one PWA consumer-team lead.

## Phase 1 — Test foundation (2 weeks)

Build the test net **before** any engine code changes. This is non-negotiable.

**Deliverables**
- `form-engine/__tests__/contract/` test harness (renders a fixture with the fork, returns DOM string).
- Fixture corpus covering all step definitions and form definitions (~25–35 fixtures).
- React Testing Library setup with `mockReactorySDK()` helper.
- `axe-core` plumbed into Storybook test runner.
- Baseline coverage report for `form/` and `ReactoryForm/`.
- Storybook stories for all current MUI fields (the catalog of 10 fields × 5 states = ~50 stories).
- React 19 incompatibility documented as risk; `UNSAFE_componentWillReceiveProps` left in place for now.

**Exit criteria**
- Contract suite green on the fork.
- ≥30 fixtures committed.
- Coverage baseline established (current is ~0 in `form/`).
- A11y baseline report produced (current state, before any fixes).

## Phase 2 — Adapter layer + coexistence (4 weeks)

Stand up the `form-engine/` adapter alongside the fork. Both engines compile and ship; behaviour is feature-flagged off by default.

**Deliverables**
- Install `@rjsf/core@5`, `@rjsf/utils@5`, `@rjsf/validator-ajv8@5`. Pinned versions, lockfile committed.
- `form-engine/registry/` — `ReactoryRegistry`, `resolveFqn`, `widgetAdapter`. Unit-tested.
- `form-engine/validator/` — `createReactoryValidator` + localizer. Unit-tested.
- `form-engine/templates/` — `FieldTemplate`, `ObjectFieldTemplate`, `ArrayFieldTemplate`, `TitleFieldTemplate`, `DescriptionFieldTemplate`, `FieldErrorTemplate`, `WrapIfAdditionalTemplate`, `UnsupportedFieldTemplate`, `ButtonTemplates`. Each unit-tested + Storybook.
- `form-engine/context/` — `ReactoryFormContextType`, hook.
- `form-engine/hooks/useReactoryForm.ts` — primary entry; switches engine by feature flag.
- Telemetry emission for all lifecycle events.
- Validator localizer integrated with `reactory.i18n`.
- A11y attributes on all default templates.

**Exit criteria**
- `useReactoryForm` renders **all** fixtures correctly when feature flag `forms.useV5Engine = true`.
- Contract suite green on **both** fork and v5 (parity verified).
- Coverage targets met for `form-engine/*`.
- Storybook published, axe gate enabled.
- Bundle size measured; under budget.

## Phase 3 — Migrate forms to v5 engine (4 weeks)

Flip the flag form by form. Production traffic on v5 starts here.

**Deliverables**
- `forms.useV5Engine` flag default flipped to `true`.
- `formDef.options.engine` per-form override available for emergency rollback.
- Migrate workflow designer step definitions (12 steps).
- Migrate `formDefinitions/` (2–3 forms).
- Migrate FormEditor dialogs (~5 dialogs).
- Migrate ReactorChat form macros.
- Wizard / multi-step field (`ReactoryConditionalField` + `WizardField` from [`08-enterprise-capabilities.md`](./08-enterprise-capabilities.md)).
- RBAC-aware fields (`ui:permission`).
- E2E test pass on the workflow designer and at least one production-representative form.

**Exit criteria**
- All in-tree forms render via the v5 engine in production traffic for ≥1 week with no engine-blamed incidents.
- Workflow designer step definitions all render their property panels correctly.
- E2E suite passes.
- A11y baseline +20 % over Phase 1 (concrete number set after baseline).

## Phase 4 — Enterprise features (4 weeks)

Land features that go beyond fork parity.

**Deliverables**
- Computed fields (JSONata).
- Async / server-side validation.
- Virtualized arrays.
- Devtools form inspector.
- Performance perf test in CI; budgets enforced.
- Bundle size guard in CI.

**Exit criteria**
- All features behind feature flags, off by default.
- Each feature has a Storybook story and a recipe doc.
- Perf test green; budget honoured.

## Phase 5 — Cleanup, retirement, polish (2 weeks)

Remove the fork. Stop carrying two engines.

**Deliverables**
- Codemod script in `scripts/forms-engine-codemod.ts` rewriting deprecated imports.
- Run codemod across the PWA + (with permission) downstream Reactory apps.
- Delete `components/reactory/form/` (the fork).
- Re-export deprecated names with `@deprecated` JSDoc; remove `console.warn` after one minor version.
- Announce in the Reactory release notes; link to recipes.
- Final ADR closing out the migration.

**Exit criteria**
- Fork deleted from `master`.
- No deep imports into legacy paths.
- All forms in production on v5 engine for ≥4 weeks.
- Public API documentation up to date.

## Sequencing dependencies

```
Phase 0 ──┐
          ├─► Phase 1 (test net) ──► Phase 2 (adapter) ──► Phase 3 (migrate)
                                                                 │
                                                                 ├─► Phase 4 (features)
                                                                 │
                                                                 └─► Phase 5 (cleanup)
```

Phase 4 can run in parallel with the tail of Phase 3 once the engine is in production for the first 4–5 forms.

## Ownership

Owners assigned per phase by the Reactory Platform lead. Each phase has:

- A **driver** — single-threaded responsible engineer.
- A **reviewer** — separate engineer, must sign off on every PR.
- A **stakeholder** — product or consumer-team lead, signs off on the phase exit.

## Risks per phase

See [`12-risk-register.md`](./12-risk-register.md) for the full register. Highest per phase:

- **Phase 1:** Fixture corpus undercounts the real-world variation. *Mitigation:* sample from production form payloads.
- **Phase 2:** Hidden assumption in fork that doesn't surface until a specific form is rendered. *Mitigation:* contract tests block.
- **Phase 3:** A migrated form regresses for a specific tenant. *Mitigation:* per-form opt-out flag; full coexistence path.
- **Phase 4:** Performance regression from new features. *Mitigation:* perf budget gate.
- **Phase 5:** Codemod misses a downstream consumer. *Mitigation:* keep deprecated exports for one full minor version; surface dev-build warnings.

## Out-of-scope (won't do in this program)

- React Native form engine (separate project).
- Rewriting MUI widgets.
- New widgets (unless one is required to land an enterprise feature).
- Server-side schema authoring tooling.
- A new form authoring DSL.
