# ServerFileExplorer Upgrade Guide

## What's New

The ServerFileExplorer component has been upgraded with complete file management capabilities:

### New Features
- ✅ **File Upload** - Drag & drop or click to upload
- ✅ **Create Folders** - Create new folders via dialog
- ✅ **Rename Files/Folders** - Rename any item via context menu
- ✅ **Delete Files/Folders** - Delete items with confirmation
- ✅ **Context Menu** - Right-click menu for all operations
- ✅ **Bulk Operations** - Delete multiple selected items

## Breaking Changes

**None!** The component is fully backward compatible. All existing props work exactly as before.

## Migration Steps

### If you're using basic file selection (no changes needed):

```tsx
// This code still works exactly as before ✅
<ServerFileExplorer
  open={open}
  onClose={() => setOpen(false)}
  reactory={reactory}
  serverPath="${APP_DATA_ROOT}/workflows"
  onFileSelection={(files) => handleFiles(files)}
  selectionMode="single"
/>
```

### To enable new file management features:

Simply add the permission props you want to enable:

```tsx
<ServerFileExplorer
  open={open}
  onClose={() => setOpen(false)}
  reactory={reactory}
  serverPath="${APP_DATA_ROOT}/workflows"
  onFileSelection={(files) => handleFiles(files)}
  selectionMode="multi"
  
  // Add these props to enable features
  allowUpload={true}          // Enable drag & drop upload
  allowCreateFolder={true}    // Enable folder creation
  allowRename={true}          // Enable rename operations
  allowDelete={true}          // Enable delete operations
  readonly={false}            // Set to true to disable all writes
/>
```

## New Props

All new props are **optional** and default to `false`:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `allowUpload` | `boolean` | `false` | Shows upload UI and enables drag & drop |
| `allowCreateFolder` | `boolean` | `false` | Shows create folder button |
| `allowDelete` | `boolean` | `false` | Shows delete options in context menu |
| `allowRename` | `boolean` | `false` | Shows rename options in context menu |
| `readonly` | `boolean` | `false` | Disables all write operations |

## Feature Examples

### Enable Only Upload

```tsx
<ServerFileExplorer
  // ... other props
  allowUpload={true}
  // Upload area appears at top
  // Drag & drop enabled
  // Upload button in toolbar
/>
```

### Enable Full File Management

```tsx
<ServerFileExplorer
  // ... other props
  allowUpload={true}
  allowCreateFolder={true}
  allowRename={true}
  allowDelete={true}
  // All features enabled
/>
```

### Read-Only Mode (View Only)

```tsx
<ServerFileExplorer
  // ... other props
  readonly={true}
  // All write operations disabled
  // No context menu actions
  // No upload/create/delete/rename buttons
/>
```

## User Experience Changes

### What Users Will See (When Features Enabled)

1. **Upload Area** - Dashed border box at top of dialog
   - Click to select files
   - Drag files from desktop
   - Shows allowed file types

2. **Toolbar Buttons** (when not readonly)
   - 🔼 Upload button
   - 📁+ Create folder button
   - 🗑️ Delete button (when items selected)

3. **Context Menu** (right-click on item)
   - 📥 Download (files only)
   - ✏️ Rename (if allowRename)
   - 🗑️ Delete (if allowDelete)

4. **Drag & Drop**
   - Drag files over dialog
   - Full-screen blue overlay appears
   - Drop to upload

5. **Dialogs**
   - Rename: Simple text input
   - Create Folder: Simple text input
   - Delete: Confirmation with item list

## Testing Your Integration

### Test Checklist

- [ ] Open dialog (existing functionality)
- [ ] Navigate folders (existing functionality)
- [ ] Select files (existing functionality)
- [ ] Upload single file (new)
- [ ] Upload multiple files (new)
- [ ] Drag & drop files (new)
- [ ] Create folder (new)
- [ ] Rename file (new)
- [ ] Rename folder (new)
- [ ] Delete file (new)
- [ ] Delete folder (new)
- [ ] Delete multiple items (new)
- [ ] Context menu positioning (new)
- [ ] Readonly mode works (new)

### Quick Test

```tsx
function TestComponent() {
  const [open, setOpen] = useState(true);
  
  return (
    <ServerFileExplorer
      open={open}
      onClose={() => setOpen(false)}
      reactory={reactory}
      serverPath="${APP_DATA_ROOT}/test"
      selectionMode="multi"
      allowUpload={true}
      allowCreateFolder={true}
      allowRename={true}
      allowDelete={true}
      onFileSelection={(files) => {
        console.log('Selected:', files);
      }}
    />
  );
}
```

## Troubleshooting

### Upload Not Working
- Check that `allowUpload={true}` is set
- Verify user has write permissions on server
- Check browser console for errors
- Verify GraphQL mutation `ReactoryUploadFile` is available

### Context Menu Not Appearing
- Right-click directly on the item card
- Click the ⋮ (three dots) icon on the item
- Check that `readonly={false}`

### Delete Not Available
- Verify `allowDelete={true}` is set
- Check `readonly` is not `true`
- Verify user has delete permissions on server

### Rename Not Working
- Verify `allowRename={true}` is set
- Check `readonly` is not `true`
- Verify GraphQL mutation `ReactoryMoveItem` is available

## Performance Notes

- File uploads are sequential, not parallel
- Large file uploads may take time
- File list refreshes after each operation
- Drag & drop uses native browser APIs (very performant)

## Security Considerations

- All operations require proper server permissions
- File uploads respect server-side validation
- Read-only mode truly disables all write operations
- Context menu only shows allowed operations
- Confirmation required for destructive operations

## Getting Help

- See [README.md](./README.md) for full documentation
- See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for technical details
- Check the component source: `ServerFileExplorer.tsx`
- Review the hooks: `hooks/useServerFiles.ts`

## Example: Converting Read-Only to Full Management

### Before (Read-Only)
```tsx
<ServerFileExplorer
  open={open}
  onClose={handleClose}
  reactory={reactory}
  serverPath="${APP_DATA_ROOT}/data"
  onFileSelection={handleSelection}
/>
```

### After (Full Management)
```tsx
<ServerFileExplorer
  open={open}
  onClose={handleClose}
  reactory={reactory}
  serverPath="${APP_DATA_ROOT}/data"
  onFileSelection={handleSelection}
  
  // Simply add these lines:
  allowUpload={true}
  allowCreateFolder={true}
  allowRename={true}
  allowDelete={true}
/>
```

That's it! No other changes needed.

## Rollback

If you need to revert to old behavior:
1. Don't set any of the new permission props (they default to `false`)
2. Or explicitly set them all to `false`
3. Component behaves exactly as before

```tsx
<ServerFileExplorer
  // ... existing props ...
  allowUpload={false}
  allowCreateFolder={false}
  allowRename={false}
  allowDelete={false}
  // Behaves like old version
/>
```

