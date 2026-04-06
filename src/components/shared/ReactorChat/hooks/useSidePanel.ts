import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { SidePanelItem, SidePanelState, SidePanelActions } from '../types';

const MAX_ITEMS = 10;
const PERSIST_DEBOUNCE_MS = 500;

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

/**
 * Strips non-serializable fields (reactory SDK instance) from item props
 * so only persistable data is sent to the server.
 */
function toSerializable(state: SidePanelState): SidePanelState {
  return {
    ...state,
    items: state.items.map(({ id, componentFqn, title, type, addedAt, addedBy, props }) => {
      // Strip the reactory SDK reference — it's non-serializable and will be
      // re-injected on restore. Keep all other props (userId, formId, etc.).
      const { reactory: _reactory, ...serializableProps } = props || {};
      return {
        id, componentFqn, title, type, addedAt, addedBy,
        props: Object.keys(serializableProps).length > 0 ? serializableProps : undefined,
      } as SidePanelItem;
    }),
  };
}

export default function useSidePanel(
  initialState?: SidePanelState,
  onPersist?: (state: SidePanelState) => void,
): UseSidePanelResult {
  const [panelState, setPanelState] = useState<SidePanelState>(
    initialState ?? INITIAL_STATE,
  );

  // Keep a ref that always points to current state so getState() is sync-safe
  const stateRef = useRef(panelState);
  stateRef.current = panelState;

  // Debounced persistence: fires after state settles for PERSIST_DEBOUNCE_MS
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPersistRef = useRef(onPersist);
  onPersistRef.current = onPersist;
  // Track whether the state has been mutated (vs initial load/restore)
  const hasMutated = useRef(false);

  useEffect(() => {
    if (!onPersistRef.current || !hasMutated.current) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      onPersistRef.current?.(toSerializable(panelState));
    }, PERSIST_DEBOUNCE_MS);
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [panelState]);

  // Flush pending persist on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (persistTimerRef.current && onPersistRef.current && hasMutated.current) {
        clearTimeout(persistTimerRef.current);
        onPersistRef.current(toSerializable(stateRef.current));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const markMutated = useCallback(() => { hasMutated.current = true; }, []);

  const addItem = useCallback((item: SidePanelItem) => {
    setPanelState((prev) => {
      if (prev.items.length >= MAX_ITEMS) {
        console.warn(`[useSidePanel] Max items (${MAX_ITEMS}) reached — ignoring add`);
        return prev;
      }
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
    markMutated();
  }, [markMutated]);

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
      markMutated();
    },
    [markMutated],
  );

  const removeItem = useCallback((id: string) => {
    setPanelState((prev) => {
      const items = prev.items.filter((i) => i.id !== id);
      let activeItemId = prev.activeItemId;
      if (prev.activeItemId === id) {
        activeItemId = items.length > 0 ? items[items.length - 1].id : undefined;
      }
      return {
        items,
        activeItemId,
        isOpen: items.length > 0 ? prev.isOpen : false,
      };
    });
    markMutated();
  }, [markMutated]);

  const getState = useCallback((): SidePanelState => stateRef.current, []);

  const setActiveItem = useCallback((id: string) => {
    setPanelState((prev) => {
      if (!prev.items.some((i) => i.id === id)) return prev;
      return { ...prev, activeItemId: id };
    });
    markMutated();
  }, [markMutated]);

  const togglePanel = useCallback(() => {
    setPanelState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
    markMutated();
  }, [markMutated]);

  const clearAll = useCallback(() => {
    setPanelState(INITIAL_STATE);
    markMutated();
  }, [markMutated]);

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
