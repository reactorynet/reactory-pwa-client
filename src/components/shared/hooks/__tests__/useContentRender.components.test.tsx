import React from 'react';
import { render, screen } from '@testing-library/react';
import { useContentRender } from '../useContentRender';

/**
 * Component mounting used to work by substituting each `<reactory />` tag for a
 * `<div id="...">` placeholder and later portalling into it via
 * getElementById. That only holds for pipelines that emit raw HTML.
 * react-markdown escapes raw HTML, so in a markdown document the placeholder
 * was rendered as the literal text `<div id="...">` and the portal had nothing
 * to attach to — the component simply never appeared.
 *
 * Components are now lifted out of the source before any markup pipeline runs
 * and rendered as real React elements. These tests hold that line for every
 * content format.
 */

const Label: React.FC<any> = ({ text, count, active }) => (
  <span data-testid="label">
    {text}
    {count !== undefined ? `|count:${count}:${typeof count}` : ''}
    {active !== undefined ? `|active:${active}:${typeof active}` : ''}
  </span>
);

const Panel: React.FC<any> = ({ children }) => <section data-testid="panel">{children}</section>;

const registry: Record<string, React.FC<any>> = {
  'core.Label@1.0.0': Label,
  'core.Panel@1.0.0': Panel,
};

const reactoryStub: any = {
  muiTheme: {
    palette: {
      mode: 'light',
      primary: { main: '#1976d2' },
      secondary: { main: '#9c27b0' },
      error: { main: '#d32f2f' },
      warning: { main: '#ed6c02' },
      info: { main: '#0288d1' },
      success: { main: '#2e7d32' },
      text: { secondary: '#666' },
    },
  },
  log: jest.fn(),
  getComponent: (fqn: string) => registry[fqn] || null,
  getComponents: () => ({
    Material: { MaterialCore: {}, MaterialIcons: {}, MaterialLabs: {} },
    // Stands in for react-markdown, which is ESM-only and cannot be imported
    // under this jest transform. Escaping raw HTML the way react-markdown does
    // is the behaviour that matters here.
    Markdown: ({ children }: any) => <div data-testid="markdown">{children}</div>,
    MarkdownGfm: null,
    DOMPurify: { sanitize: (html: string) => html },
    PrismCode: null,
  }),
};

const Host: React.FC<{ content: string }> = ({ content }) => {
  const { renderContent } = useContentRender(reactoryStub);
  return <div data-testid="host">{renderContent(content)}</div>;
};

describe('component mounting through useContentRender', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('markdown content', () => {
    it('mounts a component embedded in a markdown document', () => {
      render(
        <Host content={'# Heading\n\n<reactory reactory-component="core.Label@1.0.0" reactory-props-text="Mounted" />\n\nTrailing prose.'} />
      );
      expect(screen.getByTestId('label')).toHaveTextContent('Mounted');
    });

    it('does not leak the tag as visible text', () => {
      render(
        <Host content={'# Heading\n\n<reactory reactory-component="core.Label@1.0.0" reactory-props-text="Mounted" />'} />
      );
      // The original symptom: the placeholder rendered as literal markup.
      expect(screen.getByTestId('host').textContent).not.toContain('<div');
      expect(screen.getByTestId('host').textContent).not.toContain('<reactory');
    });

    it('keeps the surrounding markdown intact', () => {
      render(
        <Host content={'Before text\n\n<reactory reactory-component="core.Label@1.0.0" reactory-props-text="X" />\n\nAfter text'} />
      );
      const host = screen.getByTestId('host').textContent || '';
      expect(host).toContain('Before text');
      expect(host).toContain('After text');
    });

    it('mounts several components in one document', () => {
      render(
        <Host content={'<reactory reactory-component="core.Label@1.0.0" reactory-props-text="one" />\n\nmiddle\n\n<reactory reactory-component="core.Label@1.0.0" reactory-props-text="two" />'} />
      );
      const labels = screen.getAllByTestId('label');
      expect(labels).toHaveLength(2);
      expect(labels[0]).toHaveTextContent('one');
      expect(labels[1]).toHaveTextContent('two');
    });
  });

  describe('html content', () => {
    it('mounts a component alongside html markup', () => {
      render(
        <Host content={'<p>Some html</p><reactory reactory-component="core.Label@1.0.0" reactory-props-text="FromHtml" />'} />
      );
      expect(screen.getByTestId('label')).toHaveTextContent('FromHtml');
      expect(screen.getByTestId('host').textContent).toContain('Some html');
    });
  });

  describe('plain text content', () => {
    it('mounts a component in an otherwise plain body', () => {
      render(
        <Host content={'Just words.\n<reactory reactory-component="core.Label@1.0.0" reactory-props-text="FromText" />\nMore words.'} />
      );
      expect(screen.getByTestId('label')).toHaveTextContent('FromText');
    });
  });

  describe('props', () => {
    it('passes typed props through with their types intact', () => {
      render(
        <Host content={'<reactory reactory-component="core.Label@1.0.0" reactory-props-text="t" reactory-props-count="int:7" reactory-props-active="bool:true" />'} />
      );
      const label = screen.getByTestId('label');
      expect(label).toHaveTextContent('count:7:number');
      expect(label).toHaveTextContent('active:true:boolean');
    });

    it('passes the body of a paired tag as children', () => {
      render(<Host content={'<reactory reactory-component="core.Panel@1.0.0">panel body</reactory>'} />);
      expect(screen.getByTestId('panel')).toHaveTextContent('panel body');
    });
  });

  describe('unregistered components', () => {
    it('shows a visible marker rather than a blank space', () => {
      render(<Host content={'<reactory reactory-component="core.DoesNotExist@1.0.0" />'} />);
      expect(screen.getByTestId('host').textContent).toContain('core.DoesNotExist@1.0.0');
    });

    it('logs which component is missing', () => {
      render(<Host content={'<reactory reactory-component="core.DoesNotExist@1.0.0" />'} />);
      expect(reactoryStub.log).toHaveBeenCalledWith(
        expect.stringContaining('core.DoesNotExist@1.0.0'),
        {},
        'warning'
      );
    });
  });

  describe('content without components', () => {
    it('renders normally and mounts nothing', () => {
      render(<Host content={'# Just a heading\n\nAnd a paragraph.'} />);
      expect(screen.queryByTestId('label')).toBeNull();
      expect(screen.getByTestId('host').textContent).toContain('Just a heading');
    });

    it('terminates on content that only looks like a tag', () => {
      // Guards the infinite loop that a shared /g regex caused: a malformed tag
      // rewound the scan and the page hung.
      render(<Host content={'<reactory not-a-real-tag'} />);
      expect(screen.getByTestId('host')).toBeInTheDocument();
    });
  });
});
