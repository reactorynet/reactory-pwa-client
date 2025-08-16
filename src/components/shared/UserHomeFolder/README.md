# UserHomeFolder Component - File and Folder Explorer

## Overview

The `UserHomeFolder` component has been successfully adapted from the original `FilesPanel` to create a generic file and folder explorer for users. This component provides a comprehensive interface for browsing folders, managing files, and performing various operations with different view modes.

## Key Features

### 1. **Dual Panel Layout**
- **Left Panel**: Folder navigation and hierarchy
- **Right Panel**: File listing with multiple view modes (grid, list, table)

### 2. **Navigation**
- Breadcrumb navigation showing current path
- Home button to return to root directory
- Back button to navigate to parent folder
- Folder selection to navigate into subdirectories

### 3. **File Management**
- **Multiple View Modes**:
  - Grid view: Card-based layout with thumbnails
  - List view: Detailed list with metadata
  - Table view: Tabular format with sortable columns

### 4. **Selection System**
- Single selection mode (default)
- Multi-selection mode (toggleable)
- Select all functionality
- Clear selection
- Visual feedback for selected items

### 5. **File Operations**
- Upload files to current directory
- Delete individual files or bulk delete selected files
- Rename files
- View file details and metadata

### 6. **Mobile Responsive**
- Adaptive layout for mobile devices
- Toggle between folder and file views on mobile
- Floating action buttons for quick actions
- Touch-friendly interactions

## Props Interface

```typescript
interface UserHomeFolderProps {
  open: boolean;                                    // Controls panel visibility
  onClose: () => void;                             // Close handler
  reactory: Reactory.Client.ReactorySDK;           // Reactory SDK instance
  onFileUpload?: (files: File[], path: string) => Promise<void>; // File upload handler
  onSelectionChanged?: (selectedItems: SelectedItem[]) => void;  // Selection change handler
  il8n: any;                                       // Internationalization object
  rootPath?: string;                               // Root directory path (defaults to '/')
}
```

## Selection Interface

```typescript
interface SelectedItem {
  id: string;           // Unique identifier
  name: string;         // Display name
  path: string;         // Full path
  type: 'file' | 'folder'; // Item type
  item: FileItem | FolderItem; // Full item data
}
```

## GraphQL Integration

The component uses the following GraphQL operations:

### Queries
- `GET_USER_HOME_FILES`: Retrieves folders and files for a given path
- Supports pagination and filtering options

### Mutations
- `DELETE_FILE_MUTATION`: Deletes a user file
- `UPDATE_FILE_MUTATION`: Updates file metadata (rename, etc.)

## Key Changes from Original FilesPanel

1. **Removed Chat Dependencies**: No longer tied to chat sessions
2. **Added Folder Navigation**: Complete folder hierarchy browsing
3. **Enhanced Selection System**: Single and multi-select capabilities
4. **Multiple View Modes**: Grid, list, and table views
5. **Improved Mobile Experience**: Better mobile navigation and touch interactions
6. **Generic File Operations**: Works with any file system, not just chat attachments
7. **Selection Callback**: Notifies parent component of selection changes

## Usage Example

```typescript
import UserHomeFolder from './components/shared/UserHomeFolder/UserHomeFolder';

const MyComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const handleFileUpload = async (files: File[], path: string) => {
    // Handle file upload logic
    console.log(`Uploading ${files.length} files to ${path}`);
  };

  const handleSelectionChange = (items: SelectedItem[]) => {
    setSelectedItems(items);
    console.log(`Selected ${items.length} items:`, items);
  };

  return (
    <UserHomeFolder
      open={isOpen}
      onClose={() => setIsOpen(false)}
      reactory={reactory}
      onFileUpload={handleFileUpload}
      onSelectionChanged={handleSelectionChange}
      il8n={il8n}
      rootPath="/user/documents"
    />
  );
};
```

## Benefits

1. **Flexible**: Can be used in any context requiring file/folder navigation
2. **Accessible**: Full keyboard navigation and screen reader support
3. **Performant**: Efficient rendering of large file lists
4. **Extensible**: Easy to add new view modes or operations
5. **Responsive**: Works seamlessly across all device sizes
6. **User-Friendly**: Intuitive interface with clear visual feedback

## Future Enhancements

- Drag and drop file upload
- File preview functionality
- Sorting and filtering options
- Bulk operations (move, copy)
- Search functionality
- Thumbnail generation for images
- Integration with cloud storage providers

The component is now ready for use as a general-purpose file and folder explorer throughout the Reactory platform.
