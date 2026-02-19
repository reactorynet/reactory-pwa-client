import { FeatureFlagFlowStatistic as IFeatureFlagFlowStatistic } from '../types';

/**
 * Feature flag flow statistics tracking implementation
 * Mirrors the Java FeatureFlagFlowStatistic class
 */
export class FeatureFlagFlowStatistic implements IFeatureFlagFlowStatistic {
  private _requestCount: number = 0;
  private _executedCount: number = 0;
  private _failedCount: number = 0;
  private _successCount: number = 0;
  private _lastExecution: Date = new Date(0); // EPOCH
  private _trackingSince: Date = new Date();

  constructor() {}

  get requestCount(): number {
    return this._requestCount;
  }

  get executedCount(): number {
    return this._executedCount;
  }

  get failedCount(): number {
    return this._failedCount;
  }

  get successCount(): number {
    return this._successCount;
  }

  get lastExecution(): Date {
    return this._lastExecution;
  }

  get trackingSince(): Date {
    return this._trackingSince;
  }

  /**
   * Calculates the flow rate of the feature flag.
   * @returns float
   */
  getFlowRate(): number {
    if (this._requestCount === 0 || this._executedCount === 0) return -1;
    return (this._executedCount / this._requestCount) * 100;
  }

  getFailureRate(): number {
    if (this._failedCount === 0 || this._executedCount === 0) return -1;
    return (this._failedCount / this._executedCount) * 100;
  }

  getSuccessRate(): number {
    if (this._successCount === 0 || this._executedCount === 0) return -1;
    return (this._successCount / this._executedCount) * 100;
  }

  onRequested(): void {
    this._requestCount++;
  }

  onSuccess(): void {
    this.onExecuted();
    this._successCount++;
  }

  onFailed(): void {
    this.onExecuted();
    this._failedCount++;
  }

  private onExecuted(): void {
    this._executedCount++;
    this._lastExecution = new Date();
  }

  getTPS(): number {
    const now = new Date();
    const timeDiffMs = now.getTime() - this._trackingSince.getTime();
    const timeDiffSeconds = timeDiffMs / 1000;
    
    if (timeDiffSeconds === 0) return this._executedCount; // If no time has passed, return count as TPS
    return this._executedCount / timeDiffSeconds;
  }

  reset(): void {
    this._requestCount = 0;
    this._executedCount = 0;
    this._failedCount = 0;
    this._successCount = 0;
    this._lastExecution = new Date(0); // EPOCH
    this._trackingSince = new Date();
  }

  toString(): string {
    return `FeatureFlagFlowStatistic{requestCount=${this._requestCount}, executedCount=${this._executedCount}, lastExecution=${this._lastExecution}, trackingSince=${this._trackingSince}, flowRate=${this.getFlowRate()}, successRate=${this.getSuccessRate()}, failRate=${this.getFailureRate()}, tps=${this.getTPS()}}`;
  }
} 