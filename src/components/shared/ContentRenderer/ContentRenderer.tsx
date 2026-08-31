import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Paper,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Drawer,
  IconButton,
  Typography,
  Divider,
  Stack,
  Fade,
  SxProps,
  Theme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import AddCommentIcon from '@mui/icons-material/AddComment';
import CloseIcon from '@mui/icons-material/Close';

import { useReactory, withReactory } from '@reactory/client-core/api/ApiProvider';
import { useContentRender } from '@reactory/client-core/components/shared/hooks/useContentRender';
import { Comments, ReactoryCommentsProps, ReactoryCommentItem } from '@reactory/client-core/components/shared/Comments/Comments';

export type ContentCommentLayout = 'bottom' | 'accordion' | 'drawer' | 'card';

export interface ContentRendererProps {
  /**
   * Raw content string to render (Markdown, HTML, Plain text, Mermaid, LaTeX symbols, Reactory tags)
   */
  content: string;

  /**
   * Unique identifier of the content item.
   * Required for commenting to be activated.
   */
  id?: string;

  /**
   * Flag enabling the commenting experience on this content.
   * Only activates when `id` is also provided.
   * @default false
   */
  enableComments?: boolean;

  /**
   * Context category for the comments database records.
   * @default 'ReactoryContent'
   */
  context?: string;

  /**
   * Layout presentation style for comments.
   * - 'bottom': Renders below content in standard flow (default)
   * - 'accordion': Collapsible accordion below content
   * - 'drawer': Slide-out drawer activated via a floating or inline button
   * - 'card': Outlined card container below content
   * @default 'bottom'
   */
  commentLayout?: ContentCommentLayout;

  /**
   * Detailed configuration overrides for the Comments component
   */
  commentsProps?: Partial<ReactoryCommentsProps>;

  /**
   * Container element type to wrap the renderer
   * @default 'Box'
   */
  container?: 'Box' | 'Paper' | 'Card' | 'div';

  /**
   * Custom Sx styling on the outer wrapper
   */
  sx?: SxProps<Theme>;

  /**
   * Additional properties passed to the container component
   */
  containerProps?: Record<string, any>;

  /**
   * Injected Reactory SDK instance
   */
  reactory?: Reactory.Client.ReactorySDK;

  /**
   * Callback fired when a comment is added to this content
   */
  onCommentAdded?: (comment: any) => void;
}

/**
 * Safely applies in-body highlight markers in the rendered DOM
 * without splitting or disrupting markdown document structures.
 */
const applyDomHighlights = (
  container: HTMLElement,
  comments: ReactoryCommentItem[],
  activeCommentId?: string,
  onCommentClick?: (commentId: string) => void
) => {
  if (!container) return;

  // 1. Clear any existing injected marks
  const existingMarks = container.querySelectorAll('mark.reactory-comment-highlight');
  existingMarks.forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
      parent.normalize();
    }
  });

  const commentsWithQuotes = comments.filter(
    (c) => !c.removed && c.quote && c.quote.trim().length > 1
  );

  if (commentsWithQuotes.length === 0) return;

  // Sort longest quote first
  const sorted = [...commentsWithQuotes].sort((a, b) => b.quote!.length - a.quote!.length);

  for (const comment of sorted) {
    const quote = comment.quote!.trim();
    if (!quote) continue;

    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parentTag = node.parentElement?.tagName.toLowerCase();
          if (parentTag === 'code' || parentTag === 'pre' || parentTag === 'script' || parentTag === 'style') {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.parentElement?.classList?.contains('reactory-comment-highlight')) {
            return NodeFilter.FILTER_REJECT;
          }
          return node.nodeValue && node.nodeValue.toLowerCase().includes(quote.toLowerCase())
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        },
      }
    );

    const textNodes: Text[] = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
      textNodes.push(currentNode as Text);
      currentNode = walker.nextNode();
    }

    for (const textNode of textNodes) {
      const text = textNode.nodeValue || '';
      const index = text.toLowerCase().indexOf(quote.toLowerCase());
      if (index >= 0) {
        const matchedText = text.substring(index, index + quote.length);
        const mark = document.createElement('mark');
        mark.className = `reactory-comment-highlight${activeCommentId === comment.id ? ' active' : ''}`;
        mark.setAttribute('data-comment-id', comment.id);
        mark.title = `${comment.who?.firstName || 'User'}: ${comment.text || ''}`;
        mark.textContent = matchedText;

        mark.style.backgroundColor = activeCommentId === comment.id
          ? 'rgba(255, 179, 0, 0.55)'
          : 'rgba(255, 235, 59, 0.45)';
        mark.style.color = 'inherit';
        mark.style.borderRadius = '3px';
        mark.style.padding = '1px 3px';
        mark.style.borderBottom = '2px solid #f57f17';
        mark.style.cursor = 'pointer';
        mark.style.display = 'inline';

        mark.onclick = (e) => {
          e.stopPropagation();
          if (onCommentClick) onCommentClick(comment.id);
        };

        const afterText = text.substring(index + quote.length);
        const beforeText = text.substring(0, index);

        const parent = textNode.parentNode;
        if (parent) {
          if (afterText) {
            parent.insertBefore(document.createTextNode(afterText), textNode.nextSibling);
          }
          parent.insertBefore(mark, textNode.nextSibling);
          textNode.nodeValue = beforeText;
        }
        break; // Highlight first match per quote
      }
    }
  }
};

/**
 * Universal ContentRenderer Component
 *
 * Renders rich content (Markdown, HTML, Code, Mermaid, LaTeX expressions, and live `<reactory />` components)
 * with in-body highlight annotations, text-selection comment launcher, and customizable comment placement.
 */
export const ContentRenderer: React.FC<ContentRendererProps> = (props) => {
  const sdkFromHook = useReactory();
  const reactory = props.reactory || sdkFromHook;

  const {
    content = '',
    id,
    enableComments = false,
    context = 'ReactoryContent',
    commentLayout = 'bottom',
    commentsProps = {},
    container = 'Box',
    containerProps = {},
    sx,
    onCommentAdded,
  } = props;

  const { renderContent } = useContentRender(reactory);
  const contentBodyRef = useRef<HTMLDivElement>(null);
  const commentsSectionRef = useRef<HTMLDivElement>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accordionExpanded, setAccordionExpanded] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<string | undefined>(undefined);
  const [activeCommentId, setActiveCommentId] = useState<string | undefined>(undefined);
  const [loadedComments, setLoadedComments] = useState<ReactoryCommentItem[]>([]);

  // Floating comment button position for text selections
  const [selectionButtonPos, setSelectionButtonPos] = useState<{ top: number; left: number } | null>(null);
  const [pendingSelectionText, setPendingSelectionText] = useState<string>('');

  // Condition: Only render commenting experience when content has an ID and enableComments is true
  const showComments = Boolean(id && enableComments === true);

  // Load comments for in-body annotation rendering
  const fetchAnnotations = useCallback(async () => {
    if (!id || !showComments) return;

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
              who {
                id
                firstName
                lastName
                avatar
                email
              }
              removed
            }
          }
        }
      `,
        { context, contextId: id }
      );

      if (result.data?.getCommentsByContext?.comments) {
        setLoadedComments(result.data.getCommentsByContext.comments);
      }
    } catch (err) {
      // ignore annotation query errors
    }
  }, [id, context, showComments, reactory]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  // Activate / focus a comment thread and open the appropriate layout
  const handleCommentActivate = useCallback((commentId: string) => {
    setActiveCommentId(commentId);

    if (commentLayout === 'drawer') {
      setDrawerOpen(true);
    } else if (commentLayout === 'accordion') {
      setAccordionExpanded(true);
    }

    setTimeout(() => {
      const el = document.getElementById(`comment-${commentId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (commentsSectionRef.current) {
        commentsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);
  }, [commentLayout]);

  // Apply DOM highlight markers whenever content or comments change
  useEffect(() => {
    if (contentBodyRef.current && showComments) {
      applyDomHighlights(
        contentBodyRef.current,
        loadedComments,
        activeCommentId,
        handleCommentActivate
      );
    }
  }, [content, loadedComments, activeCommentId, showComments, handleCommentActivate]);

  // Real-time AMQ listeners
  useEffect(() => {
    if (!reactory?.on) return;

    const handleCommentEvent = (evt: any) => {
      if (evt?.contextId === id || evt?.ticketId === id) {
        fetchAnnotations();
      }
    };

    const handleAnnotationClicked = (evt: any) => {
      if (evt?.commentId) {
        handleCommentActivate(evt.commentId);
      }
    };

    reactory.on('core.CommentAdded', handleCommentEvent);
    reactory.on('core.CommentUpdated', handleCommentEvent);
    reactory.on('core.CommentAnnotationClicked', handleAnnotationClicked);

    return () => {
      reactory.off('core.CommentAdded', handleCommentEvent);
      reactory.off('core.CommentUpdated', handleCommentEvent);
      reactory.off('core.CommentAnnotationClicked', handleAnnotationClicked);
    };
  }, [id, handleCommentActivate, fetchAnnotations, reactory]);

  // Handle text selection in content area
  const handleSelection = useCallback(() => {
    if (!showComments) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectionButtonPos(null);
      setPendingSelectionText('');
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length < 2) {
      setSelectionButtonPos(null);
      return;
    }

    const container = contentBodyRef.current;
    if (container && (container.contains(selection.anchorNode) || container.contains(selection.focusNode))) {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        setPendingSelectionText(selectedText);
        setSelectionButtonPos({
          top: rect.top - containerRect.top - 44,
          left: rect.left - containerRect.left + rect.width / 2,
        });
      } catch (err) {
        // ignore range error
      }
    }
  }, [showComments]);

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(handleSelection, 20);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, [handleSelection]);

  // Launch contextual comment on selection
  const handleStartContextualComment = () => {
    if (!pendingSelectionText) return;

    setSelectedQuote(pendingSelectionText);
    setSelectionButtonPos(null);

    // Open target surface based on placement
    if (commentLayout === 'drawer') {
      setDrawerOpen(true);
    } else if (commentLayout === 'accordion') {
      setAccordionExpanded(true);
      setTimeout(() => {
        commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } else {
      setTimeout(() => {
        commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }

    window.getSelection()?.removeAllRanges();
  };

  // Render comments surface based on layout option
  const renderCommentsSection = () => {
    if (!showComments || !id) return null;

    const mergedCommentsProps: ReactoryCommentsProps = {
      context,
      contextId: id,
      title: commentsProps.title || 'Comments',
      allowReplies: commentsProps.allowReplies !== undefined ? commentsProps.allowReplies : true,
      allowReactions: commentsProps.allowReactions !== undefined ? commentsProps.allowReactions : true,
      readOnly: commentsProps.readOnly || false,
      placeholder: commentsProps.placeholder || (selectedQuote ? 'Comment on selected text...' : 'Leave a comment on this content...'),
      selectedQuote,
      onClearQuote: () => setSelectedQuote(undefined),
      onCommentAdded: (comment) => {
        fetchAnnotations();
        if (onCommentAdded) onCommentAdded(comment);
      },
      ...commentsProps,
    };

    switch (commentLayout) {
      case 'accordion':
        return (
          <Box ref={commentsSectionRef} sx={{ mt: 4, width: '100%' }}>
            <Accordion
              variant="outlined"
              sx={{ borderRadius: 2 }}
              expanded={accordionExpanded}
              onChange={(_, expanded) => setAccordionExpanded(expanded)}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <ChatBubbleOutlineIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    {mergedCommentsProps.title || 'Comments'} ({loadedComments.length})
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 1, pb: 3, px: 3 }}>
                <Comments {...mergedCommentsProps} />
              </AccordionDetails>
            </Accordion>
          </Box>
        );

      case 'card':
        return (
          <Box ref={commentsSectionRef} sx={{ mt: 4 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
              <Comments {...mergedCommentsProps} />
            </Paper>
          </Box>
        );

      case 'drawer':
        return (
          <Box ref={commentsSectionRef} sx={{ mt: 3 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ChatBubbleOutlineIcon />}
              onClick={() => setDrawerOpen(true)}
              sx={{ textTransform: 'none' }}
            >
              Open Comments ({loadedComments.length})
            </Button>
            <Drawer
              anchor="right"
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              PaperProps={{
                sx: {
                  width: { xs: '100%', sm: 480 },
                  p: 3,
                  bgcolor: 'background.paper',
                },
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Content Discussion
                </Typography>
                <IconButton size="small" onClick={() => setDrawerOpen(false)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Divider sx={{ mb: 3 }} />
              <Comments {...mergedCommentsProps} />
            </Drawer>
          </Box>
        );

      case 'bottom':
      default:
        return (
          <Box ref={commentsSectionRef} sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider', width: '100%' }}>
            <Comments {...mergedCommentsProps} />
          </Box>
        );
    }
  };

  const renderedBody = (
    <>
      <Box
        ref={contentBodyRef}
        className="reactory-content-body"
        sx={{ width: '100%', position: 'relative' }}
      >
        {/* Floating action button on text selection */}
        {selectionButtonPos && (
          <Fade in={Boolean(selectionButtonPos)}>
            <Box
              sx={{
                position: 'absolute',
                top: Math.max(0, selectionButtonPos.top),
                left: Math.max(10, selectionButtonPos.left),
                transform: 'translateX(-50%)',
                zIndex: 10,
              }}
            >
              <Paper
                elevation={4}
                sx={{
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'primary.main',
                  p: 0.5,
                }}
              >
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<AddCommentIcon fontSize="small" />}
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={handleStartContextualComment}
                  sx={{ textTransform: 'none', py: 0.5, px: 1.5, fontWeight: 600 }}
                >
                  Comment on selection
                </Button>
              </Paper>
            </Box>
          </Fade>
        )}

        {renderContent(content)}
      </Box>
      {renderCommentsSection()}
    </>
  );

  switch (container) {
    case 'Paper':
      return (
        <Paper sx={{ p: 3, ...sx }} {...containerProps}>
          {renderedBody}
        </Paper>
      );
    case 'Card':
      return (
        <Card sx={{ p: 2, ...sx }} {...containerProps}>
          <CardContent>{renderedBody}</CardContent>
        </Card>
      );
    case 'div':
      return (
        <div style={{ width: '100%' }} {...containerProps}>
          {renderedBody}
        </div>
      );
    case 'Box':
    default:
      return (
        <Box sx={{ width: '100%', ...sx }} {...containerProps}>
          {renderedBody}
        </Box>
      );
  }
};

export default withReactory(ContentRenderer, 'core.ContentRenderer');
