import React from 'react';
import { render, waitFor } from '@testing-library/react';
import ChatList from '../hooks/useScrollToBottom';
import { UXChatMessage } from '../types';

/**
 * Lazy comment loading.
 *
 * ReactorChat used to request the comments for EVERY assistant message as soon as the
 * conversation rendered — one `getCommentsByContext` call per message, in a loop — which is
 * the server overload this guards against. Comments must now be requested only when a
 * message's block scrolls into view, and at most once per block.
 *
 * The visibility API is not available in jsdom, so these tests install a controllable
 * `IntersectionObserver` to drive intersection deterministically.
 */
jest.mock('../components/TextToSpeechButton', () => () => <button>TTS</button>);

jest.mock('@reactory/client-core/components/shared/Comments/Comments', () => ({
  Comments: (props: any) => (
    <div data-testid="reactory-comments" data-context-id={props.contextId}>
      <span>Comments Header: {props.title}</span>
    </div>
  ),
}));

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  public callback: IntersectionObserverCallback;
  public options?: IntersectionObserverInit;
  public observed = new Set<Element>();

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  observe(el: Element) { this.observed.add(el); }
  unobserve(el: Element) { this.observed.delete(el); }
  disconnect() { this.observed.clear(); }
  takeRecords() { return []; }

  get root() { return this.options?.root ?? null; }
  get rootMargin() { return this.options?.rootMargin ?? '0px'; }
  get thresholds() { return [0]; }

  /** Test helper: report the given elements as intersecting. */
  intersect(elements: Element[]) {
    this.callback(
      elements.map((target) => ({ isIntersecting: true, target } as unknown as IntersectionObserverEntry)),
      this as unknown as IntersectionObserver
    );
  }
}

const graphqlQuery = jest.fn().mockResolvedValue({
  data: { getCommentsByContext: { comments: [] } },
});

const mockReactory: any = {
  getUser: () => ({ loggedIn: { user: { id: 'user-1', firstName: 'Werner' } } }),
  getTheme: () => ({
    options: {
      palette: {
        mode: 'dark',
        primary: { main: '#4e79a7' },
        secondary: { main: '#f28e2b' },
        background: { paper: '#1e1e1e', default: '#121212' },
        text: { primary: '#ffffff', secondary: '#aaaaaa' },
      },
    },
  }),
  getComponents: () => ({
    React,
    Markdown: ({ children }: any) => <div>{children}</div>,
    Material: {
      MaterialCore: {
        Button: React.forwardRef((props: any, ref: any) => <button ref={ref} {...props} />),
        IconButton: React.forwardRef((props: any, ref: any) => <button ref={ref} {...props} />),
        Icon: (props: any) => <span>{props.children}</span>,
        TextField: (props: any) => <input {...props} />,
        Grid: (props: any) => <div>{props.children}</div>,
        Typography: (props: any) => <span>{props.children}</span>,
        Box: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props}>{props.children}</div>),
        List: (props: any) => <div>{props.children}</div>,
        // NOTE: forwards only `data-*` props so `data-comment-message-id` reaches the DOM —
        // that attribute is what the observer keys on — without leaking MUI-only props such
        // as `alignItems` onto the element.
        ListItem: (props: any) => {
          const dataProps = Object.fromEntries(
            Object.entries(props).filter(([key]) => key.startsWith('data-'))
          );
          return <div {...dataProps}>{props.children}</div>;
        },
        Menu: (props: any) => <div>{props.children}</div>,
        MenuItem: (props: any) => <div>{props.children}</div>,
        Paper: (props: any) => <div>{props.children}</div>,
        Avatar: (props: any) => <div>{props.children}</div>,
        Divider: (props: any) => <hr {...props} />,
      },
      MaterialIcons: {
        Edit: () => <span>Edit</span>,
        Send: () => <span>Send</span>,
        ArrowDropDown: () => <span>ArrowDropDown</span>,
        SmartToy: () => <span>SmartToy</span>,
        Person: () => <span>Person</span>,
      },
    },
  }),
  i18n: { t: (key: string, opts?: any) => opts?.defaultValue || key },
  graphqlQuery,
  on: jest.fn(),
  off: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  utils: { uuid: () => 'test-uuid' },
};

const userMsg: UXChatMessage = {
  id: 'msg-user-1',
  role: 'user',
  content: 'Explain neural architecture',
  timestamp: new Date(),
};

const assistantMsg1: UXChatMessage = {
  id: 'msg-assistant-1',
  role: 'assistant',
  content: 'First answer about the neural architecture.',
  timestamp: new Date(),
};

const assistantMsg2: UXChatMessage = {
  id: 'msg-assistant-2',
  role: 'assistant',
  content: 'Second answer about the neural architecture.',
  timestamp: new Date(),
};

const chatState: any = { id: 'session-test-1' };

const commentQueryFor = (messageId: string) => [
  expect.stringContaining('GetCommentsByContext'),
  expect.objectContaining({ contextId: `reactor_chat_session-test-1_${messageId}` }),
];

describe('ReactorChat lazy comment loading', () => {
  const originalIO = (global as any).IntersectionObserver;

  afterEach(() => {
    MockIntersectionObserver.instances = [];
    if (originalIO === undefined) delete (global as any).IntersectionObserver;
    else (global as any).IntersectionObserver = originalIO;
  });

  describe('when the visibility API is available', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (global as any).IntersectionObserver = MockIntersectionObserver;
    });

    it('does NOT request comments for any message on load (no eager fan-out)', async () => {
      const { container } = render(
        <ChatList reactory={mockReactory} messages={[userMsg, assistantMsg1, assistantMsg2]} chatState={chatState} />
      );

      // Blocks are rendered and marked for observation...
      await waitFor(() => {
        expect(container.querySelectorAll('[data-comment-message-id]').length).toBe(2);
      });

      // ...but nothing has been requested, because nothing has been seen.
      expect(graphqlQuery).not.toHaveBeenCalled();
    });

    it('requests comments for exactly the block that scrolls into view', async () => {
      const { container } = render(
        <ChatList reactory={mockReactory} messages={[userMsg, assistantMsg1, assistantMsg2]} chatState={chatState} />
      );

      await waitFor(() => {
        expect(container.querySelectorAll('[data-comment-message-id]').length).toBe(2);
      });

      const blocks = Array.from(container.querySelectorAll('[data-comment-message-id]'));
      const firstBlock = blocks.find((b) => b.getAttribute('data-comment-message-id') === 'msg-assistant-1')!;
      const secondBlock = blocks.find((b) => b.getAttribute('data-comment-message-id') === 'msg-assistant-2')!;
      expect(firstBlock).toBeDefined();
      expect(secondBlock).toBeDefined();

      // Only the first block becomes visible.
      MockIntersectionObserver.instances.forEach((io) => io.intersect([firstBlock]));

      await waitFor(() => {
        expect(graphqlQuery).toHaveBeenCalledWith(...commentQueryFor('msg-assistant-1'));
      });

      // The block that was NOT seen must not have been requested.
      const calledContextIds = graphqlQuery.mock.calls.map((c: any[]) => (c[1] as any).contextId);
      expect(calledContextIds).toContain('reactor_chat_session-test-1_msg-assistant-1');
      expect(calledContextIds).not.toContain('reactor_chat_session-test-1_msg-assistant-2');
    });

    it('requests a block only once, even if it re-intersects', async () => {
      const { container } = render(
        <ChatList reactory={mockReactory} messages={[userMsg, assistantMsg1]} chatState={chatState} />
      );

      await waitFor(() => {
        expect(container.querySelectorAll('[data-comment-message-id]').length).toBe(1);
      });

      const block = container.querySelector('[data-comment-message-id]')!;

      MockIntersectionObserver.instances.forEach((io) => io.intersect([block]));
      await waitFor(() => expect(graphqlQuery).toHaveBeenCalledTimes(1));

      graphqlQuery.mockClear();
      MockIntersectionObserver.instances.forEach((io) => io.intersect([block]));
      // Give any (incorrect) async fetch a chance to fire.
      await new Promise((r) => setTimeout(r, 0));
      expect(graphqlQuery).not.toHaveBeenCalled();
    });

    it('roots the observer at the chat scroll container with a prefetch margin', async () => {
      const { container } = render(
        <ChatList reactory={mockReactory} messages={[userMsg, assistantMsg1]} chatState={chatState} />
      );

      await waitFor(() => expect(container.querySelectorAll('[data-comment-message-id]').length).toBe(1));

      const io = MockIntersectionObserver.instances[0];
      expect(io).toBeDefined();
      // Rooted at the list, not the viewport, so visibility is relative to the scroll area.
      const block = container.querySelector('[data-comment-message-id]')!;
      expect(io.root).toBeTruthy();
      expect((io.root as Element).contains(block)).toBe(true);
      expect(io.options?.rootMargin).toBeTruthy();
    });
  });

  describe('when the visibility API is unavailable', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      delete (global as any).IntersectionObserver;
    });

    it('falls back to eager loading so comment counts are still shown', async () => {
      render(
        <ChatList reactory={mockReactory} messages={[userMsg, assistantMsg1]} chatState={chatState} />
      );

      await waitFor(() => {
        expect(graphqlQuery).toHaveBeenCalledWith(...commentQueryFor('msg-assistant-1'));
      });
    });
  });
});
