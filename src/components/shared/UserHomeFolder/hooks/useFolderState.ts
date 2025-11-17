import { useState, useCallback, useMemo } from 'react';
import { FolderItem, HierarchicalFolderItem } from '../types';

interface UseFolderStateReturn {
  // State
  folderTree: Map<string, HierarchicalFolderItem>;
  expandedFolders: Set<string>;
  currentPath: string;
  
  // Actions
  setCurrentPath: (path: string) => void;
  expandFolder: (folderPath: string) => void;
  collapseFolder: (folderPath: string) => void;
  toggleFolder: (folderPath: string) => void;
  addFolders: (folders: FolderItem[], path: string) => void;
  updateFolderContents: (folders: FolderItem[], files: any[], path: string) => void;
  clearFolderState: () => void;
  
  // Computed values
  hierarchicalFolders: HierarchicalFolderItem[];
  isExpanded: (folderPath: string) => boolean;
  getFolderByPath: (path: string) => HierarchicalFolderItem | undefined;
  getSubfolders: (parentPath: string) => HierarchicalFolderItem[];
}

export const useFolderState = (rootPath: string = '/'): UseFolderStateReturn => {
  // Core state
  const [folderTree, setFolderTree] = useState<Map<string, HierarchicalFolderItem>>(new Map());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [currentPath, setCurrentPath] = useState<string>(rootPath);

  // Build hierarchical folder structure
  const buildFolderTree = useCallback((flatFolders: FolderItem[]): HierarchicalFolderItem[] => {
    console.log('Building folder tree with:', flatFolders);
    
    const tree: HierarchicalFolderItem[] = [];
    const pathMap = new Map<string, HierarchicalFolderItem>();

    // First pass: create all folder items
    flatFolders.forEach(folder => {
      const hierarchicalFolder: HierarchicalFolderItem = {
        ...folder,
        expanded: expandedFolders.has(folder.path),
        children: [],
        level: folder.path.split('/').filter(Boolean).length,
        parentPath: folder.path === '/' ? '' : folder.path.split('/').slice(0, -1).join('/') || '/',
        hasChildren: false
      };
      pathMap.set(folder.path, hierarchicalFolder);
      console.log('Created folder item:', {
        path: folder.path,
        parentPath: hierarchicalFolder.parentPath,
        level: hierarchicalFolder.level
      });
    });

    // Second pass: build parent-child relationships
    flatFolders.forEach(folder => {
      const hierarchicalFolder = pathMap.get(folder.path)!;
      if (hierarchicalFolder.parentPath && hierarchicalFolder.parentPath !== '/') {
        const parent = pathMap.get(hierarchicalFolder.parentPath);
        if (parent) {
          parent.children.push(hierarchicalFolder);
          parent.hasChildren = true;
          console.log('Added child folder:', {
            child: folder.path,
            parent: hierarchicalFolder.parentPath,
            parentHasChildren: parent.hasChildren
          });
        } else {
          console.warn('Parent not found for folder:', {
            folder: folder.path,
            parentPath: hierarchicalFolder.parentPath
          });
        }
      } else {
        tree.push(hierarchicalFolder);
        console.log('Added root folder:', folder.path);
      }
    });

    console.log('Final folder tree:', tree);
    return tree;
  }, [expandedFolders]);

  // Memoized hierarchical folders
  const hierarchicalFolders = useMemo(() => {
    return buildFolderTree(Array.from(folderTree.values()));
  }, [folderTree, buildFolderTree]);

  // Actions
  const expandFolder = useCallback((folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      newSet.add(folderPath);
      return newSet;
    });
  }, []);

  const collapseFolder = useCallback((folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      newSet.delete(folderPath);
      return newSet;
    });
  }, []);

  const toggleFolder = useCallback((folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  }, []);

  const addFolders = useCallback((folders: FolderItem[], path: string) => {
    console.log(`Adding ${folders.length} folders for path: ${path}`);
    
    setFolderTree(prev => {
      const newTree = new Map(prev);
      
      folders.forEach(folder => {
        // Only add if not already present or if it's a more recent version
        if (!newTree.has(folder.path) || newTree.get(folder.path)?.updated !== folder.updated) {
          newTree.set(folder.path, {
            ...folder,
            expanded: expandedFolders.has(folder.path),
            children: [],
            level: folder.path.split('/').filter(Boolean).length,
            parentPath: folder.path === '/' ? '' : folder.path.split('/').slice(0, -1).join('/') || '/',
            hasChildren: false
          });
        }
      });
      
      console.log(`Updated folder tree, now contains ${newTree.size} folders`);
      return newTree;
    });
  }, [expandedFolders]);

  const updateFolderContents = useCallback((folders: FolderItem[], files: any[], path: string) => {
    console.log(`Updating folder contents for path: ${path}`, { folders, files });
    
    // Add any new folders to the tree
    if (folders.length > 0) {
      addFolders(folders, path);
    }
    
    // Note: Files are managed separately by the parent component
    // This hook only manages folder state
  }, [addFolders]);

  const clearFolderState = useCallback(() => {
    setFolderTree(new Map());
    setExpandedFolders(new Set());
    setCurrentPath(rootPath);
  }, [rootPath]);

  // Computed values
  const isExpanded = useCallback((folderPath: string) => {
    return expandedFolders.has(folderPath);
  }, [expandedFolders]);

  const getFolderByPath = useCallback((path: string) => {
    return folderTree.get(path);
  }, [folderTree]);

  const getSubfolders = useCallback((parentPath: string) => {
    return Array.from(folderTree.values()).filter(folder => {
      const folderPath = folder.path;
      const parentPathParts = parentPath.split('/').filter(Boolean);
      const folderPathParts = folderPath.split('/').filter(Boolean);
      
      // If we're at root, show top-level folders
      if (parentPath === '/') {
        return folderPathParts.length === 1;
      }
      
      // Show folders that are one level deeper than parent path
      return folderPathParts.length === parentPathParts.length + 1 && 
             folderPath.startsWith(parentPath + '/');
    });
  }, [folderTree]);

  return {
    // State
    folderTree,
    expandedFolders,
    currentPath,
    
    // Actions
    setCurrentPath,
    expandFolder,
    collapseFolder,
    toggleFolder,
    addFolders,
    updateFolderContents,
    clearFolderState,
    
    // Computed values
    hierarchicalFolders,
    isExpanded,
    getFolderByPath,
    getSubfolders
  };
};
