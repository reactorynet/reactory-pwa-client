# ServerFileExplorer

A dedicated server-side file explorer component designed for administrative users to browse, select, and manage files on the server filesystem.

## Purpose

The `ServerFileExplorer` component was created to provide a clean separation of concerns between user-specific file management (`UserHomeFolder`) and server-side administrative file operations. This avoids overcomplicating the `UserHomeFolder` component with server-specific functionality.

## Key Features

- **Server-side file browsing**: Navigate server directories with paths like `${APP_DATA_ROOT}/workflows`
- **File filtering**: Support for filtering by file types (e.g., JSON workflow files)
- **Single/Multi selection modes**: Choose between single file selection or multi-file selection
- **Administrative permissions**: Built-in support for read-only mode and permission-based operations
- **Modern UI**: Clean Material-UI based interface with grid/list view modes
- **Navigation history**: Back/forward navigation with breadcrumbs
- **File Upload**: Drag & drop or click-to-upload files with visual feedback
- **Folder Management**: Create new folders with dialog interface
- **File Operations**: Rename and delete files/folders with confirmation dialogs
- **Context Menu**: Right-click menu for quick access to file operations
- **Bulk Operations**: Delete multiple selected items at once

## Usage

### Basic File Selection

```tsx
import { ServerFileExplorer } from '../ServerFileExplorer';

<ServerFileExplorer
  open={open}
  onClose={() => setOpen(false)}
  reactory={reactory}
  serverPath="${APP_DATA_ROOT}/workflows"
  onFileSelection={(files) => console.log('Selected files:', files)}
  selectionMode="single"
  allowedFileTypes={['.json', 'application/json']}
  title="Select Workflow File"
  readonly={true}
/>
```

### Advanced Configuration

```tsx
<ServerFileExplorer
  open={open}
  onClose={handleClose}
  reactory={reactory}
  serverPath="${APP_DATA_ROOT}/templates"
  onFileSelection={handleFileSelection}
  onFolderSelection={handleFolderSelection}
  selectionMode="multi"
  allowedFileTypes={['.json', '.yaml', '.yml']}
  title="Template Manager"
  allowUpload={true}
  allowCreateFolder={true}
  allowDelete={true}
  allowRename={true}
  readonly={false}
/>
```

## Consuming the registered component

The explorer is registered as **`core.ServerFileExplorer@1.0.0`** (roles `ADMIN`, `DEVELOPER`,
`wrapWithApi: true`). Components delivered as server modules are compiled into a client plugin and
resolve dependencies only through `reactory.getComponents()`, so this is the way they reach it:

```tsx
const { ServerFileExplorer } = reactory.getComponents<{ ServerFileExplorer: any }>([
  'core.ServerFileExplorer@1.0.0',
]);

<ServerFileExplorer
  open={pickerOpen}
  onClose={() => setPickerOpen(false)}
  serverPath="/Users/me/repositories/my-repo"
  onFolderSelection={(folders) => setWorkdir(folders[0].fullPath)}
  title="Choose repository folder"
  readonly
  allowUpload={false}
  allowCreateFolder={false}
/>;
```

`reactory` is injected by `withReactory`, so consumers do not pass it. Direct importers (such as
`WorkflowDesigner`) keep passing it explicitly.

### Choosing a folder

Clicking a folder row navigates **into** it. To choose a folder, use either:

- the footer action (`Select this folder`, shown when `onFolderSelection` is supplied), or
- `Select this folder` in a folder row's context menu.

What each one reports:

- The **footer action** reports the path currently being browsed - i.e. the `serverPath` that was
  requested. It is not read back from the `ReactoryServerFiles` response.
- The **context menu** reports that folder row's `fullPath` from the resolver response.

Both are passed through unchanged (no client-side path joining). Note the resolver's contract:
`fullPath` is **absolute only when the requested `serverPath` is absolute**. When the path contains a
template such as `${APP_DATA_ROOT}`, the resolver returns the still-templated path, so pass an absolute
root if the consumer needs to persist a filesystem path.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | - | Controls dialog visibility |
| `onClose` | `() => void` | - | Close dialog callback |
| `reactory` | `Reactory.Client.ReactorySDK` | - | Reactory SDK instance |
| `serverPath` | `string` | `"${APP_DATA_ROOT}"` | Base server path to browse |
| `onFileSelection` | `(files: ServerFileItem[]) => void` | - | File selection callback |
| `onFolderSelection` | `(folders: ServerFolderItem[]) => void` | - | Folder selection callback; footer action sends the browsed path, context menu sends the row's resolver `fullPath` |
| `showFolderSelectionButton` | `boolean` | `true` when `onFolderSelection` is set | Show the footer action that selects the current folder |
| `folderSelectionLabel` | `string` | `'Select this folder'` | Label for that action |
| `closeOnFolderSelection` | `boolean` | `true` | Close the dialog after a folder is selected |
| `selectionMode` | `'single' \| 'multi'` | `'single'` | Selection mode |
| `allowedFileTypes` | `string[]` | `[]` | Allowed file types/extensions |
| `title` | `string` | `'Server File Explorer'` | Dialog title |
| `allowUpload` | `boolean` | `false` | Enable file upload |
| `allowCreateFolder` | `boolean` | `false` | Enable folder creation |
| `allowDelete` | `boolean` | `false` | Enable delete operations |
| `allowRename` | `boolean` | `false` | Enable rename operations |
| `readonly` | `boolean` | `false` | Read-only mode |

## Architecture

### Components Structure

```
ServerFileExplorer/
├── ServerFileExplorer.tsx       # Main component
├── types/
│   └── index.ts                 # TypeScript interfaces
├── hooks/
│   ├── useServerFiles.ts        # Server file operations
│   ├── useServerNavigation.ts   # Navigation logic
│   ├── useServerSelection.ts    # Selection management
│   └── index.ts                 # Hook exports
└── README.md                    # This file
```

### Custom Hooks

- **`useServerFiles`**: Manages server file loading, CRUD operations, and state
- **`useServerNavigation`**: Handles path navigation, history, and breadcrumbs
- **`useServerSelection`**: Manages file/folder selection state and operations

## Integration with WorkflowDesigner

The `ServerFileExplorer` is integrated into the `WorkflowDesigner` component to provide server workspace functionality:

```tsx
// Server workspace option in load dropdown
const handleLoadFromServerWorkspace = () => {
  setShowServerFileExplorerDialog(true);
};

// Server file selection handler
const handleServerFileSelection = async (selectedFiles) => {
  if (selectedFiles.length > 0) {
    const selectedFile = selectedFiles[0];
    // Load workflow from server file
    // Implementation would fetch file content and parse JSON
  }
};
```

## Differences from UserHomeFolder

| Feature | UserHomeFolder | ServerFileExplorer |
|---------|----------------|-------------------|
| **Purpose** | User file management | Server administration |
| **File Paths** | User home directory | Server filesystem |
| **Permissions** | User-based | Admin/role-based |
| **UI Paradigm** | Panel-based | Dialog-based |
| **File Operations** | User file CRUD | Server file management |
| **Selection Model** | Auto-close on file select | Configurable selection |

## Implemented Features ✅

- [x] File upload with drag & drop support
- [x] Folder creation with dialog interface
- [x] File and folder rename operations
- [x] File and folder delete operations
- [x] Context menu for quick actions
- [x] Bulk delete operations
- [x] Real GraphQL integration for all operations
- [x] Permission-based UI (allowUpload, allowDelete, allowRename, readonly)

## Future Enhancements

- [ ] File upload with progress tracking and cancellation
- [ ] Folder tree view with lazy loading
- [ ] Copy and paste operations
- [ ] Move items via drag and drop
- [ ] File preview capabilities
- [ ] Advanced search and filtering
- [ ] Keyboard shortcuts for operations
- [ ] Undo/redo functionality
- [ ] Audit logging for administrative actions
- [ ] File compression/decompression

## File Operations

### Upload Files
- **Drag & Drop**: Drag files from desktop directly into the dialog
- **Click Upload**: Click the upload area or toolbar button to select files
- **Multi-file**: Upload multiple files at once
- **File Type Filter**: Respects `allowedFileTypes` prop
- **Visual Feedback**: Drag overlay with upload icon during drag operation

### Create Folders
- Click the "Create Folder" button in toolbar
- Enter folder name in dialog
- Press Enter or click "Create" to confirm
- Folder created in current path
- File list auto-refreshes

### Rename Items
- Right-click item or click menu icon (⋮)
- Select "Rename" from context menu
- Enter new name in dialog
- Press Enter or click "Rename" to confirm
- Works for both files and folders

### Delete Items
- **Single Delete**: Right-click and select "Delete"
- **Bulk Delete**: Select multiple items and click delete button in toolbar
- Confirmation dialog shows items to be deleted
- Warning that action cannot be undone
- File list auto-refreshes after deletion

### Download Files
- Right-click file and select "Download"
- File downloads to browser's download location
- Only available for files (not folders)

## Error Handling

All operations include comprehensive error handling:
- Try-catch blocks around API calls
- User-friendly error notifications
- Console logging for debugging
- Graceful degradation on failures
- Success notifications for completed operations

## GraphQL Integration

The component uses the following GraphQL operations:

- **ReactoryServerFiles**: Load files and folders
- **ReactoryUploadFile**: Upload files to server
- **ReactoryCreateFolder**: Create new folders
- **ReactoryDeleteFile**: Delete files
- **ReactoryDeleteFolder**: Delete folders
- **ReactoryMoveItem**: Rename files/folders (via move operation)

## Development Notes

The component is fully integrated with the Reactory GraphQL backend and supports:

1. ✅ Real-time file operations with server
2. ✅ Permission-based UI restrictions
3. ✅ Error handling and user feedback
4. ✅ Automatic refresh after operations
5. ✅ Selection management and bulk operations

The component is designed to be easily extensible and can be customized for different server-side file management scenarios.

## Related Components

- **UserHomeFolder**: User-specific file management with similar UI patterns
- **WorkflowDesigner**: Uses ServerFileExplorer for loading/saving workflows
- **ImageComponent**: May use for file selection

For detailed implementation notes, see [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
