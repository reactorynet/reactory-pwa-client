# ADR-0008 — Pin to rjsf v5.24.13 while the PWA is on React 17

**Status:** Accepted
**Date:** 2026-04-26
**Supersedes:** none
**Refines:** [ADR-0001](./ADR-0001-adopt-rjsf-v5.md)

## Context

ADR-0001 (April 2026) chose rjsf **v5** as the migration target. By the time we reached Phase 2, the upstream landscape had shifted:

- **rjsf v6.0.0 went GA 2025-10-31** and is now `dist-tag: latest` on npm. As of 2026-04-18 it's at v6.5.1.
- **v6 hard-requires React ≥ 18.** Its `peerDependencies.react` is `>=18`, vs v5's `^16.14.0 || >=17`.
- **The PWA pins React 17.0.2.** Per AGENTS.md and `10-non-functional.md` COMPAT-01, the React 18 upgrade is a separate roadmap program.

So the choice is:

1. Pin to the latest v5 (5.24.13, published 2025-08-22).
2. Adopt v6 now and force the React 18 upgrade as a blocker.
3. Wait for the React 18 upgrade and adopt v6 then.

Option 2 conflates two large programs and slips both. Option 3 leaves the form engine on the legacy fork indefinitely. Option 1 ships the migration on a maintained-but-superseded version.

## Decision

**Pin to `@rjsf/core@5.24.13` + `@rjsf/utils@5.24.13` + `@rjsf/validator-ajv8@5.24.13`.** Versions co-released; pin all three to the same minor.

When the React 18 upgrade lands as a separate program, evaluate v5→v6 in a follow-up ADR.

## Consequences

**Positive**

- No coupling to the React 18 upgrade. Phase 2 can ship without coordinating two programs.
- v5 is the LTS branch with active maintenance (latest patch 5.24.13 was 2.5 months before v6.0.0 GA, and v5.x still receives backports).
- Adapter design we already documented ([04-rjsf-v5-reference.md](../04-rjsf-v5-reference.md), [06-reactory-extensions.md](../06-reactory-extensions.md)) targets v5 APIs verbatim. No re-design.
- v5 ships `ADDITIONAL_PROPERTY_FLAG` from `@rjsf/utils` with the **exact constant name** our fork uses, so the deprecation re-export from `form-engine/index.ts` (per [05-migration-mapping.md](../05-migration-mapping.md)) lines up cleanly.

**Negative**

- We're on a permanently-stale major. Any v6-only features (perf improvements, JSON Schema 2020-12 polish, new templates) are not available until the React 18 program completes.
- The "future rjsf upgrades land as dependency bumps" benefit from ADR-0001 is partial — minor bumps within v5.24.x land freely; v5→v6 needs the React 18 unblock.
- Risk R-16 (rjsf v6+ breaks adapter) is now **realized** — but the impact is bounded by the version pin.

## Implementation

```bash
yarn add @rjsf/core@5.24.13 @rjsf/utils@5.24.13 @rjsf/validator-ajv8@5.24.13
```

Lockfile must record the **exact** 5.24.13. CI rejects PRs that bump these packages without an ADR.

The legacy v4 deps in package.json (`@rjsf/core@^4.2.0`, `@rjsf/material-ui@^4.2.0`) stay alongside during coexistence; they are imported by **one file** (`src/api/graphql/graph/queries/ApiStatus/index.ts:1`, an unused `Theme` type import — removal tracked as a Phase 5 cleanup).

## Reassessment trigger

Open a follow-up ADR when **any** of the following holds:

- The React 18 upgrade program is scheduled to land within the next quarter.
- A v6-only rjsf feature becomes a hard requirement (none today; tracked at risk register R-16).
- v5 enters extended-support / no-active-maintenance status (currently still receiving patches).

## See also

- [ADR-0001 — Adopt rjsf v5 with a Reactory adapter](./ADR-0001-adopt-rjsf-v5.md)
- [Risk R-16 — rjsf v6+ breaks adapter](../12-risk-register.md)
- COMPAT-01 in [10-non-functional.md](../10-non-functional.md)
