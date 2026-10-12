import React from 'react';
import { render, screen } from '@testing-library/react';

const mockRoutes = [
  { key: 'content', path: '/content/:id' },
  { key: 'reactor-chat', path: '/reactor' },
  { key: 'support-ticket', path: '/support/ticket/:id' },
];

const mockReactory: any = {
  getRoutes: jest.fn(() => mockRoutes),
};

jest.mock('@reactory/client-core/api/ApiProvider', () => ({
  useReactory: () => mockReactory,
  withReactory: (component: any) => component,
}));

import { MyCommentDetailPanel } from '../MyCommentDetailPanel';

const contentComment: any = {
  id: 'c1',
  text: 'The full comment body that is too long for the grid row.',
  when: '2026-01-02T10:00:00.000Z',
  context: 'ReactoryContent',
  contextId: 'page-1',
  quote: 'selected phrase',
  removed: false,
  upvotes: 2,
  favorites: 1,
  who: { id: 'u1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' },
};

const chatComment: any = {
  id: 'c2',
  text: 'A chat comment',
  when: '2026-01-03T10:00:00.000Z',
  context: 'ReactorChat',
  contextId: 'reactor_chat_sess1_msg1',
  removed: false,
};

const unknownComment: any = {
  id: 'c3',
  text: 'A mystery comment',
  when: '2026-01-04T10:00:00.000Z',
  context: 'SomeFutureContext',
  contextId: 'x1',
  removed: true,
};

describe('MyCommentDetailPanel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the full comment text, quote, author and stats', () => {
    render(<MyCommentDetailPanel comment={contentComment} reactory={mockReactory} />);

    expect(screen.getByTestId('my-comment-detail-text')).toHaveTextContent(
      'The full comment body that is too long for the grid row.'
    );
    expect(screen.getByText(/selected phrase/)).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('2 upvotes')).toBeInTheDocument();
  });

  it('links a content comment back to its resource', () => {
    render(<MyCommentDetailPanel comment={contentComment} reactory={mockReactory} />);

    const link = screen.getByRole('link', { name: /view resource/i });
    expect(link).toHaveAttribute('href', '/content/page-1');
  });

  it('links a chat comment to the session deep link', () => {
    render(<MyCommentDetailPanel comment={chatComment} reactory={mockReactory} />);

    const link = screen.getByRole('link', { name: /view resource/i });
    expect(link).toHaveAttribute('href', '/reactor?sessionId=sess1&messageId=msg1');
  });

  it('uses an injected routes prop over the reactory route table', () => {
    render(
      <MyCommentDetailPanel
        comment={contentComment}
        reactory={mockReactory}
        routes={[{ key: 'content', path: '/library/:id' }] as any}
      />
    );

    expect(mockReactory.getRoutes).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /view resource/i })).toHaveAttribute(
      'href',
      '/library/page-1'
    );
  });

  it('degrades gracefully for an unresolvable context and flags removed comments', () => {
    render(<MyCommentDetailPanel comment={unknownComment} reactory={mockReactory} />);

    expect(screen.queryByRole('link', { name: /view resource/i })).toBeNull();
    expect(screen.getByText(/resource link unavailable/i)).toBeInTheDocument();
    expect(screen.getByText('Removed')).toBeInTheDocument();
  });

  it('renders a no-data message when no comment is supplied', () => {
    render(<MyCommentDetailPanel reactory={mockReactory} />);
    expect(screen.getByText(/no comment data available/i)).toBeInTheDocument();
  });
});
