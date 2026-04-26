/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ObjectFieldTemplateProps } from '@rjsf/utils';
import { ReactoryObjectFieldTemplate } from '../../templates/ObjectFieldTemplate';

const property = (name: string, content: React.ReactElement, hidden = false) => ({
  content,
  name,
  disabled: false,
  readonly: false,
  hidden,
});

const baseProps = (overrides: Partial<ObjectFieldTemplateProps> = {}): ObjectFieldTemplateProps => ({
  title: 'Person',
  description: undefined,
  properties: [
    property('name', <input data-testid="name" />),
    property('email', <input data-testid="email" />),
  ],
  schema: { type: 'object' },
  uiSchema: {},
  idSchema: { $id: 'root' } as ObjectFieldTemplateProps['idSchema'],
  required: false,
  disabled: false,
  readonly: false,
  formContext: {},
  registry: {} as ObjectFieldTemplateProps['registry'],
  onAddClick: () => () => undefined,
  ...overrides,
});

describe('ReactoryObjectFieldTemplate', () => {
  it('renders the title as a legend with stable id', () => {
    render(<ReactoryObjectFieldTemplate {...baseProps()} />);
    const legend = screen.getByText('Person');
    expect(legend.tagName.toLowerCase()).toBe('legend');
    expect(legend).toHaveAttribute('id', 'root__title');
  });

  it('uses fieldset+legend with aria-labelledby pointing to the legend', () => {
    const { container } = render(<ReactoryObjectFieldTemplate {...baseProps()} />);
    const fs = container.querySelector('fieldset');
    expect(fs).toHaveAttribute('aria-labelledby', 'root__title');
  });

  it('renders properties in order', () => {
    render(<ReactoryObjectFieldTemplate {...baseProps()} />);
    const all = document.querySelectorAll('[data-property-name]');
    expect(Array.from(all).map((el) => el.getAttribute('data-property-name'))).toEqual(['name', 'email']);
  });

  it('skips hidden properties', () => {
    render(
      <ReactoryObjectFieldTemplate
        {...baseProps({
          properties: [
            property('shown', <input data-testid="shown" />, false),
            property('hidden-prop', <input data-testid="hidden-prop" />, true),
          ],
        })}
      />,
    );
    expect(screen.getByTestId('shown')).toBeInTheDocument();
    expect(screen.queryByTestId('hidden-prop')).toBeNull();
  });

  it('renders a description paragraph when supplied', () => {
    render(<ReactoryObjectFieldTemplate {...baseProps({ description: 'About this person' })} />);
    expect(screen.getByText('About this person')).toHaveAttribute('id', 'root__description');
  });

  it('does not render the description when absent', () => {
    const { container } = render(<ReactoryObjectFieldTemplate {...baseProps()} />);
    expect(container.querySelector('.object-field-description')).toBeNull();
  });

  it('appends a required indicator to the title', () => {
    render(<ReactoryObjectFieldTemplate {...baseProps({ required: true })} />);
    expect(screen.getByText('Person').textContent).toContain('*');
  });

  it('hides the title when ui:label is false', () => {
    render(<ReactoryObjectFieldTemplate {...baseProps({ uiSchema: { 'ui:label': false } })} />);
    expect(screen.queryByText('Person')).toBeNull();
  });

  it('renders an Add button when additionalProperties is allowed', () => {
    render(
      <ReactoryObjectFieldTemplate
        {...baseProps({ schema: { type: 'object', additionalProperties: true } })}
      />,
    );
    const btn = screen.getByRole('button', { name: 'Add new property' });
    expect(btn).toBeInTheDocument();
  });

  it('does not render Add button when additionalProperties is false', () => {
    render(
      <ReactoryObjectFieldTemplate
        {...baseProps({ schema: { type: 'object', additionalProperties: false } })}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Add new property' })).toBeNull();
  });

  it('does not render Add button when readonly', () => {
    render(
      <ReactoryObjectFieldTemplate
        {...baseProps({ schema: { type: 'object', additionalProperties: true }, readonly: true })}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Add new property' })).toBeNull();
  });

  it('does not render Add button when disabled', () => {
    render(
      <ReactoryObjectFieldTemplate
        {...baseProps({ schema: { type: 'object', additionalProperties: true }, disabled: true })}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Add new property' })).toBeNull();
  });

  it('Add button calls onAddClick(schema)', () => {
    const onAddClickInner = jest.fn();
    const onAddClick = jest.fn(() => onAddClickInner);
    render(
      <ReactoryObjectFieldTemplate
        {...baseProps({ schema: { type: 'object', additionalProperties: true }, onAddClick })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add new property' }));
    expect(onAddClick).toHaveBeenCalledWith(expect.objectContaining({ additionalProperties: true }));
    expect(onAddClickInner).toHaveBeenCalledTimes(1);
  });
});
