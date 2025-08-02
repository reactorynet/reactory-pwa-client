import { useReactory } from "@reactory/client-core/api";
import usePersonas from './hooks/usePersonas';
import useChatFactory from './hooks/useChatFactory';
import useStreamingChatFactory from './hooks/useStreamingChatFactory';
import ChatList from './hooks/useScrollToBottom';
import useMacros from './hooks/useMacros';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import ChatHistoryItem from './ChatHistoryItem';
import {
  IAIPersona,
  ChatMessage,
  IProps,
  UXChatMessage,
  MacroToolDefinition,
  ToolApprovalMode,
  ChatState
} from './types';
import { on } from "process";
import ChatHeader from './ChatHeader';
import ChatHistoryDrawer from './ChatHistoryDrawer';
import PersonaCard from './PersonaCard';
import ChatInput from './components/ChatInput';
import FilesPanel from './FilesPanel';
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
  } = reactory.muiTheme.palette;

  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["core.FullScreenModal", "material-ui.Material", "react.React"])

  const { useState, useMemo, useCallback } = React;

  const onMessage = useCallback((message: UXChatMessage) => {
    if (message.content === undefined || message.content === null) return;
    const newMessage: UXChatMessage = {
      ...message,
    } as UXChatMessage;

    newMessage.id ??= reactory.utils.uuid();
    newMessage.timestamp ??= new Date();
    newMessage.role ??= 'assistant';
  }, [reactory.utils.uuid]);

  const onError = useCallback((error: Error) => {

  }, []);

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

  const scrollToBottom = useCallback((message: any) => {
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
  }, []);

  // Streaming toggle state
  const [streamingEnabled, setStreamingEnabled] = useState<boolean>(false);

  // Non-streaming chat factory
  const nonStreamingChatFactory = useChatFactory({
    reactory,
    persona: selectedPersona,
    protocol: 'graphql',
  });

  // Streaming chat factory  
  const streamingChatFactory = useStreamingChatFactory({
    reactory,
    persona: selectedPersona,
    protocol: 'sse',
    onMessage,
    onError,
  });

  // Use the appropriate chat factory based on streaming toggle
  // If we have an active session, prioritize keeping it active regardless of streaming mode
  const activeFactory = React.useMemo(() => {
    const hasNonStreamingSession = nonStreamingChatFactory.chatState?.id && nonStreamingChatFactory.isInitialized;
    const hasStreamingSession = streamingChatFactory.chatState?.id && streamingChatFactory.isInitialized;

    if (streamingEnabled) {
      // User wants streaming mode
      if (hasStreamingSession) {
        // Streaming factory already has a session, use it
        return streamingChatFactory;
      } else if (hasNonStreamingSession) {
        // Non-streaming has a session but user wants streaming
        // TODO: We could implement a session transfer mechanism here
        reactory.log('ReactorChat: User wants streaming but non-streaming has active session. Consider implementing session transfer.', 'warn');
        return nonStreamingChatFactory; // For now, keep the active session
      } else {
        // No active session, use streaming factory
        return streamingChatFactory;
      }
    } else {
      // User wants non-streaming mode
      if (hasNonStreamingSession) {
        // Non-streaming factory already has a session, use it
        return nonStreamingChatFactory;
      } else if (hasStreamingSession) {
        // Streaming has a session but user wants non-streaming
        // TODO: We could implement a session transfer mechanism here
        reactory.log('ReactorChat: User wants non-streaming but streaming has active session. Consider implementing session transfer.', 'warn');
        return streamingChatFactory; // For now, keep the active session
      } else {
        // No active session, use non-streaming factory
        return nonStreamingChatFactory;
      }
    }
  }, [streamingEnabled, nonStreamingChatFactory, streamingChatFactory, reactory]);

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
    deleteChat,
    // Streaming-specific properties (will be undefined for non-streaming)
    isStreaming = false,
    currentStreamingMessage = '',
  } = activeFactory === streamingChatFactory ? streamingChatFactory : {
    ...nonStreamingChatFactory,
    isStreaming: false,
    currentStreamingMessage: '',
  };

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
    Grid,
    Typography,
    Box,
    List,
    ListItem,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Avatar,
    Divider,
    Fab,
    LinearProgress,
    Tooltip,
    Chip,
    Switch,
    Checkbox
  } = Material.MaterialCore;

  const {
    Tune,
    Person,
  } = Material.MaterialIcons;

  // Helper to get color based on token pressure
  const getTokenPressureColor = useCallback((pressure: number) => {
    if (pressure <= 0.25) return 'success'; // Green
    if (pressure <= 0.5) return 'warning'; // Yellow
    if (pressure <= 0.75) return 'error'; // Orange (using error color)
    return 'error'; // Red
  }, []);

  const [messages, setMessages] = useState<UXChatMessage[]>([]);

  // Memoize the filtered messages to prevent unnecessary re-renders
  const processedMessages = useMemo(() => {
    if (!chatState?.history) {
      // If streaming and we have a partial message, show it
      if (isStreaming && currentStreamingMessage) {
        return [{
          id: 'streaming-temp',
          timestamp: new Date(),
          role: 'assistant',
          content: currentStreamingMessage,
          sessionId: chatState?.id,
          isStreaming: true, // Flag to identify streaming message
        } as UXChatMessage];
      }
      return [];
    }

    const newMessages = chatState.history.map((message: UXChatMessage) => ({
      ...message,
      id: message.id || reactory.utils.uuid(),
      timestamp: message.timestamp || new Date(),
    }));

    // filter out any system messages and tool result messages
    const filteredMessages = newMessages.filter((msg) => {
      // Filter out system messages
      if (msg.role === 'system') return false;

      // Filter out tool result messages (role 'tool')
      if (msg.role === 'tool') return false;

      // Filter out messages that look like tool execution results but have wrong role
      if (msg.role === 'assistant' && msg.content && typeof msg.content === 'string' &&
        (msg.content.includes('Tool 1 (') || msg.content.includes('Multiple tools executed successfully:'))) {
        return false;
      }

      return true;
    });

    console.log('ReactorChat: Filtered messages:', filteredMessages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content.substring(0, 50) + '...' : msg.content
    })));

    // Add streaming message if active
    if (isStreaming && currentStreamingMessage) {
      filteredMessages.push({
        id: 'streaming-temp',
        timestamp: new Date(),
        role: 'assistant',
        content: currentStreamingMessage,
        sessionId: chatState?.id,
        isStreaming: true, // Flag to identify streaming message
      } as UXChatMessage);
    }

    return filteredMessages;
  }, [chatState?.history, reactory.utils.uuid, isStreaming, currentStreamingMessage, chatState?.id]);  // Update messages only when processedMessages changes
  React.useEffect(() => {
    setMessages(processedMessages);
  }, [processedMessages]);

  // Only scroll when messages actually change
  React.useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(messages[messages.length - 1]);
    }
  }, [messages.length, scrollToBottom]);


  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [personaPanelOpen, setPersonaPanelOpen] = useState<boolean>(false);
  const [toolsPanelOpen, setToolsPanelOpen] = useState<boolean>(false);
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set());
  const [chatHistoryPanelOpen, setChatHistoryPanelOpen] = useState<boolean>(false);
  const [recordingPanelOpen, setRecordingPanelOpen] = useState<boolean>(false);
  const [filesPanelOpen, setFilesPanelOpen] = useState<boolean>(false);

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

  // Initialize all tools as enabled by default
  React.useEffect(() => {
    if (chatState?.tools && chatState.tools.length > 0) {
      const toolNames = chatState.tools.map(tool => tool.function?.name).filter(Boolean);
      setEnabledTools(new Set(toolNames));
    } else {
      // Clear enabled tools if no tools are available
      setEnabledTools(new Set());
    }
  }, [chatState?.tools, selectedPersona?.id]);

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
  }, [personas, queryParams.personaId, selectedPersona?.id, selectPersona]);

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
  }, [queryParams.sessionId, chatState?.id, busy, loadChat]);

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
      setChats(chatList as ChatState[]);
    })();
  }, [selectedPersona?.id, busy, listChats, setChats]);

  const handleHeaderToggle = useCallback(() => setHeaderOpen((open) => !open), []);

  const handleChatMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => setChatMenuAnchor(event.currentTarget), []);
  const handleChatMenuClose = useCallback((cb?: () => void) => {
    setChatMenuAnchor(null);
    if (cb) {
      cb();
    }
  }, []);

  const handleChatSelect = useCallback((chat) => {
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
  }, [chatState?.id, busy, queryParams.personaId, navigate, location.pathname, handleChatMenuClose]);

  const handlePersonaPanelToggle = useCallback(() => {
    setPersonaPanelOpen(!personaPanelOpen);
  }, [personaPanelOpen]);

  const handlePersonaPanelClose = useCallback(() => {
    setPersonaPanelOpen(false);
  }, []);

  const handleToolsPanelToggle = useCallback(() => {
    setToolsPanelOpen(!toolsPanelOpen);
  }, [toolsPanelOpen]);

  const handleToolsPanelClose = useCallback(() => {
    setToolsPanelOpen(false);
  }, []);

  const handleToolToggle = useCallback((toolName: string) => {
    setEnabledTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolName)) {
        newSet.delete(toolName);
      } else {
        newSet.add(toolName);
      }
      return newSet;
    });
  }, []);

  const handleChatHistoryPanelToggle = useCallback(() => {
    setChatHistoryPanelOpen(!chatHistoryPanelOpen);
  }, [chatHistoryPanelOpen]);

  const handleChatHistoryPanelClose = useCallback(() => {
    setChatHistoryPanelOpen(false);
  }, []);

  const handleRecordingPanelToggle = useCallback(() => {
    setRecordingPanelOpen(!recordingPanelOpen);
  }, [recordingPanelOpen]);

  const handleRecordingPanelClose = useCallback(() => {
    setRecordingPanelOpen(false);
  }, []);

  const handleFilesPanelToggle = useCallback(() => {
    setFilesPanelOpen(!filesPanelOpen);
  }, [filesPanelOpen]);

  const handleFilesPanelClose = useCallback(() => {
    setFilesPanelOpen(false);
  }, []);

  const handlePersonaSelect = useCallback((persona: Partial<IAIPersona>) => {
    selectPersona(persona.id);
    setPersonaPanelOpen(false);

    // Navigate to current location with only personaId parameter
    const searchQuery = `?personaId=${persona.id}`;
    navigate({
      pathname: location.pathname,
      search: searchQuery
    });
  }, [selectPersona, navigate, location.pathname]);

  const handleSendMessage = useCallback((message: string) => {
    sendMessage(message, chatState?.id);
  }, [sendMessage, chatState?.id]);

  const handleStreamingToggle = useCallback((enabled: boolean) => {
    setStreamingEnabled(enabled);
    reactory.info(`Streaming mode ${enabled ? 'enabled' : 'disabled'}`);

    // Show user feedback
    if (enabled) {
      reactory.log('Streaming Enabled: Messages will now stream in real-time as they are generated');
    } else {
      reactory.log('Streaming Disabled: Messages will be delivered after complete generation');
    }
  }, [reactory]);

  const onToolExecute = useCallback(async (toolCall: MacroToolDefinition & { args?: any, calledBy?: string, callId?: string }) => {
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
  }, [findMacroByAlias, executeMacro, reactory]);

  // Utility function to convert camelCase to readable labels
  const toCamelCaseLabel = useCallback((str: string) => {
    if (!str) return '';
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }, []);

  // Helper function to get tool icon
  const getToolIcon = useCallback((tool) => {
    const toolName = tool.function?.name?.toLowerCase() || '';

    // Map tool names to icons
    if (toolName.includes('search') || toolName.includes('find')) return 'search';
    if (toolName.includes('read') || toolName.includes('file')) return 'description';
    if (toolName.includes('write') || toolName.includes('create')) return 'edit';
    if (toolName.includes('delete') || toolName.includes('remove')) return 'delete';
    if (toolName.includes('send') || toolName.includes('email')) return 'send';
    if (toolName.includes('calculate') || toolName.includes('math')) return 'calculate';
    if (toolName.includes('translate')) return 'translate';
    if (toolName.includes('weather')) return 'wb_sunny';
    if (toolName.includes('time') || toolName.includes('date')) return 'schedule';
    if (toolName.includes('location') || toolName.includes('map')) return 'location_on';
    if (toolName.includes('image') || toolName.includes('photo')) return 'image';
    if (toolName.includes('video')) return 'video_library';
    if (toolName.includes('audio') || toolName.includes('sound')) return 'audiotrack';
    if (toolName.includes('database') || toolName.includes('db')) return 'storage';
    if (toolName.includes('api') || toolName.includes('http')) return 'api';
    if (toolName.includes('code') || toolName.includes('script')) return 'code';
    if (toolName.includes('test') || toolName.includes('validate')) return 'bug_report';
    if (toolName.includes('backup') || toolName.includes('export')) return 'backup';
    if (toolName.includes('import') || toolName.includes('load')) return 'upload';

    // Default tool icon
    return 'build';
  }, []);

  // check the max width of the screen
  const isNarrowScreen = useMemo(() => {
    const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    return width < 600; // Adjust this value as needed for your design
  }, []);

  // get the theme colors 
  const themeColors = useMemo(() => {
    return {
      primary: (typeof primary === 'string' ? primary : primary?.main) || '#1976d2',
      secondary: (typeof secondary === 'string' ? secondary : secondary?.main) || '#dc004e',
      background: (typeof background === 'string' ? background : background?.default) || '#f5f5f5',
      text: (typeof text === 'string' ? text : text?.primary) || '#000000',
    };
  }, [primary, secondary, background, text]);

  const backgroundSVG = useMemo(() => {
    // Create a simplified SVG pattern that should work reliably in data URLs
    const svg = `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" fill="${themeColors.background}"/>
      <circle cx="10" cy="10" r="2.5" fill="${themeColors.primary}" opacity="0.3"/>
      <circle cx="30" cy="30" r="2" fill="${themeColors.secondary}" opacity="0.4"/>
      <rect x="25" y="3" width="5" height="5" fill="${themeColors.primary}" opacity="0.25"/>
      <rect x="3" y="25" width="4" height="4" fill="${themeColors.secondary}" opacity="0.2"/>
      <circle cx="35" cy="7" r="1.5" fill="${themeColors.primary}" opacity="0.3"/>
      <circle cx="20" cy="20" r="1" fill="${themeColors.secondary}" opacity="0.25"/>
      <line x1="10" y1="10" x2="16" y2="16" stroke="${themeColors.primary}" stroke-width="0.5" opacity="0.2"/>
      <line x1="30" y1="30" x2="24" y2="24" stroke="${themeColors.secondary}" stroke-width="0.5" opacity="0.25"/>
    </svg>`;
    
    // Remove all whitespace and newlines for better data URL compatibility
    return svg.replace(/\s+/g, ' ').trim();
  }, [themeColors]);

  return (
    <Box
      sx={{
        height: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: isNarrowScreen ? '95%' : '100%',
        mx: 'auto',
        p: isNarrowScreen ? 0 : 2,
        minHeight: 0,
        position: 'relative',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          flexGrow: 1,
          marginBottom: 1,
          overflow: 'hidden',
          backgroundColor: themeColors.background,
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(backgroundSVG)}")`,
          backgroundSize: '40px 40px',
          backgroundRepeat: 'repeat',
          opacity: 0.8,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 20% 20%, ${themeColors.primary}08 0%, transparent 60%),
              radial-gradient(circle at 80% 80%, ${themeColors.secondary}08 0%, transparent 60%)
            `,
            backdropFilter: 'blur(1px)',
            pointerEvents: 'none',
            zIndex: 0,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 25% 25%, ${themeColors.secondary}06 0%, transparent 60%),
              radial-gradient(circle at 75% 75%, ${themeColors.primary}06 0%, transparent 60%)
            `,
            backdropFilter: 'blur(0.5px)',
            pointerEvents: 'none',
            zIndex: 0,
          }
        }}
      >
        {/* Chat List Panel */}
        <Paper
          elevation={0}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: personaPanelOpen
              ? 'translateX(100%)'
              : toolsPanelOpen
                ? 'translateX(-100%)'
                : 'translateX(0)',
            transition: 'transform 0.3s ease-in-out',
            overflow: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            zIndex: 1,
            backgroundColor: themeColors.background,
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(backgroundSVG)}")`,
          backgroundSize: '60px 60px',
          backgroundRepeat: 'repeat',
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
            onRetryMessage={React.useCallback((message) => {
              // Retry the user's message by sending it again
              if (message.content) {
                sendMessage(message.content);
              }
            }, [sendMessage])}
            onRateMessage={React.useCallback((message, rating) => {
              // Handle rating functionality
              reactory.log(`Message rated: ${rating}`, { message });
              // TODO: Implement actual rating API call
            }, [reactory])}
            onCopyMessage={React.useCallback((message) => {
              // Copy message content to clipboard
              if (message.content && navigator.clipboard) {
                navigator.clipboard.writeText(message.content).then(() => {
                  reactory.log('Message copied to clipboard');
                  // TODO: Show success toast
                }).catch((err) => {
                  reactory.error('Failed to copy message', err);
                });
              }
            }, [reactory])}
          />
        </Paper>

        {/* Persona Selection Panel */}
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: personaPanelOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease-in-out',
            overflow: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            zIndex: 2,            
            backdropFilter: 'blur(10px) saturate(150%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton
              onClick={handlePersonaPanelClose}
              sx={{ mr: 2 }}
              aria-label="Close persona selection"
            >
              <Material.MaterialIcons.ArrowBack />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {il8n?.t('reactor.client.persona.select.title', { defaultValue: 'Select a Persona' })}
            </Typography>
          </Box>

          {personas.length > 0 ? (
            <Grid container spacing={2}>
              {personas
                .slice()
                .sort((a, b) => (a.name?.toLowerCase() ?? '').localeCompare(b.name?.toLowerCase() ?? ''))
                .map((persona) => (
                  <Grid item xs={12} sm={12} md={6} lg={4} xl={3} key={persona.id}>
                    <PersonaCard
                      persona={persona}
                      isSelected={selectedPersona?.id === persona.id}
                      onSelect={handlePersonaSelect}
                      onDetails={(persona) => {
                        // show details using PersonaDetailsDialog

                      }}
                      Material={Material}
                      toCamelCaseLabel={toCamelCaseLabel}
                    />
                  </Grid>
                ))}
            </Grid>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {il8n?.t('reactor.client.persona.none', { defaultValue: 'No personas available' })}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Tools Panel */}
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: toolsPanelOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s ease-in-out',
            overflow: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            zIndex: 2,            
            backdropFilter: 'blur(15px) saturate(120%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton
              onClick={handleToolsPanelClose}
              sx={{ mr: 2 }}
              aria-label="Close tools panel"
            >
              <Material.MaterialIcons.ArrowBack />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {il8n?.t('reactor.client.tools.title', { defaultValue: 'Tools' })}
            </Typography>
          </Box>

          {/* Tool Approval Mode Header */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              {il8n?.t('reactor.client.tools.approval.mode', { defaultValue: 'Tool Approval Mode' })}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {il8n?.t('reactor.client.tools.approval.auto', { defaultValue: 'Auto' })}
              </Typography>
              <Switch
                checked={chatState?.toolApprovalMode === ToolApprovalMode.PROMPT}
                onChange={(e) => setToolApprovalMode(e.target.checked ? ToolApprovalMode.PROMPT : ToolApprovalMode.AUTO)}
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                {il8n?.t('reactor.client.tools.approval.manual', { defaultValue: 'Manual' })}
              </Typography>
            </Box>
          </Box>

          {/* Streaming Mode Toggle */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              {il8n?.t('reactor.client.streaming.mode', { defaultValue: 'Streaming Mode' })}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {il8n?.t('reactor.client.streaming.standard', { defaultValue: 'Standard' })}
              </Typography>
              <Switch
                checked={streamingEnabled}
                onChange={(e) => handleStreamingToggle(e.target.checked)}
                size="small"
                color="primary"
              />
              <Typography variant="body2" color="text.secondary">
                {il8n?.t('reactor.client.streaming.realtime', { defaultValue: 'Real-time' })}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {streamingEnabled
                ? il8n?.t('reactor.client.streaming.description.enabled', {
                  defaultValue: 'Messages stream in real-time as they are generated'
                })
                : il8n?.t('reactor.client.streaming.description.disabled', {
                  defaultValue: 'Messages are delivered after complete generation'
                })
              }
            </Typography>
            {isStreaming && (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress sx={{ flexGrow: 1, height: 2 }} />
                <Typography variant="caption" color="primary">
                  {il8n?.t('reactor.client.streaming.active', { defaultValue: 'Streaming...' })}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Tools Grid */}
          {chatState?.tools && chatState.tools.length > 0 ? (
            <Grid container spacing={2}>
              {chatState.tools
                .slice()
                .sort((a, b) => {
                  const nameA = a.function?.name?.toLowerCase() ?? '';
                  const nameB = b.function?.name?.toLowerCase() ?? '';
                  return nameA.localeCompare(nameB);
                })
                .map((tool) => {
                  const toolName = tool.function?.name;
                  const isEnabled = toolName ? enabledTools.has(toolName) : false;

                  return (
                    <Grid item xs={12} sm={6} md={4} key={toolName ?? JSON.stringify(tool)}>
                      <Paper
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          border: 1,
                          borderColor: isEnabled ? 'primary.main' : 'divider',
                          opacity: isEnabled ? 1 : 0.6,
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: 4,
                            borderColor: 'primary.main',
                          }
                        }}
                        onClick={() => {
                          // Handle tool execution
                          if (tool.function?.parameters?.properties) {
                            // TODO: Show tool parameters dialog
                            reactory.log('Tool requires parameters:', tool);
                          } else {
                            // Execute tool immediately
                            onToolExecute({
                              ...tool,
                              args: {},
                              calledBy: 'user',
                              callId: reactory.utils.uuid(),
                            });
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Checkbox
                            checked={isEnabled}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (toolName) {
                                handleToolToggle(toolName);
                              }
                            }}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          <Icon sx={{ mr: 1, color: 'primary.main' }}>
                            {getToolIcon(tool)}
                          </Icon>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {toCamelCaseLabel(toolName ?? 'Tool')}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {tool.function?.description || 'No description available'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          {tool.function?.parameters?.properties && (
                            <Chip
                              label="Requires Parameters"
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          )}
                          {isEnabled && (
                            <Tooltip title={il8n?.t('reactor.client.tools.invoke', { defaultValue: `Execute ${toCamelCaseLabel(toolName)} tool` })}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Implement manual tool invocation
                                  reactory.log('Manual tool invocation:', toolName);
                                }}
                                disabled={!isEnabled}
                                sx={{ ml: 'auto' }}
                              >
                                <Material.MaterialIcons.PlayArrow />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
            </Grid>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {il8n?.t('reactor.client.tools.none', { defaultValue: 'No tools available' })}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Chat History Panel - Slides up from bottom */}
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: chatHistoryPanelOpen ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.3s ease-in-out',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            zIndex: 3,            
            backdropFilter: 'blur(15px) saturate(120%)',
          }}
        >
          {/* Header */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}>
            <IconButton
              onClick={handleChatHistoryPanelClose}
              sx={{ mr: 2 }}
              aria-label="Close chat history"
            >
              <Material.MaterialIcons.ArrowBack />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {il8n?.t('reactor.client.chat.history.title', { defaultValue: 'Chat History' })}
            </Typography>
          </Box>

          {/* Content - Split Layout */}
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Left Side - Chat List */}
            <Box sx={{
              width: '40%',
              borderRight: 1,
              borderColor: 'divider',
              overflow: 'auto',
              p: 2
            }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                {il8n?.t('reactor.client.chat.history.conversations', { defaultValue: 'Conversations' })}
              </Typography>
              {chats && chats.length > 0 ? (
                <List sx={{ p: 0 }}>
                  {chats
                    .slice()
                    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
                    .map((chat) => {
                      const firstUserMsg = Array.isArray(chat.history)
                        ? chat.history.find((item) => item.role === 'user')
                        : null;
                      const persona = getPersona ? getPersona(chat.personaId) : null;
                      const label = firstUserMsg?.content ?? il8n?.t('reactor.client.chat.history.emptyChat', { defaultValue: 'Empty Chat' });

                      return (
                        <ListItem
                          key={chat.id || `chat-${chat.created}`}
                          sx={{
                            cursor: 'pointer',
                            borderRadius: 1,
                            mb: 1,
                            border: chatState?.id === chat.id ? 2 : 1,
                            borderColor: chatState?.id === chat.id ? 'primary.main' : 'divider',
                            bgcolor: chatState?.id === chat.id ? 'primary.light' : 'transparent',
                            '&:hover': {
                              bgcolor: 'action.hover',
                            }
                          }}
                          onClick={() => handleChatSelect(chat)}
                          secondaryAction={
                            <IconButton
                              edge="end"
                              aria-label="Delete chat"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteChat(chat.id);
                              }}
                              size="small"
                              color="error"
                              sx={{
                                opacity: 0.7,
                                '&:hover': {
                                  opacity: 1,
                                }
                              }}
                            >
                              <Material.MaterialIcons.Delete />
                            </IconButton>
                          }
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {label.substring(0, 50)}{label.length > 50 ? '...' : ''}
                                </Typography>
                                {persona && (
                                  <Chip
                                    label={persona.name}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem' }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {new Date(chat.created).toLocaleDateString()}
                              </Typography>
                            }
                          />
                        </ListItem>
                      );
                    })}
                </List>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {il8n?.t('reactor.client.chat.history.empty', { defaultValue: 'No chats found' })}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Right Side - Preview */}
            <Box sx={{
              flex: 1,
              overflow: 'auto',
              p: 2
            }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                {il8n?.t('reactor.client.chat.history.preview', { defaultValue: 'Preview' })}
              </Typography>
              {chatState?.history && chatState.history.length > 0 ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {il8n?.t('reactor.client.chat.history.messages', { defaultValue: 'Messages' })}: {chatState.history.length}
                  </Typography>
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {chatState.history.slice(-5).map((message, index) => (
                      <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          {message.role === 'user' ? 'You' : 'Assistant'}
                        </Typography>
                        <Typography variant="body2">
                          {typeof message.content === 'string'
                            ? message.content.substring(0, 100) + (message.content.length > 100 ? '...' : '')
                            : 'Message content not available'
                          }
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {il8n?.t('reactor.client.chat.history.noPreview', { defaultValue: 'No messages to preview' })}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Files Panel */}
        <FilesPanel
          open={filesPanelOpen}
          onClose={handleFilesPanelClose}
          reactory={reactory}
          chatState={chatState}
          selectedPersona={selectedPersona}
          onFileUpload={uploadFile}
          il8n={il8n}
        />

        {/* Recording Audio Bar - Slides up from bottom */}
        <Paper
          elevation={0}
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            transform: recordingPanelOpen ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.3s ease-in-out',
            background: `linear-gradient(135deg, 
              ${themeColors.primary}20 0%, 
              ${themeColors.secondary}20 100%)`,
            backdropFilter: 'blur(20px) saturate(180%)',
            borderRadius: '16px 16px 0 0',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            opacity: 0.95,
          }}
        >
          {/* Recording Content - Compact horizontal layout */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            px: 3
          }}>
            {/* Close Button */}
            <IconButton
              onClick={handleRecordingPanelClose}
              sx={{
                color: 'white',
                opacity: 0.8,
                '&:hover': {
                  opacity: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
              size="small"
              aria-label="Close recording"
            >
              <Material.MaterialIcons.Close />
            </IconButton>

            {/* Recording Mic Icon with Pulse Effect */}
            <Box sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {/* Pulse Circles */}
              <Box sx={{
                position: 'absolute',
                width: 60,
                height: 60,
                borderRadius: '50%',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': {
                    transform: 'scale(0.8)',
                    opacity: 0.7,
                  },
                  '50%': {
                    transform: 'scale(1.1)',
                    opacity: 0.3,
                  },
                  '100%': {
                    transform: 'scale(1.3)',
                    opacity: 0,
                  },
                },
              }} />

              {/* Main Mic Button */}
              <IconButton
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                    transform: 'scale(1.05)',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
                onClick={() => {
                  // TODO: Start/stop recording logic
                  reactory.log('Recording button clicked');
                }}
              >
                <Material.MaterialIcons.Mic sx={{ fontSize: 24 }} />
              </IconButton>
            </Box>

            {/* Recording Status Text */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'white',
                  fontWeight: 'bold',
                  mb: 0.5
                }}
              >
                {il8n?.t('reactor.client.recording.listening', { defaultValue: 'Listening...' })}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.75rem'
                }}
              >
                {il8n?.t('reactor.client.recording.tip.compact', { defaultValue: 'Tap mic to stop' })}
              </Typography>
            </Box>

            {/* Optional: Recording Duration */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              ml: 'auto'
            }}>
              <Box sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#ff4444',
                animation: 'blink 1s infinite',
                '@keyframes blink': {
                  '0%, 50%': { opacity: 1 },
                  '51%, 100%': { opacity: 0.3 },
                },
              }} />
              <Typography
                variant="caption"
                sx={{
                  color: 'white',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}
              >
                00:00
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Persona FAB Button - Left Side */}
      <Fab
        color="primary"
        size="small"
        onClick={handlePersonaPanelToggle}
        sx={{
          position: 'absolute',
          bottom: personaPanelOpen || toolsPanelOpen || chatHistoryPanelOpen || recordingPanelOpen ? 68 : 80,
          right: personaPanelOpen || toolsPanelOpen || chatHistoryPanelOpen || recordingPanelOpen ? 4 : 8,
          zIndex: 1000,
          width: personaPanelOpen || toolsPanelOpen || chatHistoryPanelOpen || recordingPanelOpen ? 40 : 48,
          height: personaPanelOpen || toolsPanelOpen || chatHistoryPanelOpen || recordingPanelOpen ? 40 : 48,
          transition: 'all 0.3s ease-in-out',
        }}
        aria-label={il8n?.t('reactor.client.persona.select', { defaultValue: 'Select persona' })}
      >
        <Avatar
          src={selectedPersona?.avatar}
          alt={selectedPersona?.name}
          sx={{
            width: personaPanelOpen || toolsPanelOpen || chatHistoryPanelOpen || recordingPanelOpen ? 28 : 32,
            height: personaPanelOpen || toolsPanelOpen || chatHistoryPanelOpen || recordingPanelOpen ? 28 : 32,
            transition: 'all 0.3s ease-in-out',
          }}
        />
      </Fab>
      {/* Token Pressure Progress Bar - Moved to top */}
      {chatState?.tokenPressure !== undefined && !busy && (
        <LinearProgress
          variant="determinate"
          value={(chatState.tokenPressure || 0) * 100}
          color={getTokenPressureColor(chatState.tokenPressure || 0)}
          sx={{
            height: 3,
            borderRadius: 0,
            mb: 1,
            '& .MuiLinearProgress-bar': {
              transition: 'transform 0.3s ease-in-out',
            },
          }}
        />
      )}

      {busy && (
        <LinearProgress
          variant="indeterminate"
          color="primary"
          sx={{
            height: 3,
            borderRadius: 0,
            mb: 1,
            '& .MuiLinearProgress-bar': {
              transition: 'transform 0.3s ease-in-out',
            },
          }}
        />
      )}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={busy}
        placeholder="Ask me anything..."
        onRecordingToggle={handleRecordingPanelToggle}
        onToolsToggle={handleToolsPanelToggle}
        onHistoryToggle={handleChatHistoryPanelToggle}
        onFilesToggle={handleFilesPanelToggle}
        onFileUpload={React.useCallback(async (file: File) => {
          // Let uploadFile handle session initialization if needed
          if (uploadFile) {
            await uploadFile(file, chatState?.id || '');
          }
        }, [uploadFile, chatState?.id])}
      />
    </Box>
  );
}