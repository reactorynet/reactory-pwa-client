/**
 * useReactoryFeatureFlag — synchronous-after-bootstrap reader for
 * Reactory feature flags resolved on the server side.
 *
 * Backed by the GraphQL `ReactoryEffectiveFeatureFlags` query which
 * returns the current partner's featureFlags filtered by the user's
 * role set. The Apollo client caches the response, so once it has
 * resolved any number of forms can read flag values for free.
 *
 * The hook returns `{ value, loading }`:
 *   - `loading` is true on first render until the query resolves.
 *   - `value` is the resolved boolean (or other primitive) once fetched,
 *     or the supplied `defaultValue` while still loading or when the
 *     flag is not declared / not enabled for the user.
 *
 * Note: the engine-selection layer (`EngineDispatchedForm`) treats the
 * absence of a flag as "use the legacy fork" — fail-safe default. So
 * forms render correctly through the loading window without flicker.
 *
 * The featureFqn is the same identifier authors set on
 * `formDef.options.engine` overrides (e.g. `core.FormsEngineV5@1.0.0`).
 */

import { useQuery } from '@apollo/client';
import gql from 'graphql-tag';

const REACTORY_EFFECTIVE_FEATURE_FLAGS = gql`
  query ReactoryEffectiveFeatureFlags {
    ReactoryEffectiveFeatureFlags {
      feature
      value
      enabled
      roles
    }
  }
`;

interface FlagValue {
  feature?: string;
  value?: unknown;
  enabled?: boolean;
  roles?: string[];
}

interface QueryResult {
  ReactoryEffectiveFeatureFlags?: FlagValue[];
}

export interface UseReactoryFeatureFlagResult<T = boolean> {
  /** Resolved value (or defaultValue while loading / when absent). */
  value: T;
  /** True until the first query response. */
  loading: boolean;
  /** Network error if any. */
  error: Error | null;
}

/**
 * Read a feature flag value for the current user. The first call kicks
 * off the GraphQL query; subsequent calls in the same render pass
 * (and across components) hit the Apollo cache.
 *
 * The featureFqn must match a flag declared in
 * `reactory-express-server/src/modules/reactory-core/index.ts` and
 * configured in the active client's
 * `clientConfigs/<client>/index.ts` featureFlags array.
 */
export function useReactoryFeatureFlag<T = boolean>(
  featureFqn: string,
  defaultValue: T,
): UseReactoryFeatureFlagResult<T> {
  const { data, loading, error } = useQuery<QueryResult>(
    REACTORY_EFFECTIVE_FEATURE_FLAGS,
    {
      // Cache-first by default; one network hit per app session, then free.
      fetchPolicy: 'cache-first',
    },
  );

  if (loading || error || !data?.ReactoryEffectiveFeatureFlags) {
    return { value: defaultValue, loading, error: error ?? null };
  }

  const flag = data.ReactoryEffectiveFeatureFlags.find((f) => f.feature === featureFqn);
  if (!flag) {
    return { value: defaultValue, loading: false, error: null };
  }

  // A flag is "on" when both enabled is not explicitly false AND value is truthy.
  // For boolean flags, value carries the resolved truthiness.
  if (typeof defaultValue === 'boolean') {
    const enabled = flag.enabled !== false;
    const truthy = flag.value === true || flag.value === 'true' || flag.value === 1;
    return {
      value: (enabled && truthy) as unknown as T,
      loading: false,
      error: null,
    };
  }

  return {
    value: (flag.value as T) ?? defaultValue,
    loading: false,
    error: null,
  };
}

/**
 * The FQN string for the forms-engine v5 flag. Imported by
 * EngineDispatchedForm so there's one source of truth for the name.
 */
export const FORMS_ENGINE_V5_FQN = 'core.FormsEngineV5@1.0.0';
