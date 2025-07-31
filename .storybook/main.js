

/** @type { import('@storybook/react-webpack5').StorybookConfig } */
const config = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-webpack5-compiler-swc",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding"
  ],
  "framework": {
    "name": "@storybook/react-webpack5",
    "options": {}
  },
  "typescript": {
    "check": false,
    "reactDocgen": "react-docgen-typescript"
  },
  "webpackFinal": async (config) => {
    // Add support for TypeScript
    config.resolve.extensions.push('.ts', '.tsx');
    
    // Handle CSS modules
    config.module.rules.push({
      test: /\.css$/,
      use: ['style-loader', 'css-loader'],
    });
    
    // Handle SCSS/SASS
    config.module.rules.push({
      test: /\.scss$/,
      use: ['style-loader', 'css-loader', 'sass-loader'],
    });
    
    // Provide process polyfill
    config.resolve.fallback = {
      ...config.resolve.fallback,
      process: require.resolve('process/browser'),
    };
    
    // Provide process as a global
    config.plugins = config.plugins || [];
    config.plugins.push(
      new (require('webpack')).ProvidePlugin({
        process: 'process/browser',
      })
    );
    
    // Add TypeScript path mappings to webpack resolve
    config.resolve.alias = {
      ...config.resolve.alias,
      '@reactory/client-core': require('path').resolve(__dirname, '../src'),
      '@reactory/client-storybook': require('path').resolve(__dirname, '.'),
    };
    
    return config;
  }
};
export default config;