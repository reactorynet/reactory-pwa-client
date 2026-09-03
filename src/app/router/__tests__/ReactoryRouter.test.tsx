import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, screen, waitFor } from '@testing-library/react';
import { ReactoryContext } from '@reactory/client-core/api/ApiProvider';
import ReactoryRouter from '../ReactoryRouter';
import {
  createMockReactory,
  protectedHomeRoute,
  publicLoginRoute,
  renderWithRouter,
} from './testUtils';

const Login = () => <div data-testid="login-page">login</div>;
const Home = () => <div data-testid="home-page">home</div>;
const About = () => <div data-testid="about-page">about</div>;

const renderRouter = (
  reactory: any,
  path: string,
  props: Partial<React.ComponentProps<typeof ReactoryRouter>> = {},
) => renderWithRouter(
  <ReactoryRouter
    reactory={reactory}
    auth_validated={true}
    authenticating={false}
    user={reactory.getUser()}
    header={null}
    footer={null}
    {...props}
  />,
  reactory,
  [path],
);

describe('ReactoryRouter', () => {
  it('renders a public login route while authenticating', async () => {
    const reactory = createMockReactory({
      routes: [publicLoginRoute(), protectedHomeRoute()],
      components: { 'core.Login@1.0.0': Login, 'core.Home@1.0.0': Home },
      isAnon: true,
      roles: ['ANON'],
    });

    renderRouter(reactory, '/login', { auth_validated: false, authenticating: true });
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeTruthy();
    });
  });

  it('does not hard-navigate when a catalog redirect is not the matched route', async () => {
    const hrefSetter = jest.fn();
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '', pathname: '/about', search: '' },
    });
    Object.defineProperty(window.location, 'href', {
      configurable: true,
      set: hrefSetter,
      get: () => '',
    });

    const reactory = createMockReactory({
      routes: [
        {
          id: 'redirect',
          path: '/legacy',
          public: true,
          roles: ['ANON'],
          componentFqn: 'core.Home@1.0.0',
          redirect: '/somewhere-else',
        },
        {
          id: 'about',
          path: '/about',
          public: true,
          roles: ['ANON'],
          componentFqn: 'core.About@1.0.0',
        },
      ],
      components: { 'core.About@1.0.0': About, 'core.Home@1.0.0': Home },
      isAnon: true,
      roles: ['ANON'],
    });

    renderRouter(reactory, '/about');
    await waitFor(() => {
      expect(screen.getByTestId('about-page')).toBeTruthy();
    });
    expect(hrefSetter).not.toHaveBeenCalled();
    if (originalDescriptor) {
      Object.defineProperty(window, 'location', originalDescriptor);
    }
  });

  it('redirects an anonymous user from a protected matched route to login', async () => {
    const reactory = createMockReactory({
      routes: [publicLoginRoute(), protectedHomeRoute()],
      components: { 'core.Login@1.0.0': Login, 'core.Home@1.0.0': Home },
      isAnon: true,
      roles: ['ANON'],
    });

    renderRouter(reactory, '/');
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeTruthy();
    });
  });

  it('shows forbidden when the authenticated user lacks roles', async () => {
    const reactory = createMockReactory({
      routes: [protectedHomeRoute()],
      components: { 'core.Home@1.0.0': Home },
      isAnon: false,
      roles: ['GUEST'],
    });
    reactory.hasRole.mockReturnValue(false);

    renderRouter(reactory, '/');
    await waitFor(() => {
      expect(screen.getByTestId('route-failure').textContent).toMatch(/sufficient permissions/i);
    });
  });

  it('shows a failure panel when the catalog is empty', async () => {
    const reactory = createMockReactory({
      routes: [],
      isDevelopmentMode: true,
    });

    renderRouter(reactory, '/', { authenticating: false, auth_validated: true });
    await waitFor(() => {
      expect(screen.getByTestId('route-failure').textContent).toMatch(/did not return any routes/i);
    });
    expect(screen.getByTestId('route-inspector-toggle')).toBeTruthy();
  });

  it('does not hang forever when a route FQN is missing', async () => {
    jest.useFakeTimers();
    const reactory = createMockReactory({
      routes: [{
        id: 'missing',
        path: '/missing',
        public: true,
        roles: ['ANON'],
        componentFqn: 'core.DoesNotExist@1.0.0',
      }],
      components: {},
      isAnon: true,
      roles: ['ANON'],
      isDevelopmentMode: true,
    });

    renderRouter(reactory, '/missing');
    expect(screen.getByTestId('route-resolving')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByTestId('route-inspector-toggle')).toBeTruthy();
    });
    jest.useRealTimers();
  });

  it('uses a static catch-all when core.NotFound is missing', async () => {
    const reactory = createMockReactory({
      routes: [publicLoginRoute()],
      components: { 'core.Login@1.0.0': Login },
      isAnon: true,
      roles: ['ANON'],
    });

    renderRouter(reactory, '/no-such-page');
    await waitFor(() => {
      expect(screen.getByTestId('route-failure').textContent).toMatch(/No route matched/i);
    });
  });

  it('navigates when the matched route has a redirect', async () => {
    const Target = () => <div data-testid="target-page">target</div>;
    const reactory = createMockReactory({
      routes: [
        {
          id: 'legacy',
          path: '/legacy',
          public: true,
          roles: ['ANON'],
          componentFqn: 'core.Home@1.0.0',
          redirect: '/target',
        },
        {
          id: 'target',
          path: '/target',
          public: true,
          roles: ['ANON'],
          componentFqn: 'core.Target@1.0.0',
        },
      ],
      components: { 'core.Target@1.0.0': Target, 'core.Home@1.0.0': Home },
      isAnon: true,
      roles: ['ANON'],
    });

    renderRouter(reactory, '/legacy');
    await waitFor(() => {
      expect(screen.getByTestId('target-page')).toBeTruthy();
    });
  });

  it('renders a default header and footer slot when provided', async () => {
    const reactory = createMockReactory({
      routes: [{
        id: 'about',
        path: '/about',
        public: true,
        roles: ['ANON'],
        componentFqn: 'core.About@1.0.0',
        header: { show: true, componentFqn: 'core.MissingHeader@1.0.0' },
        footer: { show: true, componentFqn: 'core.MissingFooter@1.0.0' },
      }],
      components: { 'core.About@1.0.0': About },
      isAnon: true,
      roles: ['ANON'],
    });

    renderWithRouter(
      <ReactoryRouter
        reactory={reactory}
        auth_validated={true}
        authenticating={false}
        user={reactory.getUser()}
        header={<div data-testid="default-header">H</div>}
        footer={<div data-testid="default-footer">F</div>}
      />,
      reactory,
      ['/about'],
    );

    await waitFor(() => {
      expect(screen.getByTestId('about-page')).toBeTruthy();
    });
    expect(screen.getByTestId('default-header')).toBeTruthy();
    expect(screen.getByTestId('default-footer')).toBeTruthy();
    expect(screen.getByTestId('about-page').getAttribute('style')).toBeNull();
  });

  it('swaps the anonymous catalog for the authenticated home after login', async () => {
    const guestHome: Reactory.Routing.IReactoryRoute = {
      id: 'home_guest',
      key: 'home_guest',
      path: '/',
      public: true,
      roles: ['ANON'],
      componentFqn: 'core.StaticContent@1.0.0',
    };
    const Guest = () => <div data-testid="guest-home">guest</div>;
    let routes: Reactory.Routing.IReactoryRoute[] = [publicLoginRoute(), guestHome];
    const reactory = createMockReactory({
      routes,
      components: {
        'core.Login@1.0.0': Login,
        'core.Home@1.0.0': Home,
        'core.StaticContent@1.0.0': Guest,
      },
      isAnon: true,
      roles: ['ANON'],
    });
    reactory.getRoutes.mockImplementation(() => routes);

    const view = renderRouter(reactory, '/login', { authenticating: false, auth_validated: true });
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeTruthy();
    });

    routes = [protectedHomeRoute()];
    reactory.isAnon.mockReturnValue(false);
    reactory.getUser.mockReturnValue({
      id: 'user-1',
      email: 'user@example.com',
      anon: false,
      loggedIn: { roles: ['USER'] },
      roles: ['USER'],
      routes,
    });
    reactory.hasRole.mockImplementation((required: string[] = [], userRoles?: string[]) => {
      const compared = userRoles || ['USER'];
      return required.some((role) => compared.includes(role));
    });

    view.rerender(
      <ReactoryContext.Provider value={reactory}>
        <MemoryRouter initialEntries={['/']}>
          <ReactoryRouter
            reactory={reactory}
            auth_validated={true}
            authenticating={false}
            user={reactory.getUser()}
            header={null}
            footer={null}
          />
        </MemoryRouter>
      </ReactoryContext.Provider>,
    );
    act(() => {
      reactory.emit('loggedIn', reactory.getUser());
    });

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeTruthy();
    });
    expect(screen.queryByTestId('login-page')).toBeNull();
  });

  it('swaps authenticated routes for anonymous catalog and redirects on logout', async () => {
    const guestHome: Reactory.Routing.IReactoryRoute = {
      id: 'home_guest',
      key: 'home_guest',
      path: '/',
      public: true,
      roles: ['ANON'],
      componentFqn: 'core.StaticContent@1.0.0',
    };
    const Guest = () => <div data-testid="guest-home">guest</div>;
    let routes: Reactory.Routing.IReactoryRoute[] = [protectedHomeRoute()];
    const reactory = createMockReactory({
      routes,
      components: {
        'core.Login@1.0.0': Login,
        'core.Home@1.0.0': Home,
        'core.StaticContent@1.0.0': Guest,
      },
      isAnon: false,
      roles: ['USER'],
    });
    reactory.getRoutes.mockImplementation(() => routes);

    const view = renderRouter(reactory, '/', { authenticating: false, auth_validated: true });
    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeTruthy();
    });

    routes = [publicLoginRoute(), guestHome];
    reactory.isAnon.mockReturnValue(true);
    reactory.getUser.mockReturnValue({
      routes,
      anon: true,
      roles: ['ANON'],
      loggedIn: null,
      plugins: [],
    });

    view.rerender(
      <ReactoryContext.Provider value={reactory}>
        <MemoryRouter initialEntries={['/']}>
          <ReactoryRouter
            reactory={reactory}
            auth_validated={true}
            authenticating={false}
            user={reactory.getUser()}
            header={null}
            footer={null}
          />
        </MemoryRouter>
      </ReactoryContext.Provider>,
    );
    act(() => {
      reactory.emit('loggedOut');
    });

    await waitFor(() => {
      expect(screen.getByTestId('guest-home')).toBeTruthy();
    });
    expect(screen.queryByTestId('home-page')).toBeNull();
  });
});
