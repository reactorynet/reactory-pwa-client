import { renderHook, act } from '@testing-library/react-hooks';

// Mock @apollo/client before importing the hook.
jest.mock('@apollo/client', () => {
  const mockMutate = jest.fn().mockResolvedValue({ data: { ReactorSaveProviderAuth: {}, ReactorRemoveProviderAuth: true } });
  const mockRefetch = jest.fn().mockResolvedValue({});
  return {
    gql: (strings: TemplateStringsArray) => strings.join(''),
    useQuery: jest.fn().mockReturnValue({
      loading: false,
      error: undefined,
      data: { ReactorProviders: [], ReactorUserProviderAuth: [] },
      refetch: mockRefetch,
    }),
    useMutation: jest.fn().mockReturnValue([mockMutate, { loading: false }]),
  };
});

import { useProviders } from '../useProviders';

const echoKey = (providerId: string) => `reactorChat.providerAuth.${providerId}`;
const sessionKey = (sessionId: string) => `reactorChat.sessionAuth.${sessionId}`;

describe('useProviders', () => {
  let store: Record<string, string> = {};

  beforeAll(() => {
    // jsdom provides localStorage; isolate per-test via a record-backed mock.
  });

  beforeEach(() => {
    store = {};
    const lsMock: Storage = {
      get length() { return Object.keys(store).length; },
      key: (i: number) => Object.keys(store)[i] ?? null,
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { store = {}; },
    };
    Object.defineProperty(window, 'localStorage', {
      value: lsMock,
      configurable: true,
      writable: true,
    });
  });

  describe('saveProviderAuth writes server mutation AND local echo', () => {
    it('writes a non-secret echo to localStorage (no raw api key)', async () => {
      const { result } = renderHook(() => useProviders());

      await act(async () => {
        await result.current.saveProviderAuth({
          providerId: 'openai',
          credentials: { apiKey: 'sk-secret-1234567890', endpoint: 'https://api.test', organization: 'org-1' },
          setAsAccountDefault: true,
        });
      });

      const raw = window.localStorage.getItem(echoKey('openai'));
      expect(raw).not.toBeNull();
      const echo = JSON.parse(raw as string);
      expect(echo.endpoint).toBe('https://api.test');
      expect(echo.organization).toBe('org-1');
      expect(echo.isDefault).toBe(true);
      // The raw API key must never be stored in the echo.
      expect(raw).not.toContain('sk-secret-1234567890');
      // The masked hint should be present and masked.
      expect(echo.maskedKeyHint).toBeDefined();
      expect(echo.maskedKeyHint).toMatch(/…/);
    });
  });

  describe('revertProviderAuth clears echo AND calls remove mutation', () => {
    it('removes the localStorage echo and invokes the remove mutation', async () => {
      const { result } = renderHook(() => useProviders());

      await act(async () => {
        await result.current.saveProviderAuth({
          providerId: 'openai',
          credentials: { apiKey: 'sk-secret-1234567890' },
        });
      });
      expect(window.localStorage.getItem(echoKey('openai'))).not.toBeNull();

      await act(async () => {
        await result.current.revertProviderAuth('openai');
      });
      expect(window.localStorage.getItem(echoKey('openai'))).toBeNull();
    });
  });

  describe('saveSessionProviderAuth (session-only) skips the server mutation', () => {
    it('writes localStorage only and does not call the save mutation', async () => {
      const { result } = renderHook(() => useProviders());
      const saveSpy = jest.spyOn(result.current, 'saveProviderAuth');

      act(() => {
        result.current.saveSessionProviderAuth('sess-1', {
          apiKey: 'sk-session-only',
          endpoint: 'https://session.api',
        });
      });

      expect(window.localStorage.getItem(sessionKey('sess-1'))).not.toBeNull();
      const stored = JSON.parse(window.localStorage.getItem(sessionKey('sess-1')) as string);
      expect(stored.apiKey).toBe('sk-session-only');
      expect(stored.endpoint).toBe('https://session.api');
      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('getProviderAuthOverride', () => {
    it('returns the override when present', () => {
      const { result } = renderHook(() => useProviders());
      act(() => {
        result.current.saveSessionProviderAuth('sess-1', { apiKey: 'sk-x', endpoint: 'https://x' });
      });
      expect(result.current.getProviderAuthOverride('sess-1')).toEqual({
        apiKey: 'sk-x',
        endpoint: 'https://x',
      });
    });

    it('returns null after clearSessionProviderAuth', () => {
      const { result } = renderHook(() => useProviders());
      act(() => {
        result.current.saveSessionProviderAuth('sess-1', { apiKey: 'sk-x' });
      });
      act(() => {
        result.current.clearSessionProviderAuth('sess-1');
      });
      expect(result.current.getProviderAuthOverride('sess-1')).toBeNull();
    });

    it('returns null when no override has been set', () => {
      const { result } = renderHook(() => useProviders());
      expect(result.current.getProviderAuthOverride('never-set')).toBeNull();
    });

    it('returns null when override has only empty values', () => {
      const { result } = renderHook(() => useProviders());
      act(() => {
        result.current.saveSessionProviderAuth('sess-1', { apiKey: '', endpoint: undefined, organization: null });
      });
      expect(result.current.getProviderAuthOverride('sess-1')).toBeNull();
    });
  });

  describe('removeProviderAuth clears the echo', () => {
    it('removes the echo when remove is called', async () => {
      const { result } = renderHook(() => useProviders());
      await act(async () => {
        await result.current.saveProviderAuth({
          providerId: 'openai',
          credentials: { apiKey: 'sk-secret-1234567890' },
        });
      });
      expect(window.localStorage.getItem(echoKey('openai'))).not.toBeNull();

      await act(async () => {
        await result.current.removeProviderAuth('openai');
      });
      expect(window.localStorage.getItem(echoKey('openai'))).toBeNull();
    });
  });
});
