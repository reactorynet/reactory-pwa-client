export interface UserHomeFolderProps {
  open: boolean;
  onClose: () => void;
  reactory: Reactory.Client.ReactorySDK;
  allowMultiSelect?: boolean;
  onFileUpload?: (files: File[], path: string) => Promise<void>;
  onSelectionChanged?: (selectedItems: SelectedItem[], selectionMode: 'single' | 'multi') => void;
  onItemSelect?: (item: SelectedItem, selectionMode: 'single' | 'multi') => Promise<void>;
  onItemDeselect?: (item: SelectedItem, selectionMode: 'single' | 'multi') => Promise<void>;
  il8n: any;
  rootPath?: string;
  selectedItems?: SelectedItem[];
}

export interface FolderItem {
  name: string;
  path: string;
  link?: string;
  type: 'folder';
  expanded?: boolean;
  children?: FolderItem[];
  level?: number;
  parentPath?: string;
  updated?: Date;
}

export interface HierarchicalFolderItem extends FolderItem {
  expanded: boolean;
  children: HierarchicalFolderItem[];
  level: number;
  parentPath: string;
  hasChildren: boolean;
  isLoading?: boolean;
  updated?: Date;
}

export interface FileItem {
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

export interface SelectedItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  item: FileItem | FolderItem;
}

export type ViewMode = 'grid' | 'list' | 'table';
export type MobileView = 'folders' | 'files';

// Component-specific interfaces
export interface FolderPanelProps {
  folders: FolderItem[];
  loading: boolean;
  currentPath: string;
  rootPath: string;
  multiSelectEnabled: boolean;
  selectedItems: SelectedItem[];
  mobileView: MobileView;
  onFolderSelect: (folder: FolderItem) => void;
  onItemSelection: (item: FileItem | FolderItem, isSelected: boolean) => Promise<void>;
  isItemSelected: (item: FileItem | FolderItem) => boolean;
  onNavigateUp: () => void;
  onFileUpload: (files: FileList | File[]) => Promise<void>;
  onMultiSelectToggle: (enabled: boolean) => void;
  onCreateFolder: () => void;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, item: FileItem | FolderItem) => void;
  il8n: any;
  reactory: Reactory.Client.ReactorySDK;
}

export interface FilePanelProps {
  files: FileItem[];
  filteredFiles: FileItem[];
  loading: boolean;
  viewMode: ViewMode;
  multiSelectEnabled: boolean;
  selectedItems: SelectedItem[];
  searchQuery: string;
  mobileView: MobileView;
  onItemSelection: (item: FileItem | FolderItem, isSelected: boolean) => Promise<void>;
  isItemSelected: (item: FileItem | FolderItem) => boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onSearchChange: (query: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteFile: (fileId: string) => Promise<void>;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, item: FileItem | FolderItem) => void;
  onMobileViewChange: (view: MobileView) => void;
  il8n: any;
  reactory: Reactory.Client.ReactorySDK;
}

export interface FilePreviewProps {
  file: FileItem;
  size?: number;
  showFallback?: boolean;
  reactory: Reactory.Client.ReactorySDK;
}

export interface ItemContextMenuProps {
  anchorEl: HTMLElement | null;
  item: FileItem | FolderItem | null;
  onClose: () => void;
  onRenameFile: (fileId: string, currentName: string) => void;
  onDownloadFile: (file: FileItem) => void;
  onMoveItem: (item: FileItem | FolderItem, newPath: string) => void;
  onDeleteFile: (path: string) => void;
  onDeleteFolder: (folderPath: string) => void;
  il8n: any;
  reactory: Reactory.Client.ReactorySDK;
}

export interface RenameDialogProps {
  open: boolean;
  fileId: string;
  currentName: string;
  newName: string;
  onClose: () => void;
  onConfirm: () => void;
  onNameChange: (newName: string) => void;
  il8n: any;
}

export interface CreateFolderDialogProps {
  open: boolean;
  folderName: string;
  onClose: () => void;
  onConfirm: () => void;
  onNameChange: (name: string) => void;
  il8n: any;
  reactory: Reactory.Client.ReactorySDK;
}

export interface MobileFabsProps {
  mobileView: MobileView;
  onFileUpload: (files: FileList | File[]) => Promise<void>;
  onToggleView: () => void;
}

export interface UserHomeFolderHeaderProps {
  open: boolean;
  loading: boolean;
  mobileView: MobileView;
  currentPath: string;
  onClose: () => void;
  onRefresh: () => void;
  onMobileBack: () => void;
  il8n: any;
  reactory: Reactory.Client.ReactorySDK;
}

// Dialog state interfaces
export interface RenameDialogState {
  open: boolean;
  fileId: string;
  currentName: string;
  newName: string;
}

export interface CreateFolderDialogState {
  open: boolean;
  folderName: string;
}

// Hook return types
export interface UseUserHomeFilesReturn {
  files: FileItem[];
  loading: boolean;
  folderLoading: boolean;
  loadUserFiles: (path?: string) => Promise<{ folders: FolderItem[]; files: FileItem[] }>;
  loadAllFolders: (path?: string) => Promise<FolderItem[]>;
  createFolder: (name: string, path: string) => Promise<void>;
  deleteFolder: (path: string) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  updateFile: (fileId: string, updates: any) => Promise<void>;
  moveItem: (itemPath: string, newPath: string, itemType: string) => Promise<void>;
}

export interface UseFileOperationsReturn {
  handleFileUpload: (files: FileList | File[]) => Promise<void>;
  handleDownloadFile: (file: FileItem) => void;
  handleRenameFile: (fileId: string, currentName: string) => void;
  handleDeleteFile: (fileId: string) => Promise<void>;
  handleCreateFolder: () => Promise<void>;
  handleDeleteFolder: (folderPath: string) => Promise<void>;
  handleMoveItem: (item: FileItem | FolderItem, newPath: string) => Promise<void>;
  handleRenameConfirm: () => Promise<void>;
  handleRenameCancel: () => void;
  renameDialog: RenameDialogState;
  setRenameDialog: React.Dispatch<React.SetStateAction<RenameDialogState>>;
  createFolderDialog: CreateFolderDialogState;
  setCreateFolderDialog: React.Dispatch<React.SetStateAction<CreateFolderDialogState>>;
}
