# 15 — Execution Strategy: Claude + Copilot CLI

How we deliver the migration without burning the monthly Anthropic token budget. Claude (Opus 4.7, in this conversation) orchestrates and owns judgment-heavy work. The GitHub **Copilot CLI** (Opus 4.6) is delegated bulk, well-specced work on a separate token economy. Together they cover the migration's ~16-week scope.

## Tooling

| Tool | Model | Token economy | Best at |
|---|---|---|---|
| Claude (this session) | Opus 4.7, 1M context | Anthropic monthly budget | Architecture, debugging, integration, judgment calls, code review |
| Copilot CLI | Opus 4.6 (also Sonnet 4.6, Haiku 4.5) | GitHub Copilot subscription | Mechanical scaffolding, mass file generation, codemods, transcription, well-specced from this doc set |

**Verified working:** `copilot -p "..." --model claude-opus-4.6 --allow-all-tools --silent --stream off` returns clean output for scripting.

## Division of labor

### Claude owns

- Phase gating decisions; reading and merging PRs.
- Architecture changes outside what's specced here (any new ADR).
- The high-stakes core of the adapter:
  - `resolveFqn` and `ReactoryRegistry` (small surface, high blast radius).
  - `ReactoryValidator` localizer integration (correctness-critical).
  - `useReactoryForm` engine selection logic (correctness-critical).
- Cross-cutting refactors that span >5 files in non-mechanical ways.
- Debugging any failure from a Copilot run.
- Security review on every new adapter export.
- Performance tuning when budgets are breached.
- ADR drafting for decisions emerging during execution.

### Copilot CLI owns

Bulk, well-specced from existing docs. Each task below maps to a section of the design doc set.

| Phase | Task | Spec lives in | Estimated Copilot prompts |
|---|---|---|---|
| 1 | Generate fixture corpus from step definitions and form definitions | [`09-test-strategy.md#test-data-management`](./09-test-strategy.md#test-data-management) | ~5 batches of 5 fixtures |
| 1 | Scaffold contract test harness | [`09-test-strategy.md#contract-tests`](./09-test-strategy.md#contract-tests) | 1 |
| 1 | Storybook stories for existing fork fields/widgets (baseline) | [`09-test-strategy.md#visual-regression`](./09-test-strategy.md#visual-regression) | ~10 batches |
| 2 | Scaffold 15 v5 templates | [`06-reactory-extensions.md#3-object-form`](./06-reactory-extensions.md#3-object-form-uititle--uidescription--uierror) onward | ~5 (3 templates per prompt) |
| 2 | Unit tests for each template (≥10 cases each) | [`09-test-strategy.md#unit-tests`](./09-test-strategy.md#unit-tests) | ~5 |
| 2 | Wrap 47 MUI widgets with `adaptWidget` | [`05-migration-mapping.md#widgets`](./05-migration-mapping.md#widgets) | ~10 (5 widgets per prompt) |
| 2 | i18n key dictionary (`messages.en.json` + translator notes) | [`10-non-functional.md#internationalization`](./10-non-functional.md#internationalization) | 1 |
| 2 | Storybook stories for each new template (5 states each) | [`08-enterprise-capabilities.md#11`](./08-enterprise-capabilities.md#11-storybook--visual-regression-must) | ~5 |
| 3 | Migrate forms 1-by-1 (set `options.engine: 'v5'`, add fixture, smoke-test) | [`13-rollback-and-coexistence.md#migration-rollout-order`](./13-rollback-and-coexistence.md#migration-rollout-order) | ~25 (1 per form) |
| 3 | RBAC `ui:permission` plumbing | [`08-enterprise-capabilities.md#4`](./08-enterprise-capabilities.md#4-permission-aware-fields-rbac-must) | 1 |
| 4 | Computed-fields JSONata integration + tests | [`08-enterprise-capabilities.md#2`](./08-enterprise-capabilities.md#2-computed-fields--formula-driven-values-should) | 2 |
| 4 | Async validation hook + tests | [`08-enterprise-capabilities.md#3`](./08-enterprise-capabilities.md#3-asynchronous--server-side-validation-should) | 2 |
| 4 | Virtualization wrapper for `ArrayFieldTemplate` | [`08-enterprise-capabilities.md#7`](./08-enterprise-capabilities.md#7-virtualized-arrays-should) | 1 |
| 4 | Devtools form inspector | [`08-enterprise-capabilities.md#15`](./08-enterprise-capabilities.md#15-devtools--form-inspector-should) | 2 |
| 5 | Codemod (AST rewriter for deprecated imports) | [`05-migration-mapping.md#deprecated-paths`](./05-migration-mapping.md#deprecated-paths) | 1 |
| 5 | Migration recipes under `docs/forms-engine/recipes/` | [`07-public-api.md#migration-support`](./07-public-api.md#migration-support) | ~5 |
| Cross-phase | TSDoc passes on every public export | [`10-non-functional.md#documentation`](./10-non-functional.md#documentation) | 2 |

### Hybrid (Claude designs, Copilot executes, Claude reviews)

| Task | Why hybrid |
|---|---|
| `ReactoryConditionalField` algorithm | Claude designs cycle detection + caching; Copilot writes impl + tests; Claude reviews. |
| `widgetAdapter` exact shape | Claude designs the rjsf-prop ↔ Reactory-prop translation; Copilot wraps the 47 widgets; Claude spot-checks 3. |
| Phase 3 per-form migration | Claude reviews the first 3 forms migrated; once the recipe stabilizes, Copilot drives the next 22. |
| Storybook visual baseline | Claude approves design intent on the first template; Copilot generates the rest. |

## How we run Copilot

### Standard prompt template

```bash
copilot -p "$(cat <<'EOF'
You are working in the Reactory PWA repo at /Users/wweber/Source/reactory/reactory-pwa-client.

DESIGN SPEC: docs/forms-engine/06-reactory-extensions.md  (read first; this is the source of truth)
TASK: <one specific deliverable, see below>

Constraints:
- Single concern per file. Co-locate __tests__/.
- Do not modify files outside the listed paths.
- Use existing project conventions (TS strict, React 17, MUI 6, Jest, RTL).
- Run `npx tsc --noEmit` and `npx jest <relevant pattern>` before reporting done.
- Output: list every file touched + a one-line rationale per file.

Success criteria:
- <copy verbatim from the relevant doc section>

DO NOT:
- Refactor surrounding code.
- Add new dependencies without an ADR.
- Modify the legacy fork code under components/reactory/form/ except where explicitly required.

When done, write the session summary to copilot-session-<task-slug>.md via --share.
EOF
)" \
  --model claude-opus-4.6 \
  --allow-all-tools \
  --add-dir /Users/wweber/Source/reactory/reactory-pwa-client \
  --autopilot \
  --share "./.copilot-sessions/<task-slug>.md" \
  --silent \
  --stream off
```

### Parallel runs

Independent tasks run in parallel terminals. Phase 2 example:

```bash
# Terminal A — templates
copilot -p "..." --share ./.copilot-sessions/phase2-templates.md ...

# Terminal B — widget adapter wrapping (different files)
copilot -p "..." --share ./.copilot-sessions/phase2-widget-adapter.md ...

# Terminal C — i18n key dictionary
copilot -p "..." --share ./.copilot-sessions/phase2-i18n.md ...
```

Claude reviews the three session summaries in this conversation, asks for fixes only where reviewable issues exist, and commits.

### Session continuity

For multi-step Copilot tasks, use `--resume <session-id>` so we don't burn re-context on each turn.

## Token-saving tactics for this conversation

These keep Claude's session lean so we can stretch the remaining 60 % of the monthly budget across the migration:

1. **Claude reads diffs, not files.** After Copilot lands a change, Claude reviews via `git diff` — the diff is a fraction of the full file content.
2. **Copilot summary files** (`--share`). Claude reads only the summary section, not the per-tool-call transcript.
3. **One Copilot prompt = one PR** (where reasonable). Reviewable surface is bounded; failures are isolated.
4. **Sample-based review.** When Copilot generates 10 similar things, Claude reviews 2; if they pass, the rest are presumed sound, picked up by tests.
5. **Defer to the doc set.** Copilot reads from `docs/forms-engine/`; Claude does not re-explain specs in prompts.
6. **No interactive ping-pong.** Copilot runs `--autopilot` to completion; Claude does not interject mid-run.
7. **Test failures > human review** for mechanical work. The contract suite catches what Claude would otherwise eyeball.
8. **Background long-running tasks.** Copilot generates corpus / runs tsc / runs Jest in the background; Claude continues planning the next phase.
9. **Compact tool results.** When Claude does need to run something itself, it's via tools that summarize (e.g., `git diff --stat` not `git diff`).
10. **One commit per logical unit.** Smaller commits = easier reverts = less re-work.

## Risk-adjusted division — what NOT to delegate

Even at the cost of more Anthropic tokens, Claude does these directly:

- **Anything that touches `useReactoryForm` engine selection** (the coexistence kill switch).
- **Validator localizer** — wrong message keys break i18n silently.
- **`resolveFqn`** — silent miss returns `null`, which renders `UnsupportedField`. Subtle to test, painful to debug if wrong.
- **First 3 forms migrated in Phase 3** — establish the pattern; everything after is template.
- **ADR drafts** — record-keeping requires the same head that argues the decision.
- **Production rollback procedures** — runbook prose owned by Claude.
- **Security review of any new public export.**

## Acceptance for the strategy

Strategy is "ready" when **all** of these hold:

- Copilot CLI smoke test passes (`copilot -p "READY"` returns READY) — ✅ verified.
- Copilot can edit and commit in `reactory-pwa-client` (will verify in Phase 1 first task).
- The user has confirmed the budget split (Anthropic budget for Claude orchestration; Copilot subscription for bulk).
- A `.copilot-sessions/` folder exists at the repo root for session summaries (created lazily on first run; ignored from git via `.gitignore`).
- An AGENTS.md exists at the repo root with project-level guardrails Copilot should respect (we'll create this in the first Phase 1 task).

## What changes in the migration plan

[`11-migration-plan.md`](./11-migration-plan.md) keeps its phase structure unchanged. Estimates assumed one Reactory engineer; with Copilot doing the bulk, expected calendar reduction:

| Phase | Solo estimate | With Copilot | Confidence |
|---|---|---|---|
| 0 | 0.5 weeks | 0.5 weeks | high (already done) |
| 1 | 2 weeks | 1 week | medium |
| 2 | 4 weeks | 2.5 weeks | medium-low (template authoring is the variable) |
| 3 | 4 weeks | 2.5 weeks | medium |
| 4 | 4 weeks | 3 weeks | medium |
| 5 | 2 weeks | 1.5 weeks | high |
| **Total** | **16.5 weeks** | **~11 weeks** | aggregate medium |

We do not commit to the compressed timeline yet; we'll re-baseline at the end of Phase 1 once we have data on Copilot's review-rejection rate.

## Operational checklist

Before kicking off Phase 1:

- [x] `feature/forms-engine-modernization` branch live
- [x] Design docs landed
- [x] Copilot CLI authenticated, Opus 4.6 access verified
- [ ] `.gitignore` adds `.copilot-sessions/` (Phase 1 first task)
- [ ] `AGENTS.md` at repo root with Reactory project conventions (Phase 1 first task)
- [ ] User approval on the budget split
- [ ] Engine driver, test driver, platform lead identified per [`11-migration-plan.md#ownership`](./11-migration-plan.md#ownership)
