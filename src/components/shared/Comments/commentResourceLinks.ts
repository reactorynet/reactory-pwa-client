/**
 * Comment resource link resolution.
 *
 * A comment is stored against a `context` (a resource category) and a
 * `contextId` (the identifier of the specific resource). This module turns that
 * pair into something the UI can render as a "View resource" link.
 *
 * `context` is an open string, so every lookup here is defensive:
 *  - the resource *type* is derived from a known-context map;
 *  - the navigable path is resolved from the application's own route table
 *    (routes are per-application, so they are supplied by the caller rather
 *    than hard-coded), matched on the route key / path / title (the component
 *    FQN is deliberately excluded: many unrelated routes share a component
 *    such as `core.StaticContent`, which would otherwise false-match);
 *  - anything unrecognised degrades to a labelled, non-linkable descriptor
 *    rather than emitting a broken href.
 */

/** The subset of the application route table this module needs. */
export interface CommentRouteLike {
  path?: string;
  componentFqn?: string;
  key?: string;
  id?: string;
  title?: string;
}

export type CommentResourceType =
  | 'content'
  | 'knowledge-base'
  | 'chat'
  | 'support-ticket'
  | 'unknown';

export interface ResolvedCommentResource {
  /** Resource category resolved from the comment context. */
  type: CommentResourceType;
  /** Human readable label for the resource kind. */
  label: string;
  /** Navigable href, present only when a target route could be resolved. */
  href?: string;
  /** The stored contextId. */
  contextId?: string;
  /** For chat comments: the chat session the message belongs to. */
  sessionId?: string;
  /** For chat comments: the commented message id. */
  messageId?: string;
  /** The matched route path template (without query string), when found. */
  routePath?: string;
  /** True when a navigable href was produced. */
  linkable: boolean;
}

export interface CommentResourceResolveOptions {
  /**
   * The application route table (typically `reactory.getRoutes()`).
   * Without it, descriptors are still produced but `href` is omitted.
   */
  routes?: CommentRouteLike[];
  /** Override href construction for a specific resource type. */
  buildHref?: Partial<
    Record<
      CommentResourceType,
      (ctx: { contextId?: string; sessionId?: string; messageId?: string }) => string | undefined
    >
  >;
}

/** Fixed prefix used by ReactorChat message comment contextIds. */
export const CHAT_COMMENT_CONTEXT_PREFIX = 'reactor_chat_';

/**
 * Parses a ReactorChat message comment contextId of the form
 * `reactor_chat_<sessionId>_<messageId>`.
 *
 * Session and message ids may themselves contain `_`, so the remainder is split
 * on the **last** underscore: everything after the fixed prefix up to the last
 * `_` is the session id, and everything after it is the message id.
 *
 * Returns `null` when the value is missing, lacks the prefix, or is malformed.
 */
export const parseChatCommentContextId = (
  contextId?: string
): { sessionId: string; messageId: string } | null => {
  if (!contextId || !contextId.startsWith(CHAT_COMMENT_CONTEXT_PREFIX)) {
    return null;
  }

  const rest = contextId.slice(CHAT_COMMENT_CONTEXT_PREFIX.length);
  const separator = rest.lastIndexOf('_');

  // Need at least one character on both sides of the separator.
  if (separator <= 0 || separator >= rest.length - 1) {
    return null;
  }

  return {
    sessionId: rest.slice(0, separator),
    messageId: rest.slice(separator + 1),
  };
};

/** Known context categories → resource type. */
const CONTEXT_TYPE_MAP: Record<string, CommentResourceType> = {
  ReactoryContent: 'content',
  StaticContent: 'content',
  KnowledgeBase: 'knowledge-base',
  ReactorChat: 'chat',
  ReactorySupportTicket: 'support-ticket',
};

interface ResourceMatcher {
  type: CommentResourceType;
  label: string;
  patterns: RegExp[];
}

/**
 * Matchers are applied in order. Ticket/KB are tested before `content` so a
 * route named e.g. "SupportTicketContent" resolves to the ticket, not content.
 */
const MATCHERS: ResourceMatcher[] = [
  {
    type: 'support-ticket',
    label: 'Support Ticket',
    patterns: [/support[-_.\s]?ticket/i, /\btickets?\b/i, /ticketdetail/i],
  },
  {
    type: 'knowledge-base',
    label: 'Knowledge Base',
    patterns: [/knowledge[-_.\s]?base/i, /\bkb\b/i, /knowledgebase/i],
  },
  {
    type: 'chat',
    label: 'Reactor Chat',
    patterns: [/reactor[-_.\s]?chat/i, /reactorchat/i, /\bchat\b/i],
  },
  {
    type: 'content',
    label: 'Content',
    patterns: [/static[-_.\s]?content/i, /content/i],
  },
];

/**
 * Semantic haystack for route matching. The component FQN is intentionally
 * omitted: a single component (e.g. `core.StaticContent@1.0.0`) backs many
 * unrelated routes, so matching on it produced false positives such as a
 * content comment resolving to `/about/*`.
 */
const routeHaystack = (route: CommentRouteLike): string =>
  [route.key, route.id, route.path, route.title]
    .filter((value) => typeof value === 'string' && value.length > 0)
    .join(' ');

const findRouteFor = (
  type: CommentResourceType,
  routes?: CommentRouteLike[],
  preferParam?: string
): CommentRouteLike | undefined => {
  const matcher = MATCHERS.find((candidate) => candidate.type === type);
  if (!matcher || !Array.isArray(routes)) return undefined;

  const matches = routes.filter((route) =>
    matcher.patterns.some((pattern) => pattern.test(routeHaystack(route)))
  );

  if (matches.length === 0) return undefined;

  // Several routes can share a component (e.g. an app whose home route also
  // renders the chat). Prefer the one that actually carries the identifying
  // param, so the link lands on the resource rather than the generic surface.
  if (preferParam) {
    const preferred = matches.find(
      (route) => typeof route.path === 'string' && route.path.includes(preferParam)
    );
    if (preferred) return preferred;
  }

  return matches[0];
};

const PARAM_PATTERN = /:([A-Za-z_][A-Za-z0-9_]*)/g;
const hasPathParam = (path: string): boolean => /:[A-Za-z_][A-Za-z0-9_]*/.test(path);

/**
 * Substitutes `:name` path params from `params`, falling back to `fallback`
 * for unknown params. Params that cannot be resolved are left intact.
 */
const substituteParams = (
  template: string,
  params: Record<string, string | undefined>,
  fallback?: string
): string =>
  template.replace(PARAM_PATTERN, (_match, name: string) => {
    const value = params[name] ?? fallback;
    return value ? encodeURIComponent(value) : `:${name}`;
  });

/** Preferred identifying param per resource type, when an app offers several. */
const PREFERRED_PARAMS: Partial<Record<CommentResourceType, string>> = {
  content: ':slug',
  'knowledge-base': ':id',
  'support-ticket': ':id',
};

/** A path that can host a trailing id: `/kb/`, `/content/*`. */
const isContainerPath = (path: string): boolean => path.endsWith('*') || path.endsWith('/');

/** Removes a trailing splat so a query string can be appended cleanly. */
const stripContainerSuffix = (path: string): string => path.replace(/\/\*$/, '').replace(/\*$/, '');

/**
 * Builds a detail href for a specific resource id from a route template.
 *
 * Returns undefined when the template cannot address an individual resource
 * (a fixed path with neither a param nor a container suffix). Callers then
 * degrade to a labelled, non-linkable descriptor instead of a broken link.
 */
const buildDetailHref = (template: string, id: string): string | undefined => {
  if (hasPathParam(template)) {
    return substituteParams(template, { id, contextId: id }, id);
  }

  if (isContainerPath(template)) {
    const base = stripContainerSuffix(template).replace(/\/+$/, '');
    return `${base}/${encodeURIComponent(id)}`;
  }

  return undefined;
};

const appendQuery = (
  path: string,
  params: Record<string, string | undefined>
): string => {
  const search = Object.entries(params)
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`)
    .join('&');

  if (!search) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${search}`;
};

/**
 * Resolves a comment's `context` + `contextId` into a display descriptor and,
 * where possible, a navigable link to the originating resource.
 */
export const resolveCommentResource = (
  input: { context?: string; contextId?: string },
  options: CommentResourceResolveOptions = {}
): ResolvedCommentResource => {
  const context = (input?.context || '').trim();
  const contextId = (input?.contextId || '').trim();

  const type = CONTEXT_TYPE_MAP[context] || 'unknown';
  const matcher = MATCHERS.find((candidate) => candidate.type === type);
  const label = matcher?.label || (context || 'Unknown context');

  if (type === 'unknown') {
    return { type, label, contextId: contextId || undefined, linkable: false };
  }

  if (type === 'chat') {
    const parsed = parseChatCommentContextId(contextId);
    const route = findRouteFor('chat', options.routes, ':sessionId');
    const override = options.buildHref?.chat;

    let href = override
      ? override({ contextId, sessionId: parsed?.sessionId, messageId: parsed?.messageId })
      : undefined;

    if (!href && route?.path && parsed?.sessionId) {
      const sessionInPath = hasPathParam(route.path) && route.path.includes(':sessionId');

      // Prefer a session-scoped path (/chat/:sessionId); otherwise carry the
      // session id in the query string.
      const path = sessionInPath
        ? substituteParams(
            route.path,
            { sessionId: parsed.sessionId, messageId: parsed.messageId },
            parsed.sessionId
          )
        : stripContainerSuffix(route.path);

      href = appendQuery(path, {
        sessionId: sessionInPath ? undefined : parsed.sessionId,
        messageId: parsed.messageId,
      });
    }

    return {
      type,
      label,
      contextId: contextId || undefined,
      sessionId: parsed?.sessionId,
      messageId: parsed?.messageId,
      routePath: route?.path,
      href,
      linkable: Boolean(href),
    };
  }

  const route = findRouteFor(type, options.routes, PREFERRED_PARAMS[type]);
  const override = options.buildHref?.[type];

  let href = override ? override({ contextId }) : undefined;
  if (!href && route?.path && contextId) {
    href = buildDetailHref(route.path, contextId);
  }

  return {
    type,
    label,
    contextId: contextId || undefined,
    routePath: route?.path,
    href,
    linkable: Boolean(href),
  };
};

export default resolveCommentResource;
