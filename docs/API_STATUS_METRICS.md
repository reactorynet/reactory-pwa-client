# API Status Metrics Implementation

## Overview

The `getApiStatus` function in `App.tsx` has been enhanced to provide comprehensive OpenTelemetry-compatible metrics tracking for API status checks. This implementation provides detailed insights into user performance experience and API reliability.

## Metrics Published

### 1. **Total API Status Checks** (Counter)
- **Name**: `{client_key}_api_status_checks_total`
- **Type**: `counter`
- **Description**: Total number of API status checks performed
- **Attributes**:
  - `http.method`: POST
  - `http.status_code`: 200 (success) or 500/0 (failure)
  - `client.key`: Client identifier
  - `api.endpoint`: /graphql
  - `user.authenticated`: Boolean
  - `check.result`: "success" or "failure"

**Use Case**: Track overall API status check activity

### 2. **Successful Checks** (Counter)
- **Name**: `{client_key}_api_status_success_total`
- **Type**: `counter`
- **Description**: Total number of successful API status checks
- **Published**: Only on successful checks

**Use Case**: Calculate success rate by comparing with total checks

### 3. **Response Time Distribution** (Histogram)
- **Name**: `{client_key}_api_status_duration_ms`
- **Type**: `histogram`
- **Unit**: milliseconds
- **Buckets**: 100ms, 500ms, 1s, 2s, 4s, 7s, 10s
- **Attributes**:
  - `performance.classification`: "normal", "degraded", "slow", or "error"
  - All common attributes

**Use Case**: Analyze response time patterns, identify latency issues, calculate percentiles

### 4. **Online/Offline Status** (Gauge)
- **Name**: `{client_key}_api_online_status`
- **Type**: `gauge`
- **Values**: 1 (online) or 0 (offline)
- **Description**: Current API connectivity status

**Use Case**: Real-time monitoring of API availability

### 5. **Connection Quality Score** (UpDownCounter)
- **Name**: `{client_key}_api_connection_quality`
- **Type**: `updowncounter`
- **Range**: 0-100
- **Calculation**: 
  ```
  base_score = 100
  error_penalty = error_rate * 50
  slow_penalty = slow_rate * 30
  quality = max(0, base_score - error_penalty - slow_penalty)
  ```
- **Attributes**:
  - `quality.error_rate`: Decimal error rate
  - `quality.slow_rate`: Decimal slow response rate
  - `quality.classification`: "excellent" (>80), "good" (>60), "fair" (>40), "poor" (≤40)

**Use Case**: Single metric for overall connection health

### 6. **Performance Summary** (Summary)
- **Name**: `{client_key}_api_status_summary`
- **Type**: `summary`
- **Quantiles**: p50, p90, p99
- **Attributes**:
  - `stats.success_rate`: Decimal success rate
  - `stats.total_checks`: Total check count
  - `stats.error_count`: Error count
  - `stats.slow_count`: Slow response count

**Use Case**: Statistical overview of API performance

### 7. **Failed Checks** (Counter)
- **Name**: `{client_key}_api_status_failure_total`
- **Type**: `counter`
- **Description**: Total number of failed API status checks
- **Attributes**:
  - `error.type`: Error name
  - `error.message`: Error message
  - All common error attributes

**Published**: Only on failed checks

**Use Case**: Track and alert on API failures

## Resource Attributes

All metrics include standardized resource attributes:

```typescript
{
  'service.name': 'reactory-pwa-client',
  'service.version': version,
  'host.name': window.location.hostname,
  'deployment.environment': process.env.NODE_ENV
}
```

## Performance Classifications

Response times are classified as:

| Classification | Criteria |
|---------------|----------|
| **normal** | < 4000ms |
| **degraded** | 4000ms - 7000ms |
| **slow** | > 7000ms (after 10 checks) |
| **error** | Request failed |

## Adaptive Timeout Behavior

The function dynamically adjusts its polling interval based on API reliability:

```typescript
// Base timeout increases based on success rate
if (success_rate > 98%) timeout *= 2.5
else if (success_rate > 95%) timeout *= 1.5
else if (success_rate > 90%) timeout *= 1.3

// Additional delays for slow responses
if (response_time > 7000ms) timeout *= 1.5
else if (response_time > 4000ms) timeout *= 1.25
```

## Integration with Monitoring Stack

### Prometheus Queries

**Success Rate**:
```promql
rate({client_key}_api_status_success_total[5m]) / 
rate({client_key}_api_status_checks_total[5m])
```

**Average Response Time**:
```promql
rate({client_key}_api_status_duration_ms_sum[5m]) / 
rate({client_key}_api_status_duration_ms_count[5m])
```

**95th Percentile Response Time**:
```promql
histogram_quantile(0.95, 
  rate({client_key}_api_status_duration_ms_bucket[5m])
)
```

**Current Connection Quality**:
```promql
{client_key}_api_connection_quality
```

**Availability %**:
```promql
avg_over_time({client_key}_api_online_status[5m]) * 100
```

### Grafana Dashboards

Create panels using these metrics for:
- **Uptime/Availability**: Gauge showing current online status
- **Response Time Trends**: Line graph of histogram percentiles
- **Success Rate**: Bar chart or single stat
- **Connection Quality**: Gauge with color thresholds
- **Error Timeline**: Bar chart of failure counts over time
- **Performance Distribution**: Heatmap of response time buckets

### Alerts

Recommended alert rules:

```yaml
# High Error Rate
- alert: APIStatusHighErrorRate
  expr: |
    rate({client_key}_api_status_failure_total[5m]) /
    rate({client_key}_api_status_checks_total[5m]) > 0.1
  for: 5m
  annotations:
    summary: "High API status check error rate"

# Slow Response Time
- alert: APIStatusSlowResponses
  expr: |
    histogram_quantile(0.95, 
      rate({client_key}_api_status_duration_ms_bucket[5m])
    ) > 5000
  for: 10m
  annotations:
    summary: "API status checks are slow"

# Poor Connection Quality
- alert: APIStatusPoorQuality
  expr: {client_key}_api_connection_quality < 50
  for: 5m
  annotations:
    summary: "API connection quality is poor"
```

## Benefits

1. **Comprehensive Observability**: Multiple metric types provide different perspectives on API health
2. **Standards Compliant**: OpenTelemetry-compatible for portability
3. **Real-time Insights**: Metrics published immediately on each status check
4. **Historical Analysis**: Counters and histograms enable trend analysis
5. **Proactive Alerting**: Rich attributes enable precise alerting rules
6. **Performance Optimization**: Histogram data identifies latency hotspots
7. **User Experience Tracking**: Correlates API performance with user experience

## Migration from Legacy

The previous implementation only tracked a single gauge metric. The new implementation:

- **Maintains backward compatibility**: Old metrics still work
- **Adds new dimensions**: Performance classification, quality scores
- **Enables deeper analysis**: Histograms for percentile calculations
- **Improves error tracking**: Dedicated failure metrics with error details
- **Follows best practices**: Semantic attribute naming, proper resource attributes

## Future Enhancements

Potential improvements:
- Add trace correlation with Jaeger spans
- Include browser performance API data (navigation timing)
- Track GraphQL operation-specific metrics
- Add geographic location data for multi-region analysis
- Implement client-side metric aggregation before publishing
- Add network information API data (connection type, effective bandwidth)

## Testing

To verify metrics are being published:

1. Open browser DevTools
2. Monitor Network tab for GraphQL mutations
3. Look for `CorePublishStatistics` mutations
4. Check Prometheus `/metrics` endpoint after OTEL export
5. Query Grafana to visualize metrics

## Related Documentation

- [OpenTelemetry Metrics Specification](https://opentelemetry.io/docs/specs/otel/metrics/)
- [Prometheus Metric Types](https://prometheus.io/docs/concepts/metric_types/)
- [Reactory Statistics Service README](../../../reactory-express-server/src/modules/reactory-core/services/Statistics/README.md)
