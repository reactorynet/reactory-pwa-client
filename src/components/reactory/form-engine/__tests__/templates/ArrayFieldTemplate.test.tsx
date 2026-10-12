/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ArrayFieldTemplateProps } from '@rjsf/utils';
import { ReactoryArrayFieldTemplate } from '../../templates/ArrayFieldTemplate';

const item = (key: string, label: string, totalItems = 2) => ({
  key,
  index: parseInt(key, 10) || 0,
  totalItems,
  className: '',
  schema: { type: 'string' as const },
  uiSchema: {},
  hasMoveDown: false,
  hasMoveUp: false,
  hasRemove: false,
  hasToolbar: false,
  hasCopy: false,
  canAdd: false,
  canMove: false,
  canRemove: false,
  canCopy: false,
  disabled: false,
  readonly: false,
  registry: {} as ArrayFieldTemplateProps['registry'],
  children: <div data-testid={`item-${key}`}>{label}</div>,
  onAddIndexClick: () => () => undefined,
  onCopyIndexClick: () => () => undefined,
  onDropIndexClick: () => () => undefined,
  onReorderClick: () => () => undefined,
  formData: undefined,
});

const baseProps = (overrides: Partial<ArrayFieldTemplateProps> = {}): ArrayFieldTemplateProps => ({
  canAdd: true,
  className: undefined,
  disabled: false,
  idSchema: { $id: 'root_tags' } as ArrayFieldTemplateProps['idSchema'],
  items: [item('0', 'first'), item('1', 'second')],
  onAddClick: () => undefined,
  readonly: false,
  required: false,
  schema: { type: 'array' },
  uiSchema: {},
  title: 'Tags',
  formContext: {},
  formData: undefined,
  registry: {} as ArrayFieldTemplateProps['registry'],
  ...overrides,
});

describe('ReactoryArrayFieldTemplate', () => {
  it('renders the title as h4 with stable id', () => {
    render(<ReactoryArrayFieldTemplate {...baseProps()} />);
    const title = screen.getByText('Tags');
    expect(title.tagName.toLowerCase()).toBe('h4');
    expect(title).toHaveAttribute('id', 'root_tags__title');
  });

  it('uses aria-labelledby to associate section with title', () => {
    const { container } = render(<ReactoryArrayFieldTemplate {...baseProps()} />);
    const sec = container.querySelector('section');
    expect(sec).toHaveAttribute('aria-labelledby', 'root_tags__title');
  });

  it('renders items in an ordered list', () => {
    render(<ReactoryArrayFieldTemplate {...baseProps()} />);
    const ol = document.querySelector('ol.array-field-items');
    expect(ol).not.toBeNull();
    expect(ol?.children.length).toBe(2);
  });

  it('renders item children with stable keys', () => {
    render(<ReactoryArrayFieldTemplate {...baseProps()} />);
    expect(screen.getByTestId('item-0')).toBeInTheDocument();
    expect(screen.getByTestId('item-1')).toBeInTheDocument();
  });

  it('appends required indicator on title', () => {
    render(<ReactoryArrayFieldTemplate {...baseProps({ required: true })} />);
    expect(screen.getByText('Tags').textContent).toContain('*');
  });

  it('hides the title when ui:label is false', () => {
    render(<ReactoryArrayFieldTemplate {...baseProps({ uiSchema: { 'ui:label': false } })} />);
    expect(screen.queryByText('Tags')).toBeNull();
  });

  it('renders Add button when canAdd is true and not disabled/readonly', () => {
    render(<ReactoryArrayFieldTemplate {...baseProps({ canAdd: true })} />);
    expect(screen.getByRole('button', { name: 'Add new item' })).toBeInTheDocument();
  });

  it('does not render Add button when canAdd is false', () => {
    render(<ReactoryArrayFieldTemplate {...baseProps({ canAdd: false })} />);
    expect(screen.queryByRole('button', { name: 'Add new item' })).toBeNull();
  });

  it('does not render Add button when readonly', () => {
    render(<ReactoryArrayFieldTemplate {...baseProps({ readonly: true })} />);
    expect(screen.queryByRole('button', { name: 'Add new item' })).toBeNull();
  });

  it('Add button fires onAddClick', () => {
    const onAddClick = jest.fn();
    render(<ReactoryArrayFieldTemplate {...baseProps({ onAddClick })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add new item' }));
    expect(onAddClick).toHaveBeenCalledTimes(1);
  });

  it('uses provided className when supplied', () => {
    const { container } = render(<ReactoryArrayFieldTemplate {...baseProps({ className: 'my-array' })} />);
    expect(container.querySelector('section')?.className).toBe('my-array');
  });

  it('falls back to .array-field className', () => {
    const { container } = render(<ReactoryArrayFieldTemplate {...baseProps()} />);
    expect(container.querySelector('section')?.className).toBe('array-field');
  });

  it('forwards data-array-id from idSchema', () => {
    const { container } = render(<ReactoryArrayFieldTemplate {...baseProps()} />);
    expect(container.querySelector('section')).toHaveAttribute('data-array-id', 'root_tags');
  });

  /**
   * The legacy fork honoured `ui:options.container` / `itemsContainer` (MUI Grid
   * wrappers). The v5 template ignored them, so an array authored as a
   * responsive card grid (e.g. `core.MyApplications`'s `applications` with
   * `itemsContainerProps.size = { md: 6, lg: 4, xl: 4 }`) rendered each item
   * full-width and stacked. These lock in the mapping.
   */
  describe('legacy container / itemsContainer contract', () => {
    const gridUiSchema = {
      'ui:options': {
        container: 'Grid',
        containerProps: { container: true, spacing: 2 },
        itemsContainer: 'Grid',
        itemsContainerProps: { item: true, size: { xs: 12, md: 6, lg: 4, xl: 4 } },
      },
    };

    it('wraps each item in the configured items container', () => {
      const { container } = render(
        <ReactoryArrayFieldTemplate {...baseProps({ uiSchema: gridUiSchema })} />,
      );

      // One Grid item per array entry, carrying the responsive size classes.
      const items = container.querySelectorAll('.array-field-item');
      expect(items.length).toBe(2);
      items.forEach((item) => {
        expect(item.className).toContain('MuiGrid2-grid-md-6');
        expect(item.className).toContain('MuiGrid2-grid-lg-4');
      });
    });

    it('wraps the array in the configured container', () => {
      const { container } = render(
        <ReactoryArrayFieldTemplate {...baseProps({ uiSchema: gridUiSchema })} />,
      );

      // The Grid *container* is what makes the per-item `size` props lay out as a row.
      const gridContainer = container.querySelector('.MuiGrid2-container');
      expect(gridContainer).not.toBeNull();
      expect(gridContainer).toHaveAttribute('data-array-id', 'root_tags');
    });

    it('falls back to the ordered list when no itemsContainer is configured', () => {
      const { container } = render(<ReactoryArrayFieldTemplate {...baseProps()} />);

      expect(container.querySelector('ol.array-field-items')).not.toBeNull();
      expect(container.querySelector('.MuiGrid2-container')).toBeNull();
    });

    it('suppresses the title when ui:options.showTitle is false', () => {
      render(
        <ReactoryArrayFieldTemplate
          {...baseProps({ uiSchema: { 'ui:options': { showTitle: false } } })}
        />,
      );

      expect(screen.queryByText('Tags')).toBeNull();
    });
  });
});
