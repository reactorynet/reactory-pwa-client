/**
 * Session identity helpers for the API status payload.
 *
 * The server role-filters everything a caller can see, including the form list
 * (`ReactoryForms`). The client acquires an anonymous token during boot, so an
 * `apiStatus` of `API OK` is **not** evidence that a real user session exists —
 * it can (and on a cold load, does) describe the anonymous account. Fetching the
 * form list on that signal caches an ANON-scoped list for the five minute
 * `formSchemaLastFetch` window, which is exactly how `reactory.MyApplications`
 * disappeared from `MyApplications`.
 *
 * These helpers make the distinction explicit so callers can sequence a
 * role-scoped fetch after the session itself is known.
 */

type AnyRecord = Record<string, any>;

const readId = (context: any): string | undefined => {
  if (!context || typeof context !== 'object') return undefined;
  const id = context.id ?? context._id ?? context.user?.id ?? context.user?._id;
  return id === null || id === undefined ? undefined : `${id}`;
};

const readRoles = (context: any): string[] => {
  if (!context || typeof context !== 'object') return [];
  const roles = Array.isArray(context.roles)
    ? context.roles
    : Array.isArray(context.user?.roles)
      ? context.user.roles
      : [];
  return roles.filter((role) => typeof role === 'string');
};

const hasOnlyAnonRole = (roles: string[]): boolean =>
  roles.length > 0 && roles.every((role) => role === 'ANON');

/**
 * True when the status payload explicitly describes the anonymous account.
 *
 * This is deliberately *explicit* rather than inferred from the absence of a
 * user: partial/legacy status shapes are treated as authenticated so that a
 * caller that relies on this predicate never loses a legitimate fetch.
 */
export const isAnonymousApiStatus = (apiStatus: AnyRecord | null | undefined): boolean => {
  if (!apiStatus || typeof apiStatus !== 'object') return false;
  if (apiStatus.anon === true) return true;

  const loggedIn = apiStatus.loggedIn;
  if (loggedIn && typeof loggedIn === 'object') {
    if (readId(loggedIn) === 'anon') return true;
    if (hasOnlyAnonRole(readRoles(loggedIn))) return true;
  }

  if (hasOnlyAnonRole(readRoles(apiStatus))) return true;

  return false;
};

/**
 * True when `apiStatus` is a healthy status for an authenticated (non-ANON)
 * session. Only this shape may trigger a role-scoped form list fetch.
 */
export const isAuthenticatedApiStatus = (apiStatus: AnyRecord | null | undefined): boolean => {
  if (!apiStatus || typeof apiStatus !== 'object') return false;
  if (apiStatus.status !== 'API OK') return false;
  if (isAnonymousApiStatus(apiStatus)) return false;

  const loggedIn = apiStatus.loggedIn ?? apiStatus.user?.loggedIn;
  if (loggedIn === true) return true;
  if (loggedIn && typeof loggedIn === 'object') {
    // A real session always resolves to a concrete user id; `anon` is the only
    // synthetic id the server produces (see ApiStatus.loggedInContext).
    const id = readId(loggedIn);
    if (id && id !== 'anon') return true;
    return readRoles(loggedIn).some((role) => role !== 'ANON');
  }

  // Legacy/partial shapes (including the `user` object used by older clients)
  // fall back to the top-level roles, which the server also returns.
  const roles = readRoles(apiStatus);
  return roles.length > 0 && roles.some((role) => role !== 'ANON');
};
