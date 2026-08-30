import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContentRenderer } from '../ContentRenderer';

// Mock useContentRender
jest.mock('@reactory/client-core/components/shared/hooks/useContentRender', () => ({
  useContentRender: () => ({
    renderContent: (content: string) => <div data-testid="rendered-content">{content}</div>,
    detectContentType: () => 'text/markdown',
  }),
}));

// Mock Comments component
jest.mock('@reactory/client-core/components/shared/Comments/Comments', () => ({
  Comments: (props: any) => (
    <div
      data-testid="comments-component"
      data-context={props.context}
      data-context-id={props.contextId}
      data-quote={props.selectedQuote || ''}
    >
      Comments for {props.context}:{props.contextId}
    </div>
  ),
}));

const mockReactory: any = {
  muiTheme: {
    palette: {
      mode: 'light',
      primary: { main: '#1976d2' },
    },
  },
  getUser: () => ({ loggedIn: { user: { id: 'user-1' } } }),
  hasRole: () => true,
  log: jest.fn(),
};

describe('ContentRenderer component', () => {
  it('renders content correctly', () => {
    render(
      <ContentRenderer
        content="# Hello World"
        reactory={mockReactory}
      />
    );

    expect(screen.getByTestId('rendered-content')).toHaveTextContent('# Hello World');
  });

  it('does NOT render comments when enableComments is false even if id is provided', () => {
    render(
      <ContentRenderer
        content="Article content"
        id="article-101"
        enableComments={false}
        reactory={mockReactory}
      />
    );

    expect(screen.getByTestId('rendered-content')).toHaveTextContent('Article content');
    expect(screen.queryByTestId('comments-component')).not.toBeInTheDocument();
  });

  it('does NOT render comments when id is missing even if enableComments is true', () => {
    render(
      <ContentRenderer
        content="Article content"
        enableComments={true}
        reactory={mockReactory}
      />
    );

    expect(screen.getByTestId('rendered-content')).toHaveTextContent('Article content');
    expect(screen.queryByTestId('comments-component')).not.toBeInTheDocument();
  });

  it('renders comments in bottom layout by default', () => {
    render(
      <ContentRenderer
        content="Article with discussion"
        id="article-202"
        enableComments={true}
        context="KnowledgeBase"
        reactory={mockReactory}
      />
    );

    expect(screen.getByTestId('rendered-content')).toHaveTextContent('Article with discussion');
    const commentsEl = screen.getByTestId('comments-component');
    expect(commentsEl).toBeInTheDocument();
    expect(commentsEl).toHaveAttribute('data-context', 'KnowledgeBase');
    expect(commentsEl).toHaveAttribute('data-context-id', 'article-202');
  });

  it('renders comments in drawer layout with Open Comments trigger', () => {
    render(
      <ContentRenderer
        content="Article with drawer"
        id="article-drawer-1"
        enableComments={true}
        commentLayout="drawer"
        reactory={mockReactory}
      />
    );

    expect(screen.getByText('Open Comments')).toBeInTheDocument();
  });

  it('renders comments in accordion layout with collapsible summary', () => {
    render(
      <ContentRenderer
        content="Article with accordion"
        id="article-acc-1"
        enableComments={true}
        commentLayout="accordion"
        reactory={mockReactory}
      />
    );

    expect(screen.getByText('Comments')).toBeInTheDocument();
  });
});
