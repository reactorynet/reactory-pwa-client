import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WorkflowTaskApproval } from '../WorkflowTaskApproval';

describe('WorkflowTaskApproval', () => {
  it('renders standard workflow approval card with details and handles approve', async () => {
    const onComplete = jest.fn();
    render(
      <WorkflowTaskApproval
        amount={5000}
        currency="USD"
        employee="Werner Weber"
        vendor="Acme Corp"
        category="Software"
        onComplete={onComplete}
      />
    );

    expect(screen.getByText('Approval Required')).toBeInTheDocument();
    expect(screen.getByText('Werner Weber')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();

    const approveButton = screen.getByRole('button', { name: /Approve/i });
    fireEvent.click(approveButton);

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        approved: true,
        decision: 'approved',
      })
    );
  });

  it('renders chat tool iteration limit approval view when iteration props are provided', async () => {
    const onContinue = jest.fn();
    const onStop = jest.fn();
    const onComplete = jest.fn();

    render(
      <WorkflowTaskApproval
        iterationsCompleted={10}
        maxIterations={10}
        sessionId="chat-session-12345678"
        persona={{
          id: 'reactor',
          name: 'Reactor Lead',
          avatar: 'https://example.com/reactor.png',
        }}
        pendingTools={['snip', 'shell']}
        onContinue={onContinue}
        onStop={onStop}
        onComplete={onComplete}
      />
    );

    expect(screen.getByText('Tool Limit Reached')).toBeInTheDocument();
    expect(screen.getByText('Reactor Lead')).toBeInTheDocument();
    expect(screen.getByText(/Session: chat-ses/)).toBeInTheDocument();
    expect(screen.getByText('10 / 10')).toBeInTheDocument();
    expect(screen.getByText('snip')).toBeInTheDocument();
    expect(screen.getByText('shell')).toBeInTheDocument();

    const resumeBtn = screen.getByRole('button', { name: /Approve & Resume/i });
    fireEvent.click(resumeBtn);

    expect(onContinue).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        approved: true,
        decision: 'approved',
      })
    );
  });

  it('handles stop / decline action in tool iteration approval view', async () => {
    const onStop = jest.fn();
    render(
      <WorkflowTaskApproval
        iterationsCompleted={10}
        maxIterations={10}
        sessionId="chat-session-12345678"
        onStop={onStop}
      />
    );

    const stopBtn = screen.getByRole('button', { name: /Decline \/ Stop/i });
    fireEvent.click(stopBtn);

    expect(onStop).toHaveBeenCalled();
  });
});
