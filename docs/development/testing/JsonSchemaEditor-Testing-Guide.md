# Testing JsonSchemaEditor in Running PWA Client

## Overview
The JsonSchemaEditor component has been created and is ready for testing in the running PWA client. This guide shows you how to test it.

## Components Created
1. **JsonSchemaEditor**: Main editor component with JSON validation and formatting
2. **JsonSchemaEditorWidget**: Wrapper for use as a Reactory form widget
3. **JsonSchemaEditorTest**: Standalone test component
4. **Test Form Definition**: JSON form definition for testing

## Files Location
- `/src/components/shared/JsonSchemaEditor/JsonSchemaEditor.tsx` - Main component
- `/src/components/shared/JsonSchemaEditor/JsonSchemaEditorWidget.tsx` - Form widget wrapper
- `/src/components/shared/JsonSchemaEditorTest/JsonSchemaEditorTest.tsx` - Standalone test
- `/docs/development/test-forms/JsonSchemaEditorTestForm.json` - Test form definition

## Testing Methods

### Method 1: Through Reactory Component System (Recommended)

Since the PWA client is running, you can test the component through the browser console:

1. **Open Browser Developer Tools** in the running PWA client
2. **Navigate to Console tab**
3. **Import and test the component**:

```javascript
// Access the JsonSchemaEditor component
const JsonSchemaEditor = await import('/src/components/shared/JsonSchemaEditor/JsonSchemaEditor.tsx');

// Create a test container
const testContainer = document.createElement('div');
testContainer.id = 'json-schema-test';
document.body.appendChild(testContainer);

// Test basic functionality
console.log('JsonSchemaEditor loaded:', JsonSchemaEditor.default);
```

### Method 2: Through React DevTools

1. **Install React Developer Tools** (if not already installed)
2. **Open React DevTools** in the running application
3. **Find any existing React component** in the component tree
4. **Use the console to import and render the test component**:

```javascript
// Import React and the test component
const React = window.React;
const ReactDOM = window.ReactDOM;

// Import our test component
import('/src/components/shared/JsonSchemaEditorTest/JsonSchemaEditorTest.tsx')
  .then(module => {
    const TestComponent = module.default;
    
    // Create a mount point
    const mountPoint = document.createElement('div');
    mountPoint.id = 'json-editor-test';
    document.body.appendChild(mountPoint);
    
    // Render the test component
    ReactDOM.render(React.createElement(TestComponent), mountPoint);
  });
```

### Method 3: Through Form System (If Reactory Forms Available)

If the running client has access to form creation/testing:

1. **Use the test form definition** from `/docs/development/test-forms/JsonSchemaEditorTestForm.json`
2. **Load it into the form system** (depends on your current client setup)
3. **The form will render JsonSchemaEditor instances** for testing

### Method 4: Direct Component Testing

Add this to any existing component file temporarily for testing:

```tsx
import JsonSchemaEditor from '../shared/JsonSchemaEditor/JsonSchemaEditor';

// Add to render method of any existing component:
<JsonSchemaEditor
  value='{"type": "string", "title": "Test"}'
  onChange={(value) => console.log('Changed:', value)}
  label="Test JSON Schema Editor"
  height={300}
  showValidation={true}
/>
```

## Expected Features to Test

### 1. Basic Functionality
- ✅ Component renders without errors
- ✅ Accepts JSON input
- ✅ Shows validation errors for invalid JSON
- ✅ Shows success message for valid JSON

### 2. JSON Formatting
- ✅ Format button works (auto-indentation)
- ✅ Auto-format on blur (if enabled)
- ✅ Preserves valid JSON structure

### 3. Validation Features
- ✅ Detects JSON syntax errors
- ✅ Validates JSON Schema structure
- ✅ Shows clear error messages
- ✅ Real-time validation feedback

### 4. UI/UX Features
- ✅ Material UI theming works
- ✅ Responsive design
- ✅ Monospace font for code editing
- ✅ Toolbar buttons functional
- ✅ Dark/light mode support

### 5. Integration Features
- ✅ onChange callback works
- ✅ onValidationChange callback works
- ✅ Props are respected (height, readOnly, etc.)
- ✅ Widget wrapper works with form system

## Sample Test Data

Use these JSON snippets to test the editor:

### Valid JSON Schema:
```json
{
  "type": "object",
  "title": "User Registration",
  "properties": {
    "username": {
      "type": "string",
      "title": "Username",
      "minLength": 3
    },
    "email": {
      "type": "string",
      "format": "email",
      "title": "Email Address"
    },
    "age": {
      "type": "number",
      "minimum": 18,
      "maximum": 120
    }
  },
  "required": ["username", "email"]
}
```

### Invalid JSON (for testing error handling):
```
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    }
  // Missing closing brace
```

### Complex Schema (for testing performance):
```json
{
  "type": "object",
  "title": "Complex Form",
  "properties": {
    "personalInfo": {
      "type": "object",
      "properties": {
        "firstName": {"type": "string"},
        "lastName": {"type": "string"}
      }
    },
    "preferences": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "category": {"type": "string"},
          "value": {"type": "boolean"}
        }
      }
    }
  }
}
```

## Troubleshooting

### If Component Doesn't Load:
1. Check browser console for import errors
2. Verify ReactQuill is available in the running app
3. Check Material UI components are accessible

### If Styling Looks Wrong:
1. Verify Material UI theme is applied
2. Check for CSS conflicts
3. Ensure ReactQuill CSS is loaded

### If Validation Doesn't Work:
1. Check console for JavaScript errors
2. Verify JSON.parse is working
3. Test with simple valid/invalid JSON

## Next Steps

Once testing confirms the component works properly:

1. **Integrate with FormEditor** - Replace existing schema editing in FormEditor component
2. **Add Advanced Features** - Schema templates, import/export, etc.
3. **Performance Optimization** - If needed based on testing results
4. **Documentation** - Create user guide and API documentation

## Success Criteria

The component is ready for Phase 1.2 integration when:
- ✅ Renders correctly in running PWA client
- ✅ JSON validation works properly
- ✅ Material UI theming is consistent
- ✅ No console errors during normal usage
- ✅ Performance is acceptable for typical schema sizes
