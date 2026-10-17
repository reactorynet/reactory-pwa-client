/**
 * Per-client auth token storage.
 *
 * These tests exist to keep the "logging into app B must not log me out of app A"
 * guarantee: an application must only ever read, overwrite or clear the token it
 * minted itself. The regression they guard against lived in a single, shared
 * `auth_token` localStorage key, which let two applications sharing an origin
 * clobber one another.
 */

import {
  storageKeys,
  authTokenStorageKey,
  readAuthToken,
  writeAuthToken,
  clearAuthToken,
  decodeJwtPayload,
  isTokenUsable,
  tokenClientKey,
  isTokenForClient,
  loggedInUserStorageKey,
  readLoggedInUser,
  writeLoggedInUser,
} from '../local';

const b64url = (value: string): string =>
  btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const makeToken = (payload: Record<string, any>): string =>
  `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify(payload))}.signature`;

describe('auth token storage — per-client scoping', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('authTokenStorageKey', () => {
    it('scopes the key to the client', () => {
      expect(authTokenStorageKey('reactory')).toBe(`${storageKeys.AuthToken}:reactory`);
      expect(authTokenStorageKey('compute-planner')).toBe(`${storageKeys.AuthToken}:compute-planner`);
    });

    it('uses the legacy unscoped key when there is no client key', () => {
      expect(authTokenStorageKey('')).toBe(storageKeys.AuthToken);
    });
  });

  describe('read / write / clear', () => {
    it('round-trips a token for a client', () => {
      writeAuthToken('token-a', 'reactory');
      expect(readAuthToken('reactory')).toBe('token-a');
    });

    it('keeps two clients\u2019 tokens independent', () => {
      writeAuthToken('token-a', 'reactory');
      writeAuthToken('token-b', 'compute-planner');

      expect(readAuthToken('reactory')).toBe('token-a');
      expect(readAuthToken('compute-planner')).toBe('token-b');
    });

    it('clearing one client does not touch another', () => {
      writeAuthToken('token-a', 'reactory');
      writeAuthToken('token-b', 'compute-planner');

      clearAuthToken('reactory');

      expect(readAuthToken('reactory')).toBeNull();
      expect(readAuthToken('compute-planner')).toBe('token-b');
    });

    it('overwriting one client never overwrites another', () => {
      writeAuthToken('token-a', 'reactory');
      writeAuthToken('token-b', 'compute-planner');
      writeAuthToken('token-a2', 'reactory');

      expect(readAuthToken('reactory')).toBe('token-a2');
      expect(readAuthToken('compute-planner')).toBe('token-b');
    });

    it('returns null when nothing is stored for the client', () => {
      expect(readAuthToken('reactory')).toBeNull();
    });
  });

  describe('legacy unscoped key migration', () => {
    it('adopts a pre-scoping token once and retires the shared key', () => {
      localStorage.setItem(storageKeys.AuthToken, 'legacy-token');

      expect(readAuthToken('reactory')).toBe('legacy-token');
      // Re-homed under the scoped key, and the shared key removed so it can no
      // longer vouch for — or be clobbered by — another client.
      expect(localStorage.getItem(authTokenStorageKey('reactory'))).toBe('legacy-token');
      expect(localStorage.getItem(storageKeys.AuthToken)).toBeNull();
    });

    it('prefers a scoped token over a stray legacy one', () => {
      localStorage.setItem(storageKeys.AuthToken, 'legacy-token');
      writeAuthToken('scoped-token', 'reactory');

      expect(readAuthToken('reactory')).toBe('scoped-token');
      expect(localStorage.getItem(storageKeys.AuthToken)).toBeNull();
    });

    it('never writes the legacy key when scoping', () => {
      writeAuthToken('token-a', 'reactory');

      expect(localStorage.getItem(storageKeys.AuthToken)).toBeNull();
      expect(localStorage.getItem(authTokenStorageKey('reactory'))).toBe('token-a');
    });
  });

  describe('handoff token validation', () => {
    it('decodes a JWT payload without verifying it', () => {
      const token = makeToken({ userId: '42', name: 'Werner Weber' });
      expect(decodeJwtPayload(token)).toEqual({ userId: '42', name: 'Werner Weber' });
    });

    it('rejects a malformed token', () => {
      expect(decodeJwtPayload('not-a-jwt')).toBeNull();
      expect(decodeJwtPayload('')).toBeNull();
      expect(decodeJwtPayload(null)).toBeNull();
      expect(isTokenUsable('not-a-jwt')).toBe(false);
    });

    it('accepts an unexpired token', () => {
      const token = makeToken({ userId: '42', exp: Date.now() + 60_000 });
      expect(isTokenUsable(token)).toBe(true);
    });

    it('rejects an expired token', () => {
      const token = makeToken({ userId: '42', exp: Date.now() - 60_000 });
      expect(isTokenUsable(token)).toBe(false);
    });

    it('treats a token with no expiry as usable', () => {
      const token = makeToken({ userId: '42' });
      expect(isTokenUsable(token)).toBe(true);
    });
  });

  describe('client claim', () => {
    it('reads the client a token was minted for', () => {
      expect(tokenClientKey(makeToken({ userId: '42', client: 'compute-planner' }))).toBe('compute-planner');
    });

    it('returns null when a token carries no client claim', () => {
      expect(tokenClientKey(makeToken({ userId: '42' }))).toBeNull();
      expect(tokenClientKey('not-a-jwt')).toBeNull();
    });

    it('accepts a token minted for this client', () => {
      const token = makeToken({ userId: '42', client: 'reactory' });
      expect(isTokenForClient(token, 'reactory')).toBe(true);
    });

    it('rejects a token minted for another client', () => {
      const token = makeToken({ userId: '42', client: 'reactory' });
      expect(isTokenForClient(token, 'compute-planner')).toBe(false);
    });

    it('accepts a pre-claim token and lets the server scope it', () => {
      expect(isTokenForClient(makeToken({ userId: '42' }), 'compute-planner')).toBe(true);
    });

    it('accepts anything when this build has no client key', () => {
      const token = makeToken({ userId: '42', client: 'reactory' });
      expect(isTokenForClient(token, '')).toBe(true);
    });
  });

  describe('per-client logged-in snapshot', () => {
    it('scopes the snapshot key to the client', () => {
      expect(loggedInUserStorageKey('reactory')).toBe(`${storageKeys.LoggedInUser}:reactory`);
      expect(loggedInUserStorageKey('')).toBe(storageKeys.LoggedInUser);
    });

    it('round-trips independently per client', () => {
      writeLoggedInUser({ id: 'a', firstName: 'A' }, 'reactory');
      writeLoggedInUser({ id: 'b', firstName: 'B' }, 'compute-planner');

      expect(readLoggedInUser('reactory')).toEqual({ id: 'a', firstName: 'A' });
      expect(readLoggedInUser('compute-planner')).toEqual({ id: 'b', firstName: 'B' });
    });

    it('clears only one client\u2019s snapshot', () => {
      writeLoggedInUser({ id: 'a' }, 'reactory');
      writeLoggedInUser({ id: 'b' }, 'compute-planner');

      writeLoggedInUser(null, 'reactory');

      expect(readLoggedInUser('reactory')).toBeNull();
      expect(readLoggedInUser('compute-planner')).toEqual({ id: 'b' });
    });

    it('adopts a legacy snapshot once and retires the shared key', () => {
      localStorage.setItem(storageKeys.LoggedInUser, JSON.stringify({ id: 'legacy' }));

      expect(readLoggedInUser('reactory')).toEqual({ id: 'legacy' });
      expect(localStorage.getItem(loggedInUserStorageKey('reactory'))).toBe(JSON.stringify({ id: 'legacy' }));
      expect(localStorage.getItem(storageKeys.LoggedInUser)).toBeNull();
    });

    it('never writes the shared snapshot key when scoping', () => {
      writeLoggedInUser({ id: 'a' }, 'reactory');
      expect(localStorage.getItem(storageKeys.LoggedInUser)).toBeNull();
    });
  });
});
