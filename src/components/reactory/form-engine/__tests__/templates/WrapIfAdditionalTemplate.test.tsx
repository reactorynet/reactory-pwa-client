/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { WrapIfAdditionalTemplateProps } from '@rjsf/utils';
import { ADDITIONAL_PROPERTY_FLAG } from '@rjsf/utils';
import { ReactoryWrapIfAdditionalTemplate } from '../../templates/WrapIfAdditionalTemplate';

const baseRegistry = (): WrapIfAdditionalTemplateProps['registry'] =>
  ({} as unknown as WrapIfAdditionalTemplateProps['registry']);

const baseProps = (
  overrides: Partial<WrapIfAdditionalTemplateProps> = {},
): WrapIfAdditionalTemplateProps => ({
  id: 'root_mykey',
  label: 'mykey',
  disabled: false,
  readonly: false,
  required: false,
  classNames: '',
  schema: { type: 'string', [ADDITIONAL_PROPERTY_FLAG]: true } as WrapIfAdditionalTemplateProps['schema'],
  uiSchema: {},
  onKeyChange: jest.fn(() => jest.fn()),
  onDropPropertyClick: jest.fn(() => jest.fn()),
  registry: baseRegistry(),
  children: <input data-testid="value-input" />,
  ...overrides,
});

describe('ReactoryWrapIfAdditionalTemplate', () => {
  it('renders the key input and value child when ADDITIONAL_PROPERTY_FLAG is present', () => {
    render(<ReactoryWrapIfAdditionalTemplate {...baseProps()} />);
    expect(screen.getByLabelText('Property key')).toBeInTheDocument();
    expect(screen.getByTestId('value-input')).toBeInTheDocument();
  });

  it('wraps in div with className wrap-if-additional and data-key', () => {
    const { container } = render(<ReactoryWrapIfAdditionalTemplate {...baseProps()} />);
    const wrapper = container.querySelector('.wrap-if-additional');
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveAttribute('data-key', 'mykey');
  });

  it('sets the key input defaultValue to label', () => {
    render(<ReactoryWrapIfAdditionalTemplate {...baseProps({ label: 'testprop' })} />);
    const input = screen.getByLabelText('Property key') as HTMLInputElement;
    expect(input.defaultValue).toBe('testprop');
  });

  it('disables key input when readonly is true', () => {
    render(<ReactoryWrapIfAdditionalTemplate {...baseProps({ readonly: true })} />);
    expect(screen.getByLabelText('Property key')).toBeDisabled();
  });

  it('disables key input when disabled is true', () => {
    render(<ReactoryWrapIfAdditionalTemplate {...baseProps({ disabled: true })} />);
    expect(screen.getByLabelText('Property key')).toBeDisabled();
  });

  it('calls onKeyChange with new value on blur', () => {
    const onKeyChange = jest.fn(() => jest.fn());
    render(<ReactoryWrapIfAdditionalTemplate {...baseProps({ onKeyChange })} />);
    const input = screen.getByLabelText('Property key');
    fireEvent.blur(input, { target: { value: 'newkey' } });
    expect(onKeyChange).toHaveBeenCalledWith('newkey');
  });

  it('renders a Remove button', () => {
    render(<ReactoryWrapIfAdditionalTemplate {...baseProps()} />);
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('Remove button fires onDropPropertyClick with label', () => {
    const innerHandler = jest.fn();
    const onDropPropertyClick = jest.fn(() => innerHandler);
    render(<ReactoryWrapIfAdditionalTemplate {...baseProps({ onDropPropertyClick })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onDropPropertyClick).toHaveBeenCalledWith('mykey');
    expect(innerHandler).toHaveBeenCalledTimes(1);
  });

  it('renders only the children when ADDITIONAL_PROPERTY_FLAG is absent', () => {
    const { container } = render(
      <ReactoryWrapIfAdditionalTemplate
        {...baseProps({ schema: { type: 'string' } })}
      />,
    );
    expect(container.querySelector('.wrap-if-additional')).toBeNull();
    expect(screen.getByTestId('value-input')).toBeInTheDocument();
  });

  it('does not render key input when schema lacks the flag', () => {
    render(
      <ReactoryWrapIfAdditionalTemplate
        {...baseProps({ schema: { type: 'string' } })}
      />,
    );
    expect(screen.queryByLabelText('Property key')).toBeNull();
  });
});
