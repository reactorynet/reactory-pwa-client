import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { UserHomeFolderProps, ViewMode, MobileView, SelectedItem, FileItem, FolderItem, HierarchicalFolderItem } from './types';
import { useUserHomeFiles, useFileOperations, useItemSelection } from './hooks';
import { useFolderState } from './hooks/useFolderState';
import {
  FilePreview,
  ItemContextMenu,
  RenameDialog,
  CreateFolderDialog,
  MobileFabs
} from './components/shared';
import UserHomeFolderHeader from './components/UserHomeFolderHeader';
import { getParentPath, filterFiles } from './utils';

const UserHomeFolder: React.FC<UserHomeFolderProps> = ({
  open,
  onClose,
  reactory,
  onFileUpload,
  onSelectionChanged,
  onItemSelect,
  onItemDeselect,
  il8n,
  rootPath = '/',
  allowMultiSelect = true,
  selectedItems: externalSelectedItems = []
}) => {
  // Core state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [multiSelectEnabled, setMultiSelectEnabled] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>('folders');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Context menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuItem, setMenuItem] = useState<FileItem | FolderItem | null>(null);

  // Use the new folder state management hook
  const folderState = useFolderState(rootPath);

  // Store folderState methods in refs to break circular dependencies
  const folderStateRef = useRef(folderState);
  folderStateRef.current = folderState;

  // Handle selection changes with auto-close logic
  const handleSelectionChanged = useCallback((selectedItems: SelectedItem[], selectionMode: 'single' | 'multi') => {
    // Auto-close panel when a file is selected in single mode
    if (selectionMode === 'single' && selectedItems.length > 0) {
      const selectedItem = selectedItems[0];
      if (selectedItem.type === 'file') {
        // Close the panel after a short delay to allow the selection to be processed
        setTimeout(() => {
          onClose();
        }, 100);
      }
    }
    
    // Call the original onSelectionChanged if provided
    if (onSelectionChanged) {
      onSelectionChanged(selectedItems, selectionMode);
    }
  }, [onClose, onSelectionChanged]);

  // Separate state for current path files
  const [currentPathFiles, setCurrentPathFiles] = useState<FileItem[]>([]);

  // Tree-based selection state for multi-folder navigation
  const [selectionTree, setSelectionTree] = useState<Map<string, Set<string>>>(new Map());
  const [currentSelectionPath, setCurrentSelectionPath] = useState<string>(rootPath);

  // Custom hooks
  const {
    files,
    loading,
    folderLoading,
    loadUserFiles,
    loadAllFolders,
    createFolder,
    deleteFolder,
    deleteFile,
    updateFile,
    moveItem
  } = useUserHomeFiles(reactory);

  // Get folders from the folder state hook
  const folders = Array.from(folderState.folderTree.values());

  // Memoize fileOperations config to prevent circular dependencies
  const fileOperationsConfig = useMemo(() => ({
    reactory,
    currentPath: folderState.currentPath,
    onFileUpload,
    loadUserFiles,
    createFolderOperation: createFolder,
    deleteFolderOperation: deleteFolder,
    deleteFileOperation: deleteFile,
    updateFileOperation: updateFile,
    moveItemOperation: moveItem
  }), [reactory, folderState.currentPath, onFileUpload, loadUserFiles, createFolder, deleteFolder, deleteFile, updateFile, moveItem]);

  const fileOperations = useFileOperations(fileOperationsConfig);

  const {
    selectedItems,
    setSelectedItems,
    handleItemSelection,
    isItemSelected,
    handleSelectAll,
    handleClearSelection,
    clearLocalSelection: originalClearLocalSelection
  } = useItemSelection(
    multiSelectEnabled,
    handleSelectionChanged,
    onItemSelect,
    onItemDeselect,
    reactory,
    externalSelectedItems
  );

  // Enhanced clearLocalSelection that also clears the selection tree
  const clearLocalSelection = useCallback(() => {
    originalClearLocalSelection();
    setSelectionTree(new Map());
    setCurrentSelectionPath(rootPath);
  }, [originalClearLocalSelection, rootPath]);

  // Debounced search to prevent excessive re-renders
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter files based on debounced search
  const filteredFiles = useMemo(() => filterFiles(files, debouncedSearchQuery), [files, debouncedSearchQuery]);

  // Get folders for current path and combine with files for display
  const currentPathItems = useMemo(() => {
    // For the left panel, we want to show ALL folders in the tree structure
    // For the right panel, we want to show files and direct subfolders of current path
    
    // Get folders that are direct children of current path (for right panel)
    const currentPathFolders = folderStateRef.current.getSubfolders(folderState.currentPath);
    
    const currentFiles = files;
    
    return [
      ...currentPathFolders.map(folder => ({
        ...folder,
        displayType: 'folder' as const,
        sortKey: `0_${folder.name.toLowerCase()}` // Folders first, then files
      })),
      ...currentFiles.map(file => ({
        ...file,
        displayType: 'file' as const,
        sortKey: `1_${file.name.toLowerCase()}` // Files after folders
      }))
    ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [folderState.currentPath, files]);

  // Helper function to get unique identifier for items
  const getItemKey = useCallback((item: any) => {
    return item.displayType === 'folder' ? item.path : item.id;
  }, []);

  // Helper function to check if item is selected
  const isCurrentItemSelected = useCallback((item: any) => {
    return item.displayType === 'folder' ? isItemSelected(item) : isItemSelected(item);
  }, [isItemSelected]);

  // Handle folder expansion/collapse
  const handleFolderToggle = useCallback((folderPath: string) => {
    folderStateRef.current.toggleFolder(folderPath);
    // When expanding a folder, load its contents
    if (!folderStateRef.current.isExpanded(folderPath)) {
      // Use a ref to avoid circular dependency
      loadUserFiles(folderPath).then(result => {
        if (result.folders.length > 0) {
          folderStateRef.current.updateFolderContents(result.folders, result.files, folderPath);
        }
      });
    }
  }, []);

  // Auto-expand path to current folder
  const expandPathToCurrent = useCallback((targetPath: string) => {
    const pathParts = targetPath.split('/').filter(Boolean);
    const pathsToExpand = new Set<string>();

    let currentPathPart = '';
    pathParts.forEach(part => {
      currentPathPart = currentPathPart ? `${currentPathPart}/${part}` : `/${part}`;
      pathsToExpand.add(currentPathPart);
    });

    pathsToExpand.forEach(path => folderStateRef.current.expandFolder(path));
  }, []);

  // Load folder contents without changing current path
  const loadFolderContents = useCallback(async (folderPath: string) => {
    try {
      // Don't reload folders - just mark as expanded
      // The folder tree should already contain all folders
      folderStateRef.current.expandFolder(folderPath);
    } catch (error) {
      reactory.error(`Failed to expand folder ${folderPath}`, error);
    }
  }, [reactory]);

  // Get Material UI components
  const {
    Material
  } = reactory.getComponents<{
    Material: Reactory.Client.Web.IMaterialModule
  }>(["material-ui.Material"]);

  const {
    Paper,
    Box,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemButton,
    Divider,
    Chip,
    CircularProgress,
    Button,
    TextField,
    Grid,
    Card,
    CardContent,
    CardActions,
    Avatar,
    Tooltip,
    Switch,
    FormControlLabel
  } = Material.MaterialCore;

  const {
    ArrowBack,
    InsertDriveFile,
    Folder,
    ViewModule,
    ViewList,
    TableChart,
    CheckBoxOutlineBlank,
    CheckBox,
    SelectAll,
    Home,
    Search,
    Clear,
    MoreVert,
    CloudUpload,
    Add,
    ExpandMore,
    ChevronRight,
    Close
  } = Material.MaterialIcons;

  // Load files when panel opens or when current path changes
  useEffect(() => {
    if (open) {
      // Load ALL folders to build the complete tree structure
      loadAllFolders(rootPath).then(rootFolders => {
        if (rootFolders.length > 0) {
          folderStateRef.current.addFolders(rootFolders, '/');
        }
      });
      // Auto-expand the path to show current location in tree
      expandPathToCurrent(folderStateRef.current.currentPath);
    }
  }, [open, loadAllFolders, expandPathToCurrent]);

  // Load files for current path when it changes (separate from folder loading)
  useEffect(() => {
    if (open && folderState.currentPath !== rootPath) {
      // Load files for the current path without affecting the folder tree
      loadUserFiles(folderState.currentPath).then(result => {
        if (result.folders.length > 0) {
          folderStateRef.current.updateFolderContents(result.folders, result.files, folderState.currentPath);
        }
      });
    } else if (open && folderState.currentPath === rootPath) {
      // For root path, load files from root
      loadUserFiles(rootPath).then(result => {
        if (result.folders.length > 0) {
          folderStateRef.current.updateFolderContents(result.folders, result.files, rootPath);
        }
      });
    }
  }, [open, folderState.currentPath, loadUserFiles]);

  // Restore selections when files/folders change (only if we have stored selections)
  useEffect(() => {
    if (open && folders.length > 0 && files.length > 0) {
      const existingSelections = selectionTree.get(folderState.currentPath);
      if (existingSelections && existingSelections.size > 0) {
        const itemsToSelect = [...folders, ...files].filter(item => {
          const itemId = 'id' in item ? item.id : item.path;
          return existingSelections.has(itemId);
        });

        if (itemsToSelect.length > 0) {
          setSelectedItems(itemsToSelect.map(item => ({
            id: 'id' in item ? item.id : item.path,
            name: item.name,
            path: item.path,
            type: item.type,
            item
          })));
        }
      }
    }
  }, [folders, files, folderState.currentPath, selectionTree, open]);

  // Clear selection and search when path changes
  useEffect(() => {
    // Don't clear selections when path changes, just update the current selection path
    setCurrentSelectionPath(folderState.currentPath);
    setSearchQuery('');
  }, [folderState.currentPath]); // Remove clearLocalSelection from dependencies



  // Clear state when panel closes
  useEffect(() => {
    if (!open) {
      clearLocalSelection();
      setSearchQuery('');
      setMobileView('folders');
      setSelectionTree(new Map());
      setCurrentSelectionPath(rootPath);
      folderStateRef.current.clearFolderState();
      fileOperations.setRenameDialog({
        open: false,
        fileId: '',
        currentName: '',
        newName: ''
      });
      fileOperations.setCreateFolderDialog({
        open: false,
        folderName: ''
      });
      setAnchorEl(null);
      setMenuItem(null);
    }
  }, [open, clearLocalSelection, rootPath, fileOperations.setRenameDialog, fileOperations.setCreateFolderDialog]);

  // Monitor anchorEl changes for debugging
  useEffect(() => {
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(anchorEl);
      
      console.log('AnchorEl changed:', {
        anchorEl,
        tagName: anchorEl.tagName,
        className: anchorEl.className,
        rect,
        computedStyle: {
          position: computedStyle.position,
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          zIndex: computedStyle.zIndex
        },
        isInDocument: document.contains(anchorEl),
        offsetParent: anchorEl.offsetParent,
        parentElement: anchorEl.parentElement
      });
    }
  }, [anchorEl]);

  // Navigation functions
  const handleFolderSelect = useCallback((folder: FolderItem) => {
    // Store current selections before navigating
    if (multiSelectEnabled && selectedItems.length > 0) {
      setSelectionTree(prev => {
        const newTree = new Map(prev);
        newTree.set(currentSelectionPath, new Set(selectedItems.map(item => item.id)));
        return newTree;
      });
    }
    
    // Update current path and selection path
    folderStateRef.current.setCurrentPath(folder.path);
    setCurrentSelectionPath(folder.path);
    
    // Auto-expand the path to show current location in tree
    expandPathToCurrent(folder.path);
    
    // Load contents for the selected folder
    loadUserFiles(folder.path).then(result => {
      if (result.folders.length > 0) {
        folderStateRef.current.updateFolderContents(result.folders, result.files, folder.path);
      }
    });
  }, [multiSelectEnabled, selectedItems, currentSelectionPath, expandPathToCurrent]);

  const navigateUp = useCallback(() => {
    const parentPath = getParentPath(folderState.currentPath);
    if (parentPath !== folderState.currentPath) {
      // Store current selections before navigating
      if (multiSelectEnabled && selectedItems.length > 0) {
        setSelectionTree(prev => {
          const newTree = new Map(prev);
          newTree.set(currentSelectionPath, new Set(selectedItems.map(item => item.id)));
          return newTree;
        });
      }
      
      // Update paths
      folderStateRef.current.setCurrentPath(parentPath);
      setCurrentSelectionPath(parentPath);
      
      // Auto-expand the path to show current location in tree
      expandPathToCurrent(parentPath);
      
      // Load contents for the parent path
      loadUserFiles(parentPath).then(result => {
        if (result.folders.length > 0) {
          folderStateRef.current.updateFolderContents(result.folders, result.files, parentPath);
        }
      });
    }
  }, [folderState.currentPath, multiSelectEnabled, selectedItems, currentSelectionPath, expandPathToCurrent]);

  const handleRefresh = useCallback(() => {
    // Store current selections before refreshing
    if (multiSelectEnabled && selectedItems.length > 0) {
      setSelectionTree(prev => {
        const newTree = new Map(prev);
        newTree.set(currentSelectionPath, new Set(selectedItems.map(item => item.id)));
        return newTree;
      });
    }

    // Refresh the complete folder tree
    loadAllFolders(rootPath).then(rootFolders => {
      if (rootFolders.length > 0) {
        folderStateRef.current.addFolders(rootFolders, '/');
      }
    });

    // Refresh files for current path if not root
    if (folderState.currentPath !== '/') {
      loadUserFiles(folderState.currentPath).then(result => {
        if (result.folders.length > 0) {
          folderStateRef.current.updateFolderContents(result.folders, result.files, folderState.currentPath);
        }
      });
    }
  }, [loadUserFiles, folderState.currentPath, multiSelectEnabled, selectedItems, currentSelectionPath, loadAllFolders]);

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: FileItem | FolderItem) => {
    event.stopPropagation();
    
    // Get the button element directly from the event
    const buttonElement = event.currentTarget as HTMLElement;
    
    // Check if the parent container has transforms that might interfere with positioning
    const parentContainer = buttonElement.closest('[style*="transform"]');
    if (parentContainer) {
      console.warn('Parent container has transforms, this may affect menu positioning:', parentContainer);
    }
    
    console.log('Menu opening debug:', {
      itemType: item.type,
      itemName: item.name,
      buttonElement,
      buttonRect: buttonElement.getBoundingClientRect(),
      parentContainer: parentContainer
    });
    
    setAnchorEl(buttonElement);
    setMenuItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuItem(null);
  };

  // Enhanced item selection with auto-select logic for single mode
  const handleEnhancedItemSelection = useCallback(async (item: FileItem | FolderItem, isSelected: boolean) => {
    // In single mode, automatically select files when clicked
    if (!multiSelectEnabled && item.type === 'file') {
      // Always select the file in single mode
      await handleItemSelection(item, true);
      return;
    }
    
    // For multi-mode or folders, use normal selection logic
    await handleItemSelection(item, isSelected);
  }, [multiSelectEnabled, handleItemSelection]);

  // Recursive folder item component
  const FolderItem = useCallback(React.memo(({ folder, level = 0 }: { folder: HierarchicalFolderItem; level?: number }) => {
    const isExpanded = folderStateRef.current.isExpanded(folder.path);
    const hasChildren = folder.children && folder.children.length > 0;
    const isCurrentPath = folder.path === folderState.currentPath;

    const handleToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        handleFolderToggle(folder.path);
        // Don't automatically load contents - let user control expansion
      }
    };

    const handleSelect = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (multiSelectEnabled) {
        handleEnhancedItemSelection(folder, !isItemSelected(folder));
      } else {
        // Navigate into the folder
        handleFolderSelect(folder);
      }
    };

    return (
      <Box sx={{ position: 'relative' }}>
        <ListItem sx={{
          px: { xs: 1, md: 1.5 },
          py: { xs: 0.25, md: 0 },
          pl: { xs: 1 + level * 2, md: 1.5 + level * 2 },
          bgcolor: isCurrentPath ? 'action.selected' : 'transparent',
          borderRadius: 1,
          mx: 0.5
        }}>
          <ListItemButton
            onClick={handleSelect}
            selected={isItemSelected(folder)}
            sx={{
              borderRadius: 1,
              minHeight: { xs: 48, md: 'auto' },
              py: { xs: 0.75, md: 0.25 },
              bgcolor: 'transparent'
            }}
          >
            {multiSelectEnabled && (
              <ListItemIcon sx={{ minWidth: { xs: 32, md: 40 } }}>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEnhancedItemSelection(folder, !isItemSelected(folder));
                  }}
                  size="small"
                >
                  {isItemSelected(folder) ? <CheckBox fontSize="small" /> : <CheckBoxOutlineBlank fontSize="small" />}
                </IconButton>
              </ListItemIcon>
            )}

            <ListItemIcon sx={{ minWidth: { xs: 36, md: 56 } }}>
              {hasChildren ? (
                <IconButton
                  onClick={handleToggle}
                  size="small"
                  sx={{ p: 0.5 }}
                >
                  {isExpanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
                </IconButton>
              ) : (
                <Box sx={{ 
                  width: 24, 
                  height: 24, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }} />
              )}
              <Folder fontSize="small" />
            </ListItemIcon>

            <ListItemText
              primary={
                <Typography variant="body2" sx={{
                  fontWeight: isCurrentPath ? 'bold' : 'medium',
                  fontSize: { xs: '0.8rem', md: '0.875rem' },
                  color: isCurrentPath ? 'primary.main' : 'text.primary'
                }}>
                  {folder.name}
                  {isCurrentPath && (
                    <Chip
                      label="Current"
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ ml: 1, fontSize: '0.6rem', height: 16 }}
                    />
                  )}
                </Typography>
              }
            />
          </ListItemButton>
        </ListItem>

        {/* Render children if expanded */}
        {isExpanded && hasChildren && (
          <Box>
            {folder.children.map((child) => (
              <FolderItem key={child.path} folder={child} level={level + 1} />
            ))}
          </Box>
        )}
      </Box>
    );
  }), [multiSelectEnabled, handleFolderToggle, handleEnhancedItemSelection, isItemSelected, handleFolderSelect, folderState.currentPath]);

  // Format file size helper
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Upload area component
  const UploadArea = () => (
    <Box
      sx={{
        border: '2px dashed',
        borderColor: 'primary.main',
        borderRadius: 2,
        p: { xs: 1.5, md: 2 },
        textAlign: 'center',
        cursor: 'pointer',
        bgcolor: 'action.hover',
        minHeight: { xs: '60px', md: '80px' },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        '&:hover': {
          bgcolor: 'action.selected',
        },
      }}
      onClick={() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*,application/pdf,text/*,.docx,.xlsx';
        input.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files) {
            fileOperations.handleFileUpload(files);
          }
        };
        input.click();
      }}
    >
      <CloudUpload sx={{
        fontSize: { xs: 24, md: 28 },
        color: 'primary.main',
        mb: 0.5
      }} />
      <Typography variant="body2" color="primary.main" sx={{
        fontWeight: 'medium',
        fontSize: { xs: '0.7rem', md: '0.8rem' }
      }}>
        Upload files
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{
        fontSize: { xs: '0.6rem', md: '0.7rem' },
        mt: 0.5,
        fontStyle: 'italic'
      }}>
        Files will be added to chat context
      </Typography>
    </Box>
  );

  // Folder list component
  const FolderList = () => (
    <Box sx={{ flex: 1, overflow: 'auto' }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: { xs: 1.5, md: 1.5 },
        pb: 1
      }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{
            fontWeight: 'bold',
            fontSize: { xs: '0.875rem', md: '1rem' }
          }}>
            {il8n?.t('reactor.client.folders.list', { defaultValue: 'Folders' })} ({folders.length})
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{
            fontSize: { xs: '0.7rem', md: '0.75rem' },
            display: 'block',
            mt: 0.5
          }}>
            Current: {folderState.currentPath}
          </Typography>
        </Box>
        <Tooltip title="Create new folder">
          <IconButton
            onClick={() => fileOperations.setCreateFolderDialog({ open: true, folderName: '' })}
            size="small"
            color="primary"
          >
            <Add />
          </IconButton>
        </Tooltip>
      </Box>

      {folderLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : folderState.hierarchicalFolders.length > 0 ? (
        <List sx={{ p: 0 }}>
          {folderState.hierarchicalFolders.map((folder) => (
            <FolderItem key={folder.path} folder={folder} />
          ))}
        </List>
      ) : (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {il8n?.t('reactor.client.folders.empty', { defaultValue: 'No folders found' })}
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease-in-out',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2,
        backdropFilter: 'blur(10px) saturate(120%)'
      }}
    >
      {/* Header */}
      <UserHomeFolderHeader
        open={open}
        reactory={reactory}
        loading={loading}
        mobileView={mobileView}
        currentPath={folderState.currentPath}
        onClose={onClose}
        onRefresh={handleRefresh}
        onMobileBack={() => setMobileView('folders')}
        il8n={il8n}
      />
      {/* Content */}
      <Box sx={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        flexDirection: { xs: 'column', md: 'row' }
      }}>
        {/* Left Panel - Folder List & Navigation */}
        <Box sx={{
          width: { xs: '100%', md: '40%' },
          height: { xs: '100%', md: 'auto' },
          borderRight: { xs: 0, md: 1 },
          borderBottom: { xs: 1, md: 0 },
          borderColor: 'divider',
          display: {
            xs: mobileView === 'folders' ? 'flex' : 'none',
            md: 'flex'
          },
          flexDirection: 'column'
        }}>
          {/* Navigation & Controls */}
          <Box sx={{
            p: { xs: 1.5, md: 1.5 },
            borderBottom: 1,
            borderColor: 'divider'
          }}>
            {/* Breadcrumb Navigation */}
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                onClick={() => folderState.setCurrentPath(rootPath)}
                size="small"
                disabled={folderState.currentPath === rootPath}
              >
                <Home />
              </IconButton>
              <IconButton
                onClick={navigateUp}
                size="small"
                disabled={folderState.currentPath === rootPath}
              >
                <ArrowBack />
              </IconButton>
              <Typography variant="body2" sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {folderState.currentPath}
              </Typography>
              <Tooltip title="Close dialog">
                <IconButton
                  onClick={onClose}
                  size="small"
                  color="default"
                  sx={{ ml: 1 }}
                >
                  <Close />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Multi-select Toggle */}
            {allowMultiSelect && (
              <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={multiSelectEnabled}
                    onChange={(e) => setMultiSelectEnabled(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      fontWeight: 'medium'
                    }}>
                      Multi-select
                    </Typography>
                    <Chip
                      label={multiSelectEnabled ? 'Multi' : 'Single'}
                      size="small"
                      color={multiSelectEnabled ? 'primary' : 'default'}
                      variant="outlined"
                      sx={{ fontSize: '0.6rem', height: 16 }}
                    />
                  </Box>
                }
                sx={{
                  m: 0,
                  '& .MuiFormControlLabel-label': {
                    fontSize: { xs: '0.75rem', md: '0.875rem' }
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{
                fontSize: { xs: '0.6rem', md: '0.7rem' },
                display: 'block',
                mt: 0.5,
                ml: 4
              }}>
                {multiSelectEnabled 
                  ? 'Select multiple files and folders' 
                  : 'Click files to select and auto-close panel'
                }
              </Typography>
            </Box>)}
            {/* Upload Area */}
            <UploadArea />
          </Box>

          {/* Folder List */}
          <FolderList />
        </Box>

        {/* Right Panel - File List with Different Views */}
        <Box sx={{
          flex: 1,
          display: {
            xs: mobileView === 'files' ? 'flex' : 'none',
            md: 'flex'
          },
          flexDirection: 'column',
          width: { xs: '100%', md: 'auto' },
          height: { xs: '100%', md: 'auto' }
        }}>
          {/* File List Header with View Controls */}
          <Box sx={{
            p: { xs: 1.5, md: 2 },
            borderBottom: 1,
            borderColor: 'divider'
          }}>
            {/* Title and File Count */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 2
            }}>
              <Typography variant="subtitle2" sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '0.875rem', md: '1rem' }
              }}>
                {il8n?.t('reactor.client.files.list', { defaultValue: 'Files & Folders' })} ({currentPathItems.length}{searchQuery ? ` of ${files.length + folders.length}` : ''})
              </Typography>
            </Box>

            {/* Search Input */}
            <Box sx={{ mb: 2 }}>
              <TextField
                size="small"
                placeholder={il8n?.t('reactor.client.files.search', { defaultValue: 'Search files...' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <Search sx={{ mr: 1, color: 'text.secondary' }} />
                  ),
                  endAdornment: searchQuery && (
                    <IconButton
                      size="small"
                      onClick={() => setSearchQuery('')}
                      sx={{ p: 0.5 }}
                    >
                      <Clear fontSize="small" />
                    </IconButton>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'background.paper'
                  }
                }}
              />
            </Box>

            {/* View Mode Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {selectedItems.length > 0 && (
                  <>
                    <Chip
                      label={`${selectedItems.length} selected`}
                      size="small"
                      color="primary"
                      onDelete={handleClearSelection}
                    />
                  </>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="Grid view">
                  <IconButton
                    onClick={() => setViewMode('grid')}
                    size="small"
                    color={viewMode === 'grid' ? 'primary' : 'default'}
                  >
                    <ViewModule />
                  </IconButton>
                </Tooltip>
                <Tooltip title="List view">
                  <IconButton
                    onClick={() => setViewMode('list')}
                    size="small"
                    color={viewMode === 'list' ? 'primary' : 'default'}
                  >
                    <ViewList />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Table view">
                  <IconButton
                    onClick={() => setViewMode('table')}
                    size="small"
                    color={viewMode === 'table' ? 'primary' : 'default'}
                  >
                    <TableChart />
                  </IconButton>
                </Tooltip>

                {multiSelectEnabled && currentPathItems.length > 0 && (
                  <Tooltip title="Select all">
                    <IconButton
                      onClick={() => handleSelectAll(folders, files)}
                      size="small"
                    >
                      <SelectAll />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          </Box>

          {/* File Content Area */}
          <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 1, md: 1.5 } }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : currentPathItems.length > 0 ? (
              viewMode === 'grid' ? (
                // Grid View
                (<Grid container spacing={2}>
                  {currentPathItems.map((item) => (
                    <Grid item xs={6} sm={4} md={3} lg={2} key={getItemKey(item)}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          border: isCurrentItemSelected(item) ? 2 : 1,
                          borderColor: isCurrentItemSelected(item) ? 'primary.main' : 'divider',
                          '&:hover': {
                            boxShadow: 3
                          }
                        }}
                        onClick={() => {
                          if (!multiSelectEnabled && item.displayType === 'file') {
                            // In single mode, clicking a file automatically selects it
                            handleEnhancedItemSelection(item, true);
                          } else if (multiSelectEnabled) {
                            // In multi mode, toggle selection
                            handleEnhancedItemSelection(item, !isCurrentItemSelected(item));
                          } else {
                            // In single mode, clicking a folder navigates into it
                            setMobileView('files');
                          }
                        }}
                      >
                        <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                          {multiSelectEnabled && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEnhancedItemSelection(item, !isCurrentItemSelected(item));
                                }}
                                size="small"
                              >
                                {isCurrentItemSelected(item) ? <CheckBox /> : <CheckBoxOutlineBlank />}
                              </IconButton>
                            </Box>
                          )}
                          <Avatar sx={{ mx: 'auto', mb: 1, bgcolor: 'primary.main' }}>
                            {item.displayType === 'folder' ? (
                              <Folder />
                            ) : (
                              <FilePreview file={item} reactory={reactory} />
                            )}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 'medium' }}>
                            {item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.displayType === 'folder' ? '' : formatFileSize(item.size)}
                          </Typography>
                        </CardContent>
                        <CardActions sx={{ p: 1, justifyContent: 'center' }}>
                          <IconButton
                            onClick={(e) => handleMenuOpen(e, item)}
                            size="small"
                            sx={{
                              position: 'relative', // Ensure proper positioning context
                              zIndex: 1 // Ensure it's above other elements
                            }}
                          >
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>)
              ) : (
                // List and table views would go here - simplified for now
                (<Box sx={{ textAlign: 'center', p: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    List and table views are available in the full implementation
                  </Typography>
                </Box>)
              )
            ) : (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                p: { xs: 2, md: 3 },
                minHeight: 200
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <InsertDriveFile sx={{
                    fontSize: { xs: 48, md: 64 },
                    color: 'text.secondary',
                    mb: 2
                  }} />
                  <Typography variant="h6" color="text.secondary" sx={{
                    mb: 1,
                    fontSize: { xs: '1rem', md: '1.25rem' }
                  }}>
                    {il8n?.t('reactor.client.files.empty', { defaultValue: 'No files or folders in this location' })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{
                    fontSize: { xs: '0.8rem', md: '0.875rem' },
                    maxWidth: { xs: 280, md: 400 },
                    mx: 'auto'
                  }}>
                    {il8n?.t('reactor.client.files.emptyDescription', { 
                      defaultValue: 'Upload files or create folders to see them here'
                    })}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        <ItemContextMenu
          anchorEl={anchorEl}
          item={menuItem}
          onClose={handleMenuClose}
          onRenameFile={fileOperations.handleRenameFile}
          onDownloadFile={fileOperations.handleDownloadFile}
          onMoveItem={fileOperations.handleMoveItem}
          onDeleteFile={fileOperations.handleDeleteFile}
          onDeleteFolder={fileOperations.handleDeleteFolder}
          il8n={il8n}
          reactory={reactory}
        />
        
        {/* Debug info for menu positioning - DISABLED */}
        {false && anchorEl && (
          <Box sx={{
            position: 'fixed',
            top: 10,
            right: 10,
            bgcolor: 'rgba(0,0,0,0.8)',
            color: 'white',
            p: 1,
            borderRadius: 1,
            fontSize: '12px',
            zIndex: 9999,
            maxWidth: 300
          }}>
            <div>Menu Anchor Debug:</div>
            <div>Tag: {anchorEl.tagName}</div>
            <div>Class: {anchorEl.className}</div>
            <div>Position: {JSON.stringify(anchorEl.getBoundingClientRect())}</div>
            <div>Item: {menuItem?.name} ({menuItem?.type})</div>
            <div>Menu Open: {Boolean(anchorEl)}</div>
          </Box>
        )}
      </Box>
      {/* Mobile FABs */}
      <MobileFabs
        mobileView={mobileView}
        onFileUpload={fileOperations.handleFileUpload}
        onToggleView={() => setMobileView(mobileView === 'folders' ? 'files' : 'folders')}
        reactory={reactory}
      />
      {/* Dialogs and Menus */}
      <RenameDialog
        open={fileOperations.renameDialog.open}
        fileId={fileOperations.renameDialog.fileId}
        currentName={fileOperations.renameDialog.currentName}
        newName={fileOperations.renameDialog.newName}
        onClose={fileOperations.handleRenameCancel}
        onConfirm={fileOperations.handleRenameConfirm}
        onNameChange={(newName) => fileOperations.setRenameDialog(prev => ({ ...prev, newName }))}
        il8n={il8n}
        reactory={reactory}
      />
      <CreateFolderDialog
        open={fileOperations.createFolderDialog.open}
        folderName={fileOperations.createFolderDialog.folderName}
        onClose={() => fileOperations.setCreateFolderDialog({ open: false, folderName: '' })}
        onConfirm={fileOperations.handleCreateFolder}
        onNameChange={(folderName) => fileOperations.setCreateFolderDialog(prev => ({ ...prev, folderName }))}
        il8n={il8n}
        reactory={reactory}
      />
    </Paper>
  );
};

export default UserHomeFolder;
