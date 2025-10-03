import { useState, useCallback } from 'react';
import { UseServerNavigationReturn } from '../types';

const useServerNavigation = (basePath: string): UseServerNavigationReturn => {
  const [currentPath, setCurrentPath] = useState(basePath);
  const [pathHistory, setPathHistory] = useState<string[]>([basePath]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < pathHistory.length - 1;

  const navigate = useCallback((path: string) => {
    if (path === currentPath) return;
    
    setCurrentPath(path);
    
    // Update history - remove any forward history and add new path
    const newHistory = pathHistory.slice(0, historyIndex + 1);
    newHistory.push(path);
    
    setPathHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [currentPath, pathHistory, historyIndex]);

  const navigateUp = useCallback(() => {
    const parentPath = getParentPath(currentPath);
    if (parentPath !== currentPath) {
      navigate(parentPath);
    }
  }, [currentPath, navigate]);

  const goBack = useCallback(() => {
    if (canGoBack) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentPath(pathHistory[newIndex]);
    }
  }, [canGoBack, historyIndex, pathHistory]);

  const goForward = useCallback(() => {
    if (canGoForward) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentPath(pathHistory[newIndex]);
    }
  }, [canGoForward, historyIndex, pathHistory]);

  const goHome = useCallback(() => {
    navigate(basePath);
  }, [basePath, navigate]);

  return {
    currentPath,
    pathHistory,
    canGoBack,
    canGoForward,
    navigate,
    navigateUp,
    goBack,
    goForward,
    goHome
  };
};

// Helper function to get parent path
const getParentPath = (path: string): string => {
  if (!path || path === '/' || path.indexOf('/') === -1) {
    return path;
  }
  
  // Handle paths like "${APP_DATA_ROOT}/workflows/subfolder"
  const lastSlashIndex = path.lastIndexOf('/');
  if (lastSlashIndex === 0) {
    return '/';
  }
  
  return path.substring(0, lastSlashIndex);
};

export default useServerNavigation;

