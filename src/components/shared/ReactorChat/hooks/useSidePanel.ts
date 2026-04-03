import { useState, useCallback, useRef, useMemo } from 'react';
import { SidePanelItem, SidePanelState, SidePanelActions } from '../types';

const MAX_ITEMS = 10;

export interface UseSidePanelResult {
  panelState: SidePanelState;
  setPanelState: React.Dispatch<React.SetStateAction<SidePanelState>>;
  addItem: (item: SidePanelItem) => void;
  updateItem: (id: string, updates: Partial<Omit<SidePanelItem, 'id'>>) => void;
  removeItem: (id: string) => void;
  getState: () => SidePanelState;
  setActiveItem: (id: string) => void;
  togglePanel: () => void;
  clearAll: () => void;
  /** Pre-built actions object suitable for injecting into ChatState.sidePanel */
  actions: SidePanelActions;
}

const INITIAL_STATE: SidePanelState = {
  items: [],
  activeItemId: undefined,
  isOpen: false,
};

export default function useSidePanel(
  initialState?: SidePanelState,
): UseSidePanelResult {
  const [panelState, setPanelState] = useState<SidePanelState>(
    initialState ?? INITIAL_STATE,
  );

  // Keep a ref that always points to current state so getState() is sync-safe
  const stateRef = useRef(panelState);
  stateRef.current = panelState;

  const addItem = useCallback((item: SidePanelItem) => {
    setPanelState((prev) => {
      if (prev.items.length >= MAX_ITEMS) {
        console.warn(`[useSidePanel] Max items (${MAX_ITEMS}) reached — ignoring add`);
        return prev;
      }
      // Prevent duplicate IDs
      if (prev.items.some((i) => i.id === item.id)) {
        console.warn(`[useSidePanel] Item with id "${item.id}" already exists — ignoring add`);
        return prev;
      }
      return {
        items: [...prev.items, item],
        activeItemId: item.id,
        isOpen: true,
      };
    });
  }, []);

  const updateItem = useCallback(
    (id: string, updates: Partial<Omit<SidePanelItem, 'id'>>) => {
      setPanelState((prev) => {
        const idx = prev.items.findIndex((i) => i.id === id);
        if (idx === -1) return prev;
        const updated = { ...prev.items[idx], ...updates };
        const items = [...prev.items];
        items[idx] = updated;
        return { ...prev, items };
      });
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setPanelState((prev) => {
      const items = prev.items.filter((i) => i.id !== id);
      let activeItemId = prev.activeItemId;
      // If the removed item was active, shift to the next available
      if (prev.activeItemId === id) {
        activeItemId = items.length > 0 ? items[items.length - 1].id : undefined;
      }
      return {
        items,
        activeItemId,
        isOpen: items.length > 0 ? prev.isOpen : false,
      };
    });
  }, []);

  const getState = useCallback((): SidePanelState => stateRef.current, []);

  const setActiveItem = useCallback((id: string) => {
    setPanelState((prev) => {
      if (!prev.items.some((i) => i.id === id)) return prev;
      return { ...prev, activeItemId: id };
    });
  }, []);

  const togglePanel = useCallback(() => {
    setPanelState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const clearAll = useCallback(() => {
    setPanelState(INITIAL_STATE);
  }, []);

  const actions: SidePanelActions = useMemo(() => ({
    addItem,
    updateItem,
    removeItem,
    getState,
    setActiveItem,
    togglePanel,
    clearAll,
  }), [addItem, updateItem, removeItem, getState, setActiveItem, togglePanel, clearAll]);

  return {
    panelState,
    setPanelState,
    addItem,
    updateItem,
    removeItem,
    getState,
    setActiveItem,
    togglePanel,
    clearAll,
    actions,
  };
}
