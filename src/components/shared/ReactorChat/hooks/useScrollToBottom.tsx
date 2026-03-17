import { Tooltip, Collapse, keyframes } from '@mui/material';
import { ChatState, IAIPersona, ReactorToolCall, ReactorToolCallStatus, UXChatMessage } from '../types';
import useContentRender from '../../hooks/useContentRender';

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

const pulse = keyframes`
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
`;

const ChatList = (props: {
  reactory: Reactory.Client.ReactorySDK,
  messages: UXChatMessage[],
  personas?: IAIPersona[],
  selectedPersona?: IAIPersona | null,
  chatState?: ChatState,
  onRetryMessage?: (message: UXChatMessage) => void,
  onRateMessage?: (message: UXChatMessage, rating: 'up' | 'down') => void,
  onCopyMessage?: (message: UXChatMessage) => void
}) => {

  const { messages, reactory, personas, selectedPersona, chatState, onRetryMessage, onRateMessage, onCopyMessage } = props;
  const { renderContent } = useContentRender(reactory);

  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);
  
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

  React.useEffect(() => {
    scrollToBottom();
  }, [props.messages.length]); // Only trigger on length change, not content change


  const renderComponent = (message: UXChatMessage) => {
    if (typeof message.component === 'string') {
      const Component = reactory.getComponent(message.component);
      if (Component) {
        //@ts-ignore
        return (<Component {...{ ...message.props, reactory }} />);
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

  const getMessageAvatar = (message: UXChatMessage, reactory: Reactory.Client.ReactorySDK) => {
    if (message.role === 'user' && reactory.getUser()?.loggedIn?.user?.avatar) {
      return reactory.getAvatar(reactory.getUser()?.loggedIn?.user as Reactory.Models.IUser);
    } else if (message.role === 'assistant' && selectedPersona?.avatar) {
      return selectedPersona.avatar;
    }
  }

  const getMessageAvatarIcon = (message: UXChatMessage) => {
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
    // define palette for user, assistant and tool messages
    return background.paper; // Default background color for all messages
  }

  const getMessageAvatarColor = (message: UXChatMessage) => {
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
      typeof message.content === 'string' &&
      message.content.trim().length > 0;
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
      const textToCopy = message.content || getMessageText(message);
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
        id: message.id,
        role: message.role,
        content: message.content.substring(0, 100)
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

    if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
      if (message.tool_calls.length === 1) {
        return reactory.i18n.t('reactor.client.chat.callingTool', {
          tool: message.tool_calls[0].function?.name ?? message.tool_calls[0].name ?? 'unknown',
          defaultValue: 'Calling {{tool}}'
        });
      } else if (message.tool_calls.length < 5) {
        return reactory.i18n.t('reactor.client.chat.callingTools', {
          count: message.tool_calls.length,
          tools: message.tool_calls.map((call) => call.function?.name ?? call.name ?? 'unknown').join(', '),
          defaultValue: 'Calling {{count}} tool(s): {{tools}}'
        });
      } else {
        return reactory.i18n.t('reactor.client.chat.callingTools', {
          count: message.tool_calls.length,
          tools: message.tool_calls.map((call) => call.function?.name ?? call.name ?? 'unknown').join(', '),
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
      console.warn('Tool results message should have been filtered out:', message);
      return 'Tool results (internal)';
    }

    return reactory.i18n.t('reactor.client.chat.noContent', {
      defaultValue: 'No content available for this message.'
    });
  }

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
      <List sx={{
        padding: 0.5,
      }}>
        {messages.map((message, idx) => (
          <React.Fragment key={message.id || idx}>
            <ListItem
              alignItems="flex-start"
              sx={{
                justifyContent: getMessageAlignment(message),
                mb: 0.5,
                padding: 1,
              }}
            >
              <Paper
                elevation={isProcessingMessage(message) || isActivityMessage(message) || isToolCallMessage(message) ? 0 : 1}
                sx={{
                  p: 0.5,
                  maxWidth: '95%',
                  backgroundColor: getMessageBackgroundColor(message),
                  ...(isProcessingMessage(message) && {
                    backgroundColor: 'transparent',
                    border: '1px dashed',
                    borderColor: 'divider',
                  }),
                  ...(isActivityMessage(message) && {
                    backgroundColor: 'transparent',
                    border: '1px dashed',
                    borderColor: 'info.main',
                    opacity: 0.85,
                  }),
                  ...(isToolCallMessage(message) && (() => {
                    const status = getOverallToolCallStatus(message);
                    return {
                      backgroundColor: 'transparent',
                      border: '1px dashed',
                      borderColor:
                        status === 'success' ? 'success.main' :
                        status === 'error'   ? 'error.main' :
                        'warning.main',
                      opacity: 0.9,
                    };
                  })()),
                }}
              >
                <Grid container spacing={1}>
                  <Grid item>
                    <Avatar
                      sx={{ bgcolor: getMessageAvatarColor(message) }}
                      sizes='small'
                      aria-label={message.role}
                      src={getMessageAvatar(message, reactory)}>
                      {!getMessageAvatar(message, reactory) && (
                        <Icon>{getMessageAvatarIcon(message)}</Icon>
                      )}
                    </Avatar>
                  </Grid>
                  <Grid item xs>
                    {isProcessingMessage(message) ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, px: 0.5 }}>
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
                    ) : isActivityMessage(message) ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, px: 0.5 }}>
                        <Typography
                          variant="body2"
                          color="info.main"
                          sx={{ fontStyle: 'italic', userSelect: 'none' }}
                        >
                          {getMessageText(message)}
                        </Typography>
                      </Box>
                    ) : isToolCallMessage(message) ? (() => {
                      const overallStatus = getOverallToolCallStatus(message);
                      const overallColor =
                        overallStatus === 'success' ? 'success.main' :
                        overallStatus === 'error'   ? 'error.main' :
                        'warning.main';
                      const headerLabel =
                        overallStatus === 'running'
                          ? (message.tool_calls.length === 1 ? 'Invoking tool' : `Invoking ${message.tool_calls.length} tools`)
                          : overallStatus === 'success'
                          ? (message.tool_calls.length === 1 ? 'Tool completed' : `${message.tool_calls.length} tools completed`)
                          : (message.tool_calls.length === 1 ? 'Tool failed' : `${message.tool_calls.length} tools (some failed)`);

                      return (
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

                          {/* Per-call chips */}
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
                            {message.tool_calls.filter(Boolean).map((call, i) => {
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
                                <Box key={callId} sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
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
                                  </Box>

                                  {/* Collapsible result panel */}
                                  {isExpanded && (
                                    <Box
                                      sx={{
                                        mt: 0.25,
                                        p: 0.75,
                                        borderRadius: '4px',
                                        bgcolor: chipBg,
                                        border: '1px solid',
                                        borderColor: chipColor,
                                        maxWidth: 320,
                                        maxHeight: 160,
                                        overflowY: 'auto',
                                      }}
                                    >
                                      <Typography
                                        variant="caption"
                                        component="pre"
                                        sx={{
                                          fontFamily: 'monospace',
                                          fontSize: '0.65rem',
                                          color: callStatus === 'error' ? 'error.main' : 'text.secondary',
                                          whiteSpace: 'pre-wrap',
                                          wordBreak: 'break-all',
                                          m: 0,
                                        }}
                                      >
                                        {errorPayload
                                          ? String(errorPayload.error ?? JSON.stringify(errorPayload, null, 2))
                                          : typeof resultPayload?.content === 'string'
                                          ? resultPayload.content
                                          : JSON.stringify(resultPayload?.content ?? resultPayload, null, 2)}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              );
                            })}
                          </Box>
                        </Box>
                      );
                    })() : (
                      <>
                        {/* Collapsible thinking/reasoning panel */}
                        {message.thinking && (
                          <Box sx={{ mb: 0.5 }}>
                            <Box
                              onClick={() => toggleThinking(String(message.id || idx))}
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
                              <Icon sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>psychology</Icon>
                              <Typography variant="caption" color="text.secondary" sx={{ userSelect: 'none' }}>
                                {expandedThinking.has(String(message.id || idx)) ? 'Hide reasoning' : 'View reasoning'}
                              </Typography>
                              <Icon sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                                {expandedThinking.has(String(message.id || idx)) ? 'expand_less' : 'expand_more'}
                              </Icon>
                            </Box>
                            <Collapse in={expandedThinking.has(String(message.id || idx))}>
                              <Box
                                sx={{
                                  mt: 0.5,
                                  p: 1,
                                  borderRadius: '4px',
                                  bgcolor: 'action.hover',
                                  borderLeft: '3px solid',
                                  borderColor: 'text.disabled',
                                  maxHeight: 200,
                                  overflowY: 'auto',
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: 'text.secondary',
                                    fontStyle: 'italic',
                                    fontSize: '0.8rem',
                                    whiteSpace: 'pre-wrap',
                                  }}
                                >
                                  {message.thinking}
                                </Typography>
                              </Box>
                            </Collapse>
                          </Box>
                        )}
                        <Typography variant="body1">
                          {memoizedRenderContent(getMessageText(message))}
                        </Typography>
                      </>
                    )}
                    {/* Render tool errors if present — only for non-tool-call messages (tool-call messages show errors inline per chip) */}
                    {!isToolCallMessage(message) && Array.isArray(message.tool_errors) && message.tool_errors.length > 0 && (
                      <Typography variant="body2" color="error" sx={{ fontWeight: 500, mt: 1 }}>
                        {message.tool_errors.map((err, idx) => (
                          <span key={idx}>
                            {err.name ? `${err.name}: ` : ''}{err.error || JSON.stringify(err)}<br />
                          </span>
                        ))}
                      </Typography>
                    )}
                    {hasComponent(message) && (
                      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                        {renderComponent(message)}
                      </Box>
                    )}
                    {!isProcessingMessage(message) && !isToolCallMessage(message) && (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        {typeof (message as any)?.timestamp === 'string' ?
                          new Date(message.timestamp).toLocaleTimeString() :
                          message.timestamp?.toLocaleTimeString()}
                      </Typography>

                      {/* Feedback buttons for regular assistant messages */}
                      {shouldShowFeedbackButtons(message, idx) && (
                        <Box sx={{ display: 'inline-flex', gap: 0.5, ml: 1 }}>
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
                        </Box>
                      )}

                      {/* Retry button for user messages */}
                      {shouldShowRetryButton(message) && (
                        <Box sx={{ display: 'inline-flex' }}>
                          <Tooltip title="Retry this message">
                            <IconButton
                              size="small"
                              sx={{ fontSize: '0.875rem' }}
                              onClick={() => handleRetry(message)}
                            >
                              <Icon sx={{ fontSize: '1rem' }}>refresh</Icon>
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>
                    )}
                  </Grid>
                </Grid>
              </Paper>
            </ListItem>
          </React.Fragment>
        ))}
      </List>
    </div>
  );
};

export default ChatList;
