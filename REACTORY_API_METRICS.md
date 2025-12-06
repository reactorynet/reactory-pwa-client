# ReactoryApi Telemetry Metrics

This document describes all the OpenTelemetry metrics added to the ReactoryApi class to track application behavior at scale.

## Metrics Overview

### GraphQL Operations

#### Mutations
- **`graphql.mutation.success`** (COUNTER)
  - Tracks successful GraphQL mutations
  - Attributes: duration, hasErrors, refetchQueries

- **`graphql.mutation.duration`** (HISTOGRAM)
  - Tracks mutation execution time distribution
  - Buckets: 100ms, 500ms, 1s, 2s, 5s
  - Attributes: fetchPolicy

- **`graphql.mutation.error`** (COUNTER)
  - Tracks mutation failures
  - Attributes: duration, errorType, errorMessage

- **`graphql.mutation.parse_error`** (COUNTER)
  - Tracks GQL document parsing errors
  - Attributes: error, mutationType

- **`graphql.mutation.graphql_error`** (COUNTER)
  - Tracks individual GraphQL errors in mutations
  - Attributes: errorMessage, errorCode

- **`graphql.mutation.network_error`** (COUNTER)
  - Tracks network-related mutation failures
  - Attributes: statusCode, errorMessage

#### Queries
- **`graphql.query.success`** (COUNTER)
  - Tracks successful GraphQL queries
  - Attributes: duration, fetchPolicy, hasErrors, cacheHit, online

- **`graphql.query.duration`** (HISTOGRAM)
  - Tracks query execution time distribution
  - Buckets: 50ms, 100ms, 250ms, 500ms, 1s, 2s
  - Attributes: fetchPolicy

- **`graphql.query.parse_error`** (COUNTER)
  - Tracks GQL document parsing errors
  - Attributes: error, queryType

### Component Operations

- **`component.registered`** (COUNTER)
  - Tracks component registrations
  - Attributes: componentFqn, componentType, nameSpace, hasRoles, wrapWithApi, errorBoundary

- **`component.retrieved`** (COUNTER)
  - Tracks successful component retrievals
  - Attributes: componentFqn, useReactory, componentType

- **`component.not_found`** (COUNTER)
  - Tracks component lookup failures
  - Attributes: componentFqn

- **`component.retrieval_error`** (COUNTER)
  - Tracks errors during component retrieval
  - Attributes: componentFqn, error

### Authentication Operations

- **`auth.logout`** (COUNTER)
  - Tracks logout events
  - Attributes: duration, refreshStatus

- **`auth.login.success`** (COUNTER)
  - Tracks successful login events
  - Attributes: duration, hasToken

### Form Operations

- **`forms.schema.loaded`** (COUNTER)
  - Tracks form schema loading from server
  - Attributes: duration, formCount, hasErrors

- **`forms.cache.hit`** (COUNTER)
  - Tracks form schema cache hits
  - Attributes: cacheAge

- **`forms.cache.miss`** (COUNTER)
  - Tracks form schema cache misses
  - Attributes: reason (expired|bypass|empty), cacheAge

- **`form.command.component`** (COUNTER)
  - Tracks component-based form commands
  - Attributes: commandId, componentFqn

- **`form.command.workflow`** (COUNTER)
  - Tracks workflow-based form commands
  - Attributes: commandId, duration

- **`form.command.amq`** (COUNTER)
  - Tracks AMQ-based form commands
  - Attributes: commandId, duration

### Storage Operations

- **`storage.write.success`** (COUNTER)
  - Tracks successful storage write operations
  - Attributes: storageType (indexedDB|localStorage), duration, keyLength

- **`storage.write.error`** (COUNTER)
  - Tracks storage write failures
  - Attributes: storageType, duration, error

- **`storage.read.success`** (COUNTER)
  - Tracks successful storage read operations
  - Attributes: storageType, duration, hasValue

- **`storage.read.error`** (COUNTER)
  - Tracks storage read failures
  - Attributes: storageType, duration, error

- **`storage.delete.success`** (COUNTER)
  - Tracks successful storage delete operations
  - Attributes: storageType, duration

- **`storage.delete.error`** (COUNTER)
  - Tracks storage delete failures
  - Attributes: storageType, duration, error

### Workflow Operations

- **`workflow.execute`** (COUNTER)
  - Tracks workflow execution
  - Attributes: workFlowId, duration, success

- **`workflow.error`** (COUNTER)
  - Tracks workflow execution errors
  - Attributes: workFlowId, duration, error

### Notification Operations

- **`notification.created`** (COUNTER)
  - Tracks notification creation
  - Attributes: notificationType, showInApp, canDismiss, titleLength

## Resource Attributes

All metrics include the following standard resource attributes:

- **serviceName**: `reactory-pwa-client`
- **serviceVersion**: `1.0.0`
- **hostName**: Current window hostname
- **deploymentEnvironment**: `development`
- **user.anon**: Whether user is anonymous (boolean)
- **client.key**: Client identifier

## Usage Examples

### Analyzing Query Performance
```
# Average query duration by fetch policy
AVG(graphql.query.duration) GROUP BY attributes.fetchPolicy

# Cache hit rate
COUNT(graphql.query.success WHERE attributes.cacheHit = true) / 
COUNT(graphql.query.success) * 100
```

### Monitoring Component Usage
```
# Most frequently retrieved components
COUNT(component.retrieved) GROUP BY attributes.componentFqn

# Component not found rate
COUNT(component.not_found) / 
(COUNT(component.retrieved) + COUNT(component.not_found)) * 100
```

### Storage Performance
```
# Storage operation latency by type
P95(storage.*.success.duration) GROUP BY attributes.storageType

# Storage error rate
COUNT(storage.*.error) / COUNT(storage.*) * 100
```

### Form Schema Cache Effectiveness
```
# Cache hit ratio
COUNT(forms.cache.hit) / 
(COUNT(forms.cache.hit) + COUNT(forms.cache.miss)) * 100

# Average cache age for hits
AVG(forms.cache.hit.attributes.cacheAge)
```

## Publishing Frequency

All metrics are collected in-memory and automatically published to the server every 5 seconds via the `CorePublishStatistics` GraphQL mutation. The metrics are batched and sent as OTEL-compatible statistics packages.

## Error Handling

All metric collection is wrapped in try-catch blocks to ensure that telemetry failures do not impact application functionality. Errors in metric collection are logged but do not throw exceptions.

## Performance Considerations

- Metrics collection adds minimal overhead (<1ms per operation)
- Histogram buckets are pre-calculated to avoid runtime overhead
- Batching reduces network overhead
- Failed publishes are retried on the next flush interval
- No user-identifiable information is collected (only anonymous flag)

## Future Enhancements

Consider adding metrics for:
- Plugin loading performance and errors
- Theme switching operations
- WebSocket connection health
- i18n translation loading
- Modal component interactions
- Navigation events
- Redux state changes
- Apollo cache statistics
