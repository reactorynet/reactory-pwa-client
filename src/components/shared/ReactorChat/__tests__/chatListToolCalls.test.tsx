import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatList from '../hooks/useScrollToBottom';
import { UXChatMessage } from '../types';

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
    Material: {
      MaterialCore: {
        Button: React.forwardRef((props: any, ref: any) => <button ref={ref} {...props} />),
        IconButton: React.forwardRef((props: any, ref: any) => <button ref={ref} {...props} />),
        Icon: (props: any) => <span>{props.children}</span>,
        TextField: (props: any) => <input {...props} />,
        Grid: (props: any) => <div>{props.children}</div>,
        Typography: (props: any) => <span>{props.children}</span>,
        Box: (props: any) => <div>{props.children}</div>,
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
  log: jest.fn(),
  error: jest.fn(),
  utils: {
    uuid: () => 'test-uuid',
  },
};

describe('ChatList Tool Call Expand and Delete', () => {
  const toolCallMessage: UXChatMessage = {
    id: 'msg-1',
    role: 'assistant',
    content: null,
    timestamp: new Date(),
    tool_calls: [
      {
        id: 'call_shell_1',
        type: 'function',
        function: {
          name: 'shell',
          arguments: '{"command":"ls"}',
        },
        status: 'success',
      },
    ],
    tool_results: [
      {
        id: 'call_shell_1',
        name: 'shell',
        content: 'success: true\nstdout: file1.txt\nfile2.txt',
        timestamp: new Date(),
      },
    ],
  };

  it('renders tool call chip with tool name', () => {
    render(
      <ChatList
        reactory={mockReactory}
        messages={[toolCallMessage]}
      />
    );

    expect(screen.getByText('shell')).toBeInTheDocument();
  });

  it('expands tool result and opens maximized dialog when maximize button is clicked', () => {
    render(
      <ChatList
        reactory={mockReactory}
        messages={[toolCallMessage]}
      />
    );

    // Expand result panel
    const showResultBtn = screen.getByLabelText('Show result');
    fireEvent.click(showResultBtn);

    expect(screen.getByText(/Result: shell/)).toBeInTheDocument();

    // Click maximize
    const maximizeBtn = screen.getByLabelText('Maximize to full view');
    fireEvent.click(maximizeBtn);

    // Check dialog opens
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Tool Result: shell/)).toBeInTheDocument();
  });

  it('calls onDeleteToolCall when delete is confirmed', () => {
    const onDeleteToolCall = jest.fn();

    render(
      <ChatList
        reactory={mockReactory}
        messages={[toolCallMessage]}
        onDeleteToolCall={onDeleteToolCall}
      />
    );

    // Click delete on chip
    const deleteBtn = screen.getByLabelText('Delete tool call & result');
    fireEvent.click(deleteBtn);

    // Confirmation dialog should appear
    expect(screen.getByText(/Delete Tool Call/)).toBeInTheDocument();

    // Click Delete in confirmation dialog
    const confirmBtn = screen.getByText('Delete');
    fireEvent.click(confirmBtn);

    expect(onDeleteToolCall).toHaveBeenCalledWith(toolCallMessage, 'call_shell_1');
  });

  it('renders reasoning toggle on processing message when thinking content is present', () => {
    const processingWithThinking: UXChatMessage = {
      id: 'msg-processing-1',
      role: 'assistant',
      content: 'Processing...',
      thinking: 'Analyzing system requirements...',
      timestamp: new Date(),
    };

    render(
      <ChatList
        reactory={mockReactory}
        messages={[processingWithThinking]}
      />
    );

    expect(screen.getByText('Agent is thinking...')).toBeInTheDocument();
    expect(screen.getByText('View reasoning')).toBeInTheDocument();

    // Expand reasoning
    fireEvent.click(screen.getByText('View reasoning'));
    expect(screen.getByText('Analyzing system requirements...')).toBeInTheDocument();
  });

  it('toggles mounting of embedded Reactory components on button click', () => {
    const userMsg: UXChatMessage = {
      id: 'msg-user-1',
      role: 'user',
      content: 'Show component',
      timestamp: new Date(),
    };
    const componentMsg: UXChatMessage = {
      id: 'msg-comp-1',
      role: 'assistant',
      content: 'Here is a component: <reactory reactory-component="core.Label@1.0.0" reactory-props-text="Live Widget" />',
      timestamp: new Date(),
    };

    render(
      <ChatList
        reactory={mockReactory}
        messages={[userMsg, componentMsg]}
      />
    );

    const mountBtns = screen.getAllByLabelText('Mount embedded components');
    expect(mountBtns.length).toBeGreaterThan(0);

    fireEvent.click(mountBtns[0]);
    expect(screen.getAllByLabelText('Unmount embedded components').length).toBeGreaterThan(0);
  });
});
