import { useReactory } from "@reactory/client-core/api";
import usePersonas from './hooks/usePersonas';
import useChatFactory from './hooks/useChatFactory';
import ChatList from './hooks/useScrollToBottom';
import useMacros from './hooks/useMacros';
import { useEffect, useRef } from 'react';
import ChatHistoryItem from './ChatHistoryItem';
import {
  IAIPersona,
  ChatMessage,
  IProps,
  UXChatMessage,
  MacroToolDefinition
} from './types';
import { on } from "process";
import ChatHeader from './ChatHeader';
import ChatHistoryDrawer from './ChatHistoryDrawer';
import { useNavigate, useLocation } from 'react-router-dom';

export default (props) => {
  const { formData } = props;
  const reactory = useReactory();
  const il8n = reactory.i18n;
  const user = reactory.getUser()?.loggedIn?.user;
  const theme: Reactory.UX.IReactoryTheme = reactory.getTheme();

  const {
    options,
  } = theme;

  const {
    mode,
    primary,
    secondary,
    background,
    text,
  } = (options as any)?.palette as Reactory.UX.IThemePalette;

  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["core.FullScreenModal", "material-ui.Material", "react.React"])

  const { useState } = React;

  const onMessage = (message: UXChatMessage) => {
    if (message.content === undefined || message.content === null) return;
    const newMessage: UXChatMessage = {
      ...message,
    } as UXChatMessage;

    newMessage.id ??= reactory.utils.uuid();
    newMessage.timestamp ??= new Date();
    newMessage.role ??= 'assistant';
  }

  const onError = (error: Error) => {

  };

  const {
    personas,
    loading: personasLoading,
    error: personasError,
    selectPersona,
    activePersona: selectedPersona,
    getPersona,
  } = usePersonas({
    reactory,
    onMessage,
    onError,
    intialPersonaId: props?.personaId || null,
  });

  const scrollToBottom = (message: any) => {
    const doScroll = () => {
      const chatContainer = document.querySelector('.chat-container');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }

    if (message?.role === 'assistant') {
      setTimeout(doScroll, 1000);
    } else {
      doScroll();
    }
  }

  const {
    chatState,
    busy,
    sendMessage,
    sendAudio,
    uploadFile,
    newChat,
    loadChat,
    listChats,
    setToolApprovalMode,
    chats,
    setChats,
    deleteChat
  } = useChatFactory({
    reactory,
    persona: selectedPersona,
    protocol: 'graphql',
  });

  const {
    findMacroByAlias,
    executeMacro
  } = useMacros({
    reactory,
    chatState,
    onMacroCallResult: (result) => {
    },
    onMacroCallError: (error) => {
    }
  })

  const {
    Button,
    Icon,
    IconButton,
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
    Tune,
  } = Material.MaterialIcons;


  const [messages, setMessages] = useState<UXChatMessage[]>([]);

  React.useEffect(() => {
    scrollToBottom(messages[messages.length - 1]);
  }, [messages]);

  React.useEffect(() => {
    if (chatState?.history) {
      // Debug logging: check what roles are coming from backend
      console.log('ReactorChat: Raw history from backend:', chatState.history.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content.substring(0, 100) : msg.content
      })));

      const newMessages = chatState.history.map((message: UXChatMessage) => ({
        ...message,
        id: message.id || reactory.utils.uuid(),
        timestamp: new Date(),
        // @ts-ignore
        role: message.role || 'assistant'
      })) as UXChatMessage[];

      // filter out any system messages and tool result messages
      const filteredMessages = newMessages.filter((msg) => {
        // Filter out system messages
        if (msg.role === 'system') return false;

        // Filter out tool result messages (role 'tool')
        if (msg.role === 'tool') {
          console.log('ReactorChat: Filtering out tool message:', msg.content?.substring(0, 100));
          return false;
        }

        // Filter out messages that look like tool execution results but have wrong role
        if (msg.content && typeof msg.content === 'string' &&
          msg.content.startsWith('Tool execution results:')) {
          console.warn('Found tool result message with incorrect role:', msg.role, msg.content.substring(0, 50));
          return false;
        }

        // Check for consolidated tool results pattern
        if (msg.content && typeof msg.content === 'string' &&
          (msg.content.includes('Tool 1 (') || msg.content.includes('Multiple tools executed successfully:'))) {
          console.warn('Found consolidated tool result with role:', msg.role, msg.content.substring(0, 100));
          return false;
        }

        return true;
      });

      console.log('ReactorChat: Filtered messages:', filteredMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content.substring(0, 50) : msg.content
      })));

      setMessages(filteredMessages);
    }
  }, [chatState?.history]);

  const [userInput, setUserInput] = useState<string>('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const [headerOpen, setHeaderOpen] = useState<boolean>(false);
  const [chatMenuAnchor, setChatMenuAnchor] = useState<null | HTMLElement>(null);
  const [chatHistoryOpen, setChatHistoryOpen] = useState(false);
  const [selectedChats, setSelectedChats] = useState([]);

  // Track manual navigation to prevent redundant operations
  const isManualNavigation = React.useRef(false);

  // Reset selectedChats when chat history closes
  React.useEffect(() => {
    if (!chatHistoryOpen) {
      setSelectedChats([]);
    }
  }, [chatHistoryOpen]);

  const navigate = useNavigate();
  const location = useLocation();

  // Parse query params for personaId and sessionId
  const queryParams = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      personaId: params.get('personaId'),
      sessionId: params.get('sessionId'),
    };
  }, [location.search]);

  // Set active persona from query param if personas loaded
  React.useEffect(() => {
    if (personas && personas.length > 0 && queryParams.personaId) {
      const found = personas.find(p => p.id === queryParams.personaId);
      if (found && selectedPersona?.id !== found.id) {
        reactory.log(`ReactorChat: Selecting persona from URL param: ${found.name} (${found.id})`);
        selectPersona(found.id);
      }
    }
  }, [personas, queryParams.personaId, selectedPersona?.id]);

  // Optionally, load chat session if sessionId is present
  React.useEffect(() => {
    console.log('ReactorChat: Chat loading useEffect triggered', {
      sessionId: queryParams.sessionId,
      currentChatId: chatState?.id,
      busy,
      isManualNavigation: isManualNavigation.current
    });

    if (busy) {
      reactory.log('ReactorChat: Skipping chat load - system is busy');
      return; // Prevent loading if already busy
    }

    if (isManualNavigation.current) {
      console.log('ReactorChat: Skipping chat load - manual navigation in progress');
    }

    if (queryParams.sessionId && chatState?.id !== queryParams.sessionId) {
      reactory.log(`ReactorChat: Loading chat from URL param: ${queryParams.sessionId}`);
      loadChat(queryParams.sessionId);
    }
  }, [queryParams.sessionId, chatState?.id, busy]);

  useEffect(() => {
    console.log('ReactorChat: Chat list refresh useEffect triggered', {
      personaId: selectedPersona?.id,
      busy,
      isManualNavigation: isManualNavigation.current
    });

    // Only refresh chat list if persona actually changed and we're not busy
    if (busy) {
      reactory.log('ReactorChat: Skipping chat list refresh - system is busy');
      return;
    }

    // Skip refresh during manual navigation to prevent redundant calls
    if (isManualNavigation.current) {
      reactory.log('ReactorChat: Skipping chat list refresh - manual navigation in progress');
      return;
    }

    (async () => {
      reactory.log(`ReactorChat: Refreshing chat list for persona: ${selectedPersona?.name || 'none'}`);
      const chatList = await listChats({});
      setChats(chatList);
    })();
  }, [selectedPersona?.id, busy]);

  const handleHeaderToggle = () => setHeaderOpen((open) => !open);

  const handleChatMenuOpen = (event: React.MouseEvent<HTMLElement>) => setChatMenuAnchor(event.currentTarget);
  const handleChatMenuClose = (cb?: () => void) => {
    setChatMenuAnchor(null);
    if (cb) {
      cb();
    }
  };

  const handleChatSelect = (chat) => {
    console.log('ReactorChat: handleChatSelect called', {
      chatId: chat.id,
      currentChatId: chatState?.id,
      isManualNavigation: isManualNavigation.current,
      busy
    });

    handleChatMenuClose(() => {
      // Prevent redundant operations if chat is already selected
      if (chatState?.id === chat.id) {
        console.log('ReactorChat: Chat already selected, skipping');
        return;
      }

      // Prevent operation if already in progress
      if (isManualNavigation.current || busy) {
        console.log('ReactorChat: Operation in progress, skipping', { isManualNavigation: isManualNavigation.current, busy });
        return;
      }

      // Mark as manual navigation to prevent useEffect cascades
      isManualNavigation.current = true;
      console.log('ReactorChat: Starting manual navigation for chat', chat.id);

      // Use navigation to update URL - this will trigger the useEffect hooks
      // We don't need to call selectPersona/loadChat manually since the URL change will handle it
      const personaParam = queryParams.personaId ? queryParams.personaId : chat.personaId;
      const searchQuery = `?sessionId=${chat.id}&personaId=${personaParam}`;

      navigate({
        pathname: location.pathname,
        search: searchQuery
      });

      // Reset the flag after a longer delay to allow URL effects to process
      setTimeout(() => {
        isManualNavigation.current = false;
        console.log('ReactorChat: Manual navigation flag reset');
      }, 500); // Increased from 100ms to 500ms
    });




  };

  const handleModelMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleModelMenuClose = () => {
    setAnchorEl(null);
  };

  const handlePersonaSelect = (persona: Partial<IAIPersona>) => {
    selectPersona(persona.id);
    handleModelMenuClose();
  };

  const handleSendMessage = () => {
    if (userInput.trim() === '') return;
    setUserInput('');
    sendMessage(userInput, chatState?.id);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };


  const onToolExecute = async (toolCall: MacroToolDefinition & { args?: any, calledBy?: string, callId?: string }) => {
    if (!toolCall.function) return;
    try {
      const macro = findMacroByAlias(toolCall.function.name);
      const result = await executeMacro(macro, toolCall.args || {}, toolCall.calledBy, toolCall.callId);
      if (result) {
        setMessages((prevMessages) => [...prevMessages, result]);
      }
    } catch (error) {
      reactory.error(`Error executing tool: ${error.message}`, { toolCall, error });
    }
  }

  return (
    <Box
      sx={{
        height: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 800,
        mx: 'auto',
        p: 2,
        minHeight: 0,
      }}
    >
      <ChatHistoryDrawer
        open={chatHistoryOpen}
        onClose={() => setChatHistoryOpen(false)}
        onOpen={() => setChatHistoryOpen(true)}
        chats={chats}
        il8n={il8n}
        onSelectChat={handleChatSelect}
        onDeleteChat={deleteChat}
        selectedChats={selectedChats}
        setSelectedChats={setSelectedChats}
        getPersona={getPersona}
      />
      <Paper
        elevation={3}
        sx={{
          flexGrow: 1,
          mb: 2,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
        style={{
          padding: '0',
          overflow: 'hidden',
          flexGrow: 1,
          minHeight: 0,
        }}
      >
        <ChatList
          reactory={reactory}
          messages={messages}
          personas={personas}
          selectedPersona={selectedPersona}
          chatState={chatState}
          onRetryMessage={(message) => {
            // Retry the user's message by sending it again
            if (message.content) {
              sendMessage(message.content);
            }
          }}
          onRateMessage={(message, rating) => {
            // Handle rating functionality
            reactory.log(`Message rated: ${rating}`, { message });
            // TODO: Implement actual rating API call
          }}
          onCopyMessage={(message) => {
            // Copy message content to clipboard
            if (message.content && navigator.clipboard) {
              navigator.clipboard.writeText(message.content).then(() => {
                reactory.log('Message copied to clipboard');
                // TODO: Show success toast
              }).catch((err) => {
                reactory.error('Failed to copy message', err);
              });
            }
          }}
        />
      </Paper>

      <Paper elevation={3} sx={{ p: 2 }}>
        <Grid container spacing={1} columns={4} alignItems="center">
          <Grid item>
            <IconButton
              size="small"
              onClick={() => setChatHistoryOpen(true)}
              color="primary"
              aria-label={il8n?.t('reactor.client.chat.history', { defaultValue: 'Chat History' })}
              title={il8n?.t('reactor.client.chat.history', { defaultValue: 'Chat History' })}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40 }}
            >
              <Material.MaterialIcons.History />
            </IconButton>
          </Grid>
          <Grid item xs sx={{ display: 'flex', alignItems: 'center' }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Type your message here or use /@ to execute a macro"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              multiline
              maxRows={4}
              variant="outlined"
              disabled={busy}
              InputProps={{
                sx: {
                  fontSize: 14,
                  py: 0.5,
                },
                startAdornment: (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 0.5 }}>
                    <IconButton
                      aria-label="Attach file"
                      component="label"
                      color="primary"
                      disabled={busy}
                      sx={{ p: 0.1, fontSize: '1rem', display: 'flex', alignItems: 'center' }}
                    >
                      <Material.MaterialIcons.AttachFile fontSize="small" />
                      <input
                        type="file"
                        hidden
                        accept="audio/*,image/*,application/pdf,text/plain"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (file && chatState?.id) {
                            await uploadFile && uploadFile(file, chatState.id);
                          }
                          event.target.value = '';
                        }}
                      />
                    </IconButton>
                  </Box>
                ),
                endAdornment: (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pr: 0.5 }}>
                    <IconButton
                      aria-label="Record audio"
                      color="primary"
                      onClick={async () => {
                        if (!chatState?.id) return;
                        await sendAudio && sendAudio(new Blob(), chatState.id);
                      }}
                      disabled={busy}
                      sx={{ p: 0.1, fontSize: '1rem', display: 'flex', alignItems: 'center' }}
                    >
                      <Material.MaterialIcons.Mic fontSize="small" />
                    </IconButton>

                    <IconButton
                      size="small"
                      color="primary"
                      aria-label={il8n?.t('reactor.client.chat.opentools', { defaultValue: 'Open tools menu' })}
                      title={il8n?.t('reactor.client.chat.opentools', { defaultValue: 'Open tools menu' })}
                      sx={{ p: 0.1, fontSize: '1rem', display: 'flex', alignItems: 'center' }}
                    >
                      <Icon fontSize="small">construction</Icon>
                    </IconButton>
                  </Box>
                ),
              }}
              sx={{
                fontSize: 14,
                pr: 0.5,
                pl: 0.1,
                py: 0.5,
              }}
            />
          </Grid>
          <Grid item sx={{ display: 'flex', alignItems: 'center', height: 40 }}>
            <IconButton
              size="small"
              color="primary"
              onClick={handleSendMessage}
              disabled={userInput.trim() === '' || busy}
              sx={{ height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {busy ? (
                <Icon fontSize="small" style={{ animation: 'spin 1s linear infinite', transform: 'scaleX(-1)' }}>
                  sync
                </Icon>
              ) : (
                <Icon fontSize="small">
                  send
                </Icon>
              )}
            </IconButton>
          </Grid>
          <Grid item sx={{ display: 'flex', alignItems: 'center', height: 40 }}>
            <IconButton
              size="small"
              onClick={handleHeaderToggle}
              color="primary"
              aria-label={il8n?.t('reactor.client.chat.toggleHeader', { defaultValue: 'Toggle Header' })}
              title={il8n?.t('reactor.client.chat.toggleHeader', { defaultValue: 'Toggle Header' })}
              sx={{ height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Tune />
            </IconButton>
          </Grid>
          <Grid item xs={12} style={{
            height: headerOpen ? 'auto' : 0,
            overflow: 'hidden',
            transition: 'height 0.3s ease-in-out',
            position: 'relative',
          }}>
            <ChatHeader
              setToolApprovalMode={setToolApprovalMode}
              chatState={chatState}
              headerOpen={headerOpen}
              handleHeaderToggle={handleHeaderToggle}
              selectedPersona={selectedPersona}
              enablePersonaSelection={props.enablePersonaSelection ? props.enablePersonaSelection : true}
              personas={personas}
              handleModelMenuOpen={handleModelMenuOpen}
              anchorEl={anchorEl}
              handleModelMenuClose={handleModelMenuClose}
              handlePersonaSelect={handlePersonaSelect}
              handleChatMenuOpen={handleChatMenuOpen}
              chatMenuAnchor={chatMenuAnchor}
              handleChatMenuClose={handleChatMenuClose}
              chats={chats}
              handleChatSelect={handleChatSelect}
              Material={Material}
              deleteChat={deleteChat}
              reactory={reactory}
              onToolExecute={onToolExecute}
              uploadFile={uploadFile}
              sendAudio={sendAudio}
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}