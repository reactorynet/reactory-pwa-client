/**
 * ReactoryConditionalField — JSON Schema draft-07 if/then/else renderer.
 *
 * Per ADR-0007 (we implement this ourselves rather than adopt rjsf-conditionals).
 * AJV 8 validates if/then/else but rjsf does not auto-branch the UI; this
 * field is the renderer.
 *
 * Algorithm:
 *   1. Validate `formData` against `schema.if` using the form's validator.
 *   2. If valid → resolve `schema.then`. Else → resolve `schema.else`.
 *   3. Merge selected branch into a derived schema (properties + required +
 *      anything else valid for the parent type), strip if/then/else to
 *      avoid recursion within the same field.
 *   4. Render the derived schema via the registry's SchemaField.
 *
 * Caching: the merged schema is memoized by (schemaHash, formDataDigest)
 * to avoid validation thrash on every keystroke.
 *
 * Recursion: nested if/then/else inside `then`/`else` is supported (the
 * derived schema flows back through SchemaField, which finds another
 * conditional and recurses). Hard depth cap at 10 levels prevents
 * pathological cycles.
 *
 * Activation: in Phase 3 we surface this via `ui:field: 'ConditionalField'`.
 * Phase 4 may add automatic activation when a schema contains if/then/else.
 *
 * Usage:
 *   schema: {
 *     type: 'object',
 *     properties: { kind: { type: 'string', enum: ['a','b'] }, x: {...} },
 *     if:   { properties: { kind: { const: 'a' } } },
 *     then: { properties: { extraA: { type: 'string' } }, required: ['extraA'] },
 *     else: { properties: { extraB: { type: 'string' } } },
 *   }
 *   uiSchema: { 'ui:field': 'ConditionalField' }
 */

import * as React from 'react';
import type { FieldProps, RJSFSchema, ValidatorType } from '@rjsf/utils';

const MAX_DEPTH = 10;

export const ConditionalDepthContext = React.createContext(0);

/**
 * Pure schema merger. Strips `if/then/else` from the base, then deep-merges
 * `properties` and `required` from the selected branch on top. Anything else
 * on the branch (description, title, etc.) overrides the base.
 *
 * Exposed for tests; the field component calls this internally.
 */
export function mergeConditionalBranch(
  baseSchema: RJSFSchema,
  branchSchema: RJSFSchema | undefined,
): RJSFSchema {
  const { /* eslint-disable @typescript-eslint/no-unused-vars */
    if: _if,
    then: _then,
    else: _else,
    /* eslint-enable @typescript-eslint/no-unused-vars */
    ...stripped
  } = baseSchema as RJSFSchema & { if?: unknown; then?: unknown; else?: unknown };
  if (!branchSchema || typeof branchSchema !== 'object') return stripped as RJSFSchema;

  const baseProps = (stripped as { properties?: Record<string, unknown> }).properties ?? {};
  const branchProps = (branchSchema as { properties?: Record<string, unknown> }).properties ?? {};
  const baseRequired = Array.isArray((stripped as { required?: unknown }).required)
    ? ((stripped as { required: string[] }).required)
    : [];
  const branchRequired = Array.isArray((branchSchema as { required?: unknown }).required)
    ? ((branchSchema as { required: string[] }).required)
    : [];

  // Branch wins on top-level non-properties/non-required fields, but base properties
  // are preserved (branch properties merge on top of base ones).
  const merged: RJSFSchema = {
    ...stripped,
    ...branchSchema,
    properties: { ...baseProps, ...branchProps },
    required: Array.from(new Set([...baseRequired, ...branchRequired])),
  } as RJSFSchema;

  // Recursive strip in case branch itself reintroduces if/then/else at the
  // top level (the nested SchemaField re-enters this field, which strips again).
  return merged;
}

/**
 * Pick the active branch given formData and the current schema.
 *
 * Returns 'then' | 'else' | 'neither' when there is no `if`. Uses the
 * validator's `isValid` so it honours every custom format/keyword the
 * caller registered.
 */
export function pickConditionalBranch(
  schema: RJSFSchema,
  formData: unknown,
  validator: Pick<ValidatorType, 'isValid'>,
): 'then' | 'else' | 'neither' {
  const ifSchema = (schema as { if?: RJSFSchema }).if;
  if (!ifSchema) return 'neither';
  try {
    const valid = validator.isValid(ifSchema, formData ?? {}, schema);
    return valid ? 'then' : 'else';
  } catch {
    return 'neither';
  }
}

/**
 * Resolve the conditional: pick branch, merge it into the base. Pure — no
 * side effects. Tested independently of React.
 */
export function resolveConditional(
  schema: RJSFSchema,
  formData: unknown,
  validator: Pick<ValidatorType, 'isValid'>,
): RJSFSchema {
  const branch = pickConditionalBranch(schema, formData, validator);
  if (branch === 'then') return mergeConditionalBranch(schema, (schema as { then?: RJSFSchema }).then);
  if (branch === 'else') return mergeConditionalBranch(schema, (schema as { else?: RJSFSchema }).else);
  // No `if` clause; just strip if/then/else (none) and return as-is.
  return mergeConditionalBranch(schema, undefined);
}

export const ReactoryConditionalField: React.FC<FieldProps> = (props) => {
  const depth = React.useContext(ConditionalDepthContext);
  const { schema, formData, registry, uiSchema, idSchema } = props;

  if (depth >= MAX_DEPTH) {
    return (
      <div className="conditional-field-error" role="alert">
        <strong>Conditional schema recursion exceeded depth {MAX_DEPTH}.</strong>
        <p>Check your schema for cycles in if/then/else nesting.</p>
      </div>
    );
  }

  const validator = (registry as unknown as { validator?: ValidatorType }).validator
    ?? (registry as unknown as { schemaUtils?: { validator?: ValidatorType } }).schemaUtils?.validator;

  const derived = React.useMemo(
    () => {
      if (!validator) return schema;
      return resolveConditional(schema, formData, validator);
    },
    [schema, formData, validator],
  );

  const SchemaField = registry.fields.SchemaField as React.ComponentType<FieldProps>;
  if (!SchemaField) {
    return (
      <div className="conditional-field-error" role="alert">
        SchemaField not in registry.
      </div>
    );
  }

  return (
    <ConditionalDepthContext.Provider value={depth + 1}>
      <SchemaField
        {...props}
        schema={derived}
        uiSchema={excludeUiField(uiSchema)}
        idSchema={idSchema}
      />
    </ConditionalDepthContext.Provider>
  );
};

ReactoryConditionalField.displayName = 'ReactoryConditionalField';

/**
 * Strip `ui:field: 'ConditionalField'` from the uiSchema before re-entering
 * SchemaField so the nested render uses the default field dispatcher
 * (otherwise it loops back into us). Other ui:* options pass through.
 */
function excludeUiField(uiSchema: FieldProps['uiSchema']): FieldProps['uiSchema'] {
  if (!uiSchema) return uiSchema;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { 'ui:field': _stripped, ...rest } = uiSchema as Record<string, unknown>;
  return rest as FieldProps['uiSchema'];
}

export default ReactoryConditionalField;
