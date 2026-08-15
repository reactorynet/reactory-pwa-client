import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MemoryFeatureFlagProvider, 
  ApiFeatureFlagProvider, 
  FeatureFlagConfiguration,
  ProviderConfig 
} from '@reactory/client-core/featureflags';
import Reactory from '@reactorynet/reactory-core';

export interface UseFeatureFlagOptions {
  /** Feature flag ID to check */
  featureId: string;
  /** Group ID for the feature flag (default: 'default') */
  groupId?: string;
  /** Context for context-aware feature flags */
  context?: Record<string, string>;
  /** Provider type - 'memory' or 'api' */
  providerType?: 'memory' | 'api';
  /** API configuration for API provider */
  apiConfig?: ProviderConfig;
  /** Static flags for memory provider */
  staticFlags?: FeatureFlagConfiguration[];
  /** Whether to enable caching (default: true) */
  enableCache?: boolean;
  /** Cache TTL in milliseconds (default: 60000) */
  cacheTTL?: number;
  /** Whether to show loading state (default: true) */
  showLoading?: boolean;
  /** Default value when feature flag is not found (default: false) */
  defaultValue?: boolean;
}

export interface UseFeatureFlagResult {
  /** Whether the feature flag is enabled */
  isEnabled: boolean;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Feature flag configuration if available */
  flag: any | null; // Use any to avoid type conflicts between interface and implementation
  /** Manually refresh the feature flag */
  refresh: () => Promise<void>;
  /** Update the feature flag context */
  updateContext: (context: Record<string, string>) => void;
}

// Stable reference defaults outside the hook to avoid recreating empty objects/arrays on every render
const DEFAULT_CONTEXT: Record<string, string> = {};
const DEFAULT_STATIC_FLAGS: FeatureFlagConfiguration[] = [];

/**
 * React hook for feature flag management
 * Supports both memory-based and API-based feature flag providers
 */
export const useFeatureFlag = (options: UseFeatureFlagOptions): UseFeatureFlagResult => {
  const {
    featureId,
    groupId = 'default',
    context,
    providerType = 'memory',
    apiConfig,
    staticFlags,
    enableCache = true,
    cacheTTL = 60000,
    showLoading = true,
    defaultValue = false
  } = options;

  // Memoize serialized context and staticFlags to preserve value equality across renders
  const serializedContext = useMemo(() => JSON.stringify(context || {}), [context]);
  const memoizedContext = useMemo(() => context || DEFAULT_CONTEXT, [serializedContext]);

  const serializedStaticFlags = useMemo(() => JSON.stringify(staticFlags || []), [staticFlags]);
  const memoizedStaticFlags = useMemo(() => staticFlags || DEFAULT_STATIC_FLAGS, [serializedStaticFlags]);

  const serializedApiConfig = useMemo(
    () => JSON.stringify(apiConfig ? { baseUrl: apiConfig.baseUrl, apiKey: apiConfig.apiKey, timeout: apiConfig.timeout } : null),
    [apiConfig]
  );

  const [isEnabled, setIsEnabled] = useState<boolean>(defaultValue);
  const [loading, setLoading] = useState<boolean>(showLoading);
  const [error, setError] = useState<Error | null>(null);
  const [flag, setFlag] = useState<any | null>(null);
  const [currentContext, setCurrentContext] = useState<Record<string, string>>(memoizedContext);

  // Sync external context to internal state only if content actually changed
  useEffect(() => {
    if (context) {
      setCurrentContext((prev) => {
        if (JSON.stringify(prev) === serializedContext) return prev;
        return context;
      });
    }
  }, [context, serializedContext]);

  // Create provider instance with stable dependencies
  const provider = useMemo(() => {
    try {
      if (providerType === 'api') {
        if (!apiConfig?.baseUrl) {
          throw new Error('API provider requires baseUrl configuration');
        }
        
        return new ApiFeatureFlagProvider({
          baseUrl: apiConfig.baseUrl,
          apiKey: apiConfig.apiKey,
          timeout: apiConfig.timeout || 10000,
          cacheEnabled: enableCache,
          cacheTTL: cacheTTL
        });
      } else {
        return new MemoryFeatureFlagProvider(memoizedStaticFlags);
      }
    } catch (err) {
      console.error('Failed to create feature flag provider:', err);
      return null;
    }
  }, [providerType, serializedApiConfig, memoizedStaticFlags, enableCache, cacheTTL]);

  // Serialized currentContext for callback stability
  const serializedCurrentContext = useMemo(() => JSON.stringify(currentContext), [currentContext]);

  // Initialize provider and check feature flag
  const checkFeatureFlag = useCallback(async () => {
    if (!provider) {
      setError(new Error('Provider not available'));
      if (showLoading) setLoading(false);
      return;
    }

    try {
      if (showLoading) setLoading(true);
      setError(null);

      // Initialize provider
      await provider.initialize();

      // Check if feature is enabled
      let enabled: boolean;
      if (providerType === 'api') {
        enabled = await (provider as ApiFeatureFlagProvider).isFeatureEnabledFromApi(
          featureId, 
          groupId, 
          currentContext
        );
      } else {
        enabled = provider.isFeatureEnabled(featureId, groupId, currentContext);
      }

      setIsEnabled((prev) => (prev === enabled ? prev : enabled));

      // Get feature flag configuration
      let flagConfig: any;
      if (providerType === 'api') {
        flagConfig = await (provider as ApiFeatureFlagProvider).getFeatureFlagFromApi(
          featureId, 
          groupId, 
          currentContext
        );
      } else {
        flagConfig = provider.getFeatureFlag(featureId, groupId, currentContext);
      }

      setFlag((prev: any) => (prev === flagConfig ? prev : flagConfig));
    } catch (err) {
      console.error('Failed to check feature flag:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIsEnabled(defaultValue);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [provider, providerType, featureId, groupId, serializedCurrentContext, defaultValue, showLoading]);

  // Refresh feature flag
  const refresh = useCallback(async () => {
    await checkFeatureFlag();
  }, [checkFeatureFlag]);

  // Update context
  const updateContext = useCallback((newContext: Record<string, string>) => {
    setCurrentContext(newContext);
  }, []);

  // Effect to check feature flag when dependencies change
  useEffect(() => {
    checkFeatureFlag();
  }, [checkFeatureFlag]);

  return {
    isEnabled,
    loading,
    error,
    flag,
    refresh,
    updateContext
  };
};

/**
 * Simplified hook for basic feature flag checks
 */
export const useSimpleFeatureFlag = (
  featureId: string, 
  context?: Record<string, string>
): { isEnabled: boolean; loading: boolean } => {
  const { isEnabled, loading } = useFeatureFlag({
    featureId,
    context,
    providerType: 'memory',
    showLoading: false
  });

  return { isEnabled, loading };
};

/**
 * Hook for API-based feature flags
 */
export const useApiFeatureFlag = (
  featureId: string,
  apiConfig: ProviderConfig,
  context?: Record<string, string>
): UseFeatureFlagResult => {
  return useFeatureFlag({
    featureId,
    context,
    providerType: 'api',
    apiConfig
  });
};

/**
 * Hook for memory-based feature flags with static configuration
 */
export const useMemoryFeatureFlag = (
  featureId: string,
  staticFlags: FeatureFlagConfiguration[],
  context?: Record<string, string>
): UseFeatureFlagResult => {
  return useFeatureFlag({
    featureId,
    context,
    providerType: 'memory',
    staticFlags
  });
};

export default useFeatureFlag;
