import React, { useState, useEffect } from 'react';
import { Box, Tooltip, Typography, Stack, Avatar } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { useReactory, withReactory } from '@reactory/client-core/api/ApiProvider';

export interface CommentAnnotationProps {
  /**
   * ID of the associated comment or thread
   */
  commentId: string;

  /**
   * The text snippet being highlighted
   */
  text?: string;

  /**
   * Quoted text (if different from text)
   */
  quote?: string;

  /**
   * Author full name or email for hover preview
   */
  author?: string;

  /**
   * Author avatar URL
   */
  authorAvatar?: string;

  /**
   * Comment text preview
   */
  commentPreview?: string;

  /**
   * Number of comments / replies in this thread
   * @default 1
   */
  commentCount?: number;

  /**
   * Whether this annotation is currently active/focused
   */
  active?: boolean;

  /**
   * Callback fired when the annotation highlight is clicked
   */
  onActivate?: (commentId: string) => void;

  /**
   * Reactory SDK instance
   */
  reactory?: Reactory.Client.ReactorySDK;

  /**
   * Children nodes to render inside the mark element
   */
  children?: React.ReactNode;
}

/**
 * Interactive In-Body Comment Annotation Component
 *
 * Wraps highlighted text passages with an accessible mark element, tooltip preview,
 * thread badge, and click-to-activate event dispatching.
 */
export const CommentAnnotation: React.FC<CommentAnnotationProps> = (props) => {
  const sdkFromHook = useReactory();
  const reactory = props.reactory || sdkFromHook;

  const {
    commentId,
    text,
    quote,
    author,
    authorAvatar,
    commentPreview,
    commentCount = 1,
    active: propActive = false,
    onActivate,
    children,
  } = props;

  const [active, setActive] = useState<boolean>(propActive);
  const [hovered, setHovered] = useState<boolean>(false);

  useEffect(() => {
    setActive(propActive);
  }, [propActive]);

  // Listen to AMQ events for remote highlight selection
  useEffect(() => {
    if (!reactory?.on) return;

    const handleCommentFocus = (evt: any) => {
      if (evt?.commentId === commentId) {
        setActive(true);
      } else {
        setActive(false);
      }
    };

    reactory.on('core.CommentFocused', handleCommentFocus);
    return () => {
      reactory.off('core.CommentFocused', handleCommentFocus);
    };
  }, [commentId, reactory]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActive(true);

    if (onActivate) {
      onActivate(commentId);
    }

    if (reactory?.emit) {
      reactory.emit('core.CommentAnnotationClicked', {
        commentId,
        quote: quote || text,
      });
    }
  };

  const displayText = children || text || quote;

  return (
    <Tooltip
      title={
        <Box sx={{ p: 0.75, maxWidth: 280 }}>
          {author && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Avatar
                src={authorAvatar}
                alt={author}
                sx={{ width: 20, height: 20, fontSize: '0.65rem' }}
              >
                {author.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="caption" fontWeight={700}>
                {author}
              </Typography>
            </Stack>
          )}
          {commentPreview ? (
            <Typography variant="caption" display="block" sx={{ mb: 0.5, fontStyle: 'italic' }}>
              "{commentPreview.length > 80 ? `${commentPreview.substring(0, 80)}...` : commentPreview}"
            </Typography>
          ) : (
            <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
              Thread ({commentCount} {commentCount === 1 ? 'comment' : 'comments'})
            </Typography>
          )}
          <Typography variant="caption" color="primary.light" sx={{ fontWeight: 600, display: 'block' }}>
            Click to view discussion →
          </Typography>
        </Box>
      }
      arrow
      placement="top"
    >
      <Box
        component="mark"
        data-comment-id={commentId}
        className={`reactory-comment-highlight ${active ? 'active' : ''}`}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          backgroundColor: active
            ? 'rgba(255, 179, 0, 0.45)' // Warm amber on active
            : hovered
            ? 'rgba(25, 118, 210, 0.25)' // Soft blue on hover
            : 'rgba(255, 235, 59, 0.38)', // Standard soft highlighter
          color: 'inherit',
          borderRadius: '0',
          padding: '0',
          margin: '0',
          lineHeight: 'inherit',
          cursor: 'pointer',
          borderBottom: '2px solid',
          borderColor: active ? 'warning.main' : hovered ? 'primary.main' : 'rgba(245, 127, 23, 0.6)',
          transition: 'all 120ms ease-in-out',
          display: 'inline',
          position: 'relative',
          textDecoration: 'none',
        }}
      >
        {displayText}
      </Box>
    </Tooltip>
  );
};

export default withReactory(CommentAnnotation, 'core.CommentAnnotation');
