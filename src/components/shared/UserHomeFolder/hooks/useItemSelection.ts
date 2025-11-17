import { useState, useCallback } from 'react';
import { SelectedItem, FileItem, FolderItem } from '../types';

export const useItemSelection = (
  multiSelectEnabled: boolean,
  onSelectionChanged?: (selectedItems: SelectedItem[], selectionMode: 'single' | 'multi') => void,
  onItemSelect?: (item: SelectedItem, selectionMode: 'single' | 'multi') => Promise<void>,
  onItemDeselect?: (item: SelectedItem, selectionMode: 'single' | 'multi') => Promise<void>,
  reactory?: Reactory.Client.ReactorySDK,
  externalSelectedItems: SelectedItem[] = []
) => {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const handleItemSelection = useCallback(async (item: FileItem | FolderItem, isSelected: boolean) => {
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
          await onItemSelect(selectedItem, multiSelectEnabled ? 'multi' : 'single');
        } catch (error) {
          reactory?.error('Failed to select item', error);
        }
      } else if (!isSelected && onItemDeselect) {
        try {
          await onItemDeselect(selectedItem, multiSelectEnabled ? 'multi' : 'single');
        } catch (error) {
          reactory?.error('Failed to deselect item', error);
        }
      }
      return; // Don't update local selection for externally managed items
    }

    // Handle local selection using functional updates to avoid dependency on selectedItems
    setSelectedItems(prevSelected => {
      let newSelection: SelectedItem[];
      
      if (multiSelectEnabled) {
        if (isSelected) {
          newSelection = [...prevSelected, selectedItem];
        } else {
          newSelection = prevSelected.filter(s => s.id !== selectedItem.id);
        }
      } else {
        newSelection = isSelected ? [selectedItem] : [];
      }

      // Call selection changed callback
      if (onSelectionChanged) {
        onSelectionChanged(newSelection, multiSelectEnabled ? 'multi' : 'single');
      }

      return newSelection;
    });
  }, [multiSelectEnabled, onSelectionChanged, externalSelectedItems, onItemSelect, onItemDeselect, reactory]);

  const isItemSelected = useCallback((item: FileItem | FolderItem): boolean => {
    const itemId = 'id' in item ? item.id : item.path;
    const itemPath = item.path;
    
    // Check local selection first
    const isLocallySelected = selectedItems.some(s => s.id === itemId);
    
    // Check external selection by path (for files already attached to chat)
    const isExternallySelected = externalSelectedItems.some(s => s.path === itemPath);
    
    return isLocallySelected || isExternallySelected;
  }, [selectedItems, externalSelectedItems]);

  const handleSelectAll = useCallback((folders: FolderItem[], files: FileItem[]) => {
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
      onSelectionChanged(allItems, multiSelectEnabled ? 'multi' : 'single');
    }
  }, [onSelectionChanged, multiSelectEnabled]);

  const handleClearSelection = useCallback(() => {
    setSelectedItems([]);
    if (onSelectionChanged) {
      onSelectionChanged([], multiSelectEnabled ? 'multi' : 'single');
    }
  }, [onSelectionChanged, multiSelectEnabled]);

  const clearLocalSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  return {
    selectedItems,
    setSelectedItems,
    handleItemSelection,
    isItemSelected,
    handleSelectAll,
    handleClearSelection,
    clearLocalSelection
  };
};
