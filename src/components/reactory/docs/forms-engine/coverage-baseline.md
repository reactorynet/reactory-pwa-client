# Coverage Baseline — End of Phase 1

> Captured: 2026-04-26
> Branch: `feature/forms-engine-modernization`
> Commit: `878216d4` (post batch-2 fixtures)

The numbers in this document are the **starting line** for the migration.
Every subsequent phase exits with an updated baseline appended below; the
trend line is the success metric.

## Methodology

```bash
npx jest --coverage --silent \
  --testPathPattern="(form|ReactoryForm|form-engine)" \
  --collectCoverageFrom="src/components/reactory/form/**/*.{ts,tsx}" \
  --collectCoverageFrom="src/components/reactory/form-engine/**/*.{ts,tsx}" \
  --collectCoverageFrom="!src/components/reactory/**/__tests__/**" \
  --collectCoverageFrom="!src/components/reactory/form-engine/testing/**" \
  --coverageReporters=json-summary --coverageReporters=text-summary
```

Coverage is computed only on the legacy fork (`form/`) and the new adapter
directory (`form-engine/`). Test infrastructure under `__tests__/` and
`testing/` is excluded — those are not "production" code paths.

## Phase 1 baseline numbers

| Bucket | Files | Statements | Branches | Functions | Lines |
|---|---|---|---|---|---|
| `src/components/reactory/form/` (legacy fork) | 21 | **0.00 %** (0 / 1173) | **0.00 %** (0 / 790) | **0.00 %** (0 / 193) | **0.00 %** (0 / 1141) |
| `src/components/reactory/form-engine/` (new) | 0 | n/a | n/a | n/a | n/a |

Why `form-engine/` reports zero files: the only code in `form-engine/` today
is the test harness (`testing/contractHarness.ts`, `testing/mockReactorySDK.ts`)
which is excluded from production-coverage scoping. No adapter modules have
been written yet — that's Phase 2's job.

## Test totals at end of Phase 1

| Layer | Suites | Tests | Status |
|---|---|---|---|
| `form-engine/` (new) | 3 | 47 | **all passing** |
| `ReactoryForm/hooks/__tests__/useContext` (existing) | 1 | 8 | **passing** |
| Pre-existing rest of repo | — | — | not all green; see "Pre-existing failures" |

### form-engine/ test breakdown

| Suite | Tests |
|---|---|
| `__tests__/sentinel.test.ts` | 2 |
| `__tests__/utils/mockReactorySDK.test.ts` | 27 |
| `__tests__/utils/contractHarness.test.ts` | 18 |

### Pre-existing failures (unrelated to this migration)

A full repo run revealed 8 failed test suites and 28 failed tests **before**
any forms-engine work landed. These are out of scope for this migration but
recorded here for honesty:

- `src/components/shared/FormEditor/FormEditor.test.tsx` — preview-mode
  assertions failing (`getByText('Form Preview Status')` not found). Cause:
  upstream FormEditor refactor; not migration-related.
- `src/components/reactory/ReactoryForm/__tests__/mockReactory.ts` — Jest
  treats this helper as a test file because of the project's `testMatch`
  pattern. "Test suite must contain at least one test." Cosmetic; we worked
  around the same constraint by placing our own helper under
  `form-engine/testing/` rather than `__tests__/`.
- Phase 3/4 experimental tests under `ReactoryForm/phase3/` and `phase4/` —
  some of these were written as forward-looking specs and never wired up.

A separate `npx jest --silent` (no scope) ran out of heap on this dev
machine, so a full-repo total isn't recorded. We can fix that when needed
by scoping CI runs to subtrees.

## What this means for the migration

The fork has **zero test coverage today**. Every line of fork behaviour is
implicit — defined only by what production users see. The contract suite
in [`09-test-strategy.md`](./09-test-strategy.md) is the way we lock that
down before Phase 2 starts changing render paths.

The contract fixture corpus (27 fixtures, all parsing) is the lever:
when the v5 engine ships in Phase 2, every fixture renders through both
engines; equivalence is asserted; divergences either get fixed or get a
documented `divergences` annotation on the fixture.

## Targets

Per [`09-test-strategy.md`](./09-test-strategy.md):

| Bucket | Target Statements | Target Branches | Target Functions |
|---|---|---|---|
| `form-engine/registry/` | ≥ 95 % | ≥ 90 % | 100 % |
| `form-engine/validator/` | ≥ 90 % | ≥ 85 % | 100 % |
| `form-engine/templates/` | ≥ 85 % | ≥ 80 % | 100 % |
| `form-engine/fields/` | ≥ 85 % | ≥ 80 % | 100 % |
| `form-engine/context/` | ≥ 90 % | ≥ 85 % | 100 % |
| `form-engine/hooks/` | ≥ 85 % | ≥ 80 % | 100 % |
| `ReactoryForm/*` (existing) | ≥ 70 % (uplift from current) | ≥ 65 % | ≥ 90 % |

These are CI-enforced thresholds starting at the end of Phase 2.

## Trend (appended each phase)

| Phase | Date | form/ stmt | form-engine/ stmt | Tests | Notes |
|---|---|---|---|---|---|
| 1 — test foundation | 2026-04-26 | 0 % | n/a | 47 | corpus + harness landed; no adapter code yet |
| 2 — adapter layer | 2026-04-26 | 0 % | high (every adapter file under registry/, validator/, templates/, hooks/, widgets/ has co-located tests covering every public export) | 377 | rjsf v5.24.13 pinned; 13 commits; phase-2-closeout.md trail; tsc clean |
| 3 — migration | 2026-04-27 | 0 % | high (added integration/, fields/, permissions/, types module-augmentation; first form migrated; recipe doc) | 425 | 6 commits; first form on v5; phase-3-closeout.md trail; tsc clean |
| 4 — features | — | — | — | — | |
| 5 — cleanup | — | — | — | — | fork deleted; this row reports `form-engine/` only |
