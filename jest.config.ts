import type { JestConfigWithTsJest } from 'ts-jest';

export default async (): Promise<JestConfigWithTsJest> => {
  const config: JestConfigWithTsJest = {
    verbose: true,
    preset: 'ts-jest',
    roots: ['<rootDir>/src'],
    displayName: 'reactory-pwa-client',
    modulePaths: ['<rootDir>/src'],
    testEnvironment: 'jsdom',
    detectOpenHandles: true,
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
    },
    moduleNameMapper: {
      // Path aliases
      '^@reactory/client-core/(.*)$': '<rootDir>/src/$1',
      '^@reactory/client-storybook/(.*)$': '<rootDir>/src/stories/$1',
      '^test/(.*)$': '<rootDir>/test/$1',
      '^@reactory/webpack/(.*)$': '<rootDir>/webpack/$1',
      '^@reactory/config/(.*)$': '<rootDir>/config/$1',
      '^@rjsf/material-ui/(.*)$': '<rootDir>/node_modules/@rjsf/material-ui/dist/$1',
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