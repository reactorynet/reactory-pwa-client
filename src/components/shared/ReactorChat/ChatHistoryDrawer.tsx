import React from 'react';
import { Drawer, IconButton, Toolbar, Typography, Box, List, ListItem, Checkbox, Divider, Button, Icon } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { CheckBoxOutlined, CheckBoxOutlineBlank } from '@mui/icons-material';
import HistoryIcon from '@mui/icons-material/History';
import ChatHistoryItem from './ChatHistoryItem';

const ChatHistoryDrawer = ({
  open,
  onClose,
  onOpen,
  chats = [],
  il8n,
  onSelectChat,
  onDeleteChat,
  selectedChats = [],
  setSelectedChats,
  getPersona,
}) => {
  const [showEmptyChats, setShowEmptyChats] = React.useState(true);
  const allSelected = chats.length > 0 && selectedChats.length === chats.length;

  // Count chats with notifications (assuming chat.hasNotification boolean)
  const notificationCount = chats.filter((chat) => chat.hasNotification).length;
  const visibleChats = showEmptyChats
    ? chats
    : chats.filter((chat) => {
        const firstUserMsg = Array.isArray(chat.history)
          ? chat.history.find((item) => item.role === 'user')
          : null;
        return !!firstUserMsg;
      });

  const handleSelectAll = () => {
    setSelectedChats(chats.map((chat) => chat.id));
  };

  const handleSelectNone = () => {
    setSelectedChats([]);
  };

  const handleToggleChat = (chatId) => {
    if (selectedChats.includes(chatId)) {
      setSelectedChats(selectedChats.filter((id) => id !== chatId));
    } else {
      setSelectedChats([...selectedChats, chatId]);
    }
  };

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ width: 340, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Toolbar sx={{ justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" color="primary" onClick={allSelected ? handleSelectNone : handleSelectAll}>
              {allSelected ? <CheckBoxOutlined fontSize="small" /> : <CheckBoxOutlineBlank fontSize="small" />}
            </IconButton>
            {/* Clear Chats Button */}
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                if (selectedChats.length === 0) return;
                if (selectedChats.length === chats.length) {
                  onDeleteChat && onDeleteChat('*');
                } else {
                  onDeleteChat && onDeleteChat(selectedChats);
                }
              }}
              sx={{ ml: 1 }}
              title="Clear Selected Chats"
            >
              <Icon fontSize="small">delete_sweep</Icon>
            </IconButton>
            <IconButton
              size="small"
              color={showEmptyChats ? "primary" : "default"}
              onClick={() => setShowEmptyChats((v) => !v)}
              sx={{ ml: 1 }}
            >
              <HistoryIcon
                sx={{
                  color: showEmptyChats ? 'primary.main' : 'grey.300',
                  bgcolor: showEmptyChats ? 'white' : 'primary.main',
                  borderRadius: '50%',
                  p: 0.5,
                }}
              />
            </IconButton>
            <IconButton size="small" color="primary">
              <Icon fontSize="small">
                chat_bubble_outline
              </Icon>
              {notificationCount > 0 && (
                <Box
                  component="span"
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    bgcolor: 'error.main',
                    color: 'white',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {notificationCount}
                </Box>
              )}
            </IconButton>
          </Box>
          <IconButton onClick={onClose} size="small">
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
        </Toolbar>
        <Divider />
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
          <List>
            {visibleChats && visibleChats.length > 0 ? (
              visibleChats.map((chat) => {
                const firstUserMsg = Array.isArray(chat.history)
                  ? chat.history.find((item) => item.role === 'user')
                  : null;
                const persona = getPersona ? getPersona(chat.personaId) : null;
                const label = firstUserMsg?.content ?? il8n.t('reactor.client.chat.history.emptyChat', { defaultValue: 'Empty Chat' });
                return (
                  <ListItem key={chat.id} disableGutters secondaryAction={
                    <Checkbox
                      edge="end"
                      checked={selectedChats.includes(chat.id)}
                      onChange={() => handleToggleChat(chat.id)}
                    />
                  }>
                    <Box sx={{ flex: 1 }}>
                      <ChatHistoryItem
                        label={label}
                        chat={chat}
                        onSelect={onSelectChat}
                        onDelete={onDeleteChat}
                        persona={persona}
                      />
                    </Box>
                  </ListItem>
                );
              })
            ) : (
              <ListItem>{il8n?.t('reactor.client.chat.history.none', { defaultValue: 'No chats found' })}</ListItem>
            )}
          </List>
        </Box>
      </Box>
    </Drawer>
  );
};

export default ChatHistoryDrawer;
