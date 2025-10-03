
# Copilot Instructions for Reactory PWA Client

## Project Overview

The Reactory PWA Client is a progressive web application built on Material UI (MUI v5) that serves as the frontend runtime for the Reactory application stack. It's a microkernel-based component system that allows schema-defined interfaces to be invoked as React components. It uses yarn for package management.

### Key Architecture Features:
- **Microkernel Architecture**: Component proxy system for schema-defined interfaces
- **Plugin System**: Dynamic component loading and resource injection
- **Multi-tenant**: Supports multiple client configurations via environment-specific configs
- **Real-time Updates**: ApiStatus polling for dynamic menu and routing updates
- **PWA Capabilities**: Service worker, offline support, and app-like experience

## Technology Stack

- **React 17.0.2** with TypeScript 5.5.3
- **Material UI v6.5.0** (MUI) with @mui/x-data-grid 5.17.23 and @mui/x-date-pickers 6.19.0
- **Redux 5.0.1** for state management with redux-thunk 3.1.0 and redux-logger 4.0.0
- **Apollo Client 3.10.8** for GraphQL with graphql 16.9.0
- **React Router 6.24.1** for routing
- **Jest 29.7.0** for testing with jsdom environment
- **Storybook 9.0.18** for component development and documentation
- **Webpack 5.97.1** with custom configuration
- **Babel 7.24.8** for transpilation
- **Emotion 11.13.5** for CSS-in-JS styling
- **D3 7.9.0** for data visualization
- **Zod 3.24.2** for schema validation

## Development Guidelines

### Code Standards
- Use **TypeScript** for all source files (`.ts`, `.tsx`)
- Follow **ES6+** syntax with async/await for asynchronous operations
- Write **modular, reusable, and testable** code
- Add **JSDoc comments** for exported functions and classes
- Use **environment variables** for configuration (see config/env/README.MD)
- Follow **React functional components** with hooks pattern
- Implement **proper error boundaries** and error handling

### Project Structure
```
src/
├── components/          # React components
│   ├── shared/         # Reusable UI components (see COMPONENT_INDEX.yaml)
│   ├── reactory/       # Core Reactory components
│   │   └── ux/mui/widgets/  # ReactoryForm widgets (see WIDGET_INDEX.yaml)
│   └── auth/           # Authentication components
├── api/                # API integration layer
├── models/             # Data models and types
├── themes/             # MUI theme configurations
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
├── plugins/            # Dynamic plugin system
└── stories/            # Storybook stories
```

#### Component Organization
- **Shared Components** (`src/components/shared/`): Standalone, reusable UI components for general application use. These components are not tied to the ReactoryForm system. See `COMPONENT_INDEX.yaml` for a complete catalog of available components organized by category (layout, content, forms, navigation, etc.).

- **ReactoryForm Widgets** (`src/components/reactory/ux/mui/widgets/`): Specialized form components that integrate with the Reactory schema-driven form system. These widgets implement the standard ReactoryForm interface and handle formData, schema, and uiSchema properties. See `WIDGET_INDEX.yaml` for a complete catalog of available widgets organized by functionality (input, selection, display, data management, etc.).

### Component Development
- Create components in appropriate directories (`shared/` for reusable, `reactory/` for core and `reactory/ux/mui/widgets` for schema widgets)
- Use **Material UI components** as the primary UI framework
- Implement **responsive design** patterns
- Follow **accessibility** best practices
- Write **Storybook stories** for all components
- Use **TypeScript interfaces** for prop definitions

#### Component Reference Guides
- **`src/components/shared/COMPONENT_INDEX.yaml`**: Complete catalog of standalone UI components organized by category (layout, content, forms, navigation, dialogs, etc.). Use this to discover existing components before creating new ones.
- **`src/components/reactory/ux/mui/widgets/WIDGET_INDEX.yaml`**: Complete catalog of ReactoryForm widgets organized by functionality (input, selection, display, data management, etc.). These widgets integrate with the schema-driven form system and implement standard ReactoryForm interfaces.

### State Management
- Use **Redux** for global application state
- Implement **local component state** with React hooks
- Follow **immutable state patterns**
- Use **Redux DevTools** for debugging
- Implement **persistent state** with redux-localstorage

## Testing Strategy

### Test Framework
- **Jest** as the primary test runner
- **jsdom** environment for DOM testing
- **React Testing Library** for component testing
- **Custom test runners** in `scripts/test.ts`

### Testing Commands
```bash
# Run tests using the custom test script
bin/test.sh <client-key> <environment>

# Run tests directly with Jest
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

### Test Organization
- Place test files in `__tests__/` directories alongside source files
- Use `.test.ts` or `.spec.ts` naming convention
- Group related tests in describe blocks
- Mock external dependencies and APIs
- Test both unit and integration scenarios

### Testing Best Practices
- Write **comprehensive unit tests** for all components
- Test **user interactions** and component behavior
- Mock **API calls** and external services
- Test **error scenarios** and edge cases
- Use **snapshot testing** for UI components
- Implement **integration tests** for critical user flows

### Storybook Development
- Write **Storybook stories** for all components
- Use **addon-controls** for interactive component testing
- Document **component props** and usage examples
- Create **visual regression tests** with Storybook
- Use **decorators** for consistent theming

## Configuration Management

### Environment Configuration
- Create environment-specific configs in `config/env/<client-key>/`
- Use `.env.<environment>` files for different deployment targets
- Required environment variables:
  - `REACT_APP_API_ENDPOINT`: Backend API URL
  - `REACT_APP_CLIENT_KEY`: Client identifier
  - `REACT_APP_CLIENT_PASSWORD`: Authentication password
  - `REACT_APP_THEME`: UI theme configuration

### Development Commands
```bash
# Start development server
bin/start.sh <client-key> <environment>

# Build for production
bin/build.sh <client-key> <environment>

# Run tests
bin/test.sh <client-key> <environment>

# Deploy application
bin/deploy.sh <client-key> <environment>
```

## Plugin System

### Plugin Architecture
- **Dynamic Loading**: Plugins load when first required by forms
- **Resource Injection**: Remote resources injected into browser
- **Global Plugins**: Use `$GLOBAL$` prefix for app-wide loading
- **Dependency Management**: Plugins can depend on other plugins

### Plugin Development
- Create plugins as standalone components
- Implement **resource dependency** system
- Use **plugin registration** patterns
- Follow **plugin lifecycle** management
- Implement **error handling** for plugin loading

## Security Considerations

- **Never commit secrets** or credentials to repository
- **Sanitize and validate** all user input
- **Use HTTPS** in production environments
- **Implement proper authentication** and authorization
- **Validate API responses** and handle errors gracefully
- **Use Content Security Policy** headers

## Performance Optimization

- **Code splitting** with dynamic imports
- **Lazy loading** of components and routes
- **Memoization** of expensive computations
- **Bundle analysis** with source-map-explorer
- **Image optimization** and lazy loading
- **Service worker** for caching and offline support

## Documentation Standards

- **Keep README files** up to date
- **Document component APIs** with JSDoc
- **Write clear commit messages** with conventional commits
- **Maintain API documentation** for external integrations
- **Create user guides** for complex features

## Copilot Usage Guidelines

### Code Suggestions
- Suggest code that **fits the project's style** and patterns
- Prefer **concise, readable, and maintainable** solutions
- Follow the **principle of least surprise**
- Use **TypeScript types** and interfaces
- Implement **proper error handling**

### Testing Focus
- **Always suggest tests** for new features
- Include **unit tests** for component logic
- Add **integration tests** for user flows
- Write **Storybook stories** for UI components
- Test **error scenarios** and edge cases

### Component Development
- Use **Material UI components** as building blocks
- Follow **React best practices** and patterns
- Implement **responsive design** principles
- Add **accessibility features** (ARIA labels, keyboard navigation)
- Use **TypeScript** for type safety

### State Management
- Suggest **Redux patterns** for global state
- Use **React hooks** for local state
- Implement **immutable state updates**
- Add **persistence** where appropriate
- Follow **Redux DevTools** debugging patterns

## Important Development Notes

### Development Server
- **Use `bin/start.sh`** for development - do not use `yarn start` or `npm start`
- **Configure environment** via `config/env/<client-key>/.env.<environment>`
- **Hot reloading** is enabled for development
- **Source maps** are available for debugging

### Testing Commands
- **Use `npx jest`** to run jest test.
- **Jest configuration** is in `package.json` and `scripts/utils/createJestConfig.js`
- **Test environment** is jsdom for DOM testing
- **Coverage reports** are generated automatically

### Build and Deployment
- **Use `bin/build.sh`** for production builds
- **Environment-specific** builds with proper optimization
- **Bundle analysis** available with `bin/analyze.sh`
- **Deployment scripts** in `bin/` directory

## Troubleshooting

### Common Issues
- **Environment configuration** issues: Check `config/env/README.MD`
- **Plugin loading** problems: Verify resource dependencies
- **Test failures**: Ensure proper environment setup
- **Build errors**: Check TypeScript compilation
- **Performance issues**: Use bundle analyzer

### Debugging Tools
- **Redux DevTools** for state debugging
- **React DevTools** for component inspection
- **Jest debugging** with `--verbose` flag
- **Webpack bundle analyzer** for size optimization
- **Storybook** for component development

---

**Remember**: This is a **microkernel-based component system** that prioritizes **modularity**, **testability**, and **extensibility**. Always consider the **plugin architecture** and **dynamic loading** patterns when suggesting solutions.

