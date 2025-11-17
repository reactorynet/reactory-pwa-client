import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MemoryFeatureFlagProvider, 
  ApiFeatureFlagProvider, 
  FeatureFlagConfiguration,
  ProviderConfig 
} from '@zepz/feature-flags-ts';
import Reactory from '@reactory/reactory-core';

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

/**
 * React hook for feature flag management
 * Supports both memory-based and API-based feature flag providers
 */
export const useFeatureFlag = (options: UseFeatureFlagOptions): UseFeatureFlagResult => {
  const {
    featureId,
    groupId = 'default',
    context = {},
    providerType = 'memory',
    apiConfig,
    staticFlags = [],
    enableCache = true,
    cacheTTL = 60000,
    showLoading = true,
    defaultValue = false
  } = options;

  const [isEnabled, setIsEnabled] = useState<boolean>(defaultValue);
  const [loading, setLoading] = useState<boolean>(showLoading);
  const [error, setError] = useState<Error | null>(null);
  const [flag, setFlag] = useState<any | null>(null);
  const [currentContext, setCurrentContext] = useState<Record<string, string>>(context);

  // Create provider instance
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
        return new MemoryFeatureFlagProvider(staticFlags);
      }
    } catch (err) {
      console.error('Failed to create feature flag provider:', err);
      return null;
    }
  }, [providerType, apiConfig, staticFlags, enableCache, cacheTTL]);

  // Initialize provider and check feature flag
  const checkFeatureFlag = useCallback(async () => {
    if (!provider) {
      setError(new Error('Provider not available'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Initialize provider (no need to check isInitialized as it's protected)
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

      setIsEnabled(enabled);

      // Get feature flag configuration
      let flagConfig: any; // Use any to avoid type conflicts
      if (providerType === 'api') {
        flagConfig = await (provider as ApiFeatureFlagProvider).getFeatureFlagFromApi(
          featureId, 
          groupId, 
          currentContext
        );
      } else {
        flagConfig = provider.getFeatureFlag(featureId, groupId, currentContext);
      }

      setFlag(flagConfig);
    } catch (err) {
      console.error('Failed to check feature flag:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIsEnabled(defaultValue);
    } finally {
      setLoading(false);
    }
  }, [provider, providerType, featureId, groupId, currentContext, defaultValue]);

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

  // Effect to update context
  useEffect(() => {
    setCurrentContext(context);
  }, [context]);

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