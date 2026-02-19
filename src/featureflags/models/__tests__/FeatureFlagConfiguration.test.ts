/**
 * (c) Copyright ZEPZ TECHNOLOGY SERVICES LIMITED 2024. All rights reserved.
 */

import { FeatureFlagConfiguration } from '../FeatureFlagConfiguration';
import { DEFAULT_GROUP_ID } from '../../types';

describe('FeatureFlagConfiguration', () => {
  describe('constructor', () => {
    it('should create with default values', () => {
      const config = new FeatureFlagConfiguration();
      
      expect(config.featureId).toBe('null-feature');
      expect(config.description).toBe('');
      expect(config.groupId).toBe(DEFAULT_GROUP_ID);
      expect(config.enabled).toBe(false);
      expect(config.context).toEqual({});
      expect(config.flowRate).toBe(100.0);
      expect(config.autoDisableErrorRate).toBe(-1.0);
      expect(config.autoDisableMinimumSamples).toBe(100);
      expect(config.flowStatistic).toBeDefined();
    });

    it('should create with featureId and enabled', () => {
      const config = new FeatureFlagConfiguration('test-feature', true);
      
      expect(config.featureId).toBe('test-feature');
      expect(config.description).toBe('test-feature');
      expect(config.enabled).toBe(true);
    });

    it('should create with context', () => {
      const context = { country: 'ZA', currency: 'ZAR' };
      const config = new FeatureFlagConfiguration('test-feature', true, context);
      
      expect(config.context).toEqual(context);
    });

    it('should create with flow rate', () => {
      const context = { country: 'ZA' };
      const config = new FeatureFlagConfiguration('test-feature', true, context, 75.0);
      
      expect(config.flowRate).toBe(75.0);
    });

    it('should create with group id', () => {
      const config = new FeatureFlagConfiguration('test-feature', true, {}, 100.0, 'test-group');
      
      expect(config.groupId).toBe('test-group');
    });

    it('should create with auto disable settings', () => {
      const config = new FeatureFlagConfiguration(
        'test-feature',
        true,
        {},
        100.0,
        'test-group',
        10.0,
        500
      );
      
      expect(config.autoDisableErrorRate).toBe(10.0);
      expect(config.autoDisableMinimumSamples).toBe(500);
    });
  });

  describe('setters', () => {
    let config: FeatureFlagConfiguration;

    beforeEach(() => {
      config = new FeatureFlagConfiguration();
    });

    it('should set feature id', () => {
      config.setFeatureId('new-feature');
      expect(config.featureId).toBe('new-feature');
    });

    it('should set description', () => {
      config.setDescription('New description');
      expect(config.description).toBe('New description');
    });

    it('should set enabled', () => {
      config.setEnabled(true);
      expect(config.enabled).toBe(true);
    });

    it('should set context', () => {
      const context = { userId: '123', country: 'ZA' };
      config.setContext(context);
      expect(config.context).toEqual(context);
    });

    it('should set group id', () => {
      config.setGroupId('new-group');
      expect(config.groupId).toBe('new-group');
    });

    it('should set flow rate', () => {
      config.setFlowRate(50.0);
      expect(config.flowRate).toBe(50.0);
    });

    it('should set auto disable error rate', () => {
      config.setAutoDisableErrorRate(15.0);
      expect(config.autoDisableErrorRate).toBe(15.0);
    });

    it('should set auto disable minimum samples', () => {
      config.setAutoDisableMinimumSamples(1000);
      expect(config.autoDisableMinimumSamples).toBe(1000);
    });
  });

  describe('isEnabled', () => {
    let config: FeatureFlagConfiguration;

    beforeEach(() => {
      config = new FeatureFlagConfiguration('test-feature', true);
    });

    it('should return false when disabled', () => {
      config.setEnabled(false);
      expect(config.isEnabled()).toBe(false);
    });

    it('should return true when enabled and no context', () => {
      config.setEnabled(true);
      expect(config.isEnabled()).toBe(true);
    });

    it('should return true when context matches', () => {
      config.setContext({ country: 'ZA' });
      expect(config.isEnabled({ country: 'ZA' })).toBe(true);
    });

    it('should return false when context does not match', () => {
      config.setContext({ country: 'ZA' });
      expect(config.isEnabled({ country: 'US' })).toBe(false);
    });

    it('should return false when context has extra keys', () => {
      config.setContext({ country: 'ZA' });
      expect(config.isEnabled({ country: 'ZA', currency: 'ZAR' })).toBe(false);
    });

    it('should return true when no context provided but flag has context', () => {
      config.setContext({ country: 'ZA' });
      expect(config.isEnabled()).toBe(true);
    });

    it('should return true when empty context provided', () => {
      config.setContext({ country: 'ZA' });
      expect(config.isEnabled({})).toBe(true);
    });
  });

  describe('validateFlowRate', () => {
    let config: FeatureFlagConfiguration;

    beforeEach(() => {
      config = new FeatureFlagConfiguration('test-feature', true);
    });

    it('should return true when flow rate is 100', () => {
      config.setFlowRate(100.0);
      expect(config.validateFlowRate()).toBe(true);
    });

    it('should return true when auto disable is -1', () => {
      config.setFlowRate(50.0);
      config.setAutoDisableErrorRate(-1.0);
      expect(config.validateFlowRate()).toBe(true);
    });

    it('should return true when flow rate is not exceeded', () => {
      config.setFlowRate(50.0);
      // Simulate some requests and executions
      config.flowStatistic.onRequested();
      config.flowStatistic.onRequested();
      config.flowStatistic.onSuccess(); // 50% flow rate
      
      expect(config.validateFlowRate()).toBe(true);
    });

    it('should return false when flow rate is exceeded', () => {
      config.setFlowRate(50.0);
      // Simulate more executions than allowed
      config.flowStatistic.onRequested();
      config.flowStatistic.onSuccess(); // 100% flow rate
      
      expect(config.validateFlowRate()).toBe(false);
    });

    it('should handle auto disable with minimum samples', () => {
      config.setFlowRate(100.0); // Set to 100% to avoid flow rate issues
      config.setAutoDisableErrorRate(10.0);
      config.setAutoDisableMinimumSamples(100);
      
      // Add some failures but below minimum samples
      for (let i = 0; i < 50; i++) {
        config.flowStatistic.onRequested();
        config.flowStatistic.onFailed(); // 100% failure rate
      }
      
      // Should still be enabled because below minimum samples
      expect(config.validateFlowRate()).toBe(true);
    });

    it('should disable when auto disable threshold exceeded with enough samples', () => {
      config.setFlowRate(50.0);
      config.setAutoDisableErrorRate(10.0);
      config.setAutoDisableMinimumSamples(100);
      
      // Add failures above minimum samples
      for (let i = 0; i < 150; i++) {
        config.flowStatistic.onRequested();
        config.flowStatistic.onFailed(); // 100% failure rate
      }
      
      // Should be disabled because failure rate > 10% and samples > 100
      expect(config.validateFlowRate()).toBe(false);
    });
  });

  describe('matches', () => {
    let config1: FeatureFlagConfiguration;
    let config2: FeatureFlagConfiguration;

    beforeEach(() => {
      config1 = new FeatureFlagConfiguration('test-feature', true, { country: 'ZA' }, 100.0, 'test-group');
      config2 = new FeatureFlagConfiguration('test-feature', true, { country: 'ZA' }, 100.0, 'test-group');
    });

    it('should return true when configurations match', () => {
      expect(config1.matches(config2)).toBe(true);
    });

    it('should return false when feature ids differ', () => {
      config2.setFeatureId('different-feature');
      expect(config1.matches(config2)).toBe(false);
    });

    it('should return false when group ids differ', () => {
      config2.setGroupId('different-group');
      expect(config1.matches(config2)).toBe(false);
    });

    it('should return false when contexts differ', () => {
      config2.setContext({ country: 'US' });
      expect(config1.matches(config2)).toBe(false);
    });

    it('should return true when contexts are empty', () => {
      config1.setContext({});
      config2.setContext({});
      expect(config1.matches(config2)).toBe(true);
    });
  });

  describe('Builder', () => {
    it('should build configuration with all properties', () => {
      const config = new FeatureFlagConfiguration.Builder()
        .withFeatureId('builder-feature')
        .withDescription('Built with builder')
        .withEnabled(true)
        .withContext({ country: 'ZA', currency: 'ZAR' })
        .withFlowRate(75.0)
        .withGroupId('builder-group')
        .withAutoDisableErrorRate(15.0)
        .withAutoDisableMinimumSamples(1000)
        .build();

      expect(config.featureId).toBe('builder-feature');
      expect(config.description).toBe('Built with builder');
      expect(config.enabled).toBe(true);
      expect(config.context).toEqual({ country: 'ZA', currency: 'ZAR' });
      expect(config.flowRate).toBe(75.0);
      expect(config.groupId).toBe('builder-group');
      expect(config.autoDisableErrorRate).toBe(15.0);
      expect(config.autoDisableMinimumSamples).toBe(1000);
    });

    it('should build with default values when not specified', () => {
      const config = new FeatureFlagConfiguration.Builder()
        .withFeatureId('minimal-feature')
        .withEnabled(true)
        .build();

      expect(config.featureId).toBe('minimal-feature');
      expect(config.description).toBe('');
      expect(config.enabled).toBe(true);
      expect(config.context).toEqual({});
      expect(config.flowRate).toBe(100.0);
      expect(config.groupId).toBe('default');
      expect(config.autoDisableErrorRate).toBe(-1.0);
      expect(config.autoDisableMinimumSamples).toBe(100);
    });
  });

  describe('equals', () => {
    let config1: FeatureFlagConfiguration;
    let config2: FeatureFlagConfiguration;

    beforeEach(() => {
      config1 = new FeatureFlagConfiguration('test-feature', true, { country: 'ZA' }, 100.0, 'test-group', 10.0, 100);
      config2 = new FeatureFlagConfiguration('test-feature', true, { country: 'ZA' }, 100.0, 'test-group', 10.0, 100);
    });

    it('should return true for identical configurations', () => {
      expect(config1.equals(config2)).toBe(true);
    });

    it('should return false for different feature ids', () => {
      config2.setFeatureId('different-feature');
      expect(config1.equals(config2)).toBe(false);
    });

    it('should return false for different group ids', () => {
      config2.setGroupId('different-group');
      expect(config1.equals(config2)).toBe(false);
    });

    it('should return false for different contexts', () => {
      config2.setContext({ country: 'US' });
      expect(config1.equals(config2)).toBe(false);
    });

    it('should return false for different flow rates', () => {
      config2.setFlowRate(50.0);
      expect(config1.equals(config2)).toBe(false);
    });

    it('should return false for different auto disable rates', () => {
      config2.setAutoDisableErrorRate(20.0);
      expect(config1.equals(config2)).toBe(false);
    });

    it('should return false for different minimum samples', () => {
      config2.setAutoDisableMinimumSamples(200);
      expect(config1.equals(config2)).toBe(false);
    });

    it('should return false for null', () => {
      expect(config1.equals(null)).toBe(false);
    });

    it('should return false for different type', () => {
      expect(config1.equals({})).toBe(false);
    });
  });

  describe('hashCode', () => {
    it('should return consistent hash codes', () => {
      const config1 = new FeatureFlagConfiguration('test-feature', true, { country: 'ZA' });
      const config2 = new FeatureFlagConfiguration('test-feature', true, { country: 'ZA' });
      
      expect(config1.hashCode()).toBe(config2.hashCode());
    });

    it('should return different hash codes for different configurations', () => {
      const config1 = new FeatureFlagConfiguration('test-feature', true);
      const config2 = new FeatureFlagConfiguration('different-feature', true);
      
      expect(config1.hashCode()).not.toBe(config2.hashCode());
    });
  });

  describe('toString', () => {
    it('should return formatted string representation', () => {
      const config = new FeatureFlagConfiguration('test-feature', true, { country: 'ZA' }, 75.0, 'test-group', 10.0, 100);
      
      const result = config.toString();
      expect(result).toContain('FeatureFlagConfiguration');
      expect(result).toContain("featureId='test-feature'");
      expect(result).toContain("description='test-feature'");
      expect(result).toContain("groupId='test-group'");
      expect(result).toContain('enabled=true');
      expect(result).toContain('"country":"ZA"');
      expect(result).toContain('flowRate=75');
      expect(result).toContain('autoDisableErrorRate=10');
      expect(result).toContain('autoDisableMinimumSamples=100');
    });
  });

  describe('edge cases', () => {
    it('should handle empty context', () => {
      const config = new FeatureFlagConfiguration('test-feature', true, {});
      expect(config.isEnabled()).toBe(true);
      expect(config.isEnabled({})).toBe(true);
    });

    it('should handle null/undefined context', () => {
      const config = new FeatureFlagConfiguration('test-feature', true);
      expect(config.isEnabled(undefined)).toBe(true);
    });

    it('should handle complex context objects', () => {
      const complexContext = {
        userId: '12345',
        country: 'ZA',
        currency: 'ZAR',
        userType: 'premium',
        features: 'feature1,feature2'
      };
      
      const config = new FeatureFlagConfiguration('test-feature', true, complexContext);
      expect(config.isEnabled(complexContext)).toBe(true);
    });
  });
}); 