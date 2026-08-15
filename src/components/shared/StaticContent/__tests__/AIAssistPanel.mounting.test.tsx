import React from 'react';
import { render, screen } from '@testing-library/react';
import AIAssistPanel from '../panels/AIAssistPanel';

/**
 * ReactorChat is a very large component tree. Profiling a typing session showed
 * it costing ~133ms of every ~145ms commit while the AI panel was *closed*,
 * because the panel's Drawer was declared `keepMounted`. That parked the whole
 * assistant inside the editor, where it re-rendered on every keystroke.
 *
 * These tests pin the two properties that keep it off the keystroke path:
 * nothing renders while the panel is closed, and the panel does not re-render
 * when unrelated props churn.
 */

let chatRenderCount = 0;

const StubReactorChat: React.FC<any> = ({ initialPrompt }) => {
  chatRenderCount += 1;
  return <div data-testid="reactor-chat">{initialPrompt}</div>;
};

const reactoryStub: any = {
  getComponents: () => ({ ReactorChat: StubReactorChat }),
  log: jest.fn(),
};

const baseProps = {
  reactory: reactoryStub,
  content: '# Body',
  format: 'markdown' as const,
  title: 'A title',
  currentLang: 'en',
  intent: 'improve' as const,
  onApply: jest.fn(),
  onClose: jest.fn(),
};

describe('AIAssistPanel mounting cost', () => {
  beforeEach(() => {
    chatRenderCount = 0;
  });

  it('renders nothing at all while closed', () => {
    const { container } = render(<AIAssistPanel {...baseProps} open={false} />);

    expect(container).toBeEmptyDOMElement();
    // The decisive assertion: the assistant must never have rendered.
    expect(chatRenderCount).toBe(0);
    expect(screen.queryByTestId('reactor-chat')).toBeNull();
  });

  it('mounts the assistant once opened', () => {
    render(<AIAssistPanel {...baseProps} open />);
    expect(screen.getByTestId('reactor-chat')).toBeInTheDocument();
    expect(chatRenderCount).toBeGreaterThan(0);
  });

  it('stays unmounted across re-renders of its host while closed', () => {
    const { rerender, container } = render(<AIAssistPanel {...baseProps} open={false} />);

    // Simulate the host re-rendering repeatedly, as it does per keystroke.
    for (let i = 0; i < 25; i += 1) {
      rerender(<AIAssistPanel {...baseProps} open={false} />);
    }

    expect(container).toBeEmptyDOMElement();
    expect(chatRenderCount).toBe(0);
  });

  it('does not re-render the assistant when the host re-renders with equal props', () => {
    const { rerender } = render(<AIAssistPanel {...baseProps} open />);
    const afterFirstOpen = chatRenderCount;
    expect(afterFirstOpen).toBeGreaterThan(0);

    // A memoised panel receiving the same prop values must not render again —
    // this is what keeps typing cheap while the panel is open.
    for (let i = 0; i < 25; i += 1) {
      rerender(<AIAssistPanel {...baseProps} open />);
    }

    expect(chatRenderCount).toBe(afterFirstOpen);
  });

  it('seeds the assistant with a prompt describing the request', () => {
    render(
      <AIAssistPanel
        {...baseProps}
        open
        intent="translate"
        targetLang="fr"
        content="Hello world"
      />
    );

    const chat = screen.getByTestId('reactor-chat');
    expect(chat.textContent).toContain('Hello world');
    expect(chat.textContent).toContain('French');
    // Component tags must survive the assistant's rewrite, so the prompt has to
    // say so explicitly.
    expect(chat.textContent).toContain('<reactory');
  });
});
