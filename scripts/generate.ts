'use strict';
/**
 * Main code generation script for Reactory PWA Client.
 * Generates conditional plugin imports (__index.ts) and required build artifacts.
 */
import { generatePluginIndex } from '../src/components/plugins/pluginImportFactory';

export const generate = (): void => {
  const clientKey = process.env.REACT_APP_CLIENT_KEY || process.env.REACTORY_CONFIG_ID || 'reactory';
  console.log(`🔨 Running Reactory Client Code Generation for [${clientKey}]...`);

  // 1. Generate client plugin index
  const pluginResult = generatePluginIndex();
  console.log(`   📦 Plugins processed: ${pluginResult.pluginCount}`);

  console.log('✅ Client code generation completed.');
};

if (require.main === module) {
  generate();
}

export default generate;
