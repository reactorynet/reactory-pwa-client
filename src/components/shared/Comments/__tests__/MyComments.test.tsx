import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

/**
 * The component resolves its SDK through the ApiProvider hook. Mock it so the
 * tests can drive `graphqlQuery` directly and inject a known route table.
 */
const mockReactory: any = {
  graphqlQuery: jest.fn(),
  getRoutes: jest.fn(() => [
    { key: 'content', path: '/content/:id', componentFqn: 'core.ContentPage@1.0.0' },
    { key: 'reactor-chat', path: '/reactor', componentFqn: 'core.ReactorChat@1.0.0' },
    { key: 'support-ticket', path: '/support/ticket/:id', componentFqn: 'core.SupportTicketDetailPanel@1.0.0' },
  ]),
  on: jest.fn(),
  off: jest.fn(),
};

jest.mock('@reactory/client-core/api/ApiProvider', () => ({
  useReactory: () => mockReactory,
  withReactory: (component: any) => component,
}));

import { MyComments } from '../MyComments';

const contentComment = {
  id: 'c1',
  text: 'This is my content comment',
  when: '2026-01-02T10:00:00.000Z',
  context: 'ReactoryContent',
  contextId: 'page-1',
  quote: 'selected phrase',
  removed: false,
};

const chatComment = {
  id: 'c2',
  text: 'This is my chat comment',
  when: '2026-01-03T10:00:00.000Z',
  context: 'ReactorChat',
  contextId: 'reactor_chat_sess1_msg1',
  removed: false,
};

const unknownComment = {
  id: 'c3',
  text: 'This is my mystery comment',
  when: '2026-01-04T10:00:00.000Z',
  context: 'SomeFutureContext',
  contextId: 'x1',
  removed: true,
};

const commentsPayload = (comments: any[]) => ({
  data: {
    getMyComments: {
      comments,
      paging: { page: 1, pageSize: 20, total: comments.length, hasNext: false },
    },
  },
});

const statsPayload = {
  data: {
    getMyCommentStats: [
      { context: 'ReactoryContent', count: 1 },
      { context: 'ReactorChat', count: 1 },
    ],
  },
};

const wireQueries = (comments: any[]) => {
  mockReactory.graphqlQuery.mockImplementation((query: string) => {
    if (query.includes('getMyCommentStats')) return Promise.resolve(statsPayload);
    if (query.includes('getMyComments')) return Promise.resolve(commentsPayload(comments));
    return Promise.resolve({ data: {} });
  });
};

describe('MyComments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists the user comments with context labels', async () => {
    wireQueries([contentComment, chatComment]);
    render(<MyComments />);

    expect(await screen.findByText('This is my content comment')).toBeInTheDocument();
    expect(screen.getByText('This is my chat comment')).toBeInTheDocument();

    // Context chips are rendered from the resolved resource type.
    expect(screen.getAllByText('Content').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reactor Chat').length).toBeGreaterThan(0);

    // The anchored quote is surfaced.
    expect(screen.getByText('selected phrase')).toBeInTheDocument();
  });

  it('links a content comment back to its resource', async () => {
    wireQueries([contentComment]);
    render(<MyComments />);

    const card = (await screen.findByText('This is my content comment')).closest('.MuiPaper-root') as HTMLElement;
    const link = within(card).getByRole('link', { name: /view resource/i });
    expect(link).toHaveAttribute('href', '/content/page-1');
  });

  it('links a chat comment to the chat session deep link', async () => {
    wireQueries([chatComment]);
    render(<MyComments />);

    const card = (await screen.findByText('This is my chat comment')).closest('.MuiPaper-root') as HTMLElement;
    const link = within(card).getByRole('link', { name: /view resource/i });
    expect(link).toHaveAttribute('href', '/reactor?sessionId=sess1&messageId=msg1');
  });

  it('shows an unavailable note (no link) for an unresolvable context and flags removed comments', async () => {
    wireQueries([unknownComment]);
    render(<MyComments />);

    const card = (await screen.findByText('This is my mystery comment')).closest('.MuiPaper-root') as HTMLElement;
    expect(within(card).queryByRole('link', { name: /view resource/i })).toBeNull();
    expect(within(card).getByText(/resource link unavailable/i)).toBeInTheDocument();
    expect(within(card).getByText('Removed')).toBeInTheDocument();
  });

  it('renders an empty state when the user has no comments', async () => {
    wireQueries([]);
    render(<MyComments />);

    expect(await screen.findByText(/have not commented on anything yet/i)).toBeInTheDocument();
  });

  it('surfaces an error state when the query fails', async () => {
    mockReactory.graphqlQuery.mockImplementation((query: string) => {
      if (query.includes('getMyCommentStats')) return Promise.resolve(statsPayload);
      return Promise.reject(new Error('boom'));
    });

    render(<MyComments />);

    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('applies a search term and re-queries', async () => {
    wireQueries([contentComment]);
    render(<MyComments />);

    await screen.findByText('This is my content comment');

    fireEvent.change(screen.getByLabelText(/search my comments/i), {
      target: { value: 'content' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => {
      const calls = mockReactory.graphqlQuery.mock.calls.filter(([q]: string[]) => q.includes('getMyComments'));
      expect(calls.some(([, vars]: any) => vars?.searchTerm === 'content')).toBe(true);
    });
  });

  it('re-queries with the first page when a context filter is applied', async () => {
    wireQueries([contentComment, chatComment]);
    render(<MyComments />);

    await screen.findByText('This is my content comment');

    // Change the context select via its input element.
    const select = screen.getByLabelText(/^context$/i);
    fireEvent.mouseDown(select);

    const option = await screen.findByRole('option', { name: /Reactor Chat/i });
    fireEvent.click(option);

    await waitFor(() => {
      const calls = mockReactory.graphqlQuery.mock.calls.filter(([q]: string[]) => q.includes('getMyComments'));
      expect(calls.some(([, vars]: any) => vars?.context === 'ReactorChat' && vars?.paging?.page === 1)).toBe(true);
    });
  });
});
