# ReactoryCoreDialog

A flexible, feature-rich dialog component for the Reactory platform with responsive design, configurable layouts, and enhanced UX features.

## Features

- **Responsive Design**: Automatic full-screen on mobile devices
- **Configurable AppBar**: Optional header with title and close button
- **Breadcrumb Navigation**: Support for navigation trails
- **Event-Driven Closing**: Subscribe to custom events for auto-close
- **Loading States**: Built-in loading overlay with customizable message
- **Action Footer**: Sticky footer for action buttons
- **Flexible Padding**: Control content padding or disable it entirely
- **Backdrop Control**: Prevent accidental closes for critical dialogs
- **Material-UI Integration**: Full theming support

## Installation

The component is already available in the Reactory Client. Access it via:

```tsx
const FullScreenModal = reactory.getComponent('core.FullScreenModal@1.0.0');
```

## Basic Usage

```tsx
import ReactoryCoreDialog from 'components/shared/ReactoryCoreDialog';

<ReactoryCoreDialog
  open={isOpen}
  title="My Dialog"
  onClose={() => setIsOpen(false)}
>
  <div>Dialog content here</div>
</ReactoryCoreDialog>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Whether the dialog is open |
| `title` | `string` | - | Dialog title displayed in the app bar |
| `showAppBar` | `boolean` | `true` | Whether to show the app bar |
| `fullScreen` | `boolean` | `true` | Whether the dialog should be full screen |
| `fullWidth` | `boolean` | `true` | Whether the dialog should be full width |
| `maxWidth` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| false` | `false` | Maximum width of the dialog |
| `breakpoint` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'sm'` | Breakpoint at which to switch to full screen |
| `onClose` | `() => void` | - | Callback function when dialog closes |
| `children` | `ReactNode` | - | Dialog content |
| `disablePadding` | `boolean` | `false` | Remove padding from content area |
| `contentPadding` | `number \| string` | `theme.spacing(2)` | Custom padding for content area |
| `loading` | `boolean` | `false` | Show loading overlay |
| `loadingMessage` | `string` | `'Loading...'` | Loading message text |
| `actions` | `ReactNode` | - | Actions to display in footer |
| `disableBackdropClick` | `boolean` | `false` | Disable backdrop click close |
| `disableEscapeKeyDown` | `boolean` | `false` | Disable escape key close |
| `closeButtonIcon` | `string` | `'close'` | Icon to use for the close button |
| `closeOnEvents` | `string[]` | `[]` | Array of event names that should trigger dialog close |
| `backNavigationItems` | `string[]` | `[]` | Array of navigation items for breadcrumb navigation |
| `backNavComponent` | `ReactNode` | - | Custom component to render in the back navigation area |
| `appBarProps` | `Partial<AppBarProps>` | `{}` | Props to pass to the AppBar component |
| `toolbarProps` | `Partial<ToolbarProps>` | `{ variant: "dense" }` | Props to pass to the Toolbar component |
| `containerProps` | `Partial<DialogProps>` | `{}` | Props to pass to the Dialog component |
| `slide` | `'up' \| 'down' \| 'left' \| 'right'` | `'up'` | Slide direction for the transition |
| `reactory` | `ReactorySDK` | - | Reactory API instance |

## Examples

### Simple Dialog

```tsx
<ReactoryCoreDialog
  open={isOpen}
  title="Confirm Action"
  onClose={handleClose}
  fullScreen={false}
  maxWidth="sm"
>
  <Typography>Are you sure you want to proceed?</Typography>
</ReactoryCoreDialog>
```

### Dialog with Actions

```tsx
<ReactoryCoreDialog
  open={isOpen}
  title="Edit User"
  onClose={handleClose}
  actions={
    <>
      <Button onClick={handleClose}>Cancel</Button>
      <Button variant="contained" onClick={handleSave}>
        Save
      </Button>
    </>
  }
>
  <UserForm />
</ReactoryCoreDialog>
```

### Full Screen with Loading

```tsx
<ReactoryCoreDialog
  open={isOpen}
  title="User Details"
  fullScreen={true}
  loading={isLoading}
  loadingMessage="Fetching user data..."
  onClose={handleClose}
>
  <UserDetails userId={userId} />
</ReactoryCoreDialog>
```

### No Padding (for components with own layout)

```tsx
<ReactoryCoreDialog
  open={isOpen}
  title="Select Image"
  fullScreen={true}
  disablePadding={true}
  onClose={handleClose}
>
  <UserHomeFolder {...folderProps} />
</ReactoryCoreDialog>
```

### Critical Dialog (no accidental close)

```tsx
<ReactoryCoreDialog
  open={isOpen}
  title="Critical Warning"
  disableBackdropClick={true}
  disableEscapeKeyDown={true}
  onClose={handleClose}
  actions={
    <Button variant="contained" onClick={handleAcknowledge}>
      I Understand
    </Button>
  }
>
  <Alert severity="error">
    This action cannot be undone!
  </Alert>
</ReactoryCoreDialog>
```

### With Breadcrumb Navigation

```tsx
<ReactoryCoreDialog
  open={isOpen}
  title="User Details"
  backNavigationItems={['Users', 'User Management', 'John Doe']}
  onClose={handleClose}
>
  <UserDetailsComponent />
</ReactoryCoreDialog>
```

### Event-Driven Closing

```tsx
<ReactoryCoreDialog
  open={isOpen}
  title="Form Dialog"
  closeOnEvents={['form:submitted', 'form:cancelled']}
  onClose={handleClose}
  reactory={reactory}
>
  <MyFormComponent />
</ReactoryCoreDialog>
```

## Component Registration

The component is registered as `core.FullScreenModal@1.0.0` in the Reactory component registry:

```tsx
const FullScreenModal = reactory.getComponent('core.FullScreenModal@1.0.0');

<FullScreenModal
  open={isOpen}
  title="My Dialog"
  onClose={handleClose}
  reactory={reactory}
>
  <MyContent />
</FullScreenModal>
```

## Styling

The component uses Material-UI's theming system. You can customize the appearance through:

1. **Theme customization**: Modify your application's theme
2. **`appBarProps`**: Pass custom props to the AppBar
3. **`containerProps`**: Pass custom props to the Dialog
4. **`contentPadding`**: Control content area spacing

## Accessibility

- Close button has proper `aria-label`
- Dialog has proper role attributes
- Keyboard navigation supported (Escape to close unless disabled)
- Focus management handled by Material-UI Dialog

## Dependencies

- `@mui/material`
- `@reactory/client-core`
- `redux`
- `lodash`

## See Also

- [IMPROVEMENTS.md](./IMPROVEMENTS.md) - Detailed changelog of recent improvements
- [Material-UI Dialog Documentation](https://mui.com/material-ui/react-dialog/)




