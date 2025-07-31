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
  MacroToolDefinition,
  ToolApprovalMode
} from './types';
import { on } from "process";
import ChatHeader from './ChatHeader';
import ChatHistoryDrawer from './ChatHistoryDrawer';
import PersonaCard from './PersonaCard';
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
  const getTokenPressureColor = (pressure: number) => {
    if (pressure <= 0.25) return 'success'; // Green
    if (pressure <= 0.5) return 'warning'; // Yellow
    if (pressure <= 0.75) return 'error'; // Orange (using error color)
    return 'error'; // Red
  };

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
  const [personaPanelOpen, setPersonaPanelOpen] = useState<boolean>(false);
  const [toolsPanelOpen, setToolsPanelOpen] = useState<boolean>(false);
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set());
  const [chatHistoryPanelOpen, setChatHistoryPanelOpen] = useState<boolean>(false);
  const [recordingPanelOpen, setRecordingPanelOpen] = useState<boolean>(false);

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

  const handlePersonaPanelToggle = () => {
    setPersonaPanelOpen(!personaPanelOpen);
  };

  const handlePersonaPanelClose = () => {
    setPersonaPanelOpen(false);
  };

  const handleToolsPanelToggle = () => {
    setToolsPanelOpen(!toolsPanelOpen);
  };

  const handleToolsPanelClose = () => {
    setToolsPanelOpen(false);
  };

  const handleToolToggle = (toolName: string) => {
    setEnabledTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolName)) {
        newSet.delete(toolName);
      } else {
        newSet.add(toolName);
      }
      return newSet;
    });
  };

  const handleChatHistoryPanelToggle = () => {
    setChatHistoryPanelOpen(!chatHistoryPanelOpen);
  };

  const handleChatHistoryPanelClose = () => {
    setChatHistoryPanelOpen(false);
  };

  const handleRecordingPanelToggle = () => {
    setRecordingPanelOpen(!recordingPanelOpen);
  };

  const handleRecordingPanelClose = () => {
    setRecordingPanelOpen(false);
  };

  const handlePersonaSelect = (persona: Partial<IAIPersona>) => {
    selectPersona(persona.id);
    setPersonaPanelOpen(false);
    
    // Navigate to current location with only personaId parameter
    const searchQuery = `?personaId=${persona.id}`;
    navigate({
      pathname: location.pathname,
      search: searchQuery
    });
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

  // Utility function to convert camelCase to readable labels
  const toCamelCaseLabel = (str: string) => {
    if (!str) return '';
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  // Helper function to get tool icon
  const getToolIcon = (tool) => {
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
  };

  return (
    <Box
      sx={{
        height: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '95%',
        mx: 'auto',
        p: 2,
        minHeight: 0,
        position: 'relative',
      }}
    >
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

      {/* Persona FAB Button - Left Side */}
      <Fab
        color="primary"
        size="small"
        onClick={handlePersonaPanelToggle}
        sx={{
          position: 'absolute',
          top: personaPanelOpen || toolsPanelOpen || chatHistoryPanelOpen || recordingPanelOpen ? 8 : 16,
          left: personaPanelOpen || toolsPanelOpen || chatHistoryPanelOpen || recordingPanelOpen ? 8 : 16,
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


      <Box sx={{ position: 'relative', flexGrow: 1, mb: 2, overflow: 'hidden' }}>
        {/* Chat List Panel */}
        <Paper
          elevation={3}
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

        {/* Recording Panel - Slides down from top */}
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: recordingPanelOpen ? 'translateY(0)' : 'translateY(-100%)',
            transition: 'transform 0.3s ease-in-out',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            bgcolor: 'background.paper',
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
              onClick={handleRecordingPanelClose}
              sx={{ mr: 2 }}
              aria-label="Close recording"
            >
              <Material.MaterialIcons.ArrowBack />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {il8n?.t('reactor.client.recording.title', { defaultValue: 'Voice Recording' })}
            </Typography>
          </Box>

          {/* Recording Content */}
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            p: 4
          }}>
            {/* Big Mic Icon with Ripple Effect */}
            <Box sx={{ 
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 120,
              height: 120,
            }}>
              {/* Ripple Circles */}
              <Box sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '2px solid',
                borderColor: 'primary.main',
                opacity: 0.3,
                animation: 'ripple 2s infinite',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: '-10px',
                  left: '-10px',
                  right: '-10px',
                  bottom: '-10px',
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  opacity: 0.2,
                  animation: 'ripple 2s infinite 0.5s',
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: '-20px',
                  left: '-20px',
                  right: '-20px',
                  bottom: '-20px',
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  opacity: 0.1,
                  animation: 'ripple 2s infinite 1s',
                },
                '@keyframes ripple': {
                  '0%': {
                    transform: 'scale(0.8)',
                    opacity: 0.3,
                  },
                  '100%': {
                    transform: 'scale(1.2)',
                    opacity: 0,
                  },
                },
              }} />
              
              {/* Main Mic Icon */}
              <IconButton
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                }}
                onClick={() => {
                  // TODO: Start/stop recording logic
                  reactory.log('Recording button clicked');
                }}
              >
                <Material.MaterialIcons.Mic sx={{ fontSize: 40 }} />
              </IconButton>
            </Box>

            {/* Instructions */}
            <Typography 
              variant="h6" 
              sx={{ 
                mt: 3, 
                textAlign: 'center',
                color: 'text.secondary'
              }}
            >
              {il8n?.t('reactor.client.recording.instructions', { defaultValue: 'Tap the microphone to start recording' })}
            </Typography>
            
            <Typography 
              variant="body2" 
              sx={{ 
                mt: 1, 
                textAlign: 'center',
                color: 'text.secondary',
                opacity: 0.7
              }}
            >
              {il8n?.t('reactor.client.recording.tip', { defaultValue: 'Speak clearly and tap again to stop' })}
            </Typography>
          </Box>
        </Paper>
      </Box>

      <Paper elevation={3} sx={{ p: 2 }}>
        <Grid container spacing={1} columns={4} alignItems="center">
          <Grid item>
            <IconButton
              size="small"
              onClick={handleChatHistoryPanelToggle}
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
              placeholder="Ask me anything..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              multiline
              maxRows={4}
              autoFocus={true}
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
                      onClick={handleRecordingPanelToggle}
                      disabled={busy}
                      sx={{ p: 0.1, fontSize: '1rem', display: 'flex', alignItems: 'center' }}
                    >
                      <Material.MaterialIcons.Mic fontSize="small" />
                    </IconButton>

                    <Tooltip title={il8n?.t('reactor.client.chat.opentools', { defaultValue: 'Open tools menu' })}>
                      <IconButton
                        size="small"
                        color="primary"
                        aria-label={il8n?.t('reactor.client.chat.opentools', { defaultValue: 'Open tools menu' })}
                        title={il8n?.t('reactor.client.chat.opentools', { defaultValue: 'Open tools menu' })}
                        sx={{ p: 0.1, fontSize: '1rem', display: 'flex', alignItems: 'center' }}
                        onClick={handleToolsPanelToggle}
                      >
                        <Icon fontSize="small">construction</Icon>
                      </IconButton>
                    </Tooltip>
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
        </Grid>
      </Paper>
    </Box>
  );
}