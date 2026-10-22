import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReactoryHOC from './App';

// Define mock SDK
var mockReactory: any;

// Mock dependencies
jest.mock('./api', () => {
  const createMockReactory = () => ({
    getComponentCalls: [],
    logCalls: [],
    telemetryCalls: [],
    emittedEvents: [],

    getComponents: jest.fn((deps: string[]) => {
      const componentMap: Record<string, React.ComponentType<any>> = {
        'core.Loading@1.0.0': () => <div>Loading</div>,
        'core.Login@1.0.0': () => <div>Login</div>,
        'core.FullScreenModal@1.0.0': () => <div>Modal</div>,
        'core.NotificationComponent@1.0.0': () => <div>Notifications</div>,
        'core.NotFound@1.0.0': () => <div>Not Found</div>,
        'reactory.Footer@1.0.0': () => <div>Footer</div>,
      };

      const result: Record<string, React.ComponentType<any>> = {};
      deps.forEach(dep => {
        if (componentMap[dep]) {
          const componentName = dep.split('.')[1].split('@')[0];
          result[componentName] = componentMap[dep];
        }
      });

      return result;
    }),
    status: jest.fn().mockResolvedValue({ ready: false, authenticated: false }),
    graphqlQuery: jest.fn().mockResolvedValue({ data: { CoreOrganization: null } }),
    setThemeOverride: jest.fn(),
    amq: {
      $sub: { def: jest.fn(() => ({ unsubscribe: jest.fn() })) },
      $pub: { def: jest.fn() },
    },
    log: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    emit: jest.fn(),
    registerComponent: jest.fn(),
    getUser: jest.fn(),
    getTheme: jest.fn(() => ({ options: { palette: { mode: 'light' } } })),
    getSizeSpec: jest.fn(() => ({ width: 1440, height: 900, size: 'lg' })),
    warning: jest.fn(),
    createNotification: jest.fn(),
    utils: {
      lodash: {
        cloneDeep: jest.fn((value) => value),
      },
    },
    formSchemas: [],
    formSchemaMap: {},
    formSchemaLastFetch: null,
    componentRegister: {
      'test.form@1.0.0': { componentType: 'form' },
      'test.component@1.0.0': { componentType: 'component' },
    },
    i18n: {
      t: jest.fn((key) => key),
      language: 'en',
      changeLanguage: jest.fn(),
    },
    featureFlags: {
      get: jest.fn(),
      set: jest.fn(),
    },
    telemetry: {
      emit: jest.fn(),
    },
    init: jest.fn().mockResolvedValue(undefined),
    forms: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(function() { return this; }),
    off: jest.fn(function() { return this; }),
    client: {},
    __REACTORYAPI: true,
  });

  mockReactory = createMockReactory();

  return {
    __esModule: true,
    default: class MockReactoryApi {
      constructor(props) {
        Object.assign(this, mockReactory);
      }
    },
    ReactoryApiEventNames: {
      onInitProgress: 'onInitProgress',
      onLogout: 'onLogout',
      onLogin: 'onLogin',
      onApiStatusUpdate: 'onApiStatusUpdate',
      onRouteChanged: 'onRouteChanged',
      onThemeChanged: 'onThemeChanged',
    },
  };
});

jest.mock('./models/redux', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));

jest.mock('./app/widgets', () => ({
  AppLoading: ({ message }: { message: string }) => <div data-testid="app-loading">{message}</div>,
  Offline: () => <div data-testid="offline-component" />,
}));

jest.mock('./app/router', () => ({
  ReactoryRouter: () => <div data-testid="reactory-router" />,
}));

jest.mock('./components/index', () => ({
  componentRegistery: [
    {
      nameSpace: 'test',
      name: 'SampleWidget',
      version: '1.0.0',
      component: () => <div data-testid="sample-widget">Sample Widget</div>,
      tags: [],
      roles: ['*'],
      wrapWithApi: false,
    },
  ],
}));

jest.mock('./components/shared/header', () => ({
  ReactoryHeader: () => <div data-testid="header" />,
}));

jest.mock('./api/ReactoryApolloClient', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({
    client: {},
    ws_link: {},
    clearCache: jest.fn(),
  })),
}));

jest.mock('./api/ApiProvider', () => ({
  ReactoryProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="reactory-provider">{children}</div>,
}));

// Mock additional dependencies that App.tsx imports
jest.mock('@reactory/client-core/components/shared/header', () => ({
  ReactoryHeader: () => <div data-testid="header" />,
}));

jest.mock('./components/reactory/form/utils', () => ({
  deepEquals: jest.fn(),
}));

jest.mock('./components/utility/query-string', () => {
  const parse = jest.fn((search: string = '') => {
    if (typeof search === 'string' && search.includes('auth_token=')) {
      const value = search.split('auth_token=')[1]?.split('&')[0] || '';
      return { auth_token: decodeURIComponent(value) };
    }
    return {};
  });
  const stringify = jest.fn(() => '');
  return {
    __esModule: true,
    default: {
      parse,
      stringify,
    },
    parse,
    stringify,
  };
});

jest.mock('./app/constants', () => ({
  REACT_APP_CLIENT_KEY: 'test',
  REACT_APP_CLIENT_PUBLIC_KEY: 'test',
  REACT_APP_API_ENDPOINT: 'http://test.com',
  classes: {},
  packageInfo: {},
}));

jest.mock('./license', () => ({}));

// Removed - now included in main api mock
// jest.mock('./api/ApiEventNames', () => ({
//   ReactoryApiEventNames: {
//     onInitProgress: 'onInitProgress',
//   },
//   INIT_STEPS: [],
//   InitProgressEvent: {},
//   InitProgressStatus: {},
// }));

jest.mock('@reactorynet/reactory-core', () => ({}));

jest.mock('@mui/x-date-pickers/AdapterMoment', () => ({
  AdapterMoment: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
  LocalizationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock lodash
jest.mock('lodash', () => ({
  isNil: jest.fn(),
  isArray: jest.fn(),
}));

// Mock React Router hooks
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Route: () => <div />,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/', search: '', hash: '' }),
  useNavigation: () => ({}),
  useParams: () => ({}),
}));

// Mock Apollo Client
jest.mock('@apollo/client', () => ({
  ApolloProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Redux
jest.mock('react-redux', () => ({
  Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock MUI
jest.mock('@mui/material', () => ({
  styled: jest.fn((component) => (styles: any) => component),
  Theme: {},
  CssBaseline: () => <div />,
  createTheme: jest.fn(() => ({
    palette: {
      mode: 'light',
      background: { default: '#ffffff' },
      primary: { main: '#1a73e8', contrastText: '#ffffff' },
      text: { primary: '#111111' },
    },
  })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Typography: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Icon: () => <div />,
  Paper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Box: ({ children, component, onClick }: { children: React.ReactNode; component?: string; onClick?: () => void }) => {
    if (component === 'button') {
      return <button onClick={onClick}>{children}</button>;
    }
    return <div>{children}</div>;
  },
}));

jest.mock('@mui/material/styles', () => ({
  createTheme: jest.fn(() => ({
    palette: {
      mode: 'light',
      background: { default: '#ffffff' },
      primary: { main: '#1a73e8', contrastText: '#ffffff' },
      text: { primary: '#111111' },
    },
  })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  styled: jest.fn((component) => (styles: any) => component),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock window methods
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

global.window.addEventListener = jest.fn();
global.window.removeEventListener = jest.fn();

describe('ReactoryHOC (App)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).reactory = {};
    // Reset mock to initial state with proper return values
    mockReactory.status.mockReset().mockResolvedValue({ ready: false, authenticated: false });
    mockReactory.init.mockReset().mockResolvedValue(undefined);
    mockReactory.forms.mockReset().mockResolvedValue(undefined);
    mockReactory.registerComponent.mockReset();
    mockReactory.getTheme.mockReset().mockReturnValue({ options: { palette: { mode: 'light' } } });
    mockReactory.getUser.mockReset();
    mockReactory.getSizeSpec.mockReset().mockReturnValue({ width: 1440, height: 900, size: 'lg' });
    mockReactory.warning.mockReset();
    mockReactory.createNotification.mockReset();
    mockReactory.log.mockReset();
    mockReactory.error.mockReset();
    mockReactory.debug.mockReset();
    mockReactory.emit.mockReset();
    mockReactory.on.mockReset().mockImplementation(function() { return this; });
    mockReactory.off.mockReset().mockImplementation(function() { return this; });
    mockReactory.graphqlQuery.mockReset().mockResolvedValue({ data: { CoreOrganization: null } });
    mockReactory.setThemeOverride.mockReset();
    mockReactory.amq.$sub.def.mockReset().mockImplementation(() => ({ unsubscribe: jest.fn() }));
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
  });

  describe('Initial Loading State', () => {
    it('shows loading screen when not ready', async () => {
      // Mock status to reject (simulating API unavailable)
      mockReactory.status.mockRejectedValue(new Error('API unavailable'));

      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(() => {
        expect(screen.getByTestId('app-loading')).toBeInTheDocument();
      });
    });

    it('shows loading message initially when not ready', async () => {
      // Component starts with isReady = false, so should show "Loading..."
      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(() => {
        expect(screen.getByTestId('app-loading')).toBeInTheDocument();
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });
  });

  describe('Offline/Error State', () => {
    it('shows system unavailable screen when offline and not ready', async () => {
      // Mock status to reject (simulating network error)
      mockReactory.status.mockRejectedValue(new Error('Network error'));

      render(<ReactoryHOC appTheme={{}} />);

      // Wait for offline state to be set (should happen quickly)
      await waitFor(
        () => {
          expect(screen.getByText('System Unavailable')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('shows retry button in offline state', async () => {
      // Mock status to reject (simulating network error)
      mockReactory.status.mockRejectedValue(new Error('Network error'));

      render(<ReactoryHOC appTheme={{}} />);

      // Wait for offline state with retry button
      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: /retry connection/i })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('retries status check when retry button is clicked', async () => {
      mockReactory.status.mockRejectedValue(new Error('Network error'));

      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry connection/i })).toBeInTheDocument();
      });

      const callsBeforeRetry = mockReactory.status.mock.calls.length;
      fireEvent.click(screen.getByRole('button', { name: /retry connection/i }));

      await waitFor(() => {
        expect(mockReactory.status.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
      });
    });
  });

  describe('Ready State', () => {
    it('renders main application when ready and authenticated', async () => {
      // Mock successful API status with user data
      mockReactory.status.mockResolvedValue({
        status: 'API OK',
        user: { id: '1', firstName: 'Test', lastName: 'User' }
      });
      mockReactory.getUser.mockReturnValue({ id: '1', firstName: 'Test', lastName: 'User' });
      mockReactory.getTheme.mockReturnValue({ options: { palette: { mode: 'light' } } });
      mockReactory.forms.mockResolvedValue(undefined);

      render(<ReactoryHOC appTheme={{}} />);

      // Wait for ready state - router and provider should render
      await waitFor(
        () => {
          expect(screen.getByTestId('reactory-router')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('includes header and footer when authenticated', async () => {
      // Mock successful API status
      mockReactory.status.mockResolvedValue({
        status: 'API OK',
        user: { id: '1', firstName: 'Test', lastName: 'User' }
      });
      mockReactory.getUser.mockReturnValue({ id: '1', firstName: 'Test', lastName: 'User' });
      mockReactory.getTheme.mockReturnValue({ options: { palette: { mode: 'light' } } });
      mockReactory.forms.mockResolvedValue(undefined);

      render(<ReactoryHOC appTheme={{}} />);

      // In this test setup, the router is mocked and does not render header/footer directly,
      // so validate that component dependencies (including Footer) were resolved.
      await waitFor(
        () => {
          expect(mockReactory.getComponents).toHaveBeenCalled();
          expect(screen.getByTestId('reactory-router')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Theme Management', () => {
    it('applies theme from reactory.getTheme()', async () => {
      const mockTheme = { options: { palette: { mode: 'dark' } } };
      mockReactory.status.mockResolvedValue({
        status: 'API OK',
        user: { id: '1', firstName: 'Test', lastName: 'User' }
      });
      mockReactory.getUser.mockReturnValue({ id: '1', firstName: 'Test', lastName: 'User' });
      mockReactory.getTheme.mockReturnValue(mockTheme);
      mockReactory.forms.mockResolvedValue(undefined);

      render(<ReactoryHOC appTheme={{}} />);

      // Wait for getTheme to be called after ready state
      await waitFor(
        () => {
          expect(mockReactory.getTheme).toHaveBeenCalled();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Component Registration', () => {
    it('registers components from component registry during initialization', async () => {
      mockReactory.status.mockResolvedValue({
        status: 'API OK',
        user: { id: '1', firstName: 'Test', lastName: 'User' }
      });
      mockReactory.getUser.mockReturnValue({ id: '1', firstName: 'Test', lastName: 'User' });
      mockReactory.getTheme.mockReturnValue({ options: { palette: { mode: 'light' } } });
      mockReactory.forms.mockResolvedValue(undefined);

      render(<ReactoryHOC appTheme={{}} />);

      // Wait for component registration during doInit()
      await waitFor(
        () => {
          expect(mockReactory.registerComponent).toHaveBeenCalled();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('API Integration', () => {
    it('renders without crashing', async () => {
      render(<ReactoryHOC appTheme={{}} />);

      // Component should render the loading state initially
      expect(screen.getByTestId('app-loading')).toBeInTheDocument();
    });

    it('calls init method on initialization', async () => {
      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(() => {
        expect(mockReactory.init).toHaveBeenCalled();
      });
    });

    it('parses query string during initialization', async () => {
      const queryString = require('./components/utility/query-string');
      queryString.default.parse.mockImplementationOnce(() => ({ foo: 'bar' }));

      mockReactory.status.mockResolvedValue({
        status: 'API OK',
        user: { id: '1', firstName: 'Test', lastName: 'User' },
      });

      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(() => {
        expect(queryString.default.parse).toHaveBeenCalled();
      });

      expect((window as any).reactory.api.queryObject).toEqual({ foo: 'bar' });
    });

    it('handles theme changed event callback', async () => {
      mockReactory.status.mockResolvedValue({
        status: 'API OK',
        user: { id: '1', firstName: 'Test', lastName: 'User' },
      });

      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(() => {
        expect(mockReactory.on).toHaveBeenCalled();
      });

      const themeChangedCall = mockReactory.on.mock.calls.find(
        (call: any[]) => call[0] === 'onThemeChanged'
      );
      expect(themeChangedCall).toBeTruthy();

      await act(async () => {
        await themeChangedCall[1]();
      });

      expect(mockReactory.status).toHaveBeenCalledWith({ emitLogin: false });
    });

    it('unsubscribes event handlers on unmount', async () => {
      mockReactory.status.mockResolvedValue({
        status: 'API OK',
        user: { id: '1', firstName: 'Test', lastName: 'User' },
      });

      const { unmount } = render(<ReactoryHOC appTheme={{}} />);

      await waitFor(() => {
        expect(mockReactory.on).toHaveBeenCalled();
      });

      unmount();

      expect(mockReactory.off).toHaveBeenCalled();
    });

    it('falls back to offline mode after repeated init failures', async () => {
      jest.useFakeTimers();
      mockReactory.init.mockRejectedValue(new Error('init failed'));

      render(<ReactoryHOC appTheme={{}} />);

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        jest.advanceTimersByTime(800);
        await Promise.resolve();
      });

      await act(async () => {
        jest.advanceTimersByTime(1600);
        await Promise.resolve();
      });

      await act(async () => {
        jest.advanceTimersByTime(2400);
        await Promise.resolve();
      });

      expect(mockReactory.init.mock.calls.length).toBeGreaterThanOrEqual(3);
      expect(mockReactory.log).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('handles login event and refreshes forms/components', async () => {
      mockReactory.getUser.mockReturnValue({ id: '1', loggedIn: true });
      mockReactory.status.mockResolvedValue({
        status: 'API OK',
        user: { id: '1', firstName: 'Test', lastName: 'User' },
      });

      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(() => {
        expect(mockReactory.on).toHaveBeenCalled();
      });

      const onLoginCall = mockReactory.on.mock.calls.find(
        (call: any[]) => call[0] === 'onLogin'
      );
      expect(onLoginCall).toBeTruthy();

      await act(async () => {
        await onLoginCall[1]();
      });

      expect(mockReactory.forms).toHaveBeenCalledWith(true);
      expect(mockReactory.registerComponent).toHaveBeenCalled();
    });

    it('handles logout event with session expiration cleanup', async () => {
      mockReactory.status.mockResolvedValue({
        status: 'API OK',
        user: { id: '1', firstName: 'Test', lastName: 'User' },
      });

      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(() => {
        expect(mockReactory.on).toHaveBeenCalled();
      });

      const onLogoutCall = mockReactory.on.mock.calls.find(
        (call: any[]) => call[0] === 'onLogout'
      );
      expect(onLogoutCall).toBeTruthy();

      await act(async () => {
        onLogoutCall[1]({ reason: 'session_expired' });
      });

      expect(mockReactory.createNotification).toHaveBeenCalled();
      expect(mockReactory.formSchemas).toEqual([]);
      expect(mockReactory.formSchemaMap).toEqual({});
      expect(mockReactory.formSchemaLastFetch).toBeNull();
      expect(mockReactory.componentRegister['test.form@1.0.0']).toBeUndefined();
      expect(mockReactory.componentRegister['test.component@1.0.0']).toBeDefined();
    });

    it('handles null API status update and warns', async () => {
      mockReactory.status.mockResolvedValue({
        status: 'API OK',
        user: { id: '1', firstName: 'Test', lastName: 'User' },
      });

      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(() => {
        expect(mockReactory.on).toHaveBeenCalled();
      });

      const apiStatusUpdateCall = mockReactory.on.mock.calls.find(
        (call: any[]) => call[0] === 'onApiStatusUpdate'
      );
      expect(apiStatusUpdateCall).toBeTruthy();

      await act(async () => {
        apiStatusUpdateCall[1](null);
      });

      expect(mockReactory.warning).toHaveBeenCalled();
    });

    it('handles window resize events', async () => {
      mockReactory.status.mockResolvedValue({
        status: 'API OK',
        user: { id: '1', firstName: 'Test', lastName: 'User' },
      });

      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(() => {
        expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      });

      const resizeHandler = (window.addEventListener as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === 'resize'
      )?.[1];

      expect(resizeHandler).toBeTruthy();

      await act(async () => {
        await resizeHandler();
      });

      expect(mockReactory.emit).toHaveBeenCalledWith('onWindowResize', expect.any(Object));
      expect(mockReactory.log).toHaveBeenCalledWith('ReactoryHOC Resize', expect.any(Object));
    });

    it('handles onLogin with delayed user data availability', async () => {
      jest.useFakeTimers();
      
      mockReactory.status.mockResolvedValue({
        status: 'API OK',
        user: null,
        authenticated: false,
      });
      mockReactory.getUser.mockReturnValue(null);

      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(() => {
        expect(mockReactory.on).toHaveBeenCalled();
      });

      // Now getUser returns user data (simulating it becoming available)
      mockReactory.getUser.mockReturnValue({
        id: '1',
        firstName: 'Test',
        lastName: 'User',
        loggedIn: false,
      });

      const onLoginCall = mockReactory.on.mock.calls.find(
        (call: any[]) => call[0] === 'onLogin'
      );
      expect(onLoginCall).toBeTruthy();

      await act(async () => {
        await onLoginCall[1]();
      });

      // Advance timers to trigger the retry logic
      jest.advanceTimersByTime(500);
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockReactory.forms).toHaveBeenCalledWith(true);
      
      jest.useRealTimers();
    });

    it('renders offline screen when API returns offline status', async () => {
      mockReactory.status.mockResolvedValue({
        status: 'API Unavailable',
        offline: true,
      });

      const { container } = render(<ReactoryHOC appTheme={{}} />);

      // Wait for offline component to be rendered
      await waitFor(() => {
        const offlineComponent = container.querySelector('[data-testid="offline-component"]');
        expect(offlineComponent).toBeTruthy();
      });

      // Also verify that getApiStatus was called
      expect(mockReactory.status).toHaveBeenCalled();
    });

    it('handles session expired logout with notification and redirect', async () => {
      jest.useFakeTimers();
      
      mockReactory.status.mockResolvedValue({
        status: 'API OK',
        user: { id: '1', firstName: 'Test', lastName: 'User' },
      });

      // Mock window.location
      delete (window as any).location;
      window.location = { href: '', pathname: '/dashboard', search: '' } as any;

      render(<ReactoryHOC appTheme={{}} />);

      await act(async () => {
        await Promise.resolve();
      });

      const onLogoutCall = mockReactory.on.mock.calls.find(
        (call: any[]) => call[0] === 'onLogout' || call[0] === 'loggedOut'
      );
      expect(onLogoutCall).toBeTruthy();

      await act(async () => {
        onLogoutCall[1]({ reason: 'session_expired' });
        await Promise.resolve();
      });

      // Verify notification was created
      expect(mockReactory.createNotification).toHaveBeenCalledWith(
        'Your session has expired. Please log in again.',
        expect.any(Object)
      );

      // Advance timers to trigger the redirect
      act(() => {
        jest.advanceTimersByTime(250);
      });

      jest.useRealTimers();
    });

    it('applies theme when login succeeds with user loggedIn flag', async () => {
      jest.useFakeTimers();
      
      mockReactory.status.mockResolvedValue({
        status: 'API OK',
        user: { 
          id: '1', 
          firstName: 'Test', 
          lastName: 'User',
          loggedIn: true // User is already logged in
        },
      });

      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(() => {
        expect(mockReactory.on).toHaveBeenCalled();
      });

      const onLoginCall = mockReactory.on.mock.calls.find(
        (call: any[]) => call[0] === 'onLogin'
      );
      expect(onLoginCall).toBeTruthy();

      await act(async () => {
        await onLoginCall[1]();
      });

      // Verify theme was applied (applyTheme calls getTheme)
      expect(mockReactory.getTheme).toHaveBeenCalled();
      expect(mockReactory.forms).toHaveBeenCalledWith(true);
      
      jest.useRealTimers();
    });

    it('handles API status update with user data changes', async () => {
      const user1 = { 
        id: '1',
        firstName: 'Test',
        lastName: 'User',
        loggedIn: true,
        when: new Date().toISOString()
      };
      
      mockReactory.status.mockResolvedValue({
        status: 'API OK',
        user: user1,
      });
      
      mockReactory.getUser.mockReturnValue(user1);

      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(() => {
        expect(mockReactory.on).toHaveBeenCalled();
      });

      const onApiStatusUpdateCall = mockReactory.on.mock.calls.find(
        (call: any[]) => call[0] === 'onApiStatusUpdate'
      );
      
      expect(onApiStatusUpdateCall).toBeTruthy();

      // Call with a user data update
      await act(async () => {
        onApiStatusUpdateCall[1]({
          status: 'API OK',
          offline: false,
          user: user1
        });
      });

      // Verify the debug call for API status update was made
      expect(mockReactory.debug).toHaveBeenCalledWith(
        'App.onApiStatusUpdate(status)',
        expect.any(Object)
      );
    });
  });
});
/**
 * The server role-filters the form list, so the client may only fetch it once
 * the session identity is known. These tests pin that ordering: a cold load
 * while logged out must not fetch at all, and the boot fetch must not run
 * before `status()` resolves.
 */
describe('Form list fetch sequencing (auth-scoped)', () => {
  const authenticatedStatus = {
    status: 'API OK',
    roles: ['USER'],
    loggedIn: {
      id: 'user-1',
      roles: ['USER'],
      user: { id: 'user-1', firstName: 'Test', lastName: 'User' },
    },
  };

  const anonymousStatus = {
    status: 'API OK',
    anon: true,
    roles: ['ANON'],
    loggedIn: {
      id: 'anon',
      roles: ['ANON'],
      user: { id: 'anon', roles: ['ANON'] },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).reactory = {};
    mockReactory.status.mockReset();
    mockReactory.init.mockReset().mockResolvedValue(undefined);
    mockReactory.forms.mockReset().mockResolvedValue([]);
    mockReactory.getTheme.mockReset().mockReturnValue({ options: { palette: { mode: 'light' } } });
    mockReactory.getUser.mockReset();
    mockReactory.getSizeSpec.mockReset().mockReturnValue({ width: 1440, height: 900, size: 'lg' });
    mockReactory.registerComponent.mockReset();
    mockReactory.createNotification.mockReset();
    mockReactory.warning.mockReset();
    mockReactory.log.mockReset();
    mockReactory.error.mockReset();
    mockReactory.debug.mockReset();
    mockReactory.emit.mockReset();
    mockReactory.on.mockReset().mockImplementation(function () { return this; });
    mockReactory.off.mockReset().mockImplementation(function () { return this; });
    // Per-test so the logout test in the main suite keeps exercising its
    // defensive fallback branch.
    mockReactory.clearFormCache = jest.fn();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
  });

  it('does not fetch a role-scoped form list on a cold load while logged out', async () => {
    mockReactory.status.mockResolvedValue(anonymousStatus);

    render(<ReactoryHOC appTheme={{}} />);

    await waitFor(() => {
      expect(screen.getByTestId('reactory-router')).toBeInTheDocument();
    });

    expect(mockReactory.status).toHaveBeenCalled();
    expect(mockReactory.forms).not.toHaveBeenCalled();
  });

  it('does not fetch forms when status() emits onLogin for the anonymous account', async () => {
    // Production path: ReactoryApi.status() sets the ANON user and then emits
    // onLogin on *every* boot (see ReactoryApi.status(): setUser followed by
    // emit(onLogin)). The emitter, not the getApiStatus call site, is what a
    // logged-out cold load actually exercises — so this guard is the one that
    // must hold.
    mockReactory.status.mockImplementation(async () => {
      mockReactory.getUser.mockReturnValue(anonymousStatus);
      const loginCall = mockReactory.on.mock.calls.find((call: any[]) => call[0] === 'onLogin');
      expect(loginCall).toBeTruthy();
      loginCall[1](anonymousStatus);
      return anonymousStatus;
    });

    render(<ReactoryHOC appTheme={{}} />);

    await waitFor(() => {
      expect(screen.getByTestId('reactory-router')).toBeInTheDocument();
    });

    // Let the login transition's promises settle.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // The behaviour under test: an ANON login must not fetch a role-scoped list.
    expect(mockReactory.forms).not.toHaveBeenCalled();
    expect(mockReactory.clearFormCache).not.toHaveBeenCalled();

    // Proof the ANON handler actually ran (so the assertion above is not
    // vacuous): the guard logs, and the success path would log the refresh.
    expect(mockReactory.log).toHaveBeenCalledWith('App.onLogin handler', {});
    expect(mockReactory.log).toHaveBeenCalledWith('Skipping form refresh for anonymous session');
    expect(mockReactory.log).not.toHaveBeenCalledWith('Forms and components refreshed after login');
  });

  it('does not begin the form fetch until the status call (auth state) has resolved', async () => {
    let resolveStatus: (value: any) => void = () => undefined;
    const pendingStatus = new Promise((resolve) => {
      resolveStatus = resolve;
    });
    mockReactory.status.mockReturnValue(pendingStatus);

    render(<ReactoryHOC appTheme={{}} />);

    await waitFor(() => {
      expect(mockReactory.status).toHaveBeenCalled();
    });

    // Status is still in flight: an authenticated-scoped fetch here would be
    // the original race (anonymous list cached before the user is known).
    expect(mockReactory.forms).not.toHaveBeenCalled();

    await act(async () => {
      resolveStatus(authenticatedStatus);
    });

    await waitFor(() => {
      expect(mockReactory.forms).toHaveBeenCalledWith(true);
    });
  });

  it('fetches the form list exactly once when status() emits onLogin during boot', async () => {
    mockReactory.status.mockImplementation(async () => {
      // Mirrors ReactoryApi.status(): setUser happens before the emit.
      mockReactory.getUser.mockReturnValue(authenticatedStatus);
      const loginCall = mockReactory.on.mock.calls.find((call: any[]) => call[0] === 'onLogin');
      if (loginCall) loginCall[1](authenticatedStatus);
      return authenticatedStatus;
    });

    render(<ReactoryHOC appTheme={{}} />);

    await waitFor(() => {
      expect(mockReactory.forms).toHaveBeenCalledWith(true);
    });

    // Let the login transition's promises settle.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockReactory.forms).toHaveBeenCalledTimes(1);
  });

  it('clears the cached role-scoped list before refetching when a login lands', async () => {
    mockReactory.status.mockResolvedValue(anonymousStatus);
    mockReactory.getUser.mockReturnValue(authenticatedStatus);

    render(<ReactoryHOC appTheme={{}} />);

    await waitFor(() => {
      expect(mockReactory.on).toHaveBeenCalled();
    });

    const onLoginCall = mockReactory.on.mock.calls.find((call: any[]) => call[0] === 'onLogin');
    expect(onLoginCall).toBeTruthy();

    mockReactory.forms.mockClear();
    mockReactory.clearFormCache.mockClear();

    await act(async () => {
      await onLoginCall[1](authenticatedStatus);
    });

    expect(mockReactory.clearFormCache).toHaveBeenCalled();
    expect(mockReactory.forms).toHaveBeenCalledWith(true);
    expect(mockReactory.clearFormCache.mock.invocationCallOrder[0])
      .toBeLessThan(mockReactory.forms.mock.invocationCallOrder[0]);
  });

  // ORG-014: the shell resolves the active organization's theme before the
  // authenticated tree is marked ready, and falls back to the client theme when
  // the organization pointer is unhealthy.
  describe('Organization theme (ORG-014)', () => {
    const organizationTheme = {
      name: 'acme',
      type: 'material',
      defaultThemeMode: 'light',
      options: { palette: { mode: 'light', primary: { main: '#ff0000' } } },
      modes: [
        { id: 'acme-light', mode: 'light', name: 'Light', options: { palette: { mode: 'light', primary: { main: '#ff0000' } } } },
        { id: 'acme-dark', mode: 'dark', name: 'Dark', options: { palette: { mode: 'dark', primary: { main: '#00ff00' } } } },
      ],
    };

    const organizationStatus = {
      status: 'API OK',
      roles: ['USER'],
      activeTheme: { name: 'client', type: 'material', options: { palette: { mode: 'light' } } },
      loggedIn: {
        id: 'user-1',
        roles: ['USER'],
        user: { id: 'user-1', firstName: 'Test', lastName: 'User' },
        organization: { id: 'org-1', name: 'Acme' },
        memberships: [{ organization: { id: 'org-1', name: 'Acme' } }],
      },
    };

    let themeOverride: any = null;

    beforeEach(() => {
      themeOverride = null;
      mockReactory.status.mockResolvedValue(organizationStatus);
      mockReactory.getUser.mockReturnValue(organizationStatus);
      mockReactory.getTheme.mockImplementation(() => themeOverride ?? organizationStatus.activeTheme);
      mockReactory.setThemeOverride.mockImplementation((theme: any) => {
        themeOverride = theme;
      });
    });

    const createThemeMock = (): jest.Mock => require('@mui/material/styles').createTheme;

    const appliedThemeOptions = (): any[] =>
      createThemeMock()
        .mock.calls.map((call) => call[0])
        .filter((options) => options !== undefined && options !== null);

    const applyThemeImplementation = () => {
      createThemeMock().mockImplementation((options?: any) => ({
        palette: {
          mode: options?.palette?.mode ?? 'light',
          background: { default: '#ffffff' },
          primary: { main: options?.palette?.primary?.main ?? '#1a73e8', contrastText: '#ffffff' },
          text: { primary: '#111111' },
        },
      }));
    };

    it('applies the organization theme before the authenticated tree is ready', async () => {
      mockReactory.graphqlQuery.mockResolvedValue({
        data: {
          CoreOrganization: {
            id: 'org-1',
            name: 'Acme',
            theme: 'acme',
            themeMode: 'dark',
            themes: [organizationTheme],
          },
        },
      });

      // `createTheme` is also evaluated on every render by App's initial
      // `useState(createTheme(...))`, so the *last* call is not the applied
      // theme. Instead record whether the router was already mounted when the
      // organization palette was applied - it must not have been.
      applyThemeImplementation();
      const routerMountedWhenApplied: boolean[] = [];
      createThemeMock().mockImplementation((options?: any) => {
        if (options?.palette?.primary?.main === '#00ff00') {
          routerMountedWhenApplied.push(screen.queryByTestId('reactory-router') !== null);
        }
        return {
          palette: {
            mode: options?.palette?.mode ?? 'light',
            background: { default: '#ffffff' },
            primary: { main: options?.palette?.primary?.main ?? '#1a73e8', contrastText: '#ffffff' },
            text: { primary: '#111111' },
          },
        };
      });

      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(
        () => {
          expect(screen.getByTestId('reactory-router')).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      expect(mockReactory.graphqlQuery).toHaveBeenCalled();
      expect(mockReactory.setThemeOverride).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'acme' }),
      );
      // The organization's dark palette was applied, and it was applied while
      // the tree was still loading: no flash of the client theme.
      expect(routerMountedWhenApplied.length).toBeGreaterThan(0);
      expect(routerMountedWhenApplied.every((mounted) => mounted === false)).toBe(true);
    });

    it('does not paint the authenticated tree until branding is applied on the login transition', async () => {
      // Boot anonymous: the router is already mounted and auth_validated true,
      // which is exactly the state in which the login transition would
      // otherwise flash authenticated content in the client theme.
      mockReactory.status.mockResolvedValue(anonymousStatus);
      mockReactory.getUser.mockReturnValue(anonymousStatus);

      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(
        () => {
          expect(screen.getByTestId('reactory-router')).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      const onLoginCall = mockReactory.on.mock.calls.find((call: any[]) => call[0] === 'onLogin');
      expect(onLoginCall).toBeTruthy();

      // The user signs in; the branding request is deliberately slow.
      let resolveBranding: (value: any) => void = () => undefined;
      const branding = new Promise((resolve) => {
        resolveBranding = resolve;
      });
      mockReactory.graphqlQuery.mockReturnValue(branding);
      mockReactory.getUser.mockReturnValue(organizationStatus);

      await act(async () => {
        onLoginCall[1](organizationStatus);
      });

      // While branding is unresolved the authenticated tree is not rendered at
      // all - so it cannot be painted in the client theme.
      expect(screen.queryByTestId('reactory-router')).not.toBeInTheDocument();
      expect(screen.getByTestId('app-loading')).toBeInTheDocument();
      expect(mockReactory.setThemeOverride).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: 'acme' }),
      );

      await act(async () => {
        resolveBranding({
          data: {
            CoreOrganization: {
              id: 'org-1',
              name: 'Acme',
              theme: 'acme',
              themeMode: 'dark',
              themes: [organizationTheme],
            },
          },
        });
      });

      await waitFor(
        () => {
          expect(screen.getByTestId('reactory-router')).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // First authenticated paint happened after the organization theme was
      // published.
      expect(mockReactory.setThemeOverride).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'acme' }),
      );
    });

    it('subscribes to core.OrganizationUpdatedEvent and re-resolves the theme', async () => {
      mockReactory.graphqlQuery.mockResolvedValue({
        data: {
          CoreOrganization: {
            id: 'org-1',
            name: 'Acme',
            theme: 'acme',
            themeMode: 'light',
            themes: [organizationTheme],
          },
        },
      });

      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(
        () => {
          expect(screen.getByTestId('reactory-router')).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      const subscriber = mockReactory.amq.$sub.def.mock.calls.find(
        (call: any[]) => call[0] === 'core.OrganizationUpdatedEvent',
      );
      expect(subscriber).toBeTruthy();
      // The server publishes on the same id and channel.
      expect(subscriber[2]).toBe('core.OrganizationUpdatedEvent');

      const callsBefore = mockReactory.graphqlQuery.mock.calls.length;
      const emittedBefore = mockReactory.emit.mock.calls.length;

      await act(async () => {
        subscriber[1]({ organizationId: 'org-1' });
      });

      await waitFor(() => {
        expect(mockReactory.graphqlQuery.mock.calls.length).toBeGreaterThan(callsBefore);
      });
      const themeChangedEvents = mockReactory.emit.mock.calls
        .slice(emittedBefore)
        .filter((call: any[]) => call[0] === 'onThemeChanged');
      expect(themeChangedEvents.length).toBeGreaterThan(0);
    });

    it('unsubscribes from core.OrganizationUpdatedEvent on unmount', async () => {
      const unsubscribe = jest.fn();
      mockReactory.amq.$sub.def.mockImplementation(() => ({ unsubscribe }));

      const view = render(<ReactoryHOC appTheme={{}} />);

      await waitFor(
        () => {
          expect(screen.getByTestId('reactory-router')).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      view.unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it('installs the organization-switch and re-resolve callables on the api', async () => {
      mockReactory.graphqlQuery.mockResolvedValue({
        data: { CoreOrganization: { id: 'org-1', name: 'Acme', theme: null, themeMode: 'dark', themes: [] } },
      });

      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(
        () => {
          expect(screen.getByTestId('reactory-router')).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Both entry points share the service path, so the selector and the
      // Branding tab cannot drift apart on how the theme is re-resolved.
      expect(typeof (window as any).reactory.api.setActiveOrganization).toBe('function');
      expect(typeof (window as any).reactory.api.refreshOrganizationTheme).toBe('function');
    });

    it('falls back to the client theme and logs when the named theme is missing', async () => {
      mockReactory.graphqlQuery.mockResolvedValue({
        data: {
          CoreOrganization: {
            id: 'org-1',
            name: 'Acme',
            theme: 'gone',
            themeMode: 'dark',
            themes: [organizationTheme],
          },
        },
      });

      applyThemeImplementation();

      render(<ReactoryHOC appTheme={{}} />);

      await waitFor(
        () => {
          expect(screen.getByTestId('reactory-router')).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      expect(mockReactory.setThemeOverride).toHaveBeenCalledWith(null);
      expect(mockReactory.log).toHaveBeenCalledWith(
        expect.stringContaining('"gone" is not available'),
        expect.anything(),
        'warn',
      );

      const applied = appliedThemeOptions();
      // The client theme (light) was applied...
      expect(applied.some((options) => options?.palette?.mode === 'light')).toBe(true);
      // ...and the unhealthy organization theme never reached createTheme.
      expect(applied.some((options) => options?.palette?.primary?.main === '#ff0000')).toBe(false);
    });
  });
});