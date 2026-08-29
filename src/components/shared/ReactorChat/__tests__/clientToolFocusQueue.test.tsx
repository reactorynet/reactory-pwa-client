import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import useChatStatus from '../hooks/useChatStatus';
import ActiveSessionsAvatarStack from '../components/ActiveSessionsAvatarStack';
import { TrackedSession } from '../hooks/useSessionStreamHub';

describe('Client Tool Focus Queue & Status Indicators', () => {
  describe('useChatStatus with waitingClientToolCount', () => {
    function StatusHarness(props: {
      busy: boolean;
      isStreaming: boolean;
      toolIterationLimitInfo: any;
      pendingToolCallResume: boolean;
      waitingClientToolCount: number;
    }) {
      const status = useChatStatus(props);
      return (
        <div>
          <span data-testid="status-key">{status.status}</span>
          <span data-testid="status-label">{status.label}</span>
          <span data-testid="status-icon">{status.icon}</span>
        </div>
      );
    }

    it('returns waiting_focus status when waitingClientToolCount > 0', () => {
      render(
        <StatusHarness
          busy={false}
          isStreaming={false}
          toolIterationLimitInfo={null}
          pendingToolCallResume={false}
          waitingClientToolCount={2}
        />
      );

      expect(screen.getByTestId('status-key')).toHaveTextContent('waiting_focus');
      expect(screen.getByTestId('status-label')).toHaveTextContent('Waiting for focus...');
      expect(screen.getByTestId('status-icon')).toHaveTextContent('priority_high');
    });

    it('returns idle status when waitingClientToolCount is 0 and idle', () => {
      render(
        <StatusHarness
          busy={false}
          isStreaming={false}
          toolIterationLimitInfo={null}
          pendingToolCallResume={false}
          waitingClientToolCount={0}
        />
      );

      expect(screen.getByTestId('status-key')).toHaveTextContent('idle');
      expect(screen.getByTestId('status-label')).toHaveTextContent('Ready');
    });
  });

  describe('ActiveSessionsAvatarStack with waiting_focus status', () => {
    const mockSessions: TrackedSession[] = [
      {
        sessionId: 'sess-1',
        personaId: 'agent-1',
        persona: { id: 'agent-1', name: 'Alpha Agent', avatar: '' } as any,
        title: 'Alpha Agent Session',
        status: 'waiting_focus',
        unread: false,
        lastMessage: 'Waiting to mount side panel...',
        lastToolName: 'sidePanel',
        lastUpdated: new Date(),
        hasWaitingToolCalls: true,
        waitingToolCallCount: 1,
      },
    ];

    it('renders "!" badge on session when waiting for focus', () => {
      const onSelect = jest.fn();
      render(
        <ActiveSessionsAvatarStack
          sessions={mockSessions}
          onSelectSession={onSelect}
          mode="dark"
        />
      );

      // Verify "!" badge content is rendered
      expect(screen.getByText('!')).toBeInTheDocument();

      // Click session FAB
      const fab = screen.getByRole('button', { name: /Alpha Agent/i });
      fireEvent.click(fab);
      expect(onSelect).toHaveBeenCalledWith('sess-1', 'agent-1');
    });
  });
});
