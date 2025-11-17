import { useState, useCallback } from 'react';
import { 
  UseFileOperationsReturn, 
  RenameDialogState, 
  CreateFolderDialogState,
  FileItem,
  FolderItem
} from '../types';
import { downloadFile } from '../utils';
import { UPLOAD_FILE_MUTATION } from '../constants/graphql';

interface FileOperationsConfig {
  reactory: Reactory.Client.ReactorySDK;
  currentPath: string;
  onFileUpload?: (files: File[], path: string) => Promise<void>;
  loadUserFiles: (path?: string) => Promise<{ folders: FolderItem[]; files: any[] }>;
  createFolderOperation: (name: string, path: string) => Promise<void>;
  deleteFolderOperation: (path: string) => Promise<void>;
  deleteFileOperation: (fileId: string) => Promise<void>;
  updateFileOperation: (fileId: string, updates: any) => Promise<void>;
  moveItemOperation: (itemPath: string, newPath: string, itemType: string) => Promise<void>;
}

export const useFileOperations = (config: FileOperationsConfig): UseFileOperationsReturn => {
  const {
    reactory,
    currentPath,
    onFileUpload,
    loadUserFiles,
    createFolderOperation,
    deleteFolderOperation,
    deleteFileOperation,
    updateFileOperation,
    moveItemOperation
  } = config;
  const [renameDialog, setRenameDialog] = useState<RenameDialogState>({
    open: false,
    fileId: '',
    currentName: '',
    newName: ''
  });

  const [createFolderDialog, setCreateFolderDialog] = useState<CreateFolderDialogState>({
    open: false,
    folderName: ''
  });

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    let uploadSuccess = true;
    
    for (const file of fileArray) {
      try {
        reactory.info(`Starting upload for: ${file.name}`);
        
        // Create a File object that can be used with GraphQL Upload
        const uploadFile = new File([file], file.name, { type: file.type });
        
        // Call the GraphQL mutation for file upload
        const response = await reactory.graphqlMutation<{
          ReactoryUploadFile: {
            success: boolean;
            file?: {
              id: string;
              filename: string;
              mimetype: string;
              size: number;
              alias: string;
              path: string;
              created: string;
              link: string;
              uploadContext: string;
            };
          } | {
            error: string;
            message: string;
          };
        }, { 
          file: File; 
          alias?: string; 
          path?: string; 
          uploadContext?: string; 
        }>(UPLOAD_FILE_MUTATION, {
          file: uploadFile,
          alias: file.name,
          path: currentPath,
          uploadContext: 'user-home-folder'
        });

        if (response?.data?.ReactoryUploadFile) {
          const result = response.data.ReactoryUploadFile;
          
          if ('error' in result) {
            reactory.error(`Failed to upload ${file.name}: ${result.message}`);
            uploadSuccess = false;
          } else if (result.success) {
            reactory.info(`Successfully uploaded: ${file.name}`);
          } else {
            reactory.error(`Upload failed for ${file.name}: Unknown error`);
            uploadSuccess = false;
          }
        } else {
          reactory.error(`No response received for ${file.name} upload`);
          uploadSuccess = false;
        }
        
        // If onFileUpload callback is provided, call it as well
        if (onFileUpload) {
          try {
            await onFileUpload([file], currentPath);
          } catch (error) {
            reactory.warning(`onFileUpload callback failed for ${file.name}`, error);
            // Don't mark upload as failed if callback fails
          }
        }
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
  }, [reactory, currentPath, onFileUpload, loadUserFiles]);

  const handleDownloadFile = useCallback((file: FileItem) => {
    if (file.url) {
      downloadFile(file.url, file.name);
    } else {
      reactory.warning('File download URL not available');
    }
  }, [reactory]);

  const handleRenameFile = useCallback((fileId: string, currentName: string) => {
    setRenameDialog({
      open: true,
      fileId: fileId,
      currentName,
      newName: currentName
    });
  }, []);

  const handleDeleteFile = useCallback(async (fileId: string) => {
    await deleteFileOperation(fileId);
    await loadUserFiles(currentPath);
  }, [deleteFileOperation, loadUserFiles, currentPath]);

  const handleCreateFolder = useCallback(async () => {
    if (!createFolderDialog.folderName.trim()) {
      reactory.warning('Please enter a folder name');
      return;
    }

    await createFolderOperation(
      createFolderDialog.folderName.trim(),
      currentPath
    );

    setCreateFolderDialog({ open: false, folderName: '' });
    await loadUserFiles(currentPath);
  }, [createFolderDialog.folderName, currentPath, createFolderOperation, loadUserFiles, reactory]);

  const handleDeleteFolder = useCallback(async (folderPath: string) => {
    await deleteFolderOperation(folderPath);
    await loadUserFiles(currentPath);
  }, [deleteFolderOperation, loadUserFiles, currentPath]);

  const handleMoveItem = useCallback(async (item: FileItem | FolderItem, newPath: string) => {
    await moveItemOperation(item.path, newPath, item.type);
    await loadUserFiles(currentPath);
  }, [moveItemOperation, loadUserFiles, currentPath]);

  const handleRenameConfirm = useCallback(async () => {
    if (!renameDialog.newName.trim() || renameDialog.newName === renameDialog.currentName) {
      setRenameDialog(prev => ({ ...prev, open: false }));
      return;
    }

    await updateFileOperation(renameDialog.fileId, {
      filename: renameDialog.newName.trim()
    });

    setRenameDialog({ open: false, fileId: '', currentName: '', newName: '' });
    await loadUserFiles(currentPath);
  }, [renameDialog, updateFileOperation, loadUserFiles, currentPath]);

  const handleRenameCancel = useCallback(() => {
    setRenameDialog({ open: false, fileId: '', currentName: '', newName: '' });
  }, []);

  return {
    handleFileUpload,
    handleDownloadFile,
    handleRenameFile,
    handleDeleteFile,
    handleCreateFolder,
    handleDeleteFolder,
    handleMoveItem,
    handleRenameConfirm,
    handleRenameCancel,
    renameDialog,
    setRenameDialog,
    createFolderDialog,
    setCreateFolderDialog
  };
};
