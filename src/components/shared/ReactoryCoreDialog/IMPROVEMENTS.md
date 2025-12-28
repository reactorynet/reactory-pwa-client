# ReactoryCoreDialog Improvements

## Summary of Changes

This document outlines the improvements made to the `ReactoryCoreDialog` component to enhance its flexibility, usability, and functionality.

## New Features

### 1. Content Padding Control
- **`disablePadding`**: Boolean prop to remove all padding from content area
- **`contentPadding`**: Custom padding value (number or string)
- **Default**: Uses `theme.spacing(2)` when neither prop is specified

**Use Case**: Useful for components that manage their own layout (e.g., UserHomeFolder, data tables)

```tsx
<ReactoryCoreDialog
  open={true}
  disablePadding={true}  // No padding
>
  <MyComponent />
</ReactoryCoreDialog>
```

### 2. Loading State
- **`loading`**: Boolean to show/hide loading overlay
- **`loadingMessage`**: Custom loading message text
- **Features**: 
  - Semi-transparent overlay
  - Centered spinner
  - Optional message below spinner
  - Prevents interaction with content while loading

```tsx
<ReactoryCoreDialog
  open={true}
  loading={isLoading}
  loadingMessage="Fetching data..."
>
  <MyComponent />
</ReactoryCoreDialog>
```

### 3. Actions Footer
- **`actions`**: ReactNode to render action buttons in a sticky footer
- **Features**:
  - Sticky position at bottom
  - Divider line above
  - Right-aligned with spacing
  - Background matches dialog

```tsx
<ReactoryCoreDialog
  open={true}
  actions={
    <>
      <Button onClick={onCancel}>Cancel</Button>
      <Button variant="contained" onClick={onSave}>Save</Button>
    </>
  }
>
  <MyFormComponent />
</ReactoryCoreDialog>
```

### 4. Backdrop & Keyboard Control
- **`disableBackdropClick`**: Prevent closing when clicking outside
- **`disableEscapeKeyDown`**: Prevent closing with Escape key

**Use Case**: Force user interaction for critical dialogs

```tsx
<ReactoryCoreDialog
  open={true}
  disableBackdropClick={true}
  disableEscapeKeyDown={true}
>
  <CriticalWarning />
</ReactoryCoreDialog>
```

## Layout Improvements

### 1. AppBar Positioning
- Changed from `position: 'relative'` to `position: 'sticky'`
- Stays visible when scrolling long content
- Proper z-index for layering

### 2. Content Area
- Removed hardcoded margin
- Uses flexbox for proper stretching
- Scroll container with overflow handling
- Position relative for overlay support

### 3. Footer Positioning
- Sticky footer that stays at bottom
- Visible even with scrollable content
- Proper visual separation with border

## TypeScript Improvements

### Extended Interface
All new props are properly typed in `IReactoryCoreDialogProps`:

```typescript
export interface IReactoryCoreDialogProps {
  // ... existing props ...
  disablePadding?: boolean;
  contentPadding?: number | string;
  loading?: boolean;
  loadingMessage?: string;
  actions?: React.ReactNode;
  disableBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
}
```

### PropTypes
All new props have corresponding PropTypes validation for runtime checking.

## Breaking Changes

**None** - All changes are backward compatible. Existing usage continues to work with default values.

## Migration Guide

### Before
```tsx
<ReactoryCoreDialog
  open={true}
  title="My Dialog"
  onClose={handleClose}
>
  <div style={{ padding: 0 }}>
    <MyComponent />
  </div>
</ReactoryCoreDialog>
```

### After
```tsx
<ReactoryCoreDialog
  open={true}
  title="My Dialog"
  onClose={handleClose}
  disablePadding={true}  // Cleaner API
>
  <MyComponent />
</ReactoryCoreDialog>
```

## Examples

### Full Feature Dialog
```tsx
<ReactoryCoreDialog
  open={isOpen}
  title="Edit User"
  showAppBar={true}
  fullScreen={false}
  maxWidth="md"
  disablePadding={false}
  contentPadding={3}
  loading={isSaving}
  loadingMessage="Saving changes..."
  disableBackdropClick={isDirty}
  disableEscapeKeyDown={isDirty}
  actions={
    <>
      <Button onClick={handleCancel}>Cancel</Button>
      <Button 
        variant="contained" 
        onClick={handleSave}
        disabled={!isValid}
      >
        Save
      </Button>
    </>
  }
  onClose={handleClose}
  reactory={reactory}
>
  <UserForm />
</ReactoryCoreDialog>
```

### File Selector Dialog
```tsx
<ReactoryCoreDialog
  open={isOpen}
  title="Select Image"
  fullScreen={true}
  disablePadding={true}
  onClose={handleClose}
  reactory={reactory}
>
  <UserHomeFolder {...folderProps} />
</ReactoryCoreDialog>
```

## Benefits

1. **Better UX**: Sticky headers/footers improve navigation
2. **Flexibility**: Content padding control for any use case
3. **Feedback**: Loading states provide clear user feedback
4. **Control**: Prevent accidental closures for critical flows
5. **Maintainability**: Cleaner API reduces need for wrapper components
6. **Consistency**: Standardized action footer across all dialogs

## Future Enhancements

Potential additions for future versions:

1. **Transitions**: Custom transition components for different effects
2. **Resize**: Support for resizable dialogs
3. **Drag**: Draggable dialog headers
4. **Nested**: Better support for nested dialogs
5. **Templates**: Pre-configured templates (confirm, alert, form, etc.)
6. **Accessibility**: Enhanced ARIA support and keyboard navigation


