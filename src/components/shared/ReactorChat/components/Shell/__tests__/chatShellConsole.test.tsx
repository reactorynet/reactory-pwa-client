import React from 'react';
import { render, screen } from '@testing-library/react';
import ChatShellConsole from '../ChatShellConsole';
import { chatShellBus } from '../chatShellBus';
import { ShellEventData } from '../shellApi';

// The real terminal pulls in xterm; the console tests only care which runs are
// shown and that each is wrapped in an expandable pane.
jest.mock('../ChatShellTerminal', () => ({
  __esModule: true,
  default: ({ shellSessionId }: { shellSessionId: string }) => (
    <div data-testid={`terminal-${shellSessionId}`} />
  ),
}));

const ev = (
  shellSessionId: string,
  phase: ShellEventData['phase'],
  extra: Partial<ShellEventData> = {},
): ShellEventData => ({ shellSessionId, phase, source: 'macro', ...extra } as ShellEventData);

const CHAT = 'chat-1';

describe('ChatShellConsole', () => {
  beforeEach(() => chatShellBus.__resetForTests());

  it('renders one expandable pane per macro shell run', () => {
    chatShellBus.setActiveConversation(CHAT);
    chatShellBus.push(CHAT, ev('s1', 'start', { command: 'ls -la' }));
    chatShellBus.push(CHAT, ev('s2', 'start', { command: 'pwd' }));

    render(<ChatShellConsole />);

    expect(screen.getByText('$ ls -la')).toBeInTheDocument();
    expect(screen.getByText('$ pwd')).toBeInTheDocument();
    expect(screen.getByTestId('terminal-s1')).toBeInTheDocument();
    expect(screen.getByTestId('terminal-s2')).toBeInTheDocument();
    // Each run gets expand + enlarge + copy affordances.
    expect(screen.getByLabelText('toggle-s1')).toBeInTheDocument();
    expect(screen.getByLabelText('maximize-s1')).toBeInTheDocument();
    expect(screen.getByLabelText('copy-s2')).toBeInTheDocument();
  });

  it('ignores shell runs from other conversations', () => {
    chatShellBus.setActiveConversation(CHAT);
    chatShellBus.push('other-chat', ev('s-other', 'start', { command: 'whoami' }));

    render(<ChatShellConsole />);

    expect(screen.getByText(/Shell command output will appear here/i)).toBeInTheDocument();
  });

  it('shows the empty state when there are no runs', () => {
    chatShellBus.setActiveConversation(CHAT);
    render(<ChatShellConsole />);
    expect(screen.getByText(/Shell command output will appear here/i)).toBeInTheDocument();
  });
});
