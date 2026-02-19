import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { AbstractFeatureFlagProvider } from './AbstractFeatureFlagProvider';
import { FeatureFlagConfiguration } from '../models/FeatureFlagConfiguration';
import { ProviderConfig, FeatureFlagApiResponse, FeatureFlagStatisticsApiResponse, DEFAULT_GROUP_ID } from '../types';

/**
 * API-based feature flag provider
 * Mirrors the Java RedisFeatureFlagProvider class
 * Used for remote API loading of feature flags
 */
export class ApiFeatureFlagProvider extends AbstractFeatureFlagProvider {
  private readonly _config: ProviderConfig;
  private readonly _httpClient: AxiosInstance;
  private _cache: Map<string, FeatureFlagConfiguration> = new Map();
  private _cacheExpiry: Map<string, number> = new Map();

  constructor(config: ProviderConfig) {
    super();
    this._config = {
      baseUrl: 'http://localhost:8080',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      cacheEnabled: true,
      cacheTTL: 30000, // 30 seconds
      ...config
    };

    this._httpClient = axios.create({
      baseURL: this._config.baseUrl,
      timeout: this._config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this._config.apiKey && { 'Authorization': `Bearer ${this._config.apiKey}` })
      }
    });
  }

  /**
   * Initialize by loading flags from API
   */
  protected async doInitialize(): Promise<void> {
    await this.loadFlagsFromApi();
  }

  /**
   * Refresh flags from API
   */
  protected async doRefresh(): Promise<void> {
    await this.loadFlagsFromApi();
  }

  /**
   * Load all flags from API
   */
  private async loadFlagsFromApi(): Promise<void> {
    try {
      const response = await this._httpClient.get<FeatureFlagApiResponse[]>(`/v1/${DEFAULT_GROUP_ID}/features`);
      const flags = response.data.map(this.mapApiResponseToConfiguration);
      this.setFlags(flags);
    } catch (error) {
      console.error('Failed to load feature flags from API:', error);
      // Keep existing flags if API fails
    }
  }

  /**
   * Get feature flag from API with caching
   */
  async getFeatureFlagFromApi(featureId: string, groupId: string = DEFAULT_GROUP_ID, context?: Record<string, string>): Promise<FeatureFlagConfiguration> {
    const cacheKey = this.buildCacheKey(featureId, groupId, context);
    
    // Check cache first
    if (this._config.cacheEnabled && this.isCacheValid(cacheKey)) {
      const cached = this._cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const params = context ? new URLSearchParams(context) : undefined;
      const response = await this._httpClient.get<FeatureFlagApiResponse>(
        `/v1/${groupId}/features/${featureId}`,
        { params }
      );

      const flag = this.mapApiResponseToConfiguration(response.data);
      
      // Cache the result
      if (this._config.cacheEnabled) {
        this.cacheFlag(cacheKey, flag);
      }

      return flag;
    } catch (error) {
      console.error(`Failed to get feature flag ${featureId} from API:`, error);
      // Return default disabled flag if API fails
      return new FeatureFlagConfiguration(featureId, false, context || {}, 0, groupId);
    }
  }

  /**
   * Get feature flag statistics from API
   */
  async getFeatureFlagStatistics(featureId: string, groupId: string = DEFAULT_GROUP_ID, context?: Record<string, string>): Promise<FeatureFlagStatisticsApiResponse> {
    try {
      const params = context ? new URLSearchParams(context) : undefined;
      const response = await this._httpClient.get<FeatureFlagStatisticsApiResponse>(
        `/v1/${groupId}/features/${featureId}/stats`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to get feature flag statistics for ${featureId}:`, error);
      throw error;
    }
  }

  /**
   * Check if feature is enabled via API
   */
  async isFeatureEnabledFromApi(featureId: string, groupId: string = DEFAULT_GROUP_ID, context?: Record<string, string>): Promise<boolean> {
    try {
      const params = context ? new URLSearchParams(context) : undefined;
      const response = await this._httpClient.get<boolean>(
        `/v1/${groupId}/features/${featureId}/enabled`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to check if feature ${featureId} is enabled:`, error);
      return false;
    }
  }

  /**
   * Update feature flag via API
   */
  async updateFeatureFlag(featureId: string, groupId: string = DEFAULT_GROUP_ID, updates: Partial<FeatureFlagConfiguration>, context?: Record<string, string>): Promise<FeatureFlagConfiguration> {
    try {
      const params = context ? new URLSearchParams(context) : undefined;
      const response = await this._httpClient.patch<FeatureFlagApiResponse>(
        `/v1/${groupId}/features/${featureId}`,
        updates,
        { params }
      );

      const updatedFlag = this.mapApiResponseToConfiguration(response.data);
      
      // Clear cache for this flag
      const cacheKey = this.buildCacheKey(featureId, groupId, context);
      this.clearCacheKey(cacheKey);

      return updatedFlag;
    } catch (error) {
      console.error(`Failed to update feature flag ${featureId}:`, error);
      throw error;
    }
  }

  /**
   * Map API response to FeatureFlagConfiguration
   */
  private mapApiResponseToConfiguration(response: FeatureFlagApiResponse): FeatureFlagConfiguration {
    return new FeatureFlagConfiguration(
      response.featureId,
      response.enabled,
      response.context || {},
      response.flowRate,
      response.groupId,
      response.autoDisableErrorRate,
      response.autoDisableMinimumSamples
    );
  }

  /**
   * Build cache key for a feature flag
   */
  private buildCacheKey(featureId: string, groupId: string, context?: Record<string, string>): string {
    const contextStr = context ? JSON.stringify(context) : '';
    return `${groupId}:${featureId}:${contextStr}`;
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(cacheKey: string): boolean {
    const expiry = this._cacheExpiry.get(cacheKey);
    return expiry ? Date.now() < expiry : false;
  }

  /**
   * Cache a feature flag
   */
  private cacheFlag(cacheKey: string, flag: FeatureFlagConfiguration): void {
    this._cache.set(cacheKey, flag);
    this._cacheExpiry.set(cacheKey, Date.now() + (this._config.cacheTTL || 30000));
  }

  /**
   * Clear cache for a specific key
   */
  private clearCacheKey(cacheKey: string): void {
    this._cache.delete(cacheKey);
    this._cacheExpiry.delete(cacheKey);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this._cache.clear();
    this._cacheExpiry.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this._cache.size,
      keys: Array.from(this._cache.keys())
    };
  }
} 