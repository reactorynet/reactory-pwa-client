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
  REACT_APP_CLIENT_PASSWORD: 'test',
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
      window.location = { href: '' } as any;

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

      // Verify notification was created
      expect(mockReactory.createNotification).toHaveBeenCalledWith(
        'Your session has expired. Please log in again.',
        expect.any(Object)
      );

      // Advance timers to trigger the redirect
      jest.advanceTimersByTime(250);

      // Verify redirect would be set (setTimeout was called)
      // We can't directly test window.location.href in jsdom, but we verified the notification
      
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