import { template } from 'lodash';
import { createTheme, Theme } from '@mui/material/styles';
import { componentRegistery } from '@reactory/client-core/components';
import { resolveComponentKey } from '@reactory/client-core/api/componentResolution';
import { createMockReactorySDK, MockReactorySDK } from '@reactory/client-core/components/reactory/form-engine/testing/mockReactorySDK';

export interface RegisteredPluginComponent {
  fqn: string;
  component: unknown;
  componentType: string;
}

type RegistryEntry = { name: string; component: unknown };

const NOOP = (): void => undefined;
const EMPTY_RESULT = () => Promise.resolve({ data: null, errors: undefined });

/**
 * Keys the fallback proxy must not invent: promise detection, React element
 * checks and serialisation would otherwise see a stub function and misbehave.
 */
const PASSTHROUGH_KEYS = new Set<PropertyKey>(['then', 'catch', 'finally', '$$typeof', 'toJSON', 'constructor', 'prototype', 'nodeType', 'asymmetricMatch']);

const buildRegistry = (): Record<string, RegistryEntry> => {
  const registry: Record<string, RegistryEntry> = {};
  componentRegistery.forEach((def) => {
    registry[`${def.nameSpace}.${def.name}@${def.version || '1.0.0'}`] = { name: def.name, component: def.component };
  });
  return registry;
};

let sharedRegistry: Record<string, RegistryEntry> | null = null;

/**
 * The SDK a runtime plugin sees in the browser, reduced to what plugins use:
 * dependencies resolve against the client's real component registry (React,
 * the MUI bundle and `core.*` components, with the client's own FQN
 * resolution rules), while network, notification and event calls are inert.
 * Built on the shared `createMockReactorySDK` so logging, i18n and events
 * behave like the form-engine tests.
 */
export function createPluginHost(theme: Theme = createTheme()) {
  sharedRegistry = sharedRegistry || buildRegistry();
  const registry = sharedRegistry;
  const registered: RegisteredPluginComponent[] = [];
  const base: MockReactorySDK = createMockReactorySDK();

  const lookup = (fqn: string): RegistryEntry | undefined => {
    const { key } = resolveComponentKey(fqn, registry as Record<string, unknown>);
    if (key && registry[key]) return registry[key];
    const own = registered.find((r) => r.fqn === fqn || r.fqn.startsWith(`${fqn}@`));
    return own ? { name: own.fqn.split('@')[0].split('.').pop() as string, component: own.component } : undefined;
  };

  const nameOf = (fqn: string): string => fqn.split('@')[0].split('.').pop() as string;

  const host: Record<string, unknown> = {
    ...base,
    getComponent: (fqn: string) => lookup(fqn)?.component ?? null,
    getComponents: (deps: Array<string | { fqn?: string; id?: string }> = []) => {
      const map: Record<string, unknown> = {};
      deps.forEach((dep) => {
        const fqn = typeof dep === 'string' ? dep : dep?.fqn || dep?.id;
        if (!fqn) return;
        const entry = lookup(fqn);
        map[entry ? entry.name : nameOf(fqn)] = entry ? entry.component : null;
      });
      return map;
    },
    registerComponent: (
      nameSpace: string,
      name: string,
      version = '1.0.0',
      component: unknown,
      _tags: string[] = [],
      _roles: string[] = [],
      _wrapWithApi = false,
      _connectors: unknown[] = [],
      componentType = 'component',
    ) => {
      registered.push({ fqn: `${nameSpace}.${name}@${version}`, component, componentType });
    },
    amq: {
      raiseReactoryPluginEvent: NOOP,
      onReactoryPluginEvent: NOOP,
      onReactoryPluginLoaded: NOOP,
      raiseCustomEvent: NOOP,
      onCustomEvent: NOOP,
      raiseFormCommand: NOOP,
      onFormCommandEvent: NOOP,
      $pub: NOOP,
      $sub: NOOP,
    },
    createNotification: NOOP,
    graphqlQuery: EMPTY_RESULT,
    graphqlMutation: EMPTY_RESULT,
    hasRole: () => true,
    raiseFormCommand: NOOP,
    removeListener: NOOP,
    getUser: () => ({ id: 'smoke-user', firstName: 'Smoke', lastName: 'Test', email: 'smoke@example.com', roles: ['USER'] }),
    queryObject: {},
    navigation: NOOP,
    getSizeSpec: () => ({}),
    muiTheme: theme,
    form: {},
    utils: {
      template,
      slugify: (value: string) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      omitDeep: <T>(value: T) => value,
    },
    applications: {},
  };
  host.i = host.i18n;

  const sdk = new Proxy(host, {
    get(target, key) {
      if (key in target || typeof key === 'symbol' || PASSTHROUGH_KEYS.has(key)) return target[key as string];
      return NOOP;
    },
  });
  host.api = sdk;

  return { sdk, registered, base };
}

export type PluginHost = ReturnType<typeof createPluginHost>;
