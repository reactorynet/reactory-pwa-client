import { useReactory } from "@reactory/client-core/api";
import usePersonas from './hooks/usePersonas';
import useChatFactory from './hooks/useChatFactory';
import useStreamingChatFactory from './hooks/useStreamingChatFactory';
import ChatList from './hooks/useScrollToBottom';
import useMacros from './hooks/useMacros';
import { useEffect } from 'react';

import {
  IAIPersona,
  UXChatMessage,
  MacroToolDefinition,
  ToolApprovalMode,
  ChatState
} from './types';
import PersonaSelectionPanel from './components/PersonaSelectionPanel';
import ToolsPanel from './components/ToolsPanel';
import ChatHistoryPanel from './components/ChatHistoryPanel';
import ChatInput from './components/ChatInput';
import FilesPanel from './components/FilesPanel';
import { useNavigate, useLocation } from 'react-router-dom';
import RecordingAudioBar from "./components/RecordingAudioBar";
import SpeedDialWidget from '../SpeedDialWidget/SpeedDialWidget';

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
    Chat,
    Description,
    Star,
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
    // Close other panels first
    setToolsPanelOpen(false);
    setChatHistoryPanelOpen(false);
    setRecordingPanelOpen(false);
    setFilesPanelOpen(false);
    // Then toggle persona panel
    setPersonaPanelOpen(!personaPanelOpen);
  }, [personaPanelOpen]);

  const handlePersonaPanelClose = useCallback(() => {
    setPersonaPanelOpen(false);
  }, []);

  const handleToolsPanelToggle = useCallback(() => {
    // Close other panels first
    setPersonaPanelOpen(false);
    setChatHistoryPanelOpen(false);
    setRecordingPanelOpen(false);
    setFilesPanelOpen(false);
    // Then toggle tools panel
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
    // Close other panels first
    setPersonaPanelOpen(false);
    setToolsPanelOpen(false);
    setRecordingPanelOpen(false);
    setFilesPanelOpen(false);
    // Then toggle chat history panel
    setChatHistoryPanelOpen(!chatHistoryPanelOpen);
  }, [chatHistoryPanelOpen]);

  const handleChatHistoryPanelClose = useCallback(() => {
    setChatHistoryPanelOpen(false);
  }, []);

  const handleRecordingPanelToggle = useCallback(() => {
    // Close other panels first
    setPersonaPanelOpen(false);
    setToolsPanelOpen(false);
    setChatHistoryPanelOpen(false);
    setFilesPanelOpen(false);
    // Then toggle recording panel
    setRecordingPanelOpen(!recordingPanelOpen);
  }, [recordingPanelOpen]);

  const handleRecordingPanelClose = useCallback(() => {
    setRecordingPanelOpen(false);
  }, []);

  const handleFilesPanelToggle = useCallback(() => {
    // Close other panels first
    setPersonaPanelOpen(false);
    setToolsPanelOpen(false);
    setChatHistoryPanelOpen(false);
    setRecordingPanelOpen(false);
    // Then toggle files panel
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

  const handleNewChat = useCallback(() => {
    // Create a new chat with the existing persona
    if (selectedPersona) {
      reactory.log(`Creating new chat with persona: ${selectedPersona.name}`);
      newChat();
    }
  }, [selectedPersona, newChat, reactory]);

  const handleCannedPrompts = useCallback(() => {
    // TODO: Implement canned prompts logic
    reactory.log('Canned prompts feature - to be implemented');
  }, [reactory]);

  const handleFavoritePersona = useCallback(() => {
    // TODO: Implement favorite persona logic
    reactory.log(`Favorite persona: ${selectedPersona?.name} - to be implemented`);
  }, [selectedPersona, reactory]);

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

  // SpeedDial actions for persona
  const personaSpeedDialActions = useMemo(() => [
    {
      key: 'newChat',
      icon: <Chat />,
      title: il8n?.t('reactor.client.persona.newChat', { defaultValue: 'New Chat' }),
      clickHandler: handleNewChat,
    },
    {
      key: 'cannedPrompts',
      icon: <Description />,
      title: il8n?.t('reactor.client.persona.cannedPrompts', { defaultValue: 'Canned Prompts' }),
      clickHandler: handleCannedPrompts,
    },
    {
      key: 'favorite',
      icon: <Star />,
      title: il8n?.t('reactor.client.persona.favorite', { defaultValue: 'Favorite' }),
      clickHandler: handleFavoritePersona,
    },
  ], [Chat, Description, Star, il8n, handleNewChat, handleCannedPrompts, handleFavoritePersona]);

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
        <PersonaSelectionPanel
          open={personaPanelOpen}
          onClose={handlePersonaPanelClose}
          personas={personas}
          selectedPersona={selectedPersona}
          onPersonaSelect={handlePersonaSelect}
          Material={Material}
          il8n={il8n}
          toCamelCaseLabel={toCamelCaseLabel}
        />

        {/* Tools Panel */}
        <ToolsPanel
          open={toolsPanelOpen}
          onClose={handleToolsPanelClose}
          chatState={chatState}
          streamingEnabled={streamingEnabled}
          isStreaming={isStreaming}
          enabledTools={enabledTools}
          onStreamingToggle={handleStreamingToggle}
          onToolApprovalModeChange={setToolApprovalMode}
          onToolToggle={handleToolToggle}
          onToolExecute={onToolExecute}
          getToolIcon={getToolIcon}
          Material={Material}
          il8n={il8n}
          toCamelCaseLabel={toCamelCaseLabel}
          reactory={reactory}
        />
        {/* Chat History Panel - Slides up from bottom */}
        <ChatHistoryPanel
          open={chatHistoryPanelOpen}
          onClose={handleChatHistoryPanelClose}
          chats={chats}
          chatState={chatState}
          getPersona={getPersona}
          onChatSelect={handleChatSelect}
          onDeleteChat={deleteChat}
          Material={Material}
          il8n={il8n}
        />

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
        <RecordingAudioBar
          open={recordingPanelOpen}
          onClose={handleRecordingPanelClose}
          il8n={il8n}
          reactory={reactory}
        />
      </Box>

      {/* Persona SpeedDial - Bottom Right */}
      <SpeedDialWidget
        actions={personaSpeedDialActions}
        position="bottom-right"
        offsetBottom={
          personaPanelOpen || 
          toolsPanelOpen || 
          chatHistoryPanelOpen || 
          recordingPanelOpen ||
          filesPanelOpen ? 86 : 94}
        offsetRight={8}
        size={'small'}
        elevation={3}
        sx={{
          zIndex: 1000,
          transition: 'all 0.3s ease-in-out',
        }}
        icon={
          <Avatar
            src={selectedPersona?.avatar}
            alt={selectedPersona?.name}
            sx={{
              width: filesPanelOpen || personaPanelOpen || toolsPanelOpen || chatHistoryPanelOpen || recordingPanelOpen ? 28 : 32,
              height: filesPanelOpen || personaPanelOpen || toolsPanelOpen || chatHistoryPanelOpen || recordingPanelOpen ? 28 : 32,
              transition: 'all 0.3s ease-in-out',
            }}
          />
        }
        onClick={handlePersonaPanelToggle}
      />
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
        recordingPanelOpen={recordingPanelOpen}
        toolsPanelOpen={toolsPanelOpen}
        chatHistoryPanelOpen={chatHistoryPanelOpen}
        filesPanelOpen={filesPanelOpen}
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