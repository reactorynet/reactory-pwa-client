# 08 — Enterprise Capabilities

What we can ship on top of v5 + adapter to take Reactory forms beyond parity. Each item below is scoped, justified, and tied to a phase in [`11-migration-plan.md`](./11-migration-plan.md). Items marked **MUST** are scope; items marked **SHOULD** are recommended; items marked **MAY** are stretch.

## 1. Conditional rendering — `if`/`then`/`else` (MUST)

**Problem today:** the `Telemetry` step's `allOf`/`if`/`then` block doesn't render. Authors work around it by lifting all conditional fields into the base schema.

**Solution:** `ReactoryConditionalField` (spec in [`06-reactory-extensions.md#10`](./06-reactory-extensions.md)) auto-activates when a schema has `if`/`then`/`else`. Re-evaluates on every formData change. Cached per (schema, formData) hash to avoid validation thrash.

**Why not [`rjsf-conditionals`](https://github.com/mvi-health/rjsf-conditionals)?** It's a separate dependency with its own DSL. JSON Schema authors already have draft-07 conditionals; adopting the third-party library forces authors to learn a second syntax. The implementation cost is low (~2–4 days; see effort estimates in [`11-migration-plan.md`](./11-migration-plan.md)) and we keep the schema as the single source of truth.

**Acceptance:** the existing Telemetry definition renders the right config block when `telemetryType` changes, with no schema change.

## 2. Computed fields — formula-driven values (SHOULD)

**Problem:** today, a "total" field that derives from line items requires a custom widget with a useEffect. Each form re-implements this.

**Solution:** ui:option `compute` accepting either:

- a string formula evaluated with [JSONata](https://jsonata.org) against `formData`, or
- a function `({ formData, formContext }) => value`.

```yaml
total:
  type: number
ui:options:
  compute: "$sum(items.price)"
  computeOn: ['items']      # re-run when these paths change
  readOnly: true
```

The engine recomputes during `onChange`, sets the value into formData, and triggers a single re-render. JSONata is sandboxed and pure; no eval.

**Phase:** Phase 4. Behind a `forms.computedFields` flag.

## 3. Async / server-side validation (SHOULD)

**Problem:** today, "username available?" or "tenant slug unique?" requires custom widgets with debounced API calls. No integration with the form's error state — submit succeeds while a stale uniqueness check is in flight.

**Solution:**

- `customAsyncValidate(formData, errors, { signal }) => Promise<errors>`
- Debounced per-field (200 ms default, configurable).
- Integrated with rjsf `extraErrors`. If `extraErrorsBlockSubmit` is set, async errors block submit.
- AbortController integration: any in-flight request is aborted on a newer change.

**Phase:** Phase 4.

## 4. Permission-aware fields (RBAC) (MUST)

**Problem:** today, hiding a field for a non-admin requires the form definition to be conditionally generated server-side. Plugins that consume the schema can't reason about visibility.

**Solution:** `ui:permission` option with the existing Reactory RBAC engine:

```yaml
salaryBand:
  type: string
ui:options:
  permission:
    read: ['admin', 'hr.lead']
    write: ['admin']
    redact: 'mask'   # 'mask' | 'omit' | 'placeholder'
```

The adapter resolves at render time via `reactory.permissions.check(...)`. `read=false` → field hidden. `write=false` → field readonly. `redact='mask'` shows `***` in place of value.

**Acceptance:** a single form definition renders differently for admin and non-admin users without server-side schema rewrites.

**Phase:** Phase 3.

## 5. Autosave with conflict resolution (SHOULD)

**Problem:** long forms (CRM record, KYC application) lose data on tab close. There's no guidance for how to autosave today; teams write their own debounced effect.

**Solution:**

- Built-in autosave hook: `formContext.autosave({ interval, on: 'change' | 'blur' | 'idle', persist: 'local' | 'graphql' })`.
- Conflict detection via `If-Match` ETag (when GraphQL data manager supports it) — if the server has a newer version, prompt the user with a 3-way merge dialog.
- Local fallback: IndexedDB via `idb-keyval`, keyed by `formInstanceId`. Reload restores draft.

**Phase:** Phase 5.

## 6. Wizard / multi-step forms (MUST)

**Problem:** today's `MaterialTabbedField` / `MaterialSteppedField` is implemented as a custom field that wraps the schema's top-level object. Validation is per-tab and inconsistent.

**Solution:** First-class `ui:field: 'WizardField'` that:

- Reads `ui:options.steps: [{ title, fields: [...], validate?: 'on-next' | 'on-final' }]`.
- Emits `wizard.step.enter` / `wizard.step.exit` telemetry events.
- Supports `Back` / `Next` / `Save and finish later`.
- Validates only the active step by default; final submit re-validates the whole form.

**Phase:** Phase 3.

## 7. Virtualized arrays (SHOULD)

**Problem:** a 500-row array of items today re-renders all rows on each change. Single-character typing in row 3 stalls the UI.

**Solution:** Wrap `ArrayFieldTemplate` with a virtualization layer using [`@tanstack/react-virtual`](https://tanstack.com/virtual). Triggered when `items.length > 50` or by `ui:options.virtualize: true`.

**Acceptance:** 5 000-item array, single-row edit triggers ≤50 ms re-render.

**Phase:** Phase 4.

## 8. WCAG 2.1 AA compliance (MUST)

**Problem:** the fork's templates emit only `<label htmlFor>`. No `aria-describedby`, `aria-invalid`, `aria-required`. Some custom widgets ship without focus management.

**Solution:**

- Audit and remediate every default template: `aria-required`, `aria-invalid`, `aria-describedby` to `${id}-help` and `${id}-error`.
- Tab-order test in CI for each Storybook story.
- `axe-core` runs on every form story; CI fails on any new violation.
- Focus management: `focusOnFirstError` works for all themes; `Esc` cancels modal forms; `Enter` submits in single-line text fields.

**Phase:** Phase 2 (foundational) + ongoing in every later phase.

## 9. Internationalization (MUST)

**Problem:** error messages are pure English from AJV. Field labels rely on schema-author-provided strings.

**Solution:**

- Validator localizer routes ajv-i18n messages through `reactory.i18n.t(key, defaultValue)`. Translation keys are stable codes (`reactory.validation.required`, `reactory.validation.format.email`, …).
- Built-in template strings (button labels, "Add item", "Remove", "Loading…") are routed through `reactory.i18n` with namespaced keys.
- A `messages.en.json` shipped alongside the engine documents every key.
- Locale detection from `reactory.i18n.locale`.

**Phase:** Phase 2 (validator localizer) + Phase 3 (template strings).

## 10. Performance budgets and observability (MUST)

**Solution:**

- `form.mount` / `form.validate` / `form.change` events emit `durationMs`.
- A perf test in CI renders a 300-field representative schema and asserts cold render ≤500 ms, incremental ≤50 ms.
- Bundle size guard: `form-engine/` cannot grow by more than 10 % per major version without an ADR.
- React Profiler integration in dev: `?profileForms=1` query param mounts the Profiler around `<Form>` and logs slow commits.

**Phase:** Phase 2 (events + budget gate), Phase 4 (profile/diagnostic tooling).

## 11. Storybook + visual regression (MUST)

**Problem:** no current way to spot when a widget regression breaks a form.

**Solution:**

- Every default field/widget/template gets a Storybook story.
- Chromatic or Playwright + `@playwright/test` snapshot diffs run on PR.
- Story per: success render, error render, hidden state, readOnly state, RTL, dark mode.

**Phase:** Phase 2 + ongoing.

## 12. Form analytics (SHOULD)

Lightweight telemetry layer on top of the lifecycle events:

- Field-level edit counts (anonymized).
- Time-to-first-edit, time-to-submit.
- Submit error rates by error code.

Integrated with the existing reporting service. Off by default; opt-in per form via `formDef.options.analytics: true`.

**Phase:** Phase 5.

## 13. Schema-driven export (MAY)

Generate PDF / CSV / JSON-LD from a completed form using the schema as the rendering grammar. Uses the existing `reactory-pdf-manager` and `reactory-excel` modules.

**Phase:** Phase 5 (stretch).

## 14. Live collaboration hooks (MAY)

Expose a `formContext.collaboration` slot for a future CRDT-backed multi-user form editor. The engine itself does not implement collaboration; it just exposes the seams.

**Phase:** Out of scope; tracked for future planning.

## 15. Devtools — form inspector (SHOULD)

A debug panel toggleable with `Ctrl+Shift+F` in dev mode showing:

- Current `formData`
- Current `errorSchema`
- Resolved `formContext` (sensitive keys hashed)
- Telemetry events stream
- Schema and uiSchema, with diff vs source

**Phase:** Phase 4.

## 16. Form preview / playground (MAY)

A dedicated route (`/dev/forms/playground`) where developers can paste a schema + uiSchema and see it render with the v5 engine. Useful for plugin authors. Implementation is a thin wrapper over `useReactoryForm` with editable text panes.

**Phase:** Phase 5.

## Trade-off table (what we're choosing **not** to do)

| Considered | Why not | Revisit when |
|---|---|---|
| Adopt `rjsf-conditionals` library | Adds a second conditional DSL alongside JSON Schema. | Never, unless our renderer hits scaling limits. |
| Replace MUI 6 widgets with `@rjsf/mui` defaults | Loses the 47-widget catalogue and the chart/data widgets. | Never. |
| Replace AJV 8 with `zod` / `yup` / `valibot` | Forms rely on JSON Schema as the source of truth. AJV remains the spec implementation. | If JSON Schema 2020-12 support in AJV 8 stalls. |
| Build our own form library | The cost is enormous and we don't need to. | Never. |
| Server-side rendering | Not a current Reactory requirement. | If a future `reactory-next` adopts SSR. |
