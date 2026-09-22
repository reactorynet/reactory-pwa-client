import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LabelComponent from '../LabelWidget';
import { ReactoryProvider } from '@reactory/client-core/api/ApiProvider';

/**
 * `core.LabelComponent@1.0.0` and HTML in a column format.
 *
 * The AI provider and model grids bind their Name column to this component with
 * a format of `<strong>${rowData.name}</strong> (${rowData.id})`, expecting the
 * name to be bold against its id. The computed string was injected as a text
 * node, so the cell displayed the tags themselves:
 *
 *     <strong>OpenAI</strong> (openai)
 *
 * These tests use the exact prop shape the MaterialTableWidget passes to a
 * column component — `formData`, `rowData`, `api`, `reactory` and the column's
 * own `props.uiSchema` — so they fail if that binding stops rendering markup.
 */

const reactoryStub: any = {
  muiTheme: { palette: { mode: 'light' } },
  log: jest.fn(),
  createNotification: jest.fn(),
  $func: {},
  utils: { objectMapper: jest.fn(() => ({})) },
  getComponent: () => null,
  getComponents: () => ({
    Material: { MaterialCore: {}, MaterialIcons: {}, MaterialLabs: {} },
    // Escapes raw HTML, as react-markdown does.
    Markdown: ({ children }: any) => <div data-testid="markdown">{children}</div>,
    MarkdownGfm: null,
    DOMPurify: { sanitize: (html: string) => html },
    PrismCode: null,
  }),
};

/** The prop shape MaterialTableWidget builds for a column with `component`. */
const columnProps = (format: string, rowData: Record<string, any>) => ({
  formData: rowData[Object.keys(rowData)[0]],
  rowData,
  api: reactoryStub,
  reactory: reactoryStub,
  cellData: rowData,
  cellIndex: 0,
  rowIndex: 0,
  schema: { type: 'string', title: 'Name' },
  uiSchema: {
    'ui:options': {
      variant: 'body2',
      format,
    },
  },
});

const renderLabel = (props: any) =>
  render(
    <ReactoryProvider reactory={reactoryStub}>
      <LabelComponent {...props} />
    </ReactoryProvider>
  );

// The exact format string the AI providers and models grids use.
const PROVIDER_NAME_FORMAT = '<strong>${rowData.name}</strong> (${rowData.id})';

describe('LabelComponent HTML labels', () => {
  it('renders a bold name instead of literal tags', () => {
    const { container } = renderLabel(
      columnProps(PROVIDER_NAME_FORMAT, { name: 'OpenAI', id: 'openai' })
    );

    expect(screen.getByText('OpenAI').tagName).toBe('STRONG');
    expect(container.textContent).toContain('(openai)');
    // The regression: the tags were rendered as visible characters.
    expect(container.textContent).not.toContain('<strong>');
    expect(container.textContent).not.toContain('</strong>');
  });

  it('keeps the surrounding caption outside the bold element', () => {
    const { container } = renderLabel(
      columnProps(PROVIDER_NAME_FORMAT, { name: 'Anthropic', id: 'anthropic' })
    );

    const strong = container.querySelector('strong');
    expect(strong?.textContent).toBe('Anthropic');
  });

  it('does not emit a block element inside the label typography', () => {
    // renderContent used to wrap everything in <div>s, which is invalid nesting
    // inside a Typography and distorts the table cell. The content must render
    // inline: a <span> wrapper and no block descendant.
    const { container } = renderLabel(
      columnProps(PROVIDER_NAME_FORMAT, { name: 'Google', id: 'google' })
    );

    const typography = container.querySelector('p');
    expect(typography).not.toBeNull();
    expect(typography?.querySelector('span.reactor-html-content')).not.toBeNull();
    expect(typography?.querySelector('div')).toBeNull();
  });
  it('leaves a plain-text label untouched', () => {
    // Every ordinary form label takes this path; it must not change, and must
    // not gain a markdown/HTML wrapper.
    const { container } = renderLabel(
      columnProps('${rowData.providerType || rowData.id}', { providerType: 'openai' })
    );

    expect(container.textContent).toBe('openai');
    expect(container.querySelector('strong')).toBeNull();
    expect(screen.queryByTestId('markdown')).toBeNull();
  });

  it('still renders a boolean label from the yes/no options', () => {
    const { container } = render(
      <ReactoryProvider reactory={reactoryStub}>
        <LabelComponent
          formData={true}
          reactory={reactoryStub}
          api={reactoryStub}
          schema={{ type: 'boolean', title: 'Active' }}
          uiSchema={{ 'ui:options': { yesLabel: 'Active', noLabel: 'Disabled' } }}
        />
      </ReactoryProvider>
    );

    expect(container.textContent).toBe('Active');
  });

  it('honours renderHtml by rendering the markup, sanitized', () => {
    const { container } = renderLabel(
      columnProps('${rowData.label}', { label: 'Hello <em>world</em>' })
    );

    const props = columnProps('${rowData.label}', { label: 'Hello <em>world</em>' });
    props.uiSchema['ui:options']['renderHtml'] = true;

    const rendered = render(
      <ReactoryProvider reactory={reactoryStub}>
        <LabelComponent {...props} />
      </ReactoryProvider>
    );

    // Both mounts are asserted: the first shows the auto-detected fragment path
    // renders markup too, without the explicit opt-in.
    expect(rendered.container.querySelector('em')?.textContent).toBe('world');
    expect(container.querySelector('em')?.textContent).toBe('world');
    expect(rendered.container.textContent).not.toContain('<em>');
  });
});
