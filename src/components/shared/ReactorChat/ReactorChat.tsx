import { useReactory } from "@reactory/client-core/api";
import usePersonas from './hooks/usePersonas';
import useChatFactory from './hooks/useChatFactory';
import useScrollToBottom from './hooks/useScrollToBottom';
import useMacros from './hooks/useMacros';
// import useTools from './hooks/useTools';

import {
  IAIPersona,
  ChatMessage,
  IProps,
  UXChatMessage
} from './types';
import { on } from "process";




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

  const onMessage = (message: UXChatMessage) => {
    if (message.content === undefined || message.content === null) return;
    // handle incoming messages here
    const newMessage: UXChatMessage = {
      ...message,
    } as UXChatMessage;

    newMessage.id ??= reactory.utils.uuid();
    newMessage.timestamp ??= new Date();
    newMessage.role ??= 'assistant';

    // setMessages(prevMessages => [...prevMessages, newMessage]);
  }

  const onError = (error: Error) => {     
    
  };
  
  const {
    personas,
    loading: personasLoading,
    error: personasError,
    selectPersona,
    activePersona: selectedPersona
  } = usePersonas({ 
    reactory,
    onMessage,
    onError,
  });

  const scrollToBottom = (message: any) => {
    const doScroll = () => {
      const chatContainer = document.querySelector('.chat-container');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }

    if (message?.role === 'assistant') {
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
  });


  const {
    executeMacro
  } = useMacros({ 
    reactory,
    chatState,
    onMacroCallResult: (result) => {
      // handle macro call result here
      // const newMessage: UXChatMessage = {
      //   id: reactory.utils.uuid(),
      //   content: result.content,
      //   role: 'assistant',
      //   refusal: null,
      //   annotations: [],
      //   audio: null,
      //   tool_calls: [],
      //   timestamp: new Date(),
      // };
      // setMessages(prevMessages => [...prevMessages, newMessage]);
    },
    onMacroCallError: (error) => { 
      // handle macro call error here
      // const newMessage: UXChatMessage = {
      //   id: reactory.utils.uuid(),
      //   content: error.message,
      //   role: 'system',
      //   timestamp: new Date(),
      // };
      // setMessages(prevMessages => [...prevMessages, newMessage]);
    }
  })

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

  
  const [messages, setMessages] = useState<UXChatMessage[]>([]);
  
  // use effect to check hen the messages length changes
  React.useEffect(() => { 
    scrollToBottom(messages[messages.length - 1]);
  }, [ messages ]);

  React.useEffect(() => { 
    if (chatState?.history) {
      const newMessages = chatState.history.map((message: ChatMessage) => ({
        ...message,
        id: reactory.utils.uuid(),
        timestamp: new Date(),
        // @ts-ignore
        role: message.role || 'assistant'
      })) as UXChatMessage[];

      setMessages(newMessages);
    }
  }, [ chatState?.history ]);

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
    handleModelMenuClose();
  };

  const handleSendMessage = () => {
    if (userInput.trim() === '') return;
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
              placeholder="Type your message here or use /@ to execute a macro"
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