/**
 * Proxy-backed fields/widgets registry that resolves FQN strings via the
 * Reactory SDK lazily. See ADR-0003.
 *
 * From rjsf's perspective, `registry.fields` and `registry.widgets` are
 * plain objects whose keys map to React components. This implementation
 * makes them Proxies whose `get` trap consults a static map first, then
 * the FQN resolver, caching the result per-mount. The cache is cleared
 * when the SDK fires a `componentRegistered` event so that runtime
 * plugin registration takes effect on the next render.
 */

import type * as React from 'react';
import { resolveFqn, type FqnKind } from './resolveFqn';

/**
 * Minimal shape of the Reactory SDK that the registry consumes. Keeping
 * the surface narrow lets us mock it cleanly in tests.
 */
export interface ReactoryRegistrySdk {
  getComponent<T = unknown>(fqn: string): T | undefined;
  debug?: (message: string, params?: unknown) => void;
  error?: (message: string, params?: unknown) => void;
  on?: (event: string | symbol, listener: (...args: unknown[]) => void) => unknown;
  off?: (event: string | symbol, listener: (...args: unknown[]) => void) => unknown;
}

export interface ReactoryRegistryOptions {
  reactory: ReactoryRegistrySdk;
  staticFields?: Record<string, React.ComponentType<any>>;
  staticWidgets?: Record<string, React.ComponentType<any>>;
  /** Called when a name resolves to nothing. Useful for telemetry. */
  onMiss?: (kind: FqnKind, name: string) => void;
  /** Event name fired by the SDK when a new component is registered. */
  registeredEvent?: string;
}

export interface ReactoryRegistry {
  fields: Record<string, React.ComponentType<any>>;
  widgets: Record<string, React.ComponentType<any>>;
  registerField(name: string, component: React.ComponentType<any>): void;
  registerWidget(name: string, component: React.ComponentType<any>): void;
  resolveFqn(name: string, kind: FqnKind): React.ComponentType<any> | null;
  clearCache(): void;
  /** Detach the SDK event listener. Call in cleanup paths. */
  dispose(): void;
}

const DEFAULT_REGISTERED_EVENT = 'componentRegistered';

/**
 * Construct a fresh registry. Each form mount should create its own to avoid
 * stale cache bleed across forms with different SDK contexts.
 */
export function createReactoryRegistry(options: ReactoryRegistryOptions): ReactoryRegistry {
  const fieldStatic: Record<string, React.ComponentType<any>> = { ...(options.staticFields ?? {}) };
  const widgetStatic: Record<string, React.ComponentType<any>> = { ...(options.staticWidgets ?? {}) };

  const fieldCache = new Map<string, React.ComponentType<any> | null>();
  const widgetCache = new Map<string, React.ComponentType<any> | null>();

  const eventName = options.registeredEvent ?? DEFAULT_REGISTERED_EVENT;
  const onRegistered = () => {
    fieldCache.clear();
    widgetCache.clear();
  };
  options.reactory.on?.(eventName, onRegistered);

  const lookup = (
    target: Record<string, React.ComponentType<any>>,
    cache: Map<string, React.ComponentType<any> | null>,
    name: string,
    kind: FqnKind,
  ): React.ComponentType<any> | undefined => {
    if (typeof name !== 'string') return undefined;
    if (Object.prototype.hasOwnProperty.call(target, name)) {
      return target[name];
    }
    if (cache.has(name)) {
      const cached = cache.get(name);
      return cached ?? undefined;
    }
    const resolved = resolveFqn(
      { reactory: options.reactory, onMiss: options.onMiss },
      name,
      kind,
    );
    cache.set(name, resolved);
    return resolved ?? undefined;
  };

  const fieldsProxy = new Proxy(fieldStatic, {
    get(target, prop) {
      if (typeof prop === 'symbol') return (target as any)[prop];
      return lookup(target, fieldCache, prop, 'field');
    },
    has(target, prop) {
      if (typeof prop === 'symbol') return prop in target;
      if (Object.prototype.hasOwnProperty.call(target, prop)) return true;
      const cached = fieldCache.get(prop as string);
      if (cached !== undefined && cached !== null) return true;
      return lookup(target, fieldCache, prop as string, 'field') !== undefined;
    },
    ownKeys(target) {
      // Static keys only; FQN resolution is open-ended and we don't want
      // rjsf's introspection to drive eager resolution.
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, prop) {
      if (Object.prototype.hasOwnProperty.call(target, prop)) {
        return Object.getOwnPropertyDescriptor(target, prop);
      }
      return undefined;
    },
  });

  const widgetsProxy = new Proxy(widgetStatic, {
    get(target, prop) {
      if (typeof prop === 'symbol') return (target as any)[prop];
      return lookup(target, widgetCache, prop, 'widget');
    },
    has(target, prop) {
      if (typeof prop === 'symbol') return prop in target;
      if (Object.prototype.hasOwnProperty.call(target, prop)) return true;
      const cached = widgetCache.get(prop as string);
      if (cached !== undefined && cached !== null) return true;
      return lookup(target, widgetCache, prop as string, 'widget') !== undefined;
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, prop) {
      if (Object.prototype.hasOwnProperty.call(target, prop)) {
        return Object.getOwnPropertyDescriptor(target, prop);
      }
      return undefined;
    },
  });

  return {
    fields: fieldsProxy,
    widgets: widgetsProxy,
    registerField(name, component) {
      fieldStatic[name] = component;
      fieldCache.delete(name);
    },
    registerWidget(name, component) {
      widgetStatic[name] = component;
      widgetCache.delete(name);
    },
    resolveFqn(name, kind) {
      return resolveFqn(
        { reactory: options.reactory, onMiss: options.onMiss },
        name,
        kind,
      );
    },
    clearCache() {
      fieldCache.clear();
      widgetCache.clear();
    },
    dispose() {
      options.reactory.off?.(eventName, onRegistered);
    },
  };
}
