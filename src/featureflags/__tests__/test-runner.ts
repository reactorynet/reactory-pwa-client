import { MemoryFeatureFlagProvider, ApiFeatureFlagProvider, FeatureFlagConfiguration } from '../index';

/**
 * Test runner for manual testing and validation
 */
export class FeatureFlagsTestRunner {
  private results: Array<{ test: string; passed: boolean; error?: string }> = [];

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Running Feature Flags Library Tests...\n');

    await this.testFeatureFlagConfiguration();
    await this.testFeatureFlagFlowStatistic();
    await this.testMemoryProvider();
    await this.testApiProvider();
    await this.testIntegration();

    this.printResults();
  }

  /**
   * Test FeatureFlagConfiguration
   */
  private async testFeatureFlagConfiguration(): Promise<void> {
    console.log('📋 Testing FeatureFlagConfiguration...');

    try {
      // Test constructor
      const config = new FeatureFlagConfiguration('test-feature', true, { country: 'ZA' }, 75.0, 'test-group');
      this.assert(config.featureId === 'test-feature', 'Feature ID should be set');
      this.assert(config.enabled === true, 'Enabled should be set');
      this.assert(config.context.country === 'ZA', 'Context should be set');
      this.assert(config.flowRate === 75.0, 'Flow rate should be set');
      this.assert(config.groupId === 'test-group', 'Group ID should be set');

      // Test builder pattern
      const builtConfig = new FeatureFlagConfiguration.Builder()
        .withFeatureId('builder-feature')
        .withEnabled(true)
        .withContext({ userId: '123' })
        .withFlowRate(50.0)
        .withGroupId('builder-group')
        .build();

      this.assert(builtConfig.featureId === 'builder-feature', 'Builder should set feature ID');
      this.assert(builtConfig.enabled === true, 'Builder should set enabled');
      this.assert(builtConfig.context.userId === '123', 'Builder should set context');
      this.assert(builtConfig.flowRate === 50.0, 'Builder should set flow rate');
      this.assert(builtConfig.groupId === 'builder-group', 'Builder should set group ID');

      // Test isEnabled
      this.assert(config.isEnabled({ country: 'ZA' }) === true, 'Should be enabled with matching context');
      this.assert(config.isEnabled({ country: 'US' }) === false, 'Should be disabled with non-matching context');

      // Test setters
      config.setEnabled(false);
      this.assert(config.enabled === false, 'Setter should update enabled');

      config.setFlowRate(25.0);
      this.assert(config.flowRate === 25.0, 'Setter should update flow rate');

      // Test equals and hashCode
      const config2 = new FeatureFlagConfiguration('test-feature', true, { country: 'ZA' }, 75.0, 'test-group');
      this.assert(config.equals(config2) === false, 'Different configs should not be equal');
      this.assert(config.hashCode() !== config2.hashCode(), 'Different configs should have different hash codes');

      this.addResult('FeatureFlagConfiguration', true);
    } catch (error) {
      this.addResult('FeatureFlagConfiguration', false, error as string);
    }
  }

  /**
   * Test FeatureFlagFlowStatistic
   */
  private async testFeatureFlagFlowStatistic(): Promise<void> {
    console.log('📊 Testing FeatureFlagFlowStatistic...');

    try {
      const statistic = new FeatureFlagConfiguration('test-feature', true).flowStatistic;

      // Test initial state
      this.assert(statistic.requestCount === 0, 'Initial request count should be 0');
      this.assert(statistic.executedCount === 0, 'Initial executed count should be 0');

      // Test onRequested
      statistic.onRequested();
      this.assert(statistic.requestCount === 1, 'onRequested should increment request count');

      // Test onSuccess
      statistic.onSuccess();
      this.assert(statistic.successCount === 1, 'onSuccess should increment success count');
      this.assert(statistic.executedCount === 1, 'onSuccess should increment executed count');

      // Test onFailed
      statistic.onFailed();
      this.assert(statistic.failedCount === 1, 'onFailed should increment failed count');
      this.assert(statistic.executedCount === 2, 'onFailed should increment executed count');

      // Test flow rate calculation
      statistic.onRequested();
      statistic.onSuccess();
      const flowRate = statistic.getFlowRate();
      this.assert(flowRate === 100, 'Flow rate should be 100% when all requests are executed');

      // Test success rate calculation
      const successRate = statistic.getSuccessRate();
      this.assert(successRate === 50, 'Success rate should be 50% (1 success, 1 failure)');

      // Test failure rate calculation
      const failureRate = statistic.getFailureRate();
      this.assert(failureRate === 50, 'Failure rate should be 50% (1 success, 1 failure)');

      // Test reset
      statistic.reset();
      this.assert(statistic.requestCount === 0, 'Reset should clear request count');
      this.assert(statistic.executedCount === 0, 'Reset should clear executed count');
      this.assert(statistic.successCount === 0, 'Reset should clear success count');
      this.assert(statistic.failedCount === 0, 'Reset should clear failed count');

      this.addResult('FeatureFlagFlowStatistic', true);
    } catch (error) {
      this.addResult('FeatureFlagFlowStatistic', false, error as string);
    }
  }

  /**
   * Test MemoryProvider
   */
  private async testMemoryProvider(): Promise<void> {
    console.log('💾 Testing MemoryFeatureFlagProvider...');

    try {
      const flags = [
        new FeatureFlagConfiguration('feature-1', true, { country: 'ZA' }),
        new FeatureFlagConfiguration('feature-2', false),
        new FeatureFlagConfiguration('feature-3', true, {}, 100.0, 'test-group')
      ];

      const provider = new MemoryFeatureFlagProvider(flags);
      await provider.initialize();

      // Test isFeatureEnabled
      this.assert(provider.isFeatureEnabled('feature-1', { country: 'ZA' }) === true, 'Should be enabled with matching context');
      this.assert(provider.isFeatureEnabled('feature-1', { country: 'US' }) === false, 'Should be disabled with non-matching context');
      this.assert(provider.isFeatureEnabled('feature-2') === false, 'Disabled feature should return false');
      this.assert(provider.isFeatureEnabled('feature-3', 'test-group') === true, 'Should be enabled in correct group');
      this.assert(provider.isFeatureEnabled('feature-3', 'wrong-group') === false, 'Should be disabled in wrong group');

      // Test getFeatureFlag
      const flag = provider.getFeatureFlag('feature-1', { country: 'ZA' });
      this.assert(flag.featureId === 'feature-1', 'Should return correct feature flag');
      this.assert(flag.flowStatistic.requestCount === 1, 'Should track request count');

      // Test getFlags
      const allFlags = provider.getFlags();
      this.assert(allFlags.length === 3, 'Should return all flags');

      // Test getFlagsForGroup
      const groupFlags = provider.getFlagsForGroup('test-group');
      this.assert(groupFlags.length === 1, 'Should return flags for specific group');

      // Test getFlagsWithFeatureId
      const featureFlags = provider.getFlagsWithFeatureId('feature-1');
      this.assert(featureFlags.length === 1, 'Should return flags with specific feature ID');

      // Test session ID
      const sessionId = provider.getSessionId();
      this.assert(typeof sessionId === 'string', 'Should return session ID');
      this.assert(sessionId.length > 0, 'Session ID should not be empty');

      this.addResult('MemoryFeatureFlagProvider', true);
    } catch (error) {
      this.addResult('MemoryFeatureFlagProvider', false, error as string);
    }
  }

  /**
   * Test ApiProvider
   */
  private async testApiProvider(): Promise<void> {
    console.log('🌐 Testing ApiFeatureFlagProvider...');

    try {
      const provider = new ApiFeatureFlagProvider({
        baseUrl: 'https://api.test.com',
        apiKey: 'test-key',
        timeout: 5000,
        cacheEnabled: true,
        cacheTTL: 30000
      });

      // Test constructor
      this.assert(provider !== null, 'Provider should be created');
      this.assert(typeof provider.getSessionId() === 'string', 'Should have session ID');

      // Test cache operations
      const cacheStats = provider.getCacheStats();
      this.assert(cacheStats.size === 0, 'Initial cache should be empty');
      this.assert(Array.isArray(cacheStats.keys), 'Cache keys should be array');

      // Test cache clearing
      provider.clearCache();
      const statsAfterClear = provider.getCacheStats();
      this.assert(statsAfterClear.size === 0, 'Cache should be empty after clear');

      this.addResult('ApiFeatureFlagProvider', true);
    } catch (error) {
      this.addResult('ApiFeatureFlagProvider', false, error as string);
    }
  }

  /**
   * Test Integration
   */
  private async testIntegration(): Promise<void> {
    console.log('🔗 Testing Integration...');

    try {
      // Test multiple providers
      const memoryProvider = new MemoryFeatureFlagProvider([
        new FeatureFlagConfiguration('shared-feature', true, {}, 100.0, 'group-1')
      ]);

      const apiProvider = new ApiFeatureFlagProvider({
        baseUrl: 'https://api.test.com'
      });

      await memoryProvider.initialize();

      // Test that both providers implement the same interface
      this.assert(typeof memoryProvider.isFeatureEnabled === 'function', 'Memory provider should have isFeatureEnabled');
      this.assert(typeof apiProvider.isFeatureEnabled === 'function', 'API provider should have isFeatureEnabled');
      this.assert(typeof memoryProvider.getFeatureFlag === 'function', 'Memory provider should have getFeatureFlag');
      this.assert(typeof apiProvider.getFeatureFlag === 'function', 'API provider should have getFeatureFlag');

      // Test session ID uniqueness
      this.assert(memoryProvider.getSessionId() !== apiProvider.getSessionId(), 'Providers should have different session IDs');

      // Test feature flag lifecycle
      const flag = memoryProvider.getFeatureFlag('shared-feature', 'group-1');
      flag.flowStatistic.onSuccess();
      this.assert(flag.flowStatistic.successCount === 1, 'Should track success');
      this.assert(flag.flowStatistic.executedCount === 1, 'Should track execution');

      this.addResult('Integration', true);
    } catch (error) {
      this.addResult('Integration', false, error as string);
    }
  }

  /**
   * Assert helper
   */
  private assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * Add test result
   */
  private addResult(test: string, passed: boolean, error?: string): void {
    this.results.push({ test, passed, error });
  }

  /**
   * Print test results
   */
  private printResults(): void {
    console.log('\n📈 Test Results:');
    console.log('================');

    let passed = 0;
    let failed = 0;

    for (const result of this.results) {
      if (result.passed) {
        console.log(`✅ ${result.test} - PASSED`);
        passed++;
      } else {
        console.log(`❌ ${result.test} - FAILED`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
        failed++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`Total: ${this.results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n⚠️  Some tests failed. Please check the implementation.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new FeatureFlagsTestRunner();
  runner.runAllTests().catch(console.error);
} 