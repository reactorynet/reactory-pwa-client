# ServerFileExplorer - File Management Implementation Summary

## Overview
The ServerFileExplorer component has been enhanced with complete file management capabilities including upload, delete, rename, and create folder operations. The implementation follows the same patterns used in the UserHomeFolder component, particularly for drag-and-drop file uploads.

## New Features Added

### 1. File Upload
- **Drag and Drop Support**: Users can drag files from their desktop directly into the explorer
- **Click to Upload**: Click on the upload area or use the toolbar button to select files
- **Visual Feedback**: Drag overlay shows when files are being dragged over the component
- **File Type Filtering**: Respects the `allowedFileTypes` prop to restrict uploads
- **Multi-file Support**: Upload multiple files at once

**Implementation Details:**
- Uses native HTML5 drag and drop API
- Drag counter prevents flickering during drag operations
- Uploads files to the current navigation path using `serverFiles.uploadFiles()`
- Shows success/error notifications via reactory SDK

### 2. Folder Creation
- **Dialog Interface**: Clean dialog for entering new folder name
- **Keyboard Support**: Press Enter to confirm folder creation
- **Path Aware**: Creates folders in the current navigation path
- **Automatic Refresh**: File list refreshes after successful creation

**Implementation Details:**
- Uses Material-UI Dialog component
- Validates folder name before creation
- Integrates with `serverFiles.createFolder()` hook method

### 3. File/Folder Rename
- **Context Menu Access**: Right-click or click menu icon on any item
- **Dialog Interface**: Simple text field for entering new name
- **Keyboard Support**: Press Enter to confirm rename
- **Type Aware**: Works for both files and folders

**Implementation Details:**
- Transforms item to `ServerSelectedItem` format for consistency
- Uses `serverFiles.renameItem()` which internally uses move operation
- Preserves item path while changing name

### 4. File/Folder Delete
- **Single Item Delete**: Delete via context menu
- **Bulk Delete**: Delete multiple selected items
- **Confirmation Dialog**: Shows items to be deleted with warning
- **Safety Check**: Cannot be undone warning displayed

**Implementation Details:**
- Uses `serverFiles.deleteItems()` for batch operations
- Separate mutations for files and folders
- Clears selection after successful deletion

### 5. Context Menu
- **Download**: Available for files only
- **Rename**: Available when `allowRename` is true
- **Delete**: Available when `allowDelete` is true
- **Smart Positioning**: Uses Material-UI Menu with proper anchoring

## Props Usage

The component respects all permission-related props:

```typescript
interface ServerFileExplorerProps {
  allowUpload?: boolean;       // Shows upload UI and enables drag & drop
  allowCreateFolder?: boolean;  // Shows create folder button
  allowDelete?: boolean;        // Shows delete options in context menu
  allowRename?: boolean;        // Shows rename options in context menu
  readonly?: boolean;          // Disables all write operations
  allowedFileTypes?: string[]; // Filters file types for upload
  // ... other props
}
```

## UI Components Added

### 1. Upload Area
- Bordered dashed box with cloud upload icon
- Shows allowed file types
- Click to open file picker
- Drag & drop target

### 2. Toolbar Actions
- Upload button (cloud upload icon)
- Create folder button (new folder icon)
- Delete selected button (trash icon, only when items selected)
- All buttons have tooltips

### 3. Dialogs
- **Rename Dialog**: Single text field with cancel/confirm
- **Create Folder Dialog**: Single text field with cancel/confirm
- **Delete Confirmation**: Shows items to delete with warning alert

### 4. Context Menu
- Material-UI Menu component
- Icon + text for each action
- Only shows available actions based on props

### 5. Drag Overlay
- Full-screen overlay during drag operation
- Large cloud upload icon
- "Drop files to upload" message
- Semi-transparent blue background

## State Management

New state added:
```typescript
// Dialog states
const [renameDialog, setRenameDialog] = useState({
  open: false,
  item: null as ServerSelectedItem | null,
  newName: ''
});

const [createFolderDialog, setCreateFolderDialog] = useState({
  open: false,
  folderName: ''
});

const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({
  open: false,
  items: [] as ServerSelectedItem[]
});

// Drag and drop
const [isDragging, setIsDragging] = useState(false);
const dragCounter = useRef(0);
```

## Event Handlers

New handlers added:
- `handleFileUpload()` - Processes file uploads
- `handleCreateFolder()` - Creates new folder
- `handleRenameItem()` - Renames file or folder
- `handleDeleteItems()` - Deletes selected items
- `handleMenuItemRename()` - Context menu rename action
- `handleMenuItemDelete()` - Context menu delete action
- `handleMenuItemDownload()` - Context menu download action
- `handleDeleteSelected()` - Toolbar delete selected action
- `handleDragEnter/Leave/Over/Drop()` - Drag and drop handlers
- `handleMenuClose()` - Closes context menu

## Integration with Hooks

The implementation leverages existing hook methods:

### useServerFiles Hook
- `uploadFiles(files: File[], targetPath: string)` - Upload files
- `createFolder(name: string, path: string)` - Create folder
- `deleteItems(items: ServerSelectedItem[])` - Delete items
- `renameItem(item: ServerSelectedItem, newName: string)` - Rename item
- `refreshPath()` - Refresh current path

### useServerNavigation Hook
- `currentPath` - Current navigation path for operations

### useServerSelection Hook
- `selectedItems` - Array of selected items
- `clearSelection()` - Clear selection after operations

## GraphQL Mutations Used

The hook methods internally use these mutations:
- `ReactoryUploadFile` - File upload
- `ReactoryCreateFolder` - Folder creation
- `ReactoryDeleteFile` - File deletion
- `ReactoryDeleteFolder` - Folder deletion
- `ReactoryMoveItem` - Used for rename operations

## Usage Example

```tsx
<ServerFileExplorer
  open={isOpen}
  onClose={() => setIsOpen(false)}
  reactory={reactory}
  serverPath="${APP_DATA_ROOT}/workflows"
  title="Workflow Files"
  selectionMode="multi"
  
  // Enable file management features
  allowUpload={true}
  allowCreateFolder={true}
  allowDelete={true}
  allowRename={true}
  readonly={false}
  
  // Optional: Restrict file types
  allowedFileTypes={['.json', '.xml', '.yaml']}
  
  // Callbacks
  onFileSelection={(files) => console.log('Selected files:', files)}
  onFolderSelection={(folders) => console.log('Selected folders:', folders)}
/>
```

## User Experience

### Upload Flow
1. User drags files over the dialog
2. Drag overlay appears with visual feedback
3. User drops files
4. Each file uploads sequentially
5. Success notification for each file
6. File list auto-refreshes
7. New files appear in the list

### Create Folder Flow
1. User clicks create folder button in toolbar
2. Dialog opens with text field
3. User enters folder name and confirms
4. Folder created at current path
5. Success notification shown
6. File list auto-refreshes
7. New folder appears in the list

### Rename Flow
1. User right-clicks item or clicks menu icon
2. Context menu appears
3. User clicks "Rename"
4. Dialog opens with current name
5. User enters new name and confirms
6. Item renamed in place
7. Success notification shown
8. File list auto-refreshes

### Delete Flow
1. User right-clicks item(s) or selects multiple
2. Clicks delete from context menu or toolbar
3. Confirmation dialog shows items to delete
4. User confirms
5. Items deleted
6. Success notification shown
7. File list auto-refreshes
8. Selection cleared

## Error Handling

All operations include proper error handling:
- Try-catch blocks around all API calls
- Error notifications via `reactory.error()`
- Console logging for debugging
- User-friendly error messages
- Graceful degradation on failures

## Accessibility

- All buttons have tooltips
- Keyboard support (Enter key) in dialogs
- Clear visual feedback for all actions
- Confirmation dialogs for destructive operations
- Proper ARIA labels from Material-UI components

## Performance Considerations

- Drag counter prevents flickering
- Debounced search (from original implementation)
- Batch operations for multiple items
- Automatic refresh only after successful operations
- Minimal re-renders using useCallback

## Future Enhancements

Potential improvements:
1. Copy/Paste operations
2. Bulk upload progress indicators
3. File preview in dialog
4. Folder properties dialog
5. Move items via drag and drop
6. Undo/redo for operations
7. File compression/decompression
8. Advanced filtering and sorting
9. Keyboard shortcuts
10. Breadcrumb navigation improvements

## Testing Checklist

- [ ] Upload single file
- [ ] Upload multiple files
- [ ] Drag and drop files
- [ ] Create new folder
- [ ] Rename file
- [ ] Rename folder
- [ ] Delete single file
- [ ] Delete single folder
- [ ] Delete multiple items
- [ ] Context menu positioning
- [ ] Keyboard shortcuts in dialogs
- [ ] Error handling for invalid operations
- [ ] Permission-based UI (readonly mode)
- [ ] File type filtering for uploads
- [ ] Success notifications
- [ ] Error notifications
- [ ] Auto-refresh after operations
- [ ] Selection clearing after delete

## Notes

- The implementation mirrors UserHomeFolder patterns for consistency
- All file operations require proper server permissions
- The component uses the existing GraphQL schema
- Drag and drop uses native HTML5 APIs for broad browser support
- All dialogs use Material-UI for consistent styling


