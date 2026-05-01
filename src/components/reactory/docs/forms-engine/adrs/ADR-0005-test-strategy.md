# ADR-0005 — Test foundation precedes engine work; contract suite gates the migration

**Status:** Proposed
**Date:** 2026-04-25

## Context

The `form/` tree of the fork has **zero tests**. Any refactor without a test net is reckless: silent behavior changes are exactly what break production forms in Reactory's multi-tenant deployments.

Three options:

1. **Refactor first, test later.** Standard fast-track approach. High risk; regressions surface in production. Rejected.
2. **Refactor and test in parallel.** Tests added next to changes. Fast but doesn't catch *changes that the author didn't realize were changes*. Rejected.
3. **Test first, refactor under the test net (this ADR).** Phase 1 builds a fixture corpus and contract test harness against the existing fork. Phase 2+ work is gated on the contract suite remaining green.

## Decision

Phase 1 of the migration is dedicated to the test foundation. No engine code changes during Phase 1. The deliverables:

- A fixture corpus covering every step definition, every form definition, plus synthetic edge cases.
- A contract test harness that runs each fixture through both the fork and (eventually) the v5 engine, normalizes the output, and asserts equivalence.
- React Testing Library + axe-core + Storybook test runner setup.
- Coverage baseline reports.

Phase 2 onwards: **every PR that touches `form-engine/` or `form/` must keep the contract suite green** unless the divergence is documented in a new fixture and an ADR explains why the divergence is intentional.

## Consequences

**Positive**

- Migration confidence: when v5 renders a fixture identically to the fork, we know that form will work post-migration.
- Regressions caught in CI, not in production.
- The fixture corpus becomes a living spec — the closest thing the fork has ever had to documentation.

**Negative**

- Phase 1 produces no user-visible change. Stakeholders may push for engine work to start sooner; the platform lead must hold the line.
- Two weeks of engineer time before any engine code is written.

**Neutral**

- The contract suite stays useful even after the fork is deleted: it locks the v5 adapter against accidental drift.

## See also

- [`09-test-strategy.md`](../09-test-strategy.md)
- [`11-migration-plan.md#phase-1--test-foundation-2-weeks`](../11-migration-plan.md#phase-1--test-foundation-2-weeks)
