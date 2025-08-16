# FilesPanel Sliding Panel Integration

## Overview

The `FilesPanel` component has been enhanced with a sliding panel integration that allows users to browse their entire file system when the "Show all files and folders" toggle is activated. This feature provides a seamless transition between the chat-specific file management view and a comprehensive file explorer.

## Key Features

### 1. **Sliding Panel Animation**
- Smooth transition with a 300ms ease-in-out animation
- FilesPanel slides out to the left when UserHomeFolder is activated
- UserHomeFolder slides in from the right
- Visual transition state management prevents UI conflicts

### 2. **Dual Panel System**
- **FilesPanel**: Manages files specifically attached to the current chat session
- **UserHomeFolder**: Provides full file system browsing capabilities with folder navigation, multiple view modes, and selection features

### 3. **File Selection Integration**
- Real-time display of selected file count in the header
- "Add to Chat" button appears when files are selected
- Selected files can be added to the chat context
- Selection state is preserved during panel transitions

### 4. **Enhanced Header**
- Dynamic title changes based on active panel
- Selected file count indicator
- "Add to Chat" button for selected files
- Proper mobile title handling for both views

## Implementation Details

### New State Variables
```typescript
const [isTransitioning, setIsTransitioning] = useState(false);
const [showUserHomeFolder, setShowUserHomeFolder] = useState(false);
const [selectedFiles, setSelectedFiles] = useState<SelectedItem[]>([]);
```

### Key Handler Functions

#### Toggle Handler
```typescript
const handleShowAllFilesToggle = useCallback(async (checked: boolean) => {
  if (checked) {
    // Start transition to UserHomeFolder
    setIsTransitioning(true);
    setShowAllFiles(true);
    
    // Wait for transition to complete before showing UserHomeFolder
    setTimeout(() => {
      setShowUserHomeFolder(true);
      setIsTransitioning(false);
    }, 300);
  } else {
    // Transition back to FilesPanel
    setIsTransitioning(true);
    setShowUserHomeFolder(false);
    
    // Wait for transition to complete before updating showAllFiles
    setTimeout(() => {
      setShowAllFiles(false);
      setIsTransitioning(false);
      setSelectedFiles([]); // Clear selected files when returning
    }, 300);
  }
}, []);
```

#### File Selection Handler
```typescript
const handleFileSelection = useCallback((selectedItems: SelectedItem[]) => {
  setSelectedFiles(selectedItems);
  
  // Optionally add selected files to chat context
  if (selectedItems.length > 0) {
    reactory.info(`Selected ${selectedItems.length} files for chat context:`, selectedItems);
    
    // You can implement logic here to add files to the chat context
    // For example, upload them or reference them in the conversation
  }
}, [reactory]);
```

### Component Structure

```tsx
<Box sx={{ /* Container for sliding panels */ }}>
  {/* FilesPanel - Slides out to the left */}
  <Paper sx={{
    transform: showUserHomeFolder ? 'translateX(-100%)' : 'translateX(0)',
    transition: 'transform 0.3s ease-in-out',
  }}>
    {/* Original FilesPanel content */}
  </Paper>

  {/* UserHomeFolder - Slides in from the right */}
  <Box sx={{
    transform: showUserHomeFolder ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.3s ease-in-out',
  }}>
    <UserHomeFolder
      open={showUserHomeFolder}
      onClose={() => handleShowAllFilesToggle(false)}
      onFileUpload={handleUserHomeFolderFileUpload}
      onSelectionChanged={handleFileSelection}
      // ... other props
    />
  </Box>
</Box>
```

## User Experience Flow

1. **Initial State**: User sees the standard FilesPanel with chat-specific files
2. **Toggle Activation**: User toggles "Show all files and folders"
3. **Transition**: FilesPanel slides left while UserHomeFolder slides in from right
4. **File Browsing**: User can navigate folders, view files in multiple modes, and select items
5. **File Selection**: Selected files are shown with a count in the header
6. **Add to Chat**: User can add selected files to chat context via "Add to Chat" button
7. **Return**: Toggle off or close action slides panels back to original state

## Mobile Responsiveness

- Dynamic title updates show selection count on mobile
- Touch-friendly interactions maintained
- Proper state cleanup ensures smooth transitions
- Mobile view modes are preserved during transitions

## State Management

### State Cleanup
State is properly cleared when:
- Panel is closed
- Chat session changes
- Persona changes
- Returning from UserHomeFolder view

### Transition Management
- `isTransitioning` state prevents user interactions during animations
- Toggle switch is disabled during transitions
- Proper timing ensures smooth visual experience

## Integration Benefits

1. **Seamless Workflow**: Users can browse their file system without leaving the chat interface
2. **Context Preservation**: Chat state and file attachments are maintained
3. **Enhanced Productivity**: Quick access to any file for inclusion in chat context
4. **User-Friendly**: Smooth animations and clear visual feedback
5. **Extensible**: Foundation for additional file management features

## Future Enhancements

- Drag and drop file transfer between panels
- Bulk file operations
- File preview in UserHomeFolder mode
- Search functionality across both views
- File tagging and organization features
- Integration with cloud storage providers

## Technical Notes

- Uses React hooks for state management
- Leverages Material-UI components for consistency
- Maintains TypeScript type safety
- Implements proper error handling
- Follows React best practices for performance
