# ADR-0002 — Use `@rjsf/validator-ajv8` with a Reactory localizer

**Status:** Proposed
**Date:** 2026-04-25

## Context

The fork uses a bare `ajv` instance (likely AJV 6) for validation. Error messages are in English, with no integration with `reactory.i18n`. Custom validation runs through a parallel pipeline.

rjsf v5 requires a validator passed in via the `validator` prop. The official package is `@rjsf/validator-ajv8`, which wraps AJV 8 with rjsf-specific glue.

We considered:

1. **Use `@rjsf/validator-ajv8`** (this ADR).
2. **Write our own validator that wraps AJV 8 directly.** Possible but duplicates the work the rjsf team has done. The upstream validator handles all the glue around `customFormats`, `customKeywords`, error-shape translation, async validators, and so on.
3. **Use a non-AJV validator** (e.g., `zod`, `valibot`). Doesn't work — JSON Schema is the source of truth and AJV is the canonical implementation.

## Decision

We use `@rjsf/validator-ajv8`. We wrap it with a thin Reactory localizer to route error messages through `reactory.i18n.t()`.

```ts
// form-engine/validator/ReactoryValidator.ts
import { customizeValidator } from '@rjsf/validator-ajv8';
import { localizerFor } from './localizer';

export function createReactoryValidator({ reactory, customFormats, customKeywords, locale }) {
  const localize = localizerFor(reactory, locale);
  return customizeValidator(
    {
      customFormats: { 'reactory-fqn': /…/, ...customFormats },
      ajvOptionsOverrides: { strict: false, allErrors: true, verbose: true },
      // customKeywords passed via extenderFn
      extenderFn: (ajv) => {
        for (const k of customKeywords ?? []) ajv.addKeyword(k);
      },
    },
    localize,
  );
}
```

The localizer function uses ajv-i18n's API but rewrites `error.message` with a translation key (e.g., `reactory.validation.required`). A `transformErrors` step then runs `reactory.i18n.t(key, { defaultValue: error.message })` for each error, producing the localized text shown to users.

## Consequences

**Positive**

- Localized validation errors via the existing `reactory.i18n` service. No duplicate translation pipeline.
- Drop ~150 lines of AJV-glue code from the fork (`transformAjvErrors`, `toErrorSchema`, `toErrorList`).
- Async validators integrate via the standard rjsf `extraErrors` path.
- Custom formats (e.g., `reactory-fqn`) in one place, available to every form.

**Negative**

- We ship AJV 8 in the bundle. AJV 8 is larger than AJV 6 by a small margin. Bundle-size budget accounts for it.
- A version bump in `@rjsf/validator-ajv8` could change error shapes. The contract test suite catches this.

## See also

- [`06-reactory-extensions.md#6-reactoryvalidator`](../06-reactory-extensions.md#6-reactoryvalidator)
- [`10-non-functional.md#internationalization`](../10-non-functional.md#internationalization)
