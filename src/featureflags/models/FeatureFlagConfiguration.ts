import { DEFAULT_GROUP_ID, FeatureFlagConfiguration as IFeatureFlagConfiguration, FeatureEvaluator } from '../types';
import { FeatureFlagFlowStatistic } from './FeatureFlagFlowStatistic';

/**
 * Feature flag configuration implementation
 * Mirrors the Java FeatureFlagConfiguration class
 */
export class FeatureFlagConfiguration implements IFeatureFlagConfiguration, FeatureEvaluator {
  private _featureId: string = 'null-feature';
  private _description: string = '';
  private _groupId: string = DEFAULT_GROUP_ID;
  private _enabled: boolean = false;
  private _context: Record<string, string> = {};
  private _flowRate: number = 100.0;
  private _autoDisableErrorRate: number = -1.0;
  private _autoDisableMinimumSamples: number = 100;
  private readonly _flowStatistic: FeatureFlagFlowStatistic = new FeatureFlagFlowStatistic();

  constructor();
  constructor(featureId: string, enabled: boolean);
  constructor(featureId: string, enabled: boolean, context: Record<string, string>);
  constructor(featureId: string, enabled: boolean, context: Record<string, string>, flowRate: number);
  constructor(featureId: string, enabled: boolean, context: Record<string, string>, flowRate: number, groupId: string);
  constructor(
    featureId: string,
    enabled: boolean,
    context: Record<string, string>,
    flowRate: number,
    groupId: string,
    autoDisableErrorRate: number,
    autoDisableMinimumSamples: number
  );
  constructor(
    featureId?: string,
    enabled?: boolean,
    context?: Record<string, string>,
    flowRate?: number,
    groupId?: string,
    autoDisableErrorRate?: number,
    autoDisableMinimumSamples?: number
  ) {
    if (featureId !== undefined) {
      this._featureId = featureId;
      this._description = featureId;
    }
    if (enabled !== undefined) {
      this._enabled = enabled;
    }
    if (context !== undefined) {
      this._context = { ...context };
    }
    if (flowRate !== undefined) {
      this._flowRate = flowRate;
    }
    if (groupId !== undefined) {
      this._groupId = groupId;
    }
    if (autoDisableErrorRate !== undefined) {
      this._autoDisableErrorRate = autoDisableErrorRate;
    }
    if (autoDisableMinimumSamples !== undefined) {
      this._autoDisableMinimumSamples = autoDisableMinimumSamples;
    }
  }

  get featureId(): string {
    return this._featureId;
  }

  get description(): string {
    return this._description;
  }

  get groupId(): string {
    return this._groupId;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  get context(): Record<string, string> {
    return { ...this._context };
  }

  get flowRate(): number {
    return this._flowRate;
  }

  get autoDisableErrorRate(): number {
    return this._autoDisableErrorRate;
  }

  get autoDisableMinimumSamples(): number {
    return this._autoDisableMinimumSamples;
  }

  get flowStatistic(): FeatureFlagFlowStatistic {
    return this._flowStatistic;
  }

  setFeatureId(featureId: string): void {
    this._featureId = featureId;
  }

  setDescription(description: string): void {
    this._description = description;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  setContext(context: Record<string, string>): void {
    this._context = { ...context };
  }

  setGroupId(groupId: string): void {
    this._groupId = groupId;
  }

  setFlowRate(flowRate: number): void {
    this._flowRate = flowRate;
  }

  setAutoDisableErrorRate(rate: number): void {
    this._autoDisableErrorRate = rate;
  }

  setAutoDisableMinimumSamples(samples: number): void {
    this._autoDisableMinimumSamples = samples;
  }

  /**
   * Checks if the feature is enabled with optional context
   */
  isEnabled(context?: Record<string, string>): boolean {
    if (!this._enabled) {
      return false;
    }

    if (context && Object.keys(context).length > 0) {
      // Check if context matches
      for (const [key, value] of Object.entries(context)) {
        if (this._context[key] !== value) {
          return false;
        }
      }
    }

    return this.validateFlowRate();
  }

  /**
   * Validates flow rate without considering error rate
   */
  private validateFlowRateWithoutErrorRate(): boolean {
    if (this._flowRate === 100.0) {
      return true;
    }
    // For flow rate control, we need to check if we should allow this request
    // This is a simplified implementation - in practice, you might use a more sophisticated algorithm
    const currentFlowRate = this._flowStatistic.getFlowRate();
    if (currentFlowRate === -1) {
      // No requests yet, allow
      return true;
    }
    // Allow if current flow rate is less than the configured flow rate
    return currentFlowRate <= this._flowRate;
  }

  /**
   * Validates flow rate considering auto-disable error rate
   */
  validateFlowRate(): boolean {
    // -1 means that the feature is always enabled
    // irrespective of the number of errors encountered
    if (this._autoDisableErrorRate === -1.0) {
      return this.validateFlowRateWithoutErrorRate();
    } else {
      const failureRate = this._flowStatistic.getFailureRate();
      const executedCount = this._flowStatistic.executedCount;
      
      // If the error rate is greater than the autoDisableErrorRate
      // then the feature must be disabled only if the number of samples
      // is greater than the autoDisableMinimumSamples
      if (failureRate > this._autoDisableErrorRate) {
        if (executedCount < this._autoDisableMinimumSamples) {
          // Below minimum samples, so auto-disable doesn't apply yet
          // In this case, we should still check flow rate
          return this.validateFlowRateWithoutErrorRate();
        } else {
          // Above minimum samples and failure rate exceeds threshold
          return false;
        }
      } else {
        // Failure rate is acceptable, check flow rate
        return this.validateFlowRateWithoutErrorRate();
      }
    }
  }

  /**
   * Checks if this configuration matches another configuration
   */
  matches(other: FeatureFlagConfiguration): boolean {
    return (
      this._featureId === other.featureId &&
      this._groupId === other.groupId &&
      JSON.stringify(this._context) === JSON.stringify(other.context)
    );
  }

  /**
   * Feature evaluator implementation
   */
  isEnabledForFeature(context?: Record<string, string>, feature?: FeatureFlagConfiguration): boolean {
    const targetFeature = feature || this;
    return targetFeature.isEnabled(context);
  }

  /**
   * Builder pattern for creating feature flag configurations
   */
  static Builder = class {
    public _featureId: string = 'null-feature';
    public _groupId: string = 'default';
    public _description: string = '';
    public _enabled: boolean = false;
    public _context: Record<string, string> = {};
    public _flowRate: number = 100.0;
    public _autoDisableErrorRate: number = -1.0;
    public _autoDisableMinimumSamples: number = 100;

    withFeatureId(featureId: string): this {
      this._featureId = featureId;
      return this;
    }

    withDescription(description: string): this {
      this._description = description;
      return this;
    }

    withEnabled(enabled: boolean): this {
      this._enabled = enabled;
      return this;
    }

    withContext(context: Record<string, string>): this {
      this._context = { ...context };
      return this;
    }

    withFlowRate(flowRate: number): this {
      this._flowRate = flowRate;
      return this;
    }

    withGroupId(groupId: string): this {
      this._groupId = groupId;
      return this;
    }

    withAutoDisableErrorRate(autoDisableErrorRate: number): this {
      this._autoDisableErrorRate = autoDisableErrorRate;
      return this;
    }

    withAutoDisableMinimumSamples(autoDisableMinimumSamples: number): this {
      this._autoDisableMinimumSamples = autoDisableMinimumSamples;
      return this;
    }

    build(): FeatureFlagConfiguration {
      const config = new FeatureFlagConfiguration(
        this._featureId,
        this._enabled,
        this._context,
        this._flowRate,
        this._groupId,
        this._autoDisableErrorRate,
        this._autoDisableMinimumSamples
      );
      config.setDescription(this._description);
      return config;
    }
  };

  equals(other: any): boolean {
    if (this === other) return true;
    if (!(other instanceof FeatureFlagConfiguration)) return false;
    
    return (
      this._featureId === other._featureId &&
      this._groupId === other._groupId &&
      this._enabled === other._enabled &&
      JSON.stringify(this._context) === JSON.stringify(other._context) &&
      this._flowRate === other._flowRate &&
      this._autoDisableErrorRate === other._autoDisableErrorRate &&
      this._autoDisableMinimumSamples === other._autoDisableMinimumSamples
    );
  }

  hashCode(): number {
    let hash = 17;
    hash = 31 * hash + this._featureId.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    hash = 31 * hash + this._groupId.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    hash = 31 * hash + (this._enabled ? 1 : 0);
    hash = 31 * hash + JSON.stringify(this._context).split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    hash = 31 * hash + this._flowRate.toString().split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    hash = 31 * hash + this._autoDisableErrorRate.toString().split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    hash = 31 * hash + this._autoDisableMinimumSamples;
    return hash;
  }

  toString(): string {
    return `FeatureFlagConfiguration{featureId='${this._featureId}', description='${this._description}', groupId='${this._groupId}', enabled=${this._enabled}, context=${JSON.stringify(this._context)}, flowRate=${this._flowRate}, autoDisableErrorRate=${this._autoDisableErrorRate}, autoDisableMinimumSamples=${this._autoDisableMinimumSamples}}`;
  }
} 