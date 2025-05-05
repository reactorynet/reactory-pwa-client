import React from 'react';
import ChatHistoryItem from './ChatHistoryItem';

const ChatHeader = ({
  headerOpen,
  handleHeaderToggle,
  selectedPersona,
  personas,
  handleModelMenuOpen,
  anchorEl,
  handleModelMenuClose,
  handlePersonaSelect,
  handleChatMenuOpen,
  chatMenuAnchor,
  handleChatMenuClose,
  chats,
  handleChatSelect,
  deleteChat,
  Material,
}) => {
  const {
    Box,
    Button,
    IconButton,
    Grid,
    Typography,
    Paper,
    Menu,
    MenuItem,
  } = Material.MaterialCore;
  const {
    SmartToy,
    ArrowDropDown,
  } = Material.MaterialIcons;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 80,
        right: headerOpen ? 24 : -340,
        width: 320,
        transition: 'right 0.3s',
        zIndex: 1200,
        boxShadow: 3,
        background: '#fff',
        borderRadius: 2,
      }}
    >
      <Paper elevation={2} sx={{ p: 2 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <SmartToy fontSize="large" color="primary" />
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
          <Grid item>
            <IconButton onClick={handleChatMenuOpen}>
              <Material.MaterialIcons.History />
            </IconButton>
            <Menu
              anchorEl={chatMenuAnchor}
              open={Boolean(chatMenuAnchor)}
              onClose={handleChatMenuClose}
              sx={{ minWidth: 320 }}
            >
              {chats && chats.length > 0 ? (
                chats.map((chat) => {
                  const firstUserMsg = Array.isArray(chat.history)
                    ? chat.history.find((item) => item.role === "user")
                    : null;
                  const chatDate = chat.started
                    ? new Date(chat.started).toLocaleString()
                    : chat.id;
                  const label = firstUserMsg?.content ? firstUserMsg.content : chatDate;
                  return (
                    <ChatHistoryItem
                      key={chat.id}
                      label={label}
                      chat={chat}
                      onSelect={handleChatSelect}
                      onDelete={deleteChat}
                    />
                  );
                })
              ) : (
                <MenuItem disabled>No chats found</MenuItem>
              )}
            </Menu>
          </Grid>
          <Grid item>
            <IconButton onClick={handleHeaderToggle}>
              {headerOpen ? <Material.MaterialIcons.ChevronRight /> : <Material.MaterialIcons.ChevronLeft />}
            </IconButton>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ChatHeader;
