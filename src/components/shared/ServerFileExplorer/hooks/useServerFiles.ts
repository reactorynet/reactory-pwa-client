import { useState, useCallback } from 'react';
import { ServerFileItem, ServerFolderItem, ServerSelectedItem, UseServerFilesReturn } from '../types';

  // Real GraphQL queries matching our server implementation
  const LOAD_SERVER_FILES_QUERY = `
    query LoadServerFiles($serverPath: String, $loadOptions: ReactoryServerFilesLoadOptionsInput) {
      ReactoryServerFiles(serverPath: $serverPath, loadOptions: $loadOptions) {
        ... on ReactoryServerFiles {
          serverPath
          totalCount
          hasMore
          folders {
            name
            path
            fullPath
            created
            modified
            size
            fileCount
            permissions {
              read
              write
              delete
            }
          }
          files {
            id
            name
            mimetype
            extension
            size
            path
            fullPath
            created
            modified
            accessed
            checksum
            isSystemFile
            isHidden
            permissions {
              read
              write
              delete
              execute
            }
            metadata
          }
        }
        ... on ReactoryServerFilesErrorResponse {
          error
          message
        }
      }
    }
  `;

  const CREATE_SERVER_FOLDER_MUTATION = `
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

  const DELETE_SERVER_FILE_MUTATION = `
    mutation ReactoryDeleteFile($input: ReactoryFileDeleteInput!) {
      ReactoryDeleteFile(input: $input) {
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

  const DELETE_SERVER_FOLDER_MUTATION = `
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

  const MOVE_SERVER_ITEM_MUTATION = `
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

  const UPLOAD_SERVER_FILES_MUTATION = `
    mutation ReactoryUploadFile($file: Upload!, $alias: String, $path: String, $uploadContext: String) {
      ReactoryUploadFile(file: $file, alias: $alias, path: $path, uploadContext: $uploadContext) {
        ... on ReactoryFileUploadSuccess {
          success
          file {
            id
            filename
            mimetype
            size
            path
          }
        }
        ... on ReactoryFileUploadError {
          error
          message
        }
      }
    }
  `;


const useServerFiles = (
  reactory: Reactory.Client.ReactorySDK, 
  basePath: string
): UseServerFilesReturn => {
  const [files, setFiles] = useState<ServerFileItem[]>([]);
  const [folders, setFolders] = useState<ServerFolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState(basePath);

  const loadPath = useCallback(async (path: string, options?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
    includeFolders?: boolean;
    includeHidden?: boolean;
    includeSystemFiles?: boolean;
    fileTypes?: string[];
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const loadOptions = {
        limit: 50,
        offset: 0,
        sortBy: "name",
        sortOrder: "asc" as const,
        search: "",
        includeFolders: true,
        includeHidden: false,
        includeSystemFiles: true,
        fileTypes: [],
        ...options
      };

      const variables = {
        serverPath: path,
        loadOptions
      };

      // Use Reactory GraphQL client
      const result = await reactory.graphqlQuery(LOAD_SERVER_FILES_QUERY, variables) as {
        data?: {
          ReactoryServerFiles?: {
            __typename: 'ReactoryServerFiles' | 'ReactoryServerFilesErrorResponse';
            serverPath?: string;
            totalCount?: number;
            hasMore?: boolean;
            folders?: Array<{
              name: string;
              path: string;
              fullPath: string;
              created: string;
              modified: string;
              size?: number;
              fileCount?: number;
              permissions?: {
                read: boolean;
                write: boolean;
                delete: boolean;
              };
            }>;
            files?: Array<{
              id: string;
              name: string;
              mimetype: string;
              extension: string;
              size: number;
              path: string;
              fullPath: string;
              created: string;
              modified: string;
              accessed?: string;
              checksum?: string;
              isSystemFile: boolean;
              isHidden: boolean;
              permissions?: {
                read: boolean;
                write: boolean;
                delete: boolean;
                execute?: boolean;
              };
              metadata?: string;
            }>;
            error?: string;
            message?: string;
          };
        };
      };
      
      if (result.data?.ReactoryServerFiles?.__typename === 'ReactoryServerFilesErrorResponse') {
        throw new Error(result.data.ReactoryServerFiles.message);
      }

      const serverFiles = result.data?.ReactoryServerFiles;
      if (!serverFiles || serverFiles.__typename !== 'ReactoryServerFiles') {
        throw new Error('Invalid response from server');
      }

      // Transform server data to our types
      const transformedFolders: ServerFolderItem[] = serverFiles.folders.map(folder => ({
        ...folder,
        type: 'folder' as const,
        created: new Date(folder.created),
        modified: new Date(folder.modified)
      }));

      const transformedFiles: ServerFileItem[] = serverFiles.files.map(file => ({
        ...file,
        type: 'file' as const,
        created: new Date(file.created),
        modified: new Date(file.modified),
        accessed: file.accessed ? new Date(file.accessed) : undefined,
        metadata: file.metadata ? JSON.parse(file.metadata) : undefined,
        permissions: {
          read: file.permissions?.read || false,
          write: file.permissions?.write || false,
          delete: file.permissions?.delete || false,
          execute: file.permissions?.execute || false
        }
      }));

      setFolders(transformedFolders);
      setFiles(transformedFiles);
      setCurrentPath(path);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load server files';
      setError(errorMessage);
      console.error('Error loading server path:', err);
      reactory.error('Server File Load Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [reactory]);

  const refreshPath = useCallback(async () => {
    await loadPath(currentPath);
  }, [currentPath, loadPath]);

  const createFolder = useCallback(async (name: string, path: string) => {
    try {
      setLoading(true);
      
      const variables = {
        name,
        path
      };

      const result = await reactory.graphqlMutation(CREATE_SERVER_FOLDER_MUTATION, variables) as {
        data?: {
          ReactoryCreateFolder?: {
            __typename: 'ReactoryFolderCreateSuccess' | 'ReactoryFolderCreateError';
            success?: boolean;
            folder?: {
              name: string;
              path: string;
            };
            error?: string;
            message?: string;
          };
        };
      };
      
      if (result.data?.ReactoryCreateFolder?.__typename === 'ReactoryFolderCreateError') {
        throw new Error(result.data.ReactoryCreateFolder.message);
      }

      const folderResult = result.data?.ReactoryCreateFolder;
      if (!folderResult || folderResult.__typename !== 'ReactoryFolderCreateSuccess') {
        throw new Error('Failed to create folder');
      }

      // Refresh the current path to get the updated folder list
      await refreshPath();
      
      reactory.info(`Folder "${name}" created successfully`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create folder';
      console.error('Error creating folder:', err);
      reactory.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [reactory, refreshPath]);

  const deleteItems = useCallback(async (items: ServerSelectedItem[]) => {
    try {
      setLoading(true);
      
      const errors: string[] = [];
      let deletedCount = 0;

      // Process files and folders separately
      for (const item of items) {
        try {
          if (item.type === 'file') {
            const variables = {
              input: {
                path: item.fullPath
              }
            };

            const result = await reactory.graphqlMutation(DELETE_SERVER_FILE_MUTATION, variables) as {
              data?: {
                ReactoryDeleteFile?: {
                  __typename: 'ReactoryFileDeleteSuccess' | 'ReactoryFileDeleteError';
                  success?: boolean;
                  id?: string;
                  error?: string;
                  message?: string;
                };
              };
            };
            
            if (result.data?.ReactoryDeleteFile?.__typename === 'ReactoryFileDeleteError') {
              errors.push(`${item.name}: ${result.data.ReactoryDeleteFile.message}`);
            } else {
              deletedCount++;
            }
          } else {
            const variables = {
              path: item.fullPath
            };

            const result = await reactory.graphqlMutation(DELETE_SERVER_FOLDER_MUTATION, variables) as {
              data?: {
                ReactoryDeleteFolder?: {
                  __typename: 'ReactoryFolderDeleteSuccess' | 'ReactoryFolderDeleteError';
                  success?: boolean;
                  path?: string;
                  error?: string;
                  message?: string;
                };
              };
            };
            
            if (result.data?.ReactoryDeleteFolder?.__typename === 'ReactoryFolderDeleteError') {
              errors.push(`${item.name}: ${result.data.ReactoryDeleteFolder.message}`);
            } else {
              deletedCount++;
            }
          }
        } catch (err) {
          errors.push(`${item.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      if (errors.length > 0) {
        reactory.warning(`Some items could not be deleted:\n${errors.join('\n')}`);
      }

      if (deletedCount > 0) {
        reactory.info(`${deletedCount} item(s) deleted successfully`);

        // Refresh the current path to get the updated file list
        await refreshPath();
      }

      if (errors.length > 0 && deletedCount === 0) {
        throw new Error('Failed to delete any items');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete items';
      console.error('Error deleting items:', err);
      reactory.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [reactory, refreshPath]);

  const renameItem = useCallback(async (item: ServerSelectedItem, newName: string) => {
    try {
      setLoading(true);
      
      // Calculate new path (same directory, different name)
      const parentPath = item.fullPath.substring(0, item.fullPath.lastIndexOf('/'));
      const newFullPath = `${parentPath}/${newName}`;
      
      const variables = {
        itemPath: item.fullPath,
        newPath: newFullPath,
        itemType: item.type
      };

      const result = await reactory.graphqlMutation(MOVE_SERVER_ITEM_MUTATION, variables) as {
        data?: {
          ReactoryMoveItem?: {
            __typename: 'ReactoryItemMoveSuccess' | 'ReactoryItemMoveError';
            success?: boolean;
            newPath?: string;
            itemType?: string;
            error?: string;
            message?: string;
          };
        };
      };
      
      if (result.data?.ReactoryMoveItem?.__typename === 'ReactoryItemMoveError') {
        throw new Error(result.data.ReactoryMoveItem.message);
      }

      const moveResult = result.data?.ReactoryMoveItem;
      if (!moveResult || moveResult.__typename !== 'ReactoryItemMoveSuccess') {
        throw new Error('Failed to rename item');
      }

      // Refresh the current path to get the updated item list
      await refreshPath();
      
      reactory.info(`"${item.name}" renamed to "${newName}" successfully`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rename item';
      console.error('Error renaming item:', err);
      reactory.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [reactory, refreshPath]);

  const moveItems = useCallback(async (items: ServerSelectedItem[], targetPath: string) => {
    try {
      setLoading(true);
      
      const errors: string[] = [];
      let movedCount = 0;

      for (const item of items) {
        try {
          const newPath = `${targetPath}/${item.name}`;
          
          const variables = {
            itemPath: item.fullPath,
            newPath: newPath,
            itemType: item.type
          };

          const result = await reactory.graphqlMutation(MOVE_SERVER_ITEM_MUTATION, variables) as {
            data?: {
              ReactoryMoveItem?: {
                __typename: 'ReactoryItemMoveSuccess' | 'ReactoryItemMoveError';
                success?: boolean;
                newPath?: string;
                itemType?: string;
                error?: string;
                message?: string;
              };
            };
          };
          
          if (result.data?.ReactoryMoveItem?.__typename === 'ReactoryItemMoveError') {
            errors.push(`${item.name}: ${result.data.ReactoryMoveItem.message}`);
          } else {
            movedCount++;
          }
        } catch (err) {
          errors.push(`${item.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      if (errors.length > 0) {
        reactory.warning(`Some items could not be moved:\n${errors.join('\n')}`);
      }

      if (movedCount > 0) {
        reactory.info(`${movedCount} item(s) moved successfully`);

        // Refresh the current path
        await refreshPath();
      }

      if (errors.length > 0 && movedCount === 0) {
        throw new Error('Failed to move any items');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move items';
      console.error('Error moving items:', err);
      reactory.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [reactory, refreshPath]);

  const copyItems = useCallback(async (items: ServerSelectedItem[], targetPath: string) => {
    // Copy operation is not implemented in server mutations yet
    // For now, we'll show a notification that this feature is not available
    reactory.info('Copy operation is not yet implemented for server files');
    console.log('Copying items:', items, 'to:', targetPath);
  }, [reactory]);

  const uploadFiles = useCallback(async (files: File[], targetPath: string) => {
    try {
      setLoading(true);
      
      const errors: string[] = [];
      let uploadedCount = 0;

      for (const file of files) {
        try {
          const variables = {
            file,
            path: targetPath,
            uploadContext: 'server_file_upload'
          };

          const result = await reactory.graphqlMutation(UPLOAD_SERVER_FILES_MUTATION, variables) as {
            data?: {
              ReactoryUploadFile?: {
                __typename: 'ReactoryFileUploadSuccess' | 'ReactoryFileUploadError';
                success?: boolean;
                file?: {
                  id: string;
                  filename: string;
                  mimetype: string;
                  size: number;
                  path: string;
                };
                error?: string;
                message?: string;
              };
            };
          };
          
          if (result.data?.ReactoryUploadFile?.__typename === 'ReactoryFileUploadError') {
            errors.push(`${file.name}: ${result.data.ReactoryUploadFile.message}`);
          } else {
            uploadedCount++;
          }
        } catch (err) {
          errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      if (errors.length > 0) {
        reactory.warning(`Some files could not be uploaded:\n${errors.join('\n')}`);
      }

      if (uploadedCount > 0) {
        reactory.info(`${uploadedCount} file(s) uploaded successfully`);

        // Refresh the current path to show uploaded files
        await refreshPath();
      }

      if (errors.length > 0 && uploadedCount === 0) {
        throw new Error('Failed to upload any files');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload files';
      console.error('Error uploading files:', err);
      reactory.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [reactory, refreshPath]);


  const readFile = useCallback(async (file: ServerFileItem): Promise<string> => { 
    try {
      setLoading(true);
      setError(null);
      
      // For simplicity, we'll use a direct fetch to the file's fullPath
      // In a real app, you might need to handle authentication, CORS, etc.
      const response = await fetch(file.fullPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      const text = await response.text();
      return text;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to read file';
      console.error('Error reading file:', err);
      reactory.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    } 
  }, [reactory, refreshPath]);
  

  return {
    files,
    folders,
    loading,
    error,
    currentPath,
    loadPath,
    refreshPath,
    createFolder,
    deleteItems,
    renameItem,
    moveItems,
    copyItems,
    uploadFiles
  };
};

export default useServerFiles;
