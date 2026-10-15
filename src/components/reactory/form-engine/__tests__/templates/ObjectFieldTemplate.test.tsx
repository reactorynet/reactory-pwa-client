/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ObjectFieldTemplateProps } from '@rjsf/utils';
import {
  ReactoryObjectFieldTemplate,
  buildGridSpans,
  isHiddenByReactoryUi,
  selectVisibleProperties,
} from '../../templates/ObjectFieldTemplate';

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

describe('ReactoryObjectFieldTemplate grid spacing', () => {
  const gridProps = (overrides: Partial<ObjectFieldTemplateProps> = {}) =>
    baseProps({
      uiSchema: {
        'ui:grid-layout': [
          { name: { md: 6 }, email: { md: 6 } },
          { phone: { md: 12 } },
        ],
      },
      properties: [
        property('name', <input data-testid="name" />),
        property('email', <input data-testid="email" />),
        property('phone', <input data-testid="phone" />),
      ],
      ...overrides,
    });

  it('renders the grid when ui:grid-layout is supplied', () => {
    const { container } = render(<ReactoryObjectFieldTemplate {...gridProps()} />);

    expect(container.querySelector('[data-grid-layout="ui:grid-layout"]')).not.toBeNull();
  });

  /**
   * Regression guard: the grid had `rowGap: 0`, so fields that wrapped onto a
   * second row had no vertical gap. A field's helper text then sat flush against
   * the next row's input, and because an outlined label is absolutely positioned
   * (overhanging its field by ~9px) the next row's label landed on top of it -
   * content read as compressed on top of itself.
   */
  it('gives wrapped grid rows a vertical gap, not just a column gap', () => {
    const { container } = render(<ReactoryObjectFieldTemplate {...gridProps()} />);
    const grid = container.querySelector('[data-grid-layout="ui:grid-layout"]') as HTMLElement;

    const styles = window.getComputedStyle(grid);
    const columnGap = parseFloat(styles.columnGap || '0');
    const rowGap = parseFloat(styles.rowGap || '0');

    expect(rowGap).toBeGreaterThan(0);
    expect(rowGap).toBe(columnGap);
  });

  it('keeps the column gap on the grid', () => {
    const { container } = render(<ReactoryObjectFieldTemplate {...gridProps()} />);
    const grid = container.querySelector('[data-grid-layout="ui:grid-layout"]') as HTMLElement;

    expect(parseFloat(window.getComputedStyle(grid).columnGap)).toBeGreaterThan(0);
  });
});
/**
 * `ui:options.variant: 'section'` renders a nested object as a padded, bordered
 * section. Before this existed, an object's content sat flush against its
 * container edges (the v5 fieldset had `padding: 0`), which is what the AI
 * provider/model editors exposed on their Sampling/Thinking/Rate-limits blocks.
 */
describe('ReactoryObjectFieldTemplate — section variant', () => {
  const sectionProps = (overrides: Partial<ObjectFieldTemplateProps> = {}) =>
    baseProps({
      uiSchema: { 'ui:options': { variant: 'section' } },
      ...overrides,
    });

  it('renders a bare fieldset by default', () => {
    const { container } = render(<ReactoryObjectFieldTemplate {...baseProps()} />);
    const fieldset = container.querySelector('fieldset.object-field');
    expect(fieldset).toBeTruthy();
    expect(fieldset).not.toHaveAttribute('data-variant');
  });

  it('marks the fieldset as a section when ui:options.variant is "section"', () => {
    const { container } = render(<ReactoryObjectFieldTemplate {...sectionProps()} />);
    const fieldset = container.querySelector('fieldset.object-field');
    expect(fieldset).toHaveAttribute('data-variant', 'section');
  });

  it('lays a section out on the 12-column grid when it declares ui:grid-layout', () => {
    const { container } = render(
      <ReactoryObjectFieldTemplate
        {...sectionProps({
          uiSchema: {
            'ui:options': { variant: 'section' },
            'ui:grid-layout': [{ name: { xs: 12, md: 6 }, email: { xs: 12, md: 6 } }],
          },
        })}
      />,
    );
    const grid = container.querySelector('[data-grid-layout="ui:grid-layout"]');
    expect(grid).toBeTruthy();
  });

  it('keeps the section heading and its accessible name', () => {
    const { container } = render(<ReactoryObjectFieldTemplate {...sectionProps()} />);
    const legend = container.querySelector('legend.object-field-title');
    expect(legend).toBeTruthy();
    expect(legend?.textContent).toContain('Person');
    expect(container.querySelector('fieldset')?.getAttribute('aria-labelledby')).toBe('root__title');
  });
});

/**
 * REACTORY-302016408/20261014/2327145804.
 *
 * The v5 object template used to render every `schema.properties` entry and only
 * *lay out* those named in `ui:grid-layout`, so a data-only property (e.g. the
 * `message` result/error carrier on `core.SupportTickets`) leaked into the form
 * as an empty input. The legacy `MaterialGridField` renders the layout, and only
 * the layout. These tests pin that contract.
 */
describe('ReactoryObjectFieldTemplate — the layout is the render list', () => {
  const layoutProps = (overrides: Partial<ObjectFieldTemplateProps> = {}) =>
    baseProps({
      uiSchema: { 'ui:field': 'GridLayout', 'ui:grid-layout': [{ tickets: { xs: 12 } }] },
      properties: [
        property('message', <input data-testid="message" />),
        property('tickets', <input data-testid="tickets" />),
      ],
      ...overrides,
    });

  it('renders declared properties and suppresses undeclared ones', () => {
    render(<ReactoryObjectFieldTemplate {...layoutProps()} />);

    expect(screen.getByTestId('tickets')).toBeInTheDocument();
    expect(screen.queryByTestId('message')).toBeNull();
  });

  it('emits no grid cell for a suppressed property', () => {
    const { container } = render(<ReactoryObjectFieldTemplate {...layoutProps()} />);

    const cells = container.querySelectorAll('[data-property-name]');
    expect(cells).toHaveLength(1);
    expect(cells[0].getAttribute('data-property-name')).toBe('tickets');
  });

  it('renders every property when no grid layout is declared', () => {
    render(<ReactoryObjectFieldTemplate {...baseProps({ uiSchema: {} })} />);

    expect(screen.getByTestId('name')).toBeInTheDocument();
    expect(screen.getByTestId('email')).toBeInTheDocument();
  });

  it('attributes a nested layout path to its top-level property', () => {
    render(
      <ReactoryObjectFieldTemplate
        {...baseProps({
          uiSchema: { 'ui:grid-layout': [{ 'paging.pageSize': { xs: 12 } }] },
          properties: [
            property('paging', <input data-testid="paging" />),
            property('other', <input data-testid="other" />),
          ],
        })}
      />,
    );

    expect(screen.getByTestId('paging')).toBeInTheDocument();
    expect(screen.queryByTestId('other')).toBeNull();
  });

  it('degrades to rendering everything when the layout declares no usable span', () => {
    const { container } = render(
      <ReactoryObjectFieldTemplate
        {...baseProps({
          // A row whose value is not a size yields no span; restricting on this
          // would blank the form, so the previous behaviour is kept.
          uiSchema: { 'ui:grid-layout': [{ name: null }] },
        })}
      />,
    );

    expect(screen.getByTestId('name')).toBeInTheDocument();
    expect(screen.getByTestId('email')).toBeInTheDocument();
    expect(container.querySelector('[data-grid-layout="ui:grid-layout"]')).toBeNull();
  });

  it.each([
    ['HiddenWidget (Reactory legacy alias)', { 'ui:widget': 'HiddenWidget' }],
    ['ui:hidden boolean', { 'ui:hidden': true }],
  ])('suppresses a declared field hidden via %s without leaving a cell', (_label, fieldUi) => {
    const { container } = render(
      <ReactoryObjectFieldTemplate
        {...baseProps({
          uiSchema: {
            'ui:grid-layout': [{ message: { xs: 12 } }, { tickets: { xs: 12 } }],
            message: fieldUi,
          },
          properties: [
            property('message', <input data-testid="message" />),
            property('tickets', <input data-testid="tickets" />),
          ],
        })}
      />,
    );

    expect(screen.queryByTestId('message')).toBeNull();
    expect(screen.getByTestId('tickets')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-property-name]')).toHaveLength(1);
  });

  it('honours a ui:hidden predicate', () => {
    const uiSchema = {
      'ui:grid-layout': [{ name: { xs: 12 } }, { email: { xs: 12 } }],
      email: {
        'ui:hidden': (args: { formData: unknown }) =>
          (args.formData as { hideEmail?: boolean })?.hideEmail === true,
      },
    };

    const { unmount } = render(
      <ReactoryObjectFieldTemplate {...baseProps({ uiSchema, formData: { hideEmail: true } })} />,
    );
    expect(screen.queryByTestId('email')).toBeNull();
    unmount();

    render(
      <ReactoryObjectFieldTemplate {...baseProps({ uiSchema, formData: { hideEmail: false } })} />,
    );
    expect(screen.getByTestId('email')).toBeInTheDocument();
  });
});

describe('isHiddenByReactoryUi', () => {
  const args = { formData: {}, formContext: {}, idSchema: {}, schema: {} };

  it('recognises both hidden widget spellings', () => {
    expect(isHiddenByReactoryUi('id', { id: { 'ui:widget': 'hidden' } }, args)).toBe(true);
    expect(isHiddenByReactoryUi('id', { id: { 'ui:widget': 'HiddenWidget' } }, args)).toBe(true);
  });

  it('ignores ui:hidden: false and unknown widgets', () => {
    expect(isHiddenByReactoryUi('id', { id: { 'ui:hidden': false } }, args)).toBe(false);
    expect(isHiddenByReactoryUi('id', { id: { 'ui:widget': 'textarea' } }, args)).toBe(false);
    expect(isHiddenByReactoryUi('id', {}, args)).toBe(false);
    expect(isHiddenByReactoryUi('id', undefined, args)).toBe(false);
  });

  it('treats a throwing predicate as visible rather than crashing the form', () => {
    const uiSchema = {
      id: {
        'ui:hidden': () => {
          throw new Error('boom');
        },
      },
    };
    expect(isHiddenByReactoryUi('id', uiSchema, args)).toBe(false);
  });
});

describe('selectVisibleProperties', () => {
  const props = [
    property('message', <input />),
    property('tickets', <input />),
    property('flag', <input />, true),
  ];

  it('keeps only layout-declared, non-hidden properties', () => {
    const spans = buildGridSpans([{ tickets: { xs: 12 } }]);
    const visible = selectVisibleProperties(props, spans, true, undefined, {
      formData: {},
      formContext: {},
      idSchema: {},
      schema: {},
    });

    expect(visible.map((p) => p.name)).toEqual(['tickets']);
  });

  it('renders all non-hidden properties when no layout is present', () => {
    const visible = selectVisibleProperties(props, {}, false, undefined, {
      formData: {},
      formContext: {},
      idSchema: {},
      schema: {},
    });

    expect(visible.map((p) => p.name)).toEqual(['message', 'tickets']);
  });
});