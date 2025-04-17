import { ChatMessage } from '../types';

const ChatList = (props: {
  reactory: Reactory.Client.ReactorySDK,
  messages: ChatMessage[]
}) => {

  const { messages, reactory } = props;

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

  return (
    <div
      ref={listRef}
      style={{
        height: '400px',
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
          <ListItem
            key={idx}
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
                maxWidth: '70%',
                backgroundColor: message.role === 'assistant' ? background.default : background.paper,
              }}
            >
              <Grid container spacing={1}>
                <Grid item>
                  <Avatar sx={{ bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main' }}>
                    {message.role === 'user' ? <Person /> : <SmartToy />}
                  </Avatar>
                </Grid>
                <Grid item xs>
                  <Typography variant="body1">
                    {message.content}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {(message as any)?.timestamp.toLocaleTimeString()}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </ListItem>
        ))}
      </List>
    </div>
  );
};

export default ChatList;
