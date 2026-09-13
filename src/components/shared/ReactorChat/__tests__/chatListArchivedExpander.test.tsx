import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatList from '../hooks/useScrollToBottom';
import { UXChatMessage } from '../types';

jest.mock('../components/TextToSpeechButton', () => () => <button>TTS</button>);

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
        Grid: (props: any) => <div {...props} />,
        Typography: (props: any) => <span {...props} />,
        // Forward props so role/aria-label/onClick reach the DOM in tests.
        Box: ({ sx, ...rest }: any) => <div {...rest} />,
        List: (props: any) => <div {...props} />,
        ListItem: (props: any) => <div {...props} />,
        Menu: (props: any) => <div {...props} />,
        MenuItem: (props: any) => <div {...props} />,
        Paper: (props: any) => <div {...props} />,
        Avatar: (props: any) => <div {...props} />,
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
  getComponent: (name: string) => (props: any) => <div>{name}</div>,
  i18n: {
    t: (key: string, opts?: any) => opts?.defaultValue || key,
  },
  log: jest.fn(),
  error: jest.fn(),
  utils: {
    uuid: () => 'test-uuid',
  },
};

const makeMessages = (count: number): UXChatMessage[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    role: 'assistant',
    content: `message-${i}`,
    timestamp: new Date(2026, 0, 1, 0, 0, i),
  })) as UXChatMessage[];

/**
 * The "earlier, compacted" expander — decision 7's client affordance, and the
 * peer of "show earlier". Archived messages are excluded from the transcript by
 * default, so the control must be inert (and hidden) unless the server reports
 * displaced messages, and it must never fire while a load is in flight.
 */
describe('ChatList archived (compacted) expander', () => {
  it('offers no expander when the conversation has no archived messages', () => {
    render(
      <ChatList
        reactory={mockReactory}
        messages={makeMessages(10)}
        hasArchived={false}
        archivedCount={0}
        onLoadArchived={jest.fn()}
      />
    );

    expect(
      screen.queryByLabelText('Show earlier, compacted messages')
    ).not.toBeInTheDocument();
  });

  it('offers no expander when there is no loader to call', () => {
    render(
      <ChatList
        reactory={mockReactory}
        messages={makeMessages(10)}
        hasArchived
        archivedCount={12}
      />
    );

    expect(
      screen.queryByLabelText('Show earlier, compacted messages')
    ).not.toBeInTheDocument();
  });

  it('shows the archived count in the label when displaced messages exist', () => {
    render(
      <ChatList
        reactory={mockReactory}
        messages={makeMessages(10)}
        hasArchived
        archivedCount={1482}
        onLoadArchived={jest.fn()}
      />
    );

    expect(
      screen.getByText('Show earlier, compacted messages (1482)')
    ).toBeInTheDocument();
  });

  it('falls back to an unlabelled control when the count is unknown', () => {
    render(
      <ChatList
        reactory={mockReactory}
        messages={makeMessages(10)}
        hasArchived
        onLoadArchived={jest.fn()}
      />
    );

    expect(
      screen.getByText('Show earlier, compacted messages')
    ).toBeInTheDocument();
  });

  it('invokes the loader once per click', () => {
    const onLoadArchived = jest.fn();
    render(
      <ChatList
        reactory={mockReactory}
        messages={makeMessages(10)}
        hasArchived
        archivedCount={5}
        onLoadArchived={onLoadArchived}
      />
    );

    fireEvent.click(screen.getByLabelText('Show earlier, compacted messages'));
    expect(onLoadArchived).toHaveBeenCalledTimes(1);
  });

  it('does not re-invoke the loader while a load is in flight', () => {
    const onLoadArchived = jest.fn();
    render(
      <ChatList
        reactory={mockReactory}
        messages={makeMessages(10)}
        hasArchived
        archivedCount={5}
        loadingArchived
        onLoadArchived={onLoadArchived}
      />
    );

    // The label reports the in-flight state rather than a stale count.
    expect(
      screen.getByText('Loading compacted messages…')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Show earlier, compacted messages'));
    expect(onLoadArchived).not.toHaveBeenCalled();
  });

  it('supports keyboard activation', () => {
    const onLoadArchived = jest.fn();
    render(
      <ChatList
        reactory={mockReactory}
        messages={makeMessages(10)}
        hasArchived
        archivedCount={5}
        onLoadArchived={onLoadArchived}
      />
    );

    fireEvent.keyDown(
      screen.getByLabelText('Show earlier, compacted messages'),
      { key: 'Enter' }
    );
    expect(onLoadArchived).toHaveBeenCalledTimes(1);
  });

  it('is rendered above the transcript "show earlier" control, since it is older', () => {
    render(
      <ChatList
        reactory={mockReactory}
        messages={makeMessages(100)}
        hasServerEarlier
        onLoadEarlier={jest.fn()}
        hasArchived
        archivedCount={30}
        onLoadArchived={jest.fn()}
      />
    );

    const archived = screen.getByLabelText('Show earlier, compacted messages');
    const earlier = screen.getByLabelText('Show earlier messages');

    // DOCUMENT_POSITION_FOLLOWING means `earlier` comes after `archived`.
    expect(
      archived.compareDocumentPosition(earlier) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('keeps the two expanders independent', () => {
    const onLoadEarlier = jest.fn();
    const onLoadArchived = jest.fn();
    render(
      <ChatList
        reactory={mockReactory}
        messages={makeMessages(100)}
        hasServerEarlier
        onLoadEarlier={onLoadEarlier}
        hasArchived
        archivedCount={30}
        onLoadArchived={onLoadArchived}
      />
    );

    fireEvent.click(screen.getByLabelText('Show earlier, compacted messages'));
    expect(onLoadArchived).toHaveBeenCalledTimes(1);
    expect(onLoadEarlier).not.toHaveBeenCalled();
  });
});
