import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * How long the editor waits after the last keystroke before writing a local
 * recovery copy. Long enough not to thrash localStorage, short enough that a
 * crashed tab loses at most a sentence.
 */
const AUTOSAVE_DEBOUNCE_MS = 600;

/**
 * Recovery copies older than this are ignored — an author returning a week
 * later does not want a surprise draft resurrected over current content.
 */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredDraft<T> {
  value: T;
  savedAt: number;
}

/**
 * Keeps a debounced local recovery copy of in-progress edits.
 *
 * This is deliberately separate from server persistence: it exists only so an
 * accidental navigation or a browser crash does not lose work. It is cleared
 * as soon as the content is saved for real.
 */
export const useContentDraft = <T,>(key: string, current: T, enabled: boolean = true) => {
  const [recovered, setRecovered] = useState<T | null>(null);
  const storageKey = `reactory.content.draft.${key}`;

  // The first render after mounting (or after switching records) must not
  // write, or it would immediately overwrite a recoverable draft with the
  // pristine server value.
  const skipNextWrite = useRef(true);

  useEffect(() => {
    skipNextWrite.current = true;
    if (!enabled) {
      setRecovered(null);
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setRecovered(null);
        return;
      }

      const parsed: StoredDraft<T> = JSON.parse(raw);
      if (!parsed || typeof parsed.savedAt !== 'number') {
        localStorage.removeItem(storageKey);
        setRecovered(null);
        return;
      }

      if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
        localStorage.removeItem(storageKey);
        setRecovered(null);
        return;
      }

      setRecovered(parsed.value);
    } catch (e) {
      // A corrupt or unavailable store must never block editing.
      setRecovered(null);
    }
  }, [storageKey, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return undefined;
    }

    const timer = setTimeout(() => {
      try {
        const payload: StoredDraft<T> = { value: current, savedAt: Date.now() };
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch (e) {
        // Quota exceeded or storage disabled; recovery is best effort.
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [current, storageKey, enabled]);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      // Nothing actionable.
    }
    setRecovered(null);
  }, [storageKey]);

  const dismiss = useCallback(() => setRecovered(null), []);

  return { recovered, clear, dismiss };
};

export default useContentDraft;
