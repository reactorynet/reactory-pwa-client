# Plugin System

This directory implements a conditional plugin loading system similar to the server-side module pattern.

## How it works

1. **`__index.ts`** - Generated file containing static imports for enabled plugins
   - This file is generated at startup/build time based on configuration
   - Contains actual import statements for available plugins
   - Should not be edited manually

2. **`index.ts`** - Main plugin registry that conditionally loads the `__index.ts`
   - Safely attempts to require the generated `__index.ts` file
   - Falls back gracefully if no plugins are configured
   - Exports an array of `Reactory.Client.IReactoryComponentRegistryEntry<any>[]`

3. **Plugin Integration** - Main components registry imports and appends plugin components
   - `src/components/index.tsx` imports from `../plugins`
   - Plugin components are spread into the main `componentRegistery` array

## Plugin Structure

Each plugin should export a `components` array:

```typescript
export const components: Reactory.Client.IReactoryComponentRegistryEntry<any>[] = [
  // plugin components here
];
```

## Adding New Plugins

To add a new plugin:
1. Create plugin directory with `src/index.ts` and `src/components/index.ts`
2. Update the `__index.ts` generator to include the new plugin
3. The plugin components will automatically be available in the component registry
