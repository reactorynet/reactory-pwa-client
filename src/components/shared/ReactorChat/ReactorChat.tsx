import { useReactory } from "@reactory/client-core/api";
import usePersonas from './hooks/usePersonas';
import useChatFactory from './hooks/useChatFactory';
import useScrollToBottom from './hooks/useScrollToBottom';
import useMacros from './hooks/useMacros';
import { useEffect, useRef } from 'react';

import {
  IAIPersona,
  ChatMessage,
  IProps,
  UXChatMessage
} from './types';
import { on } from "process";
import ChatHeader from './ChatHeader';

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
    listChats,
    chats,
    setChats,
    deleteChat
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
    },
    onMacroCallError: (error) => { 
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

  const [headerOpen, setHeaderOpen] = useState<boolean>(false);
  const [chatMenuAnchor, setChatMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    (async () => {
      const chatList = await listChats({});
      setChats(chatList);
    })();
  }, [selectedPersona]);

  const handleHeaderToggle = () => setHeaderOpen((open) => !open);

  const handleChatMenuOpen = (event: React.MouseEvent<HTMLElement>) => setChatMenuAnchor(event.currentTarget);
  const handleChatMenuClose = () => setChatMenuAnchor(null);

  const handleChatSelect = (chat) => {
    handleChatMenuClose();
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
      <ChatHeader
        headerOpen={headerOpen}
        handleHeaderToggle={handleHeaderToggle}
        selectedPersona={selectedPersona}
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
      />

      {!headerOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 80,
            right: 0,
            zIndex: 1201,            
            borderRadius: '0 8px 8px 0',
            boxShadow: 2,
          }}
        >
          <IconButton onClick={handleHeaderToggle}>
            <Material.MaterialIcons.ChevronLeft />
          </IconButton>
        </Box>
      )}

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
        {useScrollToBottom({reactory,messages})}
      </Paper>

      <Paper elevation={3} sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs>
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
            />
          </Grid>
          <Grid item>
            <Button
              size="small"
              variant="contained"
              color="primary"              
              onClick={handleSendMessage}
              disabled={userInput.trim() === '' || busy}
              sx={{ height: '100%'}}
            >
              {busy ? (
                <Material.MaterialCore.CircularProgress size={20} sx={{ mr: 1 }} />
              ) : (
                  <Material.MaterialIcons.SendOutlined />                
              )}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}