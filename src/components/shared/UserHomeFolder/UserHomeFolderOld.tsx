import React, { useState, useEffect, useCallback } from 'react';
import { gql } from '@apollo/client';

interface UserHomeFolderProps {
  open: boolean;
  onClose: () => void;
  reactory: Reactory.Client.ReactorySDK;
  onFileUpload?: (files: File[], path: string) => Promise<void>;
  onSelectionChanged?: (selectedItems: SelectedItem[]) => void;
  onItemSelect?: (item: SelectedItem) => Promise<void>;
  onItemDeselect?: (item: SelectedItem) => Promise<void>;
  il8n: any;
  rootPath?: string;
  selectedItems?: SelectedItem[];
}

interface FolderItem {
  name: string;
  path: string;
  link?: string;
  type: 'folder';
}

interface FileItem {
  id: string;
  name: string;
  type: 'file';
  mimetype: string;
  size: number;
  url?: string;
  path: string;
  uploadDate: Date;
  uploadedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
}

interface SelectedItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  item: FileItem | FolderItem;
}

type ViewMode = 'grid' | 'list' | 'table';

const GET_USER_HOME_FILES = gql`
  query ReactoryUserFiles($path: String, $loadOptions: ReactoryUserFilesLoadOptionsInput) {
    ReactoryUserFiles(path: $path, loadOptions: $loadOptions) {
      ... on ReactoryUserFiles {  
        path    
        folders {
          name
          path        
        }
        files {
          id
          filename
          mimetype
          size
          uploadedBy {
            id
            firstName
            lastName
            email
            avatar
          }
          path
          created
          link
          alias
          uploadContext
        }
      }
      ... on ReactoryUserFilesErrorResponse {
        error
        message
      }
    }
  }
`;

const DELETE_FILE_MUTATION = gql`
  mutation ReactoryDeleteUserFile($path: String, $id: String) {
    ReactoryDeleteUserFile(id: $id) {
      ... on ReactoryFileDeleteSuccess {
        success
        id
      }
      ... on ReactoryFileDeleteError {
        error
        message
      }
    }
  }
`;

const UPDATE_FILE_MUTATION = gql`
  mutation ReactoryUpdateFile($id: String!, $alias: String, $path: String, $filename: String, $mimetype: String, $size: Int) {
    ReactoryUpdateFile(id: $id, alias: $alias, path: $path, filename: $filename, mimetype: $mimetype, size: $size) {
      ... on ReactorFileUpdateSuccess {
        success
        file {
          id
          filename
          mimetype
          size
          alias
          path
          created
          link
        }
      }
      ... on ReactoryFileUpdateError {
        error
        message
      }
    }
  }
`;

const CREATE_FOLDER_MUTATION = gql`
  mutation ReactoryCreateFolder($name: String!, $path: String!) {
    ReactoryCreateFolder(name: $name, path: $path) {
      ... on ReactoryFolderCreateSuccess {
        success
        folder {
          name
          path
        }
      }
      ... on ReactoryFolderCreateError {
        error
        message
      }
    }
  }
`;

const DELETE_FOLDER_MUTATION = gql`
  mutation ReactoryDeleteFolder($path: String!) {
    ReactoryDeleteFolder(path: $path) {
      ... on ReactoryFolderDeleteSuccess {
        success
        path
      }
      ... on ReactoryFolderDeleteError {
        error
        message
      }
    }
  }
`;

const MOVE_ITEM_MUTATION = gql`
  mutation ReactoryMoveItem($itemPath: String!, $newPath: String!, $itemType: String!) {
    ReactoryMoveItem(itemPath: $itemPath, newPath: $newPath, itemType: $itemType) {
      ... on ReactoryItemMoveSuccess {
        success
        newPath
        itemType
      }
      ... on ReactoryItemMoveError {
        error
        message
      }
    }
  }
`;

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
  selectedItems: externalSelectedItems = []
}) => {
  const [currentPath, setCurrentPath] = useState<string>(rootPath);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [multiSelectEnabled, setMultiSelectEnabled] = useState(false);
  const [mobileView, setMobileView] = useState<'folders' | 'files'>('folders');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [renameDialog, setRenameDialog] = useState<{
    open: boolean;
    fileId: string;
    currentName: string;
    newName: string;
  }>({
    open: false,
    fileId: '',
    currentName: '',
    newName: ''
  });

  const [createFolderDialog, setCreateFolderDialog] = useState<{
    open: boolean;
    folderName: string;
  }>({
    open: false,
    folderName: ''
  });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuItem, setMenuItem] = useState<FileItem | FolderItem | null>(null);

  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);

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
    Fab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Switch,
    FormControlLabel,
    Menu,
    MenuItem,
    MenuList
  } = Material.MaterialCore;

  const {
    ArrowBack,
    InsertDriveFile,
    Image,  
    PictureAsPdf,
    Description,
    VideoLibrary,
    AudioFile,
    Archive,
    Code,
    Delete,
    Download,
    CloudUpload,
    Refresh,
    Edit,
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
    CreateNewFolder,
    DriveFileMove,
    Add
  } = Material.MaterialIcons;

  const loadUserFiles = useCallback(async (path: string = currentPath) => {
    reactory.info(`Loading files and folders for path: ${path}`);
    setLoading(true);
    try {
      // Query the ReactoryUserFiles to get folders and files
      const response = await reactory.graphqlQuery<{
        ReactoryUserFiles: {
          folders: Array<{
            name: string;
            path: string;
            link?: string;
          }>;
          files: Reactory.Models.IReactoryFile[];
        } | {
          code: string;
          message: string;
        }
      }, { path: string; loadOptions?: any }>(GET_USER_HOME_FILES, { 
        path: path,
        loadOptions: {}
      });

      if (response?.data?.ReactoryUserFiles) {
        const userFiles = response.data.ReactoryUserFiles;
        
        // Check if it's an error response
        if ('code' in userFiles) {
          reactory.error(`Failed to load files: ${userFiles.message}`);
          setFolders([]);
          setFiles([]);
          return;
        }

        // Map folders
        const mappedFolders: FolderItem[] = userFiles.folders.map(folder => ({
          name: folder.name,
          path: folder.path,
          link: folder.link,
          type: 'folder' as const
        }));

        // Map files
        const mappedFiles: FileItem[] = userFiles.files.map(file => ({
          id: file.id || (file._id ? String(file._id) : ''),
          name: file.filename || file.alias || 'Unknown File',
          type: 'file' as const,
          mimetype: file.mimetype || 'application/octet-stream',
          size: file.size || 0,
          url: file.link,
          path: file.path || path,
          uploadDate: file.created ? new Date(file.created) : new Date(),
          uploadedBy: file.uploadedBy
        }));

        setFolders(mappedFolders);
        setFiles(mappedFiles);
        setCurrentPath(path);
        
        reactory.info(`Loaded ${mappedFolders.length} folders and ${mappedFiles.length} files`);
      } else {
        reactory.error('Failed to load user files');
        setFolders([]);
        setFiles([]);
      }
    } catch (error) {
      reactory.error('Failed to load user files', error);
      setFolders([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [currentPath, reactory]);

  // Load files when panel opens or when current path changes
  useEffect(() => {
    if (open) {
      loadUserFiles();
    }
  }, [open, loadUserFiles]);

  // Clear selection and search when path changes
  useEffect(() => {
    setSelectedItems([]);
    setSearchQuery('');
    if (onSelectionChanged) {
      onSelectionChanged([]);
    }
  }, [currentPath, onSelectionChanged]);

  // Clear state when panel closes
  useEffect(() => {
    if (!open) {
      setSelectedItems([]);
      setSearchQuery('');
      setMobileView('folders');
      setRenameDialog({
        open: false,
        fileId: '',
        currentName: '',
        newName: ''
      });
      setCreateFolderDialog({
        open: false,
        folderName: ''
      });
      setAnchorEl(null);
      setMenuItem(null);
    }
  }, [open]);

  const handleFolderSelect = useCallback((folder: FolderItem) => {
    // Navigate to folder
    loadUserFiles(folder.path);
  }, [loadUserFiles]);

  const handleItemSelection = useCallback(async (item: FileItem | FolderItem, isSelected: boolean) => {
    let newSelection: SelectedItem[];
    
    const selectedItem: SelectedItem = {
      id: 'id' in item ? item.id : item.path,
      name: item.name,
      path: item.path,
      type: item.type,
      item
    };

    // Check if this item is externally selected (attached to chat)
    const isExternallySelected = externalSelectedItems.some(s => s.path === selectedItem.path);
    
    if (isExternallySelected) {
      // Handle external selection/deselection via callbacks
      if (isSelected && onItemSelect) {
        try {
          await onItemSelect(selectedItem);
        } catch (error) {
          reactory.error('Failed to select item', error);
          return;
        }
      } else if (!isSelected && onItemDeselect) {
        try {
          await onItemDeselect(selectedItem);
        } catch (error) {
          reactory.error('Failed to deselect item', error);
          return;
        }
      }
      return; // Don't update local selection for externally managed items
    }

    // Handle local selection
    if (multiSelectEnabled) {
      if (isSelected) {
        newSelection = [...selectedItems, selectedItem];
      } else {
        newSelection = selectedItems.filter(s => s.id !== selectedItem.id);
      }
    } else {
      newSelection = isSelected ? [selectedItem] : [];
    }

    setSelectedItems(newSelection);
    if (onSelectionChanged) {
      onSelectionChanged(newSelection);
    }
  }, [selectedItems, multiSelectEnabled, onSelectionChanged, externalSelectedItems, onItemSelect, onItemDeselect, reactory]);

  const isItemSelected = useCallback((item: FileItem | FolderItem): boolean => {
    const itemId = 'id' in item ? item.id : item.path;
    const itemPath = item.path;
    
    // Check local selection first
    const isLocallySelected = selectedItems.some(s => s.id === itemId);
    
    // Check external selection by path (for files already attached to chat)
    const isExternallySelected = externalSelectedItems.some(s => s.path === itemPath);
    
    return isLocallySelected || isExternallySelected;
  }, [selectedItems, externalSelectedItems]);

  const handleSelectAll = useCallback(() => {
    const allItems: SelectedItem[] = [
      ...folders.map(folder => ({
        id: folder.path,
        name: folder.name,
        path: folder.path,
        type: 'folder' as const,
        item: folder
      })),
      ...files.map(file => ({
        id: file.id,
        name: file.name,
        path: file.path,
        type: 'file' as const,
        item: file
      }))
    ];

    setSelectedItems(allItems);
    if (onSelectionChanged) {
      onSelectionChanged(allItems);
    }
  }, [folders, files, onSelectionChanged]);

  const handleClearSelection = useCallback(() => {
    setSelectedItems([]);
    if (onSelectionChanged) {
      onSelectionChanged([]);
    }
  }, [onSelectionChanged]);

  const navigateUp = useCallback(() => {
    const pathParts = currentPath.split('/').filter(part => part.length > 0);
    if (pathParts.length > 0) {
      pathParts.pop();
      const parentPath = '/' + pathParts.join('/');
      loadUserFiles(parentPath);
    }
  }, [currentPath, loadUserFiles]);

  const handleFileUpload = useCallback(async (uploadFiles: FileList | File[]) => {
    const fileArray = Array.from(uploadFiles);
    let uploadSuccess = true;
    
    for (const file of fileArray) {
      try {
        if (onFileUpload) {
          reactory.info(`Starting upload for: ${file.name}`);
          const uploadPromise = onFileUpload(fileArray, currentPath);
          if (uploadPromise && typeof uploadPromise.then === 'function') {
            await uploadPromise;
            reactory.info(`Upload completed for: ${file.name}`);
          } else {
            reactory.info(`onFileUpload for ${file.name} did not return a Promise`);
          }
        } else {
          reactory.info('No onFileUpload handler provided');
        }
        
        reactory.info(`Uploaded: ${file.name}`);
      } catch (error) {
        reactory.error(`Failed to upload ${file.name}`, error);
        uploadSuccess = false;
      }
    }
    
    // Refresh the file list after successful upload
    if (uploadSuccess) {
      reactory.info('All uploads completed, refreshing file list...');
      setTimeout(async () => {
        await loadUserFiles(currentPath);
      }, 1000); // Wait 1 second for the upload to be processed by the server
    }
  }, [onFileUpload, currentPath, reactory, loadUserFiles]);

  const handleDeleteFile = useCallback(async (fileId: string) => {
    try {
      // Call the GraphQL mutation to delete the file
      const response = await reactory.graphqlMutation<{
        ReactoryDeleteUserFile: {
          success: boolean;
          id: string;
        } | {
          error: string;
          message: string;
        }
      }, { id: string }>(DELETE_FILE_MUTATION, { id: fileId });

      if (response?.data?.ReactoryDeleteUserFile) {
        const result = response.data.ReactoryDeleteUserFile;
        
        // Check if it's an error response
        if ('error' in result) {
          reactory.error(`Failed to delete file: ${result.message}`);
          return;
        }

        // Success - remove from selection and refresh from server
        setSelectedItems(prev => prev.filter(item => item.id !== fileId));
        
        // Refresh the file list to ensure consistency with server
        await loadUserFiles(currentPath);
        
        reactory.info('File deleted successfully');
      } else {
        reactory.error('Failed to delete file - no response from server');
      }
    } catch (error) {
      reactory.error('Failed to delete file', error);
    }
  }, [reactory, loadUserFiles, currentPath]);

  const handleUpdateFile = useCallback(async (fileId: string, updates: {
    filename?: string;
    alias?: string;
    path?: string;
    mimetype?: string;
    size?: number;
  }) => {
    try {
      // Call the GraphQL mutation to update the file
      const response = await reactory.graphqlMutation<{
        ReactoryUpdateFile: {
          success: boolean;
          file: {
            id: string;
            filename: string;
            mimetype: string;
            size: number;
            alias: string;
            path: string;
            created: string;
            link: string;
          };
        } | {
          error: string;
          message: string;
        }
      }, { 
        id: string;
        alias?: string;
        path?: string;
        filename?: string;
        mimetype?: string;
        size?: number;
      }>(UPDATE_FILE_MUTATION, { 
        id: fileId,
        ...updates
      });

      if (response?.data?.ReactoryUpdateFile) {
        const result = response.data.ReactoryUpdateFile;
        
        // Check if it's an error response
        if ('error' in result) {
          reactory.error(`Failed to update file: ${result.message}`);
          return false;
        }

        // Success - refresh the file list to show updates
        await loadUserFiles(currentPath);
        
        reactory.info('File updated successfully');
        return true;
      } else {
        reactory.error('Failed to update file - no response from server');
        return false;
      }
    } catch (error) {
      reactory.error('Failed to update file', error);
      return false;
    }
  }, [reactory, loadUserFiles, currentPath]);

  const handleRenameFile = useCallback((fileId: string, currentName: string) => {
    setRenameDialog({
      open: true,
      fileId: fileId,
      currentName,
      newName: currentName
    });
  }, []);

  const handleRenameConfirm = useCallback(async () => {
    if (!renameDialog.newName.trim() || renameDialog.newName === renameDialog.currentName) {
      setRenameDialog(prev => ({ ...prev, open: false }));
      return;
    }

    const success = await handleUpdateFile(renameDialog.fileId, {
      filename: renameDialog.newName.trim()
    });

    if (success) {
      setRenameDialog({ open: false, fileId: '', currentName: '', newName: '' });
    }
  }, [renameDialog, handleUpdateFile]);

  const handleRenameCancel = useCallback(() => {
    setRenameDialog({ open: false, fileId: '', currentName: '', newName: '' });
  }, []);

  // Filter files based on search query
  const filteredFiles = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return files;
    }
    
    const query = searchQuery.toLowerCase();
    return files.filter(file => 
      file.name.toLowerCase().includes(query) ||
      file.mimetype.toLowerCase().includes(query)
    );
  }, [files, searchQuery]);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image />;
    if (type === 'application/pdf') return <PictureAsPdf />;
    if (type.startsWith('video/')) return <VideoLibrary />;
    if (type.startsWith('audio/')) return <AudioFile />;
    if (type.includes('zip') || type.includes('archive')) return <Archive />;
    if (type.startsWith('text/') || type.includes('document')) return <Description />;
    if (type.includes('code') || type.includes('javascript') || type.includes('json')) return <Code />;
    return <InsertDriveFile />;
  };

  const getFilePreview = (file: FileItem) => {
    const iconSize = 40; // Standard icon size
    
    if (file.mimetype.startsWith('image/') && file.url) {
      return (
        <Box sx={{ position: 'relative', width: iconSize, height: iconSize }}>
          <Box
            component="img"
            src={file.url}
            alt={file.name}
            sx={{
              width: iconSize,
              height: iconSize,
              objectFit: 'cover',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              position: 'absolute',
              top: 0,
              left: 0
            }}
            onError={(e) => {
              // Fallback to icon if image fails to load
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <Box
            sx={{
              width: iconSize,
              height: iconSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: -1
            }}
          >
            {getFileIcon(file.mimetype)}
          </Box>
        </Box>
      );
    }
    
    return getFileIcon(file.mimetype);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: FileItem | FolderItem) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuItem(null);
  };

  const handleCreateFolder = useCallback(async () => {
    if (!createFolderDialog.folderName.trim()) {
      reactory.warning('Please enter a folder name');
      return;
    }

    try {
      const response = await reactory.graphqlMutation<{
        ReactoryCreateFolder: {
          success: boolean;
          folder?: {
            name: string;
            path: string;
          };
        } | {
          error: string;
          message: string;
        }
      }, { name: string; path: string }>(CREATE_FOLDER_MUTATION, {
        name: createFolderDialog.folderName.trim(),
        path: currentPath
      });

      if (response?.data?.ReactoryCreateFolder) {
        const result = response.data.ReactoryCreateFolder;
        
        if ('error' in result) {
          reactory.error(`Failed to create folder: ${result.message}`);
        } else {
          reactory.info('Folder created successfully');
          setCreateFolderDialog({ open: false, folderName: '' });
          await loadUserFiles(currentPath);
        }
      }
    } catch (error) {
      reactory.error('Failed to create folder', error);
    }
  }, [createFolderDialog.folderName, currentPath, reactory, loadUserFiles]);

  const handleDeleteFolder = useCallback(async (folderPath: string) => {
    try {
      const response = await reactory.graphqlMutation<{
        ReactoryDeleteFolder: {
          success: boolean;
          path?: string;
        } | {
          error: string;
          message: string;
        }
      }, { path: string }>(DELETE_FOLDER_MUTATION, {
        path: folderPath
      });

      if (response?.data?.ReactoryDeleteFolder) {
        const result = response.data.ReactoryDeleteFolder;
        
        if ('error' in result) {
          reactory.error(`Failed to delete folder: ${result.message}`);
        } else {
          reactory.info('Folder deleted successfully');
          await loadUserFiles(currentPath);
        }
      }
    } catch (error) {
      reactory.error('Failed to delete folder', error);
    }
    handleMenuClose();
  }, [reactory, loadUserFiles, currentPath]);

  const handleMoveItem = useCallback(async (item: FileItem | FolderItem, newPath: string) => {
    try {
      const response = await reactory.graphqlMutation<{
        ReactoryMoveItem: {
          success: boolean;
          newPath?: string;
          itemType?: string;
        } | {
          error: string;
          message: string;
        }
      }, { itemPath: string; newPath: string; itemType: string }>(MOVE_ITEM_MUTATION, {
        itemPath: item.path,
        newPath: newPath,
        itemType: item.type
      });

      if (response?.data?.ReactoryMoveItem) {
        const result = response.data.ReactoryMoveItem;
        
        if ('error' in result) {
          reactory.error(`Failed to move item: ${result.message}`);
        } else {
          reactory.info('Item moved successfully');
          await loadUserFiles(currentPath);
        }
      }
    } catch (error) {
      reactory.error('Failed to move item', error);
    }
    handleMenuClose();
  }, [reactory, loadUserFiles, currentPath]);

  const handleDownloadFile = useCallback((file: FileItem) => {
    if (file.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      reactory.warning('File download URL not available');
    }
    handleMenuClose();
  }, [reactory]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMobileTitle = () => {
    if (mobileView === 'files') {
      return il8n?.t('reactor.client.files.title', { defaultValue: 'Files' });
    }
    return il8n?.t('reactor.client.folders.title', { defaultValue: 'Folders' });
  };

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
        backdropFilter: 'blur(10px) saturate(120%)',
      }}
    >
      {/* Header */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        p: 2,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <IconButton
          onClick={onClose}
          sx={{ mr: 2 }}
          aria-label="Close files panel"
        >
          <ArrowBack />
        </IconButton>
        
        {/* Mobile: Show back button when in files view */}
        <Box sx={{ 
          display: { xs: mobileView === 'files' ? 'flex' : 'none', md: 'none' },
          mr: 1
        }}>
          <IconButton
            onClick={() => setMobileView('folders')}
            size="small"
            aria-label="Back to folders"
          >
            <ArrowBack />
          </IconButton>
        </Box>
        
        <Typography variant="h6" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
          {/* Mobile: Show different title based on view */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            {getMobileTitle()}
          </Box>
          {/* Desktop: Always show main title */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            {il8n?.t('reactor.client.files.title', { defaultValue: 'File Management' })}
          </Box>
        </Typography>
        
        <Tooltip title="Refresh file list">
          <IconButton onClick={() => loadUserFiles(currentPath)} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : <Refresh />}
          </IconButton>
        </Tooltip>
      </Box>
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
            p: { xs: 1.5, md: 2 }, 
            borderBottom: 1, 
            borderColor: 'divider' 
          }}>
            {/* Breadcrumb Navigation */}
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton 
                onClick={() => loadUserFiles(rootPath)} 
                size="small"
                disabled={currentPath === rootPath}
              >
                <Home />
              </IconButton>
              <IconButton 
                onClick={navigateUp} 
                size="small"
                disabled={currentPath === rootPath}
              >
                <ArrowBack />
              </IconButton>
              <Typography variant="body2" sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentPath}
              </Typography>
            </Box>

            {/* Multi-select Toggle */}
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
                  <Typography variant="body2" sx={{ 
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                    fontWeight: 'medium'
                  }}>
                    Multi-select
                  </Typography>
                }
                sx={{ 
                  m: 0,
                  '& .MuiFormControlLabel-label': {
                    fontSize: { xs: '0.75rem', md: '0.875rem' }
                  }
                }}
              />
            </Box>
            
            {/* Upload Area */}
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
                    handleFileUpload(files);
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
            </Box>
          </Box>

          {/* Folder List */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              p: { xs: 1.5, md: 2 }, 
              pb: 1 
            }}>
              <Typography variant="subtitle2" sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '0.875rem', md: '1rem' }
              }}>
                {il8n?.t('reactor.client.folders.list', { defaultValue: 'Folders' })} ({folders.length})
              </Typography>
              <Tooltip title="Create new folder">
                <IconButton
                  onClick={() => setCreateFolderDialog({ open: true, folderName: '' })}
                  size="small"
                  color="primary"
                >
                  <Add />
                </IconButton>
              </Tooltip>
            </Box>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : folders.length > 0 ? (
              <List sx={{ p: 0 }}>
                {folders.map((folder) => (
                  <ListItem key={folder.path} sx={{ 
                    px: { xs: 1, md: 2 },
                    py: { xs: 0.5, md: 0 }
                  }}>
                    <ListItemButton
                      onClick={() => handleFolderSelect(folder)}
                      selected={isItemSelected(folder)}
                      sx={{ 
                        borderRadius: 1,
                        minHeight: { xs: 56, md: 'auto' },
                        py: { xs: 1, md: 0.5 }
                      }}
                    >
                      {multiSelectEnabled && (
                        <ListItemIcon sx={{ minWidth: { xs: 32, md: 40 } }}>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemSelection(folder, !isItemSelected(folder));
                            }}
                            size="small"
                          >
                            {isItemSelected(folder) ? <CheckBox /> : <CheckBoxOutlineBlank />}
                          </IconButton>
                        </ListItemIcon>
                      )}
                      <ListItemIcon sx={{ minWidth: { xs: 36, md: 56 } }}>
                        <Folder />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ 
                            fontWeight: 'medium',
                            fontSize: { xs: '0.8rem', md: '0.875rem' }
                          }}>
                            {folder.name}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, folder)}
                      size="small"
                      sx={{ ml: 1 }}
                    >
                      <MoreVert />
                    </IconButton>
                  </ListItem>
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
                {il8n?.t('reactor.client.files.list', { defaultValue: 'Files' })} ({filteredFiles.length}{searchQuery ? ` of ${files.length}` : ''})
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
                    <IconButton
                      onClick={() => {
                        const fileIds = selectedItems
                          .filter(item => item.type === 'file')
                          .map(item => item.id);
                        fileIds.forEach(id => handleDeleteFile(id));
                      }}
                      size="small"
                      color="error"
                      disabled={selectedItems.filter(item => item.type === 'file').length === 0}
                    >
                      <Delete />
                    </IconButton>
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
                
                {multiSelectEnabled && filteredFiles.length > 0 && (
                  <Tooltip title="Select all">
                    <IconButton
                      onClick={handleSelectAll}
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
            ) : filteredFiles.length > 0 ? (
              viewMode === 'grid' ? (
                // Grid View
                (<Grid container spacing={2}>
                  {filteredFiles.map((file) => (
                    <Grid item xs={6} sm={4} md={3} lg={2} key={file.id}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          border: isItemSelected(file) ? 2 : 1,
                          borderColor: isItemSelected(file) ? 'primary.main' : 'divider',
                          '&:hover': {
                            boxShadow: 3
                          }
                        }}
                        onClick={() => !multiSelectEnabled ? setMobileView('files') : handleItemSelection(file, !isItemSelected(file))}
                      >
                        <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                          {multiSelectEnabled && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleItemSelection(file, !isItemSelected(file));
                                }}
                                size="small"
                              >
                                {isItemSelected(file) ? <CheckBox /> : <CheckBoxOutlineBlank />}
                              </IconButton>
                            </Box>
                          )}
                          <Avatar sx={{ mx: 'auto', mb: 1, bgcolor: 'primary.main' }}>
                            {getFilePreview(file)}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 'medium' }}>
                            {file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(file.size)}
                          </Typography>
                        </CardContent>
                        <CardActions sx={{ p: 1, justifyContent: 'center' }}>
                          <IconButton
                            onClick={(e) => handleMenuOpen(e, file)}
                            size="small"
                          >
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>)
              ) : viewMode === 'list' ? (
                // List View
                (<List sx={{ p: 0 }}>
                  {filteredFiles.map((file) => (
                    <ListItem key={file.id} sx={{ mb: 1 }}>
                      <ListItemButton
                        selected={isItemSelected(file)}
                        sx={{ borderRadius: 1 }}
                        onClick={() => handleItemSelection(file, !isItemSelected(file))}
                      >
                        {multiSelectEnabled && (
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            {isItemSelected(file) ? <CheckBox /> : <CheckBoxOutlineBlank />}
                          </ListItemIcon>
                        )}
                        <ListItemIcon sx={{ minWidth: 56 }}>
                          {getFilePreview(file)}
                        </ListItemIcon>
                        <ListItemText
                          primary={file.name}
                          secondary={
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              <Chip label={formatFileSize(file.size)} size="small" variant="outlined" />
                              <Chip label={file.mimetype} size="small" variant="outlined" />
                              <Typography variant="caption" color="text.secondary">
                                {file.uploadDate.toLocaleDateString()}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItemButton>
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, file)}
                        size="small"
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>)
              ) : (
                // Table View (simplified - could be enhanced with proper table)
                (<Box sx={{ overflowX: 'auto' }}>
                  <List sx={{ p: 0 }}>
                    {filteredFiles.map((file) => (
                      <ListItem key={file.id} divider>
                        <ListItemButton
                          selected={isItemSelected(file)}
                          onClick={() => handleItemSelection(file, !isItemSelected(file))}
                        >
                          {multiSelectEnabled && (
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              {isItemSelected(file) ? <CheckBox /> : <CheckBoxOutlineBlank />}
                            </ListItemIcon>
                          )}
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            {getFilePreview(file)}
                          </ListItemIcon>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                            <Typography sx={{ flex: 2, fontSize: '0.875rem' }}>{file.name}</Typography>
                            <Typography sx={{ flex: 1, fontSize: '0.75rem' }} color="text.secondary">
                              {formatFileSize(file.size)}
                            </Typography>
                            <Typography sx={{ flex: 1, fontSize: '0.75rem' }} color="text.secondary">
                              {file.mimetype}
                            </Typography>
                            <Typography sx={{ flex: 1, fontSize: '0.75rem' }} color="text.secondary">
                              {file.uploadDate.toLocaleDateString()}
                            </Typography>
                          </Box>
                        </ListItemButton>
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, file)}
                          size="small"
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </ListItem>
                    ))}
                  </List>
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
                  {searchQuery ? (
                    // No search results
                    (<>
                      <Search sx={{ 
                        fontSize: { xs: 48, md: 64 }, 
                        color: 'text.secondary', 
                        mb: 2 
                      }} />
                      <Typography variant="h6" color="text.secondary" sx={{ 
                        mb: 1,
                        fontSize: { xs: '1rem', md: '1.25rem' }
                      }}>
                        {il8n?.t('reactor.client.files.noResults', { defaultValue: 'No files found' })}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{
                        fontSize: { xs: '0.8rem', md: '0.875rem' },
                        maxWidth: { xs: 280, md: 400 },
                        mx: 'auto',
                        mb: 2
                      }}>
                        {il8n?.t('reactor.client.files.noResultsDescription', { 
                          defaultValue: `No files match "${searchQuery}". Try a different search term.`
                        })}
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={() => setSearchQuery('')}
                        size="small"
                        sx={{ mt: 1 }}
                      >
                        Clear Search
                      </Button>
                    </>)
                  ) : (
                    // No files in folder
                    (<>
                      <InsertDriveFile sx={{ 
                        fontSize: { xs: 48, md: 64 }, 
                        color: 'text.secondary', 
                        mb: 2 
                      }} />
                      <Typography variant="h6" color="text.secondary" sx={{ 
                        mb: 1,
                        fontSize: { xs: '1rem', md: '1.25rem' }
                      }}>
                        {il8n?.t('reactor.client.files.empty', { defaultValue: 'No files in this folder' })}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{
                        fontSize: { xs: '0.8rem', md: '0.875rem' },
                        maxWidth: { xs: 280, md: 400 },
                        mx: 'auto'
                      }}>
                        {il8n?.t('reactor.client.files.emptyDescription', { 
                          defaultValue: 'Upload files to this folder to see them here'
                        })}
                      </Typography>
                    </>)
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      {/* Mobile FAB for quick upload */}
      <Fab
        color="primary"
        aria-label="Upload file"
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: { 
            xs: mobileView === 'folders' ? 'flex' : 'none', 
            md: 'none' 
          },
          zIndex: 10
        }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = 'image/*,application/pdf,text/*,.docx,.xlsx';
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) {
              handleFileUpload(files);
            }
          };
          input.click();
        }}
      >
        <CloudUpload />
      </Fab>
      {/* Mobile Toggle FAB for switching between folders and files */}
      <Fab
        color="secondary"
        aria-label="Toggle view"
        sx={{
          position: 'absolute',
          bottom: 80,
          right: 16,
          display: { xs: 'flex', md: 'none' },
          zIndex: 10
        }}
        onClick={() => setMobileView(mobileView === 'folders' ? 'files' : 'folders')}
      >
        {mobileView === 'folders' ? <InsertDriveFile /> : <Folder />}
      </Fab>
      {/* Rename Dialog */}
      <Dialog
        open={renameDialog.open}
        onClose={handleRenameCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {il8n?.t('reactor.client.files.rename', { defaultValue: 'Rename File' })}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="File Name"
            type="text"
            fullWidth
            variant="outlined"
            value={renameDialog.newName}
            onChange={(e) => setRenameDialog(prev => ({ ...prev, newName: e.target.value }))}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleRenameConfirm();
              }
            }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRenameCancel}>
            {il8n?.t('reactor.client.files.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button 
            onClick={handleRenameConfirm} 
            variant="contained"
            disabled={!renameDialog.newName.trim() || renameDialog.newName === renameDialog.currentName}
          >
            {il8n?.t('reactor.client.files.rename', { defaultValue: 'Rename' })}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Context Menu for Files and Folders */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        slotProps={{
          paper: {
            sx: {
              border: 1,
              borderColor: 'divider',
              boxShadow: 3
            }
          }
        }}
      >
        {menuItem && (
          <MenuList dense>
            {menuItem.type === 'file' && (
              <>
                <MenuItem
                  onClick={() => {
                    if (menuItem.type === 'file') {
                      handleRenameFile((menuItem as FileItem).id, menuItem.name);
                    }
                    handleMenuClose();
                  }}
                >
                  <ListItemIcon>
                    <Edit fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>
                    {il8n?.t('reactor.client.files.rename', { defaultValue: 'Rename' })}
                  </ListItemText>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    if (menuItem.type === 'file') {
                      handleDownloadFile(menuItem as FileItem);
                    }
                  }}
                >
                  <ListItemIcon>
                    <Download fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>
                    {il8n?.t('reactor.client.files.download', { defaultValue: 'Download' })}
                  </ListItemText>
                </MenuItem>
                <MenuItem
                  onClick={() => handleMoveItem(menuItem, '/newpath')} // TODO: Add path selection dialog
                >
                  <ListItemIcon>
                    <DriveFileMove fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>
                    {il8n?.t('reactor.client.files.move', { defaultValue: 'Move' })}
                  </ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    if (menuItem.type === 'file') {
                      handleDeleteFile((menuItem as FileItem).id);
                    }
                    handleMenuClose();
                  }}
                  sx={{ color: 'error.main' }}
                >
                  <ListItemIcon>
                    <Delete fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText>
                    {il8n?.t('reactor.client.files.delete', { defaultValue: 'Delete' })}
                  </ListItemText>
                </MenuItem>
              </>
            )}
            {menuItem.type === 'folder' && (
              <>
                <MenuItem
                  onClick={() => handleMoveItem(menuItem, '/newpath')} // TODO: Add path selection dialog
                >
                  <ListItemIcon>
                    <DriveFileMove fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>
                    {il8n?.t('reactor.client.folders.move', { defaultValue: 'Move' })}
                  </ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    handleDeleteFolder(menuItem.path);
                  }}
                  sx={{ color: 'error.main' }}
                >
                  <ListItemIcon>
                    <Delete fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText>
                    {il8n?.t('reactor.client.folders.delete', { defaultValue: 'Delete' })}
                  </ListItemText>
                </MenuItem>
              </>
            )}
          </MenuList>
        )}
      </Menu>
      {/* Create Folder Dialog */}
      <Dialog
        open={createFolderDialog.open}
        onClose={() => setCreateFolderDialog({ open: false, folderName: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {il8n?.t('reactor.client.folders.create', { defaultValue: 'Create New Folder' })}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            type="text"
            fullWidth
            variant="outlined"
            value={createFolderDialog.folderName}
            onChange={(e) => setCreateFolderDialog(prev => ({ ...prev, folderName: e.target.value }))}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateFolder();
              }
            }}
            sx={{ mt: 2 }}
            placeholder="Enter folder name..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateFolderDialog({ open: false, folderName: '' })}>
            {il8n?.t('reactor.client.folders.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button 
            onClick={handleCreateFolder} 
            variant="contained"
            disabled={!createFolderDialog.folderName.trim()}
            startIcon={<CreateNewFolder />}
          >
            {il8n?.t('reactor.client.folders.create', { defaultValue: 'Create' })}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UserHomeFolder;
