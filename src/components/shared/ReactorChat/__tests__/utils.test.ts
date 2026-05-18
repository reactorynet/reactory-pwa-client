import { toCamelCaseLabel, getSchemaFromArgs, getUiSchemaFromSchema } from '../utils';

describe('toCamelCaseLabel', () => {
  it('converts camelCase to spaced label', () => {
    expect(toCamelCaseLabel('camelCase')).toBe('Camel Case');
  });

  it('converts PascalCase to spaced label', () => {
    expect(toCamelCaseLabel('PascalCase')).toBe('Pascal Case');
  });

  it('handles consecutive uppercase (acronym boundary)', () => {
    expect(toCamelCaseLabel('AIModel')).toBe('AI Model');
  });

  it('handles already-spaced or single-word input', () => {
    expect(toCamelCaseLabel('hello')).toBe('Hello');
  });

  it('returns empty string for empty input', () => {
    expect(toCamelCaseLabel('')).toBe('');
  });

  it('returns empty string for falsy input', () => {
    expect(toCamelCaseLabel(null as any)).toBe('');
    expect(toCamelCaseLabel(undefined as any)).toBe('');
  });
});

describe('getSchemaFromArgs', () => {
  it('returns null for null input', () => {
    expect(getSchemaFromArgs(null)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(getSchemaFromArgs('string')).toBeNull();
    expect(getSchemaFromArgs(42)).toBeNull();
  });

  it('returns existing JSON schema unchanged when type+properties present', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    expect(getSchemaFromArgs(schema)).toBe(schema);
  });

  it('infers schema from a plain object with mixed types', () => {
    const args = {
      name: 'alice',
      age: 30,
      active: true,
      tags: ['a', 'b'],
      meta: { key: 'value' },
    };
    const result = getSchemaFromArgs(args);
    expect(result).toMatchObject({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        active: { type: 'boolean' },
        tags: { type: 'array' },
        meta: { type: 'object' },
      },
      required: ['name', 'age', 'active', 'tags', 'meta'],
    });
  });

  it('marks all inferred properties as required', () => {
    const result = getSchemaFromArgs({ x: 1, y: 2 });
    expect(result!.required).toEqual(expect.arrayContaining(['x', 'y']));
    expect(result!.required).toHaveLength(2);
  });
});

describe('getUiSchemaFromSchema', () => {
  it('returns empty object for null/non-object input', () => {
    expect(getUiSchemaFromSchema(null)).toEqual({});
    expect(getUiSchemaFromSchema('str')).toEqual({});
  });

  it('returns base uiSchema for empty object', () => {
    const result = getUiSchemaFromSchema({});
    expect(result['ui:form']).toBeDefined();
    expect(result['ui:form'].showSubmit).toBe(true);
  });

  it('maps array fields to select widget', () => {
    const result = getUiSchemaFromSchema({ tags: ['a'] });
    expect(result['tags']).toEqual({ 'ui:widget': 'select' });
  });

  it('maps number fields to updown widget', () => {
    const result = getUiSchemaFromSchema({ count: 5 });
    expect(result['count']).toEqual({ 'ui:widget': 'updown' });
  });

  it('maps boolean fields to checkbox widget', () => {
    const result = getUiSchemaFromSchema({ enabled: false });
    expect(result['enabled']).toEqual({ 'ui:widget': 'checkbox' });
  });

  it('maps object fields to object widget', () => {
    const result = getUiSchemaFromSchema({ nested: { a: 1 } });
    expect(result['nested']).toEqual({ 'ui:widget': 'object' });
  });

  it('leaves string fields without a specific widget override', () => {
    const result = getUiSchemaFromSchema({ name: 'Alice' });
    expect(result['name']).toBeUndefined();
  });
});
