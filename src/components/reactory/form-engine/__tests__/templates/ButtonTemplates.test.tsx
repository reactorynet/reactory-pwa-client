/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { SubmitButtonProps, IconButtonProps } from '@rjsf/utils';
import {
  SubmitButton,
  AddButton,
  RemoveButton,
  MoveUpButton,
  MoveDownButton,
  CopyButton,
  ButtonTemplates,
} from '../../templates/ButtonTemplates';

const baseRegistry = (): SubmitButtonProps['registry'] =>
  ({} as unknown as SubmitButtonProps['registry']);

const submitProps = (overrides: Partial<SubmitButtonProps> = {}): SubmitButtonProps => ({
  uiSchema: {},
  registry: baseRegistry(),
  ...overrides,
});

const iconProps = (overrides: Partial<IconButtonProps> = {}): IconButtonProps => ({
  onClick: jest.fn(),
  disabled: false,
  registry: baseRegistry(),
  uiSchema: {},
  ...overrides,
});

describe('SubmitButton', () => {
  it('renders with default text "Submit"', () => {
    render(<SubmitButton {...submitProps()} />);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('renders with custom submitText from ui:submitButtonOptions', () => {
    render(
      <SubmitButton
        {...submitProps({
          uiSchema: { 'ui:submitButtonOptions': { submitText: 'Save' } },
        })}
      />,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('returns null when norender is true', () => {
    const { container } = render(
      <SubmitButton
        {...submitProps({
          uiSchema: { 'ui:submitButtonOptions': { norender: true } },
        })}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('has type=submit and className reactory-submit-button', () => {
    render(<SubmitButton {...submitProps()} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('type', 'submit');
    expect(btn).toHaveClass('reactory-submit-button');
  });
});

describe('AddButton', () => {
  it('renders with aria-label="Add"', () => {
    render(<AddButton {...iconProps()} />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<AddButton {...iconProps({ onClick })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<AddButton {...iconProps({ disabled: true })} />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });
});

describe('RemoveButton', () => {
  it('renders with aria-label="Remove"', () => {
    render(<RemoveButton {...iconProps()} />);
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<RemoveButton {...iconProps({ onClick })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('MoveUpButton', () => {
  it('renders with aria-label="Move up"', () => {
    render(<MoveUpButton {...iconProps()} />);
    expect(screen.getByRole('button', { name: 'Move up' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<MoveUpButton {...iconProps({ onClick })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move up' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('MoveDownButton', () => {
  it('renders with aria-label="Move down"', () => {
    render(<MoveDownButton {...iconProps()} />);
    expect(screen.getByRole('button', { name: 'Move down' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<MoveDownButton {...iconProps({ onClick })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move down' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('CopyButton', () => {
  it('renders with aria-label="Copy"', () => {
    render(<CopyButton {...iconProps()} />);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<CopyButton {...iconProps({ onClick })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('ButtonTemplates', () => {
  it('exports all required button components', () => {
    expect(ButtonTemplates.SubmitButton).toBeDefined();
    expect(ButtonTemplates.AddButton).toBeDefined();
    expect(ButtonTemplates.RemoveButton).toBeDefined();
    expect(ButtonTemplates.MoveUpButton).toBeDefined();
    expect(ButtonTemplates.MoveDownButton).toBeDefined();
    expect(ButtonTemplates.CopyButton).toBeDefined();
  });
});
