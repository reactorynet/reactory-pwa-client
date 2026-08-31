import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  IconButton,
  Tooltip,
  TextField,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Collapse,
  Chip,
  Avatar,
  CircularProgress,
  Stack,
} from '@mui/material';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ReplyIcon from '@mui/icons-material/Reply';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

import { useReactory, withReactory } from '@reactory/client-core/api/ApiProvider';
import { useContentRender } from '@reactory/client-core/components/shared/hooks/useContentRender';

export interface CommentUser {
  id?: string;
  _id?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  email?: string;
}

export interface ReactoryCommentItem {
  id: string;
  text: string;
  when: string | Date;
  who?: CommentUser;
  upvotes?: number;
  upvoted?: any[];
  downvotes?: number;
  favorites?: number;
  removed?: boolean;
  parentId?: string;
  quote?: string;
  metadata?: Record<string, any>;
  replies?: ReactoryCommentItem[];
}

export interface ReactoryCommentsProps {
  /**
   * The context category for comments (e.g. 'ReactoryContent', 'StaticContent', 'ReactorySupportTicket')
   * @default 'ReactoryContent'
   */
  context?: string;

  /**
   * Unique identifier of the entity or content being commented on
   */
  contextId: string;

  /**
   * Custom title displayed above the comments section
   * @default 'Comments'
   */
  title?: string;

  /**
   * Read-only mode prevents adding or modifying comments
   * @default false
   */
  readOnly?: boolean;

  /**
   * Whether threaded replies are allowed
   * @default true
   */
  allowReplies?: boolean;

  /**
   * Whether upvotes/reactions are allowed
   * @default true
   */
  allowReactions?: boolean;

  /**
   * Custom placeholder text for new comment input
   */
  placeholder?: string;

  /**
   * Optional initial/selected quote to attach to a new comment
   */
  selectedQuote?: string;

  /**
   * Callback to clear active selection quote
   */
  onClearQuote?: () => void;

  /**
   * Elevation for comment cards
   * @default 1
   */
  elevation?: number;

  /**
   * Callback fired when a comment is successfully added
   */
  onCommentAdded?: (comment: ReactoryCommentItem) => void;

  /**
   * Reactory SDK instance (injected via withReactory or hook)
   */
  reactory?: Reactory.Client.ReactorySDK;

  /**
   * Backwards-compatibility prop for pre-supplied static comments list
   */
  comments?: ReactoryCommentItem[];

  /**
   * Backwards-compatibility callback
   */
  newCommentAdded?: (text: string) => void;
}

/**
 * Format date/time to human friendly relative or localized string
 */
const formatCommentDate = (dateVal: string | Date | undefined): string => {
  if (!dateVal) return '';
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return String(dateVal);

  const now = Date.now();
  const diffSec = Math.floor((now - date.getTime()) / 1000);

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
};

/**
 * Single Comment Card with recursive replies
 */
const CommentItem: React.FC<{
  comment: ReactoryCommentItem;
  currentUserId?: string;
  isAdmin?: boolean;
  level?: number;
  readOnly?: boolean;
  allowReplies?: boolean;
  allowReactions?: boolean;
  expandedReplies: Set<string>;
  toggleReplies: (commentId: string) => void;
  onReply: (commentId: string) => void;
  onEdit: (commentId: string, currentText: string) => void;
  onDelete: (commentId: string) => void;
  onUpvote: (commentId: string) => void;
  renderContent: (content: string) => React.ReactNode;
}> = ({
  comment,
  currentUserId,
  isAdmin,
  level = 0,
  readOnly,
  allowReplies = true,
  allowReactions = true,
  expandedReplies,
  toggleReplies,
  onReply,
  onEdit,
  onDelete,
  onUpvote,
  renderContent,
}) => {
  const isAuthor = Boolean(
    currentUserId &&
      (comment.who?.id === currentUserId || (comment.who as any)?._id === currentUserId)
  );

  const hasUpvoted = useMemo(() => {
    if (!comment.upvoted || !currentUserId) return false;
    return comment.upvoted.some((u: any) =>
      typeof u === 'string' ? u === currentUserId : u?.id === currentUserId || u?._id === currentUserId
    );
  }, [comment.upvoted, currentUserId]);

  const hasReplies = Boolean(comment.replies && comment.replies.length > 0);
  const isExpanded = expandedReplies.has(comment.id);

  const authorName = comment.who
    ? `${comment.who.firstName || ''} ${comment.who.lastName || ''}`.trim() ||
      comment.who.email ||
      'Anonymous'
    : 'Anonymous';

  if (comment.removed) {
    return (
      <Box sx={{ my: 1, pl: level * 3, opacity: 0.6 }}>
        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
          <Typography variant="body2" fontStyle="italic" color="text.secondary">
            [This comment has been removed]
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ my: 1.5, pl: level > 0 ? Math.min(level * 2.5, 8) : 0 }} id={`comment-${comment.id}`}>
      <Paper
        variant="outlined"
        onMouseEnter={() => {
          if (comment.quote && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('reactory.comment.hover', { detail: { commentId: comment.id } }));
          }
        }}
        sx={{
          p: 2,
          borderRadius: 2,
          borderLeft: level > 0 ? 3 : 1,
          borderLeftColor: level > 0 ? 'primary.main' : 'divider',
          bgcolor: 'background.paper',
          transition: 'box-shadow 150ms ease',
          '&:hover': {
            boxShadow: 2,
          },
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Avatar
            src={comment.who?.avatar}
            alt={authorName}
            sx={{ width: 34, height: 34, fontSize: '0.875rem' }}
          >
            {authorName.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <Typography variant="subtitle2" fontWeight={600}>
                {authorName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatCommentDate(comment.when)}
              </Typography>
            </Stack>

            {comment.quote && (
              <Paper
                variant="outlined"
                sx={{
                  my: 1,
                  p: 1.25,
                  borderRadius: 1,
                  borderLeft: 3,
                  borderLeftColor: 'primary.main',
                  bgcolor: 'action.hover',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>
                  Annotated text:
                </Typography>
                <Typography variant="body2" fontStyle="italic" color="text.primary">
                  "{comment.quote}"
                </Typography>
              </Paper>
            )}

            <Box sx={{ mt: 0.75, wordBreak: 'break-word' }}>
              {renderContent(comment.text)}
            </Box>

            {/* Action Bar */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              {allowReactions && (
                <Button
                  size="small"
                  variant={hasUpvoted ? 'contained' : 'text'}
                  color="primary"
                  startIcon={hasUpvoted ? <ThumbUpIcon fontSize="small" /> : <ThumbUpAltOutlinedIcon fontSize="small" />}
                  onClick={() => onUpvote(comment.id)}
                  sx={{ textTransform: 'none', minWidth: 60, py: 0.25, px: 1 }}
                >
                  {comment.upvotes || 0}
                </Button>
              )}

              {!readOnly && allowReplies && (
                <Button
                  size="small"
                  startIcon={<ReplyIcon fontSize="small" />}
                  onClick={() => onReply(comment.id)}
                  sx={{ textTransform: 'none', py: 0.25, px: 1 }}
                >
                  Reply
                </Button>
              )}

              {!readOnly && isAuthor && (
                <IconButton size="small" onClick={() => onEdit(comment.id, comment.text)} title="Edit comment">
                  <EditIcon fontSize="small" />
                </IconButton>
              )}

              {!readOnly && (isAuthor || isAdmin) && (
                <IconButton size="small" color="error" onClick={() => onDelete(comment.id)} title="Delete comment">
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}

              {hasReplies && (
                <Button
                  size="small"
                  color="inherit"
                  endIcon={isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  onClick={() => toggleReplies(comment.id)}
                  sx={{ textTransform: 'none', ml: 'auto !important' }}
                >
                  {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                </Button>
              )}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {/* Render nested replies */}
      {hasReplies && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 0.5 }}>
            {comment.replies!.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                level={level + 1}
                readOnly={readOnly}
                allowReplies={allowReplies}
                allowReactions={allowReactions}
                expandedReplies={expandedReplies}
                toggleReplies={toggleReplies}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onUpvote={onUpvote}
                renderContent={renderContent}
              />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

/**
 * Universal Reactory Comments Component
 */
export const Comments: React.FC<ReactoryCommentsProps> = (props) => {
  const sdkFromHook = useReactory();
  const reactory = props.reactory || sdkFromHook;

  const {
    context = 'ReactoryContent',
    contextId,
    title = 'Comments',
    readOnly = false,
    allowReplies = true,
    allowReactions = true,
    placeholder = 'Write a comment...',
    elevation = 1,
    onCommentAdded,
    comments: staticComments,
    newCommentAdded,
    selectedQuote,
    onClearQuote,
  } = props;

  const { renderContent } = useContentRender(reactory);

  const [commentText, setCommentText] = useState('');
  const [activeQuote, setActiveQuote] = useState<string | undefined>(selectedQuote);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [comments, setComments] = useState<ReactoryCommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  const currentUser = reactory?.getUser?.();
  const currentUserId =
    currentUser?.loggedIn?.user?.id || (currentUser as any)?.id || (currentUser as any)?._id;
  const isAdmin =
    reactory?.hasRole?.(['ADMIN', 'SUPPORT_ADMIN', 'DEVELOPER']) || false;

  // Load comments by context
  const fetchComments = useCallback(async () => {
    if (!contextId || staticComments) return;

    setLoading(true);
    try {
      const result = await reactory.graphqlQuery<{
        getCommentsByContext: {
          comments: ReactoryCommentItem[];
        };
      }, { context: string; contextId: string }>(
        `
        query GetCommentsByContext($context: String!, $contextId: String!) {
          getCommentsByContext(context: $context, contextId: $contextId) {
            comments {
              id
              text
              when
              quote
              metadata
              who {
                id
                firstName
                lastName
                avatar
                email
              }
              upvotes
              downvotes
              favorites
              removed
              parentId
              replies {
                id
                text
                when
                quote
                metadata
                who {
                  id
                  firstName
                  lastName
                  avatar
                  email
                }
                upvotes
                parentId
              }
            }
          }
        }
      `,
        { context, contextId }
      );

      if (result.data?.getCommentsByContext?.comments) {
        setComments(result.data.getCommentsByContext.comments);
      }
    } catch (error) {
      reactory.log('Error loading comments', { error, context, contextId }, 'warning');
    } finally {
      setLoading(false);
    }
  }, [context, contextId, staticComments, reactory]);

  useEffect(() => {
    if (selectedQuote) {
      setActiveQuote(selectedQuote);
    }
  }, [selectedQuote]);

  // Real-time AMQ updates
  useEffect(() => {
    if (!reactory?.on) return;

    const handleCommentEvent = (evt: any) => {
      if (evt?.contextId === contextId || evt?.ticketId === contextId) {
        fetchComments();
      }
    };

    reactory.on('core.CommentAdded', handleCommentEvent);
    reactory.on('core.CommentUpdated', handleCommentEvent);
    reactory.on('core.SupportTicketUpdated', handleCommentEvent);

    return () => {
      reactory.off('core.CommentAdded', handleCommentEvent);
      reactory.off('core.CommentUpdated', handleCommentEvent);
      reactory.off('core.SupportTicketUpdated', handleCommentEvent);
    };
  }, [contextId, fetchComments, reactory]);

  // Toggle reply expansion
  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  // Submit new comment or reply
  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    if (newCommentAdded) {
      newCommentAdded(commentText.trim());
      setCommentText('');
      setReplyingToId(null);
      return;
    }

    setSubmitting(true);
    try {
      const result = await reactory.graphqlMutation<{
        createComment: ReactoryCommentItem;
      }, { input: { context: string; contextId: string; text: string; parentId?: string; quote?: string; metadata?: any } }>(
        `
        mutation CreateComment($input: CreateCommentInput!) {
          createComment(input: $input) {
            id
            text
            when
            quote
            metadata
            who {
              id
              firstName
              lastName
              avatar
              email
            }
            parentId
          }
        }
      `,
        {
          input: {
            context,
            contextId,
            text: commentText.trim(),
            parentId: replyingToId || undefined,
            quote: activeQuote || undefined,
            metadata: activeQuote ? { quote: activeQuote } : undefined,
          },
        }
      );

      const created = result.data?.createComment;
      if (created) {
        setCommentText('');
        setActiveQuote(undefined);
        if (onClearQuote) onClearQuote();
        if (replyingToId) {
          setExpandedReplies((prev) => new Set(prev).add(replyingToId));
          setReplyingToId(null);
        }
        await fetchComments();
        if (onCommentAdded) onCommentAdded(created);
      }
    } catch (error: any) {
      reactory.log('Error creating comment', { error }, 'error');
      reactory.createNotification?.('Failed to submit comment', {
        title: 'Error',
        options: { body: error.message || 'An error occurred while posting comment' },
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Save edit
  const handleSaveEdit = async (commentId: string) => {
    if (!commentText.trim()) return;

    setSubmitting(true);
    try {
      const result = await reactory.graphqlMutation<{
        editComment: { id: string; text: string };
      }, { input: { commentId: string; text: string } }>(
        `
        mutation EditComment($input: EditCommentInput!) {
          editComment(input: $input) {
            id
            text
          }
        }
      `,
        {
          input: {
            commentId,
            text: commentText.trim(),
          },
        }
      );

      if (result.data) {
        setEditingId(null);
        setCommentText('');
        await fetchComments();
      }
    } catch (error: any) {
      reactory.log('Error editing comment', { error }, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Upvote toggle
  const handleUpvote = async (commentId: string) => {
    try {
      await reactory.graphqlMutation<{
        upvoteComment: { id: string; upvotes?: number };
      }, { commentId: string }>(
        `
        mutation UpvoteComment($commentId: ObjID!) {
          upvoteComment(commentId: $commentId) {
            id
            upvotes
          }
        }
      `,
        { commentId }
      );
      await fetchComments();
    } catch (error) {
      reactory.log('Error toggling upvote', { error }, 'error');
    }
  };

  // Delete comment
  const handleConfirmDelete = async () => {
    if (!commentToDelete) return;

    try {
      await reactory.graphqlMutation<{
        deleteComment: any;
      }, { input: { commentId: string; softDelete?: boolean } }>(
        `
        mutation DeleteComment($input: DeleteCommentInput!) {
          deleteComment(input: $input) {
            ... on DeleteCommentSuccess {
              success
            }
          }
        }
      `,
        {
          input: {
            commentId: commentToDelete,
            softDelete: true,
          },
        }
      );
      await fetchComments();
    } catch (error) {
      reactory.log('Error deleting comment', { error }, 'error');
    } finally {
      setDeleteDialogOpen(false);
      setCommentToDelete(null);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {title && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <ChatBubbleOutlineIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            {title} ({comments.length})
          </Typography>
        </Stack>
      )}

      {/* Main Comment Input */}
      {!readOnly && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          {activeQuote && (
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                mb: 1.5,
                borderRadius: 1,
                borderLeft: 3,
                borderLeftColor: 'primary.main',
                bgcolor: 'action.hover',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" fontWeight={600} color="primary">
                  Commenting on highlighted text:
                </Typography>
                <Chip
                  label="Remove highlight"
                  size="small"
                  variant="outlined"
                  onDelete={() => {
                    setActiveQuote(undefined);
                    if (onClearQuote) onClearQuote();
                  }}
                />
              </Stack>
              <Typography variant="body2" fontStyle="italic" sx={{ mt: 0.5 }}>
                "{activeQuote}"
              </Typography>
            </Paper>
          )}

          {replyingToId && (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Chip
                label="Replying to thread"
                size="small"
                color="primary"
                onDelete={() => setReplyingToId(null)}
              />
            </Stack>
          )}

          {editingId && (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Chip
                label="Editing comment"
                size="small"
                color="secondary"
                onDelete={() => {
                  setEditingId(null);
                  setCommentText('');
                }}
              />
            </Stack>
          )}

          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={6}
            placeholder={placeholder}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            variant="outlined"
            size="small"
            disabled={submitting}
          />

          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.5 }}>
            {(replyingToId || editingId) && (
              <Button
                size="small"
                onClick={() => {
                  setReplyingToId(null);
                  setEditingId(null);
                  setCommentText('');
                }}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="contained"
              size="small"
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon fontSize="small" />}
              disabled={submitting || !commentText.trim()}
              onClick={editingId ? () => handleSaveEdit(editingId) : handleSubmitComment}
            >
              {editingId ? 'Save' : replyingToId ? 'Reply' : 'Comment'}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Comment List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      ) : comments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No comments yet. Be the first to start the conversation!
        </Typography>
      ) : (
        <Box>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              level={0}
              readOnly={readOnly}
              allowReplies={allowReplies}
              allowReactions={allowReactions}
              expandedReplies={expandedReplies}
              toggleReplies={toggleReplies}
              onReply={(id) => {
                setReplyingToId(id);
                setEditingId(null);
              }}
              onEdit={(id, text) => {
                setEditingId(id);
                setReplyingToId(null);
                setCommentText(text);
              }}
              onDelete={(id) => {
                setCommentToDelete(id);
                setDeleteDialogOpen(true);
              }}
              onUpvote={handleUpvote}
              renderContent={renderContent}
            />
          ))}
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Comment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove this comment? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export const CommentComponent = CommentItem;
export default withReactory(Comments, 'core.Comments');
