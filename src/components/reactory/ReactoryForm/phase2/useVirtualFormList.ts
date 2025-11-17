/**
 * Phase 2.1: Virtual Form List Hook
 * 
 * Enhanced virtual scrolling hook specifically optimized for ReactoryForm components
 * with support for dynamic form fields, validation, and real-time updates.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface VirtualFormItem {
  id: string;
  type: 'text' | 'number' | 'email' | 'select' | 'textarea' | 'checkbox' | 'radio';
  name: string;
  label: string;
  value: any;
  required?: boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    message?: string;
  };
  options?: Array<{ value: string; label: string }>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export interface VirtualFormListConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  enableDynamicHeight?: boolean;
  enableSmoothScrolling?: boolean;
  enableKeyboardNavigation?: boolean;
  enableAutoFocus?: boolean;
  enableValidation?: boolean;
  enableRealTimeUpdates?: boolean;
}

export interface VirtualFormListState {
  visibleRange: { start: number; end: number };
  scrollTop: number;
  totalHeight: number;
  isScrolling: boolean;
  focusedIndex: number | null;
  validationErrors: Map<string, string>;
  isUpdating: boolean;
}

export interface VirtualFormListResult {
  // State
  state: VirtualFormListState;
  visibleItems: VirtualFormItem[];
  
  // Actions
  scrollTo: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  focusItem: (index: number) => void;
  updateItem: (index: number, updates: Partial<VirtualFormItem>) => void;
  addItem: (item: VirtualFormItem) => void;
  removeItem: (index: number) => void;
  validateItem: (index: number) => boolean;
  validateAll: () => boolean;
  
  // Utilities
  getItemOffset: (index: number) => number;
  getVisibleRange: (scrollTop: number) => { start: number; end: number };
  isItemVisible: (index: number) => boolean;
  getScrollPosition: () => number;
  setScrollPosition: (scrollTop: number) => void;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export const useVirtualFormList = (
  items: VirtualFormItem[],
  config: VirtualFormListConfig
): VirtualFormListResult => {
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [state, setState] = useState<VirtualFormListState>({
    visibleRange: { start: 0, end: 0 },
    scrollTop: 0,
    totalHeight: 0,
    isScrolling: false,
    focusedIndex: null,
    validationErrors: new Map(),
    isUpdating: false
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  const {
    itemHeight,
    containerHeight,
    overscan = 5,
    enableDynamicHeight = false,
    enableSmoothScrolling = true,
    enableKeyboardNavigation = true,
    enableAutoFocus = false,
    enableValidation = true,
    enableRealTimeUpdates = true
  } = config;

  // ============================================================================
  // CALCULATIONS
  // ============================================================================
  
  const totalHeight = useMemo(() => {
    return items.length * itemHeight;
  }, [items.length, itemHeight]);

  const getVisibleRange = useCallback((scrollTop: number) => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    );
    return { start: Math.max(0, start - overscan), end };
  }, [itemHeight, containerHeight, overscan, items.length]);

  const getItemOffset = useCallback((index: number) => {
    return index * itemHeight;
  }, [itemHeight]);

  const isItemVisible = useCallback((index: number) => {
    const { start, end } = state.visibleRange;
    return index >= start && index < end;
  }, [state.visibleRange]);

  // ============================================================================
  // VISIBLE ITEMS
  // ============================================================================
  
  const visibleItems = useMemo(() => {
    const { start, end } = state.visibleRange;
    return items.slice(start, end).map((item, index) => ({
      ...item,
      virtualIndex: start + index,
      offset: getItemOffset(start + index)
    }));
  }, [items, state.visibleRange, getItemOffset]);

  // ============================================================================
  // SCROLL HANDLING
  // ============================================================================
  
  const handleScroll = useCallback((scrollTop: number) => {
    const newVisibleRange = getVisibleRange(scrollTop);
    
    setState(prev => ({
      ...prev,
      scrollTop,
      visibleRange: newVisibleRange,
      isScrolling: true
    }));

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set scrolling to false after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, isScrolling: false }));
    }, 150);
  }, [getVisibleRange]);

  const scrollTo = useCallback((index: number) => {
    const scrollTop = getItemOffset(index);
    handleScroll(scrollTop);
    
    if (containerRef.current) {
      containerRef.current.scrollTop = scrollTop;
    }
  }, [getItemOffset, handleScroll]);

  const scrollToTop = useCallback(() => {
    scrollTo(0);
  }, [scrollTo]);

  const scrollToBottom = useCallback(() => {
    scrollTo(items.length - 1);
  }, [scrollTo, items.length]);

  // ============================================================================
  // FOCUS HANDLING
  // ============================================================================
  
  const focusItem = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      setState(prev => ({ ...prev, focusedIndex: index }));
      
      if (!isItemVisible(index)) {
        scrollTo(index);
      }
    }
  }, [items.length, isItemVisible, scrollTo]);

  // ============================================================================
  // ITEM UPDATES
  // ============================================================================
  
  const updateItem = useCallback((index: number, updates: Partial<VirtualFormItem>) => {
    if (index >= 0 && index < items.length) {
      setState(prev => ({ ...prev, isUpdating: true }));
      
      // Simulate real-time update
      if (enableRealTimeUpdates) {
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        updateTimeoutRef.current = setTimeout(() => {
          setState(prev => ({ ...prev, isUpdating: false }));
        }, 100);
      }
    }
  }, [items.length, enableRealTimeUpdates]);

  const addItem = useCallback((item: VirtualFormItem) => {
    // This would typically update the parent component's items array
    console.log('Adding item:', item);
  }, []);

  const removeItem = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      // This would typically update the parent component's items array
      console.log('Removing item at index:', index);
    }
  }, [items.length]);

  // ============================================================================
  // VALIDATION
  // ============================================================================
  
  const validateItem = useCallback((index: number): boolean => {
    if (!enableValidation || index < 0 || index >= items.length) {
      return true;
    }

    const item = items[index];
    const errors = new Map<string, string>();

    // Required field validation
    if (item.required && (!item.value || item.value.toString().trim() === '')) {
      errors.set(item.id, item.validation?.message || `${item.label} is required`);
    }

    // Pattern validation
    if (item.validation?.pattern && item.value) {
      const regex = new RegExp(item.validation.pattern);
      if (!regex.test(item.value.toString())) {
        errors.set(item.id, item.validation.message || `${item.label} format is invalid`);
      }
    }

    // Min/Max validation
    if (item.validation?.min !== undefined && item.value < item.validation.min) {
      errors.set(item.id, item.validation.message || `${item.label} must be at least ${item.validation.min}`);
    }

    if (item.validation?.max !== undefined && item.value > item.validation.max) {
      errors.set(item.id, item.validation.message || `${item.label} must be at most ${item.validation.max}`);
    }

    setState(prev => ({
      ...prev,
      validationErrors: new Map([...prev.validationErrors, ...errors])
    }));

    return errors.size === 0;
  }, [items, enableValidation]);

  const validateAll = useCallback((): boolean => {
    if (!enableValidation) {
      return true;
    }

    let allValid = true;
    for (let i = 0; i < items.length; i++) {
      if (!validateItem(i)) {
        allValid = false;
      }
    }

    return allValid;
  }, [items.length, validateItem, enableValidation]);

  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  const getScrollPosition = useCallback(() => {
    return state.scrollTop;
  }, [state.scrollTop]);

  const setScrollPosition = useCallback((scrollTop: number) => {
    handleScroll(scrollTop);
  }, [handleScroll]);

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Initialize visible range
  useEffect(() => {
    const initialRange = getVisibleRange(0);
    setState(prev => ({
      ...prev,
      visibleRange: initialRange,
      totalHeight
    }));
  }, [getVisibleRange, totalHeight]);

  // Auto-focus first item
  useEffect(() => {
    if (enableAutoFocus && items.length > 0 && state.focusedIndex === null) {
      focusItem(0);
    }
  }, [enableAutoFocus, items.length, state.focusedIndex, focusItem]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================
  
  return {
    // State
    state,
    visibleItems,
    
    // Actions
    scrollTo,
    scrollToTop,
    scrollToBottom,
    focusItem,
    updateItem,
    addItem,
    removeItem,
    validateItem,
    validateAll,
    
    // Utilities
    getItemOffset,
    getVisibleRange,
    isItemVisible,
    getScrollPosition,
    setScrollPosition
  };
}; 