import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { render, fireEvent, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useSessionStreamHub } from '../hooks/useSessionStreamHub';
import { ActiveSessionsAvatarStack } from '../components/ActiveSessionsAvatarStack';
import { ChatState, IAIPersona } from '../types';

describe('useSessionStreamHub', () => {
  const mockReactory = {
    debug: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  } as any;

  const mockPersona: IAIPersona = {
    id: 'persona-1',
    name: 'Reactor Agent',
    persona: 'Assistant',
    features: 'Testing',
    avatar: 'https://example.com/avatar1.png',
  };

  const getPersona = (id: string) => (id === 'persona-1' ? mockPersona : null);

  it('initializes with empty background sessions when no chats or subagents exist', () => {
    const { result } = renderHook(() =>
      useSessionStreamHub({
        reactory: mockReactory,
        activeSessionId: 'active-1',
        activePersonaId: 'persona-1',
        chats: [],
        subAgents: [],
        getPersona,
      })
    );

    expect(result.current.backgroundSessions).toEqual([]);
    expect(result.current.activePersonaSessionCount).toBe(0);
  });

  it('ingests sub-agents and chats excluding active session', () => {
    const chats: ChatState[] = [
      {
        id: 'active-1',
        personaId: 'persona-1',
        title: 'Active Session',
        history: [],
      } as any,
      {
        id: 'bg-1',
        personaId: 'persona-1',
        title: 'Background Session 1',
        history: [],
        updated: new Date('2026-08-26T08:00:00Z'),
      } as any,
    ];

    const subAgents = [
      {
        id: 'sub-1',
        personaId: 'persona-1',
        title: 'Sub Agent Task',
        updated: new Date('2026-08-26T08:30:00Z'),
      },
    ];

    const { result } = renderHook(() =>
      useSessionStreamHub({
        reactory: mockReactory,
        activeSessionId: 'active-1',
        activePersonaId: 'persona-1',
        chats,
        subAgents,
        getPersona,
      })
    );

    expect(result.current.backgroundSessions.length).toBe(2);
    expect(result.current.activePersonaSessionCount).toBe(2);
  });

  it('updates session activity and clears unread status', () => {
    const chats: ChatState[] = [
      {
        id: 'bg-1',
        personaId: 'persona-1',
        title: 'Background Session',
        history: [],
      } as any,
    ];

    const { result } = renderHook(() =>
      useSessionStreamHub({
        reactory: mockReactory,
        activeSessionId: 'active-1',
        activePersonaId: 'persona-1',
        chats,
        getPersona,
      })
    );

    act(() => {
      result.current.notifySessionActivity('bg-1', 'completed', 'Analysis done');
    });

    const bgSession = result.current.backgroundSessions.find((s) => s.sessionId === 'bg-1');
    expect(bgSession?.status).toBe('completed');
    expect(bgSession?.unread).toBe(true);
    expect(bgSession?.lastMessage).toBe('Analysis done');

    act(() => {
      result.current.clearUnread('bg-1');
    });

    const updatedBgSession = result.current.backgroundSessions.find((s) => s.sessionId === 'bg-1');
    expect(updatedBgSession?.unread).toBe(false);
  });
});

describe('ActiveSessionsAvatarStack', () => {
  const theme = createTheme();

  const mockSessions = [
    {
      sessionId: 'session-1',
      personaId: 'persona-1',
      persona: {
        id: 'persona-1',
        name: 'Security Agent',
        avatar: 'https://example.com/avatar.png',
        persona: '',
        features: '',
      },
      title: 'Security Scan',
      status: 'completed' as const,
      unread: true,
      lastMessage: 'Scan complete: No vulnerabilities found.',
      lastUpdated: new Date(),
    },
  ];

  it('renders stacked mini-FAB and triggers onSelectSession on click', () => {
    const onSelectSession = jest.fn();

    render(
      <ThemeProvider theme={theme}>
        <ActiveSessionsAvatarStack
          sessions={mockSessions}
          onSelectSession={onSelectSession}
        />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /Security Agent/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onSelectSession).toHaveBeenCalledWith('session-1', 'persona-1');
  });

  it('renders null when sessions list is empty', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <ActiveSessionsAvatarStack
          sessions={[]}
          onSelectSession={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(container.firstChild).toBeNull();
  });
});
