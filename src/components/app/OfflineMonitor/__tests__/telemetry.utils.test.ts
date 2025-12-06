import {
  createTotalChecksMetric,
  createSuccessMetric,
  createFailureMetric,
  createHistogramMetric,
  createStatusGauge,
  createQualityMetric,
  createSummaryMetric,
} from '../telemetry.utils';

describe('telemetry.utils', () => {
  const clientKey = 'test_client';
  const started = Date.now();
  const baseResource = {
    service_name: 'reactory-pwa-client',
    service_version: '1.0.0',
    host_name: 'localhost',
    deployment_environment: 'test',
    attributes: {
      'user.anon': false,
      'client.key': clientKey,
    },
  };
  const commonAttributes = {
    'http.method': 'POST' as const,
    'http.status_code': 200,
    'client.key': clientKey,
    'api.endpoint': '/graphql',
    'user.authenticated': true,
  };

  describe('createTotalChecksMetric', () => {
    it('should create a counter metric for total checks', () => {
      const metric = createTotalChecksMetric(
        clientKey,
        started,
        baseResource as any,
        { ...commonAttributes, 'check.result': 'success' }
      );

      expect(metric.name).toBe(`${clientKey}_api_status_checks_total`);
      expect(metric.type).toBe('counter');
      expect(metric.value).toBe(1);
      expect(metric.attributes['check.result']).toBe('success');
    });
  });

  describe('createSuccessMetric', () => {
    it('should create a counter metric for successful checks', () => {
      const metric = createSuccessMetric(
        clientKey,
        started,
        baseResource as any,
        commonAttributes
      );

      expect(metric.name).toBe(`${clientKey}_api_status_success_total`);
      expect(metric.type).toBe('counter');
      expect(metric.value).toBe(1);
      expect(metric.unit).toBe('1');
    });
  });

  describe('createFailureMetric', () => {
    it('should create a counter metric for failed checks', () => {
      const metric = createFailureMetric(
        clientKey,
        started,
        baseResource as any,
        commonAttributes
      );

      expect(metric.name).toBe(`${clientKey}_api_status_failure_total`);
      expect(metric.type).toBe('counter');
      expect(metric.value).toBe(1);
      expect(metric.description).toContain('failed');
    });
  });

  describe('createHistogramMetric', () => {
    it('should create a histogram metric with correct buckets', () => {
      const durationMs = 2500;
      const metric = createHistogramMetric(
        clientKey,
        started,
        durationMs,
        baseResource as any,
        { ...commonAttributes, 'performance.classification': 'normal' }
      );

      expect(metric.name).toBe(`${clientKey}_api_status_duration_ms`);
      expect(metric.type).toBe('histogram');
      expect(metric.unit).toBe('ms');
      expect(metric.histogramData).toBeDefined();
      expect(metric.histogramData!.sum).toBe(durationMs);
      expect(metric.histogramData!.count).toBe(1);
      expect(metric.histogramData!.buckets).toHaveLength(7);
    });

    it('should classify bucket counts correctly', () => {
      const durationMs = 1500;
      const metric = createHistogramMetric(
        clientKey,
        started,
        durationMs,
        baseResource as any,
        { ...commonAttributes, 'performance.classification': 'normal' }
      );

      const buckets = metric.histogramData!.buckets;
      expect(buckets[0].count).toBe(0); // 100ms
      expect(buckets[1].count).toBe(0); // 500ms
      expect(buckets[2].count).toBe(0); // 1000ms
      expect(buckets[3].count).toBe(1); // 2000ms
    });
  });

  describe('createStatusGauge', () => {
    it('should create a gauge metric with value 1 for online', () => {
      const metric = createStatusGauge(
        clientKey,
        started,
        true,
        baseResource as any,
        commonAttributes
      );

      expect(metric.name).toBe(`${clientKey}_api_online_status`);
      expect(metric.type).toBe('gauge');
      expect(metric.value).toBe(1);
    });

    it('should create a gauge metric with value 0 for offline', () => {
      const metric = createStatusGauge(
        clientKey,
        started,
        false,
        baseResource as any,
        commonAttributes
      );

      expect(metric.value).toBe(0);
    });
  });

  describe('createQualityMetric', () => {
    it('should create a quality metric with calculated scores', () => {
      const qualityScore = 85;
      const errorRate = 0.05;
      const slowRate = 0.10;

      const metric = createQualityMetric(
        clientKey,
        started,
        qualityScore,
        errorRate,
        slowRate,
        baseResource as any,
        commonAttributes
      );

      expect(metric.name).toBe(`${clientKey}_api_connection_quality`);
      expect(metric.type).toBe('updowncounter');
      expect(metric.value).toBe(Math.round(qualityScore));
      expect(metric.attributes['quality.error_rate']).toBe(errorRate.toFixed(4));
      expect(metric.attributes['quality.slow_rate']).toBe(slowRate.toFixed(4));
      expect(metric.attributes['quality.classification']).toBe('excellent');
    });

    it('should classify quality correctly', () => {
      const testCases = [
        { score: 85, expected: 'excellent' },
        { score: 70, expected: 'good' },
        { score: 50, expected: 'fair' },
        { score: 30, expected: 'poor' },
      ];

      testCases.forEach(({ score, expected }) => {
        const metric = createQualityMetric(
          clientKey,
          started,
          score,
          0,
          0,
          baseResource as any,
          commonAttributes
        );

        expect(metric.attributes['quality.classification']).toBe(expected);
      });
    });
  });

  describe('createSummaryMetric', () => {
    it('should create a summary metric with quantiles', () => {
      const durationMs = 1500;
      const totals = { error: 5, slow: 10, ok: 85, total: 100 };
      const successRate = 0.85;

      const metric = createSummaryMetric(
        clientKey,
        started,
        durationMs,
        totals,
        successRate,
        baseResource as any,
        commonAttributes
      );

      expect(metric.name).toBe(`${clientKey}_api_status_summary`);
      expect(metric.type).toBe('summary');
      expect(metric.summaryData).toBeDefined();
      expect(metric.summaryData!.count).toBe(totals.total);
      expect(metric.summaryData!.quantiles).toHaveLength(3);
      expect(metric.attributes['stats.success_rate']).toBe(successRate.toFixed(4));
      expect(metric.attributes['stats.total_checks']).toBe(100);
      expect(metric.attributes['stats.error_count']).toBe(5);
      expect(metric.attributes['stats.slow_count']).toBe(10);
    });

    it('should calculate quantiles correctly', () => {
      const durationMs = 1000;
      const totals = { error: 0, slow: 0, ok: 10, total: 10 };
      const successRate = 1.0;

      const metric = createSummaryMetric(
        clientKey,
        started,
        durationMs,
        totals,
        successRate,
        baseResource as any,
        commonAttributes
      );

      const quantiles = metric.summaryData!.quantiles;
      expect(quantiles[0].quantile).toBe(0.5);
      expect(quantiles[0].value).toBe(durationMs);
      expect(quantiles[1].quantile).toBe(0.9);
      expect(quantiles[1].value).toBe(durationMs * 1.5);
      expect(quantiles[2].quantile).toBe(0.99);
      expect(quantiles[2].value).toBe(durationMs * 2);
    });
  });
});
