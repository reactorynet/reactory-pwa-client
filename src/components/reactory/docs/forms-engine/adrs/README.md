# Architecture Decision Records — Forms Engine

ADRs document the decisions that shaped the modernization. Each one is a short, dated record: context → decision → consequences. Once accepted, an ADR is immutable; supersession is recorded by a new ADR that references the old one.

## Index

| # | Title | Status | Date |
|---|---|---|---|
| [0001](./ADR-0001-adopt-rjsf-v5.md) | Adopt rjsf v5 with a Reactory adapter, retire the fork | Proposed | 2026-04-25 |
| [0002](./ADR-0002-validator-ajv8.md) | Use `@rjsf/validator-ajv8` with a Reactory localizer | Proposed | 2026-04-25 |
| [0003](./ADR-0003-fqn-registry-adapter.md) | Implement FQN resolution as a registry adapter, not a custom field dispatcher | Proposed | 2026-04-25 |
| [0004](./ADR-0004-mui-theme.md) | Build our own MUI theme directly rather than depend on `@rjsf/mui` | Proposed | 2026-04-25 |
| [0005](./ADR-0005-test-strategy.md) | Test foundation precedes engine work; contract suite gates the migration | Proposed | 2026-04-25 |
| [0006](./ADR-0006-coexistence-strategy.md) | Coexistence via feature flag + per-form override; no big-bang cutover | Proposed | 2026-04-25 |
| [0007](./ADR-0007-conditional-rendering.md) | Implement `if`/`then`/`else` rendering ourselves; do not adopt `rjsf-conditionals` | Proposed | 2026-04-25 |

## Status definitions

- **Proposed** — drafted, under review.
- **Accepted** — agreed by the Reactory Platform team; binding.
- **Superseded** — replaced by a later ADR (with link).
- **Rejected** — explicitly chosen not to do; kept for the record so the reasoning isn't relitigated.
