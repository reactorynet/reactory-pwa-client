/**
 * Reactory localizer for AJV validation errors.
 *
 * Conforms to `@rjsf/validator-ajv8`'s `Localizer` signature:
 *   `(errors?: null | ErrorObject[]) => void`
 *
 * The localizer mutates each `error.message` in place to a translation
 * sourced from `reactory.i18n.t()`. Translation keys live under the
 * `reactory.forms.validation.*` namespace and are stable across releases.
 *
 * The original AJV-supplied message is preserved as the `defaultValue`
 * so that missing translations gracefully fall back to English instead
 * of surfacing a key string.
 */

import type { ErrorObject } from 'ajv';

export interface ReactoryLocalizerSdk {
  i18n: {
    t: (key: string, options?: Record<string, unknown>) => string;
  };
}

export type Localizer = (errors?: null | ErrorObject[]) => void;

const KEY_PREFIX = 'reactory.forms.validation';

/**
 * Map an AJV error keyword (and where applicable, error params) to a stable
 * translation key. Unknown keywords fall back to a generic `unknown` key,
 * which by design hits the defaultValue path so the original AJV message
 * shows through.
 */
export function keyForError(err: ErrorObject): string {
  switch (err.keyword) {
    case 'format': {
      const fmt = (err.params as { format?: string } | undefined)?.format;
      return fmt ? `${KEY_PREFIX}.format.${fmt}` : `${KEY_PREFIX}.format`;
    }
    case 'type': {
      const t = (err.params as { type?: string } | undefined)?.type;
      return t ? `${KEY_PREFIX}.type.${t}` : `${KEY_PREFIX}.type`;
    }
    case 'required':
    case 'enum':
    case 'const':
    case 'minLength':
    case 'maxLength':
    case 'pattern':
    case 'minimum':
    case 'maximum':
    case 'exclusiveMinimum':
    case 'exclusiveMaximum':
    case 'multipleOf':
    case 'minItems':
    case 'maxItems':
    case 'uniqueItems':
    case 'minProperties':
    case 'maxProperties':
    case 'additionalProperties':
    case 'oneOf':
    case 'anyOf':
    case 'allOf':
    case 'not':
    case 'if':
      return `${KEY_PREFIX}.${err.keyword}`;
    default:
      return `${KEY_PREFIX}.unknown`;
  }
}

/**
 * Build a localizer bound to a specific Reactory SDK handle. Each form
 * can pass a different SDK reference (e.g., during tests with mocks).
 */
export function localizerFor(reactory: ReactoryLocalizerSdk): Localizer {
  return (errors) => {
    if (!errors || errors.length === 0) return;
    for (const err of errors) {
      const key = keyForError(err);
      const original = typeof err.message === 'string' ? err.message : '';
      const translated = reactory.i18n.t(key, {
        defaultValue: original,
        ...((err.params as Record<string, unknown> | undefined) ?? {}),
      });
      err.message = translated;
    }
  };
}
