import { useReactory } from "@reactory/client-core/api";
import usePersonas from './hooks/usePersonas';
import useChatFactory from './hooks/useChatFactory';
import useSessionLogger from './hooks/useSessionLogger';
// Streaming is now handled via useChatFactory with protocol 'sse'
import ChatList from './hooks/useScrollToBottom';
import useMacros from './hooks/useMacros';
import { useProviders } from './hooks/useProviders';
import { useEffect } from 'react';

import {
  IAIPersona,
  UXChatMessage,
  MacroToolDefinition,
  ToolApprovalMode,
  ChatState,
  TodoList,
  SidePanelState,
  TODOS_VAR_KEY,
} from './types';
import PersonaSelectionPanel from './components/PersonaSelectionPanel';
import ToolsPanel from './components/ToolsPanel';
import ChatHistoryPanel from './components/ChatHistoryPanel';
import ChatInput from './components/ChatInput';
import FilesPanel from './components/FilesPanel/FilesPanel';
import FileExplorerSidebar, { DockSide } from './components/FileExplorerSidebar/FileExplorerSidebar';
import TodosPanel from './components/TodosPanel';
import ToolIterationLimitBanner from './components/ToolIterationLimitBanner';
import NetworkStatusIndicator from './components/NetworkStatusIndicator';
import DebugPanel from './components/DebugPanel';
import SidePanel from './components/SidePanel';
import { useNavigate, useLocation } from 'react-router-dom';
import RecordingAudioBar from "./components/RecordingAudioBar";
import { RadialFab } from '@reactory/client-core/components/shared/RadialFab';
import useSpeechServices from './hooks/useSpeechServices';
import useSidePanel from './hooks/useSidePanel';

export default (props) => {
  const { formData } = props;
  const reactory = useReactory();
  const il8n = reactory.i18n;
  const user = reactory.getUser()?.loggedIn?.user;
    
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

  const {
    providers,
    providerAuthStatuses,
    saveProviderAuth,
    removeProviderAuth,
    getModelById,
  } = useProviders();

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
  const [streamingEnabled, setStreamingEnabled] = useState<boolean>(true);

  // Client logging state — persisted to localStorage
  const [clientLoggingEnabled, setClientLoggingEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('reactorChat.clientLogging') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleClientLogging = useCallback((enabled: boolean) => {
    setClientLoggingEnabled(enabled);
    try {
      localStorage.setItem('reactorChat.clientLogging', String(enabled));
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Session cache: preserves chat state per persona so switching back restores the session
  const sessionCache = React.useRef<Map<string, {
    chatState: ChatState;
    isInitialized: boolean;
    sidePanelState?: SidePanelState;
  }>>(new Map());

  // Track the previous session for context sharing when starting a new session with a different agent
  const previousSessionRef = React.useRef<{
    sessionId: string;
    personaId: string;
  } | null>(null);

  // Look up cached session when persona changes
  const cachedSession = React.useMemo(() => {
    if (selectedPersona?.id) {
      return sessionCache.current.get(selectedPersona.id) || undefined;
    }
    return undefined;
  }, [selectedPersona?.id]);

  // Track the active session ID for the session logger — state so changes trigger re-render
  const [activeSessionId, setActiveSessionId] = React.useState<string | undefined>(cachedSession?.chatState?.id);

  // Session logger — sends client logs to the server's ChatSessionLogger
  // Instantiated before chatFactory so it can be passed in.
  const sessionLogger = useSessionLogger(reactory, {
    enabled: clientLoggingEnabled && reactory.isDevelopmentMode(),
    chatSessionId: activeSessionId,
  });

  // Non-streaming chat factory
  const chatFactory = useChatFactory({
    reactory,
    persona: selectedPersona,
    protocol: streamingEnabled ? 'sse' : 'graphql',
    existingSession: cachedSession,
    contextFromSessionId: previousSessionRef.current?.sessionId,
    sessionLogger,
  });


  const {
    chatState,
    busy,
    sendMessage,
    sendAudio,
    uploadFile,
    pinUserFileForChat,
    unpinUserFileForChat,
    pinFolderForChat,
    unpinFolderForChat,
    newChat,
    loadChat,
    listChats,
    setToolApprovalMode,
    chats,
    setChats,
    deleteChat,
    isInitialized,
    isStreaming = false,
    currentStreamingMessage = '',
    setChatState,
    modelOverride,
    setModelOverride,
    setMaxToolIterations,
    continueToolExecution,
    toolIterationLimitInfo,
    clearToolIterationLimitInfo,
    networkStatus = 'idle' as const,
    networkError = null,
    reconnectAttempt: networkReconnectAttempt = 0,
    retryConnection,
    dismissNetworkError,
    sseConnected = false,
    sseIsReconnecting = false,
    sseDisconnect = undefined as (() => void) | undefined,
    sseReconnect = undefined as (() => void) | undefined,
  } = {
    ...chatFactory,
    isStreaming: false,
    currentStreamingMessage: '',
  };

  // Keep session ID in sync so useSessionLogger picks it up
  React.useEffect(() => {
    if (chatState?.id && chatState.id !== activeSessionId) {
      setActiveSessionId(chatState.id);
    }
  }, [chatState?.id, activeSessionId]);

  // Side panel for agent-mounted components and forms
  const {
    panelState: sidePanelState,
    setPanelState: setSidePanelState,
    actions: sidePanelActions,
    togglePanel: toggleSidePanel,
  } = useSidePanel();

  // Restore side panel state from session cache when persona changes
  React.useEffect(() => {
    if (selectedPersona?.id) {
      const cached = sessionCache.current.get(selectedPersona.id);
      if (cached?.sidePanelState) {
        setSidePanelState(cached.sidePanelState);
      } else {
        setSidePanelState({ items: [], activeItemId: undefined, isOpen: false });
      }
    }
  }, [selectedPersona?.id, setSidePanelState]);

  // Inject side panel actions into chatState so client macros can access them
  React.useEffect(() => {
    if (chatState && !chatState.sidePanel) {
      setChatState((prev) => ({ ...prev, sidePanel: sidePanelActions }));
    }
  }, [chatState?.sidePanel, sidePanelActions, setChatState]);

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

  // Voice / speech services
  const speech = useSpeechServices({
    reactory,
    personaId: selectedPersona?.id,
    chatSessionId: chatState?.id,
    voice: selectedPersona?.appearance?.voice?.[0],
  });

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
    Checkbox,
    Badge
  } = Material.MaterialCore;

  const {
    Tune,
    Person,
    Chat,
    Description,
    Star,
    History,
    AttachFile,
    Construction,
    FolderOpen,
    Checklist,
    BugReport,
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

      // Filter out assistant messages with no displayable content
      // (e.g. empty continuation responses after tool completion)
      if (msg.role === 'assistant' &&
        (!msg.content || (typeof msg.content === 'string' && msg.content.trim().length === 0)) &&
        (!msg.tool_calls || msg.tool_calls.length === 0) &&
        (!msg.thinking || msg.thinking.trim().length === 0)) {
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
  const [todosPanelOpen, setTodosPanelOpen] = useState<boolean>(false);
  const [debugPanelOpen, setDebugPanelOpen] = useState<boolean>(false);

  // File explorer sidebar — docked inline panel (left or right)
  const [fileExplorerOpen, setFileExplorerOpen] = useState<boolean>(false);
  const [fileExplorerDock, setFileExplorerDock] = useState<DockSide>(() => {
    try {
      const saved = localStorage.getItem('reactorChat.fileExplorerDock');
      return (saved === 'left' || saved === 'right') ? saved : 'right';
    } catch {
      return 'right';
    }
  });

  const handleFileExplorerToggle = useCallback(() => {
    setFileExplorerOpen(prev => !prev);
  }, []);

  const handleFileExplorerClose = useCallback(() => {
    setFileExplorerOpen(false);
  }, []);

  const handleFileExplorerDockChange = useCallback((dock: DockSide) => {
    setFileExplorerDock(dock);
    try {
      localStorage.setItem('reactorChat.fileExplorerDock', dock);
    } catch {
      // localStorage unavailable — ignore
    }
  }, []);

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

  // Clear panel states when persona or chat session changes
  React.useEffect(() => {
    // Close all panels when persona or session changes
    setPersonaPanelOpen(false);
    setToolsPanelOpen(false);
    setChatHistoryPanelOpen(false);
    setRecordingPanelOpen(false);
    setFilesPanelOpen(false);
    setTodosPanelOpen(false);
    setDebugPanelOpen(false);

    // Clear other session-related states
    setSelectedChats([]);
    setChatMenuAnchor(null);
    setHeaderOpen(false);
  }, [selectedPersona?.id, chatState?.id]);

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

  const autoInitInProgress = React.useRef(false);
  // Track whether the initial chat list has been loaded for the current persona
  const chatListLoadedForPersonaRef = React.useRef<string | null>(null);

  // Load chat list once when persona changes (not on every busy toggle).
  // The chat list is also refreshed when the history panel is opened.
  useEffect(() => {
    if (!selectedPersona?.id) return;

    // Skip if we already loaded the chat list for this persona
    if (chatListLoadedForPersonaRef.current === selectedPersona.id) return;

    // Skip refresh during manual navigation to prevent redundant calls
    if (isManualNavigation.current) {
      return;
    }

    chatListLoadedForPersonaRef.current = selectedPersona.id;

    (async () => {
      reactory.log(`ReactorChat: Loading chat list for persona: ${selectedPersona?.name || 'none'}`);
      const chatList = await listChats({ personaId: selectedPersona?.id });
      setChats(chatList as ChatState[]);

      // Auto-initialize session when we have personaId but no sessionId in URL.
      // This ensures the server knows about client tools from the start.
      // Check after chats load so we can detect empty sessions to resume.
      if (
        selectedPersona?.id &&
        !queryParams.sessionId &&
        !isInitialized &&
        !autoInitInProgress.current
      ) {
        autoInitInProgress.current = true;
        try {
          // Check if the most recent chat for this persona is empty (no user messages).
          // If so, resume it instead of creating a new session.
          if (chatList && chatList.length > 0) {
            const mostRecentChat = chatList[0]; // chats are sorted most-recent first
            const hasUserMessages = mostRecentChat.history?.some(
              (msg: any) => msg.role === 'user'
            );

            if (!hasUserMessages && mostRecentChat.id) {
              reactory.log(`ReactorChat: Resuming empty session ${mostRecentChat.id}`);
              isManualNavigation.current = true;
              navigate({
                pathname: location.pathname,
                search: `?sessionId=${mostRecentChat.id}&personaId=${selectedPersona.id}`,
              });
              // Explicitly load the session so tools/macros are populated from the server.
              // The loadChat useEffect won't fire because isManualNavigation is set.
              await loadChat(mostRecentChat.id);
              setTimeout(() => { isManualNavigation.current = false; }, 500);
              return;
            }
          }

          // No empty session to resume — create a new one
          reactory.log(`ReactorChat: Auto-initializing new session for persona ${selectedPersona.name}`);
          const sessionId = await newChat();
          if (sessionId) {
            isManualNavigation.current = true;
            navigate({
              pathname: location.pathname,
              search: `?sessionId=${sessionId}&personaId=${selectedPersona.id}`,
            });
            // Explicitly load the full session from server so tools/macros are
            // guaranteed to be in chatState. initializeChat's setChatState may
            // not include tools if the SSE response's chatState was sparse.
            await loadChat(sessionId);
            setTimeout(() => { isManualNavigation.current = false; }, 500);
          }
        } catch (error) {
          reactory.error('ReactorChat: Auto-initialization failed', error);
        } finally {
          autoInitInProgress.current = false;
        }
      }
    })();
  }, [selectedPersona?.id, listChats, setChats]);

  const handleHeaderToggle = useCallback(() => setHeaderOpen((open) => !open), []);

  const handleChatMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => setChatMenuAnchor(event.currentTarget), []);
  const handleChatMenuClose = useCallback((cb?: () => void) => {
    setChatMenuAnchor(null);
    if (cb) {
      cb();
    }
  }, []);

  const handleChatSelect = useCallback((chat) => {
    sessionLogger?.info(`Chat selected: ${chat.id}`, { chatId: chat.id, previousChatId: chatState?.id }, 'ReactorChat');
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
    setTodosPanelOpen(false);
    setDebugPanelOpen(false);
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
    setTodosPanelOpen(false);
    setDebugPanelOpen(false);
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
        sessionLogger?.info(`Tool disabled: ${toolName}`, { toolName }, 'ReactorChat');
      } else {
        newSet.add(toolName);
        sessionLogger?.info(`Tool enabled: ${toolName}`, { toolName }, 'ReactorChat');
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
    setTodosPanelOpen(false);
    setDebugPanelOpen(false);
    // Then toggle chat history panel
    const willOpen = !chatHistoryPanelOpen;
    setChatHistoryPanelOpen(willOpen);
    // Refresh the chat list when opening the history panel
    if (willOpen) {
      listChats({ personaId: selectedPersona?.id }).then((chatList) => {
        setChats(chatList as ChatState[]);
      });
    }
  }, [chatHistoryPanelOpen, listChats, selectedPersona?.id, setChats]);

  const handleChatHistoryPanelClose = useCallback(() => {
    setChatHistoryPanelOpen(false);
  }, []);

  const handleRecordingPanelToggle = useCallback(() => {
    // Close other panels first
    setPersonaPanelOpen(false);
    setToolsPanelOpen(false);
    setChatHistoryPanelOpen(false);
    setFilesPanelOpen(false);
    setTodosPanelOpen(false);
    setDebugPanelOpen(false);
    // Then toggle recording panel
    setRecordingPanelOpen(!recordingPanelOpen);
  }, [recordingPanelOpen]);

  const handleRecordingPanelClose = useCallback(() => {
    setRecordingPanelOpen(false);
  }, []);

  // Voice mode toggle — starts or ends a voice session
  const handleVoiceModeToggle = useCallback(async () => {
    if (!selectedPersona?.id) return;
    sessionLogger?.info('Voice mode toggled', { personaId: selectedPersona.id, chatSessionId: chatState?.id }, 'ReactorChat');
    await speech.toggleVoiceMode(selectedPersona.id, chatState?.id);
  }, [selectedPersona?.id, chatState?.id, speech]);

  // Called when a recording finishes — sends audio through voice pipeline or as a message
  const handleVoiceRecordingComplete = useCallback(async (audioBlob: Blob) => {
    if (!speech.state.voiceModeActive) {
      if (chatState?.id) {
        await sendAudio(audioBlob, chatState.id);
      }
      return;
    }

    // Add a user "audio message" placeholder to the chat history
    setChatState((prevState) => ({
      ...prevState,
      history: [...prevState.history, {
        id: reactory.utils.uuid(),
        role: 'user',
        content: '🎤 Voice message',
        timestamp: new Date(),
        sessionId: chatState?.id,
      } as UXChatMessage],
    }));

    await speech.sendVoiceMessage(audioBlob, (aiResponseText) => {
      // Add the AI's text response to the chat history
      // (TTS playback is handled automatically by useSpeechServices)
      if (aiResponseText) {
        setChatState((prevState) => ({
          ...prevState,
          history: [...prevState.history, {
            id: reactory.utils.uuid(),
            role: 'assistant',
            content: aiResponseText,
            timestamp: new Date(),
            sessionId: chatState?.id,
          } as UXChatMessage],
        }));
      }
    });
  }, [speech, chatState?.id, setChatState, reactory, sendAudio]);

  const handleFilesPanelToggle = useCallback(() => {
    // Close other panels first
    setPersonaPanelOpen(false);
    setToolsPanelOpen(false);
    setChatHistoryPanelOpen(false);
    setRecordingPanelOpen(false);
    setTodosPanelOpen(false);
    setDebugPanelOpen(false);
    // Then toggle files panel
    setFilesPanelOpen(!filesPanelOpen);
  }, [filesPanelOpen]);

  const handleFilesPanelClose = useCallback(() => {
    setFilesPanelOpen(false);
  }, []);

  const handleTodosPanelToggle = useCallback(() => {
    setPersonaPanelOpen(false);
    setToolsPanelOpen(false);
    setChatHistoryPanelOpen(false);
    setRecordingPanelOpen(false);
    setFilesPanelOpen(false);
    setDebugPanelOpen(false);
    setTodosPanelOpen(!todosPanelOpen);
  }, [todosPanelOpen]);

  const handleTodosPanelClose = useCallback(() => {
    setTodosPanelOpen(false);
  }, []);

  const handleDebugPanelToggle = useCallback(() => {
    setPersonaPanelOpen(false);
    setToolsPanelOpen(false);
    setChatHistoryPanelOpen(false);
    setRecordingPanelOpen(false);
    setFilesPanelOpen(false);
    setTodosPanelOpen(false);
    setDebugPanelOpen(!debugPanelOpen);
  }, [debugPanelOpen]);

  const handleDebugPanelClose = useCallback(() => {
    setDebugPanelOpen(false);
  }, []);

  const handleSidePanelToggle = useCallback(() => {
    toggleSidePanel();
  }, [toggleSidePanel]);

  const handleSidePanelClose = useCallback(() => {
    setSidePanelState((prev) => ({ ...prev, isOpen: false }));
  }, [setSidePanelState]);

  const handleSidePanelRemoveItem = useCallback((id: string) => {
    sidePanelActions.removeItem(id);
  }, [sidePanelActions]);

  const handleSidePanelSelectItem = useCallback((id: string) => {
    sidePanelActions.setActiveItem(id);
  }, [sidePanelActions]);

  

  const handleUpdateSystemPrompt = useCallback(async (newPrompt: string) => {
    if (chatState?.id) {
      try {
        //@ts-ignore
        await chatFactory.patchSystemPrompt(chatState.id, newPrompt);
      } catch (err) {
        reactory.log('Failed to patch system prompt on server', { err }, 'error');
      }
    }
    setChatState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        persona: {
          ...prev.persona,
          persona: newPrompt
        }
      };
    });
  }, [setChatState, chatState?.id, chatFactory]);


  const handleRefreshChatVars = useCallback(async () => {
    if (!chatState?.id) return;
    try {
      const response = await reactory.graphqlQuery<
        { ReactorConversation: { vars?: Record<string, unknown> } | { code: string; message: string } },
        { id: string }
      >(`
        query ReactorConversation($id: String!) {
          ReactorConversation(id: $id) {
            ... on ReactorChatState {
              id
              vars
              tokenCount
              maxTokens
              tokenPressure
              toolApprovalMode
            }
            ... on ReactorErrorResponse {
              code
              message
            }
          }
        }
      `, { id: chatState.id });

      const result = response?.data?.ReactorConversation;
      if (result && 'vars' in result) {
        setChatState(prev => ({
          ...prev,
          ...result,
        }));
      }
    } catch (err) {
      reactory.log(`Failed to refresh chat vars: ${err}`, {}, 'warning');
    }
  }, [chatState?.id, reactory, setChatState]);

  // Function to refresh chat state to update file count badge
  const handleRefreshChatState = useCallback(async () => {
    if (chatState?.id) {
      try {
        // Refresh the chat state to get updated file information
        const response = await reactory.graphqlQuery<{
          ReactorConversation: {
            id: string;
            files?: Reactory.Models.IReactoryFile[];
          } | {
            code: string;
            message: string;
          }
        }, { id: string }>(`
          query ReactorConversation($id: String!) {
            ReactorConversation(id: $id) {
              ... on ReactorChatState {
                id
                files {
                  id
                  filename
                  mimetype
                  size
                  path
                  created
                  link
                  alias
                }
              }
              ... on ReactorErrorResponse {
                code
                message
              }
            }
          }
        `, { id: chatState.id });

        if (response?.data?.ReactorConversation && !('code' in response.data.ReactorConversation)) {
          const conversation = response.data.ReactorConversation;
          // Update the chat state with the new file information
          setChatState(prev => ({
            ...prev,
            files: conversation.files || []
          }));
        }
      } catch (error) {
        reactory.error('Failed to refresh chat state', error);
      }
    }
  }, [chatState?.id, reactory]);

  const handleInitializeChat = useCallback(async () => {
    if (!chatState?.id && selectedPersona) {
      reactory.log('Initializing new chat session for file operations');
      await newChat();
      return true;
    }
    return false;
  }, [chatState?.id, selectedPersona, newChat, reactory]);

  const handlePersonaSelect = useCallback((persona: Partial<IAIPersona>) => {
    // Save current session to cache before switching
    if (selectedPersona?.id && chatState?.id) {
      previousSessionRef.current = {
        sessionId: chatState.id,
        personaId: selectedPersona.id,
      };
      sessionCache.current.set(selectedPersona.id, {
        chatState: { ...chatState },
        isInitialized: true,
        sidePanelState: { ...sidePanelState },
      });
    }

    selectPersona(persona.id);
    setPersonaPanelOpen(false);

    // Navigate to current location with only personaId parameter
    const searchQuery = `?personaId=${persona.id}`;
    navigate({
      pathname: location.pathname,
      search: searchQuery
    });
  }, [selectPersona, navigate, location.pathname, selectedPersona?.id, chatState]);

  const handleNewChat = useCallback(async () => {
    // Create a new chat with the existing persona
    if (selectedPersona) {
      reactory.log(`Creating new chat with persona: ${selectedPersona.name}`);
      const sessionId = await newChat();
      // Navigate with both sessionId and personaId so the server
      // is immediately aware of client tools
      const searchQuery = sessionId
        ? `?sessionId=${sessionId}&personaId=${selectedPersona.id}`
        : `?personaId=${selectedPersona.id}`;
      navigate({
        pathname: location.pathname,
        search: searchQuery,
      });
      // Reload the full session from the server so tools/macros are in chatState.
      // initializeChat may not fully populate them from the SSE response alone.
      if (sessionId) {
        await loadChat(sessionId);
      }
    }
  }, [selectedPersona, newChat, reactory, navigate, location.pathname, loadChat]);

  const handleCannedPrompts = useCallback(() => {
    // TODO: Implement canned prompts logic
    reactory.log('Canned prompts feature - to be implemented');
  }, [reactory]);

  const handleFavoritePersona = useCallback(() => {
    // TODO: Implement favorite persona logic
    reactory.log(`Favorite persona: ${selectedPersona?.name} - to be implemented`);
  }, [selectedPersona, reactory]);

  const [pendingImages, setPendingImages] = useState<string[]>([]);

  const supportsImages = useMemo(() => {
    const activeModelId = modelOverride?.modelId || chatState?.modelId || selectedPersona?.modelId;
    if (!activeModelId) return false;
    const model = getModelById(activeModelId);
    return model?.supportedMediaTypes?.includes('image') ?? false;
  }, [modelOverride?.modelId, chatState?.modelId, selectedPersona?.modelId, getModelById]);

  const handleSendMessage = useCallback((message: string, images?: string[]) => {
    sendMessage(message, chatState?.id, images);
    setPendingImages([]);
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

  // Count total todo items across all lists for the badge
  const todoCount = useMemo(() => {
    if (!chatState?.vars?.[TODOS_VAR_KEY]) return 0;
    const record = chatState.vars[TODOS_VAR_KEY] as Record<string, TodoList>;
    return Object.values(record).reduce((sum, list) => sum + list.items.length, 0);
  }, [chatState?.vars]);

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

  // SpeedDial actions for persona and chat tools
  const personaSpeedDialActions = useMemo(() => [   
    {
      key: 'newChat',
      icon: <Chat />,
      title: il8n?.t('reactor.client.persona.newChat', { defaultValue: 'New Chat' }),
      clickHandler: handleNewChat,
    },
    {
      key: 'files',
      icon: (
        <Badge badgeContent={chatState?.files?.length || 0} color="primary">
          <AttachFile />
        </Badge>
      ),
      title: il8n?.t('reactor.client.chat.openfiles', { defaultValue: 'Open files panel' }),
      clickHandler: handleFilesPanelToggle,
    },
    {
      key: 'tools',
      icon: (
        <Badge badgeContent={enabledTools.size} color="primary">
          <Construction />
        </Badge>
      ),
      title: il8n?.t('reactor.client.chat.opentools', { defaultValue: 'Open tools menu' }),
      clickHandler: handleToolsPanelToggle,
    },
    // {
    //   key: 'cannedPrompts',
    //   icon: <Description />,
    //   title: il8n?.t('reactor.client.persona.cannedPrompts', { defaultValue: 'Canned Prompts' }),
    //   clickHandler: handleCannedPrompts,
    // },
    // {
    //   key: 'favorite',
    //   icon: <Star />,
    //   title: il8n?.t('reactor.client.persona.favorite', { defaultValue: 'Favorite' }),
    //   clickHandler: handleFavoritePersona,
    // },
    {
      key: 'chatHistory',
      icon: <History />,
      title: il8n?.t('reactor.client.chat.history', { defaultValue: 'Chat History' }),
      clickHandler: handleChatHistoryPanelToggle,
    },
    {
      key: 'fileExplorer',
      icon: (
        <Badge badgeContent={fileExplorerOpen ? undefined : 0} variant="dot" color="primary" invisible={!fileExplorerOpen}>
          <FolderOpen />
        </Badge>
      ),
      title: il8n?.t('reactor.client.fileExplorer.toggle', { defaultValue: 'My Files' }),
      clickHandler: handleFileExplorerToggle,
    },
    {
      key: 'todos',
      icon: (
        <Badge badgeContent={todoCount} color="primary">
          <Checklist />
        </Badge>
      ),
      title: il8n?.t('reactor.client.chat.todos', { defaultValue: 'Todo Lists' }),
      clickHandler: handleTodosPanelToggle,
    },
    ...(sidePanelState.items.length > 0 ? [{
      key: 'sidePanel',
      icon: (
        <Badge badgeContent={sidePanelState.items.length} color="primary">
          <Icon>dashboard_customize</Icon>
        </Badge>
      ),
      title: il8n?.t('reactor.client.chat.sidePanel', { defaultValue: 'Side Panel' }),
      clickHandler: handleSidePanelToggle,
    }] : []),
    ...(reactory.isDevelopmentMode() ? [{
      key: 'debug',
      icon: <BugReport />,
      title: il8n?.t('reactor.client.chat.debug', { defaultValue: 'Debug Inspector' }),
      clickHandler: handleDebugPanelToggle,
    }] : []),
  ], [chatState, enabledTools, fileExplorerOpen, todoCount, sidePanelState.items.length, Person, Chat, Description, Star, History, AttachFile, Construction, FolderOpen, Checklist, BugReport, il8n, handlePersonaPanelToggle, handleNewChat, handleCannedPrompts, handleFavoritePersona, handleChatHistoryPanelToggle, handleFilesPanelToggle, handleToolsPanelToggle, handleFileExplorerToggle, handleTodosPanelToggle, handleSidePanelToggle, handleDebugPanelToggle, reactory]);

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
      {/* Horizontal row: optional left dock + chat area + optional right dock */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flex: 1,
          minHeight: 0,
          marginBottom: 1,
          overflow: 'hidden',
        }}
      >
        {/* Left-docked file explorer */}
        {fileExplorerOpen && fileExplorerDock === 'left' && !isNarrowScreen && (
          <FileExplorerSidebar
            open={fileExplorerOpen}
            dock={fileExplorerDock}
            onDockChange={handleFileExplorerDockChange}
            onClose={handleFileExplorerClose}
            reactory={reactory}
            chatState={chatState}
            onPinFile={pinUserFileForChat}
            onUnpinFile={unpinUserFileForChat}
            onPinFolder={pinFolderForChat}
            onUnpinFolder={unpinFolderForChat}
            il8n={il8n}
          />
        )}

        {/* Main chat column */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {/* Minimized attached-files chip strip — visible when file explorer sidebar is open */}
          {fileExplorerOpen && !isNarrowScreen && (
            <FilesPanel
              open={true}
              onClose={handleFilesPanelClose}
              reactory={reactory}
              chatState={chatState}
              selectedPersona={selectedPersona}
              onFileUpload={uploadFile}
              onInitializeChat={handleInitializeChat}
              onRefreshChatState={handleRefreshChatState}
              il8n={il8n}
              minimized={true}
            />
          )}

          {/* Background-patterned chat container */}
          <Box
            sx={{
              position: 'relative',
              flex: 1,
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
                  if (message.content) {
                    sendMessage(message.content);
                  }
                }, [sendMessage])}
                onRateMessage={React.useCallback((message, rating) => {
                  reactory.log(`Message rated: ${rating}`, { message });
                }, [reactory])}
                onCopyMessage={React.useCallback((message) => {
                  if (message.content && navigator.clipboard) {
                    navigator.clipboard.writeText(message.content).then(() => {
                      reactory.log('Message copied to clipboard');
                    }).catch((err) => {
                      reactory.error('Failed to copy message', err);
                    });
                  }
                }, [reactory])}
                onDismissError={React.useCallback((message) => {
                  setChatState((prevState) => ({
                    ...prevState,
                    history: prevState.history.filter((msg) => msg.id !== message.id),
                  }));
                }, [setChatState])}
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
              modelOverride={modelOverride}
              onModelChange={setModelOverride}
              personaModelId={selectedPersona?.modelId}
              personaProviderId={selectedPersona?.providerId}
              providers={providers}
              providerAuthStatuses={providerAuthStatuses}
              onProviderAuthSave={saveProviderAuth}
              onProviderAuthRemove={removeProviderAuth}
              onMaxToolIterationsChange={setMaxToolIterations}
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

            {/* Files Panel (overlay, only when not using docked explorer) */}
            <FilesPanel
              open={filesPanelOpen}
              onClose={handleFilesPanelClose}
              reactory={reactory}
              chatState={chatState}
              selectedPersona={selectedPersona}
              onFileUpload={uploadFile}
              onInitializeChat={handleInitializeChat}
              onRefreshChatState={handleRefreshChatState}
              il8n={il8n}
            />

            {/* Todos Panel - Slides up from bottom */}
            <TodosPanel
              open={todosPanelOpen}
              onClose={handleTodosPanelClose}
              chatState={chatState}
              onRefreshVars={handleRefreshChatVars}
              Material={Material}
              il8n={il8n}
            />

            {/* Debug Panel - Slides up from bottom (dev mode only) */}
            {reactory.isDevelopmentMode() && (
              <DebugPanel
                modelOverride={modelOverride}
                open={debugPanelOpen}
                onClose={handleDebugPanelClose}
                chatState={chatState}
                onRefreshVars={handleRefreshChatVars}
                Material={Material}
                il8n={il8n}
                sseConnected={sseConnected}
                sseIsReconnecting={sseIsReconnecting}
                isStreaming={isStreaming}
                onSseDisconnect={sseDisconnect}
                onSseReconnect={sseReconnect}
                clientLoggingEnabled={clientLoggingEnabled}
                onToggleClientLogging={handleToggleClientLogging}
                sessionLogger={sessionLogger}
              />
            )}

            {/* Recording Audio Bar - Slides up from bottom */}
            <RecordingAudioBar
              open={recordingPanelOpen}
              onClose={handleRecordingPanelClose}
              il8n={il8n}
              reactory={reactory}
              voiceModeActive={speech.state.voiceModeActive}
              voiceProcessing={speech.state.processing}
              voicePlaying={speech.state.playing}
              onStopPlayback={speech.stopPlayback}
              onRecordingComplete={handleVoiceRecordingComplete}
            />

            {/* Network Status Indicator — floating pill chip, visible to all users */}
            {networkStatus !== 'idle' && (
              <NetworkStatusIndicator
                status={networkStatus}
                networkError={networkError}
                reconnectAttempt={networkReconnectAttempt}
                maxAttempts={5}
                onRetry={retryConnection}
                onDismiss={dismissNetworkError}
                Material={Material}
                il8n={il8n}
              />
            )}
          </Box>
        </Box>

        {/* Right-docked file explorer */}
        {fileExplorerOpen && fileExplorerDock === 'right' && !isNarrowScreen && (
          <FileExplorerSidebar
            open={fileExplorerOpen}
            dock={fileExplorerDock}
            onDockChange={handleFileExplorerDockChange}
            onClose={handleFileExplorerClose}
            reactory={reactory}
            chatState={chatState}
            onPinFile={pinUserFileForChat}
            onUnpinFile={unpinUserFileForChat}
            onPinFolder={pinFolderForChat}
            onUnpinFolder={unpinFolderForChat}
            il8n={il8n}
          />
        )}

        {/* Side panel for agent-mounted components/forms */}
        <SidePanel
          open={sidePanelState.isOpen}
          items={sidePanelState.items}
          activeItemId={sidePanelState.activeItemId}
          onClose={handleSidePanelClose}
          onRemoveItem={handleSidePanelRemoveItem}
          onSelectItem={handleSidePanelSelectItem}
          reactory={reactory}
        />
      </Box>

      {/* Mobile drawer version of file explorer */}
      {fileExplorerOpen && isNarrowScreen && (
        <FileExplorerSidebar
          open={fileExplorerOpen}
          dock={fileExplorerDock}
          onDockChange={handleFileExplorerDockChange}
          onClose={handleFileExplorerClose}
          reactory={reactory}
          chatState={chatState}
          onPinFile={pinUserFileForChat}
          onUnpinFile={unpinUserFileForChat}
          onPinFolder={pinFolderForChat}
          onUnpinFolder={unpinFolderForChat}
          il8n={il8n}
        />
      )}

      {/* Persona RadialFab - Bottom Right */}
      <RadialFab
        mainSize="small"
        actions={personaSpeedDialActions.map(action => ({
          icon: action.icon,
          label: action.title,
          onClick: action.clickHandler,
          color: 'primary' as const,
        }))}
        mainIcon={
          <Avatar
            src={selectedPersona?.avatar}
            alt={selectedPersona?.name}
            sx={{
              width: filesPanelOpen || personaPanelOpen || toolsPanelOpen || chatHistoryPanelOpen || recordingPanelOpen || todosPanelOpen || debugPanelOpen ? 28 : 32,
              height: filesPanelOpen || personaPanelOpen || toolsPanelOpen || chatHistoryPanelOpen || recordingPanelOpen || todosPanelOpen || debugPanelOpen ? 28 : 32,
              transition: 'all 0.3s ease-in-out',
            }}
          />
        }
        mainLabel="Persona Actions"
        mainColor={
          chatState?.toolApprovalMode === ToolApprovalMode.AUTO ? 'success' :
          chatState?.toolApprovalMode === ToolApprovalMode.SAFE_AUTO ? 'warning' :
          'primary'
        }
        mainSx={
          chatState?.toolApprovalMode === ToolApprovalMode.PROMPT ? {
            bgcolor: '#ed6c02', '&:hover': { bgcolor: '#e65100' },
          } :
          chatState?.toolApprovalMode === ToolApprovalMode.PLAN ? {
            bgcolor: '#9c27b0', '&:hover': { bgcolor: '#7b1fa2' },
          } :
          undefined
        }
        onMainClick={handlePersonaPanelToggle}
        mainClickLabel="Select Persona"
        position="bottom-right"
        spacing={16}
        radius={65}
        sx={{
          zIndex: 1000,
          transition: 'all 0.3s ease-in-out',
          bottom: personaPanelOpen ||
            toolsPanelOpen ||
            chatHistoryPanelOpen ||
            recordingPanelOpen ||
            filesPanelOpen ||
            todosPanelOpen ||
            debugPanelOpen ? 86 : 94,
          right: 8,
        }}
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

      {toolIterationLimitInfo && (
        <ToolIterationLimitBanner
          iterationsCompleted={toolIterationLimitInfo.iterationsCompleted}
          maxIterations={toolIterationLimitInfo.maxIterations}
          onContinue={(newMax) => continueToolExecution(newMax)}
          onStop={() => clearToolIterationLimitInfo()}
          Material={Material}
          il8n={il8n}
        />
      )}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={busy}
        placeholder="Ask me anything..."
        onRecordingToggle={handleRecordingPanelToggle}
        recordingPanelOpen={recordingPanelOpen}
        voiceModeActive={speech.state.voiceModeActive}
        onVoiceModeToggle={handleVoiceModeToggle}
        onFileUpload={React.useCallback(async (file: File) => {
          // Let uploadFile handle session initialization if needed
          if (uploadFile) {
            await uploadFile(file, chatState?.id || '');
          }
        }, [uploadFile, chatState?.id])}
        chatState={chatState}
        supportsImages={supportsImages}
        pendingImages={pendingImages}
        onPastedImages={React.useCallback((images: string[]) => {
          setPendingImages((prev) => [...prev, ...images]);
        }, [])}
        onRemovePendingImage={React.useCallback((index: number) => {
          setPendingImages((prev) => prev.filter((_, i) => i !== index));
        }, [])}
        toolApprovalMode={chatState?.toolApprovalMode}
        onToolApprovalModeChange={setToolApprovalMode}
      />
    </Box>
  );
}