// CI lint for WP-A8: correctness rules only, so the job can be enforced now.
// Kept separate from .eslintrc.js, which eslint-webpack-plugin reads during
// the dev build. Run with `yarn lint`. (eslint-plugin-react-hooks 4.x does
// not run under ESLint 9; add rules-of-hooks when it is upgraded.)
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['node_modules/**', 'build/**', 'dist/**', 'coverage/**', '**/*.d.ts', '**/*.js', '**/*.jsx', 'src/**/__generated__/**'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {
      'no-debugger': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-else-if': 'error',
      'no-duplicate-case': 'error',
      'no-self-assign': 'error',
      'no-unreachable': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error',
      'valid-typeof': 'error',
      'use-isnan': 'error',
      'no-compare-neg-zero': 'error',
      'no-setter-return': 'error',
    },
  },
];
