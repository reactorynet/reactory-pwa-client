/**
 * FQN resolution for the Reactory form engine adapter.
 *
 * Translates `ui:field` / `ui:widget` strings into resolved React components
 * via the Reactory SDK. The hot path is intentionally tiny — every form render
 * calls into this. Caching, event listening, and the Proxy-backed registry
 * surface live in `ReactoryRegistry.ts`; this module is just the parser +
 * SDK-call.
 *
 * See ADR-0003 for the architectural decision to do FQN resolution as a
 * registry adapter rather than overriding rjsf's SchemaField dispatcher.
 *
 * Accepted input forms:
 *   - "TextWidget"             → not a FQN; not handled here, return null
 *   - "core.MyField"           → FQN, resolve via reactory.getComponent
 *   - "core.MyField@1.0.0"     → FQN with version; version stripped + warned
 *   - "$GLOBAL$core.MyField"   → app-wide plugin prefix; stripped + warned
 *   - "$GLOBAL$core.MyField@1" → both prefix and version
 */

import * as React from 'react';

export type FqnKind = 'field' | 'widget';

export interface ResolveFqnDeps {
  /** The Reactory SDK instance (or any object with a getComponent method). */
  reactory: {
    getComponent<T = unknown>(fqn: string): T | undefined;
    debug?: (message: string, params?: unknown) => void;
    error?: (message: string, params?: unknown) => void;
  };
  /** Optional callback when a name fails to resolve. */
  onMiss?: (kind: FqnKind, name: string) => void;
}

const FQN_DOT = /\./;
const GLOBAL_PREFIX = '$GLOBAL$';

/**
 * Parsed shape of an FQN string. Returned by `parseFqn`; consumed by
 * `resolveFqn` and by tests that want to inspect the parser independently.
 */
export interface ParsedFqn {
  /** The original input. */
  input: string;
  /** True if the input contained a dot — i.e., looks like a FQN. */
  isFqn: boolean;
  /** The portion sent to `reactory.getComponent` (no prefix, no version). */
  resolvable: string;
  /** True if the `$GLOBAL$` prefix was stripped. */
  hadGlobalPrefix: boolean;
  /** Version segment if present, e.g. "1.0.0". */
  version: string | undefined;
}

/**
 * Pure FQN string parser. Does not call the SDK. Safe to memoize.
 */
export function parseFqn(name: string): ParsedFqn {
  let work = name;
  let hadGlobalPrefix = false;

  if (work.startsWith(GLOBAL_PREFIX)) {
    work = work.slice(GLOBAL_PREFIX.length);
    hadGlobalPrefix = true;
  }

  const at = work.lastIndexOf('@');
  let version: string | undefined;
  if (at > 0) {
    // The "@" must follow at least one character (avoid matching the start)
    // and must not be the last character (avoid empty version).
    const candidateVersion = work.slice(at + 1);
    if (candidateVersion.length > 0) {
      version = candidateVersion;
      work = work.slice(0, at);
    }
  }

  const isFqn = FQN_DOT.test(work);

  return {
    input: name,
    isFqn,
    resolvable: work,
    hadGlobalPrefix,
    version,
  };
}

/**
 * Resolve a FQN string to a React component via the Reactory SDK.
 *
 * Returns the component, or `null` if the input is not a FQN, the SDK reports
 * a miss, or the SDK throws.
 *
 * Non-FQN strings (no dot) return `null` immediately — those are handled by
 * the caller's local registry lookup.
 */
export function resolveFqn(
  deps: ResolveFqnDeps,
  name: string,
  kind: FqnKind,
): React.ComponentType<any> | null {
  if (typeof name !== 'string' || name.length === 0) {
    return null;
  }

  const parsed = parseFqn(name);

  if (!parsed.isFqn) {
    return null;
  }

  if (parsed.hadGlobalPrefix) {
    deps.reactory.debug?.(
      `[form-engine] resolveFqn: stripping $GLOBAL$ prefix from "${name}"; resolving as "${parsed.resolvable}".`,
    );
  }

  if (parsed.version !== undefined) {
    deps.reactory.debug?.(
      `[form-engine] resolveFqn: ignoring @version suffix on "${name}" (version pinning not yet enforced).`,
    );
  }

  let resolved: unknown;
  try {
    resolved = deps.reactory.getComponent(parsed.resolvable);
  } catch (err) {
    deps.reactory.error?.(`[form-engine] resolveFqn: SDK getComponent threw for "${parsed.resolvable}"`, err);
    deps.onMiss?.(kind, name);
    return null;
  }

  if (resolved === undefined || resolved === null) {
    deps.onMiss?.(kind, name);
    return null;
  }

  if (typeof resolved !== 'function' && typeof resolved !== 'object') {
    deps.reactory.error?.(
      `[form-engine] resolveFqn: SDK returned a non-component value for "${parsed.resolvable}" (typeof ${typeof resolved}).`,
    );
    deps.onMiss?.(kind, name);
    return null;
  }

  return resolved as React.ComponentType<any>;
}
