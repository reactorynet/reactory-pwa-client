import { MemoryFeatureFlagProvider, ApiFeatureFlagProvider, FeatureFlagConfiguration } from '../index';
import { DEFAULT_GROUP_ID } from '../types';

describe('Feature Flags Library Integration', () => {
  describe('Memory Provider Integration', () => {
    let provider: MemoryFeatureFlagProvider;

    beforeEach(() => {
      provider = new MemoryFeatureFlagProvider();
    });

    it('should handle complete feature flag lifecycle', async () => {
      // 1. Create feature flags
      const flags = [
        new FeatureFlagConfiguration('feature-1', true, { country: 'ZA' }, 75.0, 'test-group'),
        new FeatureFlagConfiguration('feature-2', false, {}, 100.0, 'test-group'),
        new FeatureFlagConfiguration('feature-3', true, {}, 50.0, 'default')
      ];

      // 2. Initialize provider
      provider = new MemoryFeatureFlagProvider(flags);
      await provider.initialize();

      // 3. Test feature flag checks
      expect(provider.isFeatureEnabled('feature-1', 'test-group', { country: 'ZA' })).toBe(true);
      expect(provider.isFeatureEnabled('feature-1', 'test-group', { country: 'US' })).toBe(false);
      expect(provider.isFeatureEnabled('feature-2')).toBe(false);
      expect(provider.isFeatureEnabled('feature-3')).toBe(true);

      // 4. Test group-specific checks
      expect(provider.isFeatureEnabled('feature-1', 'test-group')).toBe(true);
      expect(provider.isFeatureEnabled('feature-1', 'wrong-group')).toBe(false);

      // 5. Test statistics tracking
      const flag = provider.getFeatureFlag('feature-1', 'test-group', { country: 'ZA' });
      expect(flag.flowStatistic.requestCount).toBe(3); // 1 from initial setup + 2 from previous calls

      // 6. Test success/failure tracking
      flag.flowStatistic.onSuccess();
      expect(flag.flowStatistic.successCount).toBe(1);
      expect(flag.flowStatistic.executedCount).toBe(1);

      flag.flowStatistic.onFailed();
      expect(flag.flowStatistic.failedCount).toBe(1);
      expect(flag.flowStatistic.executedCount).toBe(2);

      // 7. Test flow rate validation
      expect(flag.validateFlowRate()).toBe(true); // 100% flow rate, should pass
    });

    it('should handle auto-disable functionality', async () => {
      const flag = new FeatureFlagConfiguration(
        'auto-disable-test',
        true,
        {},
        100.0,
        'test-group',
        10.0, // 10% error rate threshold
        100   // 100 minimum samples
      );

      provider = new MemoryFeatureFlagProvider([flag]);
      await provider.initialize();

      // Add some successful executions
      for (let i = 0; i < 50; i++) {
        flag.flowStatistic.onRequested();
        flag.flowStatistic.onSuccess();
      }

      // Add some failed executions (but below threshold)
      for (let i = 0; i < 30; i++) {
        flag.flowStatistic.onRequested();
        flag.flowStatistic.onFailed();
      }

      // Should still be enabled (30% failure rate, but only 80 samples)
      expect(flag.validateFlowRate()).toBe(true);

      // Add more failures to exceed threshold
      for (let i = 0; i < 50; i++) {
        flag.flowStatistic.onRequested();
        flag.flowStatistic.onFailed();
      }

      // Should be disabled (80% failure rate, 130 samples > 100)
      expect(flag.validateFlowRate()).toBe(false);
    });

    it('should handle context matching correctly', async () => {
      const flags = [
        new FeatureFlagConfiguration('context-test', true, { country: 'ZA', currency: 'ZAR' }),
        new FeatureFlagConfiguration('context-test', true, { country: 'US', currency: 'USD' }),
        new FeatureFlagConfiguration('context-test', false, { country: 'UK', currency: 'GBP' })
      ];

      provider = new MemoryFeatureFlagProvider(flags);
      await provider.initialize();

      // Test exact context matches
      expect(provider.isFeatureEnabled('context-test', { country: 'ZA', currency: 'ZAR' })).toBe(true);
      expect(provider.isFeatureEnabled('context-test', { country: 'US', currency: 'USD' })).toBe(true);
      expect(provider.isFeatureEnabled('context-test', { country: 'UK', currency: 'GBP' })).toBe(false);

      // Test partial context matches (should not match)
      expect(provider.isFeatureEnabled('context-test', { country: 'ZA' })).toBe(false);
      expect(provider.isFeatureEnabled('context-test', { currency: 'ZAR' })).toBe(false);

      // Test extra context keys (should not match)
      expect(provider.isFeatureEnabled('context-test', { 
        country: 'ZA', 
        currency: 'ZAR', 
        extra: 'value' 
      })).toBe(false);
    });

    it('should handle builder pattern integration', async () => {
      const flag = new FeatureFlagConfiguration.Builder()
        .withFeatureId('builder-test')
        .withDescription('Built with builder pattern')
        .withEnabled(true)
        .withContext({ userId: '123', userType: 'premium' })
        .withFlowRate(75.0)
        .withGroupId('premium-users')
        .withAutoDisableErrorRate(5.0)
        .withAutoDisableMinimumSamples(500)
        .build();

      provider = new MemoryFeatureFlagProvider([flag]);
      await provider.initialize();

      expect(flag.featureId).toBe('builder-test');
      expect(flag.description).toBe('Built with builder pattern');
      expect(flag.enabled).toBe(true);
      expect(flag.context).toEqual({ userId: '123', userType: 'premium' });
      expect(flag.flowRate).toBe(75.0);
      expect(flag.groupId).toBe('premium-users');
      expect(flag.autoDisableErrorRate).toBe(5.0);
      expect(flag.autoDisableMinimumSamples).toBe(500);

      // Test the built flag works correctly
      expect(provider.isFeatureEnabled('builder-test', 'premium-users', { userId: '123', userType: 'premium' })).toBe(true);
      expect(provider.isFeatureEnabled('builder-test', 'premium-users', { userId: '456', userType: 'premium' })).toBe(false);
    });

    it('should handle multiple providers with different configurations', async () => {
      const provider1 = new MemoryFeatureFlagProvider([
        new FeatureFlagConfiguration('shared-feature', true, {}, 100.0, 'group-1')
      ]);

      const provider2 = new MemoryFeatureFlagProvider([
        new FeatureFlagConfiguration('shared-feature', false, {}, 100.0, 'group-2')
      ]);

      await provider1.initialize();
      await provider2.initialize();

      // Same feature, different groups, different enabled states
      expect(provider1.isFeatureEnabled('shared-feature', 'group-1')).toBe(true);
      expect(provider2.isFeatureEnabled('shared-feature', 'group-2')).toBe(false);

      // Different session IDs
      expect(provider1.getSessionId()).not.toBe(provider2.getSessionId());
    });

    it('should handle statistics aggregation', async () => {
      const flag = new FeatureFlagConfiguration('stats-test', true);
      provider = new MemoryFeatureFlagProvider([flag]);
      await provider.initialize();

      // Simulate real-world usage pattern
      for (let i = 0; i < 100; i++) {
        const retrievedFlag = provider.getFeatureFlag('stats-test');
        retrievedFlag.flowStatistic.onRequested();

        if (i % 10 === 0) {
          // 10% failure rate
          retrievedFlag.flowStatistic.onFailed();
        } else {
          retrievedFlag.flowStatistic.onSuccess();
        }
      }

      const finalFlag = provider.getFeatureFlag('stats-test');
      expect(finalFlag.flowStatistic.requestCount).toBe(201); // 1 from getFeatureFlag + 200 from loop
      expect(finalFlag.flowStatistic.executedCount).toBe(100);
      expect(finalFlag.flowStatistic.successCount).toBe(90);
      expect(finalFlag.flowStatistic.failedCount).toBe(10);
      expect(finalFlag.flowStatistic.getSuccessRate()).toBe(90);
      expect(finalFlag.flowStatistic.getFailureRate()).toBe(10);
      // Flow rate is calculated as (executedCount / requestCount) * 100
      // Since we call getFeatureFlag 100 times + 1 initial call, requestCount = 201, executedCount = 100
      // So flow rate = (100 / 201) * 100 ≈ 49.75%
      expect(finalFlag.flowStatistic.getFlowRate()).toBeCloseTo(49.75, 1);
    });

    it('should handle edge cases and error conditions', async () => {
      // Test with empty provider
      const emptyProvider = new MemoryFeatureFlagProvider();
      await emptyProvider.initialize();

      expect(emptyProvider.getFlags()).toEqual([]);
      expect(emptyProvider.isFeatureEnabled('any-feature')).toBe(false);

      // Test with null/undefined contexts
      const flag = provider.getFeatureFlag('test-feature', undefined);
      expect(flag).toBeDefined();
      expect(flag.featureId).toBe('test-feature');
      expect(flag.enabled).toBe(false);

      // Test with empty context
      const flag2 = provider.getFeatureFlag('test-feature', {});
      expect(flag2).toBeDefined();

      // Test with complex context
      const complexContext = {
        userId: '12345',
        country: 'ZA',
        currency: 'ZAR',
        userType: 'premium',
        features: 'feature1,feature2'
      };

      const flag3 = provider.getFeatureFlag('test-feature', complexContext);
      expect(flag3).toBeDefined();
    });

    it('should handle flag updates and modifications', async () => {
      const flag = new FeatureFlagConfiguration('update-test', false);
      provider = new MemoryFeatureFlagProvider([flag]);
      await provider.initialize();

      // Initially disabled
      expect(provider.isFeatureEnabled('update-test')).toBe(false);

      // Update the flag
      flag.setEnabled(true);
      flag.setFlowRate(50.0);
      flag.setContext({ country: 'ZA' });

      // Should now be enabled
      expect(provider.isFeatureEnabled('update-test')).toBe(true);
      expect(provider.isFeatureEnabled('update-test', { country: 'ZA' })).toBe(true);
      expect(provider.isFeatureEnabled('update-test', { country: 'US' })).toBe(false);
    });

    it('should handle equals and hashCode correctly', async () => {
      const flag1 = new FeatureFlagConfiguration('equals-test', true, { country: 'ZA' }, 100.0, 'test-group');
      const flag2 = new FeatureFlagConfiguration('equals-test', true, { country: 'ZA' }, 100.0, 'test-group');
      const flag3 = new FeatureFlagConfiguration('equals-test', false, { country: 'ZA' }, 100.0, 'test-group');

      expect(flag1.equals(flag2)).toBe(true);
      expect(flag1.equals(flag3)).toBe(false);
      expect(flag1.hashCode()).toBe(flag2.hashCode());
      expect(flag1.hashCode()).not.toBe(flag3.hashCode());
    });
  });

  describe('API Provider Integration', () => {
    // Note: These tests would require a mock server or extensive mocking
    // For now, we'll test the basic structure and error handling

    it('should handle API provider configuration', () => {
      const provider = new ApiFeatureFlagProvider({
        baseUrl: 'https://api.test.com',
        apiKey: 'test-key',
        timeout: 10000,
        cacheEnabled: true,
        cacheTTL: 60000
      });

      expect(provider).toBeDefined();
      expect(provider.getSessionId()).toBeDefined();
    });

    it('should handle cache operations', () => {
      const provider = new ApiFeatureFlagProvider({
        baseUrl: 'https://api.test.com',
        cacheEnabled: true
      });

      // Test cache stats
      const stats = provider.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);

      // Test cache clearing
      provider.clearCache();
      const statsAfterClear = provider.getCacheStats();
      expect(statsAfterClear.size).toBe(0);
    });
  });

  describe('Cross-Provider Integration', () => {
    it('should handle switching between providers', async () => {
      // Create memory provider for development
      const memoryProvider = new MemoryFeatureFlagProvider([
        new FeatureFlagConfiguration('dev-feature', true)
      ]);
      await memoryProvider.initialize();

      // Create API provider for production (mocked)
      const apiProvider = new ApiFeatureFlagProvider({
        baseUrl: 'https://api.test.com',
        cacheEnabled: false
      });

      // Both should have unique session IDs
      expect(memoryProvider.getSessionId()).not.toBe(apiProvider.getSessionId());

      // Both should implement the same interface
      expect(typeof memoryProvider.isFeatureEnabled).toBe('function');
      expect(typeof apiProvider.isFeatureEnabled).toBe('function');
      expect(typeof memoryProvider.getFeatureFlag).toBe('function');
      expect(typeof apiProvider.getFeatureFlag).toBe('function');
    });

    it('should handle provider-specific features', async () => {
      const memoryProvider = new MemoryFeatureFlagProvider();
      const apiProvider = new ApiFeatureFlagProvider({ baseUrl: 'https://api.test.com' });

      // Memory provider specific features
      memoryProvider.addStaticFlag(new FeatureFlagConfiguration('static-feature', true));
      expect(memoryProvider.getStaticFlags()).toHaveLength(1);

      // API provider specific features
      expect(typeof apiProvider.getCacheStats).toBe('function');
      expect(typeof apiProvider.clearCache).toBe('function');
    });
  });
}); 