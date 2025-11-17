# Storybook Reactory Setup

## Overview
Storybook needs to provide the same dependencies that your main application provides through the `ReactoryProvider` wrapper. This setup ensures that components can render correctly in Storybook with all the necessary context.

## 🔧 Provider Structure

### **Main Application Structure:**
```typescript
<Router>
  <ThemeProvider theme={theme}>
    <Provider store={store}>
      <ApolloProvider client={reactory.client}>
        <ReactoryProvider reactory={reactory}>
          {/* Your components */}
        </ReactoryProvider>
      </ApolloProvider>
    </Provider>
  </ThemeProvider>
</Router>
```

### **Storybook Structure:**
```typescript
<ReactoryDecorator>
  <ThemeWrapper showThemeSelector={false}>
    <CssBaseline />
    <Story />
  </ThemeWrapper>
</ReactoryDecorator>
```

## 📁 Files Created/Modified

### **1. `.storybook/ReactoryDecorator.tsx`**
- **Purpose**: Provides mock Reactory SDK and all necessary providers
- **Features**:
  - Mock ReactoryApi with all required methods
  - Redux store provider
  - Apollo client provider
  - React Router provider
  - Material-UI theme provider

### **2. `.storybook/preview.js`**
- **Purpose**: Updated to include ReactoryDecorator
- **Changes**: Added ReactoryDecorator as the outermost decorator

## 🎯 Mock ReactoryApi Features

### **Core Properties:**
- `$version`: Storybook version identifier
- `$user`: Mock user with admin roles
- `$windowSize`: Mock window dimensions
- `muiTheme`: Material-UI theme instance

### **Mock Methods:**
- **Logging**: `log`, `debug`, `warning`, `error`, `info`
- **Component Registry**: `getComponent`, `registerComponent`
- **User Management**: `getUser`, `isAnon`, `hasRole`
- **Utilities**: Template processing, deep cloning
- **Event System**: `on`, `off`, `emit`
- **Form Management**: Form schemas and registration
- **Theme**: `getTheme`
- **API**: Mock status responses
- **Notifications**: `createNotification`

### **Mock Store:**
- Uses the same `configureStore` as the main app
- Provides Redux context for components

### **Mock Apollo Client:**
- Provides GraphQL context
- Returns empty data for queries/mutations

## 📝 Usage in Stories

### **Components with Reactory Dependencies:**
Components that use `useReactory()` or `withReactory()` will now work correctly:

```typescript
import { useReactory } from '@reactory/client-core/api/ApiProvider';

const MyComponent = () => {
  const reactory = useReactory();
  
  // This will now work in Storybook
  reactory.log('Component rendered');
  
  return <div>My Component</div>;
};
```

### **Components with Router Dependencies:**
Components that use React Router hooks will work:

```typescript
import { useNavigate, useLocation } from 'react-router-dom';

const MyComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Router context is provided
  return <div>Router Component</div>;
};
```

### **Components with Redux Dependencies:**
Components that use Redux will work:

```typescript
import { useSelector, useDispatch } from 'react-redux';

const MyComponent = () => {
  const dispatch = useDispatch();
  const state = useSelector(state => state);
  
  // Redux context is provided
  return <div>Redux Component</div>;
};
```

## 🔍 Debugging

### **Console Output:**
The mock ReactoryApi logs all method calls to the console:
- `[Reactory] Getting component: component.fqn`
- `[Reactory] Notification: message`
- `[Reactory] Listening to event: eventName`

### **Common Issues:**

1. **Component Not Found:**
   - Mock `getComponent` returns `null`
   - Components should be mocked in individual stories

2. **Missing Dependencies:**
   - All providers are included in ReactoryDecorator
   - Check that imports use the correct path mappings

3. **Theme Issues:**
   - Material-UI theme is provided
   - ThemeWrapper provides additional theme options

## 🎨 Customizing the Mock

### **Modifying User Data:**
```typescript
// In ReactoryDecorator.tsx
$user: {
  id: 'custom-user',
  email: 'custom@example.com',
  roles: ['CUSTOM_ROLE']
}
```

### **Adding Custom Methods:**
```typescript
// In createMockReactoryApi()
customMethod: (param: any) => {
  console.log('Custom method called:', param);
  return 'custom result';
}
```

### **Mocking Specific Components:**
```typescript
// In individual stories
const MockComponent = () => <div>Mocked Component</div>;

// Register in story
const reactory = useReactory();
reactory.registerComponent('namespace', 'name', '1.0.0', MockComponent);
```

## ✅ Benefits

1. **Complete Context**: All application dependencies are provided
2. **Realistic Testing**: Components behave as they would in the real app
3. **Easy Debugging**: Console logs show what's happening
4. **Flexible Mocking**: Easy to customize for specific stories
5. **Consistent Environment**: Same providers as the main application

## 📋 Next Steps

1. **Test Components**: Verify that components render correctly
2. **Add Custom Mocks**: Create specific mocks for complex components
3. **Update Stories**: Update existing stories to use the new context
4. **Document Patterns**: Document common patterns for story creation

## 🔧 Configuration Files

### **Files Modified:**
- `.storybook/preview.js` - Added ReactoryDecorator
- `.storybook/ReactoryDecorator.tsx` - Created new decorator

### **Dependencies Provided:**
- React Router (BrowserRouter)
- Redux (Provider + store)
- Apollo Client (ApolloProvider)
- Material-UI (ThemeProvider + CssBaseline)
- Reactory SDK (ReactoryProvider)

This setup ensures that your components have access to all the same dependencies they would have in the main application, making Storybook a realistic testing environment for your Reactory components. 