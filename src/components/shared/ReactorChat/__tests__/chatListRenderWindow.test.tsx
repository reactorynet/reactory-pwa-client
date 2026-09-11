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

/**
 * Assistant messages with plain content map one-to-one onto 'response'
 * display items, so display-item count tracks message count exactly.
 */
const makeMessages = (count: number): UXChatMessage[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    role: 'assistant',
    content: `message-${i}`,
    timestamp: new Date(2026, 0, 1, 0, 0, i),
  })) as UXChatMessage[];

describe('ChatList render window', () => {
  it('renders only the trailing window by default and preserves the newest message', () => {
    render(<ChatList reactory={mockReactory} messages={makeMessages(100)} />);

    // Newest is always rendered.
    expect(screen.getByText('message-99')).toBeInTheDocument();
    // 100 items, default window 60 -> oldest 40 hidden.
    expect(screen.getByText('message-40')).toBeInTheDocument();
    expect(screen.queryByText('message-39')).not.toBeInTheDocument();
    expect(screen.queryByText('message-0')).not.toBeInTheDocument();
  });

  it('reports how many earlier messages are hidden', () => {
    render(<ChatList reactory={mockReactory} messages={makeMessages(100)} />);

    expect(screen.getByText('Show earlier messages (40)')).toBeInTheDocument();
  });

  it('renders every message and no control when the history fits in the window', () => {
    render(<ChatList reactory={mockReactory} messages={makeMessages(40)} />);

    expect(screen.getByText('message-0')).toBeInTheDocument();
    expect(screen.getByText('message-39')).toBeInTheDocument();
    expect(screen.queryByLabelText('Show earlier messages')).not.toBeInTheDocument();
  });

  it('honours a custom maxRenderedItems', () => {
    render(
      <ChatList reactory={mockReactory} messages={makeMessages(30)} maxRenderedItems={10} />
    );

    expect(screen.getByText('message-29')).toBeInTheDocument();
    expect(screen.getByText('message-20')).toBeInTheDocument();
    expect(screen.queryByText('message-19')).not.toBeInTheDocument();
    expect(screen.getByText('Show earlier messages (20)')).toBeInTheDocument();
  });

  it('reveals an older batch when the control is activated', () => {
    render(
      <ChatList reactory={mockReactory} messages={makeMessages(30)} maxRenderedItems={10} />
    );

    expect(screen.queryByText('message-19')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Show earlier messages'));

    // A second batch of 10 is now visible.
    expect(screen.getByText('message-19')).toBeInTheDocument();
    expect(screen.getByText('message-10')).toBeInTheDocument();
    expect(screen.queryByText('message-9')).not.toBeInTheDocument();
    expect(screen.getByText('Show earlier messages (10)')).toBeInTheDocument();
  });

  it('offers the control while the server holds older history even when all local items fit', () => {
    const onLoadEarlier = jest.fn();
    render(
      <ChatList
        reactory={mockReactory}
        messages={makeMessages(5)}
        hasServerEarlier
        onLoadEarlier={onLoadEarlier}
      />
    );

    const control = screen.getByLabelText('Show earlier messages');
    expect(control).toBeInTheDocument();
    // No local items are hidden, so the label omits the count.
    expect(screen.getByText('Show earlier messages')).toBeInTheDocument();

    fireEvent.click(control);

    expect(onLoadEarlier).toHaveBeenCalledTimes(1);
  });

  it('does not ask the server for older history while local items remain hidden', () => {
    const onLoadEarlier = jest.fn();
    render(
      <ChatList
        reactory={mockReactory}
        messages={makeMessages(30)}
        maxRenderedItems={10}
        hasServerEarlier
        onLoadEarlier={onLoadEarlier}
      />
    );

    fireEvent.click(screen.getByLabelText('Show earlier messages'));

    expect(onLoadEarlier).not.toHaveBeenCalled();
    expect(screen.getByText('message-19')).toBeInTheDocument();
  });
});
