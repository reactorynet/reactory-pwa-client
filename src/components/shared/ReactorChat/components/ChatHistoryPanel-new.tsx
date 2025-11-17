import React from 'react';
import { ChatState, IAIPersona } from '../types';

interface ChatHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  chats: ChatState[];
  chatState?: ChatState;
  getPersona?: (personaId: string) => IAIPersona | null;
  onChatSelect: (chat: ChatState) => void;
  onDeleteChat: (chatId: string) => void;
  Material: any;
  il8n: any;
}

const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({
  open,
  onClose,
  chats,
  chatState,
  getPersona,
  onChatSelect,
  onDeleteChat,
  Material,
  il8n
}) => {
  const {
    Paper,
    Box,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Chip,
  } = Material.MaterialCore;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-in-out',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        zIndex: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(15px) saturate(120%)',
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
          onClick={onClose}
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
                  const persona = chat.persona;
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
                      onClick={() => onChatSelect(chat)}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          aria-label="Delete chat"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
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
  );
};

export default ChatHistoryPanel;
