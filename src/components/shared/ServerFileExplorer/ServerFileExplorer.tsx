import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  allowUpload = false,
  allowCreateFolder = false,
  allowDelete = false,
  allowRename = false,
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
    Chip
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
    NavigateNext
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

  const handleRefresh = useCallback(() => {
    serverFiles.refreshPath();
  }, [serverFiles]);

  const handleClose = useCallback(() => {
    selection.clearSelection();
    setSearchQuery('');
    onClose();
  }, [selection, onClose]);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

      <DialogContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
        {/* Search and filters */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
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
    </Dialog>
  );
};

export default ServerFileExplorer;

