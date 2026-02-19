export const DEFAULT_GROUP_ID = 'default';

/**
 * Feature flag flow statistics tracking
 */
export interface FeatureFlagFlowStatistic {
  requestCount: number;
  executedCount: number;
  failedCount: number;
  successCount: number;
  lastExecution: Date;
  trackingSince: Date;
  
  onSuccess(): void;
  onFailed(): void;
  onRequested(): void;
  reset(): void;
  
  getFlowRate(): number;
  getFailureRate(): number;
  getSuccessRate(): number;
  getTPS(): number;
}

/**
 * Feature flag configuration interface
 */
export interface FeatureFlagConfiguration {
  featureId: string;
  description: string;
  groupId: string;
  enabled: boolean;
  context: Record<string, string>;
  flowRate: number;
  autoDisableErrorRate: number;
  autoDisableMinimumSamples: number;
  flowStatistic: FeatureFlagFlowStatistic;
  
  setEnabled(enabled: boolean): void;
  setFlowRate(flowRate: number): void;
  setContext(context: Record<string, string>): void;
  setGroupId(groupId: string): void;
  setAutoDisableErrorRate(rate: number): void;
  setAutoDisableMinimumSamples(samples: number): void;
  
  isEnabled(context?: Record<string, string>): boolean;
  validateFlowRate(): boolean;
  matches(other: FeatureFlagConfiguration): boolean;
}

/**
 * Feature evaluator interface
 */
export interface FeatureEvaluator {
  isEnabled(context?: Record<string, string>, feature?: FeatureFlagConfiguration): boolean;
}

/**
 * Feature flag provider interface - mirrors the Java FeatureFlagProvider
 */
export interface FeatureFlagProvider {
  /**
   * Returns the session id for the provider.
   * Use the session id to persist the feature flags for the session.
   */
  getSessionId(): string;

  /**
   * Checks if a feature is enabled given the name only.
   * @param featureId - feature id i.e. account-preferred-language
   * @returns boolean - true if the feature id is found and set to true, false for all other instances.
   */
  isFeatureEnabled(featureId: string): boolean;

  /**
   * Checks if a feature is enabled given a feature id and group id.
   * @param featureId - feature id i.e. account-preferred-language
   * @param groupId - a group id for the feature
   * @returns boolean - true if the feature id is found within the group id and is set to true
   */
  isFeatureEnabled(featureId: string, groupId: string): boolean;

  /**
   * Checks for the feature flag given the feature id and the context.
   * @param featureId - feature id i.e. kyc-account-preferred_language-persist
   * @param context - feature request context
   * @returns - true if the feature id is found and set to true, false for all
   */
  isFeatureEnabled(featureId: string, context?: Record<string, string>): boolean;

  /**
   * Checks for the feature flag given the feature id, group id and the context.
   * @param featureId - feature id i.e. kyc-account-preferred_language-persist
   * @param groupId - a group id for the feature
   * @param context - feature request context
   * @returns - true if the feature id is found and set to true, false for all
   */
  isFeatureEnabled(featureId: string, groupId: string, context?: Record<string, string>): boolean;

  /**
   * Returns a feature flag with the given the name and a empty context.
   * @param featureId - feature id. i.e. kyc-account-preferred-language-persist
   * @returns FeatureFlagConfiguration - returns a matching FeatureFlagConfiguration
   */
  getFeatureFlag(featureId: string): FeatureFlagConfiguration;

  /**
   * Returns a feature flag configuration element with the given feature id and group id
   * @param featureId - feature id i.e. account-preferred-language
   * @param groupId - a group id for the feature
   * @returns FeatureFlagConfiguration - returns a matching FeatureFlagConfiguration
   */
  getFeatureFlag(featureId: string, groupId: string): FeatureFlagConfiguration;

  /**
   * Returns a feature flag with the given the name and context.
   * @param featureId - feature id. i.e. kyc-account-preferred-language-persist
   * @param context - context map used to match
   * @returns FeatureFlagConfiguration
   */
  getFeatureFlag(featureId: string, context?: Record<string, string>): FeatureFlagConfiguration;

  /**
   * Returns a feature flag with the given the name, group id and context.
   * @param featureId - feature id. i.e. kyc-account-preferred-language-persist.
   * @param groupId - a group id for the feature
   * @param context - context map used to match.
   * @returns FeatureFlagConfiguration
   */
  getFeatureFlag(featureId: string, groupId: string, context?: Record<string, string>): FeatureFlagConfiguration;

  /**
   * Returns all the feature flags.
   * @returns returns list of flags configured for the provider, if empty returns an empty list
   */
  getFlags(): FeatureFlagConfiguration[];

  /**
   * Returns all feature configurations that match the group id.
   * @param groupId - Group Id to use for matching.
   * @returns - a list of FeatureFlagConfigurations.
   */
  getFlagsForGroup(groupId: string): FeatureFlagConfiguration[];

  /**
   * Returns all feature configurations that matches the key irrespective of group or context.
   * @param featureId - The feature id to use
   * @returns FeatureFlagConfiguration array
   */
  getFlagsWithFeatureId(featureId: string): FeatureFlagConfiguration[];

  /**
   * Sets the flags for the provider.
   * @param flags - list
   */
  setFlags(flags: FeatureFlagConfiguration[]): void;

  /**
   * Initializes the feature flags store.
   */
  initialize(): Promise<void>;

  /**
   * Refreshes the feature flags store.
   */
  refresh(): Promise<void>;
}

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

/**
 * API response interface for feature flags
 */
export interface FeatureFlagApiResponse {
  featureId: string;
  groupId: string;
  enabled: boolean;
  flowRate: number;
  autoDisableErrorRate: number;
  autoDisableMinimumSamples: number;
  context?: Record<string, string>;
  description?: string;
}

/**
 * Statistics API response interface
 */
export interface FeatureFlagStatisticsApiResponse {
  requestCount: number;
  executedCount: number;
  failedCount: number;
  successCount: number;
  flowRate: number;
  failureRate: number;
  successRate: number;
  tps: number;
  lastExecution: string;
  trackingSince: string;
} 