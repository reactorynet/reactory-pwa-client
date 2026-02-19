import { MemoryFeatureFlagProvider } from '../MemoryFeatureFlagProvider';
import { FeatureFlagConfiguration } from '../../models/FeatureFlagConfiguration';
import { DEFAULT_GROUP_ID } from '../../types';

describe('MemoryFeatureFlagProvider', () => {
  let provider: MemoryFeatureFlagProvider;

  beforeEach(() => {
    provider = new MemoryFeatureFlagProvider();
  });

  describe('constructor', () => {
    it('should create with no flags', () => {
      expect(provider.getFlags()).toEqual([]);
    });

    it('should create with initial flags', () => {
      const flags = [
        new FeatureFlagConfiguration('feature-1', true),
        new FeatureFlagConfiguration('feature-2', false)
      ];
      
      provider = new MemoryFeatureFlagProvider(flags);
      expect(provider.getFlags()).toHaveLength(2);
    });
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(provider.initialize()).resolves.not.toThrow();
    });

    it('should set flags after initialization', async () => {
      const flags = [
        new FeatureFlagConfiguration('feature-1', true),
        new FeatureFlagConfiguration('feature-2', false)
      ];
      
      provider = new MemoryFeatureFlagProvider(flags);
      await provider.initialize();
      
      expect(provider.getFlags()).toHaveLength(2);
    });
  });

  describe('refresh', () => {
    it('should refresh successfully', async () => {
      await expect(provider.refresh()).resolves.not.toThrow();
    });
  });

  describe('isFeatureEnabled', () => {
    beforeEach(async () => {
      const flags = [
        new FeatureFlagConfiguration('enabled-feature', true),
        new FeatureFlagConfiguration('disabled-feature', false),
        new FeatureFlagConfiguration('context-feature', true, { country: 'ZA' }),
        new FeatureFlagConfiguration('group-feature', true, {}, 100.0, 'test-group')
      ];
      
      provider = new MemoryFeatureFlagProvider(flags);
      await provider.initialize();
    });

    it('should return true for enabled feature', () => {
      expect(provider.isFeatureEnabled('enabled-feature')).toBe(true);
    });

    it('should return false for disabled feature', () => {
      expect(provider.isFeatureEnabled('disabled-feature')).toBe(false);
    });

    it('should return false for non-existent feature', () => {
      expect(provider.isFeatureEnabled('non-existent')).toBe(false);
    });

    it('should return true for feature with matching context', () => {
      expect(provider.isFeatureEnabled('context-feature', { country: 'ZA' })).toBe(true);
    });

    it('should return false for feature with non-matching context', () => {
      expect(provider.isFeatureEnabled('context-feature', { country: 'US' })).toBe(false);
    });

    it('should return true for feature in specific group', () => {
      expect(provider.isFeatureEnabled('group-feature', 'test-group')).toBe(true);
    });

    it('should return false for feature in wrong group', () => {
      expect(provider.isFeatureEnabled('group-feature', 'wrong-group')).toBe(false);
    });

    it('should return true for feature with group and matching context', () => {
      expect(provider.isFeatureEnabled('group-feature', 'test-group', {})).toBe(true);
    });
  });

  describe('getFeatureFlag', () => {
    beforeEach(async () => {
      const flags = [
        new FeatureFlagConfiguration('test-feature', true, { country: 'ZA' }, 75.0, 'test-group'),
        new FeatureFlagConfiguration('default-feature', true)
      ];
      
      provider = new MemoryFeatureFlagProvider(flags);
      await provider.initialize();
    });

    it('should return feature flag by id', () => {
      const flag = provider.getFeatureFlag('test-feature');
      expect(flag.featureId).toBe('test-feature');
      expect(flag.groupId).toBe(DEFAULT_GROUP_ID); // Returns default disabled flag since flag is in test-group
      expect(flag.enabled).toBe(false); // Should be disabled since not found in default group
    });

    it('should return feature flag by id and group', () => {
      const flag = provider.getFeatureFlag('test-feature', 'test-group');
      expect(flag.featureId).toBe('test-feature');
      expect(flag.groupId).toBe('test-group');
    });

    it('should return feature flag with context', () => {
      const flag = provider.getFeatureFlag('test-feature', { country: 'ZA' });
      expect(flag.featureId).toBe('test-feature');
      expect(flag.context).toEqual({ country: 'ZA' });
    });

    it('should return feature flag with group and context', () => {
      const flag = provider.getFeatureFlag('test-feature', 'test-group', { country: 'ZA' });
      expect(flag.featureId).toBe('test-feature');
      expect(flag.groupId).toBe('test-group');
      expect(flag.context).toEqual({ country: 'ZA' });
    });

    it('should return default disabled flag for non-existent feature', () => {
      const flag = provider.getFeatureFlag('non-existent');
      expect(flag.featureId).toBe('non-existent');
      expect(flag.enabled).toBe(false);
      expect(flag.groupId).toBe(DEFAULT_GROUP_ID);
    });

    it('should update statistics when getting feature flag', () => {
      const flag = provider.getFeatureFlag('test-feature', 'test-group'); // Specify the correct group
      expect(flag.flowStatistic.requestCount).toBe(1);
    });
  });

  describe('getFlags', () => {
    it('should return all flags', async () => {
      const flags = [
        new FeatureFlagConfiguration('feature-1', true),
        new FeatureFlagConfiguration('feature-2', false)
      ];
      
      provider = new MemoryFeatureFlagProvider(flags);
      await provider.initialize();
      
      const allFlags = provider.getFlags();
      expect(allFlags).toHaveLength(2);
      expect(allFlags[0].featureId).toBe('feature-1');
      expect(allFlags[1].featureId).toBe('feature-2');
    });

    it('should return empty array when no flags', () => {
      expect(provider.getFlags()).toEqual([]);
    });
  });

  describe('getFlagsForGroup', () => {
    beforeEach(async () => {
      const flags = [
        new FeatureFlagConfiguration('feature-1', true, {}, 100.0, 'group-1'),
        new FeatureFlagConfiguration('feature-2', true, {}, 100.0, 'group-1'),
        new FeatureFlagConfiguration('feature-3', true, {}, 100.0, 'group-2'),
        new FeatureFlagConfiguration('feature-4', true, {}, 100.0, DEFAULT_GROUP_ID)
      ];
      
      provider = new MemoryFeatureFlagProvider(flags);
      await provider.initialize();
    });

    it('should return flags for specific group', () => {
      const groupFlags = provider.getFlagsForGroup('group-1');
      expect(groupFlags).toHaveLength(2);
      expect(groupFlags[0].featureId).toBe('feature-1');
      expect(groupFlags[1].featureId).toBe('feature-2');
    });

    it('should return flags for default group', () => {
      const defaultFlags = provider.getFlagsForGroup(DEFAULT_GROUP_ID);
      expect(defaultFlags).toHaveLength(1);
      expect(defaultFlags[0].featureId).toBe('feature-4');
    });

    it('should return empty array for non-existent group', () => {
      const nonExistentFlags = provider.getFlagsForGroup('non-existent');
      expect(nonExistentFlags).toEqual([]);
    });
  });

  describe('getFlagsWithFeatureId', () => {
    beforeEach(async () => {
      const flags = [
        new FeatureFlagConfiguration('feature-1', true, {}, 100.0, 'group-1'),
        new FeatureFlagConfiguration('feature-1', true, { country: 'ZA' }, 100.0, 'group-1'),
        new FeatureFlagConfiguration('feature-2', true, {}, 100.0, 'group-2')
      ];
      
      provider = new MemoryFeatureFlagProvider(flags);
      await provider.initialize();
    });

    it('should return all flags with specific feature id', () => {
      const featureFlags = provider.getFlagsWithFeatureId('feature-1');
      expect(featureFlags).toHaveLength(2);
      expect(featureFlags[0].featureId).toBe('feature-1');
      expect(featureFlags[1].featureId).toBe('feature-1');
    });

    it('should return empty array for non-existent feature id', () => {
      const nonExistentFlags = provider.getFlagsWithFeatureId('non-existent');
      expect(nonExistentFlags).toEqual([]);
    });
  });

  describe('setFlags', () => {
    it('should set flags', async () => {
      const flags = [
        new FeatureFlagConfiguration('feature-1', true),
        new FeatureFlagConfiguration('feature-2', false)
      ];
      
      await provider.initialize();
      provider.setFlags(flags);
      
      expect(provider.getFlags()).toHaveLength(2);
    });
  });

  describe('addStaticFlag', () => {
    it('should add static flag', async () => {
      const flag = new FeatureFlagConfiguration('new-feature', true);
      
      provider.addStaticFlag(flag);
      await provider.initialize();
      
      expect(provider.getFlags()).toHaveLength(1);
      expect(provider.getFlags()[0].featureId).toBe('new-feature');
    });

    it('should add flag to existing flags', async () => {
      const initialFlags = [
        new FeatureFlagConfiguration('existing-feature', true)
      ];
      
      provider = new MemoryFeatureFlagProvider(initialFlags);
      await provider.initialize();
      
      const newFlag = new FeatureFlagConfiguration('new-feature', true);
      provider.addStaticFlag(newFlag);
      
      expect(provider.getFlags()).toHaveLength(2);
    });
  });

  describe('addStaticFlags', () => {
    it('should add multiple static flags', async () => {
      const flags = [
        new FeatureFlagConfiguration('feature-1', true),
        new FeatureFlagConfiguration('feature-2', false)
      ];
      
      provider.addStaticFlags(flags);
      await provider.initialize();
      
      expect(provider.getFlags()).toHaveLength(2);
    });
  });

  describe('clearStaticFlags', () => {
    it('should clear all static flags', async () => {
      const flags = [
        new FeatureFlagConfiguration('feature-1', true),
        new FeatureFlagConfiguration('feature-2', false)
      ];
      
      provider = new MemoryFeatureFlagProvider(flags);
      await provider.initialize();
      
      expect(provider.getFlags()).toHaveLength(2);
      
      provider.clearStaticFlags();
      
      expect(provider.getFlags()).toEqual([]);
    });
  });

  describe('getStaticFlags', () => {
    it('should return static flags', () => {
      const flags = [
        new FeatureFlagConfiguration('feature-1', true),
        new FeatureFlagConfiguration('feature-2', false)
      ];
      
      provider = new MemoryFeatureFlagProvider(flags);
      
      const staticFlags = provider.getStaticFlags();
      expect(staticFlags).toHaveLength(2);
      expect(staticFlags[0].featureId).toBe('feature-1');
      expect(staticFlags[1].featureId).toBe('feature-2');
    });

    it('should return empty array when no static flags', () => {
      expect(provider.getStaticFlags()).toEqual([]);
    });
  });

  describe('session id', () => {
    it('should return unique session id', () => {
      const sessionId = provider.getSessionId();
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('should return same session id for same provider', () => {
      const sessionId1 = provider.getSessionId();
      const sessionId2 = provider.getSessionId();
      expect(sessionId1).toBe(sessionId2);
    });

    it('should return different session ids for different providers', () => {
      const provider1 = new MemoryFeatureFlagProvider();
      const provider2 = new MemoryFeatureFlagProvider();
      
      expect(provider1.getSessionId()).not.toBe(provider2.getSessionId());
    });
  });

  describe('edge cases', () => {
    it('should handle empty flags array', async () => {
      provider = new MemoryFeatureFlagProvider([]);
      await provider.initialize();
      
      expect(provider.getFlags()).toEqual([]);
      expect(provider.isFeatureEnabled('any-feature')).toBe(false);
    });

    it('should handle duplicate feature ids', async () => {
      const flags = [
        new FeatureFlagConfiguration('duplicate-feature', true, {}, 100.0, 'default'),
        new FeatureFlagConfiguration('duplicate-feature', false, {}, 100.0, 'group-2')
      ];
      
      provider = new MemoryFeatureFlagProvider(flags);
      await provider.initialize();
      
      // Should return the first match found in default group
      expect(provider.isFeatureEnabled('duplicate-feature')).toBe(true);
    });

    it('should handle null/undefined context', () => {
      const flag = provider.getFeatureFlag('test-feature', undefined);
      expect(flag).toBeDefined();
    });
  });
}); 