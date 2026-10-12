/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import JsonEditorWidget, { toJsonText } from '../JsonEditorWidget';

const baseProps = (overrides: Partial<React.ComponentProps<typeof JsonEditorWidget>> = {}) => ({
  id: 'root_props',
  name: 'props',
  schema: { type: 'object', title: 'Props' },
  uiSchema: {},
  idSchema: { $id: 'root_props' },
  ...overrides,
});

describe('toJsonText', () => {
  it('pretty-prints objects and arrays', () => {
    expect(toJsonText({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(toJsonText([1, 2])).toBe('[\n  1,\n  2\n]');
  });

  it('returns empty string for nullish and passes strings through', () => {
    expect(toJsonText(undefined)).toBe('');
    expect(toJsonText(null)).toBe('');
    expect(toJsonText('{"a":1}')).toBe('{"a":1}');
  });
});

describe('JsonEditorWidget', () => {
  it('renders the current value as formatted JSON', () => {
    render(<JsonEditorWidget {...baseProps({ value: { theme: 'dark' } })} />);
    const textarea = screen.getByLabelText('Props') as HTMLTextAreaElement;
    expect(textarea.value).toBe('{\n  "theme": "dark"\n}');
  });

  it('emits the parsed object when the text becomes valid JSON', () => {
    const onChange = jest.fn();
    render(<JsonEditorWidget {...baseProps({ value: {}, onChange })} />);
    const textarea = screen.getByLabelText('Props');

    fireEvent.change(textarea, { target: { value: '{"a":1,"b":[2]}' } });

    expect(onChange).toHaveBeenLastCalledWith({ a: 1, b: [2] });
  });

  it('shows an error and does not emit while the JSON is invalid', () => {
    const onChange = jest.fn();
    render(<JsonEditorWidget {...baseProps({ value: {}, onChange })} />);
    const textarea = screen.getByLabelText('Props');

    fireEvent.change(textarea, { target: { value: '{"a":' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/Invalid JSON/i)).toBeInTheDocument();
  });

  it('emits undefined when cleared', () => {
    const onChange = jest.fn();
    render(<JsonEditorWidget {...baseProps({ value: { a: 1 }, onChange })} />);
    fireEvent.change(screen.getByLabelText('Props'), { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('treats a string-typed schema as raw JSON text', () => {
    const onChange = jest.fn();
    render(
      <JsonEditorWidget
        {...baseProps({ schema: { type: 'string', title: 'Raw' }, value: '', onChange })}
      />,
    );
    fireEvent.change(screen.getByLabelText('Raw'), { target: { value: '{"a":1}' } });
    expect(onChange).toHaveBeenLastCalledWith('{"a":1}');
  });

  it('pretty-prints via the Format action', () => {
    const onChange = jest.fn();
    render(<JsonEditorWidget {...baseProps({ value: {}, onChange })} />);
    fireEvent.change(screen.getByLabelText('Props'), { target: { value: '{"a":1}' } });
    onChange.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /format json/i }));

    expect(onChange).toHaveBeenLastCalledWith({ a: 1 });
    expect((screen.getByLabelText('Props') as HTMLTextAreaElement).value).toBe('{\n  "a": 1\n}');
  });

  it('re-seeds the buffer when the incoming value changes externally', () => {
    const { rerender } = render(<JsonEditorWidget {...baseProps({ value: { a: 1 } })} />);
    expect((screen.getByLabelText('Props') as HTMLTextAreaElement).value).toContain('"a": 1');

    rerender(<JsonEditorWidget {...baseProps({ value: { b: 2 } })} />);
    expect((screen.getByLabelText('Props') as HTMLTextAreaElement).value).toContain('"b": 2');
  });
});
