import { v4 as uuidv4 } from 'uuid';
import { FeatureFlagProvider, FeatureFlagConfiguration, DEFAULT_GROUP_ID } from '../types';
import { FeatureFlagConfiguration as FeatureFlagConfigurationImpl } from '../models/FeatureFlagConfiguration';

/**
 * Abstract feature flag provider implementation
 * Mirrors the Java AbstractFeatureFlagProvider class
 */
export abstract class AbstractFeatureFlagProvider implements FeatureFlagProvider {
  private readonly _sessionId: string = uuidv4();
  private _flags: FeatureFlagConfiguration[] = [];
  private _initialized: boolean = false;

  /**
   * Returns the session id for the provider.
   * Use the session id to persist the feature flags for the session.
   */
  getSessionId(): string {
    return this._sessionId;
  }

  /**
   * Checks if a feature is enabled with various parameter combinations
   */
  isFeatureEnabled(featureId: string, groupIdOrContext?: string | Record<string, string>, context?: Record<string, string>): boolean {
    if (typeof groupIdOrContext === 'string') {
      // Called with (featureId, groupId, context?)
      const flag = this.getFeatureFlag(featureId, groupIdOrContext, context);
      return flag.isEnabled(context);
    } else if (groupIdOrContext && typeof groupIdOrContext === 'object') {
      // Called with (featureId, context)
      const flag = this.getFeatureFlag(featureId, groupIdOrContext);
      return flag.isEnabled(groupIdOrContext);
    } else {
      // Called with (featureId) only
      const flag = this.getFeatureFlag(featureId);
      return flag.isEnabled();
    }
  }

  /**
   * Returns a feature flag with various parameter combinations
   */
  getFeatureFlag(featureId: string, groupIdOrContext?: string | Record<string, string>, context?: Record<string, string>): FeatureFlagConfiguration {
    if (typeof groupIdOrContext === 'string') {
      // Called with (featureId, groupId, context?)
      return this.getFeatureFlagInternal(featureId, groupIdOrContext, context);
    } else if (groupIdOrContext && typeof groupIdOrContext === 'object') {
      // Called with (featureId, context)
      return this.getFeatureFlagInternal(featureId, DEFAULT_GROUP_ID, groupIdOrContext);
    } else {
      // Called with (featureId) only
      return this.getFeatureFlagInternal(featureId, DEFAULT_GROUP_ID, {});
    }
  }

  /**
   * Internal method to get feature flag with explicit parameters
   */
  private getFeatureFlagInternal(featureId: string, groupId: string, context?: Record<string, string>): FeatureFlagConfiguration {
    // Find matching flag
    const matchingFlag = this._flags.find(flag => {
      if (flag.featureId !== featureId || flag.groupId !== groupId) {
        return false;
      }

      // If context is provided, check if it matches
      if (context && Object.keys(context).length > 0) {
        const flagContext = flag.context;
        // Check if all provided context keys match the flag's context
        for (const [key, value] of Object.entries(context)) {
          if (flagContext[key] !== value) {
            return false;
          }
        }
        // Also check that the flag's context doesn't have extra keys that aren't in the provided context
        // This ensures exact matching when flag has context
        if (Object.keys(flagContext).length > 0) {
          for (const [key, value] of Object.entries(flagContext)) {
            if (!(key in context)) {
              return false;
            }
          }
        }
      }

      return true;
    });

    if (matchingFlag) {
      // Update statistics
      matchingFlag.flowStatistic.onRequested();
      return matchingFlag;
    }

    // Return default disabled flag if not found
    return new FeatureFlagConfigurationImpl(featureId, false, context || {}, 0, groupId);
  }

  /**
   * Returns all the feature flags.
   */
  getFlags(): FeatureFlagConfiguration[] {
    return [...this._flags];
  }

  /**
   * Returns all feature configurations that match the group id.
   */
  getFlagsForGroup(groupId: string): FeatureFlagConfiguration[] {
    return this._flags.filter(flag => flag.groupId === groupId);
  }

  /**
   * Returns all feature configurations that matches the key irrespective of group or context.
   */
  getFlagsWithFeatureId(featureId: string): FeatureFlagConfiguration[] {
    return this._flags.filter(flag => flag.featureId === featureId);
  }

  /**
   * Sets the flags for the provider.
   */
  setFlags(flags: FeatureFlagConfiguration[]): void {
    this._flags = [...flags];
  }

  /**
   * Initializes the feature flags store.
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    await this.doInitialize();
    this._initialized = true;
  }

  /**
   * Refreshes the feature flags store.
   */
  async refresh(): Promise<void> {
    await this.doRefresh();
  }

  /**
   * Abstract method to be implemented by concrete providers for initialization
   */
  protected abstract doInitialize(): Promise<void>;

  /**
   * Abstract method to be implemented by concrete providers for refresh
   */
  protected abstract doRefresh(): Promise<void>;

  /**
   * Helper method to add a flag to the internal store
   */
  protected addFlag(flag: FeatureFlagConfiguration): void {
    this._flags.push(flag);
  }

  /**
   * Helper method to clear all flags
   */
  protected clearFlags(): void {
    this._flags = [];
  }

  /**
   * Helper method to check if provider is initialized
   */
  protected isInitialized(): boolean {
    return this._initialized;
  }
} 