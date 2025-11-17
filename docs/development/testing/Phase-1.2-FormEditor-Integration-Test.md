# Testing Enhanced FormEditor - Phase 1.2

## Overview
The enhanced FormEditor with JsonSchemaEditor integration is now ready for testing in the running PWA client.

## Components Available
1. **FormEditorEnhanced** - Enhanced editor with JsonSchemaEditor integration (in reactory-client-core plugin)
2. **JsonSchemaEditor** - Registered as `shared.JsonSchemaEditor` in PWA client

## Quick Test via Browser Console

Since the PWA client is running, you can test the enhanced FormEditor directly:

### Test 1: Verify JsonSchemaEditor Registration
```javascript
// Check if JsonSchemaEditor is registered
console.log('JsonSchemaEditor available:', 
  window.reactory?.api?.getComponent('shared', 'JsonSchemaEditor', '1.0.0')
);
```

### Test 2: Access Enhanced FormEditor
```javascript
// Check if FormEditorEnhanced is registered 
console.log('FormEditorEnhanced available:', 
  window.reactory?.api?.getComponent('reactory', 'FormEditorEnhanced', '1.0.0')
);
```

### Test 3: Load Enhanced FormEditor in Page
```javascript
// Create a test container and load the enhanced editor
const React = window.React;
const ReactDOM = window.ReactDOM;

// Get the component
const FormEditorEnhanced = window.reactory.api.getComponent('reactory', 'FormEditorEnhanced', '1.0.0');

if (FormEditorEnhanced) {
  // Create mount point
  const mountPoint = document.createElement('div');
  mountPoint.id = 'form-editor-enhanced-test';
  mountPoint.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: white;
    z-index: 9999;
    overflow: auto;
    padding: 20px;
  `;
  
  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ Close Test';
  closeBtn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 8px 16px;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    z-index: 10000;
  `;
  closeBtn.onclick = () => mountPoint.remove();
  mountPoint.appendChild(closeBtn);
  
  document.body.appendChild(mountPoint);
  
  // Render the enhanced editor
  const testElement = React.createElement(FormEditorEnhanced, {
    reactory: window.reactory.api,
    formData: {
      id: 'TestForm',
      title: 'Test Form',
      description: 'Testing enhanced form editor',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
          email: { type: 'string', format: 'email', title: 'Email' }
        }
      },
      uiSchema: {
        name: { 'ui:placeholder': 'Enter your name' },
        email: { 'ui:placeholder': 'Enter your email' }
      }
    }
  });
  
  ReactDOM.render(testElement, mountPoint);
  console.log('Enhanced FormEditor loaded! Use the X button to close.');
} else {
  console.error('FormEditorEnhanced not found');
}
```

## Expected Functionality

### Tab 1: General
- ✅ Form configuration fields (ID, title, description, etc.)
- ✅ ReactoryForm integration working
- ✅ Data binding to form state

### Tab 2: Schema
- ✅ JsonSchemaEditor loads with current schema
- ✅ JSON validation feedback
- ✅ Real-time schema updates
- ✅ Format and validate buttons work
- ✅ Validation status indicator in tab

### Tab 3: UI Schema  
- ✅ JsonSchemaEditor loads with current UI schema
- ✅ JSON validation feedback
- ✅ Real-time UI schema updates
- ✅ Format and validate buttons work
- ✅ Validation status indicator in tab

### Tab 4: Preview
- ✅ Live form preview using current schemas
- ✅ Error handling for invalid schemas
- ✅ Clear feedback when schemas have errors
- ✅ Dynamic form rendering when schemas are valid

## Test Scenarios

### Scenario 1: Basic JSON Editing
1. Open enhanced FormEditor
2. Go to Schema tab
3. Edit the JSON schema
4. Verify validation feedback
5. Check if preview updates

### Scenario 2: Error Handling
1. Enter invalid JSON in Schema tab
2. Verify error indicators in tab header
3. Check validation messages
4. Fix errors and verify preview works

### Scenario 3: Complete Form Creation
1. Set form details in General tab
2. Create data schema in Schema tab
3. Create UI schema in UI Schema tab
4. Preview the complete form

### Sample Test Data

#### Valid Schema for Testing:
```json
{
  "type": "object",
  "title": "User Registration",
  "properties": {
    "firstName": {
      "type": "string",
      "title": "First Name",
      "minLength": 2
    },
    "lastName": {
      "type": "string", 
      "title": "Last Name",
      "minLength": 2
    },
    "email": {
      "type": "string",
      "format": "email",
      "title": "Email Address"
    },
    "age": {
      "type": "number",
      "title": "Age",
      "minimum": 18,
      "maximum": 120
    },
    "preferences": {
      "type": "array",
      "title": "Preferences",
      "items": {
        "type": "string",
        "enum": ["email", "sms", "phone"]
      }
    }
  },
  "required": ["firstName", "lastName", "email"]
}
```

#### Corresponding UI Schema:
```json
{
  "ui:field": "GridLayout",
  "ui:grid-layout": [
    {
      "firstName": { "xs": 12, "md": 6 },
      "lastName": { "xs": 12, "md": 6 }
    },
    {
      "email": { "xs": 12, "md": 8 },
      "age": { "xs": 12, "md": 4 }
    },
    {
      "preferences": { "xs": 12 }
    }
  ],
  "firstName": {
    "ui:placeholder": "Enter your first name"
  },
  "lastName": {
    "ui:placeholder": "Enter your last name"
  },
  "email": {
    "ui:help": "We'll never share your email address"
  },
  "preferences": {
    "ui:widget": "checkboxes"
  }
}
```

## Success Criteria

### Phase 1.2 Complete When:
- ✅ Enhanced FormEditor loads without errors
- ✅ JsonSchemaEditor integrates properly
- ✅ Schema editing works with real-time validation
- ✅ UI Schema editing works with real-time validation
- ✅ Preview tab shows live form updates
- ✅ Validation indicators work in tab headers
- ✅ Error handling provides clear feedback
- ✅ All Material UI theming is consistent

## Troubleshooting

### If Enhanced FormEditor Doesn't Load:
1. Check browser console for component registration errors
2. Verify `shared.JsonSchemaEditor` is registered
3. Check if reactory-client-core plugin loaded properly

### If JsonSchemaEditor Has Issues:
1. Verify ReactQuill is available in running client
2. Check Material UI components are accessible
3. Test JsonSchemaEditor independently first

### If Preview Doesn't Work:
1. Check schema validation status
2. Verify ReactoryForm component is available
3. Check for JSON parsing errors in console

## Next Steps

After Phase 1.2 testing confirms functionality:
1. **Phase 1.3**: Add advanced features (templates, import/export)
2. **Phase 2**: Performance optimization and user experience improvements
3. **Phase 3**: Full integration with existing form management workflows

## Quick Validation Commands

```javascript
// Test all components are available
console.log('Components Check:', {
  React: !!window.React,
  Reactory: !!window.reactory,
  JsonSchemaEditor: !!window.reactory?.api?.getComponent('shared', 'JsonSchemaEditor', '1.0.0'),
  FormEditorEnhanced: !!window.reactory?.api?.getComponent('reactory', 'FormEditorEnhanced', '1.0.0'),
  ReactoryForm: !!window.reactory?.api?.getComponent('core', 'ReactoryForm', '1.0.0')
});
```
