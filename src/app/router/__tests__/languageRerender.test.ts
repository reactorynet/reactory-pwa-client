/**
 * The router and route wrapper are memoised on their props. A language change
 * alters none of their other inputs, so `languageVersion` has to participate in
 * the comparison — otherwise the memoised subtree never re-renders and
 * translated route content (including StaticContent's locale-scoped refetch)
 * keeps the previous language until the user navigates or reloads.
 *
 * These tests pin that contract on the exact comparators React.memo uses.
 */
import React from 'react';
import { areReactoryRouterPropsEqual } from '../ReactoryRouter';
import { areRouteComponentWrapperPropsEqual } from '../RouteComponentWrapper';

const header = React.createElement('header', null, 'header');

const baseRouterProps: any = {
  reactory: {},
  auth_validated: true,
  authenticating: false,
  user: null,
  header,
  footer: null,
  languageVersion: 0,
};

const baseWrapperProps: any = {
  routeDef: {
    id: 'about',
    key: 'about',
    path: '/about',
    componentFqn: 'core.StaticContent@1.0.0',
  },
  componentArgs: { slug: 'about-reactory' },
  defaultHeader: header,
  defaultFooter: null,
  languageVersion: 0,
};

describe('route language re-render contract', () => {
  it('treats an unchanged language version as equal', () => {
    expect(areReactoryRouterPropsEqual(baseRouterProps, { ...baseRouterProps })).toBe(true);
    expect(areRouteComponentWrapperPropsEqual(baseWrapperProps, { ...baseWrapperProps })).toBe(true);
  });

  it('treats a changed language version as different', () => {
    expect(
      areReactoryRouterPropsEqual(baseRouterProps, { ...baseRouterProps, languageVersion: 1 })
    ).toBe(false);
    expect(
      areRouteComponentWrapperPropsEqual(baseWrapperProps, {
        ...baseWrapperProps,
        languageVersion: 1,
      })
    ).toBe(false);
  });
});
