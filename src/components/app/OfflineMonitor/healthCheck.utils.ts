/**
 * Health check utilities for API monitoring
 * Provides timeout calculation and performance classification
 */

/**
 * Default base timeout in milliseconds
 */
export const TM_BASE_DEFAULT = 45000;

/**
 * API check totals interface
 */
export interface ApiCheckTotals {
  error: number;
  slow: number;
  ok: number;
  total: number;
}

/**
 * Calculates the next timeout based on response duration and totals
 * 
 * @param durationMs - Response duration in milliseconds
 * @param totals - Current API check totals
 * @param baseTimeout - Base timeout value
 * @returns Calculated timeout in milliseconds
 */
export const calculateTimeout = (
  durationMs: number,
  totals: ApiCheckTotals,
  baseTimeout: number
): number => {
  let timeoutMS = baseTimeout;

  // Adjust timeout based on response duration
  if (durationMs > 4000 && totals.total > 10) {
    timeoutMS = baseTimeout * 1.25;
  }

  if (durationMs > 7000 && totals.total > 10) {
    timeoutMS = baseTimeout * 1.5;
  }

  return timeoutMS;
};

/**
 * Calculates the next base timeout based on success rate
 * 
 * @param totals - Current API check totals
 * @returns New base timeout in milliseconds
 */
export const calculateNextBaseTimeout = (totals: ApiCheckTotals): number => {
  let nextTimeout = TM_BASE_DEFAULT;

  if (totals.total > 5) {
    const avg = (totals.ok * 100) / totals.total;
    if (avg > 90) nextTimeout = TM_BASE_DEFAULT * 1.30;
    if (avg > 95) nextTimeout = TM_BASE_DEFAULT * 1.5;
    if (avg > 98) nextTimeout = TM_BASE_DEFAULT * 2.5;
  }

  return nextTimeout;
};

/**
 * Classifies performance based on response duration
 * 
 * @param durationMs - Response duration in milliseconds
 * @param totals - Current API check totals
 * @returns Performance classification
 */
export const classifyPerformance = (
  durationMs: number,
  totals: ApiCheckTotals
): 'slow' | 'degraded' | 'normal' => {
  if (durationMs > 7000 && totals.total > 10) {
    return 'slow';
  }

  if (durationMs > 4000 && totals.total > 10) {
    return 'degraded';
  }

  return 'normal';
};

/**
 * Calculates connection quality score (0-100)
 * 
 * @param totals - Current API check totals
 * @returns Quality score from 0 to 100
 */
export const calculateQualityScore = (totals: ApiCheckTotals): number => {
  const errorRate = totals.total > 0 ? (totals.error / totals.total) : 0;
  const slowRate = totals.total > 0 ? (totals.slow / totals.total) : 0;
  return Math.max(0, 100 - (errorRate * 50) - (slowRate * 30));
};
