import { AbstractFeatureFlagProvider } from './AbstractFeatureFlagProvider';
import { FeatureFlagConfiguration } from '../models/FeatureFlagConfiguration';

/**
 * Memory-based feature flag provider 
 * Used for static loading of feature flags
 */
export class MemoryFeatureFlagProvider extends AbstractFeatureFlagProvider {
  private _staticFlags: FeatureFlagConfiguration[] = [];

  constructor(flags?: FeatureFlagConfiguration[]) {
    super();
    if (flags) {
      this._staticFlags = [...flags];
      // Initialize immediately if flags are provided
      this.setFlags(this._staticFlags);
    }
  }

  /**
   * Initialize with static flags
   */
  protected async doInitialize(): Promise<void> {
    this.setFlags(this._staticFlags);
  }

  /**
   * Refresh does nothing for memory provider
   */
  protected async doRefresh(): Promise<void> {
    // Memory provider doesn't need refresh
  }

  /**
   * Add a static flag to the provider
   */
  addStaticFlag(flag: FeatureFlagConfiguration): void {
    this._staticFlags.push(flag);
    if (this.isInitialized()) {
      this.setFlags(this._staticFlags);
    }
  }

  /**
   * Add multiple static flags to the provider
   */
  addStaticFlags(flags: FeatureFlagConfiguration[]): void {
    this._staticFlags.push(...flags);
    if (this.isInitialized()) {
      this.setFlags(this._staticFlags);
    }
  }

  /**
   * Clear all static flags
   */
  clearStaticFlags(): void {
    this._staticFlags = [];
    if (this.isInitialized()) {
      this.setFlags([]);
    }
  }

  /**
   * Get all static flags
   */
  getStaticFlags(): FeatureFlagConfiguration[] {
    return [...this._staticFlags];
  }
} 