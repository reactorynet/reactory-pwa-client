/**
 * @jest-environment jsdom
 */
import {
  inferInputSchema,
  inputFormCandidates,
  parseFqn,
  resolveInputFormSchema,
  resolvePropsSchema,
  scalarTypeOf,
} from '../../utils/inputFormInference';

describe('scalarTypeOf', () => {
  it('maps primitive and structured values to JSON-schema types', () => {
    expect(scalarTypeOf('x')).toBe('string');
    expect(scalarTypeOf(3)).toBe('number');
    expect(scalarTypeOf(true)).toBe('boolean');
    expect(scalarTypeOf([1, 2])).toBe('array');
    expect(scalarTypeOf({ a: 1 })).toBe('object');
  });
});

describe('inferInputSchema', () => {
  it('passes a JSON-schema fragment through and harvests defaults', () => {
    const result = inferInputSchema({
      type: 'object',
      properties: {
        retries: { type: 'number', default: 3 },
        label: { type: 'string' },
      },
    });
    expect(result.schema.type).toBe('object');
    expect(result.schema.properties.retries.type).toBe('number');
    expect(result.initialData).toEqual({ retries: 3 });
  });

  it('infers a schema from a record of plain default values', () => {
    const result = inferInputSchema({ retries: 3, dryRun: true, name: 'x' });
    expect(result.schema.properties.retries).toMatchObject({ type: 'number', default: 3 });
    expect(result.schema.properties.dryRun).toMatchObject({ type: 'boolean', default: true });
    expect(result.schema.properties.name).toMatchObject({ type: 'string', default: 'x' });
    expect(result.initialData).toEqual({ retries: 3, dryRun: true, name: 'x' });
  });

  it('honours field descriptors, including enum and required', () => {
    const result = inferInputSchema({
      mode: { title: 'Mode', type: 'string', default: 'fast', enum: ['fast', 'slow'], required: true },
      note: { description: 'free text' },
    });
    expect(result.schema.properties.mode).toMatchObject({
      title: 'Mode',
      type: 'string',
      default: 'fast',
      enum: ['fast', 'slow'],
    });
    expect(result.schema.required).toEqual(['mode']);
    expect(result.initialData.mode).toBe('fast');
    // Descriptor without a type falls back to a string (QuickLauncher behaviour).
    expect(result.schema.properties.note.type).toBe('string');
  });

  it('returns an empty object schema for nullish input', () => {
    expect(inferInputSchema(null).schema).toEqual({ type: 'object', properties: {} });
    expect(inferInputSchema(undefined).initialData).toEqual({});
  });
});

describe('parseFqn / inputFormCandidates', () => {
  it('splits namespaced, versioned FQNs', () => {
    expect(parseFqn('core.UserProfile@1.0.0')).toEqual({
      nameSpace: 'core',
      name: 'UserProfile',
      version: '1.0.0',
    });
  });

  it('builds the InputForm / FormInput candidates (QuickLauncher conventions)', () => {
    expect(inputFormCandidates('core.UserProfile@1.0.0')).toEqual([
      'core.UserProfile@1.0.0',
      'core.UserProfileInputForm@1.0.0',
      'core.UserProfileFormInput@1.0.0',
      'core.UserProfileInputForm',
      'core.UserProfileFormInput',
    ]);
  });

  it('still derives unversioned candidates', () => {
    expect(inputFormCandidates('core.UserProfile')).toEqual([
      'core.UserProfile',
      'core.UserProfileInputForm',
      'core.UserProfileFormInput',
    ]);
  });

  it('returns no candidates for an empty target', () => {
    expect(inputFormCandidates('')).toEqual([]);
  });
});

describe('resolveInputFormSchema', () => {
  const target = 'core.Thing@1.0.0';
  const schema = { type: 'object', properties: { x: { type: 'string' } } };

  it('resolves from the loaded formSchemas by FQN', async () => {
    const reactory = {
      formSchemas: [
        {
          id: 'core.ThingInputForm@1.0.0',
          nameSpace: 'core',
          name: 'ThingInputForm',
          version: '1.0.0',
          schema,
          uiSchema: { 'ui:field': 'TabbedLayout' },
        },
      ],
    };
    const result = await resolveInputFormSchema(reactory, target);
    expect(result?.schema).toBe(schema);
    expect(result?.source).toBe('form');
    expect(result?.uiSchema).toEqual({ 'ui:field': 'TabbedLayout' });
  });
  it('falls back to a GraphQL lookup for each candidate', async () => {
    const graphqlQuery = jest.fn(async (_query: string, vars: any) => ({
      data: { ReactoryFormGetById: vars.id === 'core.ThingInputForm@1.0.0' ? { id: vars.id, schema } : null },
    }));
    const result = await resolveInputFormSchema({ graphqlQuery } as any, target);
    expect(result?.schema).toBe(schema);
    expect(result?.matchedId).toBe('core.ThingInputForm@1.0.0');
    // Tried the FQN itself first, then the InputForm candidate.
    expect(graphqlQuery.mock.calls.map((c) => c[1].id)).toContain('core.Thing@1.0.0');
    expect(graphqlQuery.mock.calls.map((c) => c[1].id)).toContain('core.ThingInputForm@1.0.0');
  });

  it('returns null when nothing matches', async () => {
    expect(await resolveInputFormSchema({ formSchemas: [] } as any, target)).toBeNull();
    expect(await resolveInputFormSchema(undefined, target)).toBeNull();
  });
});
describe('resolvePropsSchema', () => {
  it('uses the component input form when the FQN resolves, merging saved props over defaults', async () => {
    const reactory = {
      formSchemas: [
        {
          id: 'core.WidgetInputForm@1.0.0',
          nameSpace: 'core',
          name: 'WidgetInputForm',
          version: '1.0.0',
          schema: { type: 'object', properties: { size: { type: 'string', default: 'sm' } } },
          uiSchema: { 'ui:field': 'TabbedLayout' },
          defaultFormValue: { size: 'sm', theme: 'dark' },
        },
      ],
    };
    const result = await resolvePropsSchema(reactory as any, 'core.Widget@1.0.0', { size: 'lg' });
    expect(result.source).toBe('form');
    // Saved prop wins over the form default; form-only default is retained.
    expect(result.initialData).toEqual({ size: 'lg', theme: 'dark' });
    // The resolved form's presentation travels with the schema for the nested renderer.
    expect(result.uiSchema).toEqual({ 'ui:field': 'TabbedLayout' });
  });

  it('infers from current props when there is no FQN (QuickLauncher fallback)', async () => {
    const result = await resolvePropsSchema(undefined, '', { retries: 5 });
    expect(result.source).toBe('inferred');
    expect(result.schema.properties.retries).toMatchObject({ type: 'number', default: 5 });
    // Inferred schemas carry no layout.
    expect(result.uiSchema).toEqual({});
  });
  it('infers when an FQN is set but no input form exists', async () => {
    const result = await resolvePropsSchema({ formSchemas: [] } as any, 'core.Missing@1.0.0', { a: true });
    expect(result.source).toBe('inferred');
    expect(result.schema.properties.a.type).toBe('boolean');
  });
});
