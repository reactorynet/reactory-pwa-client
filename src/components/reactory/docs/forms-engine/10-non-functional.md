# 10 — Non-functional Requirements

The qualities the engine must hold beyond rendering correct UIs from schemas.

## Accessibility

**Standard:** WCAG 2.1 AA across every default field, widget, and template.

**Requirements:**

| ID | Requirement |
|---|---|
| A11Y-01 | Every input has a programmatically associated `<label>` (either `for`/`id` or wrapping). |
| A11Y-02 | Required fields emit `aria-required="true"`. |
| A11Y-03 | Invalid fields emit `aria-invalid="true"` and `aria-describedby` pointing to `${id}-error`. |
| A11Y-04 | Help text container has `id="${id}-help"` and is referenced by `aria-describedby`. |
| A11Y-05 | Disabled fields emit `aria-disabled="true"` (in addition to the HTML `disabled` attribute). |
| A11Y-06 | Hidden fields (`ui:hidden`) are removed from the accessibility tree (not just `display: none` on visible elements). |
| A11Y-07 | Submit-time errors: `focusOnFirstError` actually focuses the first error and announces it (via `role="alert"` on the error list). |
| A11Y-08 | Wizard / multi-step forms announce step transitions with `role="status"` live regions. |
| A11Y-09 | Color is never the sole indicator of error state (icon + text + ARIA, not just red border). |
| A11Y-10 | All interactive elements reachable by Tab in DOM order; no `tabindex > 0`. |

**Verification:**

- `axe-core` automated checks on every Storybook story (CI gate).
- Manual screen-reader pass once per phase (NVDA + VoiceOver).
- Keyboard-only interaction test in E2E (no mouse events) for at least 3 representative forms.

## Internationalization

**Languages currently in `reactory-data/i18n/`:** `en`, `en-US`, `af`. The engine must not assume English.

**Requirements:**

| ID | Requirement |
|---|---|
| I18N-01 | Every built-in template string (button labels, "Add item", "Loading…", "No items") is keyed and routed through `reactory.i18n.t`. |
| I18N-02 | Validation errors carry stable codes; messages produced by `transformErrors` via `reactory.i18n.t(code, { defaultValue })`. |
| I18N-03 | Number, date, and currency inputs respect `reactory.i18n.locale` for formatting (use `Intl.*` APIs). |
| I18N-04 | RTL languages render correctly (no left/right hardcoded margins; use logical CSS properties). |
| I18N-05 | Tests assert that switching locale at runtime updates labels without remount. |
| I18N-06 | A `messages.en.json` keyfile shipped with the engine documents every key, with translator notes. |

**Translation key namespace:** `reactory.forms.*`

**Examples:**

```
reactory.forms.button.submit
reactory.forms.button.add
reactory.forms.button.remove
reactory.forms.array.empty
reactory.forms.validation.required
reactory.forms.validation.format.email
reactory.forms.validation.format.uri
reactory.forms.validation.minLength
reactory.forms.validation.maxLength
```

## Performance

**Budgets (must hold or PR is blocked):**

| Metric | Budget |
|---|---|
| Cold render, 300-field representative form | ≤ 500 ms |
| Incremental render after single field change | ≤ 50 ms |
| Validation pass on 300-field form | ≤ 100 ms |
| Bundle size, `form-engine/` only (gzipped) | ≤ 35 KB initial; ≤ 60 KB total with all templates |
| Bundle size delta per minor version | ≤ +10 % |

**Implementation hooks:**

- `React.memo` on every field/widget/template (selective; not blanket — measure first).
- Stable identities for `widgets`, `fields`, `templates` props (constructed once per form, not per render). Achieved by `useReactoryForm` memoizing the result.
- Validator instance is memoized per `(schema, locale, customFormats)` tuple.
- Large arrays virtualized at >50 items (see [`08-enterprise-capabilities.md#7`](./08-enterprise-capabilities.md)).
- Async-bound widgets show skeletons rather than blocking render.

**Tooling:**

- `react-devtools-profiler` integration in dev (toggle with `?profileForms=1`).
- `size-limit` configuration at `form-engine/.size-limit.json`.
- A perf test in CI (`__tests__/perf/`) renders the canonical 300-field fixture and asserts the budget.

## Observability

**Events** emitted via `reactory.telemetry.emit(name, payload)`:

| Event | Payload |
|---|---|
| `form.mount` | `{ formInstanceId, signature, formId, schemaSize, fieldCount }` |
| `form.unmount` | `{ formInstanceId, durationMs }` |
| `form.change` | `{ formInstanceId, path, valueDigest }` |
| `form.validate` | `{ formInstanceId, errorCount, durationMs, trigger: 'change' \| 'blur' \| 'submit' }` |
| `form.submit.attempt` | `{ formInstanceId }` |
| `form.submit.success` | `{ formInstanceId, durationMs }` |
| `form.submit.error` | `{ formInstanceId, errorCount, errorCodes }` |
| `form.async.validate.start` | `{ formInstanceId, path }` |
| `form.async.validate.end` | `{ formInstanceId, path, durationMs, ok }` |
| `form.fqn.miss` | `{ formInstanceId, kind, name }` — useful signal for plugin loading order issues |

**Privacy:** `valueDigest` is `sha256(value).slice(0, 8)`. No raw values cross the telemetry boundary. Field paths are kept (they reveal schema shape but not user input).

**Logs:** Structured via `reactory.log` with `formInstanceId` in MDC. A failing form should produce a single root log line with the failure reason and a stack of `form.*` events leading to it.

**Tracing:** OpenTelemetry-compatible span around `form.submit` (Reactory already emits OTel spans elsewhere in the app — this hooks into the same pipeline). Span attributes mirror the event payload.

## Security

| ID | Requirement |
|---|---|
| SEC-01 | The engine **never** evaluates user-provided strings as code. JSONata for computed fields runs in a sandbox. No `eval`, no `new Function`, no Function constructor. |
| SEC-02 | XSS: schema/uiSchema strings rendered as text, not HTML. Markdown rendering (when `ui:enableMarkdownInDescription`) goes through a sanitizer. |
| SEC-03 | File-upload widgets respect the existing CSP and never set `Content-Security-Policy` exceptions. |
| SEC-04 | RBAC checks happen at render time **and** the engine still passes the schema-required values to `customValidate` so the server side can verify on submit. The client-side check is for UX, not authorization. |
| SEC-05 | Validator does not load remote `$ref` references. External refs raise an error. |
| SEC-06 | PII handling: any field marked `ui:options.sensitive: true` is excluded from `valueDigest` (digest replaced with literal `"[redacted]"`). |

## Reliability

| ID | Requirement |
|---|---|
| REL-01 | A widget crash does not crash the form. Each field is wrapped in an `ErrorBoundary` that renders a structured error message. |
| REL-02 | A validator failure (AJV throws) does not crash the form. Errors are caught and surfaced as a single form-level error. |
| REL-03 | Network failures during async validation degrade gracefully — the field renders without the async error, and a `form.async.validate.error` event is emitted. |
| REL-04 | The engine is safe to mount in StrictMode (no double-effect bugs). |

## Compatibility

| ID | Requirement |
|---|---|
| COMPAT-01 | React 17 (current PWA target) and React 18 (planned upgrade). React 19 readiness verified once the upgrade lands. |
| COMPAT-02 | TypeScript 5.x. |
| COMPAT-03 | Browsers: matches the PWA's existing browserslist (currently last-2 evergreen + IE-not-supported). |
| COMPAT-04 | The engine works with `experimental_customMergeAllOf` set so plugins can override merge logic. |

## Documentation

| ID | Requirement |
|---|---|
| DOC-01 | Every public export from `form-engine/index.ts` has a TSDoc comment with at least: `@param`, `@returns`, `@example`. |
| DOC-02 | Storybook stories double as living documentation. |
| DOC-03 | `docs/forms-engine/recipes/` contains migration recipes per deprecated API. |
| DOC-04 | A "How to register a custom widget" tutorial in `docs/forms-engine/recipes/`. |
| DOC-05 | Every ADR is linked from its consumers. |
