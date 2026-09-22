import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  useContentRender,
  isHtmlContent,
} from '../useContentRender';

/**
 * Inline fragment rendering.
 *
 * A grid column can carry markup in its `format` — the AI provider and model
 * grids emit `<strong>${rowData.name}</strong> (${rowData.id})` to bold the name
 * against its id. Those labels were bound to `core.LabelComponent@1.0.0`, which
 * rendered the computed string as plain text, so the cell read
 * `<strong>OpenAI</strong> (openai)`.
 *
 * Two gaps had to be closed for the shared renderer to fix it:
 *
 *  1. `isHtmlContent` only accepted a *whole* HTML document. A column format ends
 *     with a caption, so `<strong>OpenAI</strong> (openai)` did not qualify and
 *     fell through to the Markdown path — where react-markdown escapes raw HTML,
 *     so the tags would still have shown. `fragment` mode is the fix.
 *  2. `renderContent` emitted `<div>`s, which is invalid inside the `<Typography>`
 *     a label renders into. `inline` mode is the fix.
 *
 * The document pipeline must keep its old behaviour: a chat message that merely
 * mentions a tag is prose, not markup.
 */
describe('inline fragment rendering', () => {
  const reactoryStub: any = {
    muiTheme: { palette: { mode: 'light' } },
    log: jest.fn(),
    getComponent: () => null,
    getComponents: () => ({
      Material: { MaterialCore: {}, MaterialIcons: {}, MaterialLabs: {} },
      // Escapes raw HTML exactly as react-markdown does. If markup reaches this
      // component the tags appear as text, which is the bug being guarded.
      Markdown: ({ children }: any) => <div data-testid="markdown">{children}</div>,
      MarkdownGfm: null,
      DOMPurify: { sanitize: (html: string) => html },
      PrismCode: null,
    }),
  };

  const Host: React.FC<{ content: string; inline?: boolean }> = ({ content, inline }) => {
    const { renderContent } = useContentRender(reactoryStub);
    return <div data-testid="host">{renderContent(content, inline ? { inline: true } : undefined)}</div>;
  };

  describe('isHtmlContent fragment mode', () => {
    it('accepts markup mixed with a trailing caption', () => {
      // The exact column format shape.
      expect(isHtmlContent('<strong>OpenAI</strong> (openai)', { fragment: true })).toBe(true);
    });

    it('rejects that same string in document mode', () => {
      // Document mode is unchanged: a chat message mentioning a tag stays prose.
      expect(isHtmlContent('<strong>OpenAI</strong> (openai)')).toBe(false);
    });

    it('accepts simple inline tags', () => {
      expect(isHtmlContent('<b>Name</b>', { fragment: true })).toBe(true);
      expect(isHtmlContent('prefix <em>mid</em> suffix', { fragment: true })).toBe(true);
      expect(isHtmlContent('line<br/>break', { fragment: true })).toBe(true);
    });

    it('does not mistake a bare comparison for markup', () => {
      // "latency < 200ms" must stay text: there is no tag, only a `<`.
      expect(isHtmlContent('latency < 200ms', { fragment: true })).toBe(false);
      expect(isHtmlContent('1 < 2 and 3 > 2', { fragment: true })).toBe(false);
    });

    it('leaves markdown structure as markdown even when a tag is present', () => {
      expect(isHtmlContent('# Heading <strong>x</strong>', { fragment: true })).toBe(false);
      expect(isHtmlContent('- item <strong>x</strong>', { fragment: true })).toBe(false);
      expect(isHtmlContent('> quote <strong>x</strong>', { fragment: true })).toBe(false);
    });

    it('leaves plain text alone', () => {
      expect(isHtmlContent('Active', { fragment: true })).toBe(false);
      expect(isHtmlContent('', { fragment: true })).toBe(false);
    });
  });

  describe('renderContent with inline', () => {
    it('renders a mixed HTML fragment as real markup', () => {
      const { container } = render(
        <Host content="<strong>OpenAI</strong> (openai)" inline />
      );

      expect(screen.getByText('OpenAI').tagName).toBe('STRONG');
      // The literal tags must not survive as visible text.
      expect(container.textContent).toBe('OpenAI (openai)');
      expect(container.textContent).not.toContain('<strong>');
    });

    it('does not wrap an inline fragment in a block element', () => {
      // A <div> inside a Typography would be invalid nesting and would distort
      // the table cell.
      const { container } = render(<Host content="<strong>OpenAI</strong> (openai)" inline />);
      const host = container.querySelector('[data-testid="host"]');
      expect(host?.querySelector('div')).toBeNull();
      expect(host?.querySelector('span')).not.toBeNull();
    });

    it('still renders markup as HTML when not asked to be inline', () => {
      // The AI Usage budget table uses the same bold-name format inside a
      // MaterialTableWidget cell, which does not go through the label widget.
      const { container } = render(<Host content="<p>Hello <strong>world</strong></p>" />);
      expect(screen.getByText('world').tagName).toBe('STRONG');
      expect(container.textContent).not.toContain('<p>');
    });

    it('escapes a tag mentioned in prose when not asked to be inline', () => {
      // Document mode keeps treating this as markdown, so the markup is escaped
      // rather than executed. This is the behaviour fragment mode must not leak
      // into.
      const { container } = render(<Host content={'Use <strong>tags</strong> for emphasis.'} />);
      expect(container.querySelector('strong')).toBeNull();
    });

    it('treats a bare comparison as text in inline mode', () => {
      const { container } = render(<Host content="latency < 200ms" inline />);
      expect(container.textContent).toBe('latency < 200ms');
    });
  });

  describe('with no SDK available', () => {
    /**
     * `withReactory` injects the SDK from context and overwrites any prop, so a
     * component rendered outside a ReactoryProvider gets `null`. Reading
     * `getComponents` off that threw and blanked the subtree — a regression this
     * renderer would otherwise have introduced for every wrapped component.
     */
    const NoSdkHost: React.FC<{ content: string }> = ({ content }) => {
      const { renderContent } = useContentRender(null as any);
      return <div data-testid="no-sdk-host">{renderContent(content, { inline: true })}</div>;
    };

    it('degrades to escaped text instead of throwing', () => {
      const { container } = render(<NoSdkHost content="<strong>OpenAI</strong> (openai)" />);

      // Legible, and safely un-executed: no sanitizer means no HTML injection.
      expect(container.textContent).toBe('<strong>OpenAI</strong> (openai)');
      expect(container.querySelector('strong')).toBeNull();
    });

    it('returns null for empty content without touching the SDK', () => {
      expect(() => render(<NoSdkHost content="" />)).not.toThrow();
    });
  });
});
