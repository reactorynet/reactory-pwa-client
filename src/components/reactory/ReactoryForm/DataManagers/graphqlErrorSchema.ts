/**
 * GraphQL mutation error -> rjsf errorSchema mapping.
 *
 * Reactory forms submit through `useGraphQLDataManager.onSubmit`, which calls
 * Apollo with `errorPolicy: 'all'`: a resolver throw resolves the mutation
 * promise with an `errors` array instead of rejecting it. Historically that
 * payload was only logged / handed to a registered `onError` handler, so the
 * message could be announced in a notification but never attached to the input
 * that caused it.
 *
 * This module is the pure, framework-free translation step between the two
 * worlds. It produces an rjsf `errorSchema` (`{ <path>: { __errors: [...] } }`)
 * which the form passes to `<Form extraErrors={...}>` (v5 engine) or
 * `errorSchema` (legacy fork), so the offending field renders the server's
 * message inline.
 *
 * Resolution order for a single GraphQL error:
 *
 *   1. `extensions.field` (also `fieldPath` / `path` / `argumentName`) names a
 *      field. When the form declares
 *      `graphql.mutation.<op>.onError.fieldMap`, the server key is translated
 *      through that map (`{ classCode: 'code' }`). Otherwise the key is itself
 *      treated as a dotted schema path when it resolves in the form schema.
 *   2. No usable extension: an `onError.fieldMap` entry whose server key or
 *      destination field appears as a whole word in the message wins. Some
 *      resolvers (e.g. the classroom duplicate class code check) throw a plain
 *      `Error`, so the message is the only field hint the client ever
 *      receives. Declaring the mapping is an explicit opt-in by the form
 *      author, which is what keeps this heuristic safe.
 *   3. Nothing matched: the message lands under `_error` (form level) so it is
 *      still visible in the form's error list rather than silently dropped.
 */

/** Shape of an Apollo/GraphQL error entry as far as this module cares. */
export interface ReactoryGraphQLErrorLike {
  message?: string;
  extensions?: Record<string, any> | null;
}

/** rjsf error schema node. */
export interface ReactoryErrorSchemaNode {
  __errors?: string[];
  [path: string]: ReactoryErrorSchemaNode | string[] | undefined;
}

/** rjsf errorSchema: a nested map of schema paths to `{ __errors }` nodes. */
export interface ReactoryErrorSchema {
  [path: string]: any;
}

/** rjsf-style validation error, used for the form's error summary list. */
export interface ReactoryValidationError {
  property: string;
  message: string;
  stack: string;
}

export interface ReactoryMutationErrorSchema {
  errorSchema: ReactoryErrorSchema;
  errors: ReactoryValidationError[];
}

export interface ReactoryBuildErrorSchemaOptions {
  /**
   * `graphql.mutation.<op>.onError.fieldMap` — server field/extension key (or
   * message hint) to schema path, e.g. `{ classCode: 'code' }`.
   */
  fieldMap?: Record<string, unknown> | null;
  /** The form schema, used to reject paths that do not exist. */
  schema?: any;
  /** Key used for form-level errors. rjsf convention: `_error`. */
  formErrorKey?: string;
}

export const DEFAULT_FORM_ERROR_KEY = '_error';

/** Extension properties that describe *where* an error belongs. */
const FIELD_EXTENSION_KEYS = ['field', 'fieldPath', 'path', 'argumentName'];

const isObject = (value: any): value is Record<string, any> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Normalise the many shapes a mutation failure can take (`GraphQLError[]`,
 * a single error, a string, an `ApolloError` with `.graphQLErrors`) into a flat
 * list of `{ message, extensions }` entries.
 */
export const normaliseGraphQLErrors = (errors: any): ReactoryGraphQLErrorLike[] => {
  if (errors === null || errors === undefined) return [];

  let list: any[];
  if (Array.isArray(errors)) {
    list = errors;
  } else if (Array.isArray((errors as any).graphQLErrors)) {
    list = (errors as any).graphQLErrors;
  } else {
    list = [errors];
  }

  return list
    .map((entry): ReactoryGraphQLErrorLike | null => {
      if (typeof entry === 'string') {
        return { message: entry, extensions: null };
      }
      if (!entry || typeof entry !== 'object') return null;
      const message = typeof entry.message === 'string' ? entry.message : '';
      const extensions = isObject(entry.extensions) ? entry.extensions : null;
      return { message, extensions };
    })
    .filter((entry): entry is ReactoryGraphQLErrorLike => entry !== null);
};

/** Whole-word (case-insensitive) occurrence of `key` inside `message`. */
export const messageMentionsKey = (message: string, key: string): boolean => {
  if (!message || !key) return false;
  const pattern = new RegExp(`(^|[^\\w])${escapeRegExp(key)}([^\\w]|$)`, 'i');
  return pattern.test(message);
};

/**
 * Does `path` resolve inside `schema`? Unknown/absent schemas are treated as
 * permissive — the caller (a form author) is the authority in that case.
 */
export const schemaHasPath = (schema: any, path: string): boolean => {
  if (!schema || typeof schema !== 'object') return true;

  const segments = path.split('.').filter(Boolean);
  if (segments.length === 0) return false;

  let cursor: any = schema;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== 'object') return false;

    const properties = isObject(cursor.properties) ? cursor.properties : null;
    if (properties && Object.prototype.hasOwnProperty.call(properties, segment)) {
      cursor = properties[segment];
      continue;
    }

    // Array item: allow both `items.properties[x]` and a numeric index.
    if (cursor.items && isObject(cursor.items)) {
      const itemProperties = isObject(cursor.items.properties) ? cursor.items.properties : null;
      if (itemProperties && Object.prototype.hasOwnProperty.call(itemProperties, segment)) {
        cursor = itemProperties[segment];
        continue;
      }
      if (/^\d+$/.test(segment)) {
        cursor = cursor.items;
        continue;
      }
    }

    return false;
  }

  return true;
};

/** Read a (dotted) path out of a form definition's schema. */
const schemaNodeAtPath = (schema: any, path: string): any => {
  if (!schema || typeof schema !== 'object') return undefined;

  let cursor: any = schema;
  for (const segment of path.split('.').filter(Boolean)) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    const properties = isObject(cursor.properties) ? cursor.properties : null;
    if (properties && Object.prototype.hasOwnProperty.call(properties, segment)) {
      cursor = properties[segment];
      continue;
    }
    if (cursor.items && isObject(cursor.items)) {
      const itemProperties = isObject(cursor.items.properties) ? cursor.items.properties : null;
      if (itemProperties && Object.prototype.hasOwnProperty.call(itemProperties, segment)) {
        cursor = itemProperties[segment];
        continue;
      }
      if (/^\d+$/.test(segment)) {
        cursor = cursor.items;
        continue;
      }
    }
    return undefined;
  }
  return cursor;
};

/** Does the schema describe this path as an object/array (a container)? */
const schemaPathIsContainer = (schema: any, path: string): boolean => {
  const node = schemaNodeAtPath(schema, path);
  if (!node || typeof node !== 'object') return false;
  const type = Array.isArray(node.type) ? node.type[0] : node.type;
  return type === 'object' || type === 'array' || isObject(node.properties) || isObject(node.items);
};

/**
 * Translate the server's field identifier through `fieldMap`.
 * Returns `undefined` when the map has no entry for the key.
 */
const mapServerFieldKey = (
  key: string,
  fieldMap?: Record<string, unknown> | null,
): string | undefined => {
  if (!fieldMap) return undefined;
  const mapped = Object.prototype.hasOwnProperty.call(fieldMap, key) ? fieldMap[key] : undefined;
  if (typeof mapped === 'string' && mapped.trim().length > 0) return mapped.trim();
  if (typeof mapped === 'number') return String(mapped);
  return undefined;
};

/**
 * Candidate schema paths for a server field key, most specific first.
 * `input.code` (the argument wrapper some resolvers report) is also tried as
 * the bare property path.
 */
const candidatePathsForServerKey = (key: string): string[] => {
  const candidates = [key];
  const withoutInput = key.replace(/^input\./, '');
  if (withoutInput !== key) candidates.push(withoutInput);
  return candidates;
};

/**
 * Resolve which schema path an error belongs to. Exported for reuse in tests
 * and by callers that want to reason about the mapping without building an
 * errorSchema.
 */
export const resolveErrorPath = (
  error: ReactoryGraphQLErrorLike,
  options: ReactoryBuildErrorSchemaOptions = {},
): string => {
  const formErrorKey = options.formErrorKey || DEFAULT_FORM_ERROR_KEY;
  const fieldMap = options.fieldMap || null;
  const message = typeof error.message === 'string' ? error.message : '';
  const extensions = error.extensions || null;

  // 1. Server told us where the error belongs.
  if (extensions) {
    for (const extensionKey of FIELD_EXTENSION_KEYS) {
      const raw = (extensions as Record<string, any>)[extensionKey];
      const serverKey = Array.isArray(raw)
        ? raw.filter((part) => typeof part === 'string').join('.')
        : typeof raw === 'string'
          ? raw
          : '';
      if (!serverKey) continue;

      const mapped = mapServerFieldKey(serverKey, fieldMap);
      if (mapped) return mapped;

      for (const candidate of candidatePathsForServerKey(serverKey)) {
        if (schemaHasPath(options.schema, candidate)) return candidate;
      }
    }
  }

  // 2. No usable extension: use a declared fieldMap entry as a message hint.
  //    Both the server key (`classCode`) and the destination path it maps to
  //    (`code`, and the leaf of `settings.code`) are candidates, because a
  //    resolver that throws a plain Error only ever sends the prose. Only
  //    fields the form author opted into are considered, so a generic word in
  //    the message can never attach an error to an unrelated field.
  if (fieldMap) {
    for (const key of Object.keys(fieldMap)) {
      const mapped = mapServerFieldKey(key, fieldMap);
      if (!mapped) continue;
      const hints = [key, mapped, mapped.split('.').filter(Boolean).pop() || ''];
      if (hints.some((hint) => messageMentionsKey(message, hint))) return mapped;
    }
  }

  // 3. Form level.
  return formErrorKey;
};

/**
 * Attach `message` at `path` in the rjsf errorSchema, creating intermediate
 * nodes for dotted paths. Duplicate messages at the same path are collapsed.
 */
export const setErrorAtPath = (
  errorSchema: ReactoryErrorSchema,
  path: string,
  message: string,
): void => {
  const segments = path.split('.').filter(Boolean);
  const safeSegments = segments.length > 0 ? segments : [DEFAULT_FORM_ERROR_KEY];

  let cursor: any = errorSchema;
  for (let index = 0; index < safeSegments.length - 1; index += 1) {
    const segment = safeSegments[index];
    if (!isObject(cursor[segment])) cursor[segment] = {};
    cursor = cursor[segment];
  }

  const leaf = safeSegments[safeSegments.length - 1];
  if (!isObject(cursor[leaf])) cursor[leaf] = { __errors: [] };
  const node = cursor[leaf];
  if (!Array.isArray(node.__errors)) node.__errors = [];
  if (!node.__errors.includes(message)) node.__errors.push(message);
};

/** rjsf error list entry for a path (`''` for the form root). */
const toValidationError = (path: string, message: string): ReactoryValidationError => {
  const property = path ? `.${path}` : '.';
  return { property, message, stack: `${property} ${message}` };
};

/**
 * Build the rjsf `errorSchema` + error list for a failed GraphQL mutation.
 *
 * Never throws: a malformed payload degrades to an empty result so a save
 * failure cannot take the form down.
 */
export const buildErrorSchemaFromGraphQLErrors = (
  errors: any,
  options: ReactoryBuildErrorSchemaOptions = {},
): ReactoryMutationErrorSchema => {
  const errorSchema: ReactoryErrorSchema = {};
  const validationErrors: ReactoryValidationError[] = [];
  const seen = new Set<string>();

  const normalised = normaliseGraphQLErrors(errors);

  normalised.forEach((error) => {
    const message = typeof error.message === 'string' ? error.message.trim() : '';
    if (!message) return;

    const path = resolveErrorPath(error, options);
    setErrorAtPath(errorSchema, path, message);

    // A message aimed at a container (e.g. an object field) reads badly in the
    // summary list when prefixed with the container path, and rjsf already
    // renders it on the field itself. Keep the list clean for that case.
    const dedupeKey = `${path}::${message}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    validationErrors.push(
      schemaPathIsContainer(options.schema, path)
        ? { property: `.${path}`, message, stack: message }
        : toValidationError(path, message),
    );
  });

  return { errorSchema, errors: validationErrors };
};

export default buildErrorSchemaFromGraphQLErrors;
