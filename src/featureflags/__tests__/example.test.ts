import { MemoryFeatureFlagProvider, ApiFeatureFlagProvider, FeatureFlagConfiguration } from '../index';

/**
 * Example usage of the Feature Flags Library
 * This demonstrates real-world scenarios and best practices
 */
describe('Feature Flags Library Examples', () => {
  describe('Basic Usage Examples', () => {
    it('should demonstrate simple feature flag usage', async () => {
      // Create a memory provider for development/testing
      const provider = new MemoryFeatureFlagProvider([
        new FeatureFlagConfiguration('new-ui', true),
        new FeatureFlagConfiguration('beta-feature', false),
        new FeatureFlagConfiguration('premium-feature', true, { userType: 'premium' })
      ]);

      await provider.initialize();

      // Check if features are enabled
      expect(provider.isFeatureEnabled('new-ui')).toBe(true);
      expect(provider.isFeatureEnabled('beta-feature')).toBe(false);
      expect(provider.isFeatureEnabled('premium-feature', { userType: 'premium' })).toBe(true);
      expect(provider.isFeatureEnabled('premium-feature', { userType: 'basic' })).toBe(false);
    });

    it('should demonstrate builder pattern usage', () => {
      // Use the builder pattern for complex configurations
      const flag = new FeatureFlagConfiguration.Builder()
        .withFeatureId('advanced-feature')
        .withDescription('Advanced feature with complex configuration')
        .withEnabled(true)
        .withContext({ 
          country: 'ZA', 
          currency: 'ZAR', 
          userType: 'premium' 
        })
        .withFlowRate(50.0) // Only 50% of traffic
        .withGroupId('payment-processor')
        .withAutoDisableErrorRate(5.0) // Auto-disable if 5% error rate
        .withAutoDisableMinimumSamples(1000) // After 1000 samples
        .build();

      expect(flag.featureId).toBe('advanced-feature');
      expect(flag.enabled).toBe(true);
      expect(flag.flowRate).toBe(50.0);
      expect(flag.groupId).toBe('payment-processor');
    });

    it('should demonstrate statistics tracking', async () => {
      const provider = new MemoryFeatureFlagProvider([
        new FeatureFlagConfiguration('tracked-feature', true)
      ]);

      await provider.initialize();

      // Get the feature flag and track usage
      const flag = provider.getFeatureFlag('tracked-feature');

      // Simulate feature usage
      for (let i = 0; i < 100; i++) {
        flag.flowStatistic.onRequested();

        if (i % 10 === 0) {
          // 10% failure rate
          flag.flowStatistic.onFailed();
        } else {
          flag.flowStatistic.onSuccess();
        }
      }

      // Check statistics
      expect(flag.flowStatistic.requestCount).toBe(101); // 1 from getFeatureFlag + 100 from loop
      expect(flag.flowStatistic.executedCount).toBe(100);
      expect(flag.flowStatistic.successCount).toBe(90);
      expect(flag.flowStatistic.failedCount).toBe(10);
      expect(flag.flowStatistic.getSuccessRate()).toBe(90);
      expect(flag.flowStatistic.getFailureRate()).toBe(10);
    });
  });

  describe('Advanced Usage Examples', () => {
    it('should demonstrate context-aware features', async () => {
      const provider = new MemoryFeatureFlagProvider([
        // Different configurations for different contexts
        new FeatureFlagConfiguration('payment-feature', true, { 
          country: 'ZA', 
          currency: 'ZAR' 
        }),
        new FeatureFlagConfiguration('payment-feature', true, { 
          country: 'US', 
          currency: 'USD' 
        }),
        new FeatureFlagConfiguration('payment-feature', false, { 
          country: 'UK', 
          currency: 'GBP' 
        })
      ]);

      await provider.initialize();

      // Test different contexts
      expect(provider.isFeatureEnabled('payment-feature', { 
        country: 'ZA', 
        currency: 'ZAR' 
      })).toBe(true);

      expect(provider.isFeatureEnabled('payment-feature', { 
        country: 'US', 
        currency: 'USD' 
      })).toBe(true);

      expect(provider.isFeatureEnabled('payment-feature', { 
        country: 'UK', 
        currency: 'GBP' 
      })).toBe(false);
    });

    it('should demonstrate group-based features', async () => {
      const provider = new MemoryFeatureFlagProvider([
        new FeatureFlagConfiguration('admin-feature', true, {}, 100.0, 'admin'),
        new FeatureFlagConfiguration('user-feature', true, {}, 100.0, 'users'),
        new FeatureFlagConfiguration('shared-feature', true, {}, 100.0, 'default')
      ]);

      await provider.initialize();

      // Test group-specific features
      expect(provider.isFeatureEnabled('admin-feature', 'admin')).toBe(true);
      expect(provider.isFeatureEnabled('admin-feature', 'users')).toBe(false);

      expect(provider.isFeatureEnabled('user-feature', 'users')).toBe(true);
      expect(provider.isFeatureEnabled('user-feature', 'admin')).toBe(false);

      expect(provider.isFeatureEnabled('shared-feature', 'default')).toBe(true);
      expect(provider.isFeatureEnabled('shared-feature', 'admin')).toBe(false);
    });

    it('should demonstrate flow rate control', async () => {
      const provider = new MemoryFeatureFlagProvider([
        new FeatureFlagConfiguration('gradual-rollout', true, {}, 25.0) // 25% traffic
      ]);

      await provider.initialize();

      const flag = provider.getFeatureFlag('gradual-rollout');

      // Simulate traffic
      for (let i = 0; i < 100; i++) {
        flag.flowStatistic.onRequested();
        flag.flowStatistic.onSuccess();
      }

      // Check flow rate - should be close to 100% but may not be exactly 100 due to timing
      expect(flag.flowStatistic.getFlowRate()).toBeGreaterThan(95); // All requests were executed
      
      // The feature should be disabled because flow rate exceeds 25%
      expect(flag.validateFlowRate()).toBe(false);
    });

    it('should demonstrate auto-disable functionality', async () => {
      const provider = new MemoryFeatureFlagProvider([
        new FeatureFlagConfiguration(
          'auto-disable-test',
          true,
          {},
          100.0,
          'default',
          10.0, // 10% error rate threshold
          50    // 50 minimum samples
        )
      ]);

      await provider.initialize();

      const flag = provider.getFeatureFlag('auto-disable-test');

      // Add some successful executions
      for (let i = 0; i < 30; i++) {
        flag.flowStatistic.onRequested();
        flag.flowStatistic.onSuccess();
      }

      // Add some failed executions (but below threshold)
      for (let i = 0; i < 10; i++) {
        flag.flowStatistic.onRequested();
        flag.flowStatistic.onFailed();
      }

      // Should still be enabled (25% failure rate, but only 40 samples < 50)
      expect(flag.validateFlowRate()).toBe(true);

      // Add more failures to exceed threshold
      for (let i = 0; i < 20; i++) {
        flag.flowStatistic.onRequested();
        flag.flowStatistic.onFailed();
      }

      // Should be disabled (50% failure rate, 60 samples > 50)
      expect(flag.validateFlowRate()).toBe(false);
    });
  });

  describe('Production Usage Examples', () => {
    it('should demonstrate API provider configuration', () => {
      // Configure API provider for production
      const apiProvider = new ApiFeatureFlagProvider({
        baseUrl: 'https://api.zepz.com/feature-flags',
        apiKey: process.env.FEATURE_FLAGS_API_KEY,
        timeout: 5000,
        cacheEnabled: true,
        cacheTTL: 30000 // 30 seconds
      });

      expect(apiProvider).toBeDefined();
      expect(typeof apiProvider.getSessionId()).toBe('string');
    });

    it('should demonstrate provider switching', async () => {
      // Development environment - use memory provider
      const devProvider = new MemoryFeatureFlagProvider([
        new FeatureFlagConfiguration('dev-feature', true)
      ]);

      // Production environment - use API provider
      const prodProvider = new ApiFeatureFlagProvider({
        baseUrl: 'https://api.zepz.com/feature-flags'
      });

      await devProvider.initialize();

      // Both providers implement the same interface
      expect(typeof devProvider.isFeatureEnabled).toBe('function');
      expect(typeof prodProvider.isFeatureEnabled).toBe('function');
      expect(typeof devProvider.getFeatureFlag).toBe('function');
      expect(typeof prodProvider.getFeatureFlag).toBe('function');

      // Test development provider
      expect(devProvider.isFeatureEnabled('dev-feature')).toBe(true);
    });

    it('should demonstrate error handling', async () => {
      const provider = new MemoryFeatureFlagProvider();

      await provider.initialize();

      // Test with non-existent features
      expect(provider.isFeatureEnabled('non-existent')).toBe(false);

      // Test with non-existent groups
      expect(provider.isFeatureEnabled('feature', 'non-existent-group')).toBe(false);

      // Test with null/undefined contexts
      const flag = provider.getFeatureFlag('test-feature', undefined);
      expect(flag).toBeDefined();
      expect(flag.enabled).toBe(false);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should demonstrate A/B testing scenario', async () => {
      const provider = new MemoryFeatureFlagProvider([
        // A/B test for new payment flow
        new FeatureFlagConfiguration('new-payment-flow', true, { 
          userId: 'user-123',
          experiment: 'payment-v2'
        }, 50.0), // 50% traffic
        new FeatureFlagConfiguration('new-payment-flow', false, { 
          userId: 'user-456',
          experiment: 'payment-v2'
        }, 50.0)  // 50% traffic
      ]);

      await provider.initialize();

      // User 123 gets the new flow
      expect(provider.isFeatureEnabled('new-payment-flow', { 
        userId: 'user-123',
        experiment: 'payment-v2'
      })).toBe(true);

      // User 456 gets the old flow
      expect(provider.isFeatureEnabled('new-payment-flow', { 
        userId: 'user-456',
        experiment: 'payment-v2'
      })).toBe(false);
    });

    it('should demonstrate gradual rollout scenario', async () => {
      const provider = new MemoryFeatureFlagProvider([
        // Gradual rollout: 10% -> 25% -> 50% -> 100%
        new FeatureFlagConfiguration('new-feature-10', true, {}, 10.0),  // 10% traffic
        new FeatureFlagConfiguration('new-feature-25', true, {}, 25.0),  // 25% traffic
        new FeatureFlagConfiguration('new-feature-50', true, {}, 50.0),  // 50% traffic
        new FeatureFlagConfiguration('new-feature-100', true, {}, 100.0)  // 100% traffic
      ]);

      await provider.initialize();

      // Test different rollout stages
      const flag10 = provider.getFeatureFlag('new-feature-10');
      const flag25 = provider.getFeatureFlag('new-feature-25');
      const flag50 = provider.getFeatureFlag('new-feature-50');
      const flag100 = provider.getFeatureFlag('new-feature-100');

      expect(flag10.flowRate).toBe(10.0);
      expect(flag25.flowRate).toBe(25.0);
      expect(flag50.flowRate).toBe(50.0);
      expect(flag100.flowRate).toBe(100.0);
    });

    it('should demonstrate feature flag lifecycle', async () => {
      const provider = new MemoryFeatureFlagProvider();

      await provider.initialize();

      // 1. Create feature flag
      const flag = new FeatureFlagConfiguration('lifecycle-test', false);
      provider.addStaticFlag(flag);

      // 2. Initially disabled
      expect(provider.isFeatureEnabled('lifecycle-test')).toBe(false);

      // 3. Enable the feature
      flag.setEnabled(true);
      expect(provider.isFeatureEnabled('lifecycle-test')).toBe(true);

      // 4. Add context restrictions
      flag.setContext({ userType: 'premium' });
      expect(provider.isFeatureEnabled('lifecycle-test', { userType: 'premium' })).toBe(true);
      expect(provider.isFeatureEnabled('lifecycle-test', { userType: 'basic' })).toBe(false);

      // 5. Adjust flow rate
      flag.setFlowRate(25.0);
      expect(flag.flowRate).toBe(25.0);

      // 6. Set auto-disable parameters
      flag.setAutoDisableErrorRate(5.0);
      flag.setAutoDisableMinimumSamples(1000);
      expect(flag.autoDisableErrorRate).toBe(5.0);
      expect(flag.autoDisableMinimumSamples).toBe(1000);

      // 7. Track usage
      const retrievedFlag = provider.getFeatureFlag('lifecycle-test');
      retrievedFlag.flowStatistic.onSuccess();
      expect(retrievedFlag.flowStatistic.successCount).toBe(1);
    });
  });
}); 