import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ActiveSessionsAvatarStack from '../components/ActiveSessionsAvatarStack';
import { TrackedSession } from '../hooks/useSessionStreamHub';
import { ACTIVITY_DETAIL_MAX_LENGTH } from '../utils';

/**
 * The active-agent stack renders its detail in a MUI Tooltip, which mounts into
 * a portal on hover. These tests hover the FAB and then assert on the hover
 * card contents.
 */

const makeSession = (overrides: Partial<TrackedSession> = {}): TrackedSession => ({
  sessionId: 'session-1',
  personaId: 'ReactorAIPersona',
  persona: { id: 'ReactorAIPersona', name: 'Reactor', avatar: '' } as any,
  title: 'Chat Metadata & Cross-Agent Routing',
  status: 'streaming',
  unread: false,
  lastUpdated: new Date('2026-09-13T00:00:00Z'),
  ...overrides,
});

const renderStack = (sessions: TrackedSession[]) => {
  const onSelectSession = jest.fn();
  render(
    <ActiveSessionsAvatarStack
      sessions={sessions}
      onSelectSession={onSelectSession}
      mode="dark"
    />,
  );
  return { onSelectSession };
};

const hover = async (label: string) => {
  fireEvent.mouseOver(screen.getByLabelText(label));
  await screen.findByRole('tooltip');
};

describe('ActiveSessionsAvatarStack hover card', () => {
  it('shows the conversation title on hover', async () => {
    renderStack([makeSession()]);

    await hover('Reactor');

    expect(screen.getByRole('tooltip').textContent).toContain(
      'Chat Metadata & Cross-Agent Routing',
    );
  });

  it('shows the live status alongside the title', async () => {
    renderStack([makeSession({ status: 'streaming' })]);

    await hover('Reactor');

    const tooltip = screen.getByRole('tooltip').textContent;
    expect(tooltip).toContain('Chat Metadata & Cross-Agent Routing');
    expect(tooltip).toContain('Generating response...');
  });

  it('shows the agent-maintained status icon when set', async () => {
    renderStack([
      makeSession({ icon: 'check_circle', color: '#2e7d32', status: 'completed' }),
    ]);

    await hover('Reactor');

    const tooltip = screen.getByRole('tooltip').textContent;
    // The icon name renders as the glyph text; the live status follows it.
    expect(tooltip).toContain('check_circle');
    expect(tooltip).toContain('Response ready');
  });

  it('surfaces tool-level status detail when executing tools', async () => {
    renderStack([
      makeSession({ status: 'executing_tools', lastToolName: 'updateChatData' }),
    ]);

    await hover('Reactor');

    expect(screen.getByRole('tooltip').textContent).toContain('Running: updateChatData');
  });

  it('shows the conversation summary when present', async () => {
    renderStack([makeSession({ summary: 'Fixed the stale chat data update.' })]);

    await hover('Reactor');

    expect(screen.getByRole('tooltip').textContent).toContain(
      'Fixed the stale chat data update.',
    );
  });

  it('does not repeat the persona name when the conversation has no title yet', async () => {
    renderStack([makeSession({ title: '', status: 'idle' })]);

    await hover('Reactor');

    const tooltip = screen.getByRole('tooltip').textContent;
    // 'Reactor' appears once (the agent heading), never twice.
    expect(tooltip.split('Reactor').length - 1).toBe(1);
    expect(tooltip).toContain('Idle');
  });

  it('does not repeat the persona name when the title defaults to it', async () => {
    renderStack([makeSession({ title: 'Reactor' })]);

    await hover('Reactor');

    const tooltip = screen.getByRole('tooltip').textContent;
    expect(tooltip.split('Reactor').length - 1).toBe(1);
  });

  it('marks sub-agent conversations', async () => {
    renderStack([makeSession({ isSubAgent: true, title: 'Sub task' })]);

    await hover('Reactor');

    const tooltip = screen.getByRole('tooltip').textContent;
    expect(tooltip).toContain('Sub-agent');
    expect(tooltip).toContain('Sub task');
  });

  it('switches to the session when the FAB is clicked', () => {
    const { onSelectSession } = renderStack([makeSession()]);

    fireEvent.click(screen.getByLabelText('Reactor'));

    expect(onSelectSession).toHaveBeenCalledWith('session-1', 'ReactorAIPersona');
  });

  it('renders nothing when there are no sessions', () => {
    const { container } = render(
      <ActiveSessionsAvatarStack sessions={[]} onSelectSession={jest.fn()} />,
    );

    expect(container.firstChild).toBeNull();
  });

  /**
   * Regression: a shell activity detail is the agent's *entire* command line.
   * Rendered verbatim it overflowed the hover card and, because the MUI tooltip
   * popper accepts pointer events, the spilled text covered the avatar buttons
   * and made them unclickable.
   */
  it('bounds an over-long activity detail instead of rendering it verbatim', async () => {
    const longCommand = [
      'sleep 560; WT=/Users/wernerw/Projects/reactory/reactory-worktrees/ai-6ad0c1e141038a04addba8be;',
      'cd "$WT"; echo "=== $(date +%H:%M:%S) ==="; echo "--- git ---"; git status --short;',
      'echo "--- review verdict ---"; if [ -f .ai-agent/review.json ]; then cat .ai-agent/review.json;',
      'else echo "not yet"; fi',
    ].join('\n');

    expect(longCommand.length).toBeGreaterThan(ACTIVITY_DETAIL_MAX_LENGTH);

    renderStack([makeSession({ status: 'executing_tools', lastToolName: longCommand })]);

    await hover('Reactor');

    const text = screen.getByTestId('active-session-hover-card').textContent || '';
    expect(text).toContain('Running: sleep 560;');
    // The tail sits beyond the activity budget, so it is dropped rather than
    // allowed to stretch the card across the avatar buttons.
    expect(text).not.toContain('not yet');
    expect(text.length).toBeLessThan(ACTIVITY_DETAIL_MAX_LENGTH + 100);
  });

  /**
   * jsdom performs no hit-testing, so a click assertion alone cannot prove the
   * card stopped intercepting pointer events. Asserting the computed contract
   * on the card does.
   */
  it('takes the hover card out of hit-testing so it cannot cover the avatars', async () => {
    renderStack([makeSession({ status: 'executing_tools', lastToolName: 'sleep 560' })]);

    await hover('Reactor');

    const card = screen.getByTestId('active-session-hover-card');
    expect(card).toHaveStyle('pointer-events: none');
    expect(card).toHaveStyle('overflow: hidden');
  });

  it('keeps the avatar switchable while its own hover card is open', async () => {
    const { onSelectSession } = renderStack([
      makeSession({ status: 'executing_tools', lastToolName: 'sleep 560' }),
    ]);

    await hover('Reactor');
    fireEvent.click(screen.getByLabelText('Reactor'));

    expect(onSelectSession).toHaveBeenCalledWith('session-1', 'ReactorAIPersona');
  });

  it('keeps sibling avatars switchable while a busy agent shows a long command', async () => {
    const { onSelectSession } = renderStack([
      makeSession({
        sessionId: 'session-busy',
        personaId: 'BusyPersona',
        persona: { id: 'BusyPersona', name: 'Busy', avatar: '' } as any,
        status: 'executing_tools',
        lastToolName: 'sleep 560; '.repeat(40),
      }),
      makeSession({
        sessionId: 'session-idle',
        personaId: 'IdlePersona',
        persona: { id: 'IdlePersona', name: 'Idle', avatar: '' } as any,
        title: 'Idle chat',
        status: 'completed',
      }),
    ]);

    await hover('Busy');
    fireEvent.click(screen.getByLabelText('Idle'));

    expect(onSelectSession).toHaveBeenCalledWith('session-idle', 'IdlePersona');
  });
});
