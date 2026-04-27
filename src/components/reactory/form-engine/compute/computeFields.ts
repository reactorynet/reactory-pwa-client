/**
 * Computed fields, per 08-enterprise-capabilities.md section 2.
 *
 * Authors annotate fields with:
 *
 *   uiSchema.<fieldName>['ui:options'].compute = ({ formData, formContext }) => value
 *
 *   - or, for the string form (deferred to a follow-up ADR):
 *
 *   uiSchema.<fieldName>['ui:options'].compute = "$sum(items.price)"   // JSONata
 *
 * The function form ships in Phase 4. The string form is a Phase 4.x
 * follow-up gated on the JSONata dependency ADR — a string compute
 * directive logs a warning and is treated as no-op until the dependency
 * lands.
 *
 * Optional `computeOn: string[]` declares which paths trigger recompute.
 * When omitted, every change recomputes every computed field. Phase 4
 * uses the simple "recompute everything on every change" path; selective
 * recompute is a Phase 4.x optimisation.
 */

export type ComputeFn<TValue = unknown> = (args: {
  formData: unknown;
  formContext: unknown;
  /** The current value at this path (useful for default-if-empty patterns). */
  currentValue: unknown;
  /** Dotted path to the field, e.g. "lineItems.2.total". */
  path: string;
}) => TValue;

export type Compute = ComputeFn | string;

export interface ComputeDirective {
  compute: Compute;
  /** Optional whitelist of paths whose change triggers recompute. */
  computeOn?: string[];
}

/**
 * Walk a uiSchema tree and collect compute directives keyed by the field
 * path they apply to.
 *
 * Pure — no side effects. Tests use this directly to assert which fields
 * the engine considers computed.
 */
export function collectComputeDirectives(
  uiSchema: unknown,
  pathPrefix: string = '',
): Array<{ path: string; directive: ComputeDirective }> {
  const out: Array<{ path: string; directive: ComputeDirective }> = [];
  if (!uiSchema || typeof uiSchema !== 'object') return out;

  const node = uiSchema as Record<string, unknown>;
  const options = node['ui:options'] as Record<string, unknown> | undefined;
  if (options && options.compute !== undefined) {
    const directive: ComputeDirective = {
      compute: options.compute as Compute,
      computeOn: Array.isArray(options.computeOn) ? (options.computeOn as string[]) : undefined,
    };
    if (pathPrefix) {
      out.push({ path: pathPrefix, directive });
    }
  }

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('ui:')) continue;
    if (!value || typeof value !== 'object') continue;
    const nestedPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    out.push(...collectComputeDirectives(value, nestedPath));
  }

  return out;
}

/**
 * Read a value at a dotted path on an object. Returns undefined when any
 * segment is missing. Pure.
 */
export function getAtPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const segments = path.split('.');
  let cursor: unknown = obj;
  for (const seg of segments) {
    if (cursor === null || cursor === undefined) return undefined;
    if (typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[seg];
  }
  return cursor;
}

/**
 * Set a value at a dotted path on an object, returning a new object with
 * the change applied. Intermediate segments are created when missing
 * (always as objects — this engine doesn't support array paths via index
 * notation in the function form; callers can manage arrays themselves).
 *
 * Pure: does not mutate the input.
 */
export function setAtPath<T>(obj: T, path: string, value: unknown): T {
  if (!path) return value as T;
  const segments = path.split('.');
  const root: Record<string, unknown> = { ...((obj as unknown as Record<string, unknown>) ?? {}) };
  let cursor: Record<string, unknown> = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const existing = cursor[seg];
    cursor[seg] = existing && typeof existing === 'object' ? { ...(existing as Record<string, unknown>) } : {};
    cursor = cursor[seg] as Record<string, unknown>;
  }
  cursor[segments[segments.length - 1]] = value;
  return root as T;
}

export interface ApplyComputedFieldsDeps {
  /** Optional logger for warnings about unsupported compute forms. */
  reactory?: { log?: (msg: string, params?: unknown) => void };
}

/**
 * Apply every compute directive in the uiSchema to `formData`, returning
 * the updated formData. Returns the input by reference if no directives
 * fired (lets callers skip a re-render via referential equality).
 *
 * Function-form compute is invoked synchronously with
 * `{ formData, formContext, currentValue, path }`. A throwing compute
 * function is caught and logged; the field's value is left unchanged.
 *
 * String-form compute is logged-and-skipped in Phase 4. Adopt JSONata in
 * a follow-up ADR.
 */
export function applyComputedFields<TData>(
  uiSchema: unknown,
  formData: TData,
  formContext: unknown,
  deps: ApplyComputedFieldsDeps = {},
): TData {
  const directives = collectComputeDirectives(uiSchema);
  if (directives.length === 0) return formData;

  let result: TData = formData;
  let changed = false;

  for (const { path, directive } of directives) {
    const { compute } = directive;
    if (typeof compute === 'string') {
      deps.reactory?.log?.(
        `[form-engine] string-form compute (JSONata) at "${path}" is not yet supported; treating as no-op.`,
        { path, expression: compute },
      );
      continue;
    }
    if (typeof compute !== 'function') continue;

    const currentValue = getAtPath(result, path);
    let nextValue: unknown;
    try {
      nextValue = compute({ formData: result, formContext, currentValue, path });
    } catch (err) {
      deps.reactory?.log?.(
        `[form-engine] compute function at "${path}" threw; field value unchanged.`,
        { path, error: (err as Error).message },
      );
      continue;
    }

    if (!Object.is(nextValue, currentValue)) {
      result = setAtPath(result, path, nextValue);
      changed = true;
    }
  }

  return changed ? result : formData;
}
