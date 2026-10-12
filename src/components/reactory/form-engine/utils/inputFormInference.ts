/**
 * inputFormInference — shared resolution + inference for "input parameter"
 * schemas.
 *
 * Extracted from the workflow QuickLauncher (`QuickLaunchDialog`), which
 * resolves the parameters a workflow (or component) accepts in a fixed order:
 *
 *   1. a registered React component named `<ns>.<name>InputForm@<version>`;
 *   2. a registered / GraphQL `ReactoryForm` under the same naming
 *      conventions (`InputForm`, `FormInput`), and
 *   3. failing both, a JSON schema **inferred** from the raw inputs object.
 *
 * The Application Route Editor reuses steps 2–3 for a route's `componentProps`:
 * when a `componentFqn` is set we try to resolve the component's input form; if
 * there is no FQN (or no form can be found) we infer the property shape from the
 * props already on the route — exactly the QuickLauncher's fallback behaviour.
 *
 * Keeping this in one place means the launcher and the route editor can never
 * drift apart in how they shape an inferred form.
 */

export interface InferredInputSchema {
  /** A JSON schema (`{ type: 'object', properties, required? }`). */
  schema: any;
  /** Default values harvested from the source (for form initialisation). */
  initialData: Record<string, any>;
}

export interface ResolvedInputSchema extends InferredInputSchema {
  /** Where the schema came from. */
  source: 'form' | 'component';
  /** The id/name of the matched form or component. */
  matchedId: string;
  /**
   * The matched form's uiSchema, if any. Callers that render the resolved
   * schema through a form engine MUST pass this through, otherwise the form's
   * tabs / widgets / layout are lost and it renders as a bare field list.
   */
  uiSchema?: Record<string, any>;
  /** The matched form's widgetMap (maps `ui:widget` names onto component FQNs). */
  widgetMap?: any[];
  /** The matched form's graph definition. */
  graphql?: any;
}

/** Loose shape of the Reactory SDK surface this module needs. */
export interface InputFormInferenceReactory {
  formSchemas?: any[];
  graphqlQuery?: (query: string, variables: Record<string, unknown>) => Promise<any>;
}

/** GraphQL query used to look a form definition up on the server. */
export const GET_FORM_BY_ID = `
  query GetFormById($id: String!) {
    ReactoryFormGetById(id: $id) {
      id
      name
      nameSpace
      version
      schema
      uiSchema
      defaultFormValue
    }
  }
`;

/** Coarse JSON-schema type for a raw value. */
export function scalarTypeOf(value: unknown): string {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (value && typeof value === 'object') return 'object';
  return 'string';
}

/**
 * Build a JSON schema (and matching default values) from a raw inputs object.
 *
 * Accepts either:
 *   - a JSON-schema fragment: `{ type: 'object', properties: { ... } }`, used
 *     as-is (defaults harvested from each property's `default`); or
 *   - a record whose values are either field descriptors
 *     (`{ title, type, description, default, enum, required }`) or plain
 *     default values (`{ retries: 3, dryRun: true }`).
 *
 * The descriptor branch intentionally mirrors the original QuickLauncher logic
 * (including its treatment of non-descriptor objects) so existing behaviour is
 * preserved.
 */
export function inferInputSchema(rawInputs: unknown): InferredInputSchema {
  const empty: InferredInputSchema = {
    schema: { type: 'object', properties: {} },
    initialData: {},
  };

  if (rawInputs == null || typeof rawInputs !== 'object') return empty;

  const raw = rawInputs as Record<string, any>;

  // Already a JSON schema fragment.
  if (raw.type === 'object' && raw.properties && typeof raw.properties === 'object') {
    const initialData: Record<string, any> = {};
    Object.keys(raw.properties).forEach((key) => {
      const def = raw.properties[key];
      if (def && def.default !== undefined) initialData[key] = def.default;
    });
    return { schema: raw, initialData };
  }

  const properties: Record<string, any> = {};
  const initialData: Record<string, any> = {};
  const required: string[] = [];

  Object.entries(raw).forEach(([key, val]) => {
    if (typeof val === 'object' && val !== null) {
      const descriptor = val as Record<string, any>;
      properties[key] = {
        title: descriptor.title || key,
        type:
          descriptor.type
          || (typeof descriptor.default === 'number'
            ? 'number'
            : typeof descriptor.default === 'boolean'
              ? 'boolean'
              : 'string'),
        description: descriptor.description,
        default: descriptor.default,
        ...(descriptor.enum ? { enum: descriptor.enum } : {}),
      };
      if (descriptor.default !== undefined) initialData[key] = descriptor.default;
      if (descriptor.required) required.push(key);
    } else {
      properties[key] = {
        title: key,
        type: scalarTypeOf(val),
        default: val,
      };
      initialData[key] = val;
    }
  });

  return {
    schema: {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
    },
    initialData,
  };
}

/** Split an FQN like `core.UserProfile@1.0.0` into its parts. */
export function parseFqn(fqn: string): { nameSpace: string; name: string; version?: string } | null {
  if (!fqn || typeof fqn !== 'string') return null;
  const [idPart, version] = fqn.split('@');
  const dot = idPart.indexOf('.');
  if (dot <= 0) return { nameSpace: '', name: idPart, version };
  return {
    nameSpace: idPart.slice(0, dot),
    name: idPart.slice(dot + 1),
    version,
  };
}

/**
 * Candidate form ids for a target, following the QuickLauncher conventions.
 * `core.UserProfile@1.0.0` → `core.UserProfile@1.0.0`,
 * `core.UserProfileInputForm@1.0.0`, `core.UserProfileFormInput@1.0.0`,
 * `core.UserProfileInputForm`, `core.UserProfileFormInput`.
 */
export function inputFormCandidates(targetId: string): string[] {
  if (!targetId) return [];
  const candidates = [targetId];
  const parts = parseFqn(targetId);
  if (parts && parts.name && parts.nameSpace) {
    const { nameSpace, name, version } = parts;
    if (version) {
      candidates.push(`${nameSpace}.${name}InputForm@${version}`);
      candidates.push(`${nameSpace}.${name}FormInput@${version}`);
    }
    candidates.push(`${nameSpace}.${name}InputForm`);
    candidates.push(`${nameSpace}.${name}FormInput`);
  }
  return Array.from(new Set(candidates));
}

/**
 * Resolve a form definition for `targetId`: look in the loaded `formSchemas`
 * first, then fall back to a GraphQL lookup for each candidate id.
 *
 * Returns the schema + default values, or `null` when nothing matches.
 */
export async function resolveInputFormSchema(
  reactory: InputFormInferenceReactory | undefined,
  targetId: string,
): Promise<ResolvedInputSchema | null> {
  if (!reactory || !targetId) return null;

  const candidates = inputFormCandidates(targetId);

  const toResult = (matched: any): ResolvedInputSchema | null => {
    const schema = matched?.schema;
    if (!schema) return null;
    return {
      schema,
      initialData: matched.defaultFormValue || {},
      source: 'form',
      matchedId: matched.id || matched.name || targetId,
      uiSchema: matched.uiSchema || {},
      widgetMap: matched.widgetMap,
      graphql: matched.graphql,
    };
  };

  // 1. Already-loaded form definitions.
  if (Array.isArray(reactory.formSchemas) && reactory.formSchemas.length > 0) {
    const matched = reactory.formSchemas.find((form: any) => {
      if (!form) return false;
      const fqn = form.nameSpace && form.name && form.version
        ? `${form.nameSpace}.${form.name}@${form.version}`
        : '';
      return (
        candidates.includes(form.id)
        || (fqn && candidates.includes(fqn))
        || candidates.includes(form.name)
      );
    });
    const result = toResult(matched);
    if (result) return result;
  }

  // 2. Server lookup, candidate by candidate.
  if (typeof reactory.graphqlQuery === 'function') {
    for (const candidateId of candidates) {
      try {
        const res: any = await reactory.graphqlQuery(GET_FORM_BY_ID, { id: candidateId });
        const result = toResult(res?.data?.ReactoryFormGetById);
        if (result) return result;
      } catch {
        // Try the next candidate.
      }
    }
  }

  return null;
}

/**
 * Resolve the property schema for a component/route:
 *
 *   - when a `componentFqn` is provided, try to resolve its input form; if that
 *     succeeds the form's schema is the property shape;
 *   - otherwise (no FQN, or no matching form) infer the shape from the props
 *     that already exist — the QuickLauncher fallback.
 */
export async function resolvePropsSchema(
  reactory: InputFormInferenceReactory | undefined,
  componentFqn: string | undefined,
  currentProps: Record<string, any> | undefined,
): Promise<{
  schema: any;
  initialData: Record<string, any>;
  source: 'form' | 'inferred';
  matchedId?: string;
  uiSchema: Record<string, any>;
  widgetMap?: any[];
  graphql?: any;
}> {
  if (componentFqn) {
    const resolved = await resolveInputFormSchema(reactory, componentFqn);
    if (resolved) {
      return {
        schema: resolved.schema,
        // Preserve any props already set on the route over the form defaults.
        initialData: { ...resolved.initialData, ...(currentProps || {}) },
        source: 'form',
        matchedId: resolved.matchedId,
        uiSchema: resolved.uiSchema || {},
        widgetMap: resolved.widgetMap,
        graphql: resolved.graphql,
      };
    }
  }

  const inferred = inferInputSchema(currentProps || {});
  return {
    schema: inferred.schema,
    initialData: inferred.initialData,
    source: 'inferred',
    uiSchema: {},
  };
}
