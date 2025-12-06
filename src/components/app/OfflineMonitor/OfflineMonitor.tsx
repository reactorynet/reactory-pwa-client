/**
 * OfflineMonitor Component
 * Monitors API connectivity and displays offline status
 * Includes comprehensive telemetry metrics collection
 */
import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Icon } from '@mui/material';
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import { OfflineProps } from '../../../types/app';
import {
  TM_BASE_DEFAULT,
  ApiCheckTotals,
  calculateTimeout,
  calculateNextBaseTimeout,
  classifyPerformance,
  calculateQualityScore,
} from './healthCheck.utils';
import {
  CommonMetricAttributes,
  createTotalChecksMetric,
  createSuccessMetric,
  createFailureMetric,
  createHistogramMetric,
  createStatusGauge,
  createQualityMetric,
  createSummaryMetric,
} from './telemetry.utils';

/**
 * OfflineMonitor component
 * Periodically checks API status and displays offline banner when connection is lost
 */
export const OfflineMonitor: React.FC<OfflineProps> = ({ onOfflineChanged }) => {
  const reactory = useReactory();
  const [timeoutBase, setTimeoutBase] = useState<number>(TM_BASE_DEFAULT);
  const [offline, setOfflineStatus] = useState<boolean>(false);
  
  // Use refs to maintain values across renders without triggering re-renders
  const totalsRef = useRef<ApiCheckTotals>({ error: 0, slow: 0, ok: 0, total: 0 });
  const lastSlowRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Creates base resource information for telemetry
   */
  const createBaseResource = (): Reactory.Models.IStatistic['resource'] => {
    const clientKey = reactory.CLIENT_KEY.toLowerCase().replace(/\s+/g, '_');
    return {
      service_name: 'reactory-pwa-client',
      service_version: (reactory.$version || '1.0.0') as string,
      host_name: window.location.hostname,
      deployment_environment: (process.env.NODE_ENV || 'development') as string,
      attributes: {
        'user.anon': reactory.isAnon(),
        'client.key': clientKey,
      } as any
    };
  };

  /**
   * Creates common attributes for all metrics
   */
  const createCommonAttributes = (
    clientKey: string,
    statusCode: number,
    additionalAttributes: Record<string, any> = {}
  ): CommonMetricAttributes => ({
    'http.method': 'POST',
    'http.status_code': statusCode,
    'client.key': clientKey,
    'api.endpoint': '/graphql',
    'user.authenticated': !reactory.isAnon(),
    ...additionalAttributes,
  });

  /**
   * Performs API status check with comprehensive telemetry
   */
  const getApiStatus = async (): Promise<void> => {
    const started = Date.now();
    const clientKey = reactory.CLIENT_KEY.toLowerCase().replace(/\s+/g, '_');
    const baseResource = createBaseResource();

    try {
      const apiStatus = await reactory.status({ emitLogin: false, forceLogout: false });
      const done = Date.now();
      const durationMs = done - started;
      const apiOk = apiStatus.status === 'API OK';
      
      // Update offline status
      setOfflineStatus(!apiOk);
      if (offline !== !apiOk) {
        onOfflineChanged(!apiOk);
      }

      // Calculate timeout and performance classification
      const currentTotals = totalsRef.current;
      const timeoutMS = calculateTimeout(durationMs, currentTotals, timeoutBase);
      const performance = classifyPerformance(durationMs, currentTotals);
      const isSlow = performance === 'slow';

      if (durationMs > 4000 && currentTotals.total > 10) {
        lastSlowRef.current = done;
      }

      // Update totals
      const newTotals: ApiCheckTotals = {
        error: currentTotals.error,
        slow: isSlow ? currentTotals.slow + 1 : currentTotals.slow,
        ok: apiOk ? currentTotals.ok + 1 : currentTotals.ok,
        total: currentTotals.total + 1,
      };
      totalsRef.current = newTotals;

      // Calculate and update base timeout if needed
      const nextBaseTimeout = calculateNextBaseTimeout(newTotals);
      if (nextBaseTimeout !== timeoutBase) {
        setTimeoutBase(nextBaseTimeout);
      }

      // Create common attributes for metrics
      const commonAttributes = createCommonAttributes(clientKey, apiOk ? 200 : 500, {
        'check.result': apiOk ? 'success' : 'failure',
      });

      // Publish telemetry metrics

      // 1. Counter: Total API status checks
      const totalChecksMetric = createTotalChecksMetric(
        clientKey,
        started,
        baseResource,
        commonAttributes as any
      );
      reactory.stat(`${clientKey}_api_status_checks_total`, totalChecksMetric);

      // 2. Counter: Successful checks
      if (apiOk) {
        const successMetric = createSuccessMetric(
          clientKey,
          started,
          baseResource,
          commonAttributes
        );
        reactory.stat(`${clientKey}_api_status_success_total`, successMetric);
      }

      // 3. Histogram: Response time distribution
      const histogramMetric = createHistogramMetric(
        clientKey,
        started,
        durationMs,
        baseResource,
        {
          ...commonAttributes,
          'performance.classification': performance,
        }
      );
      reactory.stat(`${clientKey}_api_status_duration_ms`, histogramMetric);

      // 4. Gauge: Current online/offline status
      const statusGauge = createStatusGauge(
        clientKey,
        done,
        apiOk,
        baseResource,
        commonAttributes
      );
      reactory.stat(`${clientKey}_api_online_status`, statusGauge);

      // 5. UpDownCounter: Connection quality score
      const qualityScore = calculateQualityScore(newTotals);
      const errorRate = newTotals.total > 0 ? (newTotals.error / newTotals.total) : 0;
      const slowRate = newTotals.total > 0 ? (newTotals.slow / newTotals.total) : 0;
      
      const qualityMetric = createQualityMetric(
        clientKey,
        done,
        qualityScore,
        errorRate,
        slowRate,
        baseResource,
        commonAttributes
      );
      reactory.stat(`${clientKey}_api_connection_quality`, qualityMetric);

      // 6. Summary: Performance percentiles
      const successRate = newTotals.total > 0 ? (newTotals.ok / newTotals.total) : 0;
      const summaryMetric = createSummaryMetric(
        clientKey,
        done,
        durationMs,
        newTotals,
        successRate,
        baseResource,
        commonAttributes
      );
      reactory.stat(`${clientKey}_api_status_summary`, summaryMetric);

      // Emit event with status totals
      reactory.emit('onApiStatusTotalsChange', {
        ...newTotals,
        when: started,
        pingMS: durationMs,
        api_ok: apiOk,
        isSlow,
      });

      // Debug logging
      reactory.debug(`Client Ping Totals:`, { 
        totals: newTotals, 
        nextIn: timeoutMS,
        durationMs,
        qualityScore: Math.round(qualityScore),
        successRate: `${(successRate * 100).toFixed(2)}%`,
      });

      // Schedule next check
      timeoutIdRef.current = setTimeout(() => {
        void getApiStatus();
      }, timeoutMS);

    } catch (error) {
      const done = Date.now();
      const durationMs = done - started;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      reactory.error(`Error while fetching api status`, { error, durationMs });
      setOfflineStatus(true);
      onOfflineChanged(true);

      // Update error totals
      const currentTotals = totalsRef.current;
      const newTotals: ApiCheckTotals = {
        error: currentTotals.error + 1,
        slow: currentTotals.slow,
        ok: currentTotals.ok,
        total: currentTotals.total + 1,
      };
      totalsRef.current = newTotals;

      // Create error attributes
      const errorAttributes = createCommonAttributes(clientKey, 0, {
        'error.type': (error as any)?.name || 'unknown',
        'error.message': errorMessage,
        'check.result': 'failure',
      });

      const baseResource = createBaseResource();

      // Publish error metrics

      // 1. Counter: Total checks (including failures)
      const totalChecksErrorMetric = createTotalChecksMetric(
        clientKey,
        started,
        baseResource,
        errorAttributes as any
      );
      reactory.stat(`${clientKey}_api_status_checks_total`, totalChecksErrorMetric);

      // 2. Counter: Failed checks
      const failureMetric = createFailureMetric(
        clientKey,
        started,
        baseResource,
        errorAttributes
      );
      reactory.stat(`${clientKey}_api_status_failure_total`, failureMetric);

      // 3. Histogram: Failed request duration
      const errorHistogramMetric = createHistogramMetric(
        clientKey,
        started,
        durationMs,
        baseResource,
        {
          ...errorAttributes,
          'performance.classification': 'error',
        }
      );
      reactory.stat(`${clientKey}_api_status_duration_ms`, errorHistogramMetric);

      // 4. Gauge: Offline status
      const offlineGauge = createStatusGauge(
        clientKey,
        done,
        false,
        baseResource,
        errorAttributes
      );
      reactory.stat(`${clientKey}_api_online_status`, offlineGauge);

      // Schedule next check
      timeoutIdRef.current = setTimeout(() => {
        void getApiStatus();
      }, timeoutBase);
    }
  };

  // Start monitoring on mount
  useEffect(() => {
    void getApiStatus();

    // Cleanup on unmount
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render anything if online
  if (offline === false) return null;

  // Render offline banner
  return (
    <Box style={{ margin: 'auto', textAlign: 'center', paddingTop: '100px' }}>
      <Typography variant="h1" style={{ color: reactory.muiTheme.palette.error.main }}>
        <Icon style={{ fontSize: '100px' }}>cloud_off</Icon>
      </Typography>
      <Typography variant="body2">
        We are unable to connect you to our service at this time.
        This may be due to a poor internet connection or your
        device is currently offline.
      </Typography>
      <Typography variant="body2">
        This message will disappear as soon as we are able to establish a connection.
        If you accessed the system with an email link, please retry using this link in a few moments.
      </Typography>
    </Box>
  );
};
