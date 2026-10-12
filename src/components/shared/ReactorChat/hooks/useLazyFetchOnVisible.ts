import * as React from 'react';

/**
 * Fetch-per-block, only when the block is actually seen.
 *
 * WHY THIS EXISTS
 * ---------------
 * ReactorChat used to ask the server for the comments on **every** assistant message as soon
 * as the conversation rendered: one `getCommentsByContext` call per message, fired in a loop
 * on mount (and re-evaluated on every `messages` change). A long conversation — or a
 * reloaded one — produced a burst of N comment queries before the user had read anything,
 * which is the server overload this hook removes.
 *
 * The comments for a block are only ever *read* when that block is on screen, so the query is
 * the natural candidate for deferring until the block scrolls into view.
 *
 * DESIGN
 * ------
 * - **One observer per list**, not one per block. Each block is observed by the same
 *   `IntersectionObserver`, rooted at the chat scroll container, so a list of any length costs
 *   a single observer rather than N.
 * - **Once per block**: a block is unobserved the moment it first intersects, so scrolling
 *   back and forth never re-requests it. The caller's own "already fetched" set remains the
 *   authority for de-duplication (it also covers open-on-click and event-driven refreshes).
 * - **Prefetch margin**: blocks within `rootMargin` of the viewport are treated as visible, so
 *   a short scroll does not reveal a block whose count badge is still empty.
 * - **Re-scan on demand**: `rescanKey` re-queries the container so blocks added later
 *   (streaming appends, "show earlier", a larger render window) are observed too.
 *
 * FALLBACK
 * --------
 * When `IntersectionObserver` is unavailable the hook cannot know what is visible, so it calls
 * `onUnsupported` and leaves the decision to the caller. ReactorChat uses that to fall back to
 * its previous eager behaviour rather than showing no comment counts at all. This path is for
 * environments without a visibility API (jest/jsdom, very old engines) — never a normal
 * browser, which always has `IntersectionObserver`.
 */

export const isIntersectionObserverSupported = (): boolean =>
  typeof IntersectionObserver !== 'undefined';

export interface UseLazyFetchOnVisibleOptions {
  /** When false the hook is inert (no observer, no callbacks). */
  enabled: boolean;
  /** The scroll container; used as the observer root so visibility is list-relative. */
  rootRef: React.RefObject<HTMLElement | null>;
  /** CSS selector identifying the observable blocks. */
  selector: string;
  /** Attribute on each block holding the id passed to `onVisible`. */
  idAttribute: string;
  /** Called at most once per block, when it first becomes visible. */
  onVisible: (id: string) => void;
  /** Prefetch band around the viewport. Defaults to roughly one screen. */
  rootMargin?: string;
  /** Change this to re-scan for newly added blocks. */
  rescanKey?: unknown;
  /** Called once when the visibility API is unavailable (see FALLBACK above). */
  onUnsupported?: () => void;
}

export const useLazyFetchOnVisible = (options: UseLazyFetchOnVisibleOptions): void => {
  const {
    enabled,
    rootRef,
    selector,
    idAttribute,
    onVisible,
    rootMargin = '200px 0px',
    rescanKey,
    onUnsupported,
  } = options;

  // Held in a ref so a caller passing a fresh callback each render does not tear down and
  // rebuild the observer (which would re-observe everything and could double-fire).
  const onVisibleRef = React.useRef(onVisible);
  onVisibleRef.current = onVisible;

  const onUnsupportedRef = React.useRef(onUnsupported);
  onUnsupportedRef.current = onUnsupported;

  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const observedRef = React.useRef<WeakSet<Element>>(new WeakSet());

  // 1. Create the single observer (and tear it down) — declared before the scan effect so it
  //    has run by the time the scan effect reads `observerRef.current`.
  React.useEffect(() => {
    if (!enabled) return;

    if (!isIntersectionObserverSupported()) {
      onUnsupportedRef.current?.();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target as HTMLElement;
          // Unobserve first: this block is now the caller's responsibility even if the id is
          // momentarily absent, and it must not fire again on the next scroll movement.
          observer.unobserve(element);
          const id = element.getAttribute(idAttribute);
          if (id) onVisibleRef.current(id);
        });
      },
      { root: rootRef.current ?? null, rootMargin }
    );

    observerRef.current = observer;
    observedRef.current = new WeakSet<Element>();

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [enabled, rootRef, idAttribute, rootMargin]);

  // 2. Observe every (not-yet-observed) block currently in the container.
  React.useEffect(() => {
    if (!enabled) return;
    const observer = observerRef.current;
    const container = rootRef.current;
    if (!observer || !container) return;

    const blocks = container.querySelectorAll(selector);
    blocks.forEach((block) => {
      if (observedRef.current.has(block)) return;
      observedRef.current.add(block);
      observer.observe(block);
    });
  }, [enabled, rootRef, selector, rescanKey]);
};

export default useLazyFetchOnVisible;
