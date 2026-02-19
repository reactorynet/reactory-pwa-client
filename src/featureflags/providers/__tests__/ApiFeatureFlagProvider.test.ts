import axios from 'axios';
import { ApiFeatureFlagProvider } from '../ApiFeatureFlagProvider';
import { FeatureFlagConfiguration } from '../../models/FeatureFlagConfiguration';
import { DEFAULT_GROUP_ID, FeatureFlagApiResponse, FeatureFlagStatisticsApiResponse } from '../../types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiFeatureFlagProvider', () => {
  let provider: ApiFeatureFlagProvider;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      patch: jest.fn()
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    
    // Create provider
    provider = new ApiFeatureFlagProvider({
      baseUrl: 'https://api.test.com',
      apiKey: 'test-api-key',
      timeout: 5000,
      cacheEnabled: true,
      cacheTTL: 30000
    });
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.test.com',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key'
        }
      });
    });

    it('should create axios instance without api key', () => {
      jest.clearAllMocks();
      
      new ApiFeatureFlagProvider({
        baseUrl: 'https://api.test.com'
      });
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.test.com',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });

    it('should use default config when not provided', () => {
      jest.clearAllMocks();
      
      new ApiFeatureFlagProvider({});
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:8080',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const mockResponse = {
        data: [
          {
            featureId: 'feature-1',
            groupId: 'default',
            enabled: true,
            flowRate: 100,
            autoDisableErrorRate: -1,
            autoDisableMinimumSamples: 100,
            context: {}
          }
        ]
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      
      await expect(provider.initialize()).resolves.not.toThrow();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/default/features');
    });

    it('should handle initialization error gracefully', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));
      
      await expect(provider.initialize()).resolves.not.toThrow();
      expect(provider.getFlags()).toEqual([]);
    });
  });

  describe('refresh', () => {
    it('should refresh successfully', async () => {
      const mockResponse = {
        data: [
          {
            featureId: 'feature-1',
            groupId: 'default',
            enabled: true,
            flowRate: 100,
            autoDisableErrorRate: -1,
            autoDisableMinimumSamples: 100,
            context: {}
          }
        ]
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      
      await expect(provider.refresh()).resolves.not.toThrow();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/default/features');
    });
  });

  describe('getFeatureFlagFromApi', () => {
    it('should return cached flag when available', async () => {
      const mockFlag = new FeatureFlagConfiguration('test-feature', true);
      
      // Mock the private cache with the correct cache key
      const cacheKey = 'default:test-feature:';
      (provider as any)._cache.set(cacheKey, mockFlag);
      (provider as any)._cacheExpiry.set(cacheKey, Date.now() + 60000);
      
      const result = await provider.getFeatureFlagFromApi('test-feature');
      expect(result).toBe(mockFlag);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should fetch from API when not cached', async () => {
      const mockResponse = {
        data: {
          featureId: 'test-feature',
          groupId: 'default',
          enabled: true,
          flowRate: 75,
          autoDisableErrorRate: 10,
          autoDisableMinimumSamples: 100,
          context: { country: 'ZA' }
        }
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      
      const result = await provider.getFeatureFlagFromApi('test-feature', 'default', { country: 'ZA' });
      
      expect(result.featureId).toBe('test-feature');
      expect(result.enabled).toBe(true);
      expect(result.context).toEqual({ country: 'ZA' });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/default/features/test-feature', {
        params: new URLSearchParams({ country: 'ZA' })
      });
    });

    it('should return default disabled flag on API error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API error'));
      
      const result = await provider.getFeatureFlagFromApi('test-feature');
      
      expect(result.featureId).toBe('test-feature');
      expect(result.enabled).toBe(false);
      expect(result.groupId).toBe(DEFAULT_GROUP_ID);
    });

    it('should handle cache disabled', async () => {
      provider = new ApiFeatureFlagProvider({
        baseUrl: 'https://api.test.com',
        cacheEnabled: false
      });
      
      const mockResponse = {
        data: {
          featureId: 'test-feature',
          groupId: 'default',
          enabled: true,
          flowRate: 100,
          autoDisableErrorRate: -1,
          autoDisableMinimumSamples: 100,
          context: {}
        }
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      
      const result = await provider.getFeatureFlagFromApi('test-feature');
      expect(result.featureId).toBe('test-feature');
      expect(mockAxiosInstance.get).toHaveBeenCalled();
    });
  });

  describe('getFeatureFlagStatistics', () => {
    it('should return statistics from API', async () => {
      const mockResponse = {
        data: {
          requestCount: 100,
          executedCount: 80,
          failedCount: 10,
          successCount: 70,
          flowRate: 80,
          failureRate: 12.5,
          successRate: 87.5,
          tps: 10.5,
          lastExecution: '2024-01-01T00:00:00Z',
          trackingSince: '2024-01-01T00:00:00Z'
        }
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      
      const result = await provider.getFeatureFlagStatistics('test-feature', 'default', { country: 'ZA' });
      
      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/default/features/test-feature/stats', {
        params: new URLSearchParams({ country: 'ZA' })
      });
    });

    it('should throw error on API failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API error'));
      
      await expect(provider.getFeatureFlagStatistics('test-feature')).rejects.toThrow('API error');
    });
  });

  describe('isFeatureEnabledFromApi', () => {
    it('should return true when feature is enabled', async () => {
      const mockResponse = { data: true };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      
      const result = await provider.isFeatureEnabledFromApi('test-feature', 'default', { country: 'ZA' });
      
      expect(result).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/default/features/test-feature/enabled', {
        params: new URLSearchParams({ country: 'ZA' })
      });
    });

    it('should return false when feature is disabled', async () => {
      const mockResponse = { data: false };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      
      const result = await provider.isFeatureEnabledFromApi('test-feature');
      
      expect(result).toBe(false);
    });

    it('should return false on API error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API error'));
      
      const result = await provider.isFeatureEnabledFromApi('test-feature');
      
      expect(result).toBe(false);
    });
  });

  describe('updateFeatureFlag', () => {
    it('should update feature flag successfully', async () => {
      const mockResponse = {
        data: {
          featureId: 'test-feature',
          groupId: 'default',
          enabled: true,
          flowRate: 50,
          autoDisableErrorRate: 10,
          autoDisableMinimumSamples: 100,
          context: {}
        }
      };
      
      mockAxiosInstance.patch.mockResolvedValue(mockResponse);
      
      const updates = { enabled: true, flowRate: 50 };
      const result = await provider.updateFeatureFlag('test-feature', 'default', updates, { country: 'ZA' });
      
      expect(result.featureId).toBe('test-feature');
      expect(result.enabled).toBe(true);
      expect(result.flowRate).toBe(50);
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/v1/default/features/test-feature', updates, {
        params: new URLSearchParams({ country: 'ZA' })
      });
    });

    it('should throw error on update failure', async () => {
      mockAxiosInstance.patch.mockRejectedValue(new Error('Update failed'));
      
      await expect(provider.updateFeatureFlag('test-feature', 'default', { enabled: true })).rejects.toThrow('Update failed');
    });
  });

  describe('cache management', () => {
    it('should clear cache for specific key', () => {
      const cacheKey = 'default:test-feature:{}';
      (provider as any)._cache.set(cacheKey, new FeatureFlagConfiguration('test-feature', true));
      (provider as any)._cacheExpiry.set(cacheKey, Date.now() + 60000);
      
      expect((provider as any)._cache.size).toBe(1);
      
      provider.clearCache();
      
      expect((provider as any)._cache.size).toBe(0);
      expect((provider as any)._cacheExpiry.size).toBe(0);
    });

    it('should return cache statistics', () => {
      const cacheKey = 'default:test-feature:{}';
      (provider as any)._cache.set(cacheKey, new FeatureFlagConfiguration('test-feature', true));
      (provider as any)._cacheExpiry.set(cacheKey, Date.now() + 60000);
      
      const stats = provider.getCacheStats();
      
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain(cacheKey);
    });

    it('should handle expired cache entries', async () => {
      const cacheKey = 'default:test-feature:{}';
      const mockFlag = new FeatureFlagConfiguration('test-feature', true);
      
      // Set expired cache entry
      (provider as any)._cache.set(cacheKey, mockFlag);
      (provider as any)._cacheExpiry.set(cacheKey, Date.now() - 60000); // Expired
      
      const mockResponse = {
        data: {
          featureId: 'test-feature',
          groupId: 'default',
          enabled: true,
          flowRate: 100,
          autoDisableErrorRate: -1,
          autoDisableMinimumSamples: 100,
          context: {}
        }
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      
      const result = await provider.getFeatureFlagFromApi('test-feature');
      
      expect(result.featureId).toBe('test-feature');
      expect(mockAxiosInstance.get).toHaveBeenCalled(); // Should fetch from API
    });
  });

  describe('edge cases', () => {
    it('should handle empty context', async () => {
      const mockResponse = {
        data: {
          featureId: 'test-feature',
          groupId: 'default',
          enabled: true,
          flowRate: 100,
          autoDisableErrorRate: -1,
          autoDisableMinimumSamples: 100,
          context: {}
        }
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      
      const result = await provider.getFeatureFlagFromApi('test-feature', 'default', {});
      
      expect(result.featureId).toBe('test-feature');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/default/features/test-feature', {
        params: new URLSearchParams({})
      });
    });

    it('should handle undefined context', async () => {
      const mockResponse = {
        data: {
          featureId: 'test-feature',
          groupId: 'default',
          enabled: true,
          flowRate: 100,
          autoDisableErrorRate: -1,
          autoDisableMinimumSamples: 100,
          context: {}
        }
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      
      const result = await provider.getFeatureFlagFromApi('test-feature', 'default', undefined);
      
      expect(result.featureId).toBe('test-feature');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/default/features/test-feature', {
        params: undefined
      });
    });

    it('should handle complex context objects', async () => {
      const complexContext = {
        userId: '12345',
        country: 'ZA',
        currency: 'ZAR',
        userType: 'premium'
      };
      
      const mockResponse = {
        data: {
          featureId: 'test-feature',
          groupId: 'default',
          enabled: true,
          flowRate: 100,
          autoDisableErrorRate: -1,
          autoDisableMinimumSamples: 100,
          context: complexContext
        }
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      
      const result = await provider.getFeatureFlagFromApi('test-feature', 'default', complexContext);
      
      expect(result.featureId).toBe('test-feature');
      expect(result.context).toEqual(complexContext);
    });
  });
}); 