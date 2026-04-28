/**
 * useAsyncValidation — debounced server-side validation for forms.
 *
 * Per 08-enterprise-capabilities.md section 3. The hook wraps a user-
 * supplied async validator that returns an `ErrorSchema`-shaped object
 * keyed by field path. Each call is debounced; the in-flight call is
 * aborted via AbortController when newer formData arrives.
 *
 * Returned `extraErrors` is the latest result, suitable for passing to
 * rjsf's `<Form extraErrors={...}>` prop. Errors block submit when the
 * caller also passes `extraErrorsBlockSubmit`.
 *
 * The hook does not couple to a specific networking primitive; the
 * AsyncValidator function is given a signal it should pass to fetch
 * (or any abort-aware client) so cancellation propagates downstream.
 */

import * as React from 'react';
import type { ErrorSchema } from '@rjsf/utils';

export type AsyncValidator<TData = unknown> = (
  formData: TData,
  ctx: { signal: AbortSignal },
) => Promise<ErrorSchema>;

export interface UseAsyncValidationArgs<TData = unknown> {
  /** The async validator; called whenever `formData` changes (after the debounce). */
  validate?: AsyncValidator<TData>;
  /** Current form data. Identity changes trigger debounced revalidation. */
  formData: TData;
  /** Debounce delay in ms. Default 200. */
  debounceMs?: number;
  /** Skip validation entirely (e.g., when the form is read-only or unmounted). */
  enabled?: boolean;
}

export interface UseAsyncValidationResult {
  /** Latest async validation errors. Empty object until the first run completes. */
  extraErrors: ErrorSchema;
  /** True between debounce-fire and the validator's resolve/reject. */
  running: boolean;
  /** True until at least one validator pass has resolved. */
  pending: boolean;
  /** Imperative trigger; fires the validator without waiting for the debounce. */
  flush: () => void;
}

const EMPTY: ErrorSchema = {};

export function useAsyncValidation<TData = unknown>(
  args: UseAsyncValidationArgs<TData>,
): UseAsyncValidationResult {
  const { validate, formData, debounceMs = 200, enabled = true } = args;

  const [extraErrors, setExtraErrors] = React.useState<ErrorSchema>(EMPTY);
  const [running, setRunning] = React.useState<boolean>(false);
  const [pending, setPending] = React.useState<boolean>(true);

  // Track the in-flight controller and the debounce timer so we can cancel
  // both on cleanup or on a newer change.
  const controllerRef = React.useRef<AbortController | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Capture the latest validate fn so we don't have to put it in the
  // change-detection deps (consumers commonly pass an inline arrow).
  const validateRef = React.useRef<AsyncValidator<TData> | undefined>(validate);
  validateRef.current = validate;

  const fire = React.useCallback(
    async (currentFormData: TData) => {
      const fn = validateRef.current;
      if (!fn) {
        setPending(false);
        return;
      }
      // Cancel any in-flight request before launching a new one.
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setRunning(true);
      try {
        const errors = await fn(currentFormData, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setExtraErrors(errors ?? EMPTY);
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        // Non-abort errors blank the extraErrors so a transient network
        // failure doesn't wedge stale validation state.
        setExtraErrors(EMPTY);
      } finally {
        if (controllerRef.current === controller) {
          setRunning(false);
          setPending(false);
          controllerRef.current = null;
        }
      }
    },
    [],
  );

  const flush = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void fire(formData);
  }, [fire, formData]);

  React.useEffect(() => {
    if (!enabled || !validate) {
      setPending(false);
      return undefined;
    }
    setPending(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void fire(formData);
    }, debounceMs);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, validate, formData, debounceMs, fire]);

  // Final cleanup: abort whatever's still in flight when the consumer unmounts.
  React.useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  return { extraErrors, running, pending, flush };
}
