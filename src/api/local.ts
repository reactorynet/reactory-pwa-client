import Reactory from "@reactorynet/reactory-core";

const REACTORY_APPLICATION_ANONUSER_EMAIL = process.env.REACT_APP_ANONUSER_EMAIL || 'anonymous@reactory.local';

/**
 * The default user when no user is logged is returned 
 * as the anon user.
 */
export const anonUser: Reactory.Models.IApiStatus = {
  id: '',
  firstName: 'Anonymous',
  lastName: 'User',
  avatar: '',
  email: REACTORY_APPLICATION_ANONUSER_EMAIL,
  anon: true,
  roles: ['ANON'],
  menus: [],
  loggedIn: null,
  status: 'API OK',
  when: new Date(),
  navigationComponents: [],
  activeTheme: null,
  routes: null,
  theme: null,
  applicationAvatar: '',
  applicationName: 'Reactory',
  applicationRoles: ['ANON'],
  colorSchemes: [],
  messages: [],
  plugins: [],
  publicKey: '',
  signature: '',
  themes: [],
};


export const storageKeys = {
  LoggedInUser: 'loggedInUser',
  AuthToken: 'auth_token',
  LastLoggedInEmail: '$reactory$last_logged_in_user',
  viewContext: '$rectory$viewContext',
  developmentMode: '$reactory.developmentMode',
  routeInspectorEnabled: '$reactory.routeInspector.enabled',
};

// ─── Per-client auth token storage ──────────────────────────────────────────
//
// Reactory is a multi-tenant host: one browser may hold concurrent sessions for
// several client applications. The auth token used to live under a single,
// application-agnostic `auth_token` key, which meant two applications sharing an
// origin (a reverse proxy under one host, or several tenants served from the
// same deployment) would overwrite each other's token. The application whose
// token was overwritten then presented a token minted for a *different* client,
// the server rejected it as a client mismatch, and the app rendered as logged
// out — with the two apps appearing to log each other out on reload.
//
// The token is now stored under a key scoped to the client that minted it, so an
// application can only ever read, overwrite or clear its own token.

/**
 * Resolve the client (tenant) key this bundle belongs to.
 *
 * `process.env.REACT_APP_CLIENT_KEY` is the build-time value and is exactly what
 * the client sends to the server as `x-client-key`, so it is authoritative. The
 * localStorage mirror (written at bootstrap) is only consulted as a fallback for
 * builds that cannot inline the env.
 */
export const resolveClientKey = (): string => {
  const fromEnv: any = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_CLIENT_KEY) || '';
  if (fromEnv) return `${fromEnv}`;
  try {
    return `${localStorage.getItem('REACT_APP_CLIENT_KEY') || ''}`;
  } catch {
    return '';
  }
};

/**
 * The localStorage key that holds the auth token **for one client**.
 *
 * With no client key available the legacy unscoped key is used, preserving the
 * previous behaviour for tooling and tests.
 */
export const authTokenStorageKey = (clientKey?: string): string => {
  const key = clientKey === undefined ? resolveClientKey() : clientKey;
  return key ? `${storageKeys.AuthToken}:${key}` : storageKeys.AuthToken;
};

const decodeBase64Utf8 = (base64: string): string => {
  // JWT segments omit base64 padding; `atob` rejects some unpadded lengths.
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  if (typeof atob === 'function') {
    const binary = atob(padded);
    try {
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    } catch {
      return binary;
    }
  }
  // Node / non-browser fallback (the client only ever runs in a browser).
  return Buffer.from(padded, 'base64').toString('utf8');
};

/**
 * Decode a JWT payload **without** verifying its signature.
 *
 * This is a client-side convenience only — the server is, and remains, the sole
 * authority on whether a token is valid. It exists so the client can avoid
 * adopting an obviously-expired token from a URL handoff.
 */
export const decodeJwtPayload = (token?: string | null): Record<string, any> | null => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeBase64Utf8(base64));
  } catch {
    return null;
  }
};

/** True when a bearer token is well-formed and not past its expiry. */
export const isTokenUsable = (token?: string | null): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  if (payload.exp === undefined || payload.exp === null) return true;
  const exp = typeof payload.exp === 'number' ? payload.exp : Date.parse(payload.exp);
  return Number.isFinite(exp) ? exp > Date.now() : true;
};

/**
 * Read this application's auth token.
 *
 * Falls back to — and one-time migrates — the legacy unscoped key so that an
 * upgrade does not sign every existing user out.
 */
export const readAuthToken = (clientKey?: string): string | null => {
  const key = authTokenStorageKey(clientKey);
  try {
    const scoped = localStorage.getItem(key);
    if (scoped) return scoped;

    if (key !== storageKeys.AuthToken) {
      const legacy = localStorage.getItem(storageKeys.AuthToken);
      if (legacy) {
        // Adopt the pre-scoping token once, then retire the shared key so it can
        // never vouch for — or be clobbered by — another client.
        localStorage.setItem(key, legacy);
        localStorage.removeItem(storageKeys.AuthToken);
        return legacy;
      }
    }
  } catch {
    // Storage unavailable (private mode / SSR) — behave as if no token exists.
  }
  return null;
};

/** Persist (or clear) this application's auth token under its own key. */
export const writeAuthToken = (token?: string | null, clientKey?: string): void => {
  try {
    const key = authTokenStorageKey(clientKey);
    if (token) localStorage.setItem(key, token);
    else localStorage.removeItem(key);
    // Never leave an unscoped token behind for another client to adopt.
    if (key !== storageKeys.AuthToken) localStorage.removeItem(storageKeys.AuthToken);
  } catch {
    // Storage unavailable — nothing we can do.
  }
};

/** Clear this application's token only — other clients keep theirs. */
export const clearAuthToken = (clientKey?: string): void => {
  try {
    localStorage.removeItem(authTokenStorageKey(clientKey));
  } catch {
    // Storage unavailable — nothing we can do.
  }
};

/**
 * The `client` claim of a bearer token, when it carries one.
 *
 * Returns `null` for tokens minted before the claim existed, or for tokens that
 * are not well-formed. The claim is signed, so it cannot be forged by a caller.
 */
export const tokenClientKey = (token?: string | null): string | null => {
  const payload = decodeJwtPayload(token);
  const client = payload?.client;
  return typeof client === 'string' && client.length > 0 ? client : null;
};

/**
 * Whether `token` may be adopted by the application identified by `clientKey`.
 *
 * A token that names a *different* client must never be adopted: presenting it
 * to this application would be refused by the server as a client mismatch and
 * silently degrade the session to anonymous. Tokens with no `client` claim
 * (minted before the claim existed, or out-of-band) are accepted — the server
 * remains the authority on whether their session is valid for this client.
 */
export const isTokenForClient = (token?: string | null, clientKey?: string): boolean => {
  const tokenClient = tokenClientKey(token);
  if (!tokenClient) return true;
  const key = clientKey === undefined ? resolveClientKey() : clientKey;
  if (!key) return true;
  return tokenClient === key;
};

// ─── Per-client persisted login snapshot ────────────────────────────────────
//
// The last status snapshot is likewise kept per client. Two applications sharing
// an origin would otherwise read each other's `loggedInUser` on first paint,
// briefly (or, before status resolves, persistently) showing the wrong user.

/** localStorage key that holds the persisted login snapshot for one client. */
export const loggedInUserStorageKey = (clientKey?: string): string => {
  const key = clientKey === undefined ? resolveClientKey() : clientKey;
  return key ? `${storageKeys.LoggedInUser}:${key}` : storageKeys.LoggedInUser;
};

/** Read this application's persisted login snapshot, migrating a legacy one once. */
export const readLoggedInUser = (clientKey?: string): any | null => {
  try {
    const key = loggedInUserStorageKey(clientKey);
    const scoped = localStorage.getItem(key);
    if (scoped) return JSON.parse(scoped);

    if (key !== storageKeys.LoggedInUser) {
      const legacy = localStorage.getItem(storageKeys.LoggedInUser);
      if (legacy) {
        localStorage.setItem(key, legacy);
        localStorage.removeItem(storageKeys.LoggedInUser);
        return JSON.parse(legacy);
      }
    }
  } catch {
    // Unavailable or unparseable storage — fall through to the anonymous user.
  }
  return null;
};

/** Persist (or clear) this application's login snapshot under its own key. */
export const writeLoggedInUser = (user: any, clientKey?: string): void => {
  try {
    const key = loggedInUserStorageKey(clientKey);
    if (user === null || user === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(user));
    // Never leave an unscoped snapshot behind for another client to adopt.
    if (key !== storageKeys.LoggedInUser) localStorage.removeItem(storageKeys.LoggedInUser);
  } catch {
    // Storage unavailable — nothing we can do.
  }
};

export const ReactoryLoggedInUser = () => {
  const parsedUser = readLoggedInUser();
  return parsedUser || anonUser;
}
