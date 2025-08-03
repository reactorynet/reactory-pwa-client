import type { JestConfigWithTsJest } from 'ts-jest';

export default async (): Promise<JestConfigWithTsJest> => {
  const config: JestConfigWithTsJest = {
    verbose: true,
    preset: 'ts-jest',
    roots: ['src'],
    displayName: 'reactory-pwa-client',
    modulePaths: ['<rootDir>/src'],
    testEnvironment: 'jsdom',
    detectOpenHandles: true,
    transform: {
      '^.+\\.[jt]sx?$': 'ts-jest',
    },
    moduleNameMapper: {
      '^@reactory/client-core/(.*)$': '<rootDir>/src/$1',
      '^@reactory/client-storybook/(.*)$': '<rootDir>/src/stories/$1',
      '^test/(.*)$': '<rootDir>/test/$1',
      '^@reactory/webpack/(.*)$': '<rootDir>/webpack/$1',
      '^@reactory/config/(.*)$': '<rootDir>/config/$1',
      '^@rjsf/material-ui/(.*)$': '<rootDir>/node_modules/@rjsf/material-ui/dist/$1',
      '^react$': '<rootDir>/node_modules/@types/react',
      '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    },
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    testMatch: [
      '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
      '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
    ],
    collectCoverageFrom: [
      'src/**/*.{js,jsx,ts,tsx}',
      '!src/**/*.d.ts',
      '!src/index.tsx',
      '!src/service-worker.ts',
    ],
    globals: {
      'ts-jest': {
        tsconfig: 'tsconfig.json',
      },
    },
  };

  return config;
}; 