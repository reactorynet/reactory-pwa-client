import type { ErrorObject } from 'ajv';
import { keyForError, localizerFor } from '../../validator/localizer';
import { createMockReactorySDK } from '../../testing/mockReactorySDK';

const err = (partial: Partial<ErrorObject>): ErrorObject => ({
  keyword: 'required',
  instancePath: '',
  schemaPath: '',
  params: {},
  message: 'is required',
  ...partial,
});

describe('keyForError', () => {
  it('maps `required` to the namespaced key', () => {
    expect(keyForError(err({ keyword: 'required' }))).toBe('reactory.forms.validation.required');
  });

  it('maps `format` with a known format suffix', () => {
    expect(keyForError(err({ keyword: 'format', params: { format: 'email' } })))
      .toBe('reactory.forms.validation.format.email');
  });

  it('maps `format` without a format param to the bare key', () => {
    expect(keyForError(err({ keyword: 'format', params: {} })))
      .toBe('reactory.forms.validation.format');
  });

  it('maps `type` with a type suffix', () => {
    expect(keyForError(err({ keyword: 'type', params: { type: 'string' } })))
      .toBe('reactory.forms.validation.type.string');
  });

  it.each([
    'enum',
    'const',
    'minLength',
    'maxLength',
    'pattern',
    'minimum',
    'maximum',
    'exclusiveMinimum',
    'exclusiveMaximum',
    'multipleOf',
    'minItems',
    'maxItems',
    'uniqueItems',
    'minProperties',
    'maxProperties',
    'additionalProperties',
    'oneOf',
    'anyOf',
    'allOf',
    'not',
    'if',
  ] as const)('maps %s to a stable namespaced key', (keyword) => {
    expect(keyForError(err({ keyword }))).toBe(`reactory.forms.validation.${keyword}`);
  });

  it('maps an unknown keyword to the unknown bucket', () => {
    expect(keyForError(err({ keyword: 'someFutureKeyword' as any }))).toBe('reactory.forms.validation.unknown');
  });
});

describe('localizerFor', () => {
  it('returns a function', () => {
    const reactory = createMockReactorySDK();
    expect(typeof localizerFor(reactory)).toBe('function');
  });

  it('is a no-op when given null', () => {
    const reactory = createMockReactorySDK();
    expect(() => localizerFor(reactory)(null)).not.toThrow();
  });

  it('is a no-op when given undefined', () => {
    const reactory = createMockReactorySDK();
    expect(() => localizerFor(reactory)(undefined)).not.toThrow();
  });

  it('is a no-op when given an empty array', () => {
    const reactory = createMockReactorySDK();
    expect(() => localizerFor(reactory)([])).not.toThrow();
  });

  it('rewrites error.message to the translated value', () => {
    const reactory = createMockReactorySDK({
      translate: (key) => `[T:${key}]`,
    });
    const errors = [err({ keyword: 'required' })];
    localizerFor(reactory)(errors);
    expect(errors[0].message).toBe('[T:reactory.forms.validation.required]');
  });

  it('passes the original message as defaultValue', () => {
    const seen: Array<{ key: string; defaultValue: string | undefined }> = [];
    const reactory = createMockReactorySDK({
      translate: (key, opts) => {
        seen.push({ key, defaultValue: opts?.defaultValue as string | undefined });
        return (opts?.defaultValue as string | undefined) ?? key;
      },
    });
    const errors = [err({ message: 'must have property foo', keyword: 'required' })];
    localizerFor(reactory)(errors);
    expect(seen).toEqual([
      { key: 'reactory.forms.validation.required', defaultValue: 'must have property foo' },
    ]);
    expect(errors[0].message).toBe('must have property foo');
  });

  it('forwards error.params as translation interpolation values', () => {
    const seen: Array<{ key: string; opts: Record<string, unknown> | undefined }> = [];
    const reactory = createMockReactorySDK({
      translate: (key, opts) => {
        seen.push({ key, opts: opts as Record<string, unknown> });
        return key;
      },
    });
    localizerFor(reactory)([err({ keyword: 'minLength', params: { limit: 4 } })]);
    expect(seen[0].opts).toEqual(expect.objectContaining({ limit: 4, defaultValue: 'is required' }));
  });

  it('mutates each error in the array independently', () => {
    const reactory = createMockReactorySDK({
      translate: (key) => `T(${key})`,
    });
    const errors = [
      err({ keyword: 'required', message: 'A' }),
      err({ keyword: 'minLength', message: 'B', params: { limit: 3 } }),
    ];
    localizerFor(reactory)(errors);
    expect(errors[0].message).toBe('T(reactory.forms.validation.required)');
    expect(errors[1].message).toBe('T(reactory.forms.validation.minLength)');
  });

  it('handles errors with no message gracefully', () => {
    const reactory = createMockReactorySDK({ translate: (key, opts) => (opts?.defaultValue as string) || key });
    const errors = [err({ message: undefined, keyword: 'enum' })];
    localizerFor(reactory)(errors);
    // No defaultValue means we fall back to the key itself (mock translate behaviour).
    expect(errors[0].message).toBe('reactory.forms.validation.enum');
  });
});
