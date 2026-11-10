/**
 * Jest config for the `core.ResetPassword` page added to the reactory-core plugin.
 *
 * WHY A SEPARATE CONFIG
 * ---------------------
 * The base config excludes the entire `src/components/plugins/reactory-core`
 * submodule from jest (`testPathIgnorePatterns`), because two of the plugin's
 * tests import `../../__index` — a file generated at app startup and gitignored —
 * so they fail in any clean checkout.
 *
 * That blanket exclusion is wider than the problem: it also hides this page's
 * suite, which depends on nothing generated. Rather than loosen the repo-wide gate
 * (and start collecting the plugin's other, unrelated suites), this config reuses
 * the base config and narrows BOTH the exclusion and the test selection to just
 * this one module.
 *
 * Run with:  npm run test:password-reset
 */
import base from './jest.config';

export default async () => {
  const config: any = await (base as any)();

  config.displayName = 'reactory-pwa-client:password-reset';

  // Base ignore list minus the whole-plugin exclusion. The two files that import
  // the generated `plugins/__index` stay excluded.
  config.testPathIgnorePatterns = [
    '/node_modules/',
    '/build/',
    '/dist/',
    '<rootDir>/src/api/objectMapper/objectMapper.test.ts',
    '<rootDir>/src/components/plugins/reactory-core/__tests__/componentRegistration.test.ts',
    '<rootDir>/src/components/plugins/reactory-core/organization-management/__tests__/OrganizationListPanel.test.tsx',
  ];

  config.testMatch = [
    '<rootDir>/src/components/plugins/reactory-core/password-reset/**/*.{spec,test}.{js,jsx,ts,tsx}',
  ];

  // This module owns its coverage target; a global 50% gate would be measured
  // against the whole app graph.
  delete config.coverageThreshold;

  return config;
};
