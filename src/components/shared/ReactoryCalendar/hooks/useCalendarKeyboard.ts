import { useCallback, useEffect } from "react";
import { CalendarViewType } from "../types";

interface UseCalendarKeyboardOptions {
  onToday?: () => void;
  onNavigateForward?: () => void;
  onNavigateBack?: () => void;
  onViewChange?: (view: CalendarViewType) => void;
  onEscape?: () => void;
  onDelete?: () => void;
  enabled?: boolean;
}

const VIEW_KEYS: Record<string, CalendarViewType> = {
  m: "month",
  w: "week",
  d: "day",
  a: "agenda",
  y: "year",
};

export function useCalendarKeyboard({
  onToday,
  onNavigateForward,
  onNavigateBack,
  onViewChange,
  onEscape,
  onDelete,
  enabled = true,
}: UseCalendarKeyboardOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore when typing in an input, textarea, or contenteditable
      const tag = (e.target as HTMLElement).tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "t":
        case "T":
          onToday?.();
          break;
        case "ArrowRight":
          onNavigateForward?.();
          break;
        case "ArrowLeft":
          onNavigateBack?.();
          break;
        case "Escape":
          onEscape?.();
          break;
        case "Delete":
        case "Backspace":
          onDelete?.();
          break;
        default:
          if (VIEW_KEYS[e.key] && onViewChange) {
            onViewChange(VIEW_KEYS[e.key]);
          }
          break;
      }
    },
    [enabled, onToday, onNavigateForward, onNavigateBack, onViewChange, onEscape, onDelete],
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}
