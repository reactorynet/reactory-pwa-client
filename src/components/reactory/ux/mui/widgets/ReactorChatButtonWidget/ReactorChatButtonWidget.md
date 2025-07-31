# ReactorChatButtonWidget

A Reactory widget that wraps the `ReactorChatButton` component, allowing it to be used in forms and schemas with configuration via `uiSchema`, `schema`, and `formData`.

## Overview

The `ReactorChatButtonWidget` provides a convenient way to integrate AI chat functionality into Reactory forms. It renders either a standard button or a Floating Action Button (FAB) that opens a slide-out panel containing the full `ReactorChat` component.

## Features

- **Form Integration**: Seamlessly integrates with Reactory's form system
- **Flexible Configuration**: All properties configurable via `uiSchema` options
- **Data Binding**: Receives values from `formData` and passes them to the chat component
- **Conditional Rendering**: Supports conditional visibility based on form data
- **Responsive Design**: Automatically adapts to mobile and desktop layouts
- **Custom Styling**: Full control over button appearance and behavior

## Usage

### Basic Usage

```json
{
  "schema": {
    "type": "object",
    "properties": {
      "chatButton": {
        "type": "string",
        "title": "Chat Support"
      }
    }
  },
  "uiSchema": {
    "chatButton": {
      "ui:widget": "ReactorChatButtonWidget",
      "ui:options": {
        "buttonText": "Get Help",
        "icon": "help",
        "color": "primary"
      }
    }
  }
}
```

### Floating Action Button

```json
{
  "uiSchema": {
    "chatButton": {
      "ui:widget": "ReactorChatButtonWidget",
      "ui:options": {
        "fab": true,
        "position": "left",
        "width": 500,
        "icon": "support_agent",
        "color": "secondary",
        "style": {
          "position": "fixed",
          "bottom": "20px",
          "right": "20px",
          "zIndex": 1000
        }
      }
    }
  }
}
```

### Conditional Rendering

```json
{
  "uiSchema": {
    "chatButton": {
      "ui:widget": "ReactorChatButtonWidget",
      "ui:options": {
        "fab": true,
        "icon": "smart_toy",
        "color": "success",
        "showIf": "{{userType}} === 'premium' || {{userType}} === 'enterprise'",
        "chatProps": {
          "formData": {
            "userType": "{{userType}}",
            "context": "ai_assistant"
          }
        }
      }
    }
  }
}
```

## Configuration Options

### uiSchema Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fab` | `boolean` | `false` | Whether to render as a Floating Action Button |
| `position` | `'left' \| 'right'` | `'right'` | Position of the slide-out panel |
| `width` | `number` | `400` | Width of the slide-out panel in pixels |
| `buttonText` | `string` | `'Chat'` | Text to display on the button (ignored for FAB) |
| `icon` | `string` | `'chat'` | Material-UI icon name |
| `variant` | `'text' \| 'outlined' \| 'contained'` | `'contained'` | Button variant style |
| `color` | `'primary' \| 'secondary' \| 'error' \| 'info' \| 'success' \| 'warning'` | `'primary'` | Button color theme |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Button size |
| `className` | `string` | `''` | Additional CSS classes |
| `style` | `object` | `{}` | Additional CSS styles |
| `chatProps` | `object` | `{}` | Properties to pass to ReactorChat component |
| `visible` | `boolean` | `true` | Whether the widget should be visible |
| `showIf` | `string` | - | Template condition for conditional visibility |
| `passFormDataAsChatProps` | `boolean` | `true` | Whether to pass formData to ReactorChat |

### FormData Integration

The widget automatically integrates with form data:

- **Direct Properties**: If `formData` contains properties that match widget options, they will be used
- **Style Merging**: `formData.style` is merged with the widget's style options
- **Chat Props**: Common chat-related properties from `formData` are passed to the chat component
- **Full Data Pass-through**: If `passFormDataAsChatProps` is true, the entire `formData` object is passed as `chatProps.formData`

### Conditional Rendering

Use the `showIf` option with template syntax for conditional visibility:

```json
{
  "ui:options": {
    "showIf": "{{userType}} === 'premium'",
    "showIf": "{{isLoggedIn}} && {{hasPermission}}",
    "showIf": "{{formData.status}} !== 'completed'"
  }
}
```

## Advanced Examples

### Form-Integrated Chat

```json
{
  "schema": {
    "type": "object",
    "properties": {
      "userId": { "type": "string", "title": "User ID" },
      "issueType": { 
        "type": "string", 
        "title": "Issue Type",
        "enum": ["technical", "billing", "feature_request"]
      },
      "description": { "type": "string", "title": "Description" },
      "supportChat": { "type": "string", "title": "Need Help?" }
    }
  },
  "uiSchema": {
    "userId": { "ui:widget": "TextWidget" },
    "issueType": { "ui:widget": "SelectWidget" },
    "description": { "ui:widget": "TextareaWidget" },
    "supportChat": {
      "ui:widget": "ReactorChatButtonWidget",
      "ui:options": {
        "buttonText": "Get AI Support",
        "icon": "support_agent",
        "color": "warning",
        "passFormDataAsChatProps": true,
        "chatProps": {
          "formData": {
            "context": "support_ticket",
            "autoFill": true
          }
        }
      }
    }
  }
}
```

### Multiple Chat Buttons

```json
{
  "uiSchema": {
    "generalChat": {
      "ui:widget": "ReactorChatButtonWidget",
      "ui:options": {
        "buttonText": "General Chat",
        "icon": "chat",
        "color": "primary",
        "chatProps": { "formData": { "context": "general" } }
      }
    },
    "technicalSupport": {
      "ui:widget": "ReactorChatButtonWidget",
      "ui:options": {
        "buttonText": "Tech Support",
        "icon": "build",
        "color": "secondary",
        "chatProps": { "formData": { "context": "technical_support" } }
      }
    },
    "salesInquiry": {
      "ui:widget": "ReactorChatButtonWidget",
      "ui:options": {
        "buttonText": "Sales Chat",
        "icon": "shopping_cart",
        "color": "success",
        "chatProps": { "formData": { "context": "sales" } }
      }
    }
  }
}
```

## Integration with Reactory

The widget is designed to work seamlessly with the Reactory platform:

- **Component Registry**: Automatically registered in the widget index
- **Theme Integration**: Uses the application's Material-UI theme
- **Internationalization**: Supports i18n through the ReactorChat component
- **TypeScript Support**: Fully typed with proper interfaces
- **Error Handling**: Graceful error handling for template evaluation and component rendering

## Best Practices

1. **Use Semantic Icons**: Choose appropriate Material-UI icons for your use case
2. **Responsive Design**: Consider mobile users when setting panel widths
3. **Conditional Logic**: Use `showIf` for dynamic visibility based on user context
4. **Data Context**: Pass relevant form data to provide context to the AI assistant
5. **Accessibility**: Ensure proper ARIA labels and keyboard navigation
6. **Performance**: Use `visible: false` instead of conditional rendering for frequently changing states

## Troubleshooting

### Common Issues

1. **Widget Not Rendering**: Check that `visible` is not set to `false` and `showIf` conditions are met
2. **Style Not Applied**: Ensure `style` object is properly formatted and CSS properties are valid
3. **Chat Props Not Passing**: Verify `passFormDataAsChatProps` setting and `chatProps` structure
4. **Template Errors**: Check `showIf` template syntax and ensure referenced variables exist

### Debug Tips

- Use browser developer tools to inspect the rendered component
- Check the Reactory console for template evaluation errors
- Verify that the ReactorChatButton component is properly imported
- Test with simple configurations before adding complex logic

## See Also

- [ReactorChatButton Component](../shared/ReactorChat/ReactorChatButton.tsx)
- [ReactorChat Component](../shared/ReactorChat/ReactorChat.tsx)
- [Widget Examples](./ReactorChatButtonWidget.example.json)
- [Reactory Widget System Documentation](../../../../docs/development/widgets.md) 