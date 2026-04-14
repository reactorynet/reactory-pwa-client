import { useState, useCallback, useRef, useEffect } from "react";
import {
  CalendarEvent,
  CalendarDragDropState,
  DragPayload,
  DragType,
} from "../types";
import { DRAG_THRESHOLD } from "../constants";

export function useCalendarDragDrop(
  onEventDrop?: (
    event: CalendarEvent,
    newStart: Date,
    newEnd: Date,
    resourceId?: string,
  ) => void,
  onEventResize?: (
    event: CalendarEvent,
    newStart: Date,
    newEnd: Date,
  ) => void,
): CalendarDragDropState {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    date: Date;
    resourceId?: string;
  } | null>(null);

  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const thresholdMetRef = useRef(false);

  const handleDragStart = useCallback(
    (event: CalendarEvent, type: DragType, e: React.PointerEvent) => {
      startPosRef.current = { x: e.clientX, y: e.clientY };
      thresholdMetRef.current = false;
      setDragPayload({
        event,
        originalStart: event.start,
        originalEnd: event.end,
        type,
      });
    },
    [],
  );

  const handleDragMove = useCallback(
    (e: PointerEvent) => {
      if (!dragPayload || !startPosRef.current) return;

      if (!thresholdMetRef.current) {
        const dx = e.clientX - startPosRef.current.x;
        const dy = e.clientY - startPosRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
        thresholdMetRef.current = true;
        setIsDragging(true);
      }

      // Consumers should use dragPayload + pointer coords to compute drop target
    },
    [dragPayload],
  );

  const handleDragEnd = useCallback(
    (e: PointerEvent) => {
      if (dragPayload && isDragging && dropTarget) {
        const duration =
          dragPayload.originalEnd.getTime() -
          dragPayload.originalStart.getTime();

        if (dragPayload.type === "move") {
          const newEnd = new Date(dropTarget.date.getTime() + duration);
          onEventDrop?.(
            dragPayload.event,
            dropTarget.date,
            newEnd,
            dropTarget.resourceId,
          );
        } else if (dragPayload.type === "resize-end") {
          onEventResize?.(
            dragPayload.event,
            dragPayload.originalStart,
            dropTarget.date,
          );
        } else if (dragPayload.type === "resize-start") {
          onEventResize?.(
            dragPayload.event,
            dropTarget.date,
            dragPayload.originalEnd,
          );
        }
      }

      setIsDragging(false);
      setDragPayload(null);
      setDropTarget(null);
      startPosRef.current = null;
      thresholdMetRef.current = false;
    },
    [dragPayload, isDragging, dropTarget, onEventDrop, onEventResize],
  );

  // Attach global pointer listeners while a drag payload exists
  useEffect(() => {
    if (!dragPayload) return;
    window.addEventListener("pointermove", handleDragMove);
    window.addEventListener("pointerup", handleDragEnd);
    return () => {
      window.removeEventListener("pointermove", handleDragMove);
      window.removeEventListener("pointerup", handleDragEnd);
    };
  }, [dragPayload, handleDragMove, handleDragEnd]);

  return {
    isDragging,
    dragPayload,
    dropTarget,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}
