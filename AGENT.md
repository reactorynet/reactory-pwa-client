# Reactory PWA Client -- Agent Context

## What Is This Project

The Reactory PWA Client (`@reactory/client`) is a progressive web application built on React and Material UI (MUI 6) that serves as the frontend runtime for the Reactory platform. It implements a **microkernel-based component system** where schema-defined interfaces are invoked as React components at runtime. The client supports multi-tenancy, dynamic plugin loading, real-time updates, and offline/PWA capabilities.

## Technology Stack

- **Language**: TypeScript 5.5.3
- **Runtime**: Node.js 20.x (see `.nvmrc`)
- **Package manager**: Yarn
- **UI framework**: React 17.0.2 + Material UI (MUI) 6.5.0
- **State management**: Redux 5.0.1 + redux-thunk 3.1.0
- **Data fetching**: Apollo Client 3.10.8 (GraphQL)
- **Routing**: React Router 6.24.1
- **Build tool**: Webpack 5.97.1 with custom configuration
- **Transpiler**: Babel 7.24.8
- **Styling**: Emotion 11.13.5 (CSS-in-JS)
- **Testing**: Jest 29.7.0 (jsdom environment)
- **Component development**: Storybook 9.0.18
- **Validation**: Zod 3.24.2
- **Data visualization**: D3 7.9.0
- **Build analysis**: source-map-explorer

## Project Structure

```
reactory-pwa-client/
  src/
    components/
      shared/                   # Reusable UI components (see COMPONENT_INDEX.yaml)
      reactory/                 # Core Reactory components
        ux/mui/widgets/         # ReactoryForm widgets (see WIDGET_INDEX.yaml)
      auth/                     # Authentication components
    api/                        # API integration layer
    models/                     # Data models and types
    themes/                     # MUI theme configurations
    utils/                      # Utility functions
    hooks/                      # Custom React hooks
    plugins/                    # Dynamic plugin system
    stories/                    # Storybook stories
  config/
    env/                        # Per-client environment configurations
      <client-key>/
        .env.<environment>      # Environment-specific variables
  webpack/                      # Custom Webpack configuration
  bin/
    start.sh                    # Start development server
    build.sh                    # Production build
    test.sh                     # Run tests
    deploy.sh                   # Deploy application
    analyze.sh                  # Bundle analysis
  public/                       # Static assets
  lib/                          # Library files
  build/                        # Build output
  .storybook/                   # Storybook configuration
```

## Component Reference Guides

Two YAML indexes catalog all available components:

- **`src/components/shared/COMPONENT_INDEX.yaml`**: Standalone reusable UI components organized by category (layout, content, forms, navigation, dialogs, etc.). Check here before creating new components.
- **`src/components/reactory/ux/mui/widgets/WIDGET_INDEX.yaml`**: ReactoryForm widgets organized by functionality (input, selection, display, data management, etc.). These integrate with the schema-driven form system.

## Development Commands

```bash
# Start development server (ALWAYS use this, not yarn start or npm start)
bin/start.sh <client-key> <environment>

# Build for production
bin/build.sh <client-key> <environment>

# Run tests
npx jest                                    # Run all tests
bin/test.sh <client-key> <environment>      # Environment-specific test run
npx jest --coverage                         # With coverage report
npx jest --watch                            # Watch mode

# Bundle analysis
bin/analyze.sh

# Deploy
bin/deploy.sh <client-key> <environment>
```

## Multi-Tenant Configuration

Each application/tenant is configured in `config/env/<client-key>/`:

```bash
config/env/<client-key>/.env.<environment>
```

Required environment variables per client:
- `REACT_APP_API_ENDPOINT` -- Backend API URL
- `REACT_APP_CLIENT_KEY` -- Client identifier
- `REACT_APP_CLIENT_PASSWORD` -- Authentication password
- `REACT_APP_THEME` -- UI theme configuration

## Plugin System

- **Dynamic Loading**: Plugins load when first required by forms
- **Resource Injection**: Remote resources injected into browser
- **Global Plugins**: Use `$GLOBAL$` prefix for app-wide loading
- **Dependency Management**: Plugins can depend on other plugins
- Client plugins live in `$REACTORY_PLUGINS` (i.e., `reactory-data/plugins/`)

## Microkernel Architecture

The core architectural pattern is a **component proxy system**:
1. Server defines form schemas with component references (FQN format: `{namespace}.{ComponentName}@{version}`)
2. Client resolves these references to actual React components at runtime
3. Components self-register via the plugin system
4. The `ReactoryFormComponent` renders schema-driven UIs with data binding

## Coding Conventions

- Use React **functional components** with hooks
- Use **TypeScript** for all source files (`.ts`, `.tsx`)
- Use **Material UI components** as the primary UI framework
- Follow ES6+ syntax with async/await
- Write modular, reusable, and testable code
- Add JSDoc comments for exported functions and classes
- Implement proper error boundaries and error handling
- Follow responsive design patterns
- Include accessibility props (ARIA labels, keyboard navigation)
- Use TypeScript interfaces for prop definitions
- Write Storybook stories for UI components

## State Management

- **Redux** for global application state with redux-thunk for async operations
- **React hooks** (useState, useReducer) for local component state
- **Immutable state patterns** throughout
- **redux-localstorage** for persistent state
- **Apollo Client cache** for GraphQL data

## Testing

- **Jest** with jsdom environment for DOM testing
- **React Testing Library** for component testing
- Test files in `__tests__/` directories alongside source files
- Use `.test.ts` or `.spec.ts` naming convention
- TDD plans required: create `<testfile>_plan.md` alongside test files
- Minimum 80% code coverage for new code
- Jest config in `package.json` and `scripts/utils/createJestConfig.js`
- Storybook for component development and visual testing

## Performance Optimization

- Code splitting with dynamic imports
- Lazy loading of components and routes
- Memoization (React.memo, useMemo) for expensive computations
- Bundle analysis with source-map-explorer
- Service worker for caching and offline support
- Image optimization and lazy loading

## Security

- Never commit secrets or credentials
- Sanitize and validate all user input
- Use HTTPS in production
- Implement proper authentication and authorization
- Validate API responses and handle errors gracefully
- Use Content Security Policy headers

## Environment Variables

```bash
REACTORY_CLIENT    # Path to this project
REACTORY_HOME      # Root workspace directory
REACTORY_SERVER    # Path to reactory-express-server
REACTORY_PLUGINS   # Path to reactory-data/plugins
```

## Dependencies on Other Projects

- **reactory-core**: Provides TypeScript type definitions (installed as `.tgz` file dependency)
- **reactory-express-server**: Backend API accessed via GraphQL (Apollo Client)
- **reactory-data/plugins**: Client plugins loaded at runtime
