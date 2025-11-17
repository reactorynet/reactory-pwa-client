# Feature Flags Integration

This document describes the integration of the `@zepz/feature-flags-ts` library into the PWA client and how to use the `useFeatureFlag` hook.

## Overview

The feature flags library has been successfully integrated into the PWA client, providing a comprehensive React hook system for managing feature flags in both development and production environments.

## Installation

The library is installed as a local package:

```json
{
  "@zepz/feature-flags-ts": "file:./lib/zepz-feature-flags-ts-1.0.0.tgz"
}
```

## Available Hooks

### 1. `useFeatureFlag` (Main Hook)

The primary hook that supports all feature flag functionality:

```typescript
import { useFeatureFlag } from './hooks/useFeatureFlag';

const { isEnabled, loading, error, flag, refresh, updateContext } = useFeatureFlag({
  featureId: 'my-feature',
  groupId: 'premium-users',
  context: { userType: 'premium' },
  providerType: 'memory', // or 'api'
  staticFlags: [/* your flags */],
  enableCache: true,
  cacheTTL: 60000,
  showLoading: true,
  defaultValue: false
});
```

### 2. `useSimpleFeatureFlag` (Simplified Hook)

For basic feature flag checks:

```typescript
import { useSimpleFeatureFlag } from './hooks/useFeatureFlag';

const { isEnabled, loading } = useSimpleFeatureFlag('feature-id');
```

### 3. `useApiFeatureFlag` (API Provider Hook)

For remote feature flag management:

```typescript
import { useApiFeatureFlag } from './hooks/useFeatureFlag';

const { isEnabled, loading, error, refresh } = useApiFeatureFlag(
  'feature-id',
  { baseUrl: 'https://api.example.com' },
  { userId: '123' }
);
```

### 4. `useMemoryFeatureFlag` (Memory Provider Hook)

For static feature flag configuration:

```typescript
import { useMemoryFeatureFlag } from './hooks/useFeatureFlag';

const { isEnabled, loading, flag } = useMemoryFeatureFlag(
  'feature-id',
  [new FeatureFlagConfiguration('feature-id', true)],
  { userType: 'premium' }
);
```

## Usage Examples

### Basic Usage

```typescript
import React from 'react';
import { useSimpleFeatureFlag } from './hooks/useFeatureFlag';

const MyComponent: React.FC = () => {
  const { isEnabled, loading } = useSimpleFeatureFlag('new-feature');

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {isEnabled ? (
        <div>New feature is enabled!</div>
      ) : (
        <div>New feature is disabled</div>
      )}
    </div>
  );
};
```

### Context-Aware Features

```typescript
import React from 'react';
import { useFeatureFlag } from './hooks/useFeatureFlag';
import { FeatureFlagConfiguration } from '@zepz/feature-flags-ts';

const PremiumComponent: React.FC = () => {
  const { isEnabled, loading } = useFeatureFlag({
    featureId: 'premium-feature',
    providerType: 'memory',
    staticFlags: [
      new FeatureFlagConfiguration('premium-feature', true, { userType: 'premium' })
    ],
    context: { userType: 'premium' }
  });

  if (loading) return <div>Loading...</div>;

  return isEnabled ? <div>Premium feature enabled!</div> : null;
};
```

### API-Based Features

```typescript
import React from 'react';
import { useApiFeatureFlag } from './hooks/useFeatureFlag';

const RemoteFeatureComponent: React.FC = () => {
  const { isEnabled, loading, error, refresh } = useApiFeatureFlag(
    'remote-feature',
    {
      baseUrl: process.env.REACT_APP_FEATURE_FLAGS_API_URL,
      apiKey: process.env.REACT_APP_FEATURE_FLAGS_API_KEY,
      timeout: 10000,
      cacheEnabled: true,
      cacheTTL: 60000
    },
    { userId: '123', country: 'ZA' }
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {isEnabled ? <div>Remote feature enabled!</div> : <div>Remote feature disabled</div>}
      <button onClick={refresh}>Refresh</button>
    </div>
  );
};
```

## Integration with ReactoryForm

The feature flags can be easily integrated with ReactoryForm components:

```typescript
import React from 'react';
import { useFeatureFlag } from './hooks/useFeatureFlag';
import { FeatureFlagConfiguration } from '@zepz/feature-flags-ts';

const ReactoryFormWithFlags: React.FC = () => {
  const { isEnabled: showAdvancedFields } = useFeatureFlag({
    featureId: 'advanced-form-fields',
    providerType: 'memory',
    staticFlags: [
      new FeatureFlagConfiguration('advanced-form-fields', true)
    ]
  });

  return (
    <form>
      {/* Basic fields always shown */}
      <input type="text" name="name" placeholder="Name" />
      <input type="email" name="email" placeholder="Email" />
      
      {/* Advanced fields only shown if feature flag is enabled */}
      {showAdvancedFields && (
        <>
          <input type="tel" name="phone" placeholder="Phone" />
          <textarea name="address" placeholder="Address" />
        </>
      )}
    </form>
  );
};
```

## Available Components

### 1. `FeatureFlagExample`

A comprehensive example component showing all hook variations:

```typescript
import { FeatureFlagExample } from './hooks';

// Use in your app
<FeatureFlagExample />
```

### 2. `TestFeatureFlagHook`

A simple test component to verify hook functionality:

```typescript
import { TestFeatureFlagHook } from './hooks';

// Use in your app
<TestFeatureFlagHook />
```

### 3. `ReactoryFormWithFeatureFlags`

An integration example showing feature flags with forms:

```typescript
import { ReactoryFormWithFeatureFlags } from './hooks';

// Use in your app
<ReactoryFormWithFeatureFlags />
```

## Configuration

### Environment Variables

For API-based feature flags, you can configure the following environment variables:

```bash
REACT_APP_FEATURE_FLAGS_API_URL=https://api.example.com
REACT_APP_FEATURE_FLAGS_API_KEY=your-api-key
```

### Provider Types

1. **Memory Provider**: For static configuration and development
2. **API Provider**: For remote configuration and production

### Caching

Both providers support caching:
- **Memory Provider**: No caching (static data)
- **API Provider**: Configurable cache TTL (default: 60 seconds)

## Error Handling

The hooks provide comprehensive error handling:

```typescript
const { isEnabled, loading, error, refresh } = useFeatureFlag({
  featureId: 'my-feature',
  providerType: 'api',
  apiConfig: { baseUrl: 'https://api.example.com' }
});

if (error) {
  console.error('Feature flag error:', error.message);
  // Handle error appropriately
}
```

## Performance Considerations

1. **Caching**: API provider uses caching to reduce network requests
2. **Loading States**: Hooks provide loading states for better UX
3. **Default Values**: Configure default values for graceful degradation
4. **Context Updates**: Efficient context updates without unnecessary re-renders

## Testing

The hooks are designed to be easily testable:

```typescript
// Test with memory provider
const { isEnabled } = useFeatureFlag({
  featureId: 'test-feature',
  providerType: 'memory',
  staticFlags: [new FeatureFlagConfiguration('test-feature', true)]
});

expect(isEnabled).toBe(true);
```

## Migration Guide

### From Manual Feature Flags

Replace manual feature flag checks:

```typescript
// Before
const isFeatureEnabled = localStorage.getItem('feature-flag') === 'true';

// After
const { isEnabled } = useSimpleFeatureFlag('feature-flag');
```

### From Environment Variables

Replace environment-based feature flags:

```typescript
// Before
const isFeatureEnabled = process.env.REACT_APP_FEATURE_ENABLED === 'true';

// After
const { isEnabled } = useFeatureFlag({
  featureId: 'feature-flag',
  providerType: 'memory',
  staticFlags: [new FeatureFlagConfiguration('feature-flag', true)]
});
```

## Troubleshooting

### Common Issues

1. **Package not found**: Ensure the package is installed correctly
2. **API errors**: Check API configuration and network connectivity
3. **Loading states**: Verify provider initialization
4. **Context mismatches**: Ensure context keys match feature flag configuration

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
REACT_APP_DEBUG_FEATURE_FLAGS=true
```

## Future Enhancements

1. **Real-time updates**: WebSocket support for live feature flag updates
2. **A/B testing**: Built-in A/B testing capabilities
3. **Analytics**: Feature flag usage analytics
4. **Admin panel**: Web-based feature flag management interface

## Support

For issues or questions:
- Check the example components for usage patterns
- Review the TypeScript interfaces for type safety
- Test with the provided test components
- Consult the feature flags library documentation 