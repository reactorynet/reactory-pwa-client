/**
 * ReactoryApi Unit Tests
 *
 * Comprehensive test suite covering the core ReactoryApi class,
 * focusing on authentication, session management, GraphQL error handling,
 * component registry, role checking, and utility methods.
 */

// ── Mocks (must be declared before imports) ──────────────────────────────

const mockApolloQuery = jest.fn().mockResolvedValue({ data: {}, errors: [], loading: false, networkStatus: 7 });
const mockApolloMutate = jest.fn().mockResolvedValue({ data: {}, errors: [] });
const mockApolloResetStore = jest.fn();
const mockApolloAddResolvers = jest.fn();
const mockApolloClient = {
  query: mockApolloQuery,
  mutate: mockApolloMutate,
  resetStore: mockApolloResetStore,
  addResolvers: mockApolloAddResolvers,
};

const mockClearCache = jest.fn();

jest.mock('../ReactoryApolloClient', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    client: mockApolloClient,
    ws_link: {},
    clearCache: mockClearCache,
  }),
}));

jest.mock('../RestApi', () => ({
  login: jest.fn().mockResolvedValue({
    user: { token: 'mock-anon-token', firstName: 'Anonymous' },
  }),
  companyWithId: jest.fn(),
  register: jest.fn(),
  reset: jest.fn(),
  forgot: jest.fn(),
  getRemoteJson: jest.fn(),
  postRemoteJson: jest.fn(),
  getContent: jest.fn(),
}));

jest.mock('@reactory/client-core/api/graphql', () => ({
  __esModule: true,
  default: {
    queries: {},
    mutations: {
      Users: { setPassword: 'mock-set-password-mutation' },
      System: { startWorkflow: 'mock-start-workflow-query' },
    },
  },
}));

jest.mock('@reactory/client-core/amq', () => ({
  __esModule: true,
  default: {
    $chan: jest.fn(),
    $sub: { pluginLoaded: jest.fn() },
    $pub: {},
    onFormCommandEvent: jest.fn(),
    raiseFormCommand: jest.fn(),
    onReactoryPluginEvent: jest.fn(),
  },
}));

jest.mock('@reactory/client-core/components/util', () => ({
  attachComponent: jest.fn(),
  getAvatar: jest.fn().mockReturnValue('/avatar.png'),
  getOrganizationLogo: jest.fn().mockReturnValue('/logo.png'),
  getUserFullName: jest.fn().mockReturnValue('Test User'),
  ThemeResource: jest.fn().mockReturnValue('/theme/resource'),
  injectResources: jest.fn(),
  omitDeep: jest.fn((obj) => obj),
  makeSlug: jest.fn((str) => str?.toLowerCase?.()),
  deepEquals: jest.fn((a, b) => JSON.stringify(a) === JSON.stringify(b)),
  CDNResource: jest.fn().mockReturnValue('/cdn/resource'),
  isEmail: jest.fn((s) => /\S+@\S+\.\S+/.test(s)),
  isValidPassword: jest.fn(() => true),
  nil: jest.fn((v) => v === null || v === undefined),
  nilStr: jest.fn((v) => v === null || v === undefined || v === ''),
}));

jest.mock('@reactory/client-core/assets/icons', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@reactory/client-core/components/utility/query-string', () => ({
  stringify: jest.fn(),
  parse: jest.fn(),
}));

jest.mock('localforage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('human-number', () => ({
  __esModule: true,
  default: jest.fn((n) => String(n)),
}));

jest.mock('human-date', () => ({
  __esModule: true,
  default: { relativeTime: jest.fn() },
}));

jest.mock('i18next', () => {
  const instance = {
    use: jest.fn().mockReturnThis(),
    init: jest.fn().mockResolvedValue(undefined),
  };
  return {
    __esModule: true,
    default: instance,
  };
});

jest.mock('react-i18next', () => ({
  initReactI18next: {},
}));

jest.mock('i18next-browser-languagedetector', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../ApiProvider', () => ({
  withReactory: jest.fn((C) => C),
  ReactoryProvider: jest.fn(({ children }) => children),
}));

jest.mock('../ReactoryResourceLoader', () => ({
  ReactoryResourceLoader: jest.fn(),
}));

jest.mock('../ReactoryPluginLoader', () => ({
  ReactoryPluginLoader: jest.fn(),
}));

jest.mock('../graphql/graph/queries/ApiStatus', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue('query status { apiStatus { id status } }'),
}));

jest.mock('schema-inspector', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../objectMapper/parseObjectMapper', () => ({
  parseObjectMapperFunction: jest.fn().mockReturnValue({}),
}));

// ── Imports ──────────────────────────────────────────────────────────────

import ReactoryApi from '../ReactoryApi';
import { anonUser, storageKeys } from '../local';
import { ReactoryApiEventNames } from '../ApiEventNames';
import * as RestApi from '../RestApi';
import ReactoryApolloClient from '../ReactoryApolloClient';

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Creates a fresh ReactoryApi instance for testing.
 * Configures the mock Apollo client and injects a valid auth token so
 * the instance has a usable `client` property without running the full
 * async `init()` flow.
 */
async function createApi(): Promise<ReactoryApi> {
  // Provide a minimal window.reactory for logging config
  (window as any).reactory = {
    logging: { log: false, debug: false, warning: false, error: false, info: false },
  };

  const api = new ReactoryApi({});
  // Inject the mock client directly (avoids full init handshake)
  api.client = mockApolloClient as any;
  api.clearCache = mockClearCache;
  return api;
}

/** Builds a mock ApolloError with a network error carrying a status code */
function makeNetworkError(statusCode: number, message = 'Network error') {
  const networkError: any = new Error(message);
  networkError.statusCode = statusCode;
  networkError.result = {};
  const apolloError: any = new Error(message);
  apolloError.name = 'ApolloError';
  apolloError.networkError = networkError;
  apolloError.graphQLErrors = [];
  apolloError.protocolErrors = [];
  return apolloError;
}

/** Builds a mock GraphQL result */
function makeQueryResult(data: any, errors: any[] = []) {
  return { data, errors, loading: false, networkStatus: 7 };
}

// ── Test suite ───────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  // Set env-like defaults
  localStorage.setItem('$reactory_instance_id$', 'test-uuid');
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. Constructor & Initialization
// ═══════════════════════════════════════════════════════════════════════════
describe('Constructor & Initialization', () => {
  it('should create an instance with default properties', async () => {
    const api = await createApi();

    expect(api).toBeInstanceOf(ReactoryApi);
    expect(api.__REACTORYAPI).toBe(true);
    expect(api.tokenValidated).toBe(false);
    expect(api.tokenValid).toBeNull();
    expect(api.formSchemas).toEqual([]);
    expect(api.formSchemaLastFetch).toBeNull();
    expect(api.isLoggingOut).toBe(false);
  });

  it('should register default core components in the component register', async () => {
    const api = await createApi();

    expect(api.componentRegister).toHaveProperty(['core.ReactoryResourceLoader@1.0.0']);
    expect(api.componentRegister).toHaveProperty(['core.ReactoryPluginLoader@1.0.0']);
    expect(api.componentRegister['core.ReactoryResourceLoader@1.0.0'].nameSpace).toBe('core');
    expect(api.componentRegister['core.ReactoryPluginLoader@1.0.0'].name).toBe('ReactoryPluginLoader');
  });

  it('should have bound utility functions on the utils property', async () => {
    const api = await createApi();

    expect(api.utils).toBeDefined();
    expect(typeof api.utils.nil).toBe('function');
    expect(typeof api.utils.nilStr).toBe('function');
    expect(typeof api.utils.uuid).toBe('function');
    expect(typeof api.utils.slugify).toBe('function');
    expect(typeof api.utils.deepEquals).toBe('function');
    expect(typeof api.utils.templateObject).toBe('function');
    expect(typeof api.utils.hashCode).toBe('function');
  });

  it('should initialise the $func map with the NullFunction', async () => {
    const api = await createApi();

    expect(api.$func).toBeDefined();
    expect(typeof api.$func['core.NullFunction']).toBe('function');
  });

  it('init() should obtain an anon token when no auth token exists', async () => {
    localStorage.removeItem(storageKeys.AuthToken);
    const api = new ReactoryApi({});

    await api.init();

    expect(RestApi.login).toHaveBeenCalled();
    expect(localStorage.getItem(storageKeys.AuthToken)).toBe('mock-anon-token');
  });

  it('init() should query API status when an auth token exists', async () => {
    localStorage.setItem(storageKeys.AuthToken, 'existing-token');
    mockApolloQuery.mockResolvedValueOnce(
      makeQueryResult({ apiStatus: { ...anonUser, status: 'API OK' } }),
    );

    const api = new ReactoryApi({});
    await api.init();

    // getApiStatus was invoked (which calls graphqlQuery -> client.query)
    expect(mockApolloQuery).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Auth Token Management
// ═══════════════════════════════════════════════════════════════════════════
describe('Auth Token Management', () => {
  it('setAuthToken should persist token to localStorage', async () => {
    const api = await createApi();

    api.setAuthToken('my-jwt-token');

    expect(localStorage.getItem(storageKeys.AuthToken)).toBe('my-jwt-token');
  });

  it('getAuthToken should read token from localStorage', async () => {
    const api = await createApi();
    localStorage.setItem(storageKeys.AuthToken, 'stored-token');

    expect(api.getAuthToken()).toBe('stored-token');
  });

  it('getAuthToken should return null when no token exists', async () => {
    const api = await createApi();
    localStorage.removeItem(storageKeys.AuthToken);

    expect(api.getAuthToken()).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. User Management
// ═══════════════════════════════════════════════════════════════════════════
describe('User Management', () => {
  it('setUser should store user and persist to localStorage', async () => {
    const api = await createApi();
    const user = { id: '1', firstName: 'Test', roles: ['USER'] };

    api.setUser(user);

    expect(api.$user).toEqual(user);
    expect(JSON.parse(localStorage.getItem(storageKeys.LoggedInUser))).toEqual(user);
  });

  it('getUser should return the current user', async () => {
    const api = await createApi();
    const user = { id: '1', firstName: 'Jane', roles: ['ADMIN'] };
    api.setUser(user);

    const result = api.getUser();

    expect(result).toEqual(user);
  });

  it('getUser should fall back to localStorage when $user is unset', async () => {
    const storedUser = { id: '2', firstName: 'Stored', roles: ['USER'] };
    localStorage.setItem(storageKeys.LoggedInUser, JSON.stringify(storedUser));
    const api = await createApi();
    api.$user = undefined;

    const result = api.getUser();

    expect(result).toEqual(storedUser);
  });

  it('getUser should return anonUser when nothing is stored', async () => {
    localStorage.removeItem(storageKeys.LoggedInUser);
    const api = await createApi();
    api.$user = undefined;

    const result = api.getUser();

    expect(result).toEqual(anonUser);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Logout
// ═══════════════════════════════════════════════════════════════════════════
describe('Logout', () => {
  it('should clear auth token and set user to anon', async () => {
    const api = await createApi();
    api.setAuthToken('valid-token');
    api.setUser({ id: '1', firstName: 'User', roles: ['USER'] });

    await api.logout(false, 'user_initiated');

    expect(localStorage.getItem(storageKeys.AuthToken)).not.toBe('valid-token');
    expect(api.$user).toEqual(anonUser);
  });

  it('should emit onLogout event with reason', async () => {
    const api = await createApi();
    const emitSpy = jest.spyOn(api, 'emit');

    await api.logout(false, 'session_expired');

    expect(emitSpy).toHaveBeenCalledWith(
      ReactoryApiEventNames.onLogout,
      { reason: 'session_expired' },
    );
  });

  it('should emit onLogout without reason data when no reason given', async () => {
    const api = await createApi();
    const emitSpy = jest.spyOn(api, 'emit');

    await api.logout(false);

    expect(emitSpy).toHaveBeenCalledWith(
      ReactoryApiEventNames.onLogout,
      undefined,
    );
  });

  it('should call clearStoreAndCache during logout', async () => {
    const api = await createApi();

    await api.logout(false);

    expect(mockApolloResetStore).toHaveBeenCalled();
    expect(mockClearCache).toHaveBeenCalled();
  });

  it('should obtain a new anon token during logout', async () => {
    const api = await createApi();
    (RestApi.login as jest.Mock).mockResolvedValueOnce({
      user: { token: 'new-anon-token' },
    });

    await api.logout(false);

    expect(RestApi.login).toHaveBeenCalled();
  });

  it('should create a new Apollo client during logout', async () => {
    const api = await createApi();

    await api.logout(false);

    expect(ReactoryApolloClient).toHaveBeenCalled();
  });

  it('should guard against concurrent logout calls', async () => {
    const api = await createApi();
    const emitSpy = jest.spyOn(api, 'emit');

    // Start two logouts simultaneously
    const p1 = api.logout(false, 'first');
    const p2 = api.logout(false, 'second');
    await Promise.all([p1, p2]);

    // onLogout should only have been emitted once
    const logoutEmits = emitSpy.mock.calls.filter(
      ([event]) => event === ReactoryApiEventNames.onLogout,
    );
    expect(logoutEmits).toHaveLength(1);
  });

  it('should reset isLoggingOut even if an error occurs', async () => {
    const api = await createApi();
    // Force getAnonToken to fail
    (RestApi.login as jest.Mock).mockRejectedValueOnce(new Error('Network down'));

    await api.logout(false, 'test');

    // isLoggingOut must be reset so future logouts can proceed
    expect(api.isLoggingOut).toBe(false);
    // The user should still be set to anon in the catch block
    expect(api.$user).toEqual(anonUser);
  });

  it('should call status() when refreshStatus is true', async () => {
    const api = await createApi();
    // Mock the graphqlQuery that status() -> getApiStatus() calls
    mockApolloQuery.mockResolvedValueOnce(
      makeQueryResult({ apiStatus: { ...anonUser, status: 'API OK' } }),
    );

    await api.logout(true);

    // status() calls getApiStatus() which calls graphqlQuery -> client.query
    expect(mockApolloQuery).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. GraphQL Query – Error Handling
// ═══════════════════════════════════════════════════════════════════════════
describe('graphqlQuery', () => {
  it('should execute a query and return the result', async () => {
    const api = await createApi();
    const expectedData = { users: [{ id: '1' }] };
    mockApolloQuery.mockResolvedValueOnce(makeQueryResult(expectedData));

    const result = await api.graphqlQuery('query { users { id } }', {});

    expect(result.data).toEqual(expectedData);
  });

  it('should handle a DocumentNode query (not just string)', async () => {
    const api = await createApi();
    const docNode = { kind: 'Document', definitions: [] }; // mock DocumentNode
    mockApolloQuery.mockResolvedValueOnce(makeQueryResult({ test: true }));

    const result = await api.graphqlQuery(docNode, {});

    expect(mockApolloQuery).toHaveBeenCalledWith(
      expect.objectContaining({ query: docNode }),
    );
    expect(result.data).toEqual({ test: true });
  });

  it('should trigger logout on 401 network error', async () => {
    const api = await createApi();
    const logoutSpy = jest.spyOn(api, 'logout').mockResolvedValue(undefined);
    mockApolloQuery.mockRejectedValueOnce(makeNetworkError(401));

    await expect(api.graphqlQuery('query { me { id } }', {})).rejects.toThrow();

    expect(logoutSpy).toHaveBeenCalledWith(false, 'session_expired');
  });

  it('should trigger logout on 403 network error', async () => {
    const api = await createApi();
    const logoutSpy = jest.spyOn(api, 'logout').mockResolvedValue(undefined);
    mockApolloQuery.mockRejectedValueOnce(makeNetworkError(403));

    await expect(api.graphqlQuery('query { me { id } }', {})).rejects.toThrow();

    expect(logoutSpy).toHaveBeenCalledWith(false, 'session_expired');
  });

  it('should show notification on non-auth network errors', async () => {
    const api = await createApi();
    const notifySpy = jest.spyOn(api, 'createNotification');
    mockApolloQuery.mockRejectedValueOnce(makeNetworkError(500, 'Internal Server Error'));

    await expect(api.graphqlQuery('query { data }', {})).rejects.toThrow();

    expect(notifySpy).toHaveBeenCalledWith(
      expect.stringContaining('Network Error'),
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('should re-throw the error after handling', async () => {
    const api = await createApi();
    jest.spyOn(api, 'logout').mockResolvedValue(undefined);
    const error = makeNetworkError(401);
    mockApolloQuery.mockRejectedValueOnce(error);

    await expect(api.graphqlQuery('query { x }', {})).rejects.toBe(error);
  });

  it('should use cache-only fetch policy when offline', async () => {
    const api = await createApi();
    mockApolloQuery.mockResolvedValueOnce(makeQueryResult({ cached: true }));

    // Simulate offline
    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

    await api.graphqlQuery('query { data }', {});

    expect(mockApolloQuery).toHaveBeenCalledWith(
      expect.objectContaining({ fetchPolicy: 'cache-only' }),
    );

    // Restore
    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, writable: true });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. GraphQL Mutation – Error Handling
// ═══════════════════════════════════════════════════════════════════════════
describe('graphqlMutation', () => {
  it('should execute a mutation and return the result', async () => {
    const api = await createApi();
    const expectedData = { createUser: { id: '1' } };
    mockApolloMutate.mockResolvedValueOnce({ data: expectedData });

    const result = await api.graphqlMutation('mutation { createUser { id } }', {});

    expect(result.data).toEqual(expectedData);
  });

  it('should trigger logout on 401 network error', async () => {
    const api = await createApi();
    const logoutSpy = jest.spyOn(api, 'logout').mockResolvedValue(undefined);
    mockApolloMutate.mockRejectedValueOnce(makeNetworkError(401));

    await expect(api.graphqlMutation('mutation { doStuff }', {})).rejects.toThrow();

    expect(logoutSpy).toHaveBeenCalledWith(false, 'session_expired');
  });

  it('should trigger logout on 403 network error', async () => {
    const api = await createApi();
    const logoutSpy = jest.spyOn(api, 'logout').mockResolvedValue(undefined);
    mockApolloMutate.mockRejectedValueOnce(makeNetworkError(403));

    await expect(api.graphqlMutation('mutation { doStuff }', {})).rejects.toThrow();

    expect(logoutSpy).toHaveBeenCalledWith(false, 'session_expired');
  });

  it('should show notification on non-auth network errors', async () => {
    const api = await createApi();
    const notifySpy = jest.spyOn(api, 'createNotification');
    mockApolloMutate.mockRejectedValueOnce(makeNetworkError(502, 'Bad Gateway'));

    await expect(api.graphqlMutation('mutation { x }', {})).rejects.toThrow();

    expect(notifySpy).toHaveBeenCalledWith(
      expect.stringContaining('Network Error'),
      expect.objectContaining({ type: 'error' }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. API Status
// ═══════════════════════════════════════════════════════════════════════════
describe('status', () => {
  const mockApiStatus = {
    ...anonUser,
    id: 'status-1',
    status: 'API OK',
    loggedIn: {
      user: { id: 'u1', firstName: 'Jane', lastName: 'Doe', avatar: '' },
      roles: ['USER'],
      memberships: [],
    },
    routes: [],
    menus: [],
    messages: [],
  };

  it('should set user and emit events on successful status', async () => {
    const api = await createApi();
    const emitSpy = jest.spyOn(api, 'emit');
    mockApolloQuery.mockResolvedValueOnce(makeQueryResult({ apiStatus: mockApiStatus }));

    const result = await api.status({ emitLogin: true, forceLogout: true });

    expect(result.status).toBe('API OK');
    expect(api.$user).toEqual(expect.objectContaining({ status: 'API OK' }));
    expect(emitSpy).toHaveBeenCalledWith(
      ReactoryApiEventNames.onLogin,
      expect.anything(),
    );
  });

  it('should handle status call with no options (undefined)', async () => {
    const api = await createApi();
    mockApolloQuery.mockResolvedValueOnce(makeQueryResult({ apiStatus: mockApiStatus }));

    // This should not throw even though options is undefined
    const result = await api.status();

    expect(result.status).toBe('API OK');
  });

  it('should not emit onLogin when emitLogin is false', async () => {
    const api = await createApi();
    const emitSpy = jest.spyOn(api, 'emit');
    mockApolloQuery.mockResolvedValueOnce(makeQueryResult({ apiStatus: mockApiStatus }));

    await api.status({ emitLogin: false });

    const loginEmits = emitSpy.mock.calls.filter(
      ([event]) => event === ReactoryApiEventNames.onLogin,
    );
    expect(loginEmits).toHaveLength(0);
  });

  it('should trigger logout on 401 during status check', async () => {
    const api = await createApi();
    const logoutSpy = jest.spyOn(api, 'logout').mockResolvedValue(undefined);
    mockApolloQuery.mockRejectedValueOnce(makeNetworkError(401));

    const result = await api.status({ forceLogout: true });

    expect(logoutSpy).toHaveBeenCalledWith(false, 'session_expired');
    expect(result).toEqual(anonUser);
  });

  it('should display notifications for API messages', async () => {
    const api = await createApi();
    const notifySpy = jest.spyOn(api, 'createNotification');
    const statusWithMessages = {
      ...mockApiStatus,
      messages: [{ title: 'Welcome', text: 'Hello!', type: 'info' }],
    };
    mockApolloQuery.mockResolvedValueOnce(makeQueryResult({ apiStatus: statusWithMessages }));

    await api.status({ emitLogin: false });

    expect(notifySpy).toHaveBeenCalledWith('Welcome', expect.anything());
  });

  it('should throw when client is not ready', async () => {
    const api = await createApi();
    api.client = null;

    await expect(api.status({ emitLogin: false })).rejects.toThrow('ApolloClient not ready');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. Component Registry
// ═══════════════════════════════════════════════════════════════════════════
describe('Component Registry', () => {
  const DummyComponent = () => null;

  it('registerComponent should add a component to the registry', async () => {
    const api = await createApi();

    api.registerComponent('test', 'Widget', '1.0.0', DummyComponent, ['ui'], ['USER']);

    expect(api.componentRegister['test.Widget@1.0.0']).toBeDefined();
    expect(api.componentRegister['test.Widget@1.0.0'].component).toBe(DummyComponent);
    expect(api.componentRegister['test.Widget@1.0.0'].nameSpace).toBe('test');
    expect(api.componentRegister['test.Widget@1.0.0'].name).toBe('Widget');
  });

  it('registerComponent should emit onComponentRegistered', async () => {
    const api = await createApi();
    const emitSpy = jest.spyOn(api, 'emit');

    api.registerComponent('ns', 'Comp', '2.0.0', DummyComponent);

    expect(emitSpy).toHaveBeenCalledWith(
      ReactoryApiEventNames.onComponentRegistered,
      expect.objectContaining({ fqn: 'ns.Comp@2.0.0' }),
    );
  });

  it('registerComponent should throw when nameSpace is empty', async () => {
    const api = await createApi();

    expect(() => api.registerComponent('', 'Name', '1.0.0', DummyComponent))
      .toThrow('nameSpace is required');
  });

  it('registerComponent should throw when name is empty', async () => {
    const api = await createApi();

    expect(() => api.registerComponent('ns', '', '1.0.0', DummyComponent))
      .toThrow('name is required');
  });

  it('registerComponent should throw when component is null', async () => {
    const api = await createApi();

    expect(() => api.registerComponent('ns', 'Comp', '1.0.0', null))
      .toThrow('component is required');
  });

  it('getComponent should retrieve a registered component by FQN', async () => {
    const api = await createApi();
    api.registerComponent('test', 'Button', '1.0.0', DummyComponent);

    const result = api.getComponent('test.Button@1.0.0');

    expect(result).toBe(DummyComponent);
  });

  it('getComponent should auto-append @1.0.0 when version is omitted', async () => {
    const api = await createApi();
    api.registerComponent('test', 'Button', '1.0.0', DummyComponent);

    const result = api.getComponent('test.Button');

    expect(result).toBe(DummyComponent);
  });

  it('getComponent should return null for unregistered component', async () => {
    const api = await createApi();

    const result = api.getComponent('unknown.Component@1.0.0');

    expect(result).toBeNull();
  });

  it('getComponent should throw for undefined FQN', async () => {
    const api = await createApi();

    expect(() => api.getComponent(undefined)).toThrow('NO NULL FQN');
  });

  it('getComponents should return a map of requested components', async () => {
    const api = await createApi();
    const CompA = () => 'A';
    const CompB = () => 'B';
    api.registerComponent('ns', 'CompA', '1.0.0', CompA, [], ['*']);
    api.registerComponent('ns', 'CompB', '1.0.0', CompB, [], ['*']);

    const result = api.getComponents<any>(['ns.CompA@1.0.0', 'ns.CompB@1.0.0']);

    expect(result.CompA).toBe(CompA);
    expect(result.CompB).toBe(CompB);
  });

  it('getComponentsByType should filter by componentType', async () => {
    const api = await createApi();
    api.registerComponent('ns', 'FormA', '1.0.0', DummyComponent, [], ['*'], false, [], 'form');
    api.registerComponent('ns', 'WidgetA', '1.0.0', DummyComponent, [], ['*'], false, [], 'widget');

    const forms = api.getComponentsByType('form');
    const widgets = api.getComponentsByType('widget');

    expect(Object.keys(forms)).toHaveLength(1);
    expect(forms).toHaveProperty(['ns.FormA@1.0.0']);
    expect(Object.keys(widgets)).toHaveLength(1);
    expect(widgets).toHaveProperty(['ns.WidgetA@1.0.0']);
  });

  it('getNotFoundComponent should return a fallback when the not-found component is not registered', async () => {
    const api = await createApi();

    const NotFound = api.getNotFoundComponent();

    expect(typeof NotFound).toBe('function');
  });

  it('getNotAllowedComponent should return a fallback when not registered', async () => {
    const api = await createApi();

    const NotAllowed = api.getNotAllowedComponent();

    expect(NotAllowed).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. Role Checking
// ═══════════════════════════════════════════════════════════════════════════
describe('hasRole', () => {
  it('should return true when user has the required role', async () => {
    const api = await createApi();
    api.setUser({
      loggedIn: { roles: ['ADMIN', 'USER'], memberships: [] },
      roles: ['ADMIN', 'USER'],
    });

    expect(api.hasRole(['ADMIN'])).toBe(true);
    expect(api.hasRole(['USER'])).toBe(true);
  });

  it('should return false when user lacks the required role', async () => {
    const api = await createApi();
    api.setUser({
      loggedIn: { roles: ['USER'], memberships: [] },
      roles: ['USER'],
    });

    expect(api.hasRole(['ADMIN'])).toBe(false);
  });

  it('should return true for wildcard role ["*"]', async () => {
    const api = await createApi();
    api.setUser({
      loggedIn: { roles: ['USER'], memberships: [] },
      roles: ['USER'],
    });

    expect(api.hasRole(['*'])).toBe(true);
  });

  it('should check roles against explicit userRoles parameter', async () => {
    const api = await createApi();

    expect(api.hasRole(['ADMIN'], ['ADMIN', 'USER'])).toBe(true);
    expect(api.hasRole(['SUPER'], ['ADMIN', 'USER'])).toBe(false);
  });

  it('should check organization-specific membership roles', async () => {
    const api = await createApi();
    api.setUser({
      loggedIn: {
        roles: ['USER'],
        memberships: [
          {
            organization: { id: 'org-1' },
            businessUnit: null,
            roles: ['ORG_ADMIN'],
          },
        ],
      },
    });

    const org = { id: 'org-1' } as any;

    expect(api.hasRole(['ORG_ADMIN'], null, org)).toBe(true);
    expect(api.hasRole(['ORG_SUPER'], null, org)).toBe(false);
  });
});

describe('isAnon', () => {
  it('should return true when the user has the ANON role', async () => {
    const api = await createApi();
    api.$user = { roles: ['ANON'] };

    expect(api.isAnon()).toBe(true);
  });

  it('should return false for a non-ANON user', async () => {
    const api = await createApi();
    api.$user = { roles: ['USER', 'ADMIN'] };

    expect(api.isAnon()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. Navigation & Notifications
// ═══════════════════════════════════════════════════════════════════════════
describe('goto', () => {
  it('should assign to window.location.href', async () => {
    const api = await createApi();

    // jsdom does not implement full navigation — assigning to window.location.href
    // for a same-origin path (hash change) works silently. We verify goto() updates href.
    // Using a hash-only change avoids jsdom's "Not implemented: navigation" error.
    const beforeHref = window.location.href;
    api.goto('#test-dashboard');

    expect(window.location.href).toContain('#test-dashboard');
    expect(window.location.href).not.toBe(beforeHref);
  });
});

describe('createNotification', () => {
  it('should emit onShowNotification for in-app notifications', async () => {
    const api = await createApi();
    const emitSpy = jest.spyOn(api, 'emit');

    api.createNotification('Test Title', { type: 'info', showInAppNotification: true });

    expect(emitSpy).toHaveBeenCalledWith(
      ReactoryApiEventNames.onShowNotification,
      expect.objectContaining({ title: 'Test Title', type: 'info' }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. Storage Operations
// ═══════════════════════════════════════════════════════════════════════════
describe('Storage operations', () => {
  it('storeObjectWithKey should save to localStorage by default', async () => {
    const api = await createApi();
    const obj = { foo: 'bar' };

    await api.storeObjectWithKey('test-key', obj);

    expect(localStorage.getItem('test-key')).toBe(JSON.stringify(obj));
  });

  it('readObjectWithKey should read from localStorage by default', async () => {
    const api = await createApi();
    const obj = { foo: 'bar' };
    localStorage.setItem('test-key', JSON.stringify(obj));

    const result = await api.readObjectWithKey('test-key');

    expect(result).toEqual(obj);
  });

  it('deleteObjectWithKey should remove from localStorage by default', async () => {
    const api = await createApi();
    localStorage.setItem('test-key', 'value');

    await api.deleteObjectWithKey('test-key');

    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('storeObjectWithKey should use localForage when indexDB is true', async () => {
    const api = await createApi();
    const localForage = require('localforage');

    await api.storeObjectWithKey('idb-key', { data: 1 }, true);

    expect(localForage.setItem).toHaveBeenCalledWith('idb-key', { data: 1 }, expect.any(Function));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. Development Mode
// ═══════════════════════════════════════════════════════════════════════════
describe('Development Mode', () => {
  it('isDevelopmentMode should return false by default', async () => {
    const api = await createApi();

    expect(api.isDevelopmentMode()).toBe(false);
  });

  it('setDevelopmentMode should toggle the mode', async () => {
    const api = await createApi();
    const localForage = require('localforage');

    api.setDevelopmentMode(true);

    expect(api.isDevelopmentMode()).toBe(true);
    expect(localForage.setItem).toHaveBeenCalledWith(
      storageKeys.developmentMode,
      true,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. Theme & Routes
// ═══════════════════════════════════════════════════════════════════════════
describe('Theme & Routes', () => {
  it('getTheme should return the active theme from user state', async () => {
    const api = await createApi();
    const mockTheme = { id: 'theme-1', name: 'Dark', type: 'material' };
    api.setUser({ activeTheme: mockTheme, loggedIn: { roles: ['USER'] } });

    const theme = api.getTheme();

    expect(theme).toEqual(expect.objectContaining({ id: 'theme-1', name: 'Dark' }));
    // Should include extensions
    expect(theme.extensions).toBeDefined();
    expect((theme.extensions as any).reactory).toBeDefined();
  });

  it('getRoutes should return routes from user state', async () => {
    const api = await createApi();
    const routes = [{ id: 'r1', path: '/home', componentFqn: 'core.Home@1.0.0' }];
    api.setUser({ routes });

    expect(api.getRoutes()).toEqual(routes);
  });

  it('getRoutes should return empty array when no routes set', async () => {
    const api = await createApi();
    api.setUser({});

    expect(api.getRoutes()).toEqual([]);
  });

  it('getMenus should return menus from user state', async () => {
    const api = await createApi();
    const menus = [{ id: 'm1', key: 'main', name: 'Main Menu' }];
    api.setUser({ menus });

    expect(api.getMenus()).toEqual(menus);
  });

  it('getThemeMode should default to light', async () => {
    const api = await createApi();
    localStorage.removeItem('$reactory$theme_mode');

    expect(api.getThemeMode()).toBe('light');
  });

  it('getThemeMode should read from localStorage', async () => {
    const api = await createApi();
    localStorage.setItem('$reactory$theme_mode', 'dark');

    expect(api.getThemeMode()).toBe('dark');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. registerFunction
// ═══════════════════════════════════════════════════════════════════════════
describe('registerFunction', () => {
  it('should register a function by FQN', async () => {
    const api = await createApi();
    const myFunc = jest.fn().mockReturnValue(42);

    api.registerFunction('test.myFunc', myFunc);

    expect(api.$func['test.myFunc']).toBe(myFunc);
    expect(api.$func['test.myFunc']({}  as any)).toBe(42);
  });

  it('should wrap function with api reference when requiresApi is true', async () => {
    const api = await createApi();
    const myFunc = jest.fn(({ api: injectedApi }) => injectedApi.__REACTORYAPI);

    api.registerFunction('test.apiFunc', myFunc, true);

    const result = api.$func['test.apiFunc']({ data: 'test' } as any);

    expect(myFunc).toHaveBeenCalledWith(
      expect.objectContaining({ data: 'test', api: api, reactory: api }),
    );
    expect(result).toBe(true);
  });

  it('should ignore non-function values', async () => {
    const api = await createApi();

    api.registerFunction('test.notFunc', 'not a function' as any);

    expect(api.$func['test.notFunc']).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 15. View Context
// ═══════════════════════════════════════════════════════════════════════════
describe('View Context', () => {
  it('setViewContext should persist context to localStorage', async () => {
    const api = await createApi();

    api.setViewContext({ page: 'dashboard', filter: 'active' });

    const stored = JSON.parse(localStorage.getItem(storageKeys.viewContext));
    expect(stored).toEqual({ page: 'dashboard', filter: 'active' });
  });

  it('getViewContext should return the stored context', async () => {
    const api = await createApi();
    api.setViewContext({ page: 'settings' });

    expect(api.getViewContext()).toEqual({ page: 'settings' });
  });

  it('setViewContext should merge with existing context', async () => {
    const api = await createApi();
    api.setViewContext({ page: 'home' });
    api.setViewContext({ filter: 'all' });

    expect(api.getViewContext()).toEqual({ page: 'home', filter: 'all' });
  });

  it('getViewContext should return empty object when nothing stored', async () => {
    const api = await createApi();
    localStorage.removeItem(storageKeys.viewContext);

    expect(api.getViewContext()).toEqual({});
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 16. afterLogin
// ═══════════════════════════════════════════════════════════════════════════
describe('afterLogin', () => {
  it('should set auth token and call status', async () => {
    const api = await createApi();
    const statusResult = { ...anonUser, status: 'API OK', id: 'after-login' };
    mockApolloQuery.mockResolvedValueOnce(makeQueryResult({ apiStatus: statusResult }));

    const result = await api.afterLogin({ user: { token: 'new-jwt-token' } } as any);

    expect(localStorage.getItem(storageKeys.AuthToken)).toBe('new-jwt-token');
    expect(ReactoryApolloClient).toHaveBeenCalled();
    expect(result.status).toBe('API OK');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17. clearStoreAndCache
// ═══════════════════════════════════════════════════════════════════════════
describe('clearStoreAndCache', () => {
  it('should reset the Apollo store and purge the cache', async () => {
    const api = await createApi();

    api.clearStoreAndCache();

    expect(mockApolloResetStore).toHaveBeenCalled();
    expect(mockClearCache).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 18. getSizeSpec
// ═══════════════════════════════════════════════════════════════════════════
describe('getSizeSpec', () => {
  it('should return a window size spec object', async () => {
    const api = await createApi();

    const spec = api.getSizeSpec();

    expect(spec).toHaveProperty('innerHeight');
    expect(spec).toHaveProperty('innerWidth');
    expect(spec).toHaveProperty('outerHeight');
    expect(spec).toHaveProperty('outerWidth');
    expect(spec).toHaveProperty('view');
    expect(spec).toHaveProperty('size');
    expect(spec).toHaveProperty('ratio');
    expect(spec).toHaveProperty('resolution');
    expect(spec.resolution).toHaveProperty('width');
    expect(spec.resolution).toHaveProperty('height');
  });

  it('should use theme breakpoints when muiTheme is set', async () => {
    const api = await createApi();
    api.muiTheme = {
      breakpoints: { values: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 } },
    };

    const spec = api.getSizeSpec();

    // Should not throw and should return a valid size
    expect(['xs', 'sm', 'md', 'lg', 'xl']).toContain(spec.size);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 19. extendClientResolver
// ═══════════════════════════════════════════════════════════════════════════
describe('extendClientResolver', () => {
  it('should add resolvers to the Apollo client', async () => {
    const api = await createApi();
    const resolvers = { Query: { localField: () => 'value' } };

    api.extendClientResolver(resolvers);

    expect(mockApolloAddResolvers).toHaveBeenCalledWith(resolvers);
  });

  it('should not throw when client or resolvers is null', async () => {
    const api = await createApi();

    // Should not throw
    expect(() => api.extendClientResolver(null)).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 20. Last User Email
// ═══════════════════════════════════════════════════════════════════════════
describe('Last User Email', () => {
  it('setLastUserEmail should persist to localStorage', async () => {
    const api = await createApi();

    api.setLastUserEmail('user@example.com');

    expect(localStorage.getItem(storageKeys.LastLoggedInEmail)).toBe('user@example.com');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 21. parseTemplateObject (exported utility)
// ═══════════════════════════════════════════════════════════════════════════
describe('parseTemplateObject', () => {
  // Import the named export
  const { parseTemplateObject } = require('../ReactoryApi');

  it('should return null for null/undefined input', () => {
    expect(parseTemplateObject(null, {})).toBeNull();
    expect(parseTemplateObject(undefined, {})).toBeNull();
  });

  it('should pass through non-template strings unchanged', () => {
    const result = parseTemplateObject({ greeting: 'hello' }, {});

    expect(result.greeting).toBe('hello');
  });

  it('should resolve template expressions', () => {
    const result = parseTemplateObject(
      { message: '${name} is ${age}' },
      { name: 'Alice', age: 30 },
    );

    expect(result.message).toBe('Alice is 30');
  });

  it('should recursively process nested objects', () => {
    const result = parseTemplateObject(
      { outer: { inner: '${value}' } },
      { value: 'deep' },
    );

    expect(result.outer.inner).toBe('deep');
  });

  it('should pass through non-string, non-object values', () => {
    const result = parseTemplateObject({ count: 42, flag: true }, {});

    expect(result.count).toBe(42);
    expect(result.flag).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 22. componentPartsFromFqn (exported utility)
// ═══════════════════════════════════════════════════════════════════════════
describe('componentPartsFromFqn', () => {
  const { componentPartsFromFqn } = require('../ReactoryApi');

  it('should parse nameSpace.name@version', () => {
    const result = componentPartsFromFqn('core.Button@2.0.0');

    expect(result.nameSpace).toBe('core');
    expect(result.name).toBe('Button');
    expect(result.version).toBe('2.0.0');
  });

  it('should parse nameSpace.name without version', () => {
    const result = componentPartsFromFqn('core.Button');

    expect(result.nameSpace).toBe('core');
    expect(result.name).toBe('Button');
    expect(result.version).toBe('');
  });

  it('should throw for invalid FQN', () => {
    expect(() => componentPartsFromFqn('')).toThrow('Component FQN not valid');
    expect(() => componentPartsFromFqn('noNamespace')).toThrow('Component FQN not valid');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 23. Event system integration
// ═══════════════════════════════════════════════════════════════════════════
describe('Event system', () => {
  it('should support addEventListener-style listeners via EventEmitter', async () => {
    const api = await createApi();
    const handler = jest.fn();

    api.on('customEvent', handler);
    api.emit('customEvent', { data: 'test' });

    expect(handler).toHaveBeenCalledWith({ data: 'test' });
  });

  it('should allow removing listeners', async () => {
    const api = await createApi();
    const handler = jest.fn();

    api.on('customEvent', handler);
    api.off('customEvent', handler);
    api.emit('customEvent', { data: 'test' });

    expect(handler).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 24. Plugin injection
// ═══════════════════════════════════════════════════════════════════════════
describe('injectPlugin', () => {
  it('should use the default plugin loader from the component register', async () => {
    const api = await createApi();
    const mockLoader = jest.fn();
    api.componentRegister['core.ReactoryPluginLoader@1.0.0'].component = mockLoader;

    const plugin: any = {
      id: 'test-plugin',
      name: 'TestPlugin',
      nameSpace: 'test',
      version: '1.0.0',
      uri: 'http://localhost/plugin.js',
      mimeType: 'application/javascript',
      enabled: true,
    };

    api.injectPlugin(plugin);

    expect(mockLoader).toHaveBeenCalledWith(
      expect.objectContaining({ plugin, reactory: api }),
    );
  });

  it('should emit onPluginError when a custom loader is not found', async () => {
    const api = await createApi();
    const emitSpy = jest.spyOn(api, 'emit');

    const plugin: any = {
      id: 'broken-plugin',
      name: 'BrokenPlugin',
      nameSpace: 'test',
      loader: 'nonexistent.Loader@1.0.0',
    };

    api.injectPlugin(plugin);

    expect(emitSpy).toHaveBeenCalledWith(
      ReactoryApiEventNames.onPluginError,
      expect.objectContaining({ plugin, error: expect.stringContaining('not found') }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 25. Resource injection
// ═══════════════════════════════════════════════════════════════════════════
describe('injectResource', () => {
  it('should use the default resource loader', async () => {
    const api = await createApi();
    const mockLoader = jest.fn();
    api.componentRegister['core.ReactoryResourceLoader@1.0.0'].component = mockLoader;

    const resource: any = {
      id: 'res-1',
      type: 'style',
      uri: 'http://localhost/styles.css',
    };

    api.injectResource(resource);

    expect(mockLoader).toHaveBeenCalledWith(
      expect.objectContaining({ resource, reactory: api }),
    );
  });

  it('should throw when a custom loader FQN is not found', async () => {
    const api = await createApi();

    const resource: any = {
      id: 'res-2',
      type: 'script',
      uri: 'http://localhost/script.js',
      loader: 'nonexistent.Loader@1.0.0',
    };

    expect(() => api.injectResource(resource)).toThrow('not found');
  });
});
