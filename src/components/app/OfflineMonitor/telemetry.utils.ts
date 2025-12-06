/**
 * Telemetry utilities for API status monitoring
 * Provides metric creation functions for different telemetry types
 */

/**
 * Common attributes for all API status metrics
 */
export interface CommonMetricAttributes {
  'http.method': string;
  'http.status_code': number;
  'client.key': string;
  'api.endpoint': string;
  'user.authenticated': boolean;
  [key: string]: any;
}

/**
 * Base resource information for metrics
 */
export interface BaseResource {
  service_name: string;
  service_version: string;
  host_name: string;
  deployment_environment: string;
  attributes: {
    'user.anon': boolean;
    'client.key': string;
    [key: string]: any;
  };
}

/**
 * Creates a counter metric for total API status checks
 */
export const createTotalChecksMetric = (
  clientKey: string,
  started: number,
  baseResource: Reactory.Models.IStatistic['resource'],
  attributes: CommonMetricAttributes & { 'check.result': 'success' | 'failure' }
): Reactory.Models.IStatistic => ({
  name: `${clientKey}_api_status_checks_total`,
  description: 'Total number of API status checks performed',
  unit: '1',
  type: 'counter' as any,
  value: 1,
  attributes,
  resource: baseResource,
  timestamp: new Date(started),
});

/**
 * Creates a counter metric for successful API checks
 */
export const createSuccessMetric = (
  clientKey: string,
  started: number,
  baseResource: Reactory.Models.IStatistic['resource'],
  attributes: CommonMetricAttributes
): Reactory.Models.IStatistic => ({
  name: `${clientKey}_api_status_success_total`,
  description: 'Total number of successful API status checks',
  unit: '1',
  type: 'counter' as any,
  value: 1,
  attributes,
  resource: baseResource,
  timestamp: new Date(started),
});

/**
 * Creates a counter metric for failed API checks
 */
export const createFailureMetric = (
  clientKey: string,
  started: number,
  baseResource: Reactory.Models.IStatistic['resource'],
  attributes: CommonMetricAttributes
): Reactory.Models.IStatistic => ({
  name: `${clientKey}_api_status_failure_total`,
  description: 'Total number of failed API status checks',
  unit: '1',
  type: 'counter' as any,
  value: 1,
  attributes,
  resource: baseResource,
  timestamp: new Date(started),
});

/**
 * Creates a histogram metric for API response time distribution
 */
export const createHistogramMetric = (
  clientKey: string,
  started: number,
  durationMs: number,
  baseResource: Reactory.Models.IStatistic['resource'],
  attributes: CommonMetricAttributes & { 'performance.classification': 'slow' | 'degraded' | 'normal' | 'error' }
): Reactory.Models.IStatistic => ({
  name: `${clientKey}_api_status_duration_ms`,
  description: 'API status check duration in milliseconds',
  unit: 'ms',
  type: 'histogram' as any,
  histogramData: {
    count: 1,
    sum: durationMs,
    buckets: [
      { upperBound: 100, count: durationMs <= 100 ? 1 : 0 } as any,
      { upperBound: 500, count: durationMs <= 500 ? 1 : 0 } as any,
      { upperBound: 1000, count: durationMs <= 1000 ? 1 : 0 } as any,
      { upperBound: 2000, count: durationMs <= 2000 ? 1 : 0 } as any,
      { upperBound: 4000, count: durationMs <= 4000 ? 1 : 0 } as any,
      { upperBound: 7000, count: durationMs <= 7000 ? 1 : 0 } as any,
      { upperBound: 10000, count: durationMs <= 10000 ? 1 : 0 } as any,
    ],
  } as any,
  attributes,
  resource: baseResource,
  timestamp: new Date(started),
});

/**
 * Creates a gauge metric for current API online/offline status
 */
export const createStatusGauge = (
  clientKey: string,
  done: number,
  isOnline: boolean,
  baseResource: Reactory.Models.IStatistic['resource'],
  attributes: CommonMetricAttributes
): Reactory.Models.IStatistic => ({
  name: `${clientKey}_api_online_status`,
  description: 'Current API online status (1 = online, 0 = offline)',
  unit: '1',
  type: 'gauge' as any,
  value: isOnline ? 1 : 0,
  attributes,
  resource: baseResource,
  timestamp: new Date(done),
});

/**
 * Creates an updowncounter metric for connection quality score
 */
export const createQualityMetric = (
  clientKey: string,
  done: number,
  qualityScore: number,
  errorRate: number,
  slowRate: number,
  baseResource: Reactory.Models.IStatistic['resource'],
  attributes: CommonMetricAttributes
): Reactory.Models.IStatistic => ({
  name: `${clientKey}_api_connection_quality`,
  description: 'Connection quality score (0-100)',
  unit: '1',
  type: 'updowncounter' as any,
  value: Math.round(qualityScore),
  attributes: {
    ...attributes,
    'quality.error_rate': errorRate.toFixed(4),
    'quality.slow_rate': slowRate.toFixed(4),
    'quality.classification': qualityScore > 80 ? 'excellent' : qualityScore > 60 ? 'good' : qualityScore > 40 ? 'fair' : 'poor',
  },
  resource: baseResource,
  timestamp: new Date(done),
});

/**
 * Creates a summary metric for API performance percentiles
 */
export const createSummaryMetric = (
  clientKey: string,
  done: number,
  durationMs: number,
  totals: { error: number; slow: number; ok: number; total: number },
  successRate: number,
  baseResource: Reactory.Models.IStatistic['resource'],
  attributes: CommonMetricAttributes
): Reactory.Models.IStatistic => ({
  name: `${clientKey}_api_status_summary`,
  description: 'API status check performance summary',
  unit: 'ms',
  type: 'summary' as any,
  summaryData: {
    count: totals.total,
    sum: totals.ok * 1000, // Rough approximation
    quantiles: [
      { quantile: 0.5, value: durationMs },
      { quantile: 0.9, value: durationMs * 1.5 },
      { quantile: 0.99, value: durationMs * 2 },
    ],
  },
  attributes: {
    ...attributes,
    'stats.success_rate': successRate.toFixed(4),
    'stats.total_checks': totals.total,
    'stats.error_count': totals.error,
    'stats.slow_count': totals.slow,
  },
  resource: baseResource,
  timestamp: new Date(done),
});
