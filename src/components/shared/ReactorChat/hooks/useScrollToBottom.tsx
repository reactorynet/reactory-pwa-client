import { Tooltip } from '@mui/material';
import { ChatState, IAIPersona, UXChatMessage } from '../types';
import useContentRender from '../../hooks/useContentRender';

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
          defaultValue: 'Calling {{count} tool(s): {tools}'
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
                elevation={1}
                sx={{
                  p: 0.5,                  
                  maxWidth: '95%',
                  backgroundColor: getMessageBackgroundColor(message),
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
                    <Typography variant="body1">
                      {memoizedRenderContent(getMessageText(message))}
                    </Typography>
                    {/* Render tool errors if present */}
                    {Array.isArray(message.tool_errors) && message.tool_errors.length > 0 && (
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
                              title="Retry this message"
                            >
                              <Icon sx={{ fontSize: '1rem' }}>refresh</Icon>
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>
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
