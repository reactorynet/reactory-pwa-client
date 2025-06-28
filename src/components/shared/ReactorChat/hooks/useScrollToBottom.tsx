import { ChatState, IAIPersona, UXChatMessage } from '../types';
import useContentRender from './useContentRender';

const ChatList = (props: {
  reactory: Reactory.Client.ReactorySDK,
  messages: UXChatMessage[],
  personas?: IAIPersona[],
  selectedPersona?: IAIPersona | null,
  chatState?: ChatState
}) => {

  const { messages, reactory, personas, selectedPersona, chatState } = props;
  const { renderContent } = useContentRender(reactory);

  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);

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
  }, [props.messages]);


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
    if (React.isValidElement(message.component)) {
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

  const getMessageText = (message: UXChatMessage) => {
    if (typeof message.content === 'string' && message.content.trim().length > 0) {
      return message.content;
    }

    if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
      return reactory.i18n.t('reactor.client.chat.callingTools', {
        count: message.tool_calls.length,
        tools: message.tool_calls.map((call) => call.name).join(', '),
        defaultValue: 'Calling {count} tool(s): {tools}'
      });
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
        backgroundColor: background.default,
      }}
    >
      <List className="chat-container">
        {messages.map((message, idx) => (
          <React.Fragment key={idx}>
            <ListItem
              alignItems="flex-start"
              sx={{
                justifyContent: message.role === 'assistant' ? 'flex-start' : 'flex-end',
                mb: 2
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  maxWidth: '95%',
                  backgroundColor: message.role === 'assistant' ? background.default : background.paper,
                }}
              >
                <Grid container spacing={1}>
                  <Grid item>
                    <Avatar 
                      sx={{ bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main' }}
                      aria-label={message.role}
                      src={getMessageAvatar(message, reactory)}>                     
                    </Avatar>
                  </Grid>
                  <Grid item xs>
                    <Typography variant="body1">
                      {renderContent(getMessageText(message))}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {typeof (message as any)?.timestamp === 'string' ?
                        new Date(message.timestamp).toLocaleTimeString() :
                        message.timestamp?.toLocaleTimeString()}
                    </Typography>
                    {idx > 0 && message.role === 'assistant' && <IconButton                    
                      sx={{ fontSize: '1rem' }}                                           
                    >
                      <Icon sx={{ fontSize: '1rem' }}>thumb_up</Icon>
                    </IconButton>}
                    {idx >0 && message.role === 'assistant' && <IconButton                                         
                      sx={{ fontSize: '1rem' }}                                           
                      >
                      <Icon sx={{ fontSize: '1rem' }}>thumb_down</Icon>
                    </IconButton>}
                    {idx >0 && message.role === 'assistant' && <IconButton                                         
                      sx={{ fontSize: '1rem' }}                                           
                      >
                      <Icon sx={{ fontSize: '1rem' }}>content_copy</Icon>
                    </IconButton>}
                  </Grid>
                </Grid>
              </Paper>
            </ListItem>
            {hasComponent(message) && (
              <ListItem
                sx={{
                  justifyContent: 'center',
                  display: 'flex',
                  mb: 2,
                }}
              >
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      maxWidth: '95%',
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: background.paper,
                    }}
                  >
                    {renderComponent(message)}
                  </Paper>
                </Box>
              </ListItem>
            )}
          </React.Fragment>
        ))}
      </List>
    </div>
  );
};

export default ChatList;
