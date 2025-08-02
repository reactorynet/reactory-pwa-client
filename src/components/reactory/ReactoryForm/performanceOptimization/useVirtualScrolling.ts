/**
 * Virtual Scrolling Hook for ReactoryForm
 * Phase 1.4: Performance Optimization
 * 
 * This hook provides virtual scrolling capabilities for efficiently
 * rendering large datasets by only rendering visible items.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface VirtualScrollingConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  enableSmoothScrolling?: boolean;
  enableDynamicHeight?: boolean;
  enableInfiniteScroll?: boolean;
  threshold?: number;
}

export interface VirtualScrollingItem<T = any> {
  id: string | number;
  data: T;
  height?: number;
  index: number;
}

export interface VirtualScrollingState<T = any> {
  items: VirtualScrollingItem<T>[];
  visibleItems: VirtualScrollingItem<T>[];
  scrollTop: number;
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  isScrolling: boolean;
  scrollDirection: 'up' | 'down' | null;
}

export interface VirtualScrollingResult<T = any> {
  state: VirtualScrollingState<T>;
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  getItemOffset: (index: number) => number;
  getVisibleRange: () => { start: number; end: number };
  updateItemHeight: (index: number, height: number) => void;
  refresh: () => void;
  isItemVisible: (index: number) => boolean;
  getScrollProgress: () => number;
}

// ============================================================================
// VIRTUAL SCROLLING HOOK
// ============================================================================

export const useVirtualScrolling = <T = any>(
  items: T[],
  config: VirtualScrollingConfig
): VirtualScrollingResult<T> => {
  const {
    itemHeight,
    containerHeight,
    overscan = 5,
    enableSmoothScrolling = true,
    enableDynamicHeight = false,
    enableInfiniteScroll = false,
    threshold = 100
  } = config;

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const itemHeightsRef = useRef<Map<number, number>>(new Map());
  const lastScrollTopRef = useRef<number>(0);

  // State
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  /**
   * Calculate total height of all items
   */
  const totalHeight = useMemo(() => {
    if (enableDynamicHeight) {
      return items.reduce((total, _, index) => {
        const height = itemHeightsRef.current.get(index) || itemHeight;
        return total + height;
      }, 0);
    }
    return items.length * itemHeight;
  }, [items, itemHeight, enableDynamicHeight]);

  /**
   * Calculate visible range based on scroll position
   */
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { start: startIndex, end: endIndex };
  }, [scrollTop, containerHeight, itemHeight, overscan, items.length]);

  /**
   * Get visible items
   */
  const visibleItems = useMemo(() => {
    const { start, end } = visibleRange;
    return items.slice(start, end + 1).map((item, index) => ({
      id: typeof item === 'object' && item !== null ? (item as any).id || start + index : start + index,
      data: item,
      height: enableDynamicHeight ? itemHeightsRef.current.get(start + index) || itemHeight : itemHeight,
      index: start + index
    }));
  }, [items, visibleRange, itemHeight, enableDynamicHeight]);

  /**
   * Calculate offset for a specific item
   */
  const getItemOffset = useCallback((index: number): number => {
    if (enableDynamicHeight) {
      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += itemHeightsRef.current.get(i) || itemHeight;
      }
      return offset;
    }
    return index * itemHeight;
  }, [itemHeight, enableDynamicHeight]);

  /**
   * Check if an item is visible
   */
  const isItemVisible = useCallback((index: number): boolean => {
    const { start, end } = visibleRange;
    return index >= start && index <= end;
  }, [visibleRange]);

  /**
   * Get scroll progress (0-1)
   */
  const getScrollProgress = useCallback((): number => {
    if (totalHeight <= containerHeight) return 0;
    return scrollTop / (totalHeight - containerHeight);
  }, [scrollTop, totalHeight, containerHeight]);

  // ============================================================================
  // SCROLL HANDLERS
  // ============================================================================

  /**
   * Handle scroll events
   */
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    const newScrollTop = target.scrollTop;
    
    // Determine scroll direction
    const direction = newScrollTop > lastScrollTopRef.current ? 'down' : 'up';
    setScrollDirection(direction);
    lastScrollTopRef.current = newScrollTop;

    // Update scroll position
    setScrollTop(newScrollTop);

    // Handle infinite scroll
    if (enableInfiniteScroll && direction === 'down') {
      const progress = getScrollProgress();
      if (progress > 0.8) {
        // Trigger load more when 80% scrolled
        // This would typically call a callback to load more data
        console.log('Load more items triggered');
      }
    }

    // Set scrolling state
    setIsScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Clear scrolling state after threshold
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      setScrollDirection(null);
    }, threshold);
  }, [enableInfiniteScroll, getScrollProgress, threshold]);

  /**
   * Scroll to specific index
   */
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'auto') => {
    if (!containerRef.current) return;

    const offset = getItemOffset(index);
    containerRef.current.scrollTo({
      top: offset,
      behavior: enableSmoothScrolling ? behavior : 'auto'
    });
  }, [getItemOffset, enableSmoothScrolling]);

  /**
   * Scroll to top
   */
  const scrollToTop = useCallback(() => {
    scrollToIndex(0, 'smooth');
  }, [scrollToIndex]);

  /**
   * Scroll to bottom
   */
  const scrollToBottom = useCallback(() => {
    scrollToIndex(items.length - 1, 'smooth');
  }, [scrollToIndex, items.length]);

  /**
   * Get current visible range
   */
  const getVisibleRange = useCallback(() => {
    return visibleRange;
  }, [visibleRange]);

  /**
   * Update item height for dynamic height support
   */
  const updateItemHeight = useCallback((index: number, height: number) => {
    if (!enableDynamicHeight) return;

    const currentHeight = itemHeightsRef.current.get(index);
    if (currentHeight !== height) {
      itemHeightsRef.current.set(index, height);
      // Force re-render by updating scroll position slightly
      setScrollTop(prev => prev + 0.1);
    }
  }, [enableDynamicHeight]);

  /**
   * Refresh virtual scrolling
   */
  const refresh = useCallback(() => {
    // Clear item heights cache
    itemHeightsRef.current.clear();
    
    // Reset scroll position
    setScrollTop(0);
    setScrollDirection(null);
    setIsScrolling(false);
    
    // Clear scroll timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Add scroll event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // RETURN STATE
  // ============================================================================

  const state: VirtualScrollingState<T> = {
    items: items.map((item, index) => ({
      id: typeof item === 'object' && item !== null ? (item as any).id || index : index,
      data: item,
      height: enableDynamicHeight ? itemHeightsRef.current.get(index) || itemHeight : itemHeight,
      index
    })),
    visibleItems,
    scrollTop,
    totalHeight,
    startIndex: visibleRange.start,
    endIndex: visibleRange.end,
    isScrolling,
    scrollDirection
  };

  return {
    state,
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
    getItemOffset,
    getVisibleRange,
    updateItemHeight,
    refresh,
    isItemVisible,
    getScrollProgress
  };
}; 