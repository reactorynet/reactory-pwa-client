/**
 * useFormTelemetry — emits structured lifecycle events for a form mount.
 *
 * Per docs/forms-engine/03-target-architecture.md#lifecycle-events the engine
 * emits one event per significant transition. This hook centralizes those
 * emissions so individual call sites in `useReactoryForm` stay readable.
 *
 * Events:
 *   form.mount           — first render with `formInstanceId`
 *   form.unmount         — cleanup with durationMs since mount
 *   form.change          — onChange callback; payload includes hashed valueDigest
 *   form.validate        — each validator pass, with errorCount + durationMs
 *   form.submit.attempt  — onSubmit enter
 *   form.submit.success  — submit promise resolved
 *   form.submit.error    — submit promise rejected
 *   form.fqn.miss        — registry reported a FQN miss
 *
 * Privacy: payloads do not carry raw values. Where a digest is included it is
 * `sha256(JSON.stringify(value)).slice(0, 8)`. Field paths are kept (they
 * reveal schema shape but not user input).
 */

import * as React from 'react';

export interface TelemetrySdk {
  telemetry?: {
    emit: (name: string, payload?: unknown) => void;
  };
}

export interface FormTelemetry {
  emit: (name: string, payload?: Record<string, unknown>) => void;
  emitChange: (path: string | undefined, value: unknown) => void;
  emitValidate: (errorCount: number, durationMs: number, trigger: 'change' | 'blur' | 'submit') => void;
  emitSubmitAttempt: () => void;
  emitSubmitSuccess: (durationMs: number) => void;
  emitSubmitError: (errorCount: number, errorCodes: string[]) => void;
  emitFqnMiss: (kind: 'field' | 'widget', name: string) => void;
}

export interface UseFormTelemetryArgs {
  reactory: TelemetrySdk;
  formInstanceId: string;
  signature?: string;
  formId?: string;
  /**
   * Disable emission entirely. Default false. Useful for tests or for forms
   * marked with a `formContext.telemetry: false` opt-out.
   */
  disabled?: boolean;
}

/**
 * Hash a value for privacy-safe digesting. Uses a tiny deterministic FNV-1a
 * variant — not cryptographic, but stable and dependency-free. Sufficient
 * for telemetry deduplication; sensitive data should be excluded by widgets
 * before reaching this layer (via `ui:options.sensitive: true`).
 */
export function digestValue(value: unknown): string {
  let s: string;
  try {
    s = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  } catch {
    s = '[unserializable]';
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function useFormTelemetry(args: UseFormTelemetryArgs): FormTelemetry {
  const { reactory, formInstanceId, signature, formId, disabled } = args;
  const mountedAtRef = React.useRef<number>(Date.now());

  const baseTags = React.useMemo(
    () => ({ formInstanceId, signature, formId }),
    [formInstanceId, signature, formId],
  );

  const emit = React.useCallback(
    (name: string, payload?: Record<string, unknown>) => {
      if (disabled) return;
      reactory.telemetry?.emit(name, { ...baseTags, ...(payload ?? {}) });
    },
    [reactory, baseTags, disabled],
  );

  // mount/unmount lifecycle
  React.useEffect(() => {
    mountedAtRef.current = Date.now();
    emit('form.mount');
    return () => {
      emit('form.unmount', { durationMs: Date.now() - mountedAtRef.current });
    };
    // baseTags identity is stable through useMemo; emit is stable through useCallback.
    // We intentionally only run on mount/unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return React.useMemo<FormTelemetry>(
    () => ({
      emit,
      emitChange: (path, value) =>
        emit('form.change', {
          path: path ?? '$',
          valueDigest: digestValue(value),
        }),
      emitValidate: (errorCount, durationMs, trigger) =>
        emit('form.validate', { errorCount, durationMs, trigger }),
      emitSubmitAttempt: () => emit('form.submit.attempt'),
      emitSubmitSuccess: (durationMs) => emit('form.submit.success', { durationMs }),
      emitSubmitError: (errorCount, errorCodes) =>
        emit('form.submit.error', { errorCount, errorCodes }),
      emitFqnMiss: (kind, name) => emit('form.fqn.miss', { kind, name }),
    }),
    [emit],
  );
}
