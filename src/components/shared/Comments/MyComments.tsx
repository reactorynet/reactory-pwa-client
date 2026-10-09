import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';

import { useReactory, withReactory } from '@reactory/client-core/api/ApiProvider';
import { ReactoryCommentItem } from './Comments';
import { resolveCommentResource, CommentRouteLike } from './commentResourceLinks';

/**
 * "My Comments" — a lookup space where a signed-in user can review every
 * comment they have authored across the platform and jump back to the
 * originating resource.
 *
 * The back-link for each row is derived from the comment's `context` and
 * `contextId` via `resolveCommentResource`, matched against the application
 * route table. Comments whose resource cannot be resolved are still listed, but
 * without a link (never a broken one).
 */
export interface MyCommentsProps {
  /** Reactory SDK instance (injected via withReactory). */
  reactory?: Reactory.Client.ReactorySDK;
  /** Heading shown above the list. */
  title?: string;
  /** Rows per page (default 20). */
  pageSize?: number;
  /** Override the application route table used for back-links. */
  routes?: CommentRouteLike[];
  /** Hide the heading (useful when embedded in a page that already has one). */
  hideTitle?: boolean;
}

interface CommentPaging {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
}

interface CommentContextStat {
  context: string;
  count: number;
}

const MY_COMMENTS_QUERY = `
  query GetMyComments($context: String, $searchTerm: String, $includeRemoved: Boolean, $paging: PagingRequest) {
    getMyComments(context: $context, searchTerm: $searchTerm, includeRemoved: $includeRemoved, paging: $paging) {
      comments {
        id
        text
        when
        quote
        context
        contextId
        removed
        parentId
        upvotes
        favorites
        who {
          id
          firstName
          lastName
          avatar
          email
        }
      }
      paging {
        page
        pageSize
        total
        hasNext
      }
    }
  }
`;

const MY_COMMENT_STATS_QUERY = `
  query GetMyCommentStats {
    getMyCommentStats {
      context
      count
    }
  }
`;

/** Friendly labels for context categories, used in the filter dropdown. */
const CONTEXT_LABELS: Record<string, string> = {
  ReactoryContent: 'Content',
  StaticContent: 'Static Content',
  KnowledgeBase: 'Knowledge Base',
  ReactorChat: 'Reactor Chat',
  ReactorySupportTicket: 'Support Ticket',
};

const contextLabel = (context: string): string => CONTEXT_LABELS[context] || context || 'Unknown';

const formatCommentDate = (value?: string | Date): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const MyComments: React.FC<MyCommentsProps> = (props) => {
  const {
    title = 'My Comments',
    pageSize = 20,
    hideTitle = false,
  } = props;

  const sdkFromHook = useReactory();
  const reactory = props.reactory || sdkFromHook;

  const [comments, setComments] = useState<ReactoryCommentItem[]>([]);
  const [paging, setPaging] = useState<CommentPaging>({ page: 1, pageSize, total: 0, hasNext: false });
  const [stats, setStats] = useState<CommentContextStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [contextFilter, setContextFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const routes = useMemo<CommentRouteLike[] | undefined>(() => {
    if (props.routes) return props.routes;
    if (reactory && typeof reactory.getRoutes === 'function') {
      return reactory.getRoutes() as unknown as CommentRouteLike[];
    }
    return undefined;
  }, [props.routes, reactory]);

  const fetchComments = useCallback(async () => {
    if (!reactory || typeof reactory.graphqlQuery !== 'function') return;

    setLoading(true);
    setError(null);

    try {
      const result = await reactory.graphqlQuery<
        { getMyComments: { comments: ReactoryCommentItem[]; paging: CommentPaging } },
        { context?: string; searchTerm?: string; includeRemoved?: boolean; paging: { page: number; pageSize: number } }
      >(MY_COMMENTS_QUERY, {
        context: contextFilter || undefined,
        searchTerm: searchTerm || undefined,
        includeRemoved: true,
        paging: { page, pageSize },
      });

      if (!mountedRef.current) return;

      const payload = result?.data?.getMyComments;
      setComments(payload?.comments || []);
      setPaging(payload?.paging || { page, pageSize, total: 0, hasNext: false });
    } catch (err: any) {
      if (!mountedRef.current) return;
      setError(err?.message || 'Failed to load your comments.');
      setComments([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [reactory, contextFilter, searchTerm, page, pageSize]);

  const fetchStats = useCallback(async () => {
    if (!reactory || typeof reactory.graphqlQuery !== 'function') return;
    try {
      const result = await reactory.graphqlQuery<{ getMyCommentStats: CommentContextStat[] }, {}>(
        MY_COMMENT_STATS_QUERY,
        {}
      );
      if (mountedRef.current) setStats(result?.data?.getMyCommentStats || []);
    } catch {
      // Facet counts are non-critical; the list still works without them.
    }
  }, [reactory]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  // Refresh when comments change elsewhere in the app.
  useEffect(() => {
    if (!reactory || typeof reactory.on !== 'function') return undefined;

    const handleChange = () => {
      void fetchComments();
      void fetchStats();
    };

    reactory.on('core.CommentAdded', handleChange);
    reactory.on('core.CommentUpdated', handleChange);

    return () => {
      if (typeof reactory.off === 'function') {
        reactory.off('core.CommentAdded', handleChange);
        reactory.off('core.CommentUpdated', handleChange);
      }
    };
  }, [reactory, fetchComments, fetchStats]);

  const applySearch = () => {
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((paging.total || 0) / (paging.pageSize || pageSize))),
    [paging.total, paging.pageSize, pageSize]
  );

  const contextOptions = useMemo(() => {
    const present = new Set<string>(stats.map((stat) => stat.context));
    if (contextFilter) present.add(contextFilter);
    return Array.from(present).filter(Boolean).sort();
  }, [stats, contextFilter]);

  const handleRefresh = () => {
    void fetchComments();
    void fetchStats();
  };

  return (
    <Box sx={{ width: '100%' }}>
      {!hideTitle && (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <ForumOutlinedIcon color="primary" />
          <Typography variant="h5" fontWeight={600}>
            {title}
          </Typography>
        </Stack>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mb: 2 }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <TextField
          select
          size="small"
          label="Context"
          value={contextFilter}
          onChange={(event) => {
            setContextFilter(event.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All contexts</MenuItem>
          {contextOptions.map((context) => {
            const count = stats.find((stat) => stat.context === context)?.count;
            return (
              <MenuItem key={context} value={context}>
                {contextLabel(context)}
                {typeof count === 'number' ? ` (${count})` : ''}
              </MenuItem>
            );
          })}
        </TextField>

        <TextField
          size="small"
          label="Search my comments"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') applySearch();
          }}
          sx={{ flex: 1, minWidth: 200 }}
        />

        <Button variant="outlined" onClick={applySearch} sx={{ textTransform: 'none' }}>
          Search
        </Button>

        <Button
          variant="text"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          sx={{ textTransform: 'none' }}
        >
          Refresh
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && comments.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : comments.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            You have not commented on anything yet.
          </Typography>
        </Paper>
      ) : (
        <Stack divider={<Divider flexItem />} spacing={0}>
          {comments.map((comment) => {
            const resource = resolveCommentResource(
              { context: comment.context, contextId: comment.contextId },
              { routes }
            );

            return (
              <Paper key={comment.id} variant="outlined" sx={{ p: 2, my: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap">
                  <Chip size="small" color="primary" variant="outlined" label={resource.label} />
                  {comment.removed && <Chip size="small" color="warning" label="Removed" />}
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    {formatCommentDate(comment.when)}
                  </Typography>
                </Stack>

                {comment.quote && (
                  <Box
                    sx={{
                      borderLeft: 3,
                      borderColor: 'divider',
                      pl: 1.5,
                      mb: 1,
                      color: 'text.secondary',
                      fontStyle: 'italic',
                    }}
                  >
                    <Typography variant="body2">{comment.quote}</Typography>
                  </Box>
                )}

                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 1.5 }}>
                  {comment.text}
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center">
                  {resource.linkable ? (
                    <Button
                      size="small"
                      variant="outlined"
                      endIcon={<OpenInNewIcon fontSize="small" />}
                      href={resource.href}
                      sx={{ textTransform: 'none' }}
                    >
                      View resource
                    </Button>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Resource link unavailable
                    </Typography>
                  )}
                  {comment.parentId && (
                    <Typography variant="caption" color="text.secondary">
                      Reply
                    </Typography>
                  )}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      {paging.total > (paging.pageSize || pageSize) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            color="primary"
            page={page}
            count={totalPages}
            onChange={(_event, value) => setPage(value)}
          />
        </Box>
      )}
    </Box>
  );
};

export default withReactory(MyComments, 'core.MyComments');
