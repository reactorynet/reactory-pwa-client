import semver from 'semver';

/**
 * How a component FQN (`nameSpace.name@version`) maps to a registered
 * component. The version used to be parsed and then ignored: lookup was an
 * exact key match, so `core.Widget@1.2.0` was not found when `1.3.0` was
 * registered, and an unversioned FQN only ever meant `@1.0.0`.
 *
 * - An exact match wins.
 * - An unversioned FQN means `@1.0.0` when that is registered, as before;
 *   otherwise the highest registered version.
 * - A versioned FQN with no exact match takes the highest registered version
 *   compatible with it (same major, not lower: `^requested`).
 * - When versions are registered but none is compatible, `warn` mode (the
 *   default for one release) returns the highest with a warning; `strict`
 *   mode refuses. REACT_APP_FQN_VERSION_MODE=strict opts in now.
 */
export type FqnVersionMode = 'warn' | 'strict';

export const fqnVersionMode = (value: string | undefined = process.env.REACT_APP_FQN_VERSION_MODE): FqnVersionMode =>
  value === 'strict' ? 'strict' : 'warn';

export interface ComponentResolution {
  /** The register key to use, or null when nothing acceptable is registered. */
  key: string | null;
  /** Set when the FQN resolved to something other than an exact match. */
  note?: string;
  /** True when the note should reach the developer as a warning. */
  warn?: boolean;
}

const DEFAULT_VERSION = '1.0.0';

const asSemver = (version: string): string | null => {
  if (semver.valid(version)) return version;
  return semver.valid(semver.coerce(version));
};

/**
 * `register` is the component register itself: an exact hit is a property
 * lookup, and only a miss scans the keys, so the render path stays cheap.
 */
export const resolveComponentKey = (
  fqn: string,
  register: Record<string, unknown>,
  mode: FqnVersionMode = fqnVersionMode(),
): ComponentResolution => {
  const trimmed = fqn.trim();
  const at = trimmed.indexOf('@');
  const id = at > 0 ? trimmed.slice(0, at) : trimmed;
  const requested = at > 0 ? trimmed.slice(at + 1) : null;

  const exact = `${id}@${requested ?? DEFAULT_VERSION}`;
  if (register[exact]) return { key: exact };

  const prefix = `${id}@`;
  const candidates = Object.keys(register)
    .filter((key) => Boolean(register[key]))
    .filter((key) => key.startsWith(prefix))
    .map((key) => ({ key, version: asSemver(key.slice(prefix.length)) }))
    .filter((candidate): candidate is { key: string; version: string } => candidate.version !== null);
  if (candidates.length === 0) return { key: null };

  const highest = candidates.reduce((best, candidate) => (semver.gt(candidate.version, best.version) ? candidate : best));

  if (requested === null) {
    return { key: highest.key, note: `${id} has no @1.0.0; using ${highest.key}` };
  }

  const wanted = asSemver(requested);
  if (wanted) {
    const compatible = semver.maxSatisfying(candidates.map((c) => c.version), `^${wanted}`);
    if (compatible) {
      const key = candidates.find((c) => c.version === compatible).key;
      return { key, note: `${trimmed} resolved to compatible ${key}` };
    }
  }

  const registered = candidates.map((c) => c.key).join(', ');
  if (mode === 'strict') {
    return { key: null, note: `${trimmed} is not registered and no compatible version is (${registered})`, warn: true };
  }
  return {
    key: highest.key,
    note: `${trimmed} is not compatible with any registered version (${registered}); using ${highest.key}. Strict FQN version mode will refuse this.`,
    warn: true,
  };
};
