import { useState, useCallback } from "react";
import { CalendarSelectionState, SelectionPayload } from "../types";

export function useCalendarSelection(
  onSlotSelect?: (
    start: Date,
    end: Date,
    isAllDay: boolean,
    resourceId?: string,
  ) => void,
): CalendarSelectionState {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<SelectionPayload | null>(null);

  const handleMouseDown = useCallback(
    (time: Date, isAllDay: boolean, resourceId?: string) => {
      setIsSelecting(true);
      setSelection({ start: time, end: time, isAllDay, resourceId });
    },
    [],
  );

  const handleMouseMove = useCallback(
    (time: Date) => {
      if (!isSelecting || !selection) return;
      setSelection((prev) => {
        if (!prev) return prev;
        // Keep start fixed, extend end
        return { ...prev, end: time };
      });
    },
    [isSelecting, selection],
  );

  const handleMouseUp = useCallback(() => {
    if (selection && isSelecting) {
      // Ensure start < end
      const start =
        selection.start <= selection.end ? selection.start : selection.end;
      const end =
        selection.start <= selection.end ? selection.end : selection.start;
      onSlotSelect?.(start, end, selection.isAllDay, selection.resourceId);
    }
    setIsSelecting(false);
  }, [selection, isSelecting, onSlotSelect]);

  const clearSelection = useCallback(() => {
    setIsSelecting(false);
    setSelection(null);
  }, []);

  return {
    isSelecting,
    selection,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    clearSelection,
  };
}
