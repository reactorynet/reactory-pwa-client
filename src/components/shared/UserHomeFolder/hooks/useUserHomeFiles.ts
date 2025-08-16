import { useState, useCallback } from 'react';
import { FolderItem, FileItem, UseUserHomeFilesReturn } from '../types';
import { GET_USER_HOME_FILES, GET_ALL_USER_FOLDERS } from '../constants/graphql';

export const useUserHomeFiles = (reactory: Reactory.Client.ReactorySDK): UseUserHomeFilesReturn => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);

  // Load files for a specific path (doesn't affect folder tree)
  const loadUserFiles = useCallback(async (path: string = '/') => {
    reactory.info(`Loading files for path: ${path}`);
    setLoading(true);
    try {
      const response = await reactory.graphqlQuery<{
        ReactoryUserFiles: {
          folders: {
            name: string;
            path: string;
            link?: string;
            type: 'folder';
          }[];
          files: {
            id: string;
            filename: string;
            mimetype: string;
            size: number;
            alias: string;
            path: string;
            created: string;
            link: string;
            uploadedBy?: {
              id: string;
              firstName: string;
              lastName: string;
              email: string;
              avatar?: string;
            };
          }[];
        }
      }, { path: string }>(GET_USER_HOME_FILES, { path });

      if (response?.data?.ReactoryUserFiles) {
        const { folders: serverFolders, files: serverFiles } = response.data.ReactoryUserFiles;
        
        console.log(`Loaded content for path ${path}:`, { folders: serverFolders, files: serverFiles });
        
        // Transform server data to component format
        const transformedFolders: FolderItem[] = serverFolders.map(folder => ({
          name: folder.name,
          path: folder.path,
          link: folder.link,
          type: 'folder' as const
        }));

        const transformedFiles: FileItem[] = serverFiles.map(file => ({
          id: file.id,
          name: file.filename,
          type: 'file' as const,
          mimetype: file.mimetype,
          size: file.size,
          url: file.link,
          path: file.path,
          uploadDate: new Date(file.created),
          uploadedBy: file.uploadedBy
        }));

        // Only update files - folders are managed by the folder state hook
        setFiles(transformedFiles);
        
        // Return the folders so the parent can decide what to do with them
        return {
          folders: transformedFolders,
          files: transformedFiles
        };
      } else {
        reactory.warning('No data received from server');
        setFiles([]);
        return { folders: [], files: [] };
      }
    } catch (error) {
      reactory.error('Failed to load user files', error);
      setFiles([]);
      return { folders: [], files: [] };
    } finally {
      setLoading(false);
    }
  }, [reactory]);

  // Load all folders from root to build the complete tree structure
  const loadAllFolders = useCallback(async () => {
    reactory.info('Loading all folders to build complete tree structure');
    setFolderLoading(true);
    try {
      // First, get root folders
      const rootResponse = await reactory.graphqlQuery<{
        ReactoryUserFiles: {
          folders: {
            name: string;
            path: string;
            link?: string;
            type: 'folder';
          }[];
        }
      }, { path: string }>(GET_ALL_USER_FOLDERS, { path: '/' });

      if (rootResponse?.data?.ReactoryUserFiles) {
        const rootFolders = rootResponse.data.ReactoryUserFiles.folders;
        console.log('Loaded root folders:', rootFolders);
        
        // Return root folders - the folder state hook will handle building the tree
        return rootFolders.map(folder => ({
          name: folder.name,
          path: folder.path,
          link: folder.link,
          type: 'folder' as const
        }));
      }
      
      return [];
    } catch (error) {
      reactory.error('Failed to load all folders', error);
      return [];
    } finally {
      setFolderLoading(false);
    }
  }, [reactory]);

  // File operations (simplified - focus on API calls)
  const createFolder = useCallback(async (name: string, path: string) => {
    // Implementation for creating folders
    reactory.info(`Creating folder: ${name} at path: ${path}`);
    // TODO: Implement folder creation
  }, [reactory]);

  const deleteFolder = useCallback(async (path: string) => {
    // Implementation for deleting folders
    reactory.info(`Deleting folder at path: ${path}`);
    // TODO: Implement folder deletion
  }, [reactory]);

  const deleteFile = useCallback(async (fileId: string) => {
    // Implementation for deleting files
    reactory.info(`Deleting file: ${fileId}`);
    // TODO: Implement file deletion
  }, [reactory]);

  const updateFile = useCallback(async (fileId: string, updates: any) => {
    // Implementation for updating files
    reactory.info(`Updating file: ${fileId}`, updates);
    // TODO: Implement file update
  }, [reactory]);

  const moveItem = useCallback(async (itemPath: string, newPath: string, itemType: string) => {
    // Implementation for moving items
    reactory.info(`Moving ${itemType}: ${itemPath} to ${newPath}`);
    // TODO: Implement item move
  }, [reactory]);

  return {
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
  };
};
