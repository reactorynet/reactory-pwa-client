import type { JestConfigWithTsJest } from 'ts-jest';
import * as os from 'os';

/**
 * Jest config performance notes (P5.6):
 *   - `verbose: false` — per-test output adds noticeable overhead on a 50+
 *     suite run. Re-enable per-run via `--verbose` when debugging.
 *   - `detectOpenHandles` removed from defaults — it forces Jest to track
 *     every async resource (timers, sockets, file handles) and is the
 *     single biggest perf hit on routine runs. Set the env var
 *     `JEST_DETECT_HANDLES=1` to opt back in for a debugging session.
 *   - `maxWorkers` capped at 50% by default — full-repo runs were OOM'ing
 *     with the worker default (CPUs - 1) because each worker holds the
 *     full module graph (MUI 6 + Apollo + Mermaid + chart libs ≈ 3 GB
 *     RSS each). Override with `JEST_MAX_WORKERS=4` etc. when needed.
 *   - `transformIgnorePatterns` left at default; the per-package
 *     moduleNameMapper stubs (mermaid, apollo-upload-client) are the
 *     right tool for ESM-incompatible packages.
 *   - `cacheDirectory` explicit so first cold run primes a stable cache
 *     used by subsequent runs (CI cache friendliness too).
 */
const cpuCount = typeof os.cpus === 'function' ? os.cpus().length : 4;
const defaultWorkers = Math.max(1, Math.floor(cpuCount / 2));

export default async (): Promise<JestConfigWithTsJest> => {
  const config: JestConfigWithTsJest = {
    verbose: process.env.JEST_VERBOSE === '1',
    preset: 'ts-jest',
    roots: ['<rootDir>/src'],
    displayName: 'reactory-pwa-client',
    modulePaths: ['<rootDir>/src'],
    testEnvironment: 'jsdom',
    detectOpenHandles: process.env.JEST_DETECT_HANDLES === '1',
    maxWorkers: process.env.JEST_MAX_WORKERS
      ? Number(process.env.JEST_MAX_WORKERS)
      : defaultWorkers,
    cacheDirectory: '<rootDir>/.jest-cache',
    // Prefer TypeScript files over compiled JavaScript files
    moduleFileExtensions: ['tsx', 'ts', 'jsx', 'js', 'json', 'node'],
    transform: {
      // Transform TypeScript and JSX files
      '^.+\\.(ts|tsx)$': ['ts-jest', {
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          module: 'commonjs',
          moduleResolution: 'node',
          target: 'es2019',
          strict: false,
          skipLibCheck: true,
        },
        useESM: false,
      }],
      // Handle JSX files (compiled output that might be imported)
      '^.+\\.(js|jsx)$': ['babel-jest', {
        presets: ['@babel/preset-env', '@babel/preset-react'],
      }],
      // GraphQL files — export file content as string so String(doc).includes() works
      '\\.graphql$': '<rootDir>/test/__mocks__/graphqlTransform.js',
    },
    moduleNameMapper: {
      // Path aliases
      '^@reactory/client-core/(.*)$': '<rootDir>/src/$1',
      '^@reactory/client-storybook/(.*)$': '<rootDir>/src/stories/$1',
      '^test/(.*)$': '<rootDir>/test/$1',
      '^@reactory/webpack/(.*)$': '<rootDir>/webpack/$1',
      '^@reactory/config/(.*)$': '<rootDir>/config/$1',
      // ESM modules that Jest's transform pipeline cannot consume directly.
      // Stubbed for tests; the production bundle uses the real ESM builds.
      '^apollo-upload-client/createUploadLink\\.mjs$': '<rootDir>/test/__mocks__/apolloUploadClient.js',
      '^mermaid$': '<rootDir>/test/__mocks__/mermaid.js',
      // Module mocks
      '^react$': '<rootDir>/node_modules/react',
      // CSS/Style mocks
      '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      // Asset mocks
      '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/test/__mocks__/fileMock.js',
    },
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    testMatch: [
      '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
      '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
    ],
    testPathIgnorePatterns: [
      '/node_modules/',
      '/build/',
      '/dist/',
    ],
    collectCoverageFrom: [
      'src/**/*.{js,jsx,ts,tsx}',
      '!src/**/*.d.ts',
      '!src/index.tsx',
      '!src/service-worker.ts',
      '!src/**/*.stories.{js,jsx,ts,tsx}',
    ],
    coverageThreshold: {
      global: {
        branches: 50,
        functions: 50,
        lines: 50,
        statements: 50,
      },
    },
    // Timeout for tests
    testTimeout: 10000,
    // Clear mocks between tests
    clearMocks: true,
    // Restore mocks between tests
    restoreMocks: true,
  };

  return config;
}; 