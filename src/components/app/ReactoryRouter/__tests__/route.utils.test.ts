import React from 'react';
import {
  shouldRedirectAnonymousUser,
  hasRolesForRoute,
  buildRouteArgs,
  getHeaderConfig,
  haveRoutesChanged,
} from '../route.utils';

describe('route.utils', () => {
  describe('shouldRedirectAnonymousUser', () => {
    it('should return true for anonymous user on protected route', () => {
      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/dashboard',
        public: false,
      } as any;
      
      expect(shouldRedirectAnonymousUser(true, routeDef)).toBe(true);
    });

    it('should return false for anonymous user on public route', () => {
      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/home',
        public: true,
      } as any;
      
      expect(shouldRedirectAnonymousUser(true, routeDef)).toBe(false);
    });

    it('should return false for anonymous user on login route', () => {
      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/login',
        public: false,
      } as any;
      
      expect(shouldRedirectAnonymousUser(true, routeDef)).toBe(false);
    });

    it('should return false for authenticated user', () => {
      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/dashboard',
        public: false,
      } as any;
      
      expect(shouldRedirectAnonymousUser(false, routeDef)).toBe(false);
    });
  });

  describe('hasRolesForRoute', () => {
    const mockReactory = {
      getUser: jest.fn(),
      hasRole: jest.fn(),
    } as any;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return true when route has no role requirements', () => {
      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/home',
        roles: [],
      } as any;

      expect(hasRolesForRoute(mockReactory, routeDef)).toBe(true);
    });

    it('should return true when route has no roles property', () => {
      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/home',
      } as any;

      expect(hasRolesForRoute(mockReactory, routeDef)).toBe(true);
    });

    it('should return true when user has required roles', () => {
      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/admin',
        roles: ['ADMIN'],
      } as any;

      mockReactory.getUser.mockReturnValue({
        loggedIn: {
          roles: ['ADMIN', 'USER'],
        },
      });
      mockReactory.hasRole.mockReturnValue(true);

      expect(hasRolesForRoute(mockReactory, routeDef)).toBe(true);
      expect(mockReactory.hasRole).toHaveBeenCalledWith(['ADMIN'], ['ADMIN', 'USER']);
    });

    it('should return false when user lacks required roles', () => {
      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/admin',
        roles: ['ADMIN'],
      } as any;

      mockReactory.getUser.mockReturnValue({
        loggedIn: {
          roles: ['USER'],
        },
      });
      mockReactory.hasRole.mockReturnValue(false);

      expect(hasRolesForRoute(mockReactory, routeDef)).toBe(false);
    });

    it('should handle user with no roles', () => {
      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/admin',
        roles: ['ADMIN'],
      } as any;

      mockReactory.getUser.mockReturnValue({
        loggedIn: {},
      });
      mockReactory.hasRole.mockReturnValue(false);

      expect(hasRolesForRoute(mockReactory, routeDef)).toBe(false);
      expect(mockReactory.hasRole).toHaveBeenCalledWith(['ADMIN'], []);
    });
  });

  describe('buildRouteArgs', () => {
    it('should return empty object when route has no args', () => {
      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/home',
      } as any;

      expect(buildRouteArgs(routeDef)).toEqual({});
    });

    it('should return empty object when args is empty array', () => {
      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/home',
        args: [],
      } as any;

      expect(buildRouteArgs(routeDef)).toEqual({});
    });

    it('should build args from route definition', () => {
      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/user/:id',
        args: [
          {
            key: 'userId',
            value: { userId: '123' },
          },
          {
            key: 'tab',
            value: { tab: 'profile' },
          },
        ],
      } as any;

      const result = buildRouteArgs(routeDef);
      expect(result).toEqual({
        userId: '123',
        tab: 'profile',
      });
    });

    it('should handle args with non-array values', () => {
      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/home',
        args: null as any,
      } as any;

      expect(buildRouteArgs(routeDef)).toEqual({});
    });
  });

  describe('getHeaderConfig', () => {
    const mockReactory = {
      getComponent: jest.fn(),
    } as any;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return default config when no header defined', () => {
      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/home',
      } as any;

      const result = getHeaderConfig(routeDef, mockReactory);
      expect(result).toEqual({
        hasHeader: false,
        headerHeight: 48,
        headerComponent: null,
      });
    });

    it('should use default header when provided and no route header', () => {
      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/home',
      } as any;

      const defaultHeader = React.createElement('div', null, 'Default Header');
      const result = getHeaderConfig(routeDef, mockReactory, defaultHeader);
      
      expect(result).toEqual({
        hasHeader: true,
        headerHeight: 48,
        headerComponent: defaultHeader,
      });
    });

    it('should create header component from route definition', () => {
      const MockHeader = jest.fn(() => null);
      mockReactory.getComponent.mockReturnValue(MockHeader);

      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/home',
        header: {
          componentFqn: 'core.Header',
          show: true,
          props: { height: 64 },
        },
      } as any;

      const result = getHeaderConfig(routeDef, mockReactory);
      
      expect(result.hasHeader).toBe(true);
      expect(result.headerHeight).toBe(64);
      expect(result.headerComponent).toBeDefined();
      expect(mockReactory.getComponent).toHaveBeenCalledWith('core.Header');
    });

    it('should use default header props when not specified', () => {
      const MockHeader = jest.fn(() => null);
      mockReactory.getComponent.mockReturnValue(MockHeader);

      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/home',
        header: {
          componentFqn: 'core.Header',
          show: true,
        },
      } as any;

      const result = getHeaderConfig(routeDef, mockReactory);
      
      expect(result.hasHeader).toBe(true);
      expect(result.headerHeight).toBe(48);
    });

    it('should not show header when show is false', () => {
      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/home',
        header: {
          componentFqn: 'core.Header',
          show: false,
          props: { height: 64 },
        },
      } as any;

      const result = getHeaderConfig(routeDef, mockReactory);
      
      expect(result.hasHeader).toBe(false);
      expect(result.headerComponent).toBeNull();
    });

    it('should fallback to default header when component not found', () => {
      mockReactory.getComponent.mockReturnValue(null);

      const defaultHeader = React.createElement('div', null, 'Default Header');
      const routeDef: Reactory.Routing.IReactoryRoute = {
        path: '/home',
        header: {
          componentFqn: 'core.Header',
          show: true,
        },
      } as any;

      const result = getHeaderConfig(routeDef, mockReactory, defaultHeader);
      
      expect(result.hasHeader).toBe(true);
      expect(result.headerComponent).toBe(defaultHeader);
    });
  });

  describe('haveRoutesChanged', () => {
    const mockHashCode = (value: string) => {
      let hash = 0;
      for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash) + value.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    };

    it('should return false for identical routes', () => {
      const routes1: Reactory.Routing.IReactoryRoute[] = [
        { path: '/home', public: true } as any,
        { path: '/about', public: true } as any,
      ];
      const routes2 = [...routes1];

      expect(haveRoutesChanged(routes1, routes2, mockHashCode)).toBe(false);
    });

    it('should return true for different routes', () => {
      const routes1: Reactory.Routing.IReactoryRoute[] = [
        { path: '/home', public: true } as any,
      ];
      const routes2: Reactory.Routing.IReactoryRoute[] = [
        { path: '/about', public: true } as any,
      ];

      expect(haveRoutesChanged(routes1, routes2, mockHashCode)).toBe(true);
    });

    it('should return true for different route order', () => {
      const routes1: Reactory.Routing.IReactoryRoute[] = [
        { path: '/home', public: true } as any,
        { path: '/about', public: true } as any,
      ];
      const routes2: Reactory.Routing.IReactoryRoute[] = [
        { path: '/about', public: true } as any,
        { path: '/home', public: true } as any,
      ];

      expect(haveRoutesChanged(routes1, routes2, mockHashCode)).toBe(true);
    });

    it('should return true for different number of routes', () => {
      const routes1: Reactory.Routing.IReactoryRoute[] = [
        { path: '/home', public: true } as any,
      ];
      const routes2: Reactory.Routing.IReactoryRoute[] = [
        { path: '/home', public: true } as any,
        { path: '/about', public: true } as any,
      ];

      expect(haveRoutesChanged(routes1, routes2, mockHashCode)).toBe(true);
    });

    it('should handle empty arrays', () => {
      const routes1: Reactory.Routing.IReactoryRoute[] = [];
      const routes2: Reactory.Routing.IReactoryRoute[] = [];

      expect(haveRoutesChanged(routes1, routes2, mockHashCode)).toBe(false);
    });
  });
});
