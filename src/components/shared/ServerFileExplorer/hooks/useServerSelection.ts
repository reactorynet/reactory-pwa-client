import { useState, useCallback } from 'react';
import { ServerFileItem, ServerFolderItem, ServerSelectedItem, UseServerSelectionReturn } from '../types';

const useServerSelection = (
  selectionMode: 'single' | 'multi' = 'single'
): UseServerSelectionReturn => {
  const [selectedItems, setSelectedItems] = useState<ServerSelectedItem[]>([]);

  const createSelectedItem = useCallback((item: ServerFileItem | ServerFolderItem): ServerSelectedItem => {
    return {
      id: item.type === 'file' ? (item as ServerFileItem).id : item.path,
      name: item.name,
      path: item.path,
      fullPath: item.fullPath,
      type: item.type,
      item
    };
  }, []);

  const selectItem = useCallback((item: ServerFileItem | ServerFolderItem, multi: boolean = false) => {
    const selectedItem = createSelectedItem(item);
    const itemId = selectedItem.id;
    
    setSelectedItems(prev => {
      // In single mode or when multi is false, replace selection
      if (selectionMode === 'single' || !multi) {
        return [selectedItem];
      }
      
      // In multi mode, toggle or add to selection
      const existingIndex = prev.findIndex(s => s.id === itemId);
      
      if (existingIndex >= 0) {
        // Item already selected, remove it
        return prev.filter(s => s.id !== itemId);
      } else {
        // Item not selected, add it
        return [...prev, selectedItem];
      }
    });
  }, [selectionMode, createSelectedItem]);

  const deselectItem = useCallback((item: ServerFileItem | ServerFolderItem) => {
    const itemId = item.type === 'file' ? (item as ServerFileItem).id : item.path;
    
    setSelectedItems(prev => prev.filter(s => s.id !== itemId));
  }, []);

  const selectAll = useCallback((items: (ServerFileItem | ServerFolderItem)[]) => {
    if (selectionMode === 'single') return;
    
    const allSelectedItems = items.map(createSelectedItem);
    setSelectedItems(allSelectedItems);
  }, [selectionMode, createSelectedItem]);

  const clearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  const isSelected = useCallback((item: ServerFileItem | ServerFolderItem): boolean => {
    const itemId = item.type === 'file' ? (item as ServerFileItem).id : item.path;
    return selectedItems.some(s => s.id === itemId);
  }, [selectedItems]);

  const toggleSelection = useCallback((item: ServerFileItem | ServerFolderItem) => {
    if (isSelected(item)) {
      deselectItem(item);
    } else {
      selectItem(item, selectionMode === 'multi');
    }
  }, [isSelected, deselectItem, selectItem, selectionMode]);

  return {
    selectedItems,
    selectItem,
    deselectItem,
    selectAll,
    clearSelection,
    isSelected,
    toggleSelection
  };
};

export default useServerSelection;

