import {
  resolveCommentResource,
  parseChatCommentContextId,
  CHAT_COMMENT_CONTEXT_PREFIX,
  CommentRouteLike,
} from '../commentResourceLinks';

/**
 * A representative slice of an application route table. Real routes are
 * per-application; the resolver matches on componentFqn / key / path.
 */
const routes: CommentRouteLike[] = [
  { key: 'home', path: '/', componentFqn: 'core.Home@1.0.0' },
  { key: 'content', path: '/content/:id', componentFqn: 'core.ContentPage@1.0.0' },
  { key: 'kb-article', path: '/kb/article/:id', componentFqn: 'kb.viewArticle@1.0.0' },
  { key: 'reactor-chat', path: '/reactor', componentFqn: 'core.ReactorChat@1.0.0' },
  { key: 'support-ticket', path: '/support/ticket/:id', componentFqn: 'core.SupportTicketDetailPanel@1.0.0' },
];

describe('parseChatCommentContextId', () => {
  it('parses a simple session and message id', () => {
    expect(parseChatCommentContextId(`${CHAT_COMMENT_CONTEXT_PREFIX}sess1_msg1`)).toEqual({
      sessionId: 'sess1',
      messageId: 'msg1',
    });
  });

  it('splits on the last underscore so a session id containing underscores survives', () => {
    // A naive split('_') would yield sessionId 'sess'; the last-underscore rule
    // keeps the session whole and takes the final segment as the message id.
    expect(parseChatCommentContextId(`${CHAT_COMMENT_CONTEXT_PREFIX}sess_with_underscores_msg1`)).toEqual({
      sessionId: 'sess_with_underscores',
      messageId: 'msg1',
    });
  });

  it('returns null when the prefix is missing', () => {
    expect(parseChatCommentContextId('chat_123_456')).toBeNull();
    expect(parseChatCommentContextId('some-content-slug')).toBeNull();
  });

  it('returns null when the value is empty or undefined', () => {
    expect(parseChatCommentContextId(undefined)).toBeNull();
    expect(parseChatCommentContextId('')).toBeNull();
    expect(parseChatCommentContextId(CHAT_COMMENT_CONTEXT_PREFIX)).toBeNull();
  });

  it('returns null when a side of the separator is empty', () => {
    expect(parseChatCommentContextId(`${CHAT_COMMENT_CONTEXT_PREFIX}sess1_`)).toBeNull();
    expect(parseChatCommentContextId(`${CHAT_COMMENT_CONTEXT_PREFIX}_msg1`)).toBeNull();
  });
});

describe('resolveCommentResource', () => {
  it('resolves content comments to the content route with a param substitution', () => {
    const result = resolveCommentResource({ context: 'ReactoryContent', contextId: 'abc123' }, { routes });

    expect(result.type).toBe('content');
    expect(result.label).toBe('Content');
    expect(result.href).toBe('/content/abc123');
    expect(result.linkable).toBe(true);
  });

  it('treats StaticContent as content and encodes the id', () => {
    const result = resolveCommentResource(
      { context: 'StaticContent', contextId: 'my page/slug' },
      { routes }
    );

    expect(result.type).toBe('content');
    expect(result.href).toBe('/content/my%20page%2Fslug');
  });

  it('appends the id when the route template has no param', () => {
    const result = resolveCommentResource(
      { context: 'KnowledgeBase', contextId: 'article-9' },
      { routes: [{ key: 'kb-home', path: '/kb/', componentFqn: 'kb.libraryHome@1.0.0' }] }
    );

    expect(result.type).toBe('knowledge-base');
    expect(result.href).toBe('/kb/article-9');
  });

  it('resolves a knowledge base comment against an article route', () => {
    const result = resolveCommentResource({ context: 'KnowledgeBase', contextId: 'art-1' }, { routes });

    expect(result.type).toBe('knowledge-base');
    expect(result.label).toBe('Knowledge Base');
    expect(result.href).toBe('/kb/article/art-1');
    expect(result.linkable).toBe(true);
  });

  it('resolves a support ticket comment', () => {
    const result = resolveCommentResource(
      { context: 'ReactorySupportTicket', contextId: 'ticket-77' },
      { routes }
    );

    expect(result.type).toBe('support-ticket');
    expect(result.href).toBe('/support/ticket/ticket-77');
  });

  it('resolves a chat message comment to a session deep link', () => {
    const result = resolveCommentResource(
      { context: 'ReactorChat', contextId: `${CHAT_COMMENT_CONTEXT_PREFIX}sess1_msg1` },
      { routes }
    );

    expect(result.type).toBe('chat');
    expect(result.sessionId).toBe('sess1');
    expect(result.messageId).toBe('msg1');
    expect(result.href).toBe('/reactor?sessionId=sess1&messageId=msg1');
    expect(result.linkable).toBe(true);
  });

  it('prefers the session-scoped chat route and substitutes the session param', () => {
    const appRoutes: CommentRouteLike[] = [
      // An app whose home route also renders the chat (as the Reactor app does).
      { key: 'home', path: '/', componentFqn: 'reactor.ReactorChat@1.0.0' },
      { key: 'chat-session', path: '/chat/:sessionId', componentFqn: 'reactor.ReactorChat@1.0.0' },
    ];

    const result = resolveCommentResource(
      { context: 'ReactorChat', contextId: `${CHAT_COMMENT_CONTEXT_PREFIX}sess1_msg1` },
      { routes: appRoutes }
    );

    expect(result.href).toBe('/chat/sess1?messageId=msg1');
  });

  it('exposes no href when a chat contextId is malformed', () => {
    const result = resolveCommentResource(
      { context: 'ReactorChat', contextId: 'not-a-chat-context' },
      { routes }
    );

    expect(result.type).toBe('chat');
    expect(result.sessionId).toBeUndefined();
    expect(result.href).toBeUndefined();
    expect(result.linkable).toBe(false);
  });

  it('degrades gracefully for an unknown context (no broken links)', () => {
    const result = resolveCommentResource({ context: 'SomeFutureContext', contextId: 'x1' }, { routes });

    expect(result.type).toBe('unknown');
    expect(result.label).toBe('SomeFutureContext');
    expect(result.href).toBeUndefined();
    expect(result.linkable).toBe(false);
  });

  it('produces a descriptor with no href when no route table is supplied', () => {
    const result = resolveCommentResource({ context: 'ReactoryContent', contextId: 'abc123' });

    expect(result.type).toBe('content');
    expect(result.href).toBeUndefined();
    expect(result.linkable).toBe(false);
  });

  it('prefers the ticket route over a content route for a ticket comment', () => {
    const ambiguousRoutes: CommentRouteLike[] = [
      { key: 'content', path: '/content/:id', componentFqn: 'core.ContentPage@1.0.0' },
      { key: 'ticket', path: '/t/:id', componentFqn: 'core.SupportTicketContentPanel@1.0.0' },
    ];

    const result = resolveCommentResource(
      { context: 'ReactorySupportTicket', contextId: 't-1' },
      { routes: ambiguousRoutes }
    );

    expect(result.type).toBe('support-ticket');
    expect(result.href).toBe('/t/t-1');
  });

  it('honours a buildHref override', () => {
    const result = resolveCommentResource(
      { context: 'ReactoryContent', contextId: 'abc' },
      {
        routes,
        buildHref: {
          content: ({ contextId }) => `/custom/${contextId}`,
        },
      }
    );

    expect(result.href).toBe('/custom/abc');
  });

  it('handles missing contextId without throwing', () => {
    const result = resolveCommentResource({ context: 'ReactoryContent' }, { routes });

    expect(result.type).toBe('content');
    expect(result.href).toBeUndefined();
    expect(result.linkable).toBe(false);
  });

  describe('route matching is semantic (component FQN excluded)', () => {
    // The Reactory Management Client routes many unrelated pages through
    // `core.StaticContent`; matching on the FQN made content comments resolve
    // to the first StaticContent route (e.g. `/about/*`).
    const reactoryLikeRoutes: CommentRouteLike[] = [
      { key: 'about', title: 'About Reactory', path: '/about/*', componentFqn: 'core.StaticContent@1.0.0' },
      { key: 'whats-new', title: "What's new", path: '/whats-new/*', componentFqn: 'core.StaticContent@1.0.0' },
      { key: 'content-management', title: 'Content Management', path: '/content', componentFqn: 'core.ContentManagementPage@1.0.0' },
      { key: 'content-management-wildcard', title: 'Content Management', path: '/content/:slug', componentFqn: 'core.StaticContent@1.0.0' },
    ];

    it('picks the content route, not the first StaticContent-backed route', () => {
      const result = resolveCommentResource(
        { context: 'ReactoryContent', contextId: 'my-article' },
        { routes: reactoryLikeRoutes }
      );

      expect(result.type).toBe('content');
      expect(result.href).toBe('/content/my-article');
    });

    it('appends the id into a splat container route', () => {
      const result = resolveCommentResource(
        { context: 'KnowledgeBase', contextId: 'art-7' },
        { routes: [{ key: 'kb', path: '/kb/*', componentFqn: 'kb.Library@1.0.0' }] }
      );

      expect(result.href).toBe('/kb/art-7');
    });

    it('builds a chat query link from a splat chat route', () => {
      const result = resolveCommentResource(
        { context: 'ReactorChat', contextId: `${CHAT_COMMENT_CONTEXT_PREFIX}s1_m1` },
        { routes: [{ key: 'reactor', title: 'Reactory Reactor', path: '/reactor/chat/*', componentFqn: 'reactor.ReactorChat@1.0.0' }] }
      );

      expect(result.href).toBe('/reactor/chat?sessionId=s1&messageId=m1');
    });

    it('does not fabricate a link from a fixed path that cannot address an id', () => {
      const result = resolveCommentResource(
        { context: 'ReactorySupportTicket', contextId: 't-9' },
        { routes: [{ key: 'my-support-tickets', title: 'My Open Tickets', path: '/support/open', componentFqn: 'core.SupportTickets@1.0.0' }] }
      );

      expect(result.type).toBe('support-ticket');
      expect(result.href).toBeUndefined();
      expect(result.linkable).toBe(false);
    });
  });
});
