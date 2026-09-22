/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { BaseInputTemplateProps } from '@rjsf/utils';

import {
  ReactoryBaseInputTemplate,
  resolveInputVariant,
} from '../../templates/BaseInputTemplate';

const baseProps = (overrides: Record<string, unknown> = {}): BaseInputTemplateProps =>
  ({
    id: 'root_name',
    name: 'root_name',
    value: 'Ada',
    schema: { type: 'string' },
    uiSchema: {},
    options: {},
    registry: {} as BaseInputTemplateProps['registry'],
    onChange: jest.fn(),
    onBlur: jest.fn(),
    onFocus: jest.fn(),
    ...overrides,
  }) as unknown as BaseInputTemplateProps;

describe('resolveInputVariant', () => {
  it('prefers ui:options.variant', () => {
    expect(resolveInputVariant({ variant: 'filled' }, 'standard')).toBe('filled');
  });

  it('falls back to the theme variant', () => {
    expect(resolveInputVariant({}, 'standard')).toBe('standard');
  });

  it('ignores invalid values and defaults to outlined', () => {
    expect(resolveInputVariant({ variant: 'nonsense' }, 'also-nonsense')).toBe('outlined');
    expect(resolveInputVariant(undefined, undefined)).toBe('outlined');
  });
});

describe('ReactoryBaseInputTemplate', () => {
  it('renders a text input carrying the field id and value', () => {
    render(<ReactoryBaseInputTemplate {...baseProps()} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'root_name');
    expect(input).toHaveValue('Ada');
  });

  it('propagates changes through onChange', () => {
    const onChange = jest.fn();
    render(<ReactoryBaseInputTemplate {...baseProps({ onChange })} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Grace' } });

    expect(onChange).toHaveBeenCalledWith('Grace');
  });

  it('honours options.emptyValue when the field is cleared', () => {
    const onChange = jest.fn();
    render(
      <ReactoryBaseInputTemplate
        {...baseProps({ onChange, value: 5, options: { emptyValue: null } })}
      />,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });

    // rjsf's emptyValue contract: clearing yields the declared empty value
    // rather than the string ''.
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('clears to an empty string when no emptyValue is declared', () => {
    const onChange = jest.fn();
    render(<ReactoryBaseInputTemplate {...baseProps({ onChange, value: 'Ada' })} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('prefers onChangeOverride when supplied (rjsf widget contract)', () => {
    const onChange = jest.fn();
    const onChangeOverride = jest.fn();
    render(
      <ReactoryBaseInputTemplate {...baseProps({ onChange, onChangeOverride })} />,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } });

    expect(onChangeOverride).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders a multiline control when rows are configured', () => {
    render(
      <ReactoryBaseInputTemplate
        {...baseProps({ uiSchema: { 'ui:options': { rows: 6 } }, value: 'SELECT 1' })}
      />,
    );

    const input = screen.getByRole('textbox');
    expect(input.tagName.toLowerCase()).toBe('textarea');
    expect(input).toHaveAttribute('rows', '6');
  });

  it('marks the input invalid when rjsf reports raw errors', () => {
    render(
      <ReactoryBaseInputTemplate
        {...baseProps({ rawErrors: ['must not be empty'], uiSchema: {} })}
      />,
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    // Points assistive tech at the error region FieldTemplate renders.
    expect(input).toHaveAttribute('aria-describedby', 'root_name-error');
  });

  it('disables the input when readonly is set', () => {
    render(<ReactoryBaseInputTemplate {...baseProps({ readonly: true })} />);

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('forwards blur and focus with the field id', () => {
    const onBlur = jest.fn();
    const onFocus = jest.fn();
    render(<ReactoryBaseInputTemplate {...baseProps({ onBlur, onFocus })} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.blur(input, { target: { value: 'Ada' } });

    expect(onFocus).toHaveBeenCalledWith('root_name', 'Ada');
    expect(onBlur).toHaveBeenCalledWith('root_name', 'Ada');
  });

  it('applies aria-required for required fields', () => {
    render(<ReactoryBaseInputTemplate {...baseProps({ required: true })} />);

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true');
  });
});
