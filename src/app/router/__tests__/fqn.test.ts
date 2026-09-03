import { ensureFqn, fqnMatches, nearbyRegistryFqns, parseFqnParts } from '../fqn';

describe('router fqn helpers', () => {
  it('normalizes missing versions to @1.0.0', () => {
    expect(ensureFqn('core.Home')).toBe('core.Home@1.0.0');
    expect(ensureFqn('core.Home@2.0.0')).toBe('core.Home@2.0.0');
  });

  it('matches versioned and unversioned FQNs', () => {
    expect(fqnMatches('core.Home@1.0.0', 'core.Home')).toBe(true);
    expect(fqnMatches('core.Home@2.0.0', 'core.Home@1.0.0')).toBe(false);
  });

  it('parses namespace, name and version', () => {
    expect(parseFqnParts('core.Home@1.0.0')).toEqual({
      nameSpace: 'core',
      name: 'Home',
      version: '1.0.0',
    });
  });

  it('finds nearby registry keys by name', () => {
    const nearby = nearbyRegistryFqns({
      'core.Home@1.0.0': {},
      'core.HomeHeader@1.0.0': {},
      'other.Thing@1.0.0': {},
    }, 'core.Home');
    expect(nearby).toEqual(['core.Home@1.0.0', 'core.HomeHeader@1.0.0']);
  });

  it('returns empty values for blank FQNs', () => {
    expect(ensureFqn('')).toBe('');
    expect(ensureFqn(null)).toBe('');
    expect(fqnMatches('', 'core.Home')).toBe(false);
    expect(parseFqnParts('')).toEqual({ nameSpace: '', name: '', version: '' });
    expect(parseFqnParts('Home')).toEqual({ nameSpace: '', name: 'Home', version: '1.0.0' });
    expect(nearbyRegistryFqns(undefined, 'core.Home')).toEqual([]);
    expect(nearbyRegistryFqns({}, '')).toEqual([]);
  });
});
