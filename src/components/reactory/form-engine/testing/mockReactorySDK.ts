/**
 * Test double for `Reactory.Client.ReactorySDK`.
 *
 * Implements only the surface the form-engine adapter calls; everything else
 * is left unset. Cast at the boundary via `as unknown as Reactory.Client.ReactorySDK`
 * so consumers get a usable typed handle without paying for full SDK fidelity.
 *
 * Recorded interactions (`getComponentCalls`, `logCalls`, `telemetryCalls`) make
 * the mock observable in assertions. The `events` field is a tiny EventEmitter
 * stand-in supporting `on`/`off`/`emit` for componentRegistered notifications.
 */

import type { EventEmitter } from 'events';

export type MockComponentMap = Record<string, unknown>;

export interface MockReactorySDKOptions {
  /** Map of FQN → component. Misses return undefined. */
  components?: MockComponentMap;
  /** Feature flag values. Default: empty (every get returns false). */
  featureFlags?: Record<string, unknown>;
  /** i18n.t implementation. Default: returns options.defaultValue ?? key. */
  translate?: (key: string, options?: { defaultValue?: string } & Record<string, unknown>) => string;
  /** Locale for i18n.language. Default 'en'. */
  locale?: string;
}

export interface MockReactorySDK {
  // Recorded interactions
  getComponentCalls: string[];
  logCalls: Array<{ level: 'log' | 'debug' | 'info' | 'warning' | 'error'; message: string; params?: unknown }>;
  telemetryCalls: Array<{ name: string; payload?: unknown }>;
  emittedEvents: Array<{ event: string | symbol; args: unknown[] }>;

  // SDK surface used by the adapter
  getComponent<TComponent = unknown>(fqn: string): TComponent | undefined;
  getComponents<TComponents = unknown>(deps: unknown[]): TComponents;
  i18n: {
    t: (key: string, options?: Record<string, unknown>) => string;
    language: string;
    changeLanguage: (lang: string) => Promise<void>;
  };
  featureFlags: {
    get: <T = unknown>(key: string) => T | undefined;
    set: (key: string, value: unknown) => void;
  };
  telemetry: {
    emit: (name: string, payload?: unknown) => void;
  };
  log: (message: string, params?: unknown, kind?: string) => void;
  debug: (message: string, params?: unknown) => void;
  info: (message: string, params?: unknown) => void;
  warning: (message: string, params?: unknown) => void;
  error: (message: string, params?: unknown) => void;

  // EventEmitter-ish surface
  on: (event: string | symbol, listener: (...args: unknown[]) => void) => MockReactorySDK;
  off: (event: string | symbol, listener: (...args: unknown[]) => void) => MockReactorySDK;
  emit: (event: string | symbol, ...args: unknown[]) => boolean;

  // Mutators for tests
  registerComponent: (fqn: string, component: unknown) => void;
  setFeatureFlag: (key: string, value: unknown) => void;
  reset: () => void;

  __REACTORYAPI: true;
}

const NOT_SET = Symbol('NOT_SET');

/**
 * Construct a fresh mock SDK. Each test should create its own instance to avoid
 * cross-test bleed from recorded calls.
 */
export function createMockReactorySDK(options: MockReactorySDKOptions = {}): MockReactorySDK {
  const components = new Map<string, unknown>(Object.entries(options.components ?? {}));
  const featureFlags = new Map<string, unknown>(Object.entries(options.featureFlags ?? {}));
  const listeners = new Map<string | symbol, Set<(...args: unknown[]) => void>>();

  const translate = options.translate ?? ((key, opts) => (opts?.defaultValue as string | undefined) ?? key);

  const sdk: MockReactorySDK = {
    getComponentCalls: [],
    logCalls: [],
    telemetryCalls: [],
    emittedEvents: [],

    getComponent<T>(fqn: string): T | undefined {
      sdk.getComponentCalls.push(fqn);
      const v = components.get(fqn);
      return v === undefined ? undefined : (v as T);
    },
    getComponents<T>(): T {
      return {} as T;
    },

    i18n: {
      t: (key, opts) => translate(key, opts as { defaultValue?: string }),
      language: options.locale ?? 'en',
      changeLanguage: async (lang) => {
        sdk.i18n.language = lang;
      },
    },

    featureFlags: {
      get: <T>(key: string): T | undefined => {
        const v = featureFlags.has(key) ? featureFlags.get(key) : NOT_SET;
        return v === NOT_SET ? undefined : (v as T);
      },
      set: (key, value) => {
        featureFlags.set(key, value);
      },
    },

    telemetry: {
      emit: (name, payload) => {
        sdk.telemetryCalls.push({ name, payload });
      },
    },

    log: (message, params) => sdk.logCalls.push({ level: 'log', message, params }),
    debug: (message, params) => sdk.logCalls.push({ level: 'debug', message, params }),
    info: (message, params) => sdk.logCalls.push({ level: 'info', message, params }),
    warning: (message, params) => sdk.logCalls.push({ level: 'warning', message, params }),
    error: (message, params) => sdk.logCalls.push({ level: 'error', message, params }),

    on(event, listener) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(listener);
      return sdk;
    },
    off(event, listener) {
      listeners.get(event)?.delete(listener);
      return sdk;
    },
    emit(event, ...args) {
      sdk.emittedEvents.push({ event, args });
      const set = listeners.get(event);
      if (!set || set.size === 0) return false;
      for (const fn of set) fn(...args);
      return true;
    },

    registerComponent: (fqn, component) => {
      components.set(fqn, component);
    },
    setFeatureFlag: (key, value) => {
      featureFlags.set(key, value);
    },
    reset: () => {
      sdk.getComponentCalls.length = 0;
      sdk.logCalls.length = 0;
      sdk.telemetryCalls.length = 0;
      sdk.emittedEvents.length = 0;
      listeners.clear();
    },

    __REACTORYAPI: true,
  };

  return sdk;
}

/**
 * Cast the mock to the SDK type for handing to code that expects the real
 * `Reactory.Client.ReactorySDK`. Use sparingly; prefer typing test code
 * against `MockReactorySDK` directly so observability fields stay visible.
 */
export function asReactorySDK(mock: MockReactorySDK): unknown {
  return mock;
}

// Avoid an unused-import lint complaint in some projects without enabling the
// runtime EventEmitter dependency on this mock.
export type _UnusedNodeEventEmitter = EventEmitter;
