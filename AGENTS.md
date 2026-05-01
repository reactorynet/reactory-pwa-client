# AGENTS.md — Reactory PWA Client conventions for AI agents

This file is read by Copilot CLI and similar AI agents at the start of each session. It encodes the project's hard rules and the design context that's currently in flight. Read it before doing anything else.

## What this project is

Reactory is a multi-tenant, plugin-based React PWA built on a "Convention over Configuration over Customization" philosophy. JSON Schema drives runtime forms; FQN-based component registration drives plugin extension; GraphQL is the primary data transport.

This file is the entry point for the **`reactory-pwa-client`** sub-repo. Sister repos (`reactory-core`, `reactory-express-server`, `reactory-data`, `reactory-native`) live alongside it under `~/Source/reactory/` and are independent git repositories.

## Read these first

Before changing any forms code, read at least:

- `src/components/reactory/docs/forms-engine/README.md` — index for the forms-engine modernization in progress.
- The specific design doc your task spec references (e.g., `06-reactory-extensions.md` for adapter work, `09-test-strategy.md` for tests).
- `CLAUDE.md` at the repo root for the broader Reactory context.

When the task is part of the forms-engine migration, the design doc is the source of truth. If a design doc and a task spec disagree, **stop and ask** rather than silently picking one.

## Hard rules

These are non-negotiable. Violating any of them blocks merge.

### Process

1. **Stay in scope.** Touch only files listed in the task brief. If you discover a related issue, note it in the session summary; do not fix it opportunistically.
2. **Do not refactor surrounding code.** A bug fix doesn't need cleanup. A new feature doesn't need a renamed neighbour.
3. **Do not add new top-level dependencies** without an ADR. Adding to a `devDependencies` is fine for test/storybook tooling.
4. **Do not modify the legacy fork at `src/components/reactory/form/`** unless the task explicitly asks. The fork is being retired; new work goes under `src/components/reactory/form-engine/`.
5. **Do not modify ADRs**. ADRs are immutable once accepted. Propose new ones via your task brief.
6. **Do not commit secrets, credentials, or `.env*`.**
7. **Do not skip git hooks** (`--no-verify`) under any circumstances.
8. **Do not push to remotes.** Commit locally; the human reviews and pushes.

### Code

9. **TypeScript strict.** No `any` in new code unless the surrounding interface forces it; prefer `unknown` + narrowing.
10. **No `console.log`** in production code. Use `reactory.log` (available via `useReactory()` or `formContext.reactory.log`).
11. **No emojis** in code, comments, commit messages, or generated files unless the task brief explicitly requests them.
12. **No new Markdown / README files** unless the task brief explicitly requests them.
13. **No comments that explain WHAT.** Only WHY. Most code should have no comments at all.
14. **Single concern per file.** Co-locate tests as `__tests__/X.test.ts` next to the file under test.
15. **React 17 idioms** until the React 18 upgrade lands (separate program). No `useTransition`, no `Suspense` for data, no `useId` (use `idSchema.$id` from rjsf instead).
16. **MUI 6** for new UI components. The 47+ existing widgets in `src/components/reactory/ux/mui/widgets/` are stable.

### Tests

17. **Run the relevant tests before reporting done.** Use `bin/test.sh reactory local` or `npx jest <pattern>`. If you cannot run them, say so explicitly.
18. **Run TypeScript** before reporting done: `npx tsc --noEmit`.
19. **Coverage targets** are listed in `docs/forms-engine/09-test-strategy.md`. New `form-engine/` code must meet them.
20. **Contract tests are gating** during the migration. If your change makes them fail, either fix it or document the intentional divergence with a fixture update + an explanation in the session summary.
21. **No mocks for the SDK** in unit tests beyond the shared `mockReactorySDK` helper at `src/components/reactory/form-engine/__tests__/utils/mockReactorySDK.ts`. Don't roll your own.

### Output

22. **Session summary required.** Run with `--share ./.copilot-sessions/<task-slug>.md`. Always.
23. **Summary structure:** "Files changed", "Why", "Tests run + outcome", "Open questions / followups".
24. **No claims of success without test evidence.** If `tsc` failed, say so. If a test was skipped, say so. The human reviews diffs and trusts the summary.

## Project-specific commands

```bash
# Install (only if package.json/lock changed)
yarn install

# Type check
npx tsc --noEmit

# Run all tests once
bin/test.sh reactory local

# Run a specific test file
npx jest path/to/test.tsx

# Watch mode (don't use in --autopilot)
npx jest --watch

# Coverage scoped to a path
npx jest --coverage --testPathPattern=form-engine

# Bundle analysis
bin/analyze.sh
```

**Do not run** `bin/start.sh` (dev server) inside an autopilot session. It blocks the terminal.

## File structure (relevant slices)

```
src/components/reactory/
├── form/                      # LEGACY fork (rjsf v4.2.0). Being retired.
├── form-engine/               # NEW adapter on rjsf v5. New work lives here.
│   ├── __tests__/             # Co-located unit + contract tests
│   │   ├── fixtures/          # Contract fixture corpus
│   │   └── utils/             # Shared test utils (mockReactorySDK, renderForm)
│   ├── registry/              # ReactoryRegistry, resolveFqn, widgetAdapter
│   ├── templates/             # 15 templates that honour Reactory ui:* extensions
│   ├── fields/                # ReactoryConditionalField, ReactoryGridField, etc.
│   ├── validator/             # createReactoryValidator + localizer
│   ├── context/               # ReactoryFormContextType + hook
│   ├── hooks/                 # useReactoryForm
│   └── index.ts               # public surface
├── ReactoryForm/              # Outer wrapper (loads definitions, wires data)
├── ux/mui/                    # 47+ MUI widgets and field/template overrides
└── docs/forms-engine/         # The migration design doc set (read this)
```

## In-flight migration context

The forms engine is being migrated from a fork of react-jsonschema-form v4.2.0 to upstream rjsf v5 with a Reactory adapter. The plan has 5 phases:

1. **Phase 1 — Test foundation.** Build the test net before any engine work.
2. **Phase 2 — Adapter layer.** Stand up `form-engine/` alongside the fork; feature-flagged off.
3. **Phase 3 — Migrate forms.** Flip flag, migrate forms one by one, RBAC + wizard land here.
4. **Phase 4 — Enterprise features.** Conditional rendering, computed fields, async validation, virtualization.
5. **Phase 5 — Cleanup.** Delete the fork, run codemods, update consumer apps.

Today's status: **start of Phase 1**.

If you're given a task that doesn't fit this phasing (e.g., asks you to start writing templates before Phase 2), **stop and confirm with the human**.

## Things that look wrong but aren't

- Both `.tsx` and `.jsx` files exist for many forms components. The `.tsx` is source; the `.jsx` is build output. **Edit `.tsx` only.**
- The fork's `SchemaForm.tsx` mutates `formContext` in render. We know. The adapter fixes this; do not patch the fork.
- `UNSAFE_componentWillReceiveProps` lives in `form/components/FormClass.tsx`. Removed in Phase 2.
- `package-lock.json` is gitignored; this project uses Yarn.
- `Reactory.Forms.ReactoryFormContext` is broader than its current usage; the adapter narrows it via `ReactoryFormContextType`.

## When in doubt

- Check `docs/forms-engine/14-glossary.md` for terminology.
- Cite file:line in your session summary.
- Ask. The human prefers a paused agent over a wrong commit.
