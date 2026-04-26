# 09 — Test Strategy

The form engine ships today with **zero tests in the form/ tree**. This is the largest single risk to any change. Phase 2 of the migration delivers the test net before any v5 code lands in render paths.

## Pyramid

```
            ┌─────────────────────┐
            │  Visual regression  │  Storybook + Chromatic/Playwright
            │  (Phase 2 + ongoing)│  ~1 story per field/widget/template
            ├─────────────────────┤
            │  E2E / scenario     │  Playwright against representative
            │  (Phase 3)          │  forms in the running PWA
            ├─────────────────────┤
            │  Integration        │  React Testing Library, real registry,
            │  (Phase 1+)         │  real validator, real templates
            ├─────────────────────┤
            │  Contract           │  Forks vs v5 engine: same schema +
            │  (Phase 1, blocking)│  formData → same render + same errors
            ├─────────────────────┤
            │  Unit               │  Pure functions: resolveFqn, validator,
            │  (Phase 1, blocking)│  templates, widget adapter
            └─────────────────────┘
```

## Coverage targets

| Layer | Statements | Branches | Functions |
|---|---|---|---|
| `form-engine/registry/` | ≥ 95 % | ≥ 90 % | 100 % |
| `form-engine/validator/` | ≥ 90 % | ≥ 85 % | 100 % |
| `form-engine/templates/` | ≥ 85 % | ≥ 80 % | 100 % |
| `form-engine/fields/` | ≥ 85 % | ≥ 80 % | 100 % |
| `form-engine/context/` | ≥ 90 % | ≥ 85 % | 100 % |
| `form-engine/hooks/` | ≥ 85 % | ≥ 80 % | 100 % |
| `ReactoryForm/*` (existing) | ≥ 70 % (uplift from current) | ≥ 65 % | ≥ 90 % |

CI rejects PRs that drop coverage below these thresholds.

## Unit tests

Every adapter export gets co-located `__tests__/X.test.ts`. The non-negotiable cases:

### `resolveFqn.test.ts` (≥30 cases)

- Plain registry hit (string key).
- Component reference passthrough.
- Dotted FQN — single namespace dot.
- Dotted FQN — multi-level (`material.ui.MyField`).
- FQN with `@version` suffix → strips version, logs warning.
- FQN with `$GLOBAL$` prefix → strips prefix.
- Missing FQN → returns null + emits `onMiss`.
- SDK throws → returns null + structured error log.
- Cycle: FQN that resolves to a component referencing the same FQN at render → depth guard.
- Memoization: same name asked twice → SDK called once.
- Cache invalidation: SDK reports `componentRegistered` event → cache cleared.

### `validator.test.ts`

- AJV 8 happy path (validates against draft-07 schema).
- Custom format registration.
- Custom keyword registration.
- Localizer: error code → translation key.
- `transformErrors` runs after localizer.
- `customValidate` adds errors via `errors.field.addError`.
- Async-flagged formats short-circuit synchronous validation.
- Schema with `$ref` chain depth 5.
- `if`/`then`/`else` validates correctly (validator side; rendering tested separately).
- Array `minItems`/`maxItems`/`uniqueItems`.

### `TitleFieldTemplate.test.tsx`

- `ui:title` string → renders text.
- `ui:title` `false` → renders nothing.
- `ui:title` object with `field` (FQN) → resolves and renders.
- `ui:title` object with `icon` only → default title + icon.
- Recursion guard: title-rendering component itself has `ui:title` of same FQN → caps at depth 3.

### `DescriptionFieldTemplate.test.tsx`

Symmetric to `TitleFieldTemplate.test.tsx` with `ui:description`.

### `FieldErrorTemplate.test.tsx`

- `ui:error` string → renders text.
- `ui:error` object with `field` → resolves, passes `errorSchema`.
- No `ui:error` → renders default error template.

### `FieldTemplate.test.tsx`

- `ui:hidden: true` → no render.
- `ui:hidden: (formData) => boolean` → re-evaluates on change.
- `ui:disabled: true` → input disabled, ARIA attrs set.
- `ui:readonly: true` → input readonly, ARIA attrs set.
- Required field → `aria-required`, `aria-describedby` to `-error` on validation fail.
- Help text → `aria-describedby` to `-help`.

### `widgetAdapter.test.tsx`

- Translates `value` ↔ `formData`.
- Translates `onChange(value)` correctly.
- Injects `reactory` from `formContext.reactory`.
- Wraps a class-component widget without breaking ref forwarding.

## Contract tests

The single most valuable test layer for a fork-vs-upstream migration.

**Location:** `form-engine/__tests__/contract/`

For each fixture in `fixtures/` (a corpus of `{schema, uiSchema, formData, expectedRender, expectedErrors}` triples), assert:

```ts
describe('contract: %s', (fixtureName) => {
  it('renders identically in fork and v5', () => {
    const forkOutput  = renderWithFork(fixture);
    const v5Output    = renderWithV5(fixture);
    expect(normalize(v5Output)).toEqual(normalize(forkOutput));
  });

  it('validates identically in fork and v5', () => {
    expect(validateWithV5(fixture)).toEqual(validateWithFork(fixture));
  });
});
```

`normalize()` strips DOM IDs, class names, and other engine-specific cosmetic differences.

**Initial fixture corpus (Phase 1):**

- Every step definition under `components/shared/WorkflowDesigner/components/Steps/*/definition.ts` (~25 fixtures).
- Every form definition under `components/reactory/formDefinitions/`.
- Two synthetic edge cases: deep nested object (10 levels), large array (500 items).

The contract suite stays green until the fork is deleted in Phase 4. Any test that diverges intentionally is annotated and logged in the [risk register](./12-risk-register.md).

## Integration tests

Render the full `<ReactoryForm>` (not just `<Form>` from rjsf) with a mock data manager and assert end-to-end behaviour:

- Form mounts → loads definition → renders fields.
- User edits a field → onChange emits → formData updates → validation runs.
- User submits valid form → data manager `onSubmit` called.
- User submits invalid form → first error focused, errors displayed.
- Async validation in flight → submit blocks → resolves → submit unblocks.
- FQN-registered widget appears in the form after registration event.

## E2E tests

Playwright scripts running against the dev server:

- Sign in as admin / non-admin → RBAC-gated field visibility differs.
- Workflow designer: drop a `ServiceInvoke` step, click property panel, verify form renders without `UnsupportedField`.
- Workflow designer: drop a `Telemetry` step, change `telemetryType`, verify the right config block appears.
- Multi-step wizard: navigate forward/back, verify per-step validation.
- Autosave: edit, close tab, reopen → draft restored.

## Visual regression

- Storybook stories per field/widget/template.
- Chromatic or Playwright snapshots run on PR.
- Stories cover: default, error, disabled, readonly, RTL, dark mode.
- Manual approval required for any pixel diff.

## Accessibility

- `axe-core` runs on every Storybook story (via `@storybook/test-runner`).
- CI fails on any **serious** or **critical** violation.
- Manual screen-reader smoke test (NVDA on Windows, VoiceOver on macOS) once per phase.

## Performance

- Jest perf test under `__tests__/perf/`:
  - Cold render of 300-field schema: assert ≤500 ms.
  - Incremental render after single-field change: assert ≤50 ms.
  - Validator throughput: 1000 validations of representative schema in ≤2 s.
- Bundle size: `npx size-limit` enforces budget per ADR.

## Test data management

- Fixtures in `form-engine/__tests__/fixtures/`.
- One `.json` per fixture for the schema/uiSchema, one `.json` for formData. Snapshot of expected output stored next to it.
- Fixtures are versioned with the engine. A breaking schema change requires a new fixture name, not a mutation of an existing one.

## What we don't test

- We don't snapshot DOM trees as a primary assertion. They're noisy and brittle. We assert specific elements/roles/text instead.
- We don't unit-test rjsf core itself. The contract suite is sufficient to catch upstream regressions.

## Test infrastructure setup

Phase 2 adds:

- `vitest` or stays with Jest (whichever the existing PWA test config uses; no migration as part of this work).
- `@testing-library/react` (already in tree).
- `axe-core` + `@axe-core/react`.
- `@playwright/test` for E2E (or stays with the existing Playwright setup).
- A `tests/forms/` shared utility module: `renderForm()`, `submit()`, `expectValidationError()`, `mockReactorySDK()`.
