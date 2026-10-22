/**
 * Pure helpers for the self-service demographics section (ORG-034).
 *
 * Kept free of React, MUI and GraphQL transports so the value mapping, the
 * required-field rule and the server error mapping can be unit tested directly
 * and reviewed without reading the component.
 */
import type {
  DemographicDefinition,
  DemographicErrors,
  DemographicValues,
} from '../../../../../plugins/reactory-core/demographic-form';

/** One row of `DemographicValueInput` this section is willing to send. */
export interface DemographicValuePayload {
  key: string;
  value: unknown;
}

/** A `DemographicValue` as returned by `MyDemographics` / `MySaveDemographics`. */
export interface DemographicValueRecord {
  key?: string | null;
  value?: unknown;
  [key: string]: unknown;
}

/**
 * Is this value "not answered"?
 *
 * Required definitions block the save when empty, and optional ones are simply
 * omitted from the payload. `false` and `0` are answers — only `null`,
 * `undefined`, blank text, an empty array and an object with no non-empty
 * member are empty. A cleared MUI text field arrives as `null` (see the shared
 * number/text widgets), which is why `''` is not the only blank shape.
 */
export const isEmptyDemographicValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) {
    return value.length === 0 || value.every((entry) => isEmptyDemographicValue(entry));
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record).every((key) => isEmptyDemographicValue(record[key]));
  }
  // A boolean false or a numeric 0 is a deliberate answer.
  return false;
};

/**
 * Reduce the server's value list to the form's `{ key: value }` shape.
 *
 * Only records with a usable key are kept. Records for definitions the caller
 * cannot see (a disabled or sensitive definition filtered out of the
 * definitions read) are retained in the record but never rendered nor sent:
 * `buildSavePayload` iterates the *definitions*, not this map, so a hidden key
 * can never be written back.
 */
export const toValuesRecord = (
  values: ReadonlyArray<DemographicValueRecord> | null | undefined,
): DemographicValues => {
  const record: DemographicValues = {};
  (values || []).forEach((entry) => {
    if (!entry || typeof entry.key !== 'string' || entry.key.length === 0) return;
    record[entry.key] = entry.value === undefined ? null : entry.value;
  });
  return record;
};

/**
 * Build the `values` variable for `MySaveDemographics`.
 *
 * Only definitions the user actually answered are included, in ordinal order
 * (the renderable list is already ordered), and only `key` + `value` are sent:
 * no `user` (the server rejects a foreign id) and no `definition` id (a stale
 * id from a previous organization must never reach the write path).
 */
export const buildSavePayload = (
  definitions: ReadonlyArray<DemographicDefinition>,
  values: DemographicValues | null | undefined,
): DemographicValuePayload[] =>
  (definitions || [])
    .filter(
      (definition) =>
        definition &&
        typeof definition.key === 'string' &&
        definition.key.length > 0 &&
        !isEmptyDemographicValue((values || {})[definition.key]),
    )
    .map((definition) => ({ key: definition.key, value: (values || {})[definition.key] }));

/** Message shown under a required field that has no answer. */
export const REQUIRED_FIELD_MESSAGE = 'This field is required.';

/**
 * Inline validation for required definitions.
 *
 * Only required fields can block a save; optional fields are allowed to be
 * saved partially (they are simply left out of the payload).
 */
export const requiredFieldErrors = (
  definitions: ReadonlyArray<DemographicDefinition>,
  values: DemographicValues | null | undefined,
): DemographicErrors => {
  const errors: DemographicErrors = {};
  (definitions || []).forEach((definition) => {
    if (!definition || definition.required !== true) return;
    if (isEmptyDemographicValue((values || {})[definition.key])) {
      errors[definition.key] = [REQUIRED_FIELD_MESSAGE];
    }
  });
  return errors;
};

/** Every error object a GraphQL call can hand back, in one flat list. */
export const errorListOf = (error: any): any[] => {
  if (!error) return [];
  if (Array.isArray(error)) return error.filter(Boolean);
  if (Array.isArray(error.graphQLErrors) && error.graphQLErrors.length > 0) {
    return error.graphQLErrors.filter(Boolean);
  }
  if (Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors.filter(Boolean);
  }
  return [error];
};

/**
 * Normalise one entry of `extensions.fields` into `{ path, message }`.
 *
 * The server documents `[{ path, message }]`, but the shape is transport data
 * from an `Any`-typed extension, so the three plausible encodings are accepted:
 * a plain message string (no path — always unmapped), an object with a
 * `message`, and anything else (dropped). No speculative aliases: only
 * `extensions.fields` is read, which is what `DemographicsService` throws.
 */
const normaliseFieldError = (entry: any): { path: string; message: string } => {
  if (typeof entry === 'string') return { path: '', message: entry };
  return {
    path: entry && typeof entry.path === 'string' ? entry.path : '',
    message: entry && typeof entry.message === 'string' ? entry.message : '',
  };
};

/**
 * The server's field-level errors.
 *
 * `DemographicsService.rejectInvalid` throws `ApiError(message, { fields })`
 * and `ApiError.extensions` mirrors its meta, so a GraphQL error carries
 * `extensions.fields`. A keyed record (`{ key: message }`) is also accepted,
 * because that is how an older field-keyed payload was shaped.
 */
const fieldErrorsOf = (error: any): Array<{ path: string; message: string }> => {
  const extensions = error && error.extensions;
  if (!extensions || !extensions.fields) return [];

  const raw: any[] = Array.isArray(extensions.fields)
    ? extensions.fields
    : typeof extensions.fields === 'object'
      ? Object.keys(extensions.fields).map((path) => ({
          path,
          message: extensions.fields[path],
        }))
      : [];

  return raw
    .map(normaliseFieldError)
    .filter((entry) => entry.message.trim().length > 0);
};

/**
 * Resolve a server error path onto the definition key it belongs to.
 *
 * The server indexes into the payload it received (`values[2].key`,
 * `values[0].<schemaPath>`), so the key is recovered from the *sent* keys at
 * that index. A path that names a key directly is matched as a fallback.
 */
export const keyFromErrorPath = (
  path: string,
  sentKeys: ReadonlyArray<string>,
): string | null => {
  if (typeof path !== 'string' || path.length === 0) return null;

  const indexed = /values\[(\d+)\]/.exec(path);
  if (indexed) {
    const key = sentKeys[Number(indexed[1])];
    return key === undefined ? null : key;
  }

  const direct = sentKeys.find((key) => path === key || path.startsWith(`${key}.`));
  return direct === undefined ? null : direct;
};

export interface DemographicSaveFailure {
  /** Messages keyed by definition key, ready for the renderer's `errors`. */
  fieldErrors: DemographicErrors;
  /** Messages that could not be attributed to a field. */
  unmapped: string[];
  /** The organization policy refuses self-service writes. */
  selfServiceDisabled: boolean;
  /** First server message, for a form-level fallback. */
  message: string | null;
}

/**
 * Translate a rejected `MySaveDemographics` into renderable state.
 *
 * Three outcomes matter to the UI:
 *  - the org policy forbids self-service → read-only, not an error to retry;
 *  - field-level validation → inline messages on the right fields;
 *  - anything else → one form-level message.
 */
export const describeSaveFailure = (
  error: any,
  sentKeys: ReadonlyArray<string>,
): DemographicSaveFailure => {
  const errors = errorListOf(error);
  const messages = errors
    .map((entry) => (typeof entry === 'string' ? entry : entry?.message))
    .filter((message): message is string => typeof message === 'string' && message.length > 0);

  const fieldErrors: DemographicErrors = {};
  const unmapped: string[] = [];

  errors.forEach((entry) => {
    fieldErrorsOf(entry).forEach((fieldError) => {
      const key = keyFromErrorPath(fieldError.path, sentKeys);
      if (key === null) {
        unmapped.push(fieldError.message);
        return;
      }
      const existing = fieldErrors[key];
      const list = Array.isArray(existing) ? existing : existing ? [existing] : [];
      fieldErrors[key] = [...list, fieldError.message];
    });
  });

  const envelopeMessage = messages.length > 0 ? messages[0] : null;

  return {
    fieldErrors,
    unmapped,
    selfServiceDisabled: isSelfServiceDisabledError(error),
    // A failure may carry its only text inside `extensions.fields` (an error
    // object with no top-level `message`). That text is still the server's
    // explanation and must reach the form-level fallback.
    message: envelopeMessage || (unmapped.length > 0 ? unmapped[0] : null),
  };
};

/**
 * Detect the server's policy refusal.
 *
 * `saveSelfServiceValues` throws `InsufficientPermissions('Self-service
 * demographics are disabled for organization [...]')`. That error carries no
 * `code` in `extensions` (only `{ organizationId }`), so the message is the
 * signal. The check is deliberately narrow: an unrelated "disabled" message
 * must not flip the surface into a read-only state.
 */
export const isSelfServiceDisabledError = (error: any): boolean =>
  errorListOf(error).some((entry) => {
    if (entry && entry.extensions && entry.extensions.selfServiceEnabled === false) return true;
    const message = typeof entry === 'string' ? entry : entry?.message;
    if (typeof message !== 'string') return false;
    return /self[\s-]?service/i.test(message) && /(disabled|not enabled|not permitted|forbidden)/i.test(message);
  });

/**
 * The `errors` array of a resolved GraphQL envelope, or `null` when the call
 * actually succeeded.
 *
 * Separate from `serverMessageOf` on purpose: "did it fail?" and "what did it
 * say?" are different questions. An error object can carry no `message` (the
 * text can live in `extensions.fields`, or a proxy can strip it), and deciding
 * success by the presence of a message would silently accept such a failure.
 */
export const envelopeErrorsOf = (result: any): any[] | null =>
  result && Array.isArray(result.errors) && result.errors.length > 0 ? result.errors : null;

/** Read the server's message out of anything a GraphQL call can produce. */
export const serverMessageOf = (error: any): string | null => {
  if (!error) return null;
  if (typeof error === 'string') return error.length > 0 ? error : null;
  const messages = errorListOf(error)
    .map((entry) => (typeof entry === 'string' ? entry : entry?.message))
    .filter((message): message is string => typeof message === 'string' && message.length > 0);
  if (messages.length > 0) return messages[0];
  if (error.networkError && typeof error.networkError.message === 'string') {
    return error.networkError.message;
  }
  if (typeof error.message === 'string' && error.message.length > 0) return error.message;
  return null;
};

