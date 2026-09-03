import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ReactoryContext } from '@reactory/client-core/api/ApiProvider';
import { ReactoryApiEventNames } from '@reactory/client-core/api';

type Handler = (...args: unknown[]) => void;

export interface MockReactoryOptions {
  routes?: Reactory.Routing.IReactoryRoute[];
  components?: Record<string, React.ComponentType<any> | null>;
  isAnon?: boolean;
  roles?: string[];
  isDevelopmentMode?: boolean;
  plugins?: unknown[];
}

export const createMockReactory = (options: MockReactoryOptions = {}) => {
  const listeners: Record<string, Handler[]> = {};
  const components = { ...(options.components || {}) };

  const reactory: any = {
    navigation: null,
    location: null,
    componentRegister: Object.keys(components).reduce((acc, key) => {
      acc[key.indexOf('@') > 0 ? key : `${key}@1.0.0`] = { component: components[key] };
      return acc;
    }, {} as Record<string, { component: unknown }>),
    utils: {
      hashCode: (value: string) => {
        let hash = 0;
        for (let i = 0; i < value.length; i += 1) {
          hash = ((hash << 5) - hash) + value.charCodeAt(i);
          hash |= 0;
        }
        return hash;
      },
      template: (input: string) => (ctx: Record<string, unknown>) => input.replace(/\$\{([^}]+)\}/g, (_, path) => {
        return path.split('.').reduce((acc: any, key: string) => acc?.[key], ctx) ?? '';
      }),
      objectMapper: (src: unknown, map: Record<string, string>) => {
        const result: Record<string, unknown> = {};
        Object.keys(map || {}).forEach((dest) => {
          result[dest] = src;
        });
        return result;
      },
      componentPartsFromFqn: (fqn: string) => {
        const [id, version = '1.0.0'] = fqn.split('@');
        const separator = id.lastIndexOf('.');
        return {
          nameSpace: id.slice(0, separator),
          name: id.slice(separator + 1),
          version,
        };
      },
    },
    debug: jest.fn(),
    log: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    getRoutes: jest.fn(() => options.routes || []),
    getComponent: jest.fn((fqn: string) => {
      if (!fqn) return null;
      const ensured = fqn.indexOf('@') > 0 ? fqn : `${fqn}@1.0.0`;
      if (Object.prototype.hasOwnProperty.call(components, fqn)) {
        return components[fqn];
      }
      if (Object.prototype.hasOwnProperty.call(components, ensured)) {
        return components[ensured];
      }
      return reactory.componentRegister[ensured]?.component || null;
    }),
    getComponents: jest.fn(() => ({})),
    getUser: jest.fn(() => ({
      routes: options.routes || [],
      roles: options.isAnon ? ['ANON'] : (options.roles || ['USER']),
      loggedIn: { roles: options.roles || ['USER'] },
      plugins: options.plugins || [],
    })),
    isAnon: jest.fn(() => options.isAnon === true),
    hasRole: jest.fn((required: string[] = [], userRoles?: string[]) => {
      if (required.length === 1 && required[0] === '*') return true;
      const compared = userRoles || options.roles || [];
      return required.some((role) => compared.includes(role));
    }),
    isDevelopmentMode: jest.fn(() => options.isDevelopmentMode === true),
    on: jest.fn((event: string, handler: Handler) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    }),
    off: jest.fn((event: string, handler: Handler) => {
      listeners[event] = (listeners[event] || []).filter((item) => item !== handler);
    }),
    emit: (event: string, payload?: unknown) => {
      (listeners[event] || []).forEach((handler) => handler(payload));
    },
    registerComponent: (fqn: string, component: React.ComponentType<any>) => {
      components[fqn] = component;
      reactory.componentRegister[fqn.indexOf('@') > 0 ? fqn : `${fqn}@1.0.0`] = { component };
      reactory.emit(ReactoryApiEventNames.onComponentRegistered, { fqn });
    },
  };

  return reactory;
};

export const renderWithRouter = (
  ui: React.ReactElement,
  reactory: any,
  initialEntries: string[] = ['/'],
) => {
  const { render } = require('@testing-library/react');
  return render(
    <ReactoryContext.Provider value={reactory}>
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    </ReactoryContext.Provider>,
  );
};

export const publicLoginRoute = (): Reactory.Routing.IReactoryRoute => ({
  id: 'login',
  key: 'login',
  path: '/login',
  public: true,
  roles: ['ANON'],
  componentFqn: 'core.Login@1.0.0',
});

export const protectedHomeRoute = (): Reactory.Routing.IReactoryRoute => ({
  id: 'home',
  key: 'home',
  path: '/',
  public: false,
  roles: ['USER'],
  componentFqn: 'core.Home@1.0.0',
});
