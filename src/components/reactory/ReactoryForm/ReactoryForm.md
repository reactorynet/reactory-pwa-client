# ReactoryForm Component

`ReactoryForm` is a dynamic, extensible form rendering engine for the Reactory platform, built on top of JSON Schema Form principles. It is designed to support enterprise-grade, multi-tenant applications with a plugin architecture, advanced UI customization, and deep integration with the Reactory ecosystem.

## Architecture Overview

The ReactoryForm component follows a modular architecture with clear separation of concerns:

### Core Component Structure
- **Main Component**: `ReactoryForm.tsx` - Orchestrates the entire form lifecycle
- **Type System**: `types.ts` - Comprehensive TypeScript definitions for all form-related interfaces
- **Hooks System**: `hooks/` - Modular hooks for different form functionalities
- **Data Managers**: `DataManagers/` - Pluggable data management strategies
- **Constants**: `constants.ts` - Default configurations and fallback schemas

### Hook-Based Architecture

The component uses a sophisticated hook system to manage different aspects of form functionality:

#### Core Hooks
- **`useFormDefinition`**: Manages form schema, UI schema, and form context
- **`useDataManager`**: Handles data operations (CRUD, validation, paging)
- **`useUISchema`**: Manages UI schema selection and customization
- **`useToolbar`**: Provides toolbar functionality with actions and buttons
- **`useHelp`**: Manages help modal and documentation
- **`useExports`**: Handles data export functionality
- **`useReports`**: Manages report generation and viewing
- **`useSchema`**: Manages schema loading and validation
- **`useContext`**: Provides form context and routing integration

#### Data Manager Hooks
- **`useGraphQLDataManager`**: GraphQL-based data operations
- **`useLocalStoreDataManager`**: Local storage data management
- **`useSocketDataManager`**: Real-time socket-based data
- **`useRESTDataManager`**: REST API data operations
- **`useGRPCDataManager`**: gRPC data operations

## Form Definition Structure

### Core Types

```typescript
interface ReactoryFormDefinitionHook<TData> {
  // Form metadata
  instanceId: string;
  FQN: string | Reactory.FQN;
  SIGN: string;
  form: Reactory.Forms.IReactoryForm;
  
  // Schema and UI
  schema: Reactory.Schema.AnySchema;
  uiSchema: Reactory.Schema.IFormUISchema;
  uiOptions: Reactory.Schema.IFormUIOptions;
  SchemaSelector: React.FC<{}>;
  
  // Data management
  formData: TData;
  isDataLoading: boolean;
  onChange: (data: TData, errors: any[], errorSchema: Reactory.Schema.IErrorSchema) => Promise<void>;
  onSubmit: (data: TData, errors: any[], errorSchema: Reactory.Schema.IErrorSchema) => Promise<void>;
  onError: (errors: any[], errorSchema: Reactory.Schema.IErrorSchema) => Promise<void>;
  
  // Validation and state
  validate: Reactory.Forms.SchemaFormValidationFunctionSync<TData> | Reactory.Forms.SchemaFormValidationFunctionAsync<TData>;
  errorSchema: Reactory.Schema.IErrorSchema;
  errors: any[];
  
  // UI components
  refresh: () => void;
  RefreshButton: React.FC<{}>;
  SubmitButton: React.FC<{}>;
  PagingWidget: React.FC<{}>;
}
```

### Form Properties

The component accepts these key properties:

```typescript
interface IReactoryFormProps<TData> {
  formId?: string | Reactory.FQN;           // Form identifier to load
  formDef?: Reactory.Forms.IReactoryForm;   // Direct form definition
  formData?: TData;                         // Initial form data
  watchList?: string[];                     // Properties to watch for changes
  mode?: "edit" | "view" | "create" | "delete";
  debug?: boolean;
  warning?: boolean;
  error?: boolean;
}
```

## Component Lifecycle

### 1. Initialization Phase
- Component mounts and registers for plugin load events
- Initializes dependency tracking for required components
- Loads form definition via `useFormDefinition` hook
- Sets up form context and routing integration

### 2. Dependency Resolution
- Tracks required components and plugins
- Updates state as dependencies become available
- Manages component registration and availability

### 3. Data Loading
- Uses appropriate data manager based on form configuration
- Handles initial data loading and validation
- Manages loading states and error handling

### 4. Rendering
- Renders form based on schema and UI schema
- Applies container type (div, card, paper, etc.)
- Positions toolbars (top, bottom, both)
- Handles busy states and progress indicators

### 5. Interaction Handling
- Manages form changes and validation
- Handles submissions and error processing
- Provides refresh and reset functionality

## UI Customization

### Container Types
The form can be rendered in different container types:
- `div` - Standard div container
- `article` - Semantic article container
- `section` - Semantic section container
- `card` - Material-UI Card component
- `grid` - Material-UI Grid component
- `paper` - Material-UI Paper component
- `paragraph` - HTML paragraph element
- `form` - HTML form element (default)

### Toolbar Positioning
- `top` - Toolbar above form
- `bottom` - Toolbar below form
- `both` - Toolbars above and below form

### UI Schema Options
```typescript
interface IFormUIOptions {
  componentType?: string;
  className?: string;
  style?: React.CSSProperties;
  toolbarPosition?: 'top' | 'bottom' | 'both';
  showSubmit?: boolean;
  showRefresh?: boolean;
  toolbarStyle?: React.CSSProperties;
}
```

## Data Management

### Data Manager Types
- **GraphQL**: Full GraphQL integration with queries and mutations
- **REST**: Standard REST API operations
- **Local Store**: Browser storage-based data management
- **Socket**: Real-time WebSocket data operations
- **gRPC**: Protocol buffer-based data operations

### Data Manager Features
- Automatic CRUD operations
- Real-time data synchronization
- Paging and pagination support
- Error handling and retry logic
- Data validation and transformation
- Optimistic updates

## Error Handling

### Error Types
- **Validation Errors**: Schema validation failures
- **Network Errors**: API communication issues
- **Runtime Errors**: JavaScript execution errors
- **GraphQL Errors**: GraphQL-specific errors

### Error Display
- Uses `ErrorList` component for error display
- Supports error message transformation
- Integrates with translation system
- Provides error recovery mechanisms

## Plugin System

### Component Dependencies
- Tracks required components via FQN (Fully Qualified Name)
- Automatically loads dependencies as they become available
- Updates form when new plugins are loaded
- Manages component registration and availability

### Plugin Integration
- Supports dynamic plugin loading
- Handles plugin lifecycle events
- Manages plugin dependencies
- Provides plugin configuration options

## Advanced Features

### Multi-tenancy Support
- Per-tenant form customization
- Tenant-specific UI schemas
- Tenant-aware data operations
- Multi-tenant context integration

### Real-time Updates
- WebSocket-based real-time data
- Live form updates
- Collaborative editing support
- Real-time validation

### Export and Reporting
- Data export functionality
- PDF report generation
- Custom export formats
- Scheduled report generation

### Help and Documentation
- Context-sensitive help
- Documentation integration
- Help modal system
- Tutorial and guidance support

## Performance Optimizations

### Lazy Loading
- Component dependencies loaded on-demand
- Schema loading optimization
- Data manager lazy initialization

### Caching
- Form definition caching
- Schema caching
- Data caching strategies
- Component caching

### Memoization
- Hook result memoization
- Component re-render optimization
- Expensive computation caching

## Usage Examples

### Basic Form
```tsx
<ReactoryForm
  formId="user.registration@1.0.0"
  formData={initialData}
  mode="create"
/>
```

### Advanced Form with Customization
```tsx
<ReactoryForm
  formDef={customFormDefinition}
  formData={userData}
  mode="edit"
  watchList={['email', 'phone']}
  debug={true}
/>
```

### Form with Custom Container
```tsx
<ReactoryForm
  formId="product.edit@1.0.0"
  formData={productData}
  uiOptions={{
    componentType: 'card',
    toolbarPosition: 'both',
    className: 'custom-form-class'
  }}
/>
```

## Current Limitations and Areas for Improvement

### Known Issues
1. **Type Safety**: Some TypeScript issues with complex type intersections
2. **Performance**: Large forms can have performance issues with complex schemas
3. **Error Handling**: Error recovery could be more robust
4. **Accessibility**: ARIA support needs improvement
5. **Mobile Responsiveness**: Some UI components need better mobile support

### Technical Debt
1. **Legacy Code**: Some deprecated patterns still in use
2. **Hook Complexity**: Some hooks are overly complex and could be simplified
3. **State Management**: Form state management could be more predictable
4. **Testing**: Comprehensive test coverage needed
5. **Documentation**: API documentation needs expansion

## Integration Points

### Reactory Ecosystem
- **Core API**: Deep integration with Reactory core
- **Plugin System**: Extensible plugin architecture
- **Routing**: React Router integration
- **State Management**: Context-based state management
- **Translation**: i18n integration

### External Dependencies
- **Material-UI**: UI component library
- **JSON Schema Form**: Form rendering engine
- **Apollo Client**: GraphQL client
- **Lodash**: Utility functions
- **React Router**: Routing library

---

For more details, see the code in `ReactoryForm.tsx`, `types.ts`, and the hooks directory.