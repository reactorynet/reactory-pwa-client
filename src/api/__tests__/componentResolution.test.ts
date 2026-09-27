import { fqnVersionMode, resolveComponentKey } from '../componentResolution';

const register = (...keys: string[]): Record<string, unknown> =>
  Object.fromEntries(keys.map((key) => [key, { component: key }]));

describe('resolveComponentKey', () => {
  it('prefers an exact match', () => {
    expect(resolveComponentKey('core.Widget@1.2.0', register('core.Widget@1.2.0', 'core.Widget@1.3.0'))).toEqual({ key: 'core.Widget@1.2.0' });
  });

  it('reads an unversioned FQN as @1.0.0 when that is registered', () => {
    expect(resolveComponentKey('core.Widget', register('core.Widget@1.0.0', 'core.Widget@2.0.0'))).toEqual({ key: 'core.Widget@1.0.0' });
  });

  it('falls back to the highest version for an unversioned FQN with no @1.0.0', () => {
    const result = resolveComponentKey('core.Widget', register('core.Widget@1.4.0', 'core.Widget@2.1.0'));
    expect(result.key).toBe('core.Widget@2.1.0');
    expect(result.warn).toBeUndefined();
  });

  it('resolves a missing version to the highest compatible one', () => {
    const result = resolveComponentKey('core.Widget@1.2.0', register('core.Widget@1.3.0', 'core.Widget@1.10.0', 'core.Widget@2.0.0'));
    expect(result.key).toBe('core.Widget@1.10.0');
    expect(result.warn).toBeUndefined();
  });

  it('does not treat a lower minor version as compatible', () => {
    const result = resolveComponentKey('core.Widget@1.5.0', register('core.Widget@1.4.0'), 'strict');
    expect(result.key).toBeNull();
  });

  it('warns and uses the highest version on a mismatch in warn mode', () => {
    const result = resolveComponentKey('core.Widget@1.0.0', register('core.Widget@2.0.0', 'core.Widget@3.1.0'), 'warn');
    expect(result).toMatchObject({ key: 'core.Widget@3.1.0', warn: true });
    expect(result.note).toMatch(/not compatible/);
  });

  it('refuses a mismatch in strict mode', () => {
    const result = resolveComponentKey('core.Widget@1.0.0', register('core.Widget@2.0.0'), 'strict');
    expect(result).toMatchObject({ key: null, warn: true });
  });

  it('returns nothing when the component is not registered at all', () => {
    expect(resolveComponentKey('core.Missing@1.0.0', register('core.Widget@1.0.0'))).toEqual({ key: null });
  });

  it('does not confuse a name that shares a prefix', () => {
    expect(resolveComponentKey('core.Widget@1.0.0', register('core.WidgetList@1.2.0')).key).toBeNull();
  });

  it('ignores removed entries and non-semver versions', () => {
    const reg = { ...register('core.Widget@1.9.0', 'core.Widget@latest'), 'core.Widget@1.8.0': undefined };
    expect(resolveComponentKey('core.Widget@1.1.0', reg).key).toBe('core.Widget@1.9.0');
  });

  it('coerces short versions', () => {
    expect(resolveComponentKey('core.Widget@1', register('core.Widget@1.2.0')).key).toBe('core.Widget@1.2.0');
  });

  it('defaults to warn mode', () => {
    expect(fqnVersionMode(undefined)).toBe('warn');
    expect(fqnVersionMode('strict')).toBe('strict');
    expect(fqnVersionMode('STRICT-ish')).toBe('warn');
  });
});
