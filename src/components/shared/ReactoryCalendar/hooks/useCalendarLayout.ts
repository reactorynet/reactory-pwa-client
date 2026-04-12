import { useState, useCallback, useEffect, useRef } from "react";

interface CalendarLayoutState {
  containerWidth: number;
  containerHeight: number;
  isCompact: boolean;
  isMobile: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

const COMPACT_BREAKPOINT = 768;
const MOBILE_BREAKPOINT = 480;

export function useCalendarLayout(
  sidebarOpen = true,
): CalendarLayoutState {
  const containerRef = useRef<HTMLDivElement>(null!);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(!sidebarOpen);

  const isCompact = containerWidth > 0 && containerWidth < COMPACT_BREAKPOINT;
  const isMobile = containerWidth > 0 && containerWidth < MOBILE_BREAKPOINT;

  const toggleSidebar = useCallback(
    () => setSidebarCollapsed((prev) => !prev),
    [],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerWidth(width);
        setContainerHeight(height);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile && !sidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  return {
    containerWidth,
    containerHeight,
    isCompact,
    isMobile,
    sidebarCollapsed,
    toggleSidebar,
    containerRef,
  };
}
