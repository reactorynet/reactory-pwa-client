import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ChatHistoryPanel from '../components/ChatHistoryPanel';
import { ChatState } from '../types';
import { CHAT_LIST_MAX_ROWS, CHAT_LIST_PAGE_SIZE, ChatListStatus, initialChatListStatus } from '../chatListQuery';

/**
 * ChatHistoryPanel — the user-facing half of REACTORY-302016408.
 *
 * Two defects are pinned here:
 *
 *   1. SEARCH. The field used to be hidden until "more +" had been clicked
 *      twice, it fired a request on every keystroke, and Enter was a no-op. The
 *      committed term is now list state (owned by `useChatFactory`), the field
 *      is always visible, Enter commits immediately and typing settles into a
 *      single debounced commit.
 *   2. PAGING. "more +" only expanded rows already in memory and vanished once
 *      expanded, so nothing signalled — or reached — conversations beyond the
 *      server's default 50. There is now a real "Load more", an explicit
 *      terminal state, and an honest message when the in-memory cap is hit.
 *
 * The Material surface is stubbed locally (rather than reusing the shared
 * `mockMaterial`) because this panel renders `ListItemText` with
 * `primary`/`secondary` props — those must reach the DOM for row assertions.
 */

const Passthrough = ({ sx, children, ...rest }: any) => <div {...rest}>{children}</div>;

const Typography = ({ sx, variant, color, noWrap, component, children, ...rest }: any) => {
  const Component: any = component || 'span';
  return <Component {...rest}>{children}</Component>;
};

const Button = ({ sx, variant, size, color, fullWidth, startIcon, children, ...rest }: any) => (
  <button type="button" {...rest}>
    {startIcon}
    {children}
  </button>
);

const IconButton = ({ sx, size, edge, color, children, ...rest }: any) => (
  <button type="button" {...rest}>{children}</button>
);

const ListItem = ({ sx, secondaryAction, children, ...rest }: any) => (
  <div {...rest}>
    {children}
    {secondaryAction}
  </div>
);

const ListItemText = ({ primary, secondary, disableTypography }: any) => (
  <div>
    <div data-testid="row-primary">{primary}</div>
    {secondary ? <div data-testid="row-secondary">{secondary}</div> : null}
  </div>
);

const Chip = ({ label, sx, variant, size, ...rest }: any) => <span {...rest}>{label}</span>;

const TextField = ({
  label,
  placeholder,
  value,
  onChange,
  onKeyDown,
  InputProps,
  inputProps,
  multiline,
  fullWidth,
  size,
  sx,
  ...rest
}: any) => (
  <div>
    {InputProps?.startAdornment}
    <input
      aria-label={label || inputProps?.['aria-label']}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      {...inputProps}
      {...rest}
    />
    {InputProps?.endAdornment}
  </div>
);

const Alert = ({ children, action, severity, sx }: any) => (
  <div role="alert">
    {children}
    {action}
  </div>
);

const CircularProgress = () => <span role="progressbar" aria-label="loading" />;

const icon = (name: string) => () => <span aria-hidden="true">{name}</span>;

const Material = {
  MaterialCore: {
    Paper: Passthrough,
    Box: Passthrough,
    Typography,
    Button,
    IconButton,
    List: Passthrough,
    ListItem,
    ListItemText,
    Chip,
    TextField,
    Alert,
    CircularProgress,
    useTheme: () => ({ palette: { mode: 'dark' } }),
  },
  MaterialIcons: {
    ArrowBack: icon('arrow_back'),
    Search: icon('search'),
    Clear: icon('clear'),
    Edit: icon('edit'),
    Delete: icon('delete'),
    SwapHoriz: icon('swap_horiz'),
  },
};

const il8n = {
  t: (_key: string, options: any = {}) => options.defaultValue ?? _key,
};

const chat = (id: string, title: string, personaId = 'persona-1'): ChatState =>
  ({
    id,
    title,
    personaId,
    created: new Date('2026-01-01T00:00:00.000Z'),
  } as ChatState);

const titles = (count: number) => Array.from({ length: count }, (_, i) => `Conversation ${i}`);

const chats = (count: number) => titles(count).map((title, i) => chat(`chat-${i}`, title));

/** Mount the panel with the minimum viable props. */
const renderPanel = (overrides: Record<string, any> = {}) => {
  const props: any = {
    open: true,
    onClose: jest.fn(),
    chats: [],
    chatState: undefined,
    getPersona: () => ({ id: 'persona-1', name: 'Reactor' } as any),
    onChatSelect: jest.fn(),
    onDeleteChat: jest.fn(),
    onSearch: jest.fn(),
    activeSearchTerm: '',
    onLoadMore: jest.fn(),
    onRetry: jest.fn(),
    listStatus: initialChatListStatus(),
    Material,
    il8n,
    ...overrides,
  };
  const utils = render(<ChatHistoryPanel {...props} />);
  return { ...utils, props };
};

const searchField = () => screen.getByPlaceholderText('Search conversations...');

const withStatus = (patch: Partial<ChatListStatus>): ChatListStatus => ({
  ...initialChatListStatus(),
  ...patch,
});

describe('ChatHistoryPanel — search affordance', () => {
  it('always renders the search field (no "more +" prerequisite)', () => {
    renderPanel({ chats: chats(2) });
    expect(searchField()).toBeInTheDocument();
  });

  it('renders the search field even with no rows at all', () => {
    renderPanel();
    expect(searchField()).toBeInTheDocument();
  });

  it('commits the term on Enter', () => {
    const onSearch = jest.fn();
    renderPanel({ onSearch });

    const input = searchField();
    fireEvent.change(input, { target: { value: 'Email Templates' } });
    expect(onSearch).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('Email Templates');
  });

  it('debounces typing to a single commit for the settled term', () => {
    jest.useFakeTimers();
    try {
      const onSearch = jest.fn();
      renderPanel({ onSearch });

      const input = searchField();
      fireEvent.change(input, { target: { value: 'E' } });
      fireEvent.change(input, { target: { value: 'Em' } });
      fireEvent.change(input, { target: { value: 'Ema' } });
      fireEvent.change(input, { target: { value: 'Email Templates' } });

      // Nothing is sent while the user is still typing: no N-concurrent-queries.
      expect(onSearch).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith('Email Templates');
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not re-issue a request for the term that is already committed', () => {
    const onSearch = jest.fn();
    renderPanel({ onSearch, activeSearchTerm: 'Email Templates' });

    fireEvent.keyDown(searchField(), { key: 'Enter' });

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('puts the cursor-independent clear control at the field and on the filter', () => {
    const onSearch = jest.fn();
    renderPanel({ onSearch, activeSearchTerm: 'Email Templates', chats: chats(2) });

    // Reset on the active-filter row.
    fireEvent.click(screen.getByText('Reset'));
    expect(onSearch).toHaveBeenCalledWith('');
  });

  it('clears on Escape', () => {
    const onSearch = jest.fn();
    renderPanel({ onSearch, activeSearchTerm: 'Email Templates', chats: chats(2) });

    fireEvent.keyDown(searchField(), { key: 'Escape' });
    expect(onSearch).toHaveBeenCalledWith('');
  });

  it('does not clobber keystrokes typed while a debounced commit lands', () => {
    jest.useFakeTimers();
    try {
      const onSearch = jest.fn();
      const { rerender, props } = renderPanel({ onSearch, activeSearchTerm: '' });

      const input = searchField();
      fireEvent.change(input, { target: { value: 'Email T' } });
      // The user keeps typing before the debounce fires, then the commit for
      // the shorter term lands: the field must keep what the user has typed
      // (resetting it to the committed prefix would eat "emplates" and move
      // the caret).
      fireEvent.change(input, { target: { value: 'Email Templates' } });
      rerender(<ChatHistoryPanel {...props} activeSearchTerm="Email T" />);

      expect(searchField()).toHaveValue('Email Templates');

      // Settle the pending debounce so no timer outlives the test.
      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(onSearch).toHaveBeenCalledWith('Email Templates');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('ChatHistoryPanel — committed term is displayed as the active filter', () => {
  it('shows the term and the number of matching conversations', () => {
    renderPanel({
      activeSearchTerm: 'Email Templates',
      chats: chats(3),
      listStatus: withStatus({ exhausted: true }),
    });

    expect(screen.getByTestId('chat-history-active-filter')).toBeInTheDocument();
    expect(screen.getByText('Filtering by "Email Templates"')).toBeInTheDocument();
    expect(screen.getByTestId('chat-history-match-count').textContent).toBe('3 matches');
  });

  it('reports an open-ended count until the list is known to be complete', () => {
    // The server returns no total, so while another page may exist the count is
    // "N+" rather than a total the panel cannot know.
    renderPanel({
      activeSearchTerm: 'Email Templates',
      chats: chats(3),
      listStatus: withStatus({ offset: 3, exhausted: false }),
    });

    expect(screen.getByTestId('chat-history-match-count').textContent).toBe('3+ matches');
  });

  it('says "No conversations match <term>" rather than "No chats found"', () => {
    renderPanel({
      activeSearchTerm: 'Email Templates',
      chats: [],
      listStatus: withStatus({ exhausted: true }),
    });

    expect(screen.getByText('No conversations match "Email Templates"')).toBeInTheDocument();
    expect(screen.queryByText('No chats found')).not.toBeInTheDocument();
  });

  it('keeps the generic empty text when no term is committed', () => {
    renderPanel({ chats: [], listStatus: withStatus({ exhausted: true }) });

    expect(screen.getByText('No chats found')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-history-active-filter')).not.toBeInTheDocument();
  });

  it('says the list is still updating while a replace is in flight over existing rows', () => {
    renderPanel({
      activeSearchTerm: 'Email Templates',
      chats: chats(3),
      listStatus: withStatus({ loading: true, offset: 3 }),
    });

    expect(screen.getByTestId('chat-history-updating')).toBeInTheDocument();
    // The rows stay on screen (no flash of an empty list) and the committed
    // term is displayed, so the transient state is unambiguous.
    expect(screen.getByText('Conversation 0')).toBeInTheDocument();
    expect(screen.getByText('Filtering by "Email Templates"')).toBeInTheDocument();
  });

  it('hides the updating hint once the request settles', () => {
    renderPanel({ chats: chats(3), listStatus: withStatus({ loading: false }) });
    expect(screen.queryByTestId('chat-history-updating')).not.toBeInTheDocument();
  });

  it('never renders the empty state over a load failure', () => {
    renderPanel({
      chats: [],
      listStatus: withStatus({ error: 'network is down' }),
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('No chats found')).not.toBeInTheDocument();
  });
});

describe('ChatHistoryPanel — paging affordances', () => {
  it('offers "Load more" while a full page is loaded and more may exist', () => {
    const onLoadMore = jest.fn();
    renderPanel({
      onLoadMore,
      chats: chats(CHAT_LIST_PAGE_SIZE),
      listStatus: withStatus({ offset: CHAT_LIST_PAGE_SIZE, exhausted: false }),
    });

    const button = screen.getByTestId('chat-history-load-more');
    expect(button).toBeInTheDocument();
    expect(screen.queryByTestId('chat-history-all-loaded')).not.toBeInTheDocument();

    fireEvent.click(button);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('renders an explicit terminal state once a short page has arrived', () => {
    renderPanel({
      chats: chats(26),
      listStatus: withStatus({ offset: 26, exhausted: true }),
    });

    expect(screen.getByTestId('chat-history-all-loaded')).toHaveTextContent('All conversations loaded');
    expect(screen.queryByTestId('chat-history-load-more')).not.toBeInTheDocument();
  });

  /**
   * The user-visible half of B2.
   *
   * A `preserveWindow` refresh (panel re-open, delete, chat-data edit) re-checks
   * the rows already loaded. Before the fix that request came back FULL, so the
   * hook republished `exhausted:false` and this footer flipped from
   * 'All conversations loaded' back to a 'Load more' button for a list that
   * could not grow — repeatable on every refresh.
   *
   * The panel's job is narrow and complete: whatever terminal state the status
   * reports must render as terminal, never as an affordance. This pins that for
   * both terminal shapes, from a state where 'Load more' is genuinely on screen
   * first, so the assertion cannot pass by accident.
   */
  it('renders the refreshed terminal state instead of putting "Load more" back', () => {
    const onLoadMore = jest.fn();
    const { rerender, props } = renderPanel({
      onLoadMore,
      chats: chats(CHAT_LIST_PAGE_SIZE),
      listStatus: withStatus({ offset: CHAT_LIST_PAGE_SIZE, exhausted: false }),
    });
    // Precondition: mid-paging, the affordance IS on screen.
    expect(screen.getByTestId('chat-history-load-more')).toBeInTheDocument();

    // Same rows after a preserveWindow refresh that proved there is nothing
    // older: the footer must be terminal.
    rerender(
      <ChatHistoryPanel
        {...props}
        chats={chats(CHAT_LIST_PAGE_SIZE)}
        listStatus={withStatus({ offset: CHAT_LIST_PAGE_SIZE, exhausted: true })}
      />,
    );

    expect(screen.getByTestId('chat-history-all-loaded')).toHaveTextContent('All conversations loaded');
    expect(screen.queryByTestId('chat-history-load-more')).not.toBeInTheDocument();
  });

  it('keeps the cap notice after a refresh at the row cap', () => {
    const onLoadMore = jest.fn();
    const { rerender, props } = renderPanel({
      onLoadMore,
      chats: chats(CHAT_LIST_MAX_ROWS),
      // Not yet known to be terminal, and not capped: this is the state where
      // the footer WOULD offer 'Load more'.
      listStatus: withStatus({ offset: CHAT_LIST_MAX_ROWS, exhausted: false }),
    });
    expect(screen.getByTestId('chat-history-load-more')).toBeInTheDocument();

    rerender(
      <ChatHistoryPanel
        {...props}
        chats={chats(CHAT_LIST_MAX_ROWS)}
        listStatus={withStatus({ offset: CHAT_LIST_MAX_ROWS, exhausted: true, capped: true })}
      />,
    );

    expect(screen.getByTestId('chat-history-capped').textContent).toContain(String(CHAT_LIST_MAX_ROWS));
    expect(screen.queryByTestId('chat-history-load-more')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chat-history-all-loaded')).not.toBeInTheDocument();
  });

  it('says so when the in-memory cap is reached instead of pretending the list ended', () => {
    renderPanel({
      chats: chats(10),
      listStatus: withStatus({ offset: CHAT_LIST_MAX_ROWS, exhausted: true, capped: true }),
    });

    expect(screen.getByTestId('chat-history-capped').textContent).toContain(
      String(CHAT_LIST_MAX_ROWS),
    );
    expect(screen.queryByTestId('chat-history-all-loaded')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chat-history-load-more')).not.toBeInTheDocument();
  });

  it('disables "Load more" while the next page is in flight', () => {
    const onLoadMore = jest.fn();
    renderPanel({
      onLoadMore,
      chats: chats(CHAT_LIST_PAGE_SIZE),
      listStatus: withStatus({ loadingMore: true, offset: CHAT_LIST_PAGE_SIZE }),
    });

    const button = screen.getByTestId('chat-history-load-more');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Loading more conversations…');

    fireEvent.click(button);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('renders no paging footer when there is nothing to page', () => {
    renderPanel({ chats: [], listStatus: withStatus({ exhausted: true }) });
    expect(screen.queryByTestId('chat-history-paging')).not.toBeInTheDocument();
  });
});

describe('ChatHistoryPanel — load failures', () => {
  it('shows an inline error with a retry instead of an empty list', () => {
    const onRetry = jest.fn();
    renderPanel({
      chats: [],
      onRetry,
      listStatus: withStatus({ error: 'network is down' }),
    });

    expect(screen.getByRole('alert').textContent).toContain('Conversations could not be loaded.');

    fireEvent.click(screen.getByTestId('chat-history-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps the loaded rows visible when a later page fails', () => {
    renderPanel({
      chats: chats(3),
      listStatus: withStatus({ error: 'network is down', offset: 25 }),
    });

    expect(screen.getByText('Conversation 0')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  /**
   * B1, panel half. After a failed REPLACE the rows on screen belong to the
   * previous query while the paging window describes the new one, so offering
   * "Load more" would splice two result sets together. Retry is the only valid
   * continuation — the hook refuses the append (`chatHistoryListState.test.tsx`
   * › 'B1: a failed replace blocks paging and Retry replaces'), and the panel
   * must not offer the control either.
   */
  it('hides "Load more" after a failed replace and keeps Retry as the only continuation', () => {
    const onLoadMore = jest.fn();
    const onRetry = jest.fn();
    renderPanel({
      chats: chats(CHAT_LIST_PAGE_SIZE),
      onLoadMore,
      onRetry,
      // A full page is loaded and the list is not exhausted, so the ONLY thing
      // suppressing the control is the error state.
      listStatus: withStatus({ error: 'invalid regex', offset: CHAT_LIST_PAGE_SIZE }),
    });

    expect(screen.queryByTestId('chat-history-load-more')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('chat-history-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});

describe('ChatHistoryPanel — per-persona collapse reconciled with paging', () => {
  it('collapses a group to five rows and reports how many are hidden', () => {
    renderPanel({ chats: chats(8) });

    expect(screen.getByText('Conversation 4')).toBeInTheDocument();
    expect(screen.queryByText('Conversation 7')).not.toBeInTheDocument();
    expect(screen.getByText('more + (3)')).toBeInTheDocument();
  });

  it('"more +" reveals rows that are already loaded', () => {
    renderPanel({ chats: chats(8) });

    fireEvent.click(screen.getByText('more + (3)'));

    titles(8).forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
    // The control stays meaningful: it can re-collapse instead of vanishing.
    expect(screen.getByTestId('chat-history-less-persona-1')).toBeInTheDocument();
  });

  it('a page appended while a group is expanded is never hidden', () => {
    const { rerender, props } = renderPanel({ chats: chats(8) });

    fireEvent.click(screen.getByText('more + (3)'));
    expect(screen.getByText('Conversation 7')).toBeInTheDocument();

    // Page 2 lands: 12 rows, same persona group.
    rerender(<ChatHistoryPanel {...props} chats={chats(12)} />);

    titles(12).forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
    expect(screen.queryByText(/more \+/)).not.toBeInTheDocument();
  });

  it('never hides search results behind a per-persona collapse', () => {
    renderPanel({ activeSearchTerm: 'Email Templates', chats: chats(8) });

    titles(8).forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
    expect(screen.queryByText(/more \+/)).not.toBeInTheDocument();
  });

  it('groups rows per persona and keeps the active persona first', () => {
    renderPanel({
      chats: [
        chat('a-1', 'Other agent conversation', 'persona-2'),
        chat('b-1', 'Active agent conversation', 'persona-1'),
      ],
      chatState: { id: 'b-1', personaId: 'persona-1', history: [] } as any,
      getPersona: (id: string) => ({ id, name: id === 'persona-1' ? 'Active Agent' : 'Other Agent' } as any),
    });

    const active = screen.getByText('Active Agent');
    const other = screen.getByText('Other Agent');
    expect(active.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
