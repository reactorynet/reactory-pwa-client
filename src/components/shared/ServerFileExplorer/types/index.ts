export interface ServerFileExplorerProps {
  open: boolean;
  onClose: () => void;
  reactory: Reactory.Client.ReactorySDK;
  serverPath?: string; // Server path like "${APP_DATA_ROOT}/workflows"
  onFileSelection?: (selectedFiles: ServerFileItem[]) => void;
  onFolderSelection?: (selectedFolders: ServerFolderItem[]) => void;
  selectionMode?: 'single' | 'multi';
  allowedFileTypes?: string[]; // Allowed file extensions/types
  title?: string;
  allowUpload?: boolean;
  allowCreateFolder?: boolean;
  allowDelete?: boolean;
  allowRename?: boolean;
  readonly?: boolean;
  il8n?: any;
}

export interface ServerFolderItem {
  name: string;
  path: string;
  type: 'folder';
  fullPath: string; // Full server path
  expanded?: boolean;
  children?: ServerFolderItem[];
  level?: number;
  parentPath?: string;
  created?: Date;
  modified?: Date;
  permissions?: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  size?: number; // Folder size if available
  fileCount?: number; // Number of files in folder
}

export interface ServerFileItem {
  id: string;
  name: string;
  type: 'file';
  mimetype: string;
  extension: string;
  size: number;
  path: string;
  fullPath: string; // Full server path
  created: Date;
  modified: Date;
  accessed?: Date;
  permissions?: {
    read: boolean;
    write: boolean;
    delete: boolean;
    execute: boolean;
  };
  metadata?: {
    [key: string]: any;
  };
  checksum?: string;
  isSystemFile?: boolean;
  isHidden?: boolean;
}

export interface ServerSelectedItem {
  id: string;
  name: string;
  path: string;
  fullPath: string;
  type: 'file' | 'folder';
  item: ServerFileItem | ServerFolderItem;
}

export type ServerViewMode = 'grid' | 'list' | 'table' | 'tree';
export type ServerMobileView = 'folders' | 'files' | 'details';

// Administrative operations
export interface ServerFileOperation {
  id: string;
  type: 'copy' | 'move' | 'delete' | 'rename' | 'create' | 'upload';
  source?: string;
  target?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  timestamp: Date;
}

// Server-specific interfaces
export interface ServerBreadcrumbProps {
  serverPath: string;
  onNavigate: (path: string) => void;
  onHome: () => void;
  permissions?: {
    canNavigateUp: boolean;
    canNavigateToRoot: boolean;
  };
}

export interface ServerFileListProps {
  files: ServerFileItem[];
  folders: ServerFolderItem[];
  loading: boolean;
  viewMode: ServerViewMode;
  selectedItems: ServerSelectedItem[];
  searchQuery: string;
  sortBy: 'name' | 'size' | 'modified' | 'type';
  sortOrder: 'asc' | 'desc';
  onItemSelect: (item: ServerFileItem | ServerFolderItem, multi: boolean) => void;
  onItemDoubleClick: (item: ServerFileItem | ServerFolderItem) => void;
  onViewModeChange: (mode: ServerViewMode) => void;
  onSortChange: (sortBy: string, order: 'asc' | 'desc') => void;
  onContextMenu: (event: React.MouseEvent, item: ServerFileItem | ServerFolderItem) => void;
  readonly?: boolean;
}

export interface ServerFolderTreeProps {
  folders: ServerFolderItem[];
  currentPath: string;
  expanded: Set<string>;
  selectedItems: ServerSelectedItem[];
  loading: boolean;
  onFolderSelect: (folder: ServerFolderItem) => void;
  onFolderExpand: (folderPath: string) => void;
  onFolderCollapse: (folderPath: string) => void;
  onItemSelect: (item: ServerFolderItem, multi: boolean) => void;
  readonly?: boolean;
}

export interface ServerOperationsPanelProps {
  operations: ServerFileOperation[];
  onCancelOperation: (operationId: string) => void;
  onRetryOperation: (operationId: string) => void;
  onClearCompleted: () => void;
}

export interface ServerContextMenuProps {
  anchorEl: HTMLElement | null;
  item: ServerFileItem | ServerFolderItem | null;
  onClose: () => void;
  onDownload?: (item: ServerFileItem) => void;
  onRename?: (item: ServerFileItem | ServerFolderItem) => void;
  onDelete?: (item: ServerFileItem | ServerFolderItem) => void;
  onCopy?: (item: ServerFileItem | ServerFolderItem) => void;
  onMove?: (item: ServerFileItem | ServerFolderItem) => void;
  onProperties?: (item: ServerFileItem | ServerFolderItem) => void;
  permissions?: {
    canDownload: boolean;
    canRename: boolean;
    canDelete: boolean;
    canCopy: boolean;
    canMove: boolean;
  };
}

// Hook return types
export interface UseServerFilesReturn {
  files: ServerFileItem[];
  folders: ServerFolderItem[];
  loading: boolean;
  error: string | null;
  currentPath: string;
  loadPath: (path: string, options?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
    includeFolders?: boolean;
    includeHidden?: boolean;
    includeSystemFiles?: boolean;
    fileTypes?: string[];
  }) => Promise<void>;
  refreshPath: () => Promise<void>;
  createFolder: (name: string, path: string) => Promise<void>;
  deleteItems: (items: ServerSelectedItem[]) => Promise<void>;
  renameItem: (item: ServerSelectedItem, newName: string) => Promise<void>;
  moveItems: (items: ServerSelectedItem[], targetPath: string) => Promise<void>;
  copyItems: (items: ServerSelectedItem[], targetPath: string) => Promise<void>;
  uploadFiles: (files: File[], targetPath: string) => Promise<void>;
}

export interface UseServerNavigationReturn {
  currentPath: string;
  pathHistory: string[];
  canGoBack: boolean;
  canGoForward: boolean;
  navigate: (path: string) => void;
  navigateUp: () => void;
  goBack: () => void;
  goForward: () => void;
  goHome: () => void;
}

export interface UseServerSelectionReturn {
  selectedItems: ServerSelectedItem[];
  selectItem: (item: ServerFileItem | ServerFolderItem, multi?: boolean) => void;
  deselectItem: (item: ServerFileItem | ServerFolderItem) => void;
  selectAll: (items: (ServerFileItem | ServerFolderItem)[]) => void;
  clearSelection: () => void;
  isSelected: (item: ServerFileItem | ServerFolderItem) => boolean;
  toggleSelection: (item: ServerFileItem | ServerFolderItem) => void;
}

// Server-specific dialog states
export interface ServerCreateFolderDialogState {
  open: boolean;
  folderName: string;
  parentPath: string;
}

export interface ServerRenameDialogState {
  open: boolean;
  item: ServerSelectedItem | null;
  newName: string;
}

export interface ServerDeleteConfirmDialogState {
  open: boolean;
  items: ServerSelectedItem[];
  confirmText: string;
}

export interface ServerPropertiesDialogState {
  open: boolean;
  item: ServerSelectedItem | null;
}
