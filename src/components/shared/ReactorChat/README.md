# ReactorChat Components

This directory contains the ReactorChat components for the Reactory platform.

## Components

### ReactorChat
The main chat component that provides AI-powered conversation capabilities.

### ReactorChatButton
A button component that opens a slide-out panel containing the ReactorChat component.

## ReactorChatButton

The `ReactorChatButton` component provides a convenient way to integrate the ReactorChat functionality into your application with a slide-out panel interface.

### Features

- **Flexible Button Types**: Supports both standard buttons and Floating Action Buttons (FAB)
- **Configurable Position**: Slide-out panel can appear from the left or right
- **Responsive Design**: Automatically adjusts to full width on mobile devices
- **Customizable Styling**: Full control over button appearance and behavior
- **Props Pass-through**: All props are passed to the underlying ReactorChat component

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fab` | `boolean` | `false` | Whether to render as a Floating Action Button |
| `position` | `'left' \| 'right'` | `'right'` | Position of the slide-out panel |
| `width` | `number` | `400` | Width of the slide-out panel (ignored on mobile) |
| `buttonText` | `string` | `'Chat'` | Button text (only used when `fab` is false) |
| `icon` | `string` | `'chat'` | Material-UI icon name |
| `variant` | `'text' \| 'outlined' \| 'contained'` | `'contained'` | Button variant |
| `color` | `'primary' \| 'secondary' \| 'error' \| 'info' \| 'success' \| 'warning'` | `'primary'` | Button color |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Button size |
| `className` | `string` | - | Additional CSS classes |
| `style` | `React.CSSProperties` | - | Additional CSS styles |
| `chatProps` | `any` | `{}` | Props to pass to the ReactorChat component |

### Usage Examples

#### Basic Standard Button
```tsx
import { ReactorChatButton } from './components/shared/ReactorChat';

<ReactorChatButton
  buttonText="Open Chat"
  icon="chat"
/>
```

#### Floating Action Button
```tsx
<ReactorChatButton
  fab={true}
  icon="chat"
  position="left"
  width={500}
/>
```

#### Custom Styled Button
```tsx
<ReactorChatButton
  buttonText="Support Chat"
  icon="support_agent"
  variant="outlined"
  color="secondary"
  style={{
    borderRadius: '25px',
    textTransform: 'none',
    fontWeight: 'bold'
  }}
/>
```

#### With Custom Chat Props
```tsx
<ReactorChatButton
  buttonText="AI Assistant"
  icon="smart_toy"
  chatProps={{
    formData: { 
      userId: '123',
      context: 'support'
    }
  }}
/>
```

#### Fixed Position FAB
```tsx
<ReactorChatButton
  fab={true}
  icon="psychology"
  color="warning"
  style={{
    position: 'fixed',
    bottom: 20,
    right: 20,
    zIndex: 1000
  }}
/>
```

### Responsive Behavior

- On desktop: Uses the specified `width` prop
- On mobile: Automatically uses full viewport width (`100vw`)
- The component automatically detects screen size using Material-UI's `useMediaQuery` hook

### Styling

The component uses Material-UI's theming system and automatically adapts to your application's theme. The slide-out panel includes:

- A header with a close button
- Proper shadows and borders
- Responsive layout
- Smooth animations

### Integration

The component is designed to work seamlessly with the existing Reactory platform:

- Uses the `useReactory` hook for platform integration
- Leverages Material-UI components for consistent styling
- Supports all ReactorChat features and configurations
- Maintains proper TypeScript typing

### Example Component

See `ReactorChatButtonExample.tsx` for a comprehensive demonstration of all available features and configurations. 