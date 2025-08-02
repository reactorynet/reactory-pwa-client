/**
 * Performance Monitor Hook for ReactoryForm
 * Phase 1.4: Performance Optimization
 * 
 * This hook provides comprehensive performance monitoring capabilities
 * including render time tracking, memory usage monitoring, and
 * performance optimization suggestions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ReactoryFormState } from '../types-v2';

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
  cacheHits: number;
  cacheMisses: number;
  componentRenders: number;
  averageRenderTime: number;
  slowestRender: number;
  fastestRender: number;
}

export interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
}

export interface PerformanceReport {
  timestamp: number;
  metrics: PerformanceMetrics;
  alerts: PerformanceAlert[];
  recommendations: string[];
  summary: {
    overallScore: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
  };
}

export interface PerformanceMonitorConfig {
  enabled?: boolean;
  trackRenderTime?: boolean;
  trackMemoryUsage?: boolean;
  trackNetworkRequests?: boolean;
  alertThresholds?: {
    renderTime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  reportInterval?: number;
  maxHistorySize?: number;
}

export interface PerformanceMonitorResult {
  metrics: PerformanceMetrics;
  alerts: PerformanceAlert[];
  report: PerformanceReport;
  startTimer: (label: string) => void;
  endTimer: (label: string) => void;
  trackRender: (componentName: string, renderTime: number) => void;
  trackMemoryUsage: () => void;
  trackNetworkRequest: (url: string, duration: number, success: boolean) => void;
  getReport: () => PerformanceReport;
  clearHistory: () => void;
  isPerformanceGood: () => boolean;
  getOptimizationSuggestions: () => string[];
}

// ============================================================================
// PERFORMANCE MONITOR HOOK
// ============================================================================

export const usePerformanceMonitor = (
  config: PerformanceMonitorConfig = {}
): PerformanceMonitorResult => {
  const {
    enabled = true,
    trackRenderTime = true,
    trackMemoryUsage = true,
    trackNetworkRequests = true,
    alertThresholds = {
      renderTime: 100,
      memoryUsage: 50 * 1024 * 1024, // 50MB
      cpuUsage: 80
    },
    reportInterval = 5000,
    maxHistorySize = 100
  } = config;

  // State
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    networkRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    componentRenders: 0,
    averageRenderTime: 0,
    slowestRender: 0,
    fastestRender: Infinity
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [report, setReport] = useState<PerformanceReport>({
    timestamp: Date.now(),
    metrics,
    alerts: [],
    recommendations: [],
    summary: {
      overallScore: 100,
      status: 'excellent',
      issues: []
    }
  });

  // Refs
  const timersRef = useRef<Map<string, number>>(new Map());
  const renderHistoryRef = useRef<number[]>([]);
  const networkHistoryRef = useRef<Array<{ url: string; duration: number; success: boolean }>>([]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Calculate performance score based on metrics
   */
  const calculatePerformanceScore = useCallback((metrics: PerformanceMetrics): number => {
    let score = 100;

    // Deduct points for poor performance
    if (metrics.renderTime > alertThresholds.renderTime!) {
      score -= Math.min(30, (metrics.renderTime - alertThresholds.renderTime!) / 10);
    }

    if (metrics.memoryUsage > alertThresholds.memoryUsage!) {
      score -= Math.min(25, (metrics.memoryUsage - alertThresholds.memoryUsage!) / (1024 * 1024));
    }

    if (metrics.cpuUsage > alertThresholds.cpuUsage!) {
      score -= Math.min(20, metrics.cpuUsage - alertThresholds.cpuUsage!);
    }

    return Math.max(0, score);
  }, [alertThresholds]);

  /**
   * Determine performance status
   */
  const getPerformanceStatus = useCallback((score: number): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }, []);

  /**
   * Generate optimization suggestions
   */
  const generateOptimizationSuggestions = useCallback((metrics: PerformanceMetrics): string[] => {
    const suggestions: string[] = [];

    if (metrics.renderTime > 50) {
      suggestions.push('Consider using React.memo for expensive components');
    }

    if (metrics.renderTime > 100) {
      suggestions.push('Implement virtual scrolling for large lists');
    }

    if (metrics.memoryUsage > 10 * 1024 * 1024) {
      suggestions.push('Optimize memory usage with proper cleanup');
    }

    if (metrics.memoryUsage > 50 * 1024 * 1024) {
      suggestions.push('Consider implementing lazy loading');
    }

    if (metrics.cacheMisses > metrics.cacheHits) {
      suggestions.push('Optimize caching strategy');
    }

    if (metrics.networkRequests > 20) {
      suggestions.push('Consider implementing request batching');
    }

    return suggestions;
  }, []);

  /**
   * Check for performance alerts
   */
  const checkPerformanceAlerts = useCallback((metrics: PerformanceMetrics): PerformanceAlert[] => {
    const newAlerts: PerformanceAlert[] = [];

    if (metrics.renderTime > alertThresholds.renderTime!) {
      newAlerts.push({
        type: 'warning',
        message: `Slow render time: ${metrics.renderTime}ms`,
        timestamp: Date.now(),
        severity: metrics.renderTime > alertThresholds.renderTime! * 2 ? 'high' : 'medium'
      });
    }

    if (metrics.memoryUsage > alertThresholds.memoryUsage!) {
      newAlerts.push({
        type: 'warning',
        message: `High memory usage: ${Math.round(metrics.memoryUsage / (1024 * 1024))}MB`,
        timestamp: Date.now(),
        severity: metrics.memoryUsage > alertThresholds.memoryUsage! * 2 ? 'high' : 'medium'
      });
    }

    if (metrics.cpuUsage > alertThresholds.cpuUsage!) {
      newAlerts.push({
        type: 'error',
        message: `High CPU usage: ${metrics.cpuUsage}%`,
        timestamp: Date.now(),
        severity: 'high'
      });
    }

    return newAlerts;
  }, [alertThresholds]);

  // ============================================================================
  // PERFORMANCE TRACKING FUNCTIONS
  // ============================================================================

  /**
   * Start a performance timer
   */
  const startTimer = useCallback((label: string) => {
    if (!enabled) return;
    timersRef.current.set(label, globalThis.performance.now());
  }, [enabled]);

  /**
   * End a performance timer
   */
  const endTimer = useCallback((label: string) => {
    if (!enabled) return;
    
    const startTime = timersRef.current.get(label);
    if (startTime) {
      const duration = globalThis.performance.now() - startTime;
      timersRef.current.delete(label);
      
      // Update metrics
      setMetrics(prev => ({
        ...prev,
        renderTime: duration,
        componentRenders: prev.componentRenders + 1,
        averageRenderTime: (prev.averageRenderTime * prev.componentRenders + duration) / (prev.componentRenders + 1),
        slowestRender: Math.max(prev.slowestRender, duration),
        fastestRender: Math.min(prev.fastestRender, duration)
      }));

      // Add to history
      renderHistoryRef.current.push(duration);
      if (renderHistoryRef.current.length > maxHistorySize) {
        renderHistoryRef.current.shift();
      }
    }
  }, [enabled, maxHistorySize]);

  /**
   * Track component render performance
   */
  const trackRender = useCallback((componentName: string, renderTime: number) => {
    if (!enabled || !trackRenderTime) return;

    setMetrics(prev => ({
      ...prev,
      renderTime,
      componentRenders: prev.componentRenders + 1,
      averageRenderTime: (prev.averageRenderTime * prev.componentRenders + renderTime) / (prev.componentRenders + 1),
      slowestRender: Math.max(prev.slowestRender, renderTime),
      fastestRender: Math.min(prev.fastestRender, renderTime)
    }));

    // Add to history
    renderHistoryRef.current.push(renderTime);
    if (renderHistoryRef.current.length > maxHistorySize) {
      renderHistoryRef.current.shift();
    }
  }, [enabled, trackRenderTime, maxHistorySize]);

  /**
   * Track memory usage
   */
  const trackMemoryUsage = useCallback(() => {
    if (!enabled || !trackMemoryUsage) return;

    const memoryInfo = globalThis.performance.memory;
    if (memoryInfo) {
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memoryInfo.usedJSHeapSize
      }));
    }
  }, [enabled, trackMemoryUsage]);

  /**
   * Track network request performance
   */
  const trackNetworkRequest = useCallback((url: string, duration: number, success: boolean) => {
    if (!enabled || !trackNetworkRequests) return;

    setMetrics(prev => ({
      ...prev,
      networkRequests: prev.networkRequests + 1,
      cacheHits: success ? prev.cacheHits + 1 : prev.cacheHits,
      cacheMisses: success ? prev.cacheMisses : prev.cacheMisses + 1
    }));

    // Add to history
    networkHistoryRef.current.push({ url, duration, success });
    if (networkHistoryRef.current.length > maxHistorySize) {
      networkHistoryRef.current.shift();
    }
  }, [enabled, trackNetworkRequests, maxHistorySize]);

  // ============================================================================
  // REPORT GENERATION
  // ============================================================================

  /**
   * Generate performance report
   */
  const getReport = useCallback((): PerformanceReport => {
    const score = calculatePerformanceScore(metrics);
    const status = getPerformanceStatus(score);
    const suggestions = generateOptimizationSuggestions(metrics);
    const newAlerts = checkPerformanceAlerts(metrics);

    const report: PerformanceReport = {
      timestamp: Date.now(),
      metrics,
      alerts: newAlerts,
      recommendations: suggestions,
      summary: {
        overallScore: score,
        status,
        issues: newAlerts.map(alert => alert.message)
      }
    };

    setReport(report);
    return report;
  }, [metrics, calculatePerformanceScore, getPerformanceStatus, generateOptimizationSuggestions, checkPerformanceAlerts]);

  /**
   * Check if performance is good
   */
  const isPerformanceGood = useCallback((): boolean => {
    const score = calculatePerformanceScore(metrics);
    return score >= 75;
  }, [metrics, calculatePerformanceScore]);

  /**
   * Get optimization suggestions
   */
  const getOptimizationSuggestions = useCallback((): string[] => {
    return generateOptimizationSuggestions(metrics);
  }, [metrics, generateOptimizationSuggestions]);

  /**
   * Clear performance history
   */
  const clearHistory = useCallback(() => {
    renderHistoryRef.current = [];
    networkHistoryRef.current = [];
    setMetrics(prev => ({
      ...prev,
      componentRenders: 0,
      averageRenderTime: 0,
      slowestRender: 0,
      fastestRender: Infinity
    }));
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Periodic memory tracking
  useEffect(() => {
    if (!enabled || !trackMemoryUsage) return;

    const interval = setInterval(() => {
      trackMemoryUsage();
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, trackMemoryUsage, trackMemoryUsage]);

  // Periodic report generation
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      getReport();
    }, reportInterval);

    return () => clearInterval(interval);
  }, [enabled, reportInterval, getReport]);

  // Initial memory tracking
  useEffect(() => {
    if (enabled && trackMemoryUsage) {
      trackMemoryUsage();
    }
  }, [enabled, trackMemoryUsage, trackMemoryUsage]);

  return {
    metrics,
    alerts,
    report,
    startTimer,
    endTimer,
    trackRender,
    trackMemoryUsage,
    trackNetworkRequest,
    getReport,
    clearHistory,
    isPerformanceGood,
    getOptimizationSuggestions
  };
}; 