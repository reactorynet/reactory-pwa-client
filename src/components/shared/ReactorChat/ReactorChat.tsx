import { useReactory } from "@reactory/client-core/api";
import usePersonas from './hooks/usePersonas';
import useChatFactory from './hooks/useChatFactory';
import useScrollToBottom from './hooks/useScrollToBottom';
import {
  IAIPersona,
  ChatMessage,
  IProps
} from './types';


type UXChatMessage = ChatMessage & {
  id: string;
  timestamp: Date;
}

export default (props) => {
  const { formData } = props;
  const reactory = useReactory();
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

  const {
    personas,
    loading: personasLoading,
    error: personasError,
    selectPersona,
    activePersona: selectedPersona
  } = usePersonas(reactory);

  const scrollToBottom = (message: any) => {
    const doScroll = () => {
      const chatContainer = document.querySelector('.chat-container');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }

    if (message.role === 'assistant') {
      // add a delay before scrolling to the bottom
      setTimeout(doScroll, 1000);
    } else {
      doScroll();
    }
  }

  const {
    chatState,
    busy,
    sendMessage,
    newChat,
    listChats
  } = useChatFactory({
    reactory,
    persona: selectedPersona,
    protocol: 'graphql',
    onMessage: (message) => {
      debugger
      // add the message to the chat history
      // @ts-ignore
      const newMessage: UXChatMessage = {
        id: reactory.utils.uuid(),
        content: message.content,
        role: message.role,
        // @ts-ignore
        refusal: message.refusal,
        // @ts-ignore
        annotations: message.annotations,
        // @ts-ignore
        audio: message.audio,
        // @ts-ignore
        tool_calls: message.tool_calls,
        timestamp: new Date(),
      };
      setMessages(prevMessages => [...prevMessages, newMessage]);
    },
    onError: (error) => {
      if (reactory.hasRole(['DEVELOPER']) === true) {
        // create a debug message for the developer in the chat
        const newMessage: UXChatMessage = {
          id: reactory.utils.uuid(),
          content: error.message,
          role: 'system',
          //refusal: null,
          //annotations: [],
          //audio: null,
          //tool_calls: [],
          timestamp: new Date(),
        };
        setMessages(prevMessages => [...prevMessages, newMessage]);      
      } else {
        // create a generic error message for the user
        const newMessage: UXChatMessage = {
          id: reactory.utils.uuid(),
          content: 'An error occurred. Please try again later.',
          role: 'assistant',
          refusal: null,
          annotations: [],
          audio: null,
          tool_calls: [],
          timestamp: new Date(),
        };
        setMessages(prevMessages => [...prevMessages, newMessage]);        
      }
    },
    onToolCall: (tool) => {
      // handle tool calls here. these tools
      // will be specific to the client which is the 
      // browser. Other tools for the persona is 
      // handled on the server side

    },
    onMacroCall: (macro) => {
      // handle macro calls here. these macros
      // will be specific to the client which is the
      // browser. Other macros for the persona is
      // handled on the server side
    }
  });

  const {
    Button,
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
    Edit,
    Send,
    ArrowDropDown,
    SmartToy,
    Person
  } = Material.MaterialIcons;

  const [messages, setMessages] = useState<UXChatMessage[]>([
    { 
      id: reactory.utils.uuid(),
      content: selectedPersona?.defaultGreeting || 'Hello! How can I assist you today?',
      role: 'assistant',
      refusal: null,
      annotations: [],
      audio: null,
      tool_calls: [],
      timestamp: new Date(),
    }
  ]);

  // use effect to check hen the messages length changes
  React.useEffect(() => { 
    scrollToBottom(messages[messages.length - 1]);
  }, [ messages ]);

  const [userInput, setUserInput] = useState<string>('');  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);


  // Handler functions
  const handleModelMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleModelMenuClose = () => {
    setAnchorEl(null);
  };

  const handlePersonaSelect = (persona: Partial<IAIPersona>) => {
    selectPersona(persona.id);
    if (persona.defaultGreeting) {
      const newMessage: UXChatMessage = {
        id: reactory.utils.uuid(),
        content: persona.defaultGreeting,
        role: 'assistant',
        refusal: null,
        annotations: [],
        audio: null,
        tool_calls: [],
        timestamp: new Date()
      };
      setMessages(prevMessages => [...prevMessages, newMessage]);
    }  
    handleModelMenuClose();
  };

  const handleSendMessage = () => {
    if (userInput.trim() === '') return;

    // Add user message
    const newUserMessage: UXChatMessage = {            
      role: 'user',
      name: `${user?.firstName} ${user?.lastName}`,
      content: userInput,
      id: reactory.utils.uuid(),
      timestamp: new Date(),
    };

    setMessages([...messages, newUserMessage]);
    setUserInput('');

    // Send message to the chat factory
    sendMessage(userInput, chatState?.id);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  return (
    <Box sx={{ height: '600px', display: 'flex', flexDirection: 'column', maxWidth: 800, mx: 'auto', p: 2 }}>
      {/* Header with persona selection */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <SmartToy fontSize="large" color="primary" />
          </Grid>
          <Grid item xs>
            <Typography variant="h6">AI Chat Assistant</Typography>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              onClick={handleModelMenuOpen}
              endIcon={<ArrowDropDown />}
            >
              {selectedPersona?.name}
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleModelMenuClose}
            >
              {personas.map((persona) => (
                <MenuItem
                  key={persona.id}
                  onClick={() => handlePersonaSelect(persona)}
                  selected={persona.id === selectedPersona?.id}
                >
                  {persona?.name}
                </MenuItem>
              ))}
            </Menu>
          </Grid>
        </Grid>
      </Paper>

      {/* Chat messages list */}
      <Paper
        elevation={3}
        sx={{
          flexGrow: 1,
          mb: 2,
          overflow: 'auto',
          p: 2
        }}
        style={{
          padding: '0',
          overflow: 'hidden',      
        }}
      >
        {useScrollToBottom({reactory,messages})}
      </Paper>

      {/* Input area */}
      <Paper elevation={3} sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs>
            <TextField
              fullWidth
              placeholder="Type your message here..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              multiline
              maxRows={4}
              variant="outlined"
            />
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              endIcon={<Send />}
              onClick={handleSendMessage}
              disabled={userInput.trim() === ''}
              sx={{ height: '100%' }}
            >
              Send
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}