/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { FieldHelpProps } from '@rjsf/utils';
import { ReactoryFieldHelpTemplate } from '../../templates/FieldHelpTemplate';

const baseRegistry = (): FieldHelpProps['registry'] =>
  ({} as unknown as FieldHelpProps['registry']);

const baseProps = (overrides: Partial<FieldHelpProps> = {}): FieldHelpProps => ({
  help: 'This is helpful',
  idSchema: { $id: 'root_email' } as FieldHelpProps['idSchema'],
  schema: { type: 'string' },
  uiSchema: {},
  registry: baseRegistry(),
  ...overrides,
});

describe('ReactoryFieldHelpTemplate', () => {
  it('renders a help div with the help text', () => {
    render(<ReactoryFieldHelpTemplate {...baseProps()} />);
    const el = screen.getByText('This is helpful');
    expect(el.closest('div')).toHaveClass('field-help');
  });

  it('sets id to idSchema.$id + -help', () => {
    render(<ReactoryFieldHelpTemplate {...baseProps()} />);
    expect(document.getElementById('root_email-help')).toBeInTheDocument();
  });

  it('returns null when help is undefined', () => {
    const { container } = render(
      <ReactoryFieldHelpTemplate {...baseProps({ help: undefined })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when help is empty string', () => {
    const { container } = render(
      <ReactoryFieldHelpTemplate {...baseProps({ help: '' })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a ReactElement help node', () => {
    render(
      <ReactoryFieldHelpTemplate
        {...baseProps({ help: <em data-testid="help-node">formatted help</em> })}
      />,
    );
    expect(screen.getByTestId('help-node')).toBeInTheDocument();
  });

  it('the help div is inside the DOM with correct id and class', () => {
    const { container } = render(<ReactoryFieldHelpTemplate {...baseProps()} />);
    const div = container.querySelector('.field-help');
    expect(div).not.toBeNull();
    expect(div).toHaveAttribute('id', 'root_email-help');
  });
});
