import {
  isAnonymousApiStatus,
  isAuthenticatedApiStatus,
} from '../authStatus';

/**
 * The server's apiStatus answers `API OK` for the anonymous account too. These
 * helpers are what stop the client from fetching (and caching) an ANON-scoped
 * form list during a cold load while logged out.
 */
describe('authStatus', () => {
  const anonymousStatus = {
    status: 'API OK',
    anon: true,
    roles: ['ANON'],
    loggedIn: {
      id: 'anon',
      user: { id: 'anon', roles: ['ANON'] },
      roles: ['ANON'],
    },
  };

  const authenticatedStatus = {
    status: 'API OK',
    roles: ['USER', 'ADMIN'],
    loggedIn: {
      id: '64f1c2d3e4b0a1f2c3d4e5f6',
      user: { id: '64f1c2d3e4b0a1f2c3d4e5f6', roles: ['USER', 'ADMIN'] },
      roles: ['USER', 'ADMIN'],
    },
  };

  it('treats the ANON account as anonymous even though status is API OK', () => {
    expect(isAnonymousApiStatus(anonymousStatus)).toBe(true);
    expect(isAuthenticatedApiStatus(anonymousStatus)).toBe(false);
  });

  it('treats an anonUser-shaped status (anon flag, no loggedIn) as anonymous', () => {
    expect(isAnonymousApiStatus({ status: 'API OK', anon: true, loggedIn: null })).toBe(true);
    expect(isAuthenticatedApiStatus({ status: 'API OK', anon: true, loggedIn: null })).toBe(false);
  });

  it('recognises an authenticated session from the loggedIn context', () => {
    expect(isAnonymousApiStatus(authenticatedStatus)).toBe(false);
    expect(isAuthenticatedApiStatus(authenticatedStatus)).toBe(true);
  });

  it('does not mistake an offline status for an authenticated session', () => {
    expect(
      isAuthenticatedApiStatus({
        status: 'API OFFLINE',
        loggedIn: { id: '64f1c2d3e4b0a1f2c3d4e5f6', roles: ['USER'] },
      }),
    ).toBe(false);
  });

  it('treats unknown or missing status payloads as not authenticated', () => {
    expect(isAuthenticatedApiStatus(null)).toBe(false);
    expect(isAuthenticatedApiStatus(undefined)).toBe(false);
    expect(isAuthenticatedApiStatus({})).toBe(false);
  });

  it('supports the legacy boolean loggedIn flag', () => {
    expect(isAuthenticatedApiStatus({ status: 'API OK', loggedIn: true })).toBe(true);
  });

  it('falls back to top-level roles for partial status shapes', () => {
    expect(isAnonymousApiStatus({ status: 'API OK', roles: ['ANON'] })).toBe(true);
    expect(isAuthenticatedApiStatus({ status: 'API OK', roles: ['USER'] })).toBe(true);
  });

  it('treats a loggedIn context with roles but no user id as authenticated', () => {
    // Covers the `loggedIn.id`-absent branch: a partial context that only
    // carries roles must still count as a session.
    const partial = { status: 'API OK', loggedIn: { roles: ['USER'] } };
    expect(isAnonymousApiStatus(partial)).toBe(false);
    expect(isAuthenticatedApiStatus(partial)).toBe(true);
  });

  it('treats the synthetic "anon" id as anonymous even when a role is listed', () => {
    // The server's loggedInContext uses id 'anon' for anonymous callers; the
    // id must win over any other role present so an ANON list is never fetched
    // into an authenticated-looking cache.
    const contradictory = {
      status: 'API OK',
      loggedIn: { id: 'anon', roles: ['USER'] },
    };
    expect(isAnonymousApiStatus(contradictory)).toBe(true);
    expect(isAuthenticatedApiStatus(contradictory)).toBe(false);
  });

  it('treats a loggedIn context with only ANON roles as anonymous', () => {
    const anonRoles = { status: 'API OK', loggedIn: { id: 'someone', roles: ['ANON'] } };
    expect(isAnonymousApiStatus(anonRoles)).toBe(true);
    expect(isAuthenticatedApiStatus(anonRoles)).toBe(false);
  });
});
