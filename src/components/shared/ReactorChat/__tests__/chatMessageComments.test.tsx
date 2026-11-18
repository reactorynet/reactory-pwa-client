import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatList from '../hooks/useScrollToBottom';
import { UXChatMessage } from '../types';
import { getChatMessageCommentContextId, applyDomHighlights, ChatCommentHighlightItem } from '../utils';

// Mock TextToSpeechButton to isolate test scope
jest.mock('../components/TextToSpeechButton', () => () => <button>TTS</button>);

// Mock Comments component to verify props passed
jest.mock('@reactory/client-core/components/shared/Comments/Comments', () => ({
  Comments: (props: any) => (
    <div data-testid="reactory-comments" data-context-id={props.contextId} data-quote={props.selectedQuote || ''}>
      <span>Comments Header: {props.title}</span>
      {props.selectedQuote && (
        <button onClick={props.onClearQuote} data-testid="clear-quote-btn">Clear Quote</button>
      )}
      <button onClick={() => props.onCommentAdded?.({ id: 'new-c-1', text: 'New comment' })} data-testid="add-comment-btn">
        Add Comment
      </button>
    </div>
  ),
}));

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
        ListItem: (props: any) => <div>{props.children}</div>,
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
  i18n: {
    t: (key: string, opts?: any) => opts?.defaultValue || key,
  },
  graphqlQuery: jest.fn().mockResolvedValue({
    data: {
      getCommentsByContext: {
        comments: [
          {
            id: 'c-1',
            text: 'Great insight here',
            quote: 'neural architecture',
            who: { firstName: 'Werner' },
            removed: false,
          },
        ],
      },
    },
  }),
  on: jest.fn(),
  off: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  utils: {
    uuid: () => 'test-uuid',
  },
};

describe('ReactorChat Message Commenting & Annotation (Spec Implementation)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Comment Keying Convention', () => {
    it('generates the deterministic contextId format: reactor_chat_${sessionId}_${messageId}', () => {
      const sessionId = 'session-xyz-123';
      const messageId = 'msg-abc-456';
      const contextId = getChatMessageCommentContextId(sessionId, messageId);
      expect(contextId).toBe('reactor_chat_session-xyz-123_msg-abc-456');
    });
  });

  describe('In-Body DOM Highlighting (applyDomHighlights)', () => {
    it('safely wraps matching quote in mark tags with comment metadata', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>The neural architecture represents our core network.</p>';

      const comments: ChatCommentHighlightItem[] = [
        {
          id: 'comm-1',
          text: 'Comment text',
          quote: 'neural architecture',
          who: { firstName: 'Werner' },
        },
      ];

      const onCommentClick = jest.fn();
      applyDomHighlights(container, comments, undefined, onCommentClick);

      const mark = container.querySelector('mark.reactory-comment-highlight');
      expect(mark).not.toBeNull();
      expect(mark?.getAttribute('data-comment-id')).toBe('comm-1');
      expect(mark?.textContent).toBe('neural architecture');

      // Clicking invokes onCommentClick
      fireEvent.click(mark!);
      expect(onCommentClick).toHaveBeenCalledWith('comm-1');
    });

    it('sets active class and styling when activeCommentId matches', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>The neural architecture is active.</p>';

      const comments: ChatCommentHighlightItem[] = [
        {
          id: 'comm-1',
          quote: 'neural architecture',
        },
      ];

      applyDomHighlights(container, comments, 'comm-1');

      const mark = container.querySelector('mark.reactory-comment-highlight');
      expect(mark?.className).toContain('active');
    });

    it('removes existing marks cleanly before re-applying without duplicating text', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>The neural architecture is active.</p>';

      const comments: ChatCommentHighlightItem[] = [
        { id: 'comm-1', quote: 'neural architecture' },
      ];

      applyDomHighlights(container, comments);
      expect(container.querySelectorAll('mark.reactory-comment-highlight').length).toBe(1);

      // Re-apply with no comments
      applyDomHighlights(container, []);
      expect(container.querySelectorAll('mark.reactory-comment-highlight').length).toBe(0);
      expect(container.textContent).toContain('The neural architecture is active.');
    });

    it('ignores matches inside code and pre blocks', () => {
      const container = document.createElement('div');
      container.innerHTML = '<pre><code>const neural architecture = true;</code></pre>';

      const comments: ChatCommentHighlightItem[] = [
        { id: 'comm-1', quote: 'neural architecture' },
      ];

      applyDomHighlights(container, comments);
      expect(container.querySelector('mark.reactory-comment-highlight')).toBeNull();
    });
  });

  describe('ChatList Action Bar & Expandable Comments', () => {
    const userMsg: UXChatMessage = {
      id: 'msg-user-1',
      role: 'user',
      content: 'Explain neural architecture',
      timestamp: new Date(),
    };

    const assistantMsg: UXChatMessage = {
      id: 'msg-assistant-1',
      role: 'assistant',
      content: 'Here is an overview of the neural architecture for your project.',
      timestamp: new Date(),
    };

    const chatState: any = {
      id: 'session-test-1',
    };

    it('renders comment button in the assistant message action bar with count badge', async () => {
      render(
        <ChatList
          reactory={mockReactory}
          messages={[userMsg, assistantMsg]}
          chatState={chatState}
        />
      );

      // Wait for comments batch query to resolve
      await waitFor(() => {
        expect(mockReactory.graphqlQuery).toHaveBeenCalledWith(
          expect.stringContaining('GetCommentsByContext'),
          expect.objectContaining({
            context: 'ReactorChat',
            contextId: 'reactor_chat_session-test-1_msg-assistant-1',
          })
        );
      });

      // The button has aria-label="Comments (1)"
      const commentBtn = screen.getByLabelText(/Comments \(1\)/i);
      expect(commentBtn).toBeInTheDocument();
    });

    it('toggles the inline comments section when the comment button is clicked', async () => {
      render(
        <ChatList
          reactory={mockReactory}
          messages={[userMsg, assistantMsg]}
          chatState={chatState}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Comments/i })).toBeInTheDocument();
      });

      // Section is initially not mounted (unmountOnExit)
      expect(screen.queryByTestId('reactory-comments')).not.toBeInTheDocument();

      // Click to open
      const openBtn = screen.getByRole('button', { name: /Comments/i });
      fireEvent.click(openBtn);
      expect(screen.getByTestId('reactory-comments')).toBeInTheDocument();
      expect(screen.getByTestId('reactory-comments')).toHaveAttribute(
        'data-context-id',
        'reactor_chat_session-test-1_msg-assistant-1'
      );

      // Re-query the button after render and click again to close
      const closeBtn = screen.getByRole('button', { name: /Comments/i });
      fireEvent.click(closeBtn);
      await waitFor(() => {
        expect(screen.queryByTestId('reactory-comments')).not.toBeInTheDocument();
      });
    });

    it('supports drawer mode when commentLayout="drawer" is specified', async () => {
      render(
        <ChatList
          reactory={mockReactory}
          messages={[userMsg, assistantMsg]}
          chatState={chatState}
          commentLayout="drawer"
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Comments/i)).toBeInTheDocument();
      });

      const commentBtn = screen.getByLabelText(/Comments/i);
      fireEvent.click(commentBtn);

      // In drawer mode, drawer header "Message Comments" is displayed
      expect(screen.getByText('Message Comments')).toBeInTheDocument();
      expect(screen.getByTestId('reactory-comments')).toBeInTheDocument();
    });

    it('subscribes to AMQ comment events and re-fetches comments on updates', async () => {
      render(
        <ChatList
          reactory={mockReactory}
          messages={[userMsg, assistantMsg]}
          chatState={chatState}
        />
      );

      expect(mockReactory.on).toHaveBeenCalledWith('core.CommentAdded', expect.any(Function));
      expect(mockReactory.on).toHaveBeenCalledWith('core.CommentUpdated', expect.any(Function));
      expect(mockReactory.on).toHaveBeenCalledWith('core.CommentDeleted', expect.any(Function));

      // Trigger the AMQ callback
      const addedHandler = mockReactory.on.mock.calls.find((c: any) => c[0] === 'core.CommentAdded')?.[1];
      expect(addedHandler).toBeDefined();

      mockReactory.graphqlQuery.mockClear();
      addedHandler({ contextId: 'reactor_chat_session-test-1_msg-assistant-1' });

      expect(mockReactory.graphqlQuery).toHaveBeenCalledWith(
        expect.stringContaining('GetCommentsByContext'),
        expect.objectContaining({
          context: 'ReactorChat',
          contextId: 'reactor_chat_session-test-1_msg-assistant-1',
        })
      );
    });

    it('shows floating "Comment on selection" button when text in assistant message is selected, and pre-populates quote', async () => {
      const { container } = render(
        <ChatList
          reactory={mockReactory}
          messages={[userMsg, assistantMsg]}
          chatState={chatState}
        />
      );

      // Wait for comments to finish loading and DOM highlights to apply
      await waitFor(() => {
        expect(container.querySelector('.reactory-chat-message-body')).toBeInTheDocument();
      });

      const messageBody = container.querySelector('.reactory-chat-message-body') as HTMLElement;
      expect(messageBody).not.toBeNull();

      // Find an existing text node inside messageBody
      const walker = document.createTreeWalker(messageBody, NodeFilter.SHOW_TEXT);
      const targetTextNode = walker.nextNode() || messageBody;

      const mockRange = {
        getBoundingClientRect: () => ({
          top: 100,
          left: 50,
          width: 80,
          height: 20,
        }),
      };

      const mockSelection = {
        isCollapsed: false,
        toString: () => 'neural architecture',
        anchorNode: targetTextNode,
        focusNode: targetTextNode,
        containsNode: () => true,
        getRangeAt: () => mockRange,
        removeAllRanges: jest.fn(),
      };

      jest.spyOn(window, 'getSelection').mockReturnValue(mockSelection as any);

      // Trigger selection event
      fireEvent(document, new Event('selectionchange'));

      const commentBtn = await screen.findByText('Comment on selection');
      expect(commentBtn).toBeInTheDocument();

      // Click the floating comment button
      fireEvent.click(commentBtn);

      // Comments section is mounted and pre-populated with the selected quote
      await waitFor(() => {
        expect(screen.getByTestId('reactory-comments')).toBeInTheDocument();
        expect(screen.getByTestId('reactory-comments')).toHaveAttribute('data-quote', 'neural architecture');
      });

      // Clear quote clears the quote attribute
      fireEvent.click(screen.getByTestId('clear-quote-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('reactory-comments')).toHaveAttribute('data-quote', '');
      });
    });
  });
});
