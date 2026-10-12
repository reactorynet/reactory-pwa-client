import React from 'react';
import { render, screen } from '@testing-library/react';

import { MyCommentContextBadge } from '../MyCommentContextBadge';

describe('MyCommentContextBadge', () => {
  it('renders a friendly label for a known context', () => {
    render(<MyCommentContextBadge context="ReactoryContent" />);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it.each([
    ['KnowledgeBase', 'Knowledge Base'],
    ['ReactorChat', 'Reactor Chat'],
    ['ReactorySupportTicket', 'Support Ticket'],
  ])('maps %s to "%s"', (context, label) => {
    render(<MyCommentContextBadge context={context} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('falls back to the raw context for an unknown context', () => {
    render(<MyCommentContextBadge context="SomeFutureContext" />);
    expect(screen.getByText('SomeFutureContext')).toBeInTheDocument();
  });

  it('accepts the cell value via the value alias', () => {
    render(<MyCommentContextBadge value="ReactorChat" />);
    expect(screen.getByText('Reactor Chat')).toBeInTheDocument();
  });
});
