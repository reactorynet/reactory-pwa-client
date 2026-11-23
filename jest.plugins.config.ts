import type { JestConfigWithTsJest } from 'ts-jest';
import baseConfig from './jest.config';
import { pluginsDir } from './test/plugin-smoke/discoverPlugins';

/**
 * Runtime plugin smoke harness (see test/plugin-smoke/plugins.smoke.test.tsx).
 * Plugin sources live in reactory-data, next to this repository by default;
 * set REACTORY_PLUGINS_DIR to point elsewhere.
 */
export default async (): Promise<JestConfigWithTsJest> => {
  const config = await baseConfig();
  return {
    ...config,
    displayName: 'plugin-smoke',
    roots: ['<rootDir>/test/plugin-smoke', `${pluginsDir()}/src`],
    // Plugin sources resolve shared packages from this repository, the way
    // the bundled client provides them at runtime.
    modulePaths: ['<rootDir>/src', '<rootDir>/node_modules'],
    // Loading the whole component registry pulls in packages whose browser
    // export condition is ESM-only; point them at their CommonJS builds.
    moduleNameMapper: {
      '^uuid$': require.resolve('uuid'),
      '^react-markdown$': '<rootDir>/test/plugin-smoke/stubs/markdown.tsx',
      '^remark-gfm$': '<rootDir>/test/plugin-smoke/stubs/remarkPlugin.ts',
      '(^|/)hooks/useDesktopEnvironment$': '<rootDir>/test/plugin-smoke/stubs/useDesktopEnvironment.ts',
      ...config.moduleNameMapper,
    },
    // The base list plus the ESM-only packages the full registry imports.
    transformIgnorePatterns: [
      '/node_modules/(?!(d3|d3-[\\w.@-]+|delaunator|robust-predicates|internmap|marked|react-quill-new|quill|parchment|lodash-es|three)/)',
    ],
    testMatch: ['<rootDir>/test/plugin-smoke/**/*.smoke.test.{ts,tsx}'],
    coverageThreshold: undefined,
    maxWorkers: 1,
    testTimeout: 120000,
  };
};
