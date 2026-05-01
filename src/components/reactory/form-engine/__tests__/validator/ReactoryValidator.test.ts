import {
  createReactoryValidator,
  REACTORY_BUILT_IN_FORMATS,
} from '../../validator/ReactoryValidator';
import { createMockReactorySDK } from '../../testing/mockReactorySDK';

describe('createReactoryValidator', () => {
  it('returns a validator with the rjsf ValidatorType shape', () => {
    const reactory = createMockReactorySDK();
    const v = createReactoryValidator({ reactory });
    expect(typeof v.validateFormData).toBe('function');
    expect(typeof v.toErrorList).toBe('function');
    expect(typeof v.isValid).toBe('function');
  });

  it('reports zero errors for valid data', () => {
    const reactory = createMockReactorySDK();
    const v = createReactoryValidator({ reactory });
    const result = v.validateFormData(
      { name: 'wweber' },
      { type: 'object', properties: { name: { type: 'string' } } },
    );
    expect(result.errors).toEqual([]);
  });

  it('surfaces a `required` error with a localized message', () => {
    const reactory = createMockReactorySDK({
      translate: (key) => `T(${key})`,
    });
    const v = createReactoryValidator({ reactory });
    const result = v.validateFormData(
      {},
      { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
    );
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toBe('T(reactory.forms.validation.required)');
  });

  it('surfaces a `type` error with a typed sub-key', () => {
    const reactory = createMockReactorySDK({ translate: (key) => `T(${key})` });
    const v = createReactoryValidator({ reactory });
    const result = v.validateFormData(
      { age: 'not-a-number' },
      { type: 'object', properties: { age: { type: 'number' } } },
    );
    expect(result.errors[0].message).toContain('reactory.forms.validation.type');
  });

  it('respects user-supplied customFormats', () => {
    const reactory = createMockReactorySDK();
    const v = createReactoryValidator({
      reactory,
      customFormats: {
        'positive-int': (s: string) => /^[1-9]\d*$/.test(s),
      },
    });
    const schema = { type: 'string' as const, format: 'positive-int' };
    expect(v.validateFormData('42', schema).errors).toEqual([]);
    expect(v.validateFormData('-1', schema).errors.length).toBeGreaterThan(0);
  });

  it('lets user customFormats override built-ins on key conflict', () => {
    const reactory = createMockReactorySDK();
    const allowAnything: RegExp = /.*/;
    const v = createReactoryValidator({
      reactory,
      customFormats: { 'reactory-fqn': allowAnything },
    });
    const schema = { type: 'string' as const, format: 'reactory-fqn' };
    // Default reactory-fqn would reject "x"; the user override accepts anything.
    expect(v.validateFormData('x', schema).errors).toEqual([]);
  });

  it('disableLocalizer leaves AJV-supplied messages intact', () => {
    const reactory = createMockReactorySDK({
      translate: () => {
        throw new Error('translate should not be called when disabled');
      },
    });
    const v = createReactoryValidator({ reactory, disableLocalizer: true });
    const result = v.validateFormData(
      {},
      { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
    );
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toMatch(/required/);
  });
});

describe('REACTORY_BUILT_IN_FORMATS', () => {
  describe('reactory-fqn', () => {
    const re = REACTORY_BUILT_IN_FORMATS['reactory-fqn'];
    it.each([
      'core.MyField',
      'reactory.ReactoryNewForm',
      'core.MyField@1.0.0',
      'core.MyField@1.0.0-rc.1',
      'core.MyField@latest',
      'a.B-c',
    ])('accepts %s', (s) => {
      expect(re.test(s)).toBe(true);
    });

    it.each([
      '',
      'NoDot',
      '.startsWithDot',
      'endsWith.',
      '1.NumericNamespace',
      'Core.MyField', // namespace must start with lowercase
    ])('rejects %s', (s) => {
      expect(re.test(s)).toBe(false);
    });
  });

  describe('reactory-uuid', () => {
    const re = REACTORY_BUILT_IN_FORMATS['reactory-uuid'];
    it('accepts a valid v4 uuid', () => {
      expect(re.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });
    it('rejects malformed uuids', () => {
      expect(re.test('not-a-uuid')).toBe(false);
      expect(re.test('550e8400-e29b-41d4-a716-44665544000')).toBe(false); // short
      expect(re.test('550e8400e29b41d4a716446655440000')).toBe(false); // no dashes
    });
  });

  describe('reactory-tenant-id', () => {
    const re = REACTORY_BUILT_IN_FORMATS['reactory-tenant-id'];
    it.each(['acme', 'acme-corp', 'tenant-1'])('accepts %s', (s) => expect(re.test(s)).toBe(true));
    it.each(['', 'A', '1tenant', 'tenant_underscore'])('rejects %s', (s) => expect(re.test(s)).toBe(false));
  });

  describe('reactory-username', () => {
    const re = REACTORY_BUILT_IN_FORMATS['reactory-username'];
    it.each(['wweber', 'w.weber', 'w-weber', 'w_weber', 'WWeber99'])('accepts %s', (s) =>
      expect(re.test(s)).toBe(true),
    );
    it.each(['', 'a', 'has space', 'has@at', 'a'.repeat(65)])('rejects %s', (s) =>
      expect(re.test(s)).toBe(false),
    );
  });
});
