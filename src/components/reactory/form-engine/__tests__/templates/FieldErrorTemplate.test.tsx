/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { FieldErrorProps } from '@rjsf/utils';
import { ReactoryFieldErrorTemplate } from '../../templates/FieldErrorTemplate';

const baseRegistry = (overrides: Record<string, unknown> = {}): FieldErrorProps['registry'] =>
  ({ formContext: {}, ...overrides } as unknown as FieldErrorProps['registry']);

const baseProps = (overrides: Partial<FieldErrorProps> = {}): FieldErrorProps => ({
  errors: ['Required field', 'Must be at least 3 chars'],
  errorSchema: {},
  schema: { type: 'string' },
  uiSchema: {},
  idSchema: { $id: 'root_name' } as FieldErrorProps['idSchema'],
  registry: baseRegistry(),
  ...overrides,
});

describe('ReactoryFieldErrorTemplate', () => {
  it('renders default ul with role=alert for each error', () => {
    render(<ReactoryFieldErrorTemplate {...baseProps()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Required field')).toBeInTheDocument();
    expect(screen.getByText('Must be at least 3 chars')).toBeInTheDocument();
  });

  it('error region uses role=alert', () => {
    render(<ReactoryFieldErrorTemplate {...baseProps()} />);
    const region = screen.getByRole('alert');
    expect(region.tagName.toLowerCase()).toBe('ul');
  });

  it('returns null when errors is empty', () => {
    const { container } = render(<ReactoryFieldErrorTemplate {...baseProps({ errors: [] })} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when errors is undefined', () => {
    const { container } = render(<ReactoryFieldErrorTemplate {...baseProps({ errors: undefined })} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when ui:error is false', () => {
    const { container } = render(
      <ReactoryFieldErrorTemplate {...baseProps({ uiSchema: { 'ui:error': false } })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders string override above the error list', () => {
    render(
      <ReactoryFieldErrorTemplate
        {...baseProps({ uiSchema: { 'ui:error': 'Custom error message' } })}
      />,
    );
    const summary = screen.getByText('Custom error message');
    expect(summary.tagName.toLowerCase()).toBe('p');
    expect(summary).toHaveClass('error-summary');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('renders the resolved FQN component when field is set and resolves', () => {
    const MarkerError = jest.fn(() => <span data-testid="marker-error" />);
    const registry = baseRegistry({
      resolveFqn: (name: string, kind: string) =>
        kind === 'field' && name === 'my.ErrorField' ? MarkerError : null,
    });
    render(
      <ReactoryFieldErrorTemplate
        {...baseProps({
          uiSchema: { 'ui:error': { field: 'my.ErrorField' } },
          registry,
        })}
      />,
    );
    expect(screen.getByTestId('marker-error')).toBeInTheDocument();
  });

  it('passes errors and fieldOptions to the resolved component', () => {
    const MarkerError = jest.fn(() => null);
    const registry = baseRegistry({ resolveFqn: () => MarkerError });
    const errors = ['err1'];
    render(
      <ReactoryFieldErrorTemplate
        {...baseProps({
          errors,
          uiSchema: { 'ui:error': { field: 'my.ErrorField', fieldOptions: { detail: true } } },
          registry,
        })}
      />,
    );
    expect(MarkerError).toHaveBeenCalledWith(
      expect.objectContaining({ errors, detail: true }),
      expect.anything(),
    );
  });

  it('falls back to default ul when field resolves to null', () => {
    const registry = baseRegistry({ resolveFqn: () => null });
    render(
      <ReactoryFieldErrorTemplate
        {...baseProps({
          uiSchema: { 'ui:error': { field: 'my.Missing' } },
          registry,
        })}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders ReactElement errors correctly', () => {
    render(
      <ReactoryFieldErrorTemplate
        {...baseProps({ errors: [<strong key="0">Bold error</strong>] })}
      />,
    );
    expect(screen.getByText('Bold error')).toBeInTheDocument();
  });
});
