/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { WidgetProps } from '@rjsf/utils';
import { adaptWidget, adaptProps, type ReactoryWidgetLikeProps } from '../../registry/widgetAdapter';
import { createMockReactorySDK } from '../../testing/mockReactorySDK';

// Build a minimal v5 WidgetProps shape for tests.
const baseRjsfProps = (overrides: Partial<WidgetProps> = {}): WidgetProps => ({
  id: 'root_name',
  name: 'name',
  schema: { type: 'string' },
  uiSchema: {},
  value: 'hello',
  required: false,
  disabled: false,
  readonly: false,
  autofocus: false,
  placeholder: undefined,
  options: {},
  rawErrors: [],
  hideError: false,
  formContext: {},
  registry: {} as WidgetProps['registry'],
  onChange: jest.fn(),
  onBlur: jest.fn(),
  onFocus: jest.fn(),
  label: 'Name',
  hideLabel: false,
  multiple: false,
  rawDescription: undefined,
  ...overrides,
} as unknown as WidgetProps);

describe('adaptProps', () => {
  it('maps value to both formData and value (legacy alias)', () => {
    const out = adaptProps(baseRjsfProps({ value: 'hello' }));
    expect(out.formData).toBe('hello');
    expect(out.value).toBe('hello');
  });

  it('constructs idSchema with $id from id', () => {
    const out = adaptProps(baseRjsfProps({ id: 'root_email' }));
    expect(out.idSchema).toEqual({ $id: 'root_email' });
  });

  it('passes through schema, uiSchema, options', () => {
    const schema = { type: 'string' as const, minLength: 3 };
    const uiSchema = { 'ui:placeholder': 'enter' };
    const options = { enumOptions: [{ value: 1, label: 'one' }] };
    const out = adaptProps(baseRjsfProps({ schema, uiSchema, options }));
    expect(out.schema).toBe(schema);
    expect(out.uiSchema).toBe(uiSchema);
    expect(out.options).toBe(options);
  });

  it('forwards onChange / onBlur / onFocus references', () => {
    const onChange = jest.fn();
    const onBlur = jest.fn();
    const onFocus = jest.fn();
    const out = adaptProps(baseRjsfProps({ onChange, onBlur, onFocus }));
    expect(out.onChange).toBe(onChange);
    expect(out.onBlur).toBe(onBlur);
    expect(out.onFocus).toBe(onFocus);
  });

  it('forwards required / disabled / readonly / autofocus flags', () => {
    const out = adaptProps(
      baseRjsfProps({ required: true, disabled: true, readonly: true, autofocus: true }),
    );
    expect(out.required).toBe(true);
    expect(out.disabled).toBe(true);
    expect(out.readonly).toBe(true);
    expect(out.autofocus).toBe(true);
  });

  it('forwards placeholder, rawErrors, hideError', () => {
    const out = adaptProps(
      baseRjsfProps({ placeholder: 'enter…', rawErrors: ['too short'], hideError: false }),
    );
    expect(out.placeholder).toBe('enter…');
    expect(out.rawErrors).toEqual(['too short']);
    expect(out.hideError).toBe(false);
  });

  it('extracts reactory SDK from formContext.reactory', () => {
    const reactory = createMockReactorySDK();
    const out = adaptProps(baseRjsfProps({ formContext: { reactory } }));
    expect(out.reactory).toBe(reactory);
  });

  it('leaves reactory undefined when formContext lacks it', () => {
    const out = adaptProps(baseRjsfProps({ formContext: {} }));
    expect(out.reactory).toBeUndefined();
  });

  it('treats undefined formContext as an empty object', () => {
    // Some rjsf paths may pass undefined; defensive default keeps consumer code simple.
    const out = adaptProps(baseRjsfProps({ formContext: undefined }));
    expect(out.formContext).toEqual({});
  });

  it('preserves the registry reference', () => {
    const registry = { fields: {}, widgets: {} } as unknown as WidgetProps['registry'];
    const out = adaptProps(baseRjsfProps({ registry }));
    expect(out.registry).toBe(registry);
  });
});

/** Minimal dot-path mapper standing in for `reactory.utils.objectMapper.merge`. */
const mergeMap = (
  src: Record<string, unknown>,
  dest: Record<string, unknown>,
  map: Record<string, string>,
): Record<string, unknown> => {
  const out = { ...dest };
  for (const sourceKey of Object.keys(map)) {
    const data = sourceKey
      .split('.')
      .reduce<unknown>((acc, key) => (acc == null ? undefined : (acc as Record<string, unknown>)[key]), src);
    if (data !== undefined) out[map[sourceKey]] = data;
  }
  return out;
};

describe('adaptProps — ui:props / ui:props-map (v5 parity with the legacy fork)', () => {
  it('maps ui:props-map source paths from formContext onto the widget props', () => {
    const formContext = {
      reactory: { utils: { objectMapper: { merge: mergeMap } } },
      props: { applicationId: 'app-123', mode: 'edit' },
    };
    const out = adaptProps(
      baseRjsfProps({
        formContext,
        uiSchema: {
          'ui:props-map': {
            'formContext.props.applicationId': 'applicationId',
            'formContext.props.mode': 'mode',
          },
        },
      }),
    ) as unknown as Record<string, unknown>;
    expect(out.applicationId).toBe('app-123');
    expect(out.mode).toBe('edit');
  });

  it('forwards static ui:props', () => {
    const out = adaptProps(
      baseRjsfProps({ uiSchema: { 'ui:props': { variant: 'outlined' } } }),
    ) as unknown as Record<string, unknown>;
    expect(out.variant).toBe('outlined');
  });

  it('does not throw when a props-map is present but no objectMapper exists', () => {
    const out = adaptProps(
      baseRjsfProps({ formContext: {}, uiSchema: { 'ui:props-map': { 'formContext.x': 'x' } } }),
    ) as unknown as Record<string, unknown>;
    expect(out.x).toBeUndefined();
  });

  it('keeps the standard props when no directives are present', () => {
    const out = adaptProps(baseRjsfProps({ value: 'hello' }));
    expect(out.formData).toBe('hello');
    expect(out.value).toBe('hello');
  });
});

describe('adaptWidget', () => {
  it('renders the wrapped widget with translated props', () => {
    const Widget: React.FC<ReactoryWidgetLikeProps> = (p) => (
      <div>
        <span data-testid="formData">{String(p.formData)}</span>
        <span data-testid="id">{p.id}</span>
        <span data-testid="idSchema">{p.idSchema?.$id}</span>
      </div>
    );
    const Adapted = adaptWidget(Widget, 'Demo');
    render(<Adapted {...baseRjsfProps({ value: 'hi', id: 'root_x' })} />);
    expect(screen.getByTestId('formData')).toHaveTextContent('hi');
    expect(screen.getByTestId('id')).toHaveTextContent('root_x');
    expect(screen.getByTestId('idSchema')).toHaveTextContent('root_x');
  });

  it('forwards onChange so the wrapped widget can update value', () => {
    const onChange = jest.fn();
    const Widget: React.FC<ReactoryWidgetLikeProps> = (p) => (
      <button onClick={() => p.onChange('next')}>change</button>
    );
    const Adapted = adaptWidget(Widget);
    render(<Adapted {...baseRjsfProps({ onChange })} />);
    fireEvent.click(screen.getByText('change'));
    expect(onChange).toHaveBeenCalledWith('next');
  });

  it('exposes reactory SDK to the wrapped widget when available in formContext', () => {
    const reactory = createMockReactorySDK();
    const Widget: React.FC<ReactoryWidgetLikeProps> = (p) => (
      <span data-testid="has-sdk">{p.reactory ? 'yes' : 'no'}</span>
    );
    const Adapted = adaptWidget(Widget);
    render(<Adapted {...baseRjsfProps({ formContext: { reactory } })} />);
    expect(screen.getByTestId('has-sdk')).toHaveTextContent('yes');
  });

  it('memoizes the wrapper to skip re-renders when props are referentially stable', () => {
    let renderCount = 0;
    const Widget: React.FC<ReactoryWidgetLikeProps> = (p) => {
      renderCount++;
      return <span>{String(p.formData)}</span>;
    };
    const Adapted = adaptWidget(Widget);
    const stableProps = baseRjsfProps({ value: 'a' });

    const { rerender } = render(<Adapted {...stableProps} />);
    rerender(<Adapted {...stableProps} />);
    rerender(<Adapted {...stableProps} />);

    // Identity-stable props should pass React.memo's shallow check; one render.
    expect(renderCount).toBe(1);
  });

  it('uses the function name as displayName by default', () => {
    function MyWidget(p: ReactoryWidgetLikeProps) {
      return <span>{String(p.formData)}</span>;
    }
    const Adapted = adaptWidget(MyWidget);
    expect(Adapted.displayName).toBe('Adapted(MyWidget)');
  });

  it('honours an explicit displayName argument', () => {
    const Widget: React.FC<ReactoryWidgetLikeProps> = () => null;
    const Adapted = adaptWidget(Widget, 'Custom');
    expect(Adapted.displayName).toBe('Adapted(Custom)');
  });
});
