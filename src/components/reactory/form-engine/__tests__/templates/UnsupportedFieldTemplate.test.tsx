/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { UnsupportedFieldProps } from '@rjsf/utils';
import { ReactoryUnsupportedFieldTemplate } from '../../templates/UnsupportedFieldTemplate';

const baseRegistry = (): UnsupportedFieldProps['registry'] =>
  ({} as unknown as UnsupportedFieldProps['registry']);

const baseProps = (overrides: Partial<UnsupportedFieldProps> = {}): UnsupportedFieldProps => ({
  schema: { type: 'array', items: { type: 'string' } },
  idSchema: { $id: 'root_unsupported' } as UnsupportedFieldProps['idSchema'],
  reason: 'Schema type not supported',
  registry: baseRegistry(),
  ...overrides,
});

describe('ReactoryUnsupportedFieldTemplate', () => {
  it('renders with role=alert', () => {
    render(<ReactoryUnsupportedFieldTemplate {...baseProps()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the "Unsupported field" heading', () => {
    render(<ReactoryUnsupportedFieldTemplate {...baseProps()} />);
    expect(screen.getByText('Unsupported field')).toBeInTheDocument();
  });

  it('renders the reason text', () => {
    render(<ReactoryUnsupportedFieldTemplate {...baseProps()} />);
    expect(screen.getByText('Schema type not supported')).toBeInTheDocument();
  });

  it('renders default reason when none is provided', () => {
    render(<ReactoryUnsupportedFieldTemplate {...baseProps({ reason: '' })} />);
    expect(
      screen.getByText('No matching field component for this schema.'),
    ).toBeInTheDocument();
  });

  it('renders the schema as pretty-printed JSON in a pre', () => {
    render(<ReactoryUnsupportedFieldTemplate {...baseProps()} />);
    const pre = screen.getByRole('alert').querySelector('pre');
    expect(pre).not.toBeNull();
    const parsed = JSON.parse(pre!.textContent ?? '{}');
    expect(parsed).toEqual({ type: 'array', items: { type: 'string' } });
  });

  it('sets data-field-id from idSchema.$id', () => {
    render(<ReactoryUnsupportedFieldTemplate {...baseProps()} />);
    expect(screen.getByRole('alert')).toHaveAttribute('data-field-id', 'root_unsupported');
  });

  it('has className unsupported-field', () => {
    const { container } = render(<ReactoryUnsupportedFieldTemplate {...baseProps()} />);
    expect(container.querySelector('.unsupported-field')).not.toBeNull();
  });

  it('handles missing idSchema gracefully', () => {
    const { container } = render(
      <ReactoryUnsupportedFieldTemplate
        {...baseProps({ idSchema: undefined })}
      />,
    );
    expect(container.querySelector('.unsupported-field')).not.toBeNull();
  });
});
