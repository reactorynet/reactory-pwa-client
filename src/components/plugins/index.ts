/**
 * Plugin registry that conditionally loads plugin components
 * Similar to server-side module loading pattern
 */

let pluginComponents: Reactory.Client.IReactoryComponentRegistryEntry<any>[] = [];

// Conditional import of __index if it exists (generated at startup/compile time)
try {
  // Dynamic import attempt for __index
  const importedPlugins = require('./__index').default;
  if (Array.isArray(importedPlugins)) {
    pluginComponents.push(...importedPlugins);
  }
} catch (error) {
  // __index file doesn't exist or failed to load, which is acceptable
  // This means no plugins are currently configured or available
  console.debug('No plugin __index file found - no plugins loaded');
}

export default pluginComponents;
