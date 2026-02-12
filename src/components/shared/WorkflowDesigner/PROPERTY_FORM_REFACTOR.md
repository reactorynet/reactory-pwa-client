# Property Form Refactoring - ReactoryForm Integration

## Overview

Refactored the PropertyForm component to use the ReactoryForm component instead of custom rendering logic. This provides a consistent, schema-driven approach to rendering step properties with full validation support.

## Changes Made

### 1. Updated StepDefinition Type

The `StepDefinition` interface already included `uiSchema` field (line 175 in types.ts):

```typescript
export interface StepDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  icon?: string;
  color?: string;
  inputPorts: PortTemplate[];
  outputPorts: PortTemplate[];
  propertySchema: PropertySchema;  // JSON Schema for properties
  uiSchema?: Record<string, unknown>;  // UI Schema for ReactoryForm
  defaultProperties: Record<string, unknown>;
  tags?: string[];
  rendering?: StepRenderConfig;
}
```

### 2. Refactored PropertyForm Component

**Before**: Custom rendering logic with manual field mapping
**After**: ReactoryForm with schema-driven rendering

Key improvements:
- Uses `stepDefinition.propertySchema` as the form schema
- Uses `stepDefinition.uiSchema` for UI customization
- Automatic field type detection and widget selection
- Built-in validation error display
- Consistent form rendering across all step types

### 3. Added uiSchema to Step Definitions

Added `uiSchema` to step definitions for enhanced form rendering:

#### GraphQL Step
```typescript
uiSchema: {
  'ui:order': ['name', 'endpoint', 'operation', 'query', 'headers', 'timeout'],
  query: {
    'ui:widget': 'textarea',
    'ui:options': {
      rows: 10
    }
  },
  headers: {
    'ui:widget': 'textarea',
    'ui:options': {
      rows: 3
    },
    'ui:help': 'JSON object with header key-value pairs'
  }
}
```

#### Start Step
```typescript
uiSchema: {
  name: {
    'ui:autofocus': true,
    'ui:help': 'Enter a descriptive name for the start step'
  }
}
```

## How It Works

### Form Schema Flow

1. **Schema Definition** (in step definition file)
   ```typescript
   propertySchema: {
     type: 'object',
     properties: {
       name: { type: 'string', title: 'Step Name' },
       endpoint: { type: 'string', title: 'Endpoint URL' },
       // ... more properties
     },
     required: ['name', 'endpoint']
   }
   ```

2. **UI Schema** (optional customization)
   ```typescript
   uiSchema: {
     'ui:order': ['name', 'endpoint'],
     endpoint: {
       'ui:widget': 'uri',
       'ui:placeholder': 'https://api.example.com/graphql'
     }
   }
   ```

3. **Form Data** (current step properties)
   ```typescript
   formData: {
     name: step.name,
     ...step.properties
   }
   ```

4. **ReactoryForm** renders the complete form with validation

### Auto-Detection Features

The PropertyForm includes intelligent auto-detection:

```typescript
// Automatically use textarea for certain fields
if (key.toLowerCase().includes('query') || 
    key.toLowerCase().includes('script') || 
    key.toLowerCase().includes('body')) {
  uiSchema[key] = { 'ui:widget': 'textarea', 'ui:options': { rows: 5 } };
}

// Automatically handle object/JSON fields
if (propSchema.type === 'object') {
  uiSchema[key] = { 
    'ui:widget': 'textarea', 
    'ui:help': 'JSON object' 
  };
}
```

## Benefits

### 1. Consistency
- All step property forms use the same rendering engine
- Consistent validation and error display
- Uniform user experience across different step types

### 2. Maintainability
- Schema changes automatically reflect in the UI
- No custom field rendering logic to maintain
- Centralized validation rules

### 3. Extensibility
- Easy to add new field types through uiSchema
- Support for custom widgets
- Flexible field ordering and grouping

### 4. Validation
- Automatic schema validation
- Real-time validation feedback
- Error messages from schema definitions

### 5. Less Code
- Removed ~200 lines of custom field rendering
- No need for PropertyField component
- Simplified property change handling

## UI Schema Options

### Common UI Schema Properties

```typescript
{
  'ui:widget': 'text' | 'textarea' | 'select' | 'checkbox' | 'uri' | 'email' | 'password',
  'ui:placeholder': 'Enter value...',
  'ui:help': 'Help text displayed below field',
  'ui:autofocus': true,
  'ui:disabled': false,
  'ui:readonly': false,
  'ui:options': {
    rows: 5,  // For textarea
    label: true,  // Show/hide label
    inline: false  // Inline radio/checkbox
  }
}
```

### Field Ordering

```typescript
uiSchema: {
  'ui:order': ['name', 'type', 'config', '*'],  // * = remaining fields
}
```

### Conditional Display

```typescript
uiSchema: {
  timeout: {
    'ui:help': 'Only applies if retries are enabled'
  }
}
```

### Custom Widgets

```typescript
uiSchema: {
  color: {
    'ui:widget': 'color'
  },
  schedule: {
    'ui:widget': 'cron'
  }
}
```

## Migration Guide

### For Existing Step Definitions

1. **Keep** `propertySchema` as-is (it's the JSON Schema)
2. **Add** `uiSchema` object for UI customization (optional)
3. **Test** the form in the designer

### Example Migration

**Before** (no uiSchema):
```typescript
{
  propertySchema: {
    type: 'object',
    properties: {
      query: { type: 'string', title: 'Query' }
    }
  }
}
```

**After** (with uiSchema):
```typescript
{
  propertySchema: {
    type: 'object',
    properties: {
      query: { type: 'string', title: 'Query' }
    }
  },
  uiSchema: {
    query: {
      'ui:widget': 'textarea',
      'ui:options': { rows: 10 }
    }
  }
}
```

### For New Step Definitions

Always include both `propertySchema` and `uiSchema`:

```typescript
export const MyStepDefinition: StepDefinition = {
  // ... basic properties
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Descriptive name for this step'
      },
      config: {
        type: 'object',
        title: 'Configuration'
      }
    },
    required: ['name']
  },
  uiSchema: {
    'ui:order': ['name', 'config'],
    config: {
      'ui:widget': 'textarea',
      'ui:help': 'JSON configuration object'
    }
  },
  defaultProperties: {
    name: 'My Step',
    config: {}
  }
};
```

## Error Handling

### Validation Errors

ReactoryForm automatically displays validation errors from the schema:

```typescript
// In schema
properties: {
  endpoint: {
    type: 'string',
    format: 'uri',  // Validates URL format
    minLength: 1
  }
}
```

Error display is automatic - no custom code needed.

### Custom Errors

Custom validation errors from the workflow engine are passed through:

```typescript
formErrors = errors.map(error => ({
  property: `.${error.path.join('.')}`,
  message: error.message,
  stack: error.message
}));
```

## Testing

### Visual Testing

1. Open workflow designer
2. Add a step to canvas
3. Select the step
4. Properties panel should show ReactoryForm
5. Verify:
   - All fields render correctly
   - Validation works
   - Changes save properly
   - UI widgets match uiSchema

### Unit Testing

```typescript
describe('PropertyForm with ReactoryForm', () => {
  it('renders form with schema', () => {
    const { getByLabelText } = render(
      <PropertyForm
        step={mockStep}
        stepDefinition={mockStepDefinition}
        onPropertyChange={jest.fn()}
      />
    );
    
    expect(getByLabelText('Step Name')).toBeInTheDocument();
  });
  
  it('calls onChange when field changes', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <PropertyForm
        step={mockStep}
        stepDefinition={mockStepDefinition}
        onPropertyChange={onChange}
      />
    );
    
    fireEvent.change(getByLabelText('Step Name'), { 
      target: { value: 'New Name' } 
    });
    
    expect(onChange).toHaveBeenCalledWith('name', 'New Name');
  });
});
```

## Troubleshooting

### Form Not Rendering

**Issue**: "ReactoryForm component not available"
**Solution**: Ensure `core.ReactoryForm@1.0.0` is registered in component registry

### Validation Not Working

**Issue**: Errors not showing
**Solution**: Check that `propertySchema` has proper validation rules (required, min/max, format, etc.)

### Field Not Using Custom Widget

**Issue**: Field renders as text input instead of custom widget
**Solution**: Add widget to `uiSchema`:
```typescript
uiSchema: {
  myField: { 'ui:widget': 'textarea' }
}
```

### Changes Not Saving

**Issue**: Form changes don't update step
**Solution**: Check `handleFormChange` callback is properly calling `onPropertyChange` for each changed field

## Future Enhancements

Potential improvements:
- **Field Grouping**: Use `ui:fieldset` for logical grouping
- **Conditional Fields**: Show/hide fields based on other field values
- **Custom Validators**: Add custom validation functions
- **Field Templates**: Reusable field configurations
- **Async Validation**: Validate against external services
- **Auto-save**: Debounced auto-save on field blur

## Files Modified

- `/components/Panels/PropertyForm.tsx` - Complete refactor to use ReactoryForm
- `/components/Steps/GraphQL/definition.ts` - Added uiSchema
- `/components/Steps/Start/definition.ts` - Added uiSchema

## Files Deprecated

- `/components/Panels/PropertyField.tsx` - No longer needed (can be removed after migration is verified)

## Dependencies

- `core.ReactoryForm@1.0.0` - Required component from Reactory registry
- React JSON Schema Form - Underlying form library (via ReactoryForm)
