import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ServerFileExplorerProps, ServerFileItem, ServerFolderItem, ServerSelectedItem, ServerViewMode } from './types';
import { useServerFiles, useServerNavigation, useServerSelection } from './hooks';

const ServerFileExplorer: React.FC<ServerFileExplorerProps> = ({
  open,
  onClose,
  reactory,
  serverPath = '${APP_DATA_ROOT}',
  onFileSelection,
  onFolderSelection,
  selectionMode = 'single',
  allowedFileTypes = [],
  title = 'Server File Explorer',
  allowUpload = true,
  allowCreateFolder = true,
  allowDelete = true,
  allowRename = true,
  readonly = false,
  il8n
}) => {
  // State
  const [viewMode, setViewMode] = useState<ServerViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'modified' | 'type'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Context menu state
  const [contextMenuAnchor, setContextMenuAnchor] = useState<HTMLElement | null>(null);
  const [contextMenuItem, setContextMenuItem] = useState<ServerFileItem | ServerFolderItem | null>(null);

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

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // Custom hooks
  const serverFiles = useServerFiles(reactory, serverPath);
  const navigation = useServerNavigation(serverPath);
  const selection = useServerSelection(selectionMode);

  // Get Material UI components
  const {
    Material
  } = reactory.getComponents<{
    Material: Reactory.Client.Web.IMaterialModule
  }>(["material-ui.Material"]);

  const {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Paper,
    Box,
    Typography,
    IconButton,
    Button,
    TextField,
    Toolbar,
    Divider,
    CircularProgress,
    Alert,
    Breadcrumbs,
    Link,
    Tooltip,
    Chip,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText
  } = Material.MaterialCore;

  const {
    Close,
    Refresh,
    Home,
    ArrowBack,
    ArrowForward,
    FolderOpen,
    InsertDriveFile,
    ViewList,
    ViewModule,
    TableChart,
    AccountTree,
    Search,
    Clear,
    Upload,
    CreateNewFolder,
    Delete,
    Edit,
    MoreVert,
    NavigateNext,
    CloudUpload,
    Download,
    DriveFileMove
  } = Material.MaterialIcons;

  // Load initial server files
  useEffect(() => {
    if (open) {
      serverFiles.loadPath(navigation.currentPath);
    }
  }, [open, navigation.currentPath]);

  // Handle selection changes
  useEffect(() => {
    if (selection.selectedItems.length > 0) {
      const selectedFiles = selection.selectedItems
        .filter(item => item.type === 'file')
        .map(item => item.item as ServerFileItem);
      
      const selectedFolders = selection.selectedItems
        .filter(item => item.type === 'folder')
        .map(item => item.item as ServerFolderItem);

      if (onFileSelection && selectedFiles.length > 0) {
        onFileSelection(selectedFiles);
      }
      
      if (onFolderSelection && selectedFolders.length > 0) {
        onFolderSelection(selectedFolders);
      }
    }
  }, [selection.selectedItems, onFileSelection, onFolderSelection]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    const allItems = [...serverFiles.folders, ...serverFiles.files];
    
    // Filter by search query
    let filtered = searchQuery
      ? allItems.filter(item => 
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : allItems;

    // Filter by allowed file types if specified
    if (allowedFileTypes.length > 0) {
      filtered = filtered.filter(item => {
        if (item.type === 'folder') return true;
        const fileItem = item as ServerFileItem;
        return allowedFileTypes.some(type => 
          fileItem.name.toLowerCase().endsWith(type.toLowerCase()) ||
          fileItem.mimetype.includes(type)
        );
      });
    }

    // Sort items
    filtered.sort((a, b) => {
      // Folders first, then files
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }

      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          const aSize = 'size' in a ? a.size : 0;
          const bSize = 'size' in b ? b.size : 0;
          comparison = aSize - bSize;
          break;
        case 'modified':
          const aModified = 'modified' in a ? a.modified?.getTime() || 0 : 0;
          const bModified = 'modified' in b ? b.modified?.getTime() || 0 : 0;
          comparison = aModified - bModified;
          break;
        case 'type':
          if (a.type === b.type && a.type === 'file') {
            const aExt = (a as ServerFileItem).extension || '';
            const bExt = (b as ServerFileItem).extension || '';
            comparison = aExt.localeCompare(bExt);
          }
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [serverFiles.folders, serverFiles.files, searchQuery, allowedFileTypes, sortBy, sortOrder]);

  // Handlers
  const handleItemClick = useCallback((item: ServerFileItem | ServerFolderItem) => {
    if (item.type === 'folder') {
      navigation.navigate(item.fullPath);
    } else {
      selection.selectItem(item, selectionMode === 'multi');
      if (selectionMode === 'single') {
        // Auto-close dialog on file selection in single mode
        setTimeout(() => onClose(), 100);
      }
    }
  }, [navigation, selection, selectionMode, onClose]);

  const handleItemDoubleClick = useCallback((item: ServerFileItem | ServerFolderItem) => {
    if (item.type === 'folder') {
      navigation.navigate(item.fullPath);
    }
  }, [navigation]);

  const handleContextMenu = useCallback((event: React.MouseEvent, item: ServerFileItem | ServerFolderItem) => {
    event.preventDefault();
    setContextMenuAnchor(event.currentTarget as HTMLElement);
    setContextMenuItem(item);
  }, []);

  const handleMenuClose = useCallback(() => {
    setContextMenuAnchor(null);
    setContextMenuItem(null);
  }, []);

  const handleRefresh = useCallback(() => {
    serverFiles.refreshPath();
  }, [serverFiles]);

  const handleClose = useCallback(() => {
    selection.clearSelection();
    setSearchQuery('');
    setContextMenuAnchor(null);
    setContextMenuItem(null);
    setRenameDialog({ open: false, item: null, newName: '' });
    setCreateFolderDialog({ open: false, folderName: '' });
    setDeleteConfirmDialog({ open: false, items: [] });
    onClose();
  }, [selection, onClose]);

  // File operation handlers
  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    if (!allowUpload) {
      reactory.warning('File upload is not allowed');
      return;
    }

    try {
      const fileArray = Array.from(files);
      await serverFiles.uploadFiles(fileArray, navigation.currentPath);
      reactory.info(`Successfully uploaded ${fileArray.length} file(s)`);
    } catch (error) {
      console.error('Upload error:', error);
    }
  }, [allowUpload, serverFiles, navigation.currentPath, reactory]);

  const handleCreateFolder = useCallback(async () => {
    if (!allowCreateFolder) {
      reactory.warning('Creating folders is not allowed');
      return;
    }

    if (!createFolderDialog.folderName.trim()) {
      reactory.warning('Please enter a folder name');
      return;
    }

    try {
      await serverFiles.createFolder(createFolderDialog.folderName.trim(), navigation.currentPath);
      setCreateFolderDialog({ open: false, folderName: '' });
      reactory.info('Folder created successfully');
    } catch (error) {
      console.error('Create folder error:', error);
    }
  }, [allowCreateFolder, createFolderDialog.folderName, serverFiles, navigation.currentPath, reactory]);

  const handleRenameItem = useCallback(async () => {
    if (!allowRename || !renameDialog.item) {
      return;
    }

    if (!renameDialog.newName.trim() || renameDialog.newName === renameDialog.item.name) {
      setRenameDialog({ open: false, item: null, newName: '' });
      return;
    }

    try {
      await serverFiles.renameItem(renameDialog.item, renameDialog.newName.trim());
      setRenameDialog({ open: false, item: null, newName: '' });
      reactory.info('Item renamed successfully');
    } catch (error) {
      console.error('Rename error:', error);
    }
  }, [allowRename, renameDialog, serverFiles, reactory]);

  const handleDeleteItems = useCallback(async () => {
    if (!allowDelete || deleteConfirmDialog.items.length === 0) {
      return;
    }

    try {
      await serverFiles.deleteItems(deleteConfirmDialog.items);
      setDeleteConfirmDialog({ open: false, items: [] });
      selection.clearSelection();
      reactory.info('Items deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
    }
  }, [allowDelete, deleteConfirmDialog.items, serverFiles, selection, reactory]);

  // Context menu handlers
  const handleMenuItemRename = useCallback(() => {
    if (contextMenuItem) {
      const selectedItem: ServerSelectedItem = {
        id: contextMenuItem.type === 'file' ? (contextMenuItem as ServerFileItem).id : contextMenuItem.path,
        name: contextMenuItem.name,
        path: contextMenuItem.path,
        fullPath: contextMenuItem.fullPath,
        type: contextMenuItem.type,
        item: contextMenuItem
      };
      setRenameDialog({
        open: true,
        item: selectedItem,
        newName: contextMenuItem.name
      });
    }
    handleMenuClose();
  }, [contextMenuItem]);

  const handleMenuItemDelete = useCallback(() => {
    if (contextMenuItem) {
      const selectedItem: ServerSelectedItem = {
        id: contextMenuItem.type === 'file' ? (contextMenuItem as ServerFileItem).id : contextMenuItem.path,
        name: contextMenuItem.name,
        path: contextMenuItem.path,
        fullPath: contextMenuItem.fullPath,
        type: contextMenuItem.type,
        item: contextMenuItem
      };
      setDeleteConfirmDialog({
        open: true,
        items: [selectedItem]
      });
    }
    handleMenuClose();
  }, [contextMenuItem]);

  const handleMenuItemDownload = useCallback(() => {
    if (contextMenuItem && contextMenuItem.type === 'file') {
      const fileItem = contextMenuItem as ServerFileItem;
      // Create a download link
      const link = document.createElement('a');
      link.href = fileItem.fullPath;
      link.download = fileItem.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    handleMenuClose();
  }, [contextMenuItem]);

  const handleDeleteSelected = useCallback(() => {
    if (selection.selectedItems.length > 0) {
      setDeleteConfirmDialog({
        open: true,
        items: selection.selectedItems
      });
    }
  }, [selection.selectedItems]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (allowUpload && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [allowUpload, handleFileUpload]);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Upload area component
  const renderUploadArea = () => {
    if (!allowUpload || readonly) return null;

    return (
      <Box
        sx={{
          border: '2px dashed',
          borderColor: isDragging ? 'primary.main' : 'divider',
          borderRadius: 1,
          p: 2,
          mb: 2,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragging ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: 'action.hover',
            borderColor: 'primary.main'
          }
        }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          if (allowedFileTypes.length > 0) {
            input.accept = allowedFileTypes.join(',');
          }
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) {
              handleFileUpload(files);
            }
          };
          input.click();
        }}
      >
        <CloudUpload sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
        <Typography variant="body2" color="primary.main" fontWeight="medium">
          {isDragging ? 'Drop files here' : 'Click to upload or drag and drop files here'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {allowedFileTypes.length > 0
            ? `Allowed types: ${allowedFileTypes.join(', ')}`
            : 'All file types allowed'}
        </Typography>
      </Box>
    );
  };

  // Render breadcrumbs
  const renderBreadcrumbs = () => {
    const pathParts = navigation.currentPath.split('/').filter(Boolean);
    const breadcrumbParts = ['root', ...pathParts];

    return (
      <Breadcrumbs
        separator={<NavigateNext fontSize="small" />}
        sx={{ flex: 1, mx: 2 }}
      >
        <Link
          component="button"
          variant="body2"
          onClick={() => navigation.goHome()}
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <Home sx={{ mr: 0.5 }} fontSize="small" />
          Server Root
        </Link>
        {pathParts.map((part, index) => {
          const path = '/' + pathParts.slice(0, index + 1).join('/');
          const isLast = index === pathParts.length - 1;
          
          if (part === serverPath || part === '${APP_DATA_ROOT}') {
            return null; // Skip displaying the root path part
          }

          return isLast ? (
            <Typography key={path} color="text.primary" variant="body2">
              {part}
            </Typography>
          ) : (
            <Link
              key={path}
              component="button"
              variant="body2"
              onClick={() => navigation.navigate(serverPath + path)}
            >
              {part}
            </Link>
          );
        })}
      </Breadcrumbs>
    );
  };

  // Render file/folder item
  const renderItem = (item: ServerFileItem | ServerFolderItem) => {
    const isSelected = selection.isSelected(item);
    const isFolder = item.type === 'folder';

    return (
      <Paper
        key={isFolder ? item.path : (item as ServerFileItem).id}
        sx={{
          p: 1.5,
          cursor: 'pointer',
          border: 1,
          borderColor: isSelected ? 'primary.main' : 'divider',
          '&:hover': {
            backgroundColor: 'action.hover'
          }
        }}
        onClick={() => handleItemClick(item)}
        onDoubleClick={() => handleItemDoubleClick(item)}
        onContextMenu={(e) => handleContextMenu(e, item)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isFolder ? (
            <FolderOpen color="primary" />
          ) : (
            <InsertDriveFile color="action" />
          )}
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap>
              {item.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isFolder ? 
                `Folder • ${(item as ServerFolderItem).fileCount || 0} items` :
                `${formatFileSize((item as ServerFileItem).size)} • ${(item as ServerFileItem).extension.toUpperCase()}`
              }
            </Typography>
          </Box>

          {!readonly && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleContextMenu(e, item);
              }}
            >
              <MoreVert fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Paper>
    );
  };

  // Context menu component
  const renderContextMenu = () => (
    <Menu
      anchorEl={contextMenuAnchor}
      open={Boolean(contextMenuAnchor)}
      onClose={handleMenuClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      {contextMenuItem?.type === 'file' && (
        <MenuItem onClick={handleMenuItemDownload}>
          <ListItemIcon>
            <Download fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
      )}
      {allowRename && !readonly && (
        <MenuItem onClick={handleMenuItemRename}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
      )}
      {allowDelete && !readonly && (
        <MenuItem onClick={handleMenuItemDelete}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      )}
    </Menu>
  );

  // Rename dialog component
  const renderRenameDialog = () => (
    <Dialog
      open={renameDialog.open}
      onClose={() => setRenameDialog({ open: false, item: null, newName: '' })}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Rename {renameDialog.item?.type === 'file' ? 'File' : 'Folder'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="New name"
          type="text"
          fullWidth
          value={renameDialog.newName}
          onChange={(e) => setRenameDialog(prev => ({ ...prev, newName: e.target.value }))}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleRenameItem();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setRenameDialog({ open: false, item: null, newName: '' })}>
          Cancel
        </Button>
        <Button onClick={handleRenameItem} variant="contained" color="primary">
          Rename
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Create folder dialog component
  const renderCreateFolderDialog = () => (
    <Dialog
      open={createFolderDialog.open}
      onClose={() => setCreateFolderDialog({ open: false, folderName: '' })}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Create New Folder</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Folder name"
          type="text"
          fullWidth
          value={createFolderDialog.folderName}
          onChange={(e) => setCreateFolderDialog(prev => ({ ...prev, folderName: e.target.value }))}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleCreateFolder();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateFolderDialog({ open: false, folderName: '' })}>
          Cancel
        </Button>
        <Button onClick={handleCreateFolder} variant="contained" color="primary">
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Delete confirmation dialog component
  const renderDeleteConfirmDialog = () => (
    <Dialog
      open={deleteConfirmDialog.open}
      onClose={() => setDeleteConfirmDialog({ open: false, items: [] })}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete {deleteConfirmDialog.items.length} item(s)?
        </Typography>
        <Box sx={{ mt: 2 }}>
          {deleteConfirmDialog.items.map((item, index) => (
            <Chip
              key={index}
              label={item.name}
              size="small"
              icon={item.type === 'folder' ? <FolderOpen /> : <InsertDriveFile />}
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))}
        </Box>
        <Alert severity="warning" sx={{ mt: 2 }}>
          This action cannot be undone!
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteConfirmDialog({ open: false, items: [] })}>
          Cancel
        </Button>
        <Button onClick={handleDeleteItems} variant="contained" color="error">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '80vh', display: 'flex', flexDirection: 'column' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      {/* Toolbar */}
      <Toolbar variant="dense">
        <Tooltip title="Back">
          <span>
            <IconButton 
              onClick={navigation.goBack} 
              disabled={!navigation.canGoBack}
              size="small"
            >
              <ArrowBack />
            </IconButton>
          </span>
        </Tooltip>
        
        <Tooltip title="Forward">
          <span>
            <IconButton 
              onClick={navigation.goForward} 
              disabled={!navigation.canGoForward}
              size="small"
            >
              <ArrowForward />
            </IconButton>
          </span>
        </Tooltip>
        
        <Tooltip title="Up">
          <span>
            <IconButton 
              onClick={navigation.navigateUp} 
              disabled={navigation.currentPath === serverPath}
              size="small"
            >
              <Home />
            </IconButton>
          </span>
        </Tooltip>

        {renderBreadcrumbs()}

        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} size="small">
            <Refresh />
          </IconButton>
        </Tooltip>

        {/* Action buttons */}
        {(
          <Box sx={{ ml: 1, display: 'flex', gap: 0.5 }}>
            {allowUpload && (
              <Tooltip title="Upload files">
                <IconButton
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    if (allowedFileTypes.length > 0) {
                      input.accept = allowedFileTypes.join(',');
                    }
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files) {
                        handleFileUpload(files);
                      }
                    };
                    input.click();
                  }}
                  size="small"
                  color="primary"
                >
                  <Upload />
                </IconButton>
              </Tooltip>
            )}
            {allowCreateFolder && (
              <Tooltip title="Create folder">
                <IconButton
                  onClick={() => setCreateFolderDialog({ open: true, folderName: '' })}
                  size="small"
                  color="primary"
                >
                  <CreateNewFolder />
                </IconButton>
              </Tooltip>
            )}
            {allowDelete && selection.selectedItems.length > 0 && (
              <Tooltip title="Delete selected">
                <IconButton
                  onClick={handleDeleteSelected}
                  size="small"
                  color="error"
                >
                  <Delete />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}

        {/* View mode controls */}
        <Box sx={{ ml: 1, display: 'flex' }}>
          <Tooltip title="List view">
            <IconButton
              onClick={() => setViewMode('list')}
              color={viewMode === 'list' ? 'primary' : 'default'}
              size="small"
            >
              <ViewList />
            </IconButton>
          </Tooltip>
          <Tooltip title="Grid view">
            <IconButton
              onClick={() => setViewMode('grid')}
              color={viewMode === 'grid' ? 'primary' : 'default'}
              size="small"
            >
              <ViewModule />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      <Divider />

      <DialogContent 
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 0 }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Search and filters */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          {/* Upload area */}
          {renderUploadArea()}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <TextField
              size="small"
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                endAdornment: searchQuery && (
                  <IconButton
                    size="small"
                    onClick={() => setSearchQuery('')}
                  >
                    <Clear />
                  </IconButton>
                )
              }}
              sx={{ flex: 1 }}
            />

            <Button
              variant="outlined"
              size="small"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              Sort: {sortBy} ({sortOrder})
            </Button>
          </Box>

          {selection.selectedItems.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`${selection.selectedItems.length} selected`}
                size="small"
                color="primary"
                onDelete={selection.clearSelection}
              />
            </Box>
          )}
        </Box>

        {/* Drag overlay */}
        {isDragging && allowUpload && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(25, 118, 210, 0.1)',
              border: '3px dashed',
              borderColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              pointerEvents: 'none'
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" color="primary.main">
                Drop files to upload
              </Typography>
            </Box>
          </Box>
        )}

        {/* Content area */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {serverFiles.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : serverFiles.error ? (
            <Alert severity="error">{serverFiles.error}</Alert>
          ) : filteredAndSortedItems.length > 0 ? (
            <Box sx={{ 
              display: 'grid', 
              gap: 1,
              gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(250px, 1fr))' : '1fr'
            }}>
              {filteredAndSortedItems.map(renderItem)}
            </Box>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              p: 4,
              color: 'text.secondary'
            }}>
              <FolderOpen sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" gutterBottom>
                No files or folders found
              </Typography>
              <Typography variant="body2">
                {searchQuery ? 
                  'Try adjusting your search terms' : 
                  'This directory is empty'
                }
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      {/* Footer with selection info */}
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {filteredAndSortedItems.length} items
          {selection.selectedItems.length > 0 && ` • ${selection.selectedItems.length} selected`}
        </Typography>
        
        <Box>
          <Button onClick={handleClose}>
            Cancel
          </Button>
          {selection.selectedItems.length > 0 && (
            <Button 
              variant="contained" 
              onClick={handleClose}
              sx={{ ml: 1 }}
            >
              Select ({selection.selectedItems.length})
            </Button>
          )}
        </Box>
      </DialogActions>

      {/* Context menu */}
      {renderContextMenu()}

      {/* Dialogs */}
      {renderRenameDialog()}
      {renderCreateFolderDialog()}
      {renderDeleteConfirmDialog()}
    </Dialog>
  );
};

export default ServerFileExplorer;

