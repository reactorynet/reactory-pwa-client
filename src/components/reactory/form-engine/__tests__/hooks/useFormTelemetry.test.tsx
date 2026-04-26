/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { useFormTelemetry, digestValue } from '../../hooks/useFormTelemetry';
import { createMockReactorySDK } from '../../testing/mockReactorySDK';

describe('digestValue', () => {
  it('produces a stable 8-char hex digest', () => {
    const d = digestValue('hello');
    expect(d).toMatch(/^[0-9a-f]{8}$/);
  });

  it('returns the same digest for the same input', () => {
    expect(digestValue('hello')).toBe(digestValue('hello'));
  });

  it('returns different digests for different inputs', () => {
    expect(digestValue('hello')).not.toBe(digestValue('world'));
  });

  it('handles object values via JSON.stringify', () => {
    expect(digestValue({ a: 1, b: 'two' })).toMatch(/^[0-9a-f]{8}$/);
  });

  it('produces a deterministic digest for null', () => {
    expect(digestValue(null)).toBe(digestValue(null));
  });

  it('falls back to "[unserializable]" for circular structures', () => {
    const c: { self?: unknown } = {};
    c.self = c;
    // Should not throw; uses the fallback string for hashing.
    expect(digestValue(c)).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('useFormTelemetry', () => {
  it('emits form.mount on first render', () => {
    const reactory = createMockReactorySDK();
    const Harness: React.FC = () => {
      useFormTelemetry({ reactory, formInstanceId: 'fi-1', formId: 'core.X', signature: 'sig' });
      return null;
    };
    render(<Harness />);
    const mount = reactory.telemetryCalls.find((e) => e.name === 'form.mount');
    expect(mount).toBeDefined();
    expect(mount?.payload).toMatchObject({
      formInstanceId: 'fi-1',
      formId: 'core.X',
      signature: 'sig',
    });
  });

  it('emits form.unmount on cleanup with durationMs', () => {
    const reactory = createMockReactorySDK();
    const Harness: React.FC = () => {
      useFormTelemetry({ reactory, formInstanceId: 'fi-1' });
      return null;
    };
    const { unmount } = render(<Harness />);
    unmount();
    const u = reactory.telemetryCalls.find((e) => e.name === 'form.unmount');
    expect(u).toBeDefined();
    expect((u?.payload as { durationMs?: number })?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('emits form.change with hashed valueDigest', () => {
    const reactory = createMockReactorySDK();
    const { result } = renderHook(() =>
      useFormTelemetry({ reactory, formInstanceId: 'fi-1' }),
    );
    act(() => {
      result.current.emitChange('root_name', 'hello');
    });
    const change = reactory.telemetryCalls.find((e) => e.name === 'form.change');
    expect(change?.payload).toMatchObject({
      formInstanceId: 'fi-1',
      path: 'root_name',
    });
    expect((change?.payload as { valueDigest?: string }).valueDigest).toMatch(/^[0-9a-f]{8}$/);
    // Privacy: the raw value 'hello' must not be in the payload
    expect(JSON.stringify(change?.payload)).not.toContain('hello');
  });

  it('emits form.validate with errorCount + durationMs + trigger', () => {
    const reactory = createMockReactorySDK();
    const { result } = renderHook(() =>
      useFormTelemetry({ reactory, formInstanceId: 'fi-1' }),
    );
    act(() => {
      result.current.emitValidate(3, 42, 'blur');
    });
    const v = reactory.telemetryCalls.find((e) => e.name === 'form.validate');
    expect(v?.payload).toMatchObject({ errorCount: 3, durationMs: 42, trigger: 'blur' });
  });

  it('emits form.submit.* lifecycle', () => {
    const reactory = createMockReactorySDK();
    const { result } = renderHook(() =>
      useFormTelemetry({ reactory, formInstanceId: 'fi-1' }),
    );
    act(() => {
      result.current.emitSubmitAttempt();
      result.current.emitSubmitSuccess(120);
    });
    expect(reactory.telemetryCalls.some((e) => e.name === 'form.submit.attempt')).toBe(true);
    const succ = reactory.telemetryCalls.find((e) => e.name === 'form.submit.success');
    expect((succ?.payload as { durationMs?: number })?.durationMs).toBe(120);
  });

  it('emits form.submit.error with errorCount + errorCodes', () => {
    const reactory = createMockReactorySDK();
    const { result } = renderHook(() =>
      useFormTelemetry({ reactory, formInstanceId: 'fi-1' }),
    );
    act(() => {
      result.current.emitSubmitError(2, ['required', 'minLength']);
    });
    const err = reactory.telemetryCalls.find((e) => e.name === 'form.submit.error');
    expect(err?.payload).toMatchObject({ errorCount: 2, errorCodes: ['required', 'minLength'] });
  });

  it('emits form.fqn.miss with kind + name', () => {
    const reactory = createMockReactorySDK();
    const { result } = renderHook(() =>
      useFormTelemetry({ reactory, formInstanceId: 'fi-1' }),
    );
    act(() => {
      result.current.emitFqnMiss('widget', 'plugin.MissingWidget');
    });
    const m = reactory.telemetryCalls.find((e) => e.name === 'form.fqn.miss');
    expect(m?.payload).toMatchObject({ kind: 'widget', name: 'plugin.MissingWidget' });
  });

  it('emits nothing when disabled=true', () => {
    const reactory = createMockReactorySDK();
    const Harness: React.FC = () => {
      useFormTelemetry({ reactory, formInstanceId: 'fi-1', disabled: true });
      return null;
    };
    render(<Harness />);
    expect(reactory.telemetryCalls).toEqual([]);
  });

  it('is a no-op when reactory.telemetry is absent', () => {
    const sdkWithoutTelemetry = { /* no telemetry */ };
    const Harness: React.FC = () => {
      useFormTelemetry({ reactory: sdkWithoutTelemetry, formInstanceId: 'fi-1' });
      return null;
    };
    expect(() => render(<Harness />)).not.toThrow();
  });

  it('includes formInstanceId, signature, formId in every payload', () => {
    const reactory = createMockReactorySDK();
    const { result } = renderHook(() =>
      useFormTelemetry({
        reactory,
        formInstanceId: 'fi-1',
        signature: 'core.MyForm@1.0:fi-1',
        formId: 'core.MyForm@1.0',
      }),
    );
    act(() => {
      result.current.emit('form.custom', { extra: 'data' });
    });
    const e = reactory.telemetryCalls.find((c) => c.name === 'form.custom');
    expect(e?.payload).toMatchObject({
      formInstanceId: 'fi-1',
      signature: 'core.MyForm@1.0:fi-1',
      formId: 'core.MyForm@1.0',
      extra: 'data',
    });
  });
});
