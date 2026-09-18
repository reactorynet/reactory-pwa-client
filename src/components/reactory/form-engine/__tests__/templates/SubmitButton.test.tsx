/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { SubmitButtonProps } from '@rjsf/utils';

import { SubmitButton } from '../../templates/ButtonTemplates';

const baseProps = (uiSchema: Record<string, unknown> = {}): SubmitButtonProps =>
  ({ uiSchema, registry: {} as SubmitButtonProps['registry'] }) as unknown as SubmitButtonProps;

describe('SubmitButton — label resolution', () => {
  it('defaults to Submit', () => {
    render(<SubmitButton {...baseProps()} />);
    expect(screen.getByRole('button')).toHaveTextContent('Submit');
  });

  it('honours rjsf ui:submitButtonOptions.submitText', () => {
    render(<SubmitButton {...baseProps({ 'ui:submitButtonOptions': { submitText: 'Go' } })} />);
    expect(screen.getByRole('button')).toHaveTextContent('Go');
  });

  it('honours the Reactory ui:options.submitText extension', () => {
    render(<SubmitButton {...baseProps({ 'ui:options': { submitText: 'Execute Query' } })} />);
    expect(screen.getByRole('button')).toHaveTextContent('Execute Query');
  });

  it('prefers the Reactory submitText over the rjsf default', () => {
    render(
      <SubmitButton
        {...baseProps({
          'ui:options': { submitText: 'Execute Query' },
          'ui:submitButtonOptions': { submitText: 'Go' },
        })}
      />,
    );
    expect(screen.getByRole('button')).toHaveTextContent('Execute Query');
  });

  it('renders no button when rjsf asks for norender', () => {
    render(<SubmitButton {...baseProps({ 'ui:submitButtonOptions': { norender: true } })} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is a submit button carrying the legacy class contract', () => {
    render(<SubmitButton {...baseProps()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveClass('reactory-submit-button');
  });
});

describe('SubmitButton — icon resolution', () => {
  it('renders the configured Reactory submitIcon', () => {
    render(<SubmitButton {...baseProps({ 'ui:options': { submitIcon: 'play_arrow' } })} />);

    expect(screen.getByText('play_arrow')).toBeInTheDocument();
  });

  it('places the icon before the label by default', () => {
    const { container } = render(
      <SubmitButton {...baseProps({ 'ui:options': { submitIcon: 'play_arrow' } })} />,
    );

    const button = container.querySelector('button')!;
    const icon = container.querySelector('.MuiButton-startIcon');
    expect(icon).not.toBeNull();
    expect(button.firstElementChild).toBe(icon);
  });

  it('honours submitProps.iconAlign = right', () => {
    const { container } = render(
      <SubmitButton
        {...baseProps({ 'ui:options': { submitIcon: 'play_arrow', submitProps: { iconAlign: 'right' } } })}
      />,
    );

    expect(container.querySelector('.MuiButton-endIcon')).not.toBeNull();
    expect(container.querySelector('.MuiButton-startIcon')).toBeNull();
  });

  it('renders no icon when submitIcon is $none', () => {
    const { container } = render(
      <SubmitButton {...baseProps({ 'ui:options': { submitIcon: '$none' } })} />,
    );

    expect(container.querySelector('.MuiButton-startIcon')).toBeNull();
    expect(container.querySelector('.MuiButton-endIcon')).toBeNull();
  });

  it('wraps the button in a tooltip when submitProps.tooltip is set', () => {
    render(
      <SubmitButton
        {...baseProps({ 'ui:options': { submitProps: { tooltip: 'Runs the query' } } })}
      />,
    );

    // MUI Tooltip promotes the tooltip text to the child's aria-label, so the
    // button keeps its visible label while gaining an accessible description.
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Submit');
    expect(button).toHaveAccessibleName('Runs the query');
  });
});
