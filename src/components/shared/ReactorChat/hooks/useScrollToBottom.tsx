import React from 'react';
import { Tooltip, Collapse, Dialog, DialogTitle, DialogContent, DialogActions, Badge, Drawer, keyframes } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ChatState, IAIPersona, ReactorToolCall, ReactorToolCallStatus, UXChatMessage } from '../types';
import useContentRender from '../../hooks/useContentRender';
import { jsonToYaml, getChatMessageCommentContextId, applyDomHighlights } from '../utils';
import { Comments, ReactoryCommentItem } from '@reactory/client-core/components/shared/Comments/Comments';
import TextToSpeechButton from '../components/TextToSpeechButton';

const isProcessingMessage = (message: UXChatMessage) =>
  message.role === 'assistant' && message.content === 'Processing...';

const isActivityMessage = (message: UXChatMessage) =>
  (message as any).isActivity === true;

const isToolCallMessage = (message: UXChatMessage) =>
  message.role === 'assistant' &&
  Array.isArray(message.tool_calls) &&
  message.tool_calls.length > 0;

/**
 * Returns the status for a specific tool call within a message.
 * Uses the typed `status` field from the server when available,
 * falls back to result/error correlation for backward compatibility.
 */
const getToolCallStatus = (message: UXChatMessage, callId: string): ReactorToolCallStatus => {
  if (!callId) return 'pending';
  // First check: use the typed status from the server if the tool call has it
  const toolCall = (message.tool_calls as ReactorToolCall[] | undefined)?.filter(Boolean).find((tc) => tc.id === callId);
  if (toolCall?.status && toolCall.status !== 'pending') {
    return toolCall.status;
  }

  // Fallback: infer from tool_errors / tool_results arrays
  if (Array.isArray(message.tool_errors) && message.tool_errors.some((e) => e.id === callId)) {
    return 'error';
  }
  if (Array.isArray(message.tool_results) && message.tool_results.some((r) => r.id === callId)) {
    return 'success';
  }
  return 'pending';
};

/**
 * Returns the aggregate status for the whole tool-call message.
 * Uses the typed statuses when available.
 */
const getOverallToolCallStatus = (message: UXChatMessage): ReactorToolCallStatus => {
  if (!isToolCallMessage(message)) return 'pending';

  // Check if any tool call has a typed status from the server
  const statuses = ((message.tool_calls || []) as ReactorToolCall[]).filter(Boolean).map((tc) => {
    if (tc.status && tc.status !== 'pending') return tc.status;
    return getToolCallStatus(message, tc.id);
  });

  // If all are success, overall is success
  if (statuses.length > 0 && statuses.every((s) => s === 'success')) return 'success';
  // If any is error, overall is error
  if (statuses.some((s) => s === 'error')) return 'error';
  // If any has a result or error, but mixed, use the fallback
  const hasAnyResult =
    (Array.isArray(message.tool_results) && message.tool_results.length > 0) ||
    (Array.isArray(message.tool_errors) && message.tool_errors.length > 0);
  if (hasAnyResult) {
    if (Array.isArray(message.tool_errors) && message.tool_errors.length > 0) return 'error';
    return 'success';
  }
  return 'running';
};

interface ChatDisplayItem {
  key: string;
  itemType: 'user' | 'error' | 'activity' | 'processing' | 'thought' | 'tool_call' | 'response';
  message: UXChatMessage;
  thoughtText?: string;
  isLiveThinking?: boolean;
  messageIndex: number;
}

const pulse = keyframes`
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
`;

const isErrorMessage = (message: UXChatMessage) =>
  message.role === 'error';

const EMPTY_COMMENTS: ReactoryCommentItem[] = [];

interface AssistantMessageBodyProps {
  message: UXChatMessage;
  messageText: string;
  comments: ReactoryCommentItem[];
  activeCommentId?: string;
  enableComments: boolean;
  onCommentClick: (commentId: string) => void;
  onStartCommentOnSelection: (quote: string) => void;
  memoizedRenderContent: (content: string) => React.ReactNode;
  Button: any;
  Paper: any;
  Box: any;
  Icon: any;
  Typography: any;
}

const AssistantMessageBody: React.FC<AssistantMessageBodyProps> = React.memo(({
  message,
  messageText,
  comments,
  activeCommentId,
  enableComments,
  onCommentClick,
  onStartCommentOnSelection,
  memoizedRenderContent,
  Button,
  Paper,
  Box,
  Icon,
  Typography,
}) => {
  const contentBodyRef = React.useRef<HTMLDivElement>(null);
  const [selectionButtonPos, setSelectionButtonPos] = React.useState<{ top: number; left: number } | null>(null);
  const [pendingSelectionText, setPendingSelectionText] = React.useState<string>('');

  const onCommentClickRef = React.useRef(onCommentClick);
  onCommentClickRef.current = onCommentClick;

  // Handle in-body DOM highlights - only run when text, comments, or activeCommentId changes
  React.useEffect(() => {
    if (contentBodyRef.current && enableComments && (comments.length > 0 || contentBodyRef.current.querySelector('mark.reactory-comment-highlight'))) {
      applyDomHighlights(
        contentBodyRef.current,
        comments,
        activeCommentId,
        (commentId) => onCommentClickRef.current?.(commentId)
      );
    }
  }, [messageText, comments, activeCommentId, enableComments]);

  // Handle text selection in assistant content
  const handleSelection = React.useCallback(() => {
    if (!enableComments) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectionButtonPos((prev) => (prev !== null ? null : prev));
      setPendingSelectionText((prev) => (prev !== '' ? '' : prev));
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length < 2) {
      setSelectionButtonPos((prev) => (prev !== null ? null : prev));
      return;
    }

    const container = contentBodyRef.current;
    if (!container) return;

    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    const isInsideContainer = Boolean(
      (anchorNode && container.contains(anchorNode)) ||
      (focusNode && container.contains(focusNode)) ||
      (anchorNode?.parentElement && container.contains(anchorNode.parentElement)) ||
      (focusNode?.parentElement && container.contains(focusNode.parentElement))
    );

    if (isInsideContainer) {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        setPendingSelectionText(selectedText);
        setSelectionButtonPos({
          top: Math.max(0, rect.top - containerRect.top - 44),
          left: Math.max(10, rect.left - containerRect.left + rect.width / 2),
        });
      } catch {
        // ignore range error
      }
    } else {
      setSelectionButtonPos((prev) => (prev !== null ? null : prev));
      setPendingSelectionText((prev) => (prev !== '' ? '' : prev));
    }
  }, [enableComments]);

  React.useEffect(() => {
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

  const handleButtonClick = () => {
    if (!pendingSelectionText) return;
    onStartCommentOnSelection(pendingSelectionText);
    setSelectionButtonPos(null);
    setPendingSelectionText('');
    window.getSelection()?.removeAllRanges();
  };

  return (
    <Box
      ref={contentBodyRef}
      className="reactory-chat-message-body"
      sx={{
        width: '100%',
        position: 'relative',
      }}
    >
      {selectionButtonPos && (
        <Box
          sx={{
            position: 'absolute',
            top: selectionButtonPos.top,
            left: selectionButtonPos.left,
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
              startIcon={<Icon fontSize="small">add_comment</Icon>}
              onMouseDown={(e: any) => e.preventDefault()}
              onClick={handleButtonClick}
              sx={{ textTransform: 'none', py: 0.5, px: 1.5, fontWeight: 600 }}
            >
              Comment on selection
            </Button>
          </Paper>
        </Box>
      )}

      {message.content && (
        <Typography variant="body1" component="div">
          {memoizedRenderContent(messageText)}
        </Typography>
      )}
    </Box>
  );
});

/**
 * Default trailing window of rendered chat display items.
 *
 * A conversation returns a bounded history window from the server (see
 * ReactorConversationLoadOptions.historyLimit), but even that can be larger
 * than the browser should re-lay-out on every streaming flush. Rendering only
 * the tail keeps a long conversation cheap; older items are one click away.
 */
const DEFAULT_RENDERED_ITEMS = 60;

const ChatList = (props: {
  reactory: Reactory.Client.ReactorySDK,
  messages: UXChatMessage[],
  personas?: IAIPersona[],
  selectedPersona?: IAIPersona | null,
  chatState?: ChatState,
  commentLayout?: 'inline' | 'drawer',
  enableComments?: boolean,
  onRetryMessage?: (message: UXChatMessage) => void,
  onRateMessage?: (message: UXChatMessage, rating: 'up' | 'down') => void,
  onCopyMessage?: (message: UXChatMessage) => void,
  onDismissError?: (message: UXChatMessage) => void,
  onDeleteToolCall?: (message: UXChatMessage, callId: string) => void,
  /**
   * Maximum number of display items rendered at once. Defaults to
   * DEFAULT_RENDERED_ITEMS. Older items are revealed by the "show earlier"
   * control rather than being laid out up front.
   */
  maxRenderedItems?: number,
  /**
   * True when the server still holds history older than the loaded window, so
   * the "show earlier" control should remain available even once every locally
   * held item is visible.
   */
  hasServerEarlier?: boolean,
  /**
   * Requests the next page of older history from the server. Invoked by the
   * "show earlier" control once the locally held items are exhausted.
   */
  onLoadEarlier?: () => void | Promise<void>,
}) => {

  const { messages, reactory, personas, selectedPersona, chatState, onRetryMessage, onRateMessage, onCopyMessage, onDismissError, onDeleteToolCall } = props;
  const enableComments = props.enableComments !== false && Boolean(chatState?.id);
  const commentLayout = props.commentLayout || 'inline';

  // How many trailing display items are currently rendered. Bounds the work a
  // streaming flush has to do: a token update re-renders the visible tail, not
  // the entire conversation.
  const renderBatchSize = Math.max(1, props.maxRenderedItems ?? DEFAULT_RENDERED_ITEMS);
  const [renderedCount, setRenderedCount] = React.useState<number>(renderBatchSize);

  // Comments management
  const [openCommentsMessageId, setOpenCommentsMessageId] = React.useState<string | null>(null);
  const [activeCommentId, setActiveCommentId] = React.useState<string | undefined>(undefined);
  const [selectedQuoteMap, setSelectedQuoteMap] = React.useState<Record<string, string>>({});
  const [commentsMap, setCommentsMap] = React.useState<Record<string, ReactoryCommentItem[]>>({});
  const fetchedMessageIdsRef = React.useRef<Set<string>>(new Set());

  const fetchCommentsForMessage = React.useCallback(async (messageId: string) => {
    if (!chatState?.id || !messageId) return;
    const contextId = getChatMessageCommentContextId(chatState.id, messageId);
    try {
      if (typeof reactory?.graphqlQuery === 'function') {
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
          { context: 'ReactorChat', contextId }
        );

        if (result?.data?.getCommentsByContext?.comments) {
          setCommentsMap((prev) => ({
            ...prev,
            [messageId]: result.data.getCommentsByContext.comments,
          }));
        }
      }
    } catch {
      // ignore
    }
  }, [chatState?.id, reactory]);

  React.useEffect(() => {
    if (!enableComments || !chatState?.id) return;
    const assistantMsgIds = messages
      .filter((m) => m.role === 'assistant' && m.id)
      .map((m) => m.id as string);

    // Only fetch for message IDs that haven't been fetched yet
    const unfetchedIds = assistantMsgIds.filter((id) => !fetchedMessageIdsRef.current.has(id));
    if (unfetchedIds.length === 0) return;

    unfetchedIds.forEach((id) => {
      fetchedMessageIdsRef.current.add(id);
      fetchCommentsForMessage(id);
    });
  }, [enableComments, chatState?.id, messages, fetchCommentsForMessage]);

  React.useEffect(() => {
    if (!enableComments || !reactory?.on || !chatState?.id) return;

    const prefix = `reactor_chat_${chatState.id}_`;

    const handleCommentEvent = (evt: any) => {
      const contextId = evt?.contextId || evt?.ticketId;
      if (typeof contextId === 'string' && contextId.startsWith(prefix)) {
        const messageId = contextId.substring(prefix.length);
        if (messageId) {
          fetchCommentsForMessage(messageId);
        }
      }
    };

    reactory.on('core.CommentAdded', handleCommentEvent);
    reactory.on('core.CommentUpdated', handleCommentEvent);
    reactory.on('core.CommentDeleted', handleCommentEvent);

    return () => {
      reactory.off('core.CommentAdded', handleCommentEvent);
      reactory.off('core.CommentUpdated', handleCommentEvent);
      reactory.off('core.CommentDeleted', handleCommentEvent);
    };
  }, [enableComments, reactory, chatState?.id, fetchCommentsForMessage]);

  const handleCommentActivate = React.useCallback((messageId: string, commentId: string) => {
    setActiveCommentId(commentId);
    setOpenCommentsMessageId(messageId);

    setTimeout(() => {
      const el = document.getElementById(`comment-${commentId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }, []);

  const toggleComments = React.useCallback((messageId: string) => {
    setOpenCommentsMessageId((prev) => (prev === messageId ? null : messageId));
  }, []);

  const handleStartContextualComment = React.useCallback((messageId: string, quote: string) => {
    setSelectedQuoteMap((prev) => ({
      ...prev,
      [messageId]: quote,
    }));
    setOpenCommentsMessageId(messageId);
  }, []);

  const {
    Material
  } = reactory.getComponents<{
    Material: Reactory.Client.Web.IMaterialModule
  }>(["material-ui.Material"]);

  // Persistent toggle for mounting embedded Reactory components in chat responses
  const [mountComponents, setMountComponents] = React.useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('reactory.chat.mountComponents') === 'true';
      }
    } catch {
      // Ignore
    }
    return false;
  });

  const toggleMountComponents = React.useCallback(() => {
    setMountComponents((prev: boolean) => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('reactory.chat.mountComponents', String(next));
        }
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const { renderContent } = useContentRender(reactory, { mountComponents });
  
  // Memoize the renderContent function to prevent unnecessary re-renders
  const memoizedRenderContent = React.useCallback(renderContent, [renderContent]);

  const user = reactory.getUser()?.loggedIn?.user;
  const theme: Reactory.UX.IReactoryTheme = reactory.getTheme();

  const {
    options,
  } = theme;

  const listRef = React.useRef<HTMLDivElement | null>(null);
  // Tracks which tool-call result panels are expanded, keyed by "<messageId>:<callId>"
  const [expandedToolResults, setExpandedToolResults] = React.useState<Set<string>>(new Set());
  const toggleToolResult = React.useCallback((key: string) => {
    setExpandedToolResults(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Tracks which tool-call result panels are maximized, keyed by "<messageId>:<callId>"
  const [maximizedToolResult, setMaximizedToolResult] = React.useState<string | null>(null);

  // Tracks which thinking/reasoning panels are expanded, keyed by message id
  const [expandedThinking, setExpandedThinking] = React.useState<Set<string>>(new Set());
  const toggleThinking = React.useCallback((messageId: string) => {
    setExpandedThinking(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }, []);

  // Tracks which completed thought panels the user explicitly collapsed
  const [collapsedThinking, setCollapsedThinking] = React.useState<Set<string>>(new Set());

  const isThinkingExpanded = React.useCallback((item: ChatDisplayItem) => {
    const idKey = String(item.message.id || item.messageIndex);
    if (item.isLiveThinking) {
      return expandedThinking.has(idKey);
    }
    if (expandedThinking.has(idKey)) return true;
    if (collapsedThinking.has(idKey)) return false;
    return true;
  }, [expandedThinking, collapsedThinking]);

  const handleToggleThinking = React.useCallback((item: ChatDisplayItem) => {
    const idKey = String(item.message.id || item.messageIndex);
    if (item.isLiveThinking) {
      toggleThinking(idKey);
    } else {
      const currentlyExpanded = isThinkingExpanded(item);
      if (currentlyExpanded) {
        setCollapsedThinking(prev => new Set(prev).add(idKey));
        setExpandedThinking(prev => { const n = new Set(prev); n.delete(idKey); return n; });
      } else {
        setCollapsedThinking(prev => { const n = new Set(prev); n.delete(idKey); return n; });
        setExpandedThinking(prev => new Set(prev).add(idKey));
      }
    }
  }, [isThinkingExpanded, toggleThinking]);

  const handleCopyText = React.useCallback((text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        reactory.log('Text copied to clipboard');
      }).catch((err) => {
        reactory.error('Failed to copy text', err);
      });
    }
  }, [reactory]);

  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    open: boolean;
    message: UXChatMessage | null;
    callId: string;
    name: string;
  } | null>(null);

  const handleCopyToolResult = React.useCallback((text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        reactory.log('Tool result copied to clipboard');
      }).catch((err) => {
        reactory.error('Failed to copy tool result', err);
      });
    }
  }, [reactory]);

  const activeMaximizedData = React.useMemo(() => {
    if (!maximizedToolResult) return null;
    const [msgId, callId] = maximizedToolResult.split(':');
    const msg = messages.find(m => String(m.id) === msgId);
    if (!msg || !Array.isArray(msg.tool_calls)) return null;
    const call = msg.tool_calls.filter(Boolean).find((tc: any, i: number) => (tc.id ?? `${msg.id}-${i}`) === callId);
    if (!call) return null;
    // @ts-ignore
    const name = call.function?.name ?? call.name ?? 'unknown';
    const callStatus = getToolCallStatus(msg, callId);
    const resultPayload = msg.tool_results?.find((r: any) => r.id === callId);
    const errorPayload = msg.tool_errors?.find((e: any) => e.id === callId);
    const rawContent = errorPayload
      ? String(errorPayload.error ?? jsonToYaml(errorPayload))
      : typeof resultPayload?.content === 'string'
      ? resultPayload.content
      : jsonToYaml(resultPayload?.content ?? resultPayload);

    return {
      msg,
      call,
      callId,
      name,
      callStatus,
      rawContent,
    };
  }, [maximizedToolResult, messages]);

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  const {
    Button,
    IconButton,
    Icon,
    TextField,
    Grid,
    Typography,
    Box,
    List,
    ListItem,
    Menu,
    MenuItem,
    Paper,
    Avatar,
    Divider
  } = Material.MaterialCore;

  const {
    Edit,
    Send,
    ArrowDropDown,
    SmartToy,
    Person
  } = Material.MaterialIcons;

  const {
    mode,
    primary,
    secondary,
    background,
    text,
  } = (options as any)?.palette as Reactory.UX.IThemePalette;

  const hasComponent = (message: UXChatMessage) => {
    if (!message || !message.component) return false;
    if (typeof message.component === 'string') {
      return message.component && reactory.getComponent(message.component) !== undefined;
    }
    if (React.isValidElement(message.component) || typeof message.component === 'function') {
      return true;
    }
    return false;
  };

  // Separate thoughts, tool calls, and output into distinct display items so they each render as their own entity
  const displayItems = React.useMemo(() => {
    const items: ChatDisplayItem[] = [];

    messages.forEach((message, idx) => {
      const msgKey = String(message.id || idx);

      if (message.role === 'user') {
        items.push({
          key: `${msgKey}-user`,
          itemType: 'user',
          message,
          messageIndex: idx,
        });
        return;
      }

      if (isErrorMessage(message)) {
        items.push({
          key: `${msgKey}-error`,
          itemType: 'error',
          message,
          messageIndex: idx,
        });
        return;
      }

      if (isActivityMessage(message)) {
        items.push({
          key: `${msgKey}-activity`,
          itemType: 'activity',
          message,
          messageIndex: idx,
        });
        return;
      }

      // Assistant message handling
      if (message.role === 'assistant') {
        const hasThinking = Boolean(message.thinking && message.thinking.trim().length > 0);
        const hasToolCalls = Boolean(Array.isArray(message.tool_calls) && message.tool_calls.length > 0);
        const isProcessing = isProcessingMessage(message);

        // Pre-tool thought: when message has tool_calls AND content that isn't a placeholder,
        // and doesn't already have thinking.
        const preToolThought = (!hasThinking && hasToolCalls && typeof message.content === 'string' &&
          message.content.trim().length > 0 &&
          message.content !== 'Processing...' &&
          !message.content.startsWith('Calling tool:')) ? message.content : null;

        // Check if content has real response text
        const hasContent = Boolean(
          (!preToolThought && typeof message.content === 'string' &&
            message.content.trim().length > 0 &&
            message.content !== 'Processing...' &&
            !message.content.startsWith('Calling tool:')) ||
          (Array.isArray(message.content) && message.content.length > 0) ||
          (Array.isArray(message.images) && message.images.length > 0) ||
          (hasComponent(message) && !hasToolCalls)
        );

        // 1. Thought Output
        if (hasThinking || preToolThought) {
          items.push({
            key: `${msgKey}-thought`,
            itemType: 'thought',
            message,
            thoughtText: message.thinking || preToolThought || '',
            isLiveThinking: isProcessing,
            messageIndex: idx,
          });
        } else if (isProcessing && !hasToolCalls) {
          // Pure processing with no thinking text yet
          items.push({
            key: `${msgKey}-processing`,
            itemType: 'processing',
            message,
            messageIndex: idx,
          });
        }

        // 2. Tool Calls Output
        if (hasToolCalls) {
          items.push({
            key: `${msgKey}-tools`,
            itemType: 'tool_call',
            message,
            messageIndex: idx,
          });
        }

        // 3. Response Output
        if (hasContent) {
          items.push({
            key: `${msgKey}-response`,
            itemType: 'response',
            message,
            messageIndex: idx,
          });
        }
      }
    });

    return items;
  }, [messages]);

  React.useEffect(() => {
    scrollToBottom();
  }, [displayItems.length]); // Only trigger on item count change


  const renderComponent = (message: UXChatMessage) => {
    if (typeof message.component === 'string') {
      const Component = reactory.getComponent(message.component);
      if (Component) {
        //@ts-ignore
        return (<Component {...{ ...message.props, reactory }} />);
      } else {
        return <Typography>Component {message.component} not found</Typography>
      }
    } else {
      // assume it is a React component
      const Component = message.component as React.ComponentType<any>;
      if (Component) {
        return <Component {...{ ...message?.props, reactory }} />;
      }
    }
    return null;
  };

  const getMessageAvatar = (message: UXChatMessage, reactory: Reactory.Client.ReactorySDK) => {
    if (message.role === 'user' && reactory.getUser()?.loggedIn?.user?.avatar) {
      return reactory.getAvatar(reactory.getUser()?.loggedIn?.user as Reactory.Models.IUser);
    } else if (message.role === 'assistant' && selectedPersona?.avatar) {
      return selectedPersona.avatar;
    }
  }

  const getMessageAvatarIcon = (message: UXChatMessage) => {
    // Error messages get an error icon
    if (isErrorMessage(message)) {
      return 'error_outline';
    }

    // Activity messages get a settings/tune icon
    if (isActivityMessage(message)) {
      return 'tune';
    }

    // For tool messages, show a tool icon
    if (message.role === 'assistant' && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
      return 'build'; // Material Design tool icon
    }

    if (message.role === 'user') {
      return 'person';
    }

    if (message.role === 'assistant') {
      return 'smart_toy'; // AI assistant icon
    }

    return 'message';
  }

  const getMessageAlignment = (message: UXChatMessage) => {
    // Tool messages and assistant messages are left-aligned
    if (message.role === 'assistant') {
      return 'flex-start';
    }

    // Only user messages are right-aligned
    return message.role === 'user' ? 'flex-end' : 'flex-start';
  }

  const getMessageBackgroundColor = (message: UXChatMessage) => {
    return alpha(background.paper as string, 0.72);
  }

  const getMessageAvatarColor = (message: UXChatMessage) => {
    // Error messages get error color
    if (isErrorMessage(message)) {
      return 'error.main';
    }

    // Activity messages get an info colour
    if (isActivityMessage(message)) {
      return 'info.main';
    }

    // Tool messages get a different color
    if (message.role === 'assistant' && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
      return 'warning.main'; // Orange/amber color for tools
    }

    return message.role === 'user' ? 'primary.main' : 'secondary.main';
  }

  // Helper functions for button visibility and actions
  const shouldShowFeedbackButtons = (message: UXChatMessage, idx: number) => {
    // Only show for assistant messages that are not tool messages and not the first message
    return idx > 0 &&
      message.role === 'assistant' &&
      !(Array.isArray(message.tool_calls) && message.tool_calls.length > 0);
  }

  const shouldShowRetryButton = (message: UXChatMessage) => {
    // Activity messages are not retryable
    if (isActivityMessage(message)) return false;

    // Only show for user messages that have content
    return message.role === 'user' &&
      message.content &&
      (typeof message.content === 'string'
        ? message.content.trim().length > 0
        : Array.isArray(message.content) && (message.content as any[]).length > 0);
  }

  const handleRetry = (message: UXChatMessage) => {
    if (onRetryMessage) {
      onRetryMessage(message);
    }
  }

  const handleRate = (message: UXChatMessage, rating: 'up' | 'down') => {
    if (onRateMessage) {
      onRateMessage(message, rating);
    }
  }

  const handleCopy = async (message: UXChatMessage) => {
    try {
      const textToCopy = typeof message.content === 'string'
        ? message.content
        : getMessageText(message);
      await navigator.clipboard.writeText(textToCopy);
      // Could add a toast notification here
      if (onCopyMessage) {
        onCopyMessage(message);
      }
    } catch (error) {
      console.warn('Failed to copy to clipboard:', error);
    }
  }

  const getMessageText = (message: UXChatMessage) => {
    // Enhanced debugging: Log any suspicious messages
    if (message.content && typeof message.content === 'string' && 
        (message.content.includes('Tool execution results:') || 
         message.content.includes('Tool 1 (') ||
         message.content.includes('Multiple tools executed successfully:'))) {
      console.warn('useScrollToBottom: Found suspicious tool message:', {
        id: message?.id,
        role: message?.role,
        content: message?.content.substring(0, 100)
      });
      return '';
    }

    // Double-check: Don't render tool result messages even if they slip through filtering
    if (message.content && typeof message.content === 'string' && 
        message.content.startsWith('Tool execution results:')) {
      console.warn('Tool result message made it to rendering - this should be filtered out:', message);
      return 'Internal tool message (should not be displayed)';
    }

    if (typeof message.content === 'string' && message.content.trim().length > 0) {
      return message.content;
    }

    // Handle content-parts arrays from vision model messages
    if (Array.isArray(message.content)) {
      const textParts = (message.content as any[])
        .filter((part) => part?.type === 'text')
        .map((part) => part.text || '')
        .join('\n')
        .trim();
      if (textParts.length > 0) return textParts;
    }

    if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
      const validCalls = message.tool_calls.filter(Boolean);
      const allCompleted = validCalls.every((tc: any) => tc.status === 'success');
      const toolNames = validCalls.map((call: any) => call.function?.name ?? call.name ?? 'unknown');

      if (allCompleted) {
        // Tools are done — show completed summary
        return reactory.i18n.t('reactor.client.chat.toolsCompleted', {
          count: validCalls.length,
          tools: toolNames.join(', '),
          defaultValue: 'Completed {{count}} tool(s): {{tools}}'
        });
      }

      if (validCalls.length === 1) {
        return reactory.i18n.t('reactor.client.chat.callingTool', {
          tool: toolNames[0],
          defaultValue: 'Calling {{tool}}'
        });
      } else {
        return reactory.i18n.t('reactor.client.chat.callingTools', {
          count: validCalls.length,
          tools: toolNames.join(', '),
          defaultValue: 'Calling {{count}} tool(s): {{tools}}'
        });
      }
    }

    if (Array.isArray(message.tool_errors) && message.tool_errors.length > 0) {
      // Return a string summary for the main text, actual errors will be rendered separately
      return 'Tool error(s) occurred.';
    }

    // Handle tool results (though these should typically be filtered out)
    if (Array.isArray(message.tool_results) && message.tool_results.length > 0) {
      const resultNames = message.tool_results.map((r: any) => r.name || 'tool').join(', ');
      return reactory.i18n.t('reactor.client.chat.toolResultsSummary', {
        tools: resultNames,
        defaultValue: 'Tool results: {{tools}}'
      });
    }

    // If this is an assistant message with no displayable content, return null
    // to signal that it should be hidden rather than showing a confusing message
    if (message.role === 'assistant') {
      return null;
    }

    return reactory.i18n.t('reactor.client.chat.noContent', {
      defaultValue: 'No content available for this message.'
    });
  }

  const hiddenEarlierCount = Math.max(0, displayItems.length - renderedCount);
  const showEarlierControl =
    hiddenEarlierCount > 0 || Boolean(props.hasServerEarlier);
  const visibleItems =
    hiddenEarlierCount > 0
      ? displayItems.slice(displayItems.length - renderedCount)
      : displayItems;

  return (
    <div
      ref={listRef}
      style={{
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        // hide the scrollbars
        scrollbarWidth: 'none',        
      }}
    >
      {showEarlierControl && (
        <Box
          role="button"
          tabIndex={0}
          aria-label="Show earlier messages"
          onClick={() => {
            // Once every locally held item is visible, ask the server for the
            // previous page, if it has one.
            if (hiddenEarlierCount <= 0 && props.onLoadEarlier) {
              void props.onLoadEarlier();
              return;
            }
            setRenderedCount((prev) => prev + renderBatchSize);
          }}
          onKeyDown={(event: React.KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              (event.currentTarget as HTMLElement).click();
            }
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            py: 0.75,
            my: 0.5,
            cursor: 'pointer',
            borderRadius: 1,
            color: 'text.secondary',
            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            '&:hover': {
              backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            },
          }}
        >
          <Icon sx={{ fontSize: '1rem' }}>keyboard_double_arrow_up</Icon>
          <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
            {hiddenEarlierCount > 0
              ? `Show earlier messages (${hiddenEarlierCount})`
              : 'Show earlier messages'}
          </Typography>
        </Box>
      )}
      <List sx={{
        padding: 0.5,
      }}>
        {visibleItems.map((item) => {
          const { message } = item;
          const idx = item.messageIndex;

          if (item.itemType === 'thought') {
            const isExpanded = isThinkingExpanded(item);
            return (
              <ListItem
                key={item.key}
                alignItems="flex-start"
                sx={{
                  justifyContent: 'flex-start',
                  mb: 0.5,
                  padding: 1,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.25,
                    maxWidth: '95%',
                    backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                    border: '1px solid',
                    borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                    borderLeft: '3px solid',
                    borderLeftColor: mode === 'dark' ? 'rgba(156, 39, 176, 0.5)' : 'rgba(156, 39, 176, 0.4)',
                    borderRadius: '8px',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <Grid container spacing={1}>
                    <Grid item>
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                          color: 'text.secondary',
                        }}
                        sizes='small'
                        aria-label="thought"
                      >
                        <Icon sx={{ fontSize: '1rem', color: 'text.secondary' }}>psychology</Icon>
                      </Avatar>
                    </Grid>
                    <Grid item xs>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Icon sx={{ fontSize: '0.9rem', color: 'text.secondary', opacity: 0.85 }}>psychology</Icon>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              color: 'text.secondary',
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              fontSize: '0.68rem',
                              userSelect: 'none',
                            }}
                          >
                            {item.isLiveThinking ? `${selectedPersona?.name || 'Agent'} is thinking...` : (selectedPersona?.name ? `${selectedPersona.name}'s Thought` : 'Thought')}
                          </Typography>
                          {item.isLiveThinking && (
                            <Box sx={{ display: 'inline-flex', gap: 0.5, ml: 0.5, alignItems: 'center' }}>
                              {[0, 1, 2].map((i) => (
                                <Box
                                  key={i}
                                  sx={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: '50%',
                                    backgroundColor: 'text.secondary',
                                    animation: `${pulse} 1.4s ease-in-out infinite`,
                                    animationDelay: `${i * 0.2}s`,
                                  }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {item.thoughtText && (
                            <Tooltip title="Copy thought">
                              <IconButton
                                size="small"
                                onClick={() => handleCopyText(item.thoughtText || '')}
                                sx={{ p: 0.25 }}
                              >
                                <Icon sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>content_copy</Icon>
                              </IconButton>
                            </Tooltip>
                          )}
                          <Box
                            onClick={() => handleToggleThinking(item)}
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              cursor: 'pointer',
                              px: 0.75,
                              py: 0.25,
                              borderRadius: '4px',
                              bgcolor: 'action.hover',
                              '&:hover': { bgcolor: 'action.selected' },
                            }}
                          >
                            <Typography variant="caption" color="text.secondary" sx={{ userSelect: 'none' }}>
                              {isExpanded ? 'Hide reasoning' : 'View reasoning'}
                            </Typography>
                            <Icon sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </Icon>
                          </Box>
                        </Box>
                      </Box>
                      <Collapse in={isExpanded}>
                        <Box
                          sx={{
                            mt: 0.5,
                            maxHeight: 350,
                            overflowY: 'auto',
                            scrollbarWidth: 'thin',
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              fontStyle: 'italic',
                              fontSize: '0.825rem',
                              lineHeight: 1.6,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              userSelect: 'text',
                            }}
                          >
                            {item.thoughtText}
                          </Typography>
                        </Box>
                      </Collapse>
                    </Grid>
                  </Grid>
                </Paper>
              </ListItem>
            );
          }

          if (item.itemType === 'processing') {
            return (
              <ListItem
                key={item.key}
                alignItems="flex-start"
                sx={{
                  justifyContent: 'flex-start',
                  mb: 0.5,
                  padding: 1,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 0.5,
                    maxWidth: '95%',
                    backgroundColor: 'transparent',
                    border: '1px dashed',
                    borderColor: 'divider',
                  }}
                >
                  <Grid container spacing={1}>
                    <Grid item>
                      <Avatar
                        sx={{ bgcolor: 'secondary.main' }}
                        sizes='small'
                        aria-label="assistant"
                        src={getMessageAvatar(message, reactory)}
                      >
                        {!getMessageAvatar(message, reactory) && (
                          <Icon>{getMessageAvatarIcon(message)}</Icon>
                        )}
                      </Avatar>
                    </Grid>
                    <Grid item xs>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, px: 0.5 }}>
                        {[0, 1, 2].map((i) => (
                          <Box
                            key={i}
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: 'text.secondary',
                              animation: `${pulse} 1.4s ease-in-out infinite`,
                              animationDelay: `${i * 0.2}s`,
                            }}
                          />
                        ))}
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5, fontStyle: 'italic' }}>
                          {selectedPersona?.name || 'Agent'} is thinking...
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </ListItem>
            );
          }

          if (item.itemType === 'tool_call') {
            const overallStatus = getOverallToolCallStatus(message);
            const overallColor =
              overallStatus === 'success' ? 'success.main' :
              overallStatus === 'error'   ? 'error.main' :
              'warning.main';
            const validCalls = (message.tool_calls || []).filter(Boolean);
            const headerLabel =
              overallStatus === 'running'
                ? (validCalls.length === 1 ? 'Invoking tool' : `Invoking ${validCalls.length} tools`)
                : overallStatus === 'success'
                ? (validCalls.length === 1 ? 'Tool completed' : `${validCalls.length} tools completed`)
                : (validCalls.length === 1 ? 'Tool failed' : `${validCalls.length} tools (some failed)`);

            return (
              <ListItem
                key={item.key}
                alignItems="flex-start"
                sx={{
                  justifyContent: 'flex-start',
                  mb: 0.5,
                  padding: 1,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 0.5,
                    maxWidth: '95%',
                    backgroundColor: 'transparent',
                    border: '1px dashed',
                    borderColor:
                      overallStatus === 'success' ? 'success.main' :
                      overallStatus === 'error'   ? 'error.main' :
                      'warning.main',
                    opacity: 0.9,
                  }}
                >
                  <Grid container spacing={1}>
                    <Grid item>
                      <Avatar
                        sx={{ bgcolor: 'warning.main' }}
                        sizes='small'
                        aria-label="tools"
                      >
                        <Icon>build</Icon>
                      </Avatar>
                    </Grid>
                    <Grid item xs>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 0.5, px: 0.5 }}>
                        {/* Header row */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {overallStatus === 'running' ? (
                            [0, 1, 2].map((i) => (
                              <Box
                                key={i}
                                sx={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  backgroundColor: overallColor,
                                  animation: `${pulse} 1.4s ease-in-out infinite`,
                                  animationDelay: `${i * 0.2}s`,
                                }}
                              />
                            ))
                          ) : (
                            <Icon sx={{ fontSize: '0.875rem', color: overallColor }}>
                              {overallStatus === 'success' ? 'check_circle' : 'error'}
                            </Icon>
                          )}
                          <Typography variant="caption" color={overallColor} sx={{ fontStyle: 'italic', userSelect: 'none' }}>
                            {headerLabel}
                          </Typography>
                        </Box>

                        {/* Per-call chips — hidden when an inline ToolPrompt (message.component) is present */}
                        {!hasComponent(message) && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
                            {validCalls.map((call, i) => {
                              if (!call) return null;
                              const callId = call.id ?? `${message.id}-${i}`;
                              // @ts-ignore
                              const name = call.function?.name ?? call.name ?? 'unknown';
                              const callStatus = getToolCallStatus(message, callId);
                              const chipColor =
                                callStatus === 'success' ? 'success.main' :
                                callStatus === 'error'   ? 'error.main' :
                                'warning.main';
                              const chipBg =
                                callStatus === 'success' ? 'rgba(46,125,50,0.1)' :
                                callStatus === 'error'   ? 'rgba(211,47,47,0.1)' :
                                'rgba(255,167,38,0.1)';
                              const callIcon =
                                callStatus === 'success' ? 'check_circle' :
                                callStatus === 'error'   ? 'error' :
                                'build';
                              const expandKey = `${message.id}:${callId}`;
                              const isExpanded = expandedToolResults.has(expandKey);

                              // Find result/error payload for this call
                              const resultPayload = message.tool_results?.find((r: any) => r.id === callId);
                              const errorPayload  = message.tool_errors?.find((e: any) => e.id === callId);
                              const hasPayload = !!resultPayload || !!errorPayload;

                              return (
                                <Box key={callId} sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, width: isExpanded ? '100%' : 'auto' }}>
                                  <Box
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.5,
                                      px: 0.75,
                                      py: 0.25,
                                      borderRadius: '4px',
                                      border: '1px solid',
                                      borderColor: chipColor,
                                      bgcolor: chipBg,
                                      width: 'fit-content'
                                    }}
                                  >
                                    {callStatus === 'running' ? (
                                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: chipColor, animation: `${pulse} 1.4s ease-in-out infinite` }} />
                                    ) : (
                                      <Icon sx={{ fontSize: '0.75rem', color: chipColor }}>{callIcon}</Icon>
                                    )}
                                    <Typography variant="caption" sx={{ color: chipColor, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                                      {name}
                                    </Typography>
                                    {hasPayload && (
                                      <Tooltip title={isExpanded ? 'Hide result' : 'Show result'}>
                                        <span
                                          onClick={() => toggleToolResult(expandKey)}
                                          style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', marginLeft: 2 }}
                                        >
                                          <Icon sx={{ fontSize: '0.875rem', color: chipColor }}>
                                            {isExpanded ? 'expand_less' : 'expand_more'}
                                          </Icon>
                                        </span>
                                      </Tooltip>
                                    )}
                                    {onDeleteToolCall && (
                                      <Tooltip title="Delete tool call & result">
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteConfirm({ open: true, message, callId, name });
                                          }}
                                          sx={{
                                            p: 0.125,
                                            ml: 0.25,
                                            color: 'text.disabled',
                                            '&:hover': { color: 'error.main' },
                                          }}
                                        >
                                          <Icon sx={{ fontSize: '0.85rem' }}>delete_outline</Icon>
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                  </Box>

                                  {/* Collapsible result panel */}
                                  {isExpanded && (
                                    <Box
                                      sx={{
                                        mt: 0.5,
                                        p: 1,
                                        borderRadius: '6px',
                                        bgcolor: chipBg,
                                        border: '1px solid',
                                        borderColor: chipColor,
                                        width: '100%',
                                        maxHeight: 280,
                                        display: 'flex',
                                        flexDirection: 'column',
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, pb: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                          <Icon sx={{ fontSize: '0.9rem', color: chipColor }}>{callIcon}</Icon>
                                          <Typography variant="caption" sx={{ fontWeight: 600, color: chipColor, fontFamily: 'monospace' }}>
                                            Result: {name}
                                          </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                          <Tooltip title="Copy result">
                                            <IconButton
                                              size="small"
                                              onClick={() => {
                                                const textToCopy = errorPayload
                                                  ? String(errorPayload.error ?? jsonToYaml(errorPayload))
                                                  : typeof resultPayload?.content === 'string'
                                                  ? resultPayload.content
                                                  : jsonToYaml(resultPayload?.content ?? resultPayload);
                                                handleCopyToolResult(textToCopy);
                                              }}
                                              sx={{ p: 0.25 }}
                                            >
                                              <Icon sx={{ fontSize: '0.95rem', color: chipColor }}>content_copy</Icon>
                                            </IconButton>
                                          </Tooltip>
                                          {onDeleteToolCall && (
                                            <Tooltip title="Delete tool call & result">
                                              <IconButton
                                                size="small"
                                                onClick={() => setDeleteConfirm({ open: true, message, callId, name })}
                                                sx={{ p: 0.25, '&:hover': { color: 'error.main' } }}
                                              >
                                                <Icon sx={{ fontSize: '0.95rem', color: 'error.main' }}>delete_outline</Icon>
                                              </IconButton>
                                            </Tooltip>
                                          )}
                                          <Tooltip title="Maximize to full view">
                                            <IconButton size="small" onClick={() => setMaximizedToolResult(expandKey)} sx={{ p: 0.25 }}>
                                              <Icon sx={{ fontSize: '1rem', color: chipColor }}>fullscreen</Icon>
                                            </IconButton>
                                          </Tooltip>
                                          <Tooltip title="Collapse">
                                            <IconButton size="small" onClick={() => toggleToolResult(expandKey)} sx={{ p: 0.25 }}>
                                              <Icon sx={{ fontSize: '1rem', color: chipColor }}>expand_less</Icon>
                                            </IconButton>
                                          </Tooltip>
                                        </Box>
                                      </Box>
                                      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                                        <Typography
                                          variant="caption"
                                          component="pre"
                                          sx={{
                                            fontFamily: 'monospace',
                                            fontSize: '0.72rem',
                                            lineHeight: 1.4,
                                            color: callStatus === 'error' ? 'error.main' : 'text.secondary',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-all',
                                            m: 0,
                                          }}
                                        >
                                          {errorPayload
                                            ? String(errorPayload.error ?? jsonToYaml(errorPayload))
                                            : typeof resultPayload?.content === 'string'
                                            ? resultPayload.content
                                            : jsonToYaml(resultPayload?.content ?? resultPayload)}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  )}
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                        {/* Inline tool prompt (e.g., approval) — renders inside the tool-call flow */}
                        {hasComponent(message) && (
                          <Box sx={{ mt: 0.25, width: '100%' }}>
                            {renderComponent(message)}
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </ListItem>
            );
          }

          if (item.itemType === 'response') {
            return (
              <ListItem
                key={item.key}
                alignItems="flex-start"
                sx={{
                  justifyContent: 'flex-start',
                  mb: 0.5,
                  padding: 1,
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 0.5,
                    maxWidth: '95%',
                    backdropFilter: openCommentsMessageId === message.id ? 'none' : 'blur(10px)',
                    backgroundColor: getMessageBackgroundColor(message),
                  }}
                >
                  <Grid container spacing={1}>
                    <Grid item>
                      <Avatar
                        sx={{ bgcolor: 'secondary.main' }}
                        sizes='small'
                        aria-label="assistant"
                        src={getMessageAvatar(message, reactory)}
                      >
                        {!getMessageAvatar(message, reactory) && (
                          <Icon>smart_toy</Icon>
                        )}
                      </Avatar>
                    </Grid>
                    <Grid item xs>
                      <AssistantMessageBody
                        message={message}
                        messageText={typeof message.content === 'string' ? message.content : getMessageText(message)}
                        comments={message.id && commentsMap[message.id] ? commentsMap[message.id] : EMPTY_COMMENTS}
                        activeCommentId={activeCommentId}
                        enableComments={enableComments}
                        onCommentClick={(commentId) => {
                          if (message.id) handleCommentActivate(message.id, commentId);
                        }}
                        onStartCommentOnSelection={(quote) => {
                          if (message.id) handleStartContextualComment(message.id, quote);
                        }}
                        memoizedRenderContent={memoizedRenderContent}
                        Button={Button}
                        Paper={Paper}
                        Box={Box}
                        Icon={Icon}
                        Typography={Typography}
                      />
                      {/* Render images from content-parts (vision model messages) */}
                      {Array.isArray(message.content) && (message.content as any[]).some((p) => p?.type === 'image_url') && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          {(message.content as any[])
                            .filter((part) => part?.type === 'image_url')
                            .map((part, imgIdx) => (
                              <img
                                key={imgIdx}
                                src={part.image_url?.url}
                                alt={`Attached image ${imgIdx + 1}`}
                                style={{
                                  maxWidth: 300,
                                  maxHeight: 300,
                                  borderRadius: 4,
                                  objectFit: 'contain',
                                  cursor: 'pointer',
                                  border: '1px solid rgba(0,0,0,0.12)',
                                }}
                                onClick={() => window.open(part.image_url?.url, '_blank')}
                              />
                            ))}
                        </Box>
                      )}
                      {/* Render generated images from AI response */}
                      {Array.isArray(message.images) && message.images.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          {message.images.map((img, imgIdx) => {
                            const src = img.b64_json
                              ? `data:${img.mimeType || 'image/png'};base64,${img.b64_json}`
                              : img.url;
                            return (
                              <img
                                key={`gen-${imgIdx}`}
                                src={src}
                                alt={`Generated image ${imgIdx + 1}`}
                                style={{
                                  maxWidth: 512,
                                  maxHeight: 512,
                                  borderRadius: 8,
                                  objectFit: 'contain',
                                  cursor: 'pointer',
                                  border: '1px solid rgba(0,0,0,0.12)',
                                }}
                                onClick={() => window.open(src, '_blank')}
                              />
                            );
                          })}
                        </Box>
                      )}
                      {hasComponent(message) && (
                        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                          {renderComponent(message)}
                        </Box>
                      )}
                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                          {typeof (message as any)?.timestamp === 'string' ?
                            new Date(message.timestamp).toLocaleTimeString() :
                            message.timestamp?.toLocaleTimeString()}
                        </Typography>

                        {/* Feedback buttons for regular assistant messages */}
                        {shouldShowFeedbackButtons(message, idx) && (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                            <IconButton
                              size="small"
                              sx={{ fontSize: '0.875rem' }}
                              onClick={() => handleRate(message, 'up')}
                              title="Rate this response positively"
                            >
                              <Icon sx={{ fontSize: '1rem' }}>thumb_up</Icon>
                            </IconButton>
                            <IconButton
                              size="small"
                              sx={{ fontSize: '0.875rem' }}
                              onClick={() => handleRate(message, 'down')}
                              title="Rate this response negatively"
                            >
                              <Icon sx={{ fontSize: '1rem' }}>thumb_down</Icon>
                            </IconButton>
                            <IconButton
                              size="small"
                              sx={{ fontSize: '0.875rem' }}
                              onClick={() => handleCopy(message)}
                              title="Copy message to clipboard"
                            >
                              <Icon sx={{ fontSize: '1rem' }}>content_copy</Icon>
                            </IconButton>
                            {typeof message.content === 'string' && message.content.trim().length > 0 && (
                              <TextToSpeechButton
                                text={message.content}
                                reactory={reactory}
                                personaId={selectedPersona?.id}
                                voice={message.voice || selectedPersona?.appearance?.voice?.[0] || (selectedPersona as any)?.voice}
                                chatSessionId={chatState?.id}
                                size="small"
                              />
                            )}
                            <Tooltip title={mountComponents ? "Unmount embedded components" : "Mount embedded components"}>
                              <IconButton
                                size="small"
                                sx={{
                                  fontSize: '0.875rem',
                                  color: mountComponents ? 'primary.main' : 'text.secondary',
                                }}
                                onClick={toggleMountComponents}
                                aria-label={mountComponents ? "Unmount embedded components" : "Mount embedded components"}
                              >
                                <Icon sx={{ fontSize: '1rem' }}>{mountComponents ? 'widgets' : 'widgets_outlined'}</Icon>
                              </IconButton>
                            </Tooltip>
                            {/* Comment button & count badge */}
                            {enableComments && message.id && (
                              <Tooltip title={openCommentsMessageId === message.id ? "Hide comments" : "Comments"}>
                                <IconButton
                                  size="small"
                                  sx={{
                                    fontSize: '0.875rem',
                                    color: openCommentsMessageId === message.id || ((commentsMap[message.id]?.length || 0) > 0) ? 'primary.main' : 'text.secondary',
                                  }}
                                  onClick={() => toggleComments(message.id as string)}
                                  aria-label={`Comments (${commentsMap[message.id]?.length || 0})`}
                                >
                                  <Badge badgeContent={commentsMap[message.id]?.length || 0} color="primary">
                                    <Icon sx={{ fontSize: '1rem' }}>
                                      {(commentsMap[message.id]?.length || 0) > 0 ? 'chat_bubble' : 'chat_bubble_outline'}
                                    </Icon>
                                  </Badge>
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        )}
                      </Box>
                      {/* Expandable Comments Section (Inline Collapse) */}
                      {commentLayout !== 'drawer' && enableComments && message.id && (
                        <Collapse in={openCommentsMessageId === message.id} timeout={process.env.NODE_ENV === 'test' ? 0 : 'auto'} unmountOnExit>
                          <Box
                            sx={{
                              mt: 1.5,
                              pt: 1.5,
                              borderTop: 1,
                              borderColor: 'divider',
                              width: '100%',
                            }}
                          >
                            <Comments
                              context="ReactorChat"
                              contextId={getChatMessageCommentContextId(chatState?.id || '', message.id)}
                              comments={message.id && commentsMap[message.id] ? commentsMap[message.id] : undefined}
                              title="Comments"
                              placeholder={selectedQuoteMap[message.id] ? "Comment on selected text..." : "Add a comment on this response..."}
                              selectedQuote={selectedQuoteMap[message.id]}
                              onClearQuote={() => {
                                setSelectedQuoteMap((prev) => {
                                  const next = { ...prev };
                                  delete next[message.id as string];
                                  return next;
                                });
                              }}
                              onCommentAdded={() => {
                                fetchCommentsForMessage(message.id as string);
                              }}
                              reactory={reactory}
                            />
                          </Box>
                        </Collapse>
                      )}
                    </Grid>
                  </Grid>
                </Paper>
              </ListItem>
            );
          }

          if (item.itemType === 'activity') {
            return (
              <ListItem
                key={item.key}
                alignItems="flex-start"
                sx={{
                  justifyContent: 'flex-start',
                  mb: 0.5,
                  padding: 1,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 0.5,
                    maxWidth: '95%',
                    backgroundColor: 'transparent',
                    border: '1px dashed',
                    borderColor: 'info.main',
                    opacity: 0.85,
                  }}
                >
                  <Grid container spacing={1}>
                    <Grid item>
                      <Avatar sx={{ bgcolor: 'info.main' }} sizes='small' aria-label="activity">
                        <Icon>tune</Icon>
                      </Avatar>
                    </Grid>
                    <Grid item xs>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, px: 0.5 }}>
                        <Typography
                          variant="body2"
                          color="info.main"
                          sx={{ fontStyle: 'italic', userSelect: 'none' }}
                        >
                          {getMessageText(message)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </ListItem>
            );
          }

          if (item.itemType === 'error') {
            return (
              <ListItem
                key={item.key}
                alignItems="flex-start"
                sx={{
                  justifyContent: 'flex-start',
                  mb: 0.5,
                  padding: 1,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 0.5,
                    maxWidth: '95%',
                    backgroundColor: 'rgba(211,47,47,0.05)',
                    border: '1px dashed',
                    borderColor: 'error.main',
                    opacity: 0.9,
                  }}
                >
                  <Grid container spacing={1}>
                    <Grid item>
                      <Avatar sx={{ bgcolor: 'error.main' }} sizes='small' aria-label="error">
                        <Icon>error_outline</Icon>
                      </Avatar>
                    </Grid>
                    <Grid item xs>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 0.5, px: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Icon sx={{ fontSize: '0.875rem', color: 'error.main' }}>error</Icon>
                          <Typography
                            variant="caption"
                            color="error.main"
                            sx={{ fontWeight: 500, userSelect: 'none' }}
                          >
                            Error
                            {(message as any).errorCount > 1 && (
                              <Box
                                component="span"
                                sx={{
                                  ml: 0.75,
                                  px: 0.75,
                                  py: 0.125,
                                  borderRadius: '10px',
                                  bgcolor: 'error.main',
                                  color: 'error.contrastText',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                }}
                              >
                                ×{(message as any).errorCount}
                              </Box>
                            )}
                          </Typography>
                          <Box sx={{ flex: 1 }} />
                          {onDismissError && (
                            <Tooltip title="Dismiss">
                              <IconButton
                                size="small"
                                onClick={() => onDismissError(message)}
                                sx={{ p: 0.25 }}
                              >
                                <Icon sx={{ fontSize: '0.875rem', color: 'error.main' }}>close</Icon>
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                        <Box
                          sx={{
                            p: 0.75,
                            borderRadius: '4px',
                            bgcolor: 'rgba(211,47,47,0.08)',
                            border: '1px solid',
                            borderColor: 'error.main',
                            maxHeight: 120,
                            overflowY: 'auto',
                          }}
                        >
                          <Typography
                            variant="caption"
                            component="pre"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.7rem',
                              color: 'error.main',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                              m: 0,
                            }}
                          >
                            {message.content}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </ListItem>
            );
          }

          // User message
          return (
            <ListItem
              key={item.key}
              alignItems="flex-start"
              sx={{
                justifyContent: 'flex-end',
                mb: 0.5,
                padding: 1,
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 0.5,
                  maxWidth: '95%',
                  backdropFilter: 'blur(10px)',
                  backgroundColor: getMessageBackgroundColor(message),
                }}
              >
                <Grid container spacing={1}>
                  <Grid item>
                    <Avatar
                      sx={{ bgcolor: getMessageAvatarColor(message) }}
                      sizes='small'
                      aria-label={message.role}
                      src={getMessageAvatar(message, reactory)}
                    >
                      {!getMessageAvatar(message, reactory) && (
                        <Icon>{getMessageAvatarIcon(message)}</Icon>
                      )}
                    </Avatar>
                  </Grid>
                  <Grid item xs>
                    <Typography variant="body1">
                      {memoizedRenderContent(getMessageText(message))}
                    </Typography>
                    {/* Render images from content-parts (vision model messages) */}
                    {Array.isArray(message.content) && (message.content as any[]).some((p) => p?.type === 'image_url') && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {(message.content as any[])
                          .filter((part) => part?.type === 'image_url')
                          .map((part, imgIdx) => (
                            <img
                              key={imgIdx}
                              src={part.image_url?.url}
                              alt={`Attached image ${imgIdx + 1}`}
                              style={{
                                maxWidth: 300,
                                maxHeight: 300,
                                borderRadius: 4,
                                objectFit: 'contain',
                                cursor: 'pointer',
                                border: '1px solid rgba(0,0,0,0.12)',
                              }}
                              onClick={() => window.open(part.image_url?.url, '_blank')}
                            />
                          ))}
                      </Box>
                    )}
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        {typeof (message as any)?.timestamp === 'string' ?
                          new Date(message.timestamp).toLocaleTimeString() :
                          message.timestamp?.toLocaleTimeString()}
                      </Typography>
                      {shouldShowRetryButton(message) && (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                          <Tooltip title="Retry this message">
                            <IconButton
                              size="small"
                              sx={{ fontSize: '0.875rem' }}
                              onClick={() => handleRetry(message)}
                            >
                              <Icon sx={{ fontSize: '1rem' }}>refresh</Icon>
                            </IconButton>
                          </Tooltip>
                          {typeof message.content === 'string' && message.content.trim().length > 0 && (
                            <TextToSpeechButton
                              text={message.content}
                              reactory={reactory}
                              chatSessionId={chatState?.id}
                              size="small"
                            />
                          )}
                          <Tooltip title={mountComponents ? "Unmount embedded components" : "Mount embedded components"}>
                            <IconButton
                              size="small"
                              sx={{
                                fontSize: '0.875rem',
                                color: mountComponents ? 'primary.main' : 'text.secondary',
                              }}
                              onClick={toggleMountComponents}
                              aria-label={mountComponents ? "Unmount embedded components" : "Mount embedded components"}
                            >
                              <Icon sx={{ fontSize: '1rem' }}>{mountComponents ? 'widgets' : 'widgets_outlined'}</Icon>
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </ListItem>
          );
        })}
      </List>

      {/* Maximized Tool Result Dialog */}
      {activeMaximizedData && (
        <Dialog
          open={Boolean(maximizedToolResult)}
          onClose={() => setMaximizedToolResult(null)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              height: '85vh',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 24,
            },
          }}
        >
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1.5,
              px: 2.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon
                sx={{
                  fontSize: '1.25rem',
                  color:
                    activeMaximizedData.callStatus === 'success' ? 'success.main' :
                    activeMaximizedData.callStatus === 'error' ? 'error.main' :
                    'warning.main',
                }}
              >
                {activeMaximizedData.callStatus === 'success' ? 'check_circle' :
                 activeMaximizedData.callStatus === 'error' ? 'error' : 'build'}
              </Icon>
              <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '1rem' }}>
                Tool Result: {activeMaximizedData.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Copy to clipboard">
                <IconButton
                  size="small"
                  onClick={() => handleCopyToolResult(activeMaximizedData.rawContent)}
                >
                  <Icon sx={{ fontSize: '1.2rem' }}>content_copy</Icon>
                </IconButton>
              </Tooltip>
              {onDeleteToolCall && (
                <Tooltip title="Delete tool call & result">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setDeleteConfirm({
                        open: true,
                        message: activeMaximizedData.msg,
                        callId: activeMaximizedData.callId,
                        name: activeMaximizedData.name,
                      });
                    }}
                    sx={{ color: 'error.main' }}
                  >
                    <Icon sx={{ fontSize: '1.2rem' }}>delete_outline</Icon>
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Close">
                <IconButton size="small" onClick={() => setMaximizedToolResult(null)}>
                  <Icon sx={{ fontSize: '1.2rem' }}>close</Icon>
                </IconButton>
              </Tooltip>
            </Box>
          </DialogTitle>
          <DialogContent
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2.5,
              bgcolor: mode === 'dark' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.02)',
            }}
          >
            <Typography
              component="pre"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                color: activeMaximizedData.callStatus === 'error' ? 'error.main' : 'text.primary',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                m: 0,
              }}
            >
              {activeMaximizedData.rawContent}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 2.5, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              onClick={() => handleCopyToolResult(activeMaximizedData.rawContent)}
              startIcon={<Icon>content_copy</Icon>}
              size="small"
            >
              Copy
            </Button>
            <Button
              onClick={() => setMaximizedToolResult(null)}
              variant="contained"
              size="small"
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete Tool Call Confirmation Dialog */}
      {deleteConfirm && (
        <Dialog
          open={deleteConfirm.open}
          onClose={() => setDeleteConfirm(null)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon sx={{ color: 'error.main' }}>delete_outline</Icon>
            Delete Tool Call
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Are you sure you want to delete the tool call <strong>"{deleteConfirm.name}"</strong> and its result from this conversation?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 2, pb: 2 }}>
            <Button onClick={() => setDeleteConfirm(null)} size="small">
              Cancel
            </Button>
            <Button
              onClick={() => {
                const { message, callId } = deleteConfirm;
                if (maximizedToolResult === `${message?.id}:${callId}`) {
                  setMaximizedToolResult(null);
                }
                setExpandedToolResults(prev => {
                  const next = new Set(prev);
                  next.delete(`${message?.id}:${callId}`);
                  return next;
                });
                if (message && callId) {
                  onDeleteToolCall?.(message, callId);
                }
                setDeleteConfirm(null);
              }}
              color="error"
              variant="contained"
              size="small"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      )}
      {/* Slide-out Drawer mode for comments */}
      {commentLayout === 'drawer' && enableComments && openCommentsMessageId && (
        <Drawer
          anchor="right"
          open={Boolean(openCommentsMessageId)}
          onClose={() => setOpenCommentsMessageId(null)}
          PaperProps={{
            sx: {
              width: { xs: '100%', sm: 480 },
              p: 3,
              bgcolor: 'background.paper',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Message Comments
            </Typography>
            <IconButton size="small" onClick={() => setOpenCommentsMessageId(null)}>
              <Icon fontSize="small">close</Icon>
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Comments
            context="ReactorChat"
            contextId={getChatMessageCommentContextId(chatState?.id || '', openCommentsMessageId)}
            title="Comments"
            placeholder={selectedQuoteMap[openCommentsMessageId] ? "Comment on selected text..." : "Add a comment on this response..."}
            selectedQuote={selectedQuoteMap[openCommentsMessageId]}
            onClearQuote={() => {
              setSelectedQuoteMap((prev) => {
                const next = { ...prev };
                delete next[openCommentsMessageId];
                return next;
              });
            }}
            onCommentAdded={() => {
              fetchCommentsForMessage(openCommentsMessageId);
            }}
            reactory={reactory}
          />
        </Drawer>
      )}
    </div>
  );
};

export default React.memo(ChatList);
