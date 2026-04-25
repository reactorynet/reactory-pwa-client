import React from 'react';

export interface UseSaveShortcutOptions {
  enabled?: boolean;
  onSave: () => void;
  onReload?: () => void;
}

/**
 * Capture `Cmd/Ctrl + S` inside the given container (and `Cmd/Ctrl + Shift + R`
 * if `onReload` is provided). Scoped — global focus doesn't trigger it.
 */
export default function useSaveShortcut(
  containerRef: React.RefObject<HTMLElement>,
  { enabled = true, onSave, onReload }: UseSaveShortcutOptions,
): void {
  const onSaveRef = React.useRef(onSave);
  const onReloadRef = React.useRef(onReload);
  onSaveRef.current = onSave;
  onReloadRef.current = onReload;

  React.useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const handler = (ev: KeyboardEvent) => {
      const mod = ev.metaKey || ev.ctrlKey;
      if (!mod) return;
      const key = ev.key.toLowerCase();
      if (key === 's' && !ev.shiftKey && !ev.altKey) {
        ev.preventDefault();
        onSaveRef.current();
        return;
      }
      if (key === 'r' && ev.shiftKey && onReloadRef.current) {
        ev.preventDefault();
        onReloadRef.current();
      }
    };

    el.addEventListener('keydown', handler);
    return () => { el.removeEventListener('keydown', handler); };
  }, [enabled, containerRef]);
}
