import React, { useState } from 'react';
import { render, act } from '@testing-library/react';
import { useContentRender } from '../useContentRender';

/**
 * `renderContent` is a plain function invoked during the caller's render, not a
 * component. Anything hook-shaped inside it therefore counts against the
 * caller's hook list — and because it returns early for empty content, a
 * caller that renders a loading state first and content second would change
 * its own hook count between renders. React responds by tearing the component
 * down, which manifests as content that simply never appears.
 *
 * These tests pin the invariant that makes that impossible: calling
 * renderContent zero, one, or many times in a render must never affect the
 * caller's hooks.
 */

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
    },
  },
  getComponents: () => ({
    Material: { MaterialCore: {}, MaterialIcons: {}, MaterialLabs: {} },
    Markdown: ({ children }: any) => <div data-testid="markdown">{children}</div>,
    MarkdownGfm: null,
    DOMPurify: { sanitize: (html: string) => html },
    PrismCode: null,
  }),
};

/**
 * Mirrors the real usage: a component that shows a placeholder until content
 * arrives, then renders it.
 */
const Host: React.FC<{ initialContent?: string }> = ({ initialContent = '' }) => {
  const { renderContent } = useContentRender(reactoryStub);
  const [content, setContent] = useState(initialContent);
  // A state hook declared *after* the renderContent call site is what makes a
  // stray hook inside renderContent corrupt the ordering.
  const [renders, setRenders] = useState(0);

  return (
    <div>
      <button type="button" onClick={() => setContent('# Loaded heading')}>
        load
      </button>
      <button type="button" onClick={() => setRenders((r) => r + 1)}>
        bump
      </button>
      <span data-testid="renders">{renders}</span>
      <div data-testid="body">{content ? renderContent(content) : <em>loading</em>}</div>
    </div>
  );
};

describe('useContentRender hook safety', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    // React reports hook-order violations through console.error before it
    // throws, so failures surface here even when a boundary swallows them.
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('survives the transition from no content to content', () => {
    const { getByText, getByTestId } = render(<Host />);
    expect(getByTestId('body').textContent).toContain('loading');

    act(() => {
      getByText('load').click();
    });

    expect(getByTestId('body').textContent).toContain('Loaded heading');
    const hookErrors = consoleError.mock.calls
      .map((args) => String(args[0]))
      .filter((message) => message.toLowerCase().includes('hook'));
    expect(hookErrors).toEqual([]);
  });

  it('keeps the caller re-renderable after content has been rendered', () => {
    const { getByText, getByTestId } = render(<Host initialContent="# Heading" />);

    act(() => {
      getByText('bump').click();
    });
    act(() => {
      getByText('bump').click();
    });

    expect(getByTestId('renders').textContent).toBe('2');
  });

  it('can be called more than once in a single render', () => {
    const Multi: React.FC = () => {
      const { renderContent } = useContentRender(reactoryStub);
      const [count] = useState(7);
      return (
        <div>
          <div data-testid="one">{renderContent('# First')}</div>
          <div data-testid="two">{renderContent('# Second')}</div>
          <span data-testid="count">{count}</span>
        </div>
      );
    };

    const { getByTestId } = render(<Multi />);
    expect(getByTestId('one').textContent).toContain('First');
    expect(getByTestId('two').textContent).toContain('Second');
    // The state hook after both call sites still holds its value, proving the
    // hook list was not shifted by the renderContent calls.
    expect(getByTestId('count').textContent).toBe('7');
  });
});
