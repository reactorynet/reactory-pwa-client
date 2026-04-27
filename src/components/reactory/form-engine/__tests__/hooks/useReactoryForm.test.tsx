/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderHook } from '@testing-library/react-hooks';
import { useReactoryForm, type UseReactoryFormArgs } from '../../hooks/useReactoryForm';
import { createMockReactorySDK } from '../../testing/mockReactorySDK';

const baseArgs = (over: Partial<UseReactoryFormArgs> = {}): UseReactoryFormArgs => {
  const reactory = createMockReactorySDK();
  return {
    schema: {
      type: 'object',
      title: 'Demo',
      properties: { name: { type: 'string', title: 'Name' } },
      required: ['name'],
    },
    formData: { name: '' },
    formContext: { reactory },
    ...over,
  };
};

describe('useReactoryForm — engine selection', () => {
  it('defaults to fork when the feature flag is unset', () => {
    const { result } = renderHook(() => useReactoryForm(baseArgs()));
    expect(result.current.engine).toBe('fork');
    expect(result.current.form).toBeNull();
  });

  it('returns v5 form when the feature flag is true', () => {
    const reactory = createMockReactorySDK({ featureFlags: { 'forms.useV5Engine': true } });
    const { result } = renderHook(() =>
      useReactoryForm(baseArgs({ formContext: { reactory } })),
    );
    expect(result.current.engine).toBe('v5');
    expect(result.current.form).not.toBeNull();
  });

  it('honours an explicit engine arg over the flag', () => {
    const reactory = createMockReactorySDK({ featureFlags: { 'forms.useV5Engine': false } });
    const { result } = renderHook(() =>
      useReactoryForm(baseArgs({ formContext: { reactory }, engine: 'v5' })),
    );
    expect(result.current.engine).toBe('v5');
  });

  it('honours formDef.options.engine over the flag', () => {
    const reactory = createMockReactorySDK({ featureFlags: { 'forms.useV5Engine': false } });
    const { result } = renderHook(() =>
      useReactoryForm(
        baseArgs({
          formContext: {
            reactory,
            formDef: { options: { engine: 'v5' } },
          },
        }),
      ),
    );
    expect(result.current.engine).toBe('v5');
  });

  it('explicit args.engine wins over formDef.options.engine', () => {
    const reactory = createMockReactorySDK();
    const { result } = renderHook(() =>
      useReactoryForm(
        baseArgs({
          engine: 'fork',
          formContext: {
            reactory,
            formDef: { options: { engine: 'v5' } },
          },
        }),
      ),
    );
    expect(result.current.engine).toBe('fork');
  });

  it('logs a debug message when fork engine is chosen', () => {
    const reactory = createMockReactorySDK();
    renderHook(() => useReactoryForm(baseArgs({ formContext: { reactory } })));
    expect(reactory.logCalls.some((l) => l.level === 'debug' && l.message.includes('engine=fork'))).toBe(true);
  });
});

describe('useReactoryForm — registry / validator memoization', () => {
  it('returns a stable registry across renders with same deps', () => {
    const reactory = createMockReactorySDK({ featureFlags: { 'forms.useV5Engine': true } });
    const { result, rerender } = renderHook((props: UseReactoryFormArgs) => useReactoryForm(props), {
      initialProps: baseArgs({ formContext: { reactory } }),
    });
    const r1 = result.current.registry;
    rerender(baseArgs({ formContext: { reactory } }));
    // Rerender with new args reference but same SDK; registry is recreated only when SDK identity changes.
    expect(result.current.registry).toBe(r1);
  });

  it('returns a stable validator across renders with same deps', () => {
    const reactory = createMockReactorySDK({ featureFlags: { 'forms.useV5Engine': true } });
    const { result, rerender } = renderHook((props: UseReactoryFormArgs) => useReactoryForm(props), {
      initialProps: baseArgs({ formContext: { reactory } }),
    });
    const v1 = result.current.validator;
    rerender(baseArgs({ formContext: { reactory } }));
    expect(result.current.validator).toBe(v1);
  });

  it('exposes a registry that resolves FQN names', () => {
    const Marker = () => null;
    const reactory = createMockReactorySDK({
      featureFlags: { 'forms.useV5Engine': true },
      components: { 'plugin.MyField': Marker },
    });
    const { result } = renderHook(() =>
      useReactoryForm(baseArgs({ formContext: { reactory } })),
    );
    expect(result.current.registry.resolveFqn('plugin.MyField', 'field')).toBe(Marker);
  });
});

describe('useReactoryForm — render', () => {
  it('renders the rjsf form element on the v5 engine', () => {
    const reactory = createMockReactorySDK({ featureFlags: { 'forms.useV5Engine': true } });
    const Harness: React.FC = () => {
      const { form } = useReactoryForm(baseArgs({ formContext: { reactory } }));
      return form;
    };
    render(<Harness />);
    // Form has a title from the schema.
    expect(screen.getByText('Demo')).toBeInTheDocument();
    // Required field has an asterisk.
    expect(document.querySelector('.required-indicator')).not.toBeNull();
  });

  it('does not render anything on the fork engine', () => {
    const reactory = createMockReactorySDK();
    const Harness: React.FC = () => {
      const { form } = useReactoryForm(baseArgs({ formContext: { reactory } }));
      return form ?? <span data-testid="empty">no form</span>;
    };
    render(<Harness />);
    expect(screen.getByTestId('empty')).toBeInTheDocument();
  });
});

describe('useReactoryForm — submit()', () => {
  it('returns false on the fork engine', () => {
    const { result } = renderHook(() => useReactoryForm(baseArgs()));
    expect(result.current.submit()).toBe(false);
  });
});

describe('useReactoryForm — telemetry wiring', () => {
  it('emits form.mount when v5 form mounts', () => {
    const reactory = createMockReactorySDK({ featureFlags: { 'forms.useV5Engine': true } });
    const Harness: React.FC = () => {
      const { form } = useReactoryForm(baseArgs({ formContext: { reactory } }));
      return form;
    };
    render(<Harness />);
    expect(reactory.telemetryCalls.some((e) => e.name === 'form.mount')).toBe(true);
  });

  it('emits form.unmount when the form is unmounted', () => {
    const reactory = createMockReactorySDK({ featureFlags: { 'forms.useV5Engine': true } });
    const Harness: React.FC = () => {
      const { form } = useReactoryForm(baseArgs({ formContext: { reactory } }));
      return form;
    };
    const { unmount } = render(<Harness />);
    unmount();
    expect(reactory.telemetryCalls.some((e) => e.name === 'form.unmount')).toBe(true);
  });

  it('emits no telemetry when disableTelemetry is true', () => {
    const reactory = createMockReactorySDK({ featureFlags: { 'forms.useV5Engine': true } });
    const Harness: React.FC = () => {
      const { form } = useReactoryForm(
        baseArgs({ formContext: { reactory }, disableTelemetry: true }),
      );
      return form;
    };
    render(<Harness />);
    expect(reactory.telemetryCalls).toEqual([]);
  });

  it('every emitted event carries a stable formInstanceId', () => {
    const reactory = createMockReactorySDK({ featureFlags: { 'forms.useV5Engine': true } });
    const Harness: React.FC = () => {
      const { form } = useReactoryForm(baseArgs({ formContext: { reactory } }));
      return form;
    };
    const { unmount } = render(<Harness />);
    unmount();
    const ids = reactory.telemetryCalls.map(
      (e) => (e.payload as { formInstanceId?: string } | undefined)?.formInstanceId,
    );
    const distinct = new Set(ids.filter(Boolean));
    expect(distinct.size).toBe(1);
    const onlyId = [...distinct][0];
    expect(onlyId).toMatch(/^fi-/);
  });

  it('registry FQN miss surfaces as a form.fqn.miss telemetry event', () => {
    const reactory = createMockReactorySDK({ featureFlags: { 'forms.useV5Engine': true } });
    const { result } = renderHook(() => useReactoryForm(baseArgs({ formContext: { reactory } })));
    // Probe a missing FQN via the exposed registry; should emit through telemetry.
    expect(result.current.registry.resolveFqn('plugin.MissingForReal', 'widget')).toBeNull();
    const miss = reactory.telemetryCalls.find((e) => e.name === 'form.fqn.miss');
    expect(miss?.payload).toMatchObject({ kind: 'widget', name: 'plugin.MissingForReal' });
  });
});
