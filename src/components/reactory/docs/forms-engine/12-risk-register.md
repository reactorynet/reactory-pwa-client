# 12 — Risk Register

Track-able risks, their owners, mitigations, and current status. Reviewed at the start of each phase.

| ID | Risk | Likelihood | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R-01 | FQN resolution semantics differ subtly between fork and adapter, breaking forms post-migration | Medium | High | Contract tests; ≥30 explicit `resolveFqn` cases; per-form rollback flag | Engine driver | Open |
| R-02 | `formContext` shape divergence — a key set silently in the fork is missing or differently named in the adapter | High | High | Type-tighten `ReactoryFormContextType`; assert all 16+ keys in `formContext.test.ts`; alias via type union for one major version | Engine driver | Open |
| R-03 | `__additional_property` flag removal breaks key-rename UX | Low | Medium | Re-export the constant `@deprecated` for one version; replace with `WrapIfAdditionalTemplate`; explicit test for additionalProperties forms | Engine driver | Open |
| R-04 | Validator behaviour drift: AJV 8 reports errors with different `dataPath` shapes than the bare AJV in the fork | Medium | High | Contract tests assert error paths; `transformErrors` shim normalizes to fork shape during coexistence | Engine driver | Open |
| R-05 | Performance regression — v5's MultiSchemaField re-validates each branch on render for nested oneOfs | Medium | Medium | Perf test in CI; memoization layer in `useReactoryForm`; if budget breached, pin a tested version of `@rjsf/core` and file upstream | Engine driver | Open |
| R-06 | `UNSAFE_componentWillReceiveProps` removed in React 19 before Phase 2 lands | Low | High | Phase 2 immediately replaces this with `getDerivedStateFromProps` or functional equivalent; React upgrade plan tracked separately | Platform lead | Open |
| R-07 | MUI version mismatch — `@rjsf/mui` tracks MUI 5; the PWA is on MUI 6 | Medium | Medium | ADR-0004 makes the call: build our own theme directly using MUI 6 primitives rather than depend on `@rjsf/mui` | Platform lead | Decided (see ADR-0004) |
| R-08 | Plugin authors hold deep imports into `form/components/*`, breaking on Phase 5 deletion | Medium | High | Codemod script; deprecated re-exports for one minor version; surface dev warnings; communication plan in release notes | Platform lead | Open |
| R-09 | Test coverage in Phase 1 misses forms used by specific tenants | Medium | Medium | Sample real form payloads from production telemetry to seed fixtures | Test driver | Open |
| R-10 | Async validation introduces race conditions when network is slow | Medium | Medium | AbortController integration; test with simulated network delays | Engine driver | Open |
| R-11 | RBAC permission resolution is per-render and slow on large forms | Low | Medium | Memoize per `(userId, fieldPath)`; perf test includes a permission-heavy form | Engine driver | Open |
| R-12 | i18n localizer adds latency on validate path | Low | Low | Translation calls cached per (locale, key); perf budget includes validator | Engine driver | Open |
| R-13 | Conditional rendering (`if`/`then`/`else`) re-renders too aggressively | Medium | Medium | Cache derived schema per `(schemaHash, formDataDigest)`; only walk the conditional subtree on relevant changes | Engine driver | Open |
| R-14 | Circular FQN resolution (component A's `ui:title.field` resolves to component B whose `ui:title.field` resolves back to A) | Low | Medium | Depth guard at 3 levels; structured error log; test case | Engine driver | Open |
| R-15 | Fixture corpus drifts from real-world forms; contract tests pass but production forms fail | Medium | High | Run a sampler in production (Phase 3) that records anonymized schema hashes; add new fixtures from any unrecognized hash | Test driver | Open |
| R-16 | A future rjsf v6+ breaks the adapter | Medium | Low | Pin `@rjsf/core` at v5 in package.json; track upstream changelog; revisit at v6 release. Adapter design abstracts upstream's surface | Platform lead | Open |
| R-17 | Bundle size growth pushes the PWA past acceptable initial-load budgets | Medium | Medium | `size-limit` gate in CI; budget enforced from Phase 2 | Platform lead | Open |
| R-18 | Storybook + axe-core CI flakiness blocks PRs and erodes team trust | Medium | Medium | Stable mode for Storybook test runner; isolate flaky stories; allow override with explicit lead approval | Test driver | Open |
| R-19 | `experimental_*` props in rjsf v5 (e.g., `experimental_customMergeAllOf`) get renamed/removed | Low | Medium | Wrap usage behind our own internal API; switch implementations on upgrade | Engine driver | Open |
| R-20 | Coexistence period drags out — some forms never get migrated | Medium | High | Phase 5 has a hard deletion deadline; tracking dashboard counts forms-on-fork vs forms-on-v5; weekly review | Platform lead | Open |

## Risk register hygiene

- New risks discovered during phases are added with their first observation date.
- Status transitions: `Open` → `Mitigated` → `Closed` (or `Realized` → `Resolved`).
- Each phase exit reviews all `Open` risks; any `Realized` requires a written incident report.
- Risks with `Likelihood: Low + Impact: Low` for two consecutive phase reviews are removed.

## Decision triggers (escalation)

| Trigger | Action |
|---|---|
| A migrated form regresses in production | Roll back via per-form `engine: 'fork'` opt-out within 1 hour. Root-cause analysis within 24 hours. Add fixture before un-rollback. |
| Contract test breaks during a routine PR | Block PR until parity restored or divergence approved (with new fixture/ADR explaining intentional drift). |
| Bundle size exceeds budget by >10 % | Block PR. Investigate. ADR for any approved exception. |
| Perf budget breached in CI | Block PR. Investigate. |
| `UNSAFE_componentWillReceiveProps` regression after Phase 2 | Block PR. |
| `ReactoryRegistry.resolveFqn` returning `null` for a previously-working FQN in production | Page on-call. Roll the form back. |
