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

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | - | Controls dialog visibility |
| `onClose` | `() => void` | - | Close dialog callback |
| `reactory` | `Reactory.Client.ReactorySDK` | - | Reactory SDK instance |
| `serverPath` | `string` | `"${APP_DATA_ROOT}"` | Base server path to browse |
| `onFileSelection` | `(files: ServerFileItem[]) => void` | - | File selection callback |
| `onFolderSelection` | `(folders: ServerFolderItem[]) => void` | - | Folder selection callback |
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

## Future Enhancements

- [ ] Real GraphQL integration (currently using mock data)
- [ ] File upload with progress tracking
- [ ] Folder tree view with lazy loading
- [ ] Advanced file operations (copy, move, bulk operations)
- [ ] File preview capabilities
- [ ] Search and filtering improvements
- [ ] Permission-based UI restrictions
- [ ] Audit logging for administrative actions

## Development Notes

Currently using mock data for development. Production implementation will require:

1. Server-side GraphQL queries for file operations
2. File upload handling with proper security
3. Permission checking integration
4. Error handling and user feedback improvements

The component is designed to be easily extensible and can be customized for different server-side file management scenarios.
