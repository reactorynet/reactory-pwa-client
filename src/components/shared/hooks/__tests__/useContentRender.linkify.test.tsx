import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  useContentRender,
  linkifyHtml,
  splitTextLinks,
  trimUrlToken,
  remarkAutoLink,
} from '../useContentRender';

/**
 * URL auto-linking.
 *
 * `useContentRender` is the single renderer behind support-ticket comments,
 * articles, AI messages and grid labels. Authors paste bare URLs far more often
 * than they write markdown links or `<a>` tags, so a URL used to survive as
 * inert text in both the markdown and the HTML pipeline.
 *
 * The contract held here:
 *  - a bare `https://…` / `www.…` in prose becomes a link (opens in a new tab);
 *  - text that is already a link is left exactly as it is (no nesting);
 *  - code (`<code>`, `<pre>`, fenced blocks) and attributes are never touched;
 *  - trailing sentence punctuation is not swallowed into the href.
 */

const reactoryStub: any = {
  muiTheme: { palette: { mode: 'light' } },
  log: jest.fn(),
  getComponent: () => null,
  getComponents: () => ({
    Material: { MaterialCore: {}, MaterialIcons: {}, MaterialLabs: {} },
    // react-markdown is ESM-only and not transformed by this jest config, so the
    // suite uses a double. It records the props it receives, which is how the
    // wiring test proves the auto-link plugin reaches the markdown pipeline.
    Markdown: ({ children, ...props }: any) => {
      lastMarkdownProps = props;
      return <div data-testid="markdown">{children}</div>;
    },
    MarkdownGfm: null,
    DOMPurify: { sanitize: (html: string) => html },
    PrismCode: null,
  }),
};

let lastMarkdownProps: any = null;

beforeEach(() => {
  lastMarkdownProps = null;
});

const Host: React.FC<{ content: string; inline?: boolean }> = ({ content, inline }) => {
  const { renderContent } = useContentRender(reactoryStub);
  return <div data-testid="host">{renderContent(content, inline ? { inline: true } : undefined)}</div>;
};

describe('URL tokenising', () => {
  it('splits prose into text and link parts', () => {
    const parts = splitTextLinks('Read https://example.com/docs now');

    expect(parts).toEqual([
      { type: 'text', value: 'Read ' },
      { type: 'link', value: 'https://example.com/docs', href: 'https://example.com/docs' },
      { type: 'text', value: ' now' },
    ]);
  });

  it('gives a scheme-less www host an https href but keeps the display text', () => {
    const parts = splitTextLinks('go to www.example.com');
    const link = parts.find((part) => part.type === 'link');

    expect(link).toBeDefined();
    expect(link?.value).toBe('www.example.com');
    expect(link?.href).toBe('https://www.example.com');
  });

  it('excludes trailing sentence punctuation from the href', () => {
    const parts = splitTextLinks('See https://example.com/a?b=1, then leave.');

    expect(parts.filter((part) => part.type === 'link')).toEqual([
      { type: 'link', value: 'https://example.com/a?b=1', href: 'https://example.com/a?b=1' },
    ]);
    // The comma and the remainder of the sentence stay as text.
    expect(parts[parts.length - 1]).toEqual({ type: 'text', value: ', then leave.' });
  });

  it('keeps balanced brackets but drops the wrapping one', () => {
    expect(trimUrlToken('https://example.com/a_(b)')).toBe('https://example.com/a_(b)');
    expect(trimUrlToken('https://example.com/a_(b))')).toBe('https://example.com/a_(b)');
  });

  it('ignores tokens that are not real URLs', () => {
    const parts = splitTextLinks('the prefix https:// is not a url');
    expect(parts.some((part) => part.type === 'link')).toBe(false);
  });

  it('keeps a token whose URL cannot be parsed as text', () => {
    // Matches the pattern (scheme + chars) but `new URL()` rejects it. The token
    // must survive verbatim in the surrounding text rather than being dropped.
    const source = 'broken https://: here';
    const parts = splitTextLinks(source);

    expect(parts).toEqual([{ type: 'text', value: source }]);
  });
});

describe('remarkAutoLink (markdown pipeline)', () => {
  const tree = () => ({
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', value: 'Read https://example.com/docs' }],
      },
    ],
  });

  it('rewrites bare URLs in text nodes into link nodes', () => {
    const ast: any = tree();
    remarkAutoLink()(ast);

    expect(ast.children[0].children).toEqual([
      { type: 'text', value: 'Read ' },
      {
        type: 'link',
        url: 'https://example.com/docs',
        title: null,
        children: [{ type: 'text', value: 'https://example.com/docs' }],
      },
    ]);
  });

  it('does not touch text inside an existing markdown link', () => {
    const ast: any = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'link',
              url: 'https://example.com',
              title: null,
              children: [{ type: 'text', value: 'https://example.com' }],
            },
          ],
        },
      ],
    };

    remarkAutoLink()(ast);

    // Still one link node; no nested link was produced.
    expect(ast.children[0].children).toHaveLength(1);
    expect(ast.children[0].children[0].type).toBe('link');
    expect(ast.children[0].children[0].url).toBe('https://example.com');
  });

  it('satisfies the unified plugin contract react-markdown relies on', () => {
    // react-markdown 8 feeds each remarkPlugins entry to `processor.use()`,
    // which calls `plugin.call(processor, ...options)` and expects either
    // nothing or a transformer function. Asserting that shape here is what the
    // stub-based wiring test cannot do: it catches a plugin that is a bare
    // transformer (react-markdown would ignore its return value) or one that
    // needs options it is never given.
    const processorStub = {};
    const transformer = (remarkAutoLink as any).call(processorStub);

    expect(typeof transformer).toBe('function');

    const ast: any = tree();
    transformer(ast);

    expect(ast.children[0].children[1].type).toBe('link');
    expect(ast.children[0].children[1].url).toBe('https://example.com/docs');
  });

  it('returns a fresh transformer per invocation so parser state cannot leak', () => {
    const first = remarkAutoLink();
    const second = remarkAutoLink();

    expect(typeof first).toBe('function');
    expect(typeof second).toBe('function');
    expect(first).not.toBe(second);
  });

  it('leaves a URL-free text node untouched, preserving node identity', () => {
    const textNode = { type: 'text', value: 'no links in this sentence' };
    const ast: any = { type: 'root', children: [{ type: 'paragraph', children: [textNode] }] };

    remarkAutoLink()(ast);

    // Same object, not a clone: the walk must not rebuild untouched subtrees.
    expect(ast.children[0].children[0]).toBe(textNode);
    expect(ast.children[0].children).toHaveLength(1);
  });

  it('leaves inline code and fenced code text alone', () => {
    const ast: any = {
      type: 'root',
      children: [
        { type: 'inlineCode', value: 'https://example.com' },
        { type: 'code', value: 'curl https://example.com' },
      ],
    };

    remarkAutoLink()(ast);

    expect(ast.children[0]).toEqual({ type: 'inlineCode', value: 'https://example.com' });
    expect(ast.children[1]).toEqual({ type: 'code', value: 'curl https://example.com' });
  });
});

describe('renderContent wiring', () => {
  it('passes the auto-link remark plugin to the markdown renderer', () => {
    render(<Host content={'Read https://example.com/docs'} />);

    expect(lastMarkdownProps).not.toBeNull();
    expect(lastMarkdownProps.remarkPlugins).toContain(remarkAutoLink);
  });

  it('passes the auto-link remark plugin in inline mode too', () => {
    render(<Host content={'Read https://example.com/docs'} inline />);

    expect(lastMarkdownProps).not.toBeNull();
    expect(lastMarkdownProps.remarkPlugins).toContain(remarkAutoLink);
  });
});

describe('linkifyHtml (HTML pipeline)', () => {
  it('turns a bare URL in HTML prose into a new-tab link', () => {
    const html = linkifyHtml('<p>Docs live at https://example.com/docs for now</p>');

    expect(html).toContain('<a href="https://example.com/docs"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('>https://example.com/docs</a>');
  });

  it('does not wrap an anchor that already exists', () => {
    const html = linkifyHtml('<p><a href="https://example.com">https://example.com</a></p>');

    expect(html).toBe('<p><a href="https://example.com">https://example.com</a></p>');
  });

  it('does not linkify code or pre content', () => {
    const html = linkifyHtml(
      '<p>run <code>curl https://example.com</code></p><pre>https://example.com</pre>'
    );

    expect(html).not.toContain('<a ');
  });

  it('does not linkify URLs that only appear in attributes', () => {
    const html = linkifyHtml('<img src="https://example.com/logo.png" alt="logo" />');

    expect(html).not.toContain('<a ');
  });

  it('preserves a full document shape while linking body prose', () => {
    const html = linkifyHtml(
      '<!DOCTYPE html><html><head><title>https://example.com</title></head>' +
        '<body><p>Docs: https://example.com</p></body></html>'
    );

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<head>');
    // `<title>` is metadata, not prose — its URL must stay text.
    expect(html).toContain('<title>https://example.com</title>');
    expect(html).toContain('<a href="https://example.com"');
  });

  it('returns the input unchanged when no DOM parser is available', () => {
    // Guards the SSR path: the hook must not throw where DOMParser is absent.
    const original = global.DOMParser;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).DOMParser;

    try {
      expect(typeof DOMParser).toBe('undefined');
      const source = '<p>Docs: https://example.com</p>';
      expect(linkifyHtml(source)).toBe(source);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).DOMParser = original;
    }
  });

  it('leaves HTML without URLs byte-for-byte unchanged', () => {
    const source = '<p>No links <strong>here</strong></p>';
    expect(linkifyHtml(source)).toBe(source);
  });
});

describe('renderContent HTML output', () => {
  it('renders a bare URL inside an HTML document as a link', () => {
    const { container } = render(<Host content="<p>Docs: https://example.com/docs</p>" />);

    const anchor = container.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor).toHaveAttribute('href', 'https://example.com/docs');
    expect(anchor).toHaveAttribute('target', '_blank');
    expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
    expect(anchor?.textContent).toBe('https://example.com/docs');
  });

  it('renders a bare URL inside an inline HTML fragment as a link', () => {
    const { container } = render(
      <Host content="<strong>Docs</strong> https://example.com/docs" inline />
    );

    const anchor = container.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor).toHaveAttribute('href', 'https://example.com/docs');
  });

  it('does not create a second link around an existing anchor', () => {
    const { container } = render(
      <Host content={'<p><a href="https://example.com">Example</a> and https://other.example.org</p>'} />
    );

    const anchors = container.querySelectorAll('a');
    expect(anchors).toHaveLength(2);
    expect(anchors[0].getAttribute('href')).toBe('https://example.com');
    expect(anchors[1].getAttribute('href')).toBe('https://other.example.org');
  });
});
