import React from 'react';
import {
  normalizeRouteConfig,
  areRouteConfigsEqual,
  areRouteCatalogsEqual,
  findMatchingRoute,
  areReactElementsEqual,
  areUserPropsEqual,
} from '../routeMatching';

describe('routeMatching utilities', () => {
  const homeRoute: Reactory.Routing.IReactoryRoute = {
    id: 'home',
    key: 'home',
    path: '/',
    exact: true,
    public: false,
    roles: ['USER'],
    componentFqn: 'core.Home@1.0.0',
    componentProps: { title: 'Welcome' },
  };

  const aboutRoute: Reactory.Routing.IReactoryRoute = {
    id: 'about',
    key: 'about',
    path: '/about',
    exact: true,
    public: true,
    roles: ['*'],
    componentFqn: 'core.About@1.0.0',
  };

  const catchAllRoute: Reactory.Routing.IReactoryRoute = {
    id: 'not-found',
    key: 'not-found',
    path: '*',
    public: true,
    roles: ['*'],
    componentFqn: 'core.NotFound@1.0.0',
  };

  describe('areRouteConfigsEqual', () => {
    it('returns true for structurally identical routes', () => {
      const copy = { ...homeRoute, roles: ['USER'] };
      expect(areRouteConfigsEqual(homeRoute, copy)).toBe(true);
    });

    it('returns true when roles are in different order', () => {
      const r1 = { ...homeRoute, roles: ['USER', 'ADMIN'] };
      const r2 = { ...homeRoute, roles: ['ADMIN', 'USER'] };
      expect(areRouteConfigsEqual(r1, r2)).toBe(true);
    });

    it('returns false when componentFqn changed', () => {
      const modified = { ...homeRoute, componentFqn: 'core.HomeV2@1.0.0' };
      expect(areRouteConfigsEqual(homeRoute, modified)).toBe(false);
    });

    it('returns false when componentProps changed', () => {
      const modified = { ...homeRoute, componentProps: { title: 'Updated' } };
      expect(areRouteConfigsEqual(homeRoute, modified)).toBe(false);
    });

    it('returns false when roles changed', () => {
      const modified = { ...homeRoute, roles: ['ADMIN'] };
      expect(areRouteConfigsEqual(homeRoute, modified)).toBe(false);
    });

    it('handles null/undefined correctly', () => {
      expect(areRouteConfigsEqual(null, null)).toBe(true);
      expect(areRouteConfigsEqual(homeRoute, null)).toBe(false);
      expect(areRouteConfigsEqual(undefined, homeRoute)).toBe(false);
    });
  });

  describe('areRouteCatalogsEqual', () => {
    it('returns true for identical catalogs', () => {
      expect(areRouteCatalogsEqual([homeRoute, aboutRoute], [{ ...homeRoute }, { ...aboutRoute }])).toBe(true);
    });

    it('returns false when a route is added or removed', () => {
      expect(areRouteCatalogsEqual([homeRoute], [homeRoute, aboutRoute])).toBe(false);
    });

    it('returns false when any route definition is modified', () => {
      const modifiedAbout = { ...aboutRoute, componentFqn: 'core.AboutV2@1.0.0' };
      expect(areRouteCatalogsEqual([homeRoute, aboutRoute], [homeRoute, modifiedAbout])).toBe(false);
    });
  });

  describe('findMatchingRoute', () => {
    const catalog = [homeRoute, aboutRoute, catchAllRoute];

    it('finds exact route matches', () => {
      expect(findMatchingRoute(catalog, '/')).toBe(homeRoute);
      expect(findMatchingRoute(catalog, '/about')).toBe(aboutRoute);
    });

    it('matches parameterized routes', () => {
      const userRoute: Reactory.Routing.IReactoryRoute = {
        id: 'user-profile',
        path: '/users/:userId',
        exact: true,
        public: false,
        roles: ['USER'],
        componentFqn: 'core.Profile@1.0.0',
      };
      const routesWithParam = [homeRoute, userRoute, catchAllRoute];
      expect(findMatchingRoute(routesWithParam, '/users/123')).toBe(userRoute);
    });

    it('falls back to catch-all when no explicit route matches', () => {
      expect(findMatchingRoute(catalog, '/non-existent-page')).toBe(catchAllRoute);
    });

    it('returns null when catalog is empty or invalid', () => {
      expect(findMatchingRoute([], '/about')).toBeNull();
    });
  });

  describe('areReactElementsEqual', () => {
    it('returns true for identical elements', () => {
      const el1 = React.createElement('div', { className: 'test' }, 'Hello');
      const el2 = React.createElement('div', { className: 'test' }, 'Hello');
      expect(areReactElementsEqual(el1, el2)).toBe(true);
    });

    it('returns false when props differ', () => {
      const el1 = React.createElement('div', { className: 'test' }, 'Hello');
      const el2 = React.createElement('div', { className: 'test' }, 'World');
      expect(areReactElementsEqual(el1, el2)).toBe(false);
    });

    it('returns false when types differ', () => {
      const el1 = React.createElement('div', null, 'Hello');
      const el2 = React.createElement('span', null, 'Hello');
      expect(areReactElementsEqual(el1, el2)).toBe(false);
    });

    it('handles null/undefined', () => {
      expect(areReactElementsEqual(null, null)).toBe(true);
      expect(areReactElementsEqual(React.createElement('div', null, 'a'), null)).toBe(false);
    });
  });

  describe('areUserPropsEqual', () => {
    const user1 = { id: 'u1', email: 'u@test.com', roles: ['USER'], anon: false };

    it('returns true for equivalent user objects', () => {
      const user2 = { id: 'u1', email: 'u@test.com', roles: ['USER'], anon: false };
      expect(areUserPropsEqual(user1, user2)).toBe(true);
    });

    it('returns false when roles change', () => {
      const user2 = { id: 'u1', email: 'u@test.com', roles: ['ADMIN'], anon: false };
      expect(areUserPropsEqual(user1, user2)).toBe(false);
    });

    it('returns false when anon status changes', () => {
      const user2 = { ...user1, anon: true };
      expect(areUserPropsEqual(user1, user2)).toBe(false);
    });
  });
});
