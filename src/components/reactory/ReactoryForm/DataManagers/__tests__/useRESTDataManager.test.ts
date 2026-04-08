/**
 * Tests for the useRESTDataManager hook.
 * Verifies REST API data fetching, submission, and error handling.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useRESTDataManager } from '../useRESTDataManager';
import { createMockReactorySDK, createMockFormDefinition } from '../../__tests__/mockReactory';

// Mock dependencies
const mockReactory = createMockReactorySDK();

jest.mock('@reactory/client-core/api', () => ({
  useReactory: () => mockReactory,
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useRESTDataManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  const createProps = (restDefinition?: any, mode: string = 'edit') => ({
    form: createMockFormDefinition(),
    formData: { name: 'Test' },
    formContext: {} as any,
    mode,
    props: {},
    restDefinition,
  });

  describe('availability', () => {
    it('should be unavailable when no REST definition is provided', () => {
      const { result } = renderHook(() => useRESTDataManager(createProps()));
      expect(result.current.available).toBe(false);
      expect(result.current.type).toBe('rest');
    });

    it('should be available when REST queries are defined', () => {
      const restDef = {
        queries: {
          default: {
            url: 'https://api.example.com/data',
            method: 'GET' as const,
            options: {},
            optionsProvider: '' as any,
          },
        },
      };
      const { result } = renderHook(() => useRESTDataManager(createProps(restDef)));
      expect(result.current.available).toBe(true);
    });

    it('should be available when REST mutations are defined', () => {
      const restDef = {
        mutations: {
          edit: {
            url: 'https://api.example.com/data',
            method: 'PUT' as const,
            options: {},
            optionsProvider: '' as any,
          },
        },
      };
      const { result } = renderHook(() => useRESTDataManager(createProps(restDef)));
      expect(result.current.available).toBe(true);
    });
  });

  describe('getData', () => {
    it('should fetch data from REST endpoint', async () => {
      const responseData = { id: 1, name: 'Test Item' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(responseData),
      });

      const restDef = {
        queries: {
          default: {
            url: 'https://api.example.com/items/1',
            method: 'GET' as const,
            runat: 'client' as const,
            options: {},
            optionsProvider: '' as any,
          },
        },
      };

      const { result } = renderHook(() => useRESTDataManager(createProps(restDef)));

      let data: any;
      await act(async () => {
        data = await result.current.getData({ formData: null, formContext: {}, props: {} });
      });

      expect(data).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/items/1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should return null for non-available manager', async () => {
      const { result } = renderHook(() => useRESTDataManager(createProps()));

      let data: any;
      await act(async () => {
        data = await result.current.getData({ formData: { test: true } });
      });

      expect(data).toEqual({ test: true });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle 204 No Content response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: { get: () => '' },
      });

      const restDef = {
        queries: {
          default: {
            url: 'https://api.example.com/items',
            method: 'GET' as const,
            runat: 'client' as const,
            options: {},
            optionsProvider: '' as any,
          },
        },
      };

      const { result } = renderHook(() => useRESTDataManager(createProps(restDef)));

      let data: any;
      await act(async () => {
        data = await result.current.getData({});
      });

      expect(data).toBeNull();
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Not Found'),
        headers: { get: () => 'text/plain' },
      });

      const restDef = {
        queries: {
          default: {
            url: 'https://api.example.com/missing',
            method: 'GET' as const,
            runat: 'client' as const,
            options: {},
            optionsProvider: '' as any,
          },
        },
      };

      const { result } = renderHook(() => useRESTDataManager(createProps(restDef)));

      await expect(
        act(async () => {
          await result.current.getData({});
        })
      ).rejects.toThrow(/404/);
    });
  });

  describe('onSubmit', () => {
    it('should POST data for create mode', async () => {
      const responseData = { id: 2, name: 'Created' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(responseData),
      });

      const restDef = {
        mutations: {
          create: {
            url: 'https://api.example.com/items',
            options: {},
            optionsProvider: '' as any,
          },
        },
      };

      const { result } = renderHook(() => useRESTDataManager(createProps(restDef, 'create')));

      let data: any;
      await act(async () => {
        data = await result.current.onSubmit({ name: 'New Item' });
      });

      expect(data).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'New Item' }),
        })
      );
    });

    it('should return data unchanged when no mutations defined', async () => {
      const { result } = renderHook(() => useRESTDataManager(createProps()));

      let data: any;
      await act(async () => {
        data = await result.current.onSubmit({ name: 'Test' });
      });

      expect(data).toEqual({ name: 'Test' });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('onChange', () => {
    it('should be a no-op that returns data unchanged', async () => {
      const restDef = {
        queries: {
          default: {
            url: 'https://api.example.com/data',
            method: 'GET' as const,
            options: {},
            optionsProvider: '' as any,
          },
        },
      };

      const { result } = renderHook(() => useRESTDataManager(createProps(restDef)));

      let data: any;
      await act(async () => {
        data = await result.current.onChange({ name: 'Changed' });
      });

      expect(data).toEqual({ name: 'Changed' });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('server-side calls', () => {
    it('should skip server-side REST calls', async () => {
      const restDef = {
        queries: {
          default: {
            url: 'https://api.example.com/data',
            method: 'GET' as const,
            runat: 'server' as const,
            options: {},
            optionsProvider: '' as any,
          },
        },
      };

      const { result } = renderHook(() => useRESTDataManager(createProps(restDef)));

      let data: any;
      await act(async () => {
        data = await result.current.getData({});
      });

      // Should return null since server-side calls are skipped
      expect(data).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
