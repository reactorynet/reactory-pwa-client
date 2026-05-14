import { safeUrl, safeCDNUrl } from './safeUrl';

describe('safeUrl', () => {
  it('should join parts with a single slash', () => {
    expect(safeUrl(['http://example.com', 'api', 'users'])).toBe('http://example.com/api/users');
  });

  it('should collapse duplicate slashes but preserve protocol', () => {
    expect(safeUrl(['https://example.com//', '//api///', '/users//'])).toBe('https://example.com/api/users');
  });

  it('should strip trailing slashes', () => {
    expect(safeUrl(['http://example.com/'])).toBe('http://example.com');
  });

  it('should handle empty parts gracefully', () => {
    expect(safeUrl(['http://example.com', '', 'users'])).toBe('http://example.com/users');
  });
});

describe('safeCDNUrl', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // clears the cache
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should use REACT_APP_CDN if available', () => {
    process.env.REACT_APP_CDN = 'https://cdn.example.com';
    expect(safeCDNUrl('images/logo.png')).toBe('https://cdn.example.com/images/logo.png');
  });

  it('should fallback to CDN_ROOT if REACT_APP_CDN is not set', () => {
    delete process.env.REACT_APP_CDN;
    process.env.CDN_ROOT = 'https://cdn2.example.com';
    expect(safeCDNUrl('images/logo.png')).toBe('https://cdn2.example.com/images/logo.png');
  });

  it('should fallback to localhost if no env vars are set', () => {
    delete process.env.REACT_APP_CDN;
    delete process.env.CDN_ROOT;
    expect(safeCDNUrl('images/logo.png')).toBe('http://localhost:4000/cdn/images/logo.png');
  });
});
