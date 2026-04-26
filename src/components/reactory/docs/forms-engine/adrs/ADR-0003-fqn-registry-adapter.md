# ADR-0003 — FQN resolution as a registry adapter, not a custom dispatcher

**Status:** Proposed
**Date:** 2026-04-25

## Context

Reactory's plugin system identifies components by Fully Qualified Name (FQN): `namespace.Name` or `namespace.Name@version`. Forms reference plugin-provided fields and widgets via `ui:field` / `ui:widget` strings containing dots — the fork's `useRegistry` resolves these via `reactory.getComponent()`.

In rjsf v5, `ui:field` and `ui:widget` look up keys in the `fields` and `widgets` registry objects. The registry is constructed before render and is a plain object.

Two ways to bridge:

1. **Custom dispatcher.** Override `SchemaField` (the field component that dispatches based on schema type and `ui:field`) with a Reactory-specific version that knows about FQN lookup. Heavy: changes the heart of rjsf's render pipeline.

2. **Registry adapter (this ADR).** Build a `Proxy`-backed registry whose `get(key)` resolves dotted-name keys via `reactory.getComponent()` lazily on miss. rjsf is none the wiser; from its perspective the registry just happens to know about every component.

## Decision

We build a `ReactoryRegistry` whose `fields` and `widgets` are `Proxy`-backed objects:

```ts
function createReactoryRegistry({ reactory, staticFields, staticWidgets }) {
  const fieldCache = new Map();
  const widgetCache = new Map();

  const fields = new Proxy(staticFields ?? {}, {
    get(target, key) {
      if (typeof key !== 'string') return target[key];
      if (target[key]) return target[key];
      if (fieldCache.has(key)) return fieldCache.get(key);
      if (key.includes('.')) {
        const c = resolveFqn(reactory, key, 'field');
        fieldCache.set(key, c);
        return c;
      }
      return undefined;
    },
  });

  const widgets = new Proxy(staticWidgets ?? {}, { /* … */ });

  return { fields, widgets, /* … */ };
}
```

`resolveFqn(reactory, name, kind)` strips `@version` and `$GLOBAL$` prefixes (logging warnings), then calls `reactory.getComponent(stripped)`. If found, returns the component; otherwise logs a `form.fqn.miss` event and returns `undefined`. rjsf then renders the `UnsupportedFieldTemplate`.

## Consequences

**Positive**

- Zero changes to rjsf internals. We only set `fields` and `widgets` props on `<Form>`.
- Lazy resolution — components aren't loaded until the form actually references them.
- The cache is per-form-mount, invalidated on `componentRegistered` events so newly-registered FQNs become available without remount.
- Easier to test: `resolveFqn` is a pure function; the `Proxy` is a small wrapper.

**Negative**

- `Proxy` has a (small) per-access cost. We mitigate with the cache. Measured at no detectable overhead in our spike.
- IDE "Go to definition" doesn't work for FQN strings — but it didn't in the fork either.

**Neutral**

- We could later add `@version` enforcement (i.e., resolve `core.MyField@1.0.0` to a specific version) without changing the API. For now, version is logged and ignored.

## See also

- [`06-reactory-extensions.md#1-reactoryregistry`](../06-reactory-extensions.md#1-reactoryregistry)
- [`02-current-state.md#fqn-component-resolution`](../02-current-state.md#fqn-component-resolution)
