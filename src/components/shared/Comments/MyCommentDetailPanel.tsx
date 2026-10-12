import React, { useMemo } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import ReplyIcon from '@mui/icons-material/Reply';

import { useReactory } from '@reactory/client-core/api/ApiProvider';
import { ReactoryCommentItem } from './Comments';
import { resolveCommentResource, CommentRouteLike } from './commentResourceLinks';
import { MyCommentContextBadge } from './MyCommentContextBadge';

/**
 * Expanding detail panel for a single "My Comments" grid row.
 *
 * The grid list deliberately clamps comment bodies; this panel is where the
 * full comment is rendered. It also carries the panel's only outbound action:
 * a **View resource** link that resolves the originating content / chat / ticket
 * from the comment's `context` + `contextId` (see `resolveCommentResource`) so
 * the user can jump straight back to where the comment lives.
 *
 * Registered as `core.MyCommentDetailPanel@1.0.0` and wired via the grid's
 * `componentMap.DetailsPanel`.
 */
export interface MyCommentDetailPanelProps {
  /** The mapped row (grid `detailPanelPropsMap: { 'props.rowData': 'comment' }`). */
  comment?: ReactoryCommentItem;
  /** Raw row data, as a fallback when `comment` is not mapped. */
  rowData?: ReactoryCommentItem;
  /** Override the route table used to build back-links. */
  routes?: CommentRouteLike[];
  /** Reactory SDK (injected by the MaterialTableWidget). */
  reactory?: Reactory.Client.ReactorySDK;
  useCase?: string;
}

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

const authorName = (comment?: ReactoryCommentItem): string => {
  const who: any = comment?.who;
  if (!who) return 'You';
  const named = `${who.firstName || ''} ${who.lastName || ''}`.trim();
  return named || who.email || 'You';
};

export const MyCommentDetailPanel: React.FC<MyCommentDetailPanelProps> = (props) => {
  const hookReactory = useReactory();
  const reactory = props.reactory || hookReactory;
  const comment = props.comment || props.rowData;

  const routes = useMemo<CommentRouteLike[] | undefined>(() => {
    if (props.routes && props.routes.length > 0) return props.routes;
    if (reactory && typeof reactory.getRoutes === 'function') {
      return reactory.getRoutes() as unknown as CommentRouteLike[];
    }
    return undefined;
  }, [props.routes, reactory]);

  const resource = useMemo(
    () => resolveCommentResource({ context: comment?.context, contextId: comment?.contextId }, { routes }),
    [comment?.context, comment?.contextId, routes]
  );

  if (!comment) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">No comment data available.</Typography>
      </Box>
    );
  }

  const name = authorName(comment);

  return (
    <Paper
      elevation={0}
      data-testid="my-comment-detail-panel"
      sx={{
        p: 2,
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'),
        borderRadius: 1,
      }}
    >
      {/* Header: context, state flags, timestamp */}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1.5 }}>
        <MyCommentContextBadge context={comment.context} />
        {comment.removed && <Chip size="small" color="warning" label="Removed" />}
        {comment.parentId && (
          <Chip size="small" variant="outlined" icon={<ReplyIcon fontSize="small" />} label="Reply" />
        )}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {formatCommentDate(comment.when)}
        </Typography>
      </Stack>

      {/* Author */}
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
        <Avatar src={(comment.who as any)?.avatar} alt={name} sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
          {name.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="subtitle2" fontWeight={600}>
            {name}
          </Typography>
          {comment.who?.email && (
            <Typography variant="caption" color="text.secondary">
              {comment.who.email}
            </Typography>
          )}
        </Box>
      </Stack>

      <Divider sx={{ mb: 1.5 }} />

      {/* Anchored quote, when the comment annotates a selection */}
      {comment.quote && (
        <Box
          sx={{
            borderLeft: 3,
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
            borderRadius: 1,
            pl: 1.5,
            py: 1,
            pr: 1.5,
            mb: 1.5,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>
            Annotated text
          </Typography>
          <Typography variant="body2" fontStyle="italic">
            “{comment.quote}”
          </Typography>
        </Box>
      )}

      {/* Full comment body */}
      <Typography
        variant="body1"
        sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mb: 2 }}
        data-testid="my-comment-detail-text"
      >
        {comment.text}
      </Typography>

      {/* Footer: reactions + the outbound link */}
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        {typeof comment.upvotes === 'number' && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <ThumbUpAltOutlinedIcon fontSize="small" color="disabled" />
            <Typography variant="caption" color="text.secondary">
              {comment.upvotes} upvote{comment.upvotes === 1 ? '' : 's'}
            </Typography>
          </Stack>
        )}
        {typeof comment.favorites === 'number' && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <StarBorderOutlinedIcon fontSize="small" color="disabled" />
            <Typography variant="caption" color="text.secondary">
              {comment.favorites} favorite{comment.favorites === 1 ? '' : 's'}
            </Typography>
          </Stack>
        )}

        {resource.linkable ? (
          <Button
            size="small"
            variant="outlined"
            endIcon={<OpenInNewIcon fontSize="small" />}
            href={resource.href}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ textTransform: 'none', ml: 'auto' }}
          >
            View resource
          </Button>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Resource link unavailable
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

export default MyCommentDetailPanel;
