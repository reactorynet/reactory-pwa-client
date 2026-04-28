/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ErrorListProps } from '@rjsf/utils';
import type { RJSFValidationError } from '@rjsf/utils';
import { ReactoryErrorListTemplate } from '../../templates/ErrorListTemplate';

const baseRegistry = (): ErrorListProps['registry'] =>
  ({} as unknown as ErrorListProps['registry']);

const makeError = (message: string, stack?: string): RJSFValidationError => ({
  message,
  stack: stack ?? `Error: ${message}`,
  name: 'required',
  property: '.field',
  schemaPath: '#/required',
  params: {},
});

const baseProps = (overrides: Partial<ErrorListProps> = {}): ErrorListProps => ({
  errors: [makeError('Name is required'), makeError('Email is invalid')],
  errorSchema: {},
  schema: { type: 'object' },
  uiSchema: {},
  registry: baseRegistry(),
  ...overrides,
});

describe('ReactoryErrorListTemplate', () => {
  it('renders a validation error list with role=alert', () => {
    render(<ReactoryErrorListTemplate {...baseProps()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the heading Validation Errors', () => {
    render(<ReactoryErrorListTemplate {...baseProps()} />);
    expect(screen.getByRole('heading', { name: 'Validation Errors' })).toBeInTheDocument();
  });

  it('renders each error from stack', () => {
    render(<ReactoryErrorListTemplate {...baseProps()} />);
    expect(screen.getByText('Error: Name is required')).toBeInTheDocument();
    expect(screen.getByText('Error: Email is invalid')).toBeInTheDocument();
  });

  it('falls back to message when stack is undefined', () => {
    const errors: RJSFValidationError[] = [
      { message: 'No stack', stack: '', name: 'type', property: '.x', schemaPath: '#/type', params: {} },
    ];
    render(<ReactoryErrorListTemplate {...baseProps({ errors })} />);
    expect(screen.getByText('No stack')).toBeInTheDocument();
  });

  it('returns null when errors is empty', () => {
    const { container } = render(<ReactoryErrorListTemplate {...baseProps({ errors: [] })} />);
    expect(container.firstChild).toBeNull();
  });

  it('has className error-list on the root div', () => {
    const { container } = render(<ReactoryErrorListTemplate {...baseProps()} />);
    expect(container.querySelector('.error-list')).not.toBeNull();
  });

  it('renders errors in a list', () => {
    render(<ReactoryErrorListTemplate {...baseProps()} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
  });
});
