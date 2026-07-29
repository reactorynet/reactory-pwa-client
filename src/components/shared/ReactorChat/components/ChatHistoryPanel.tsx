import React from 'react';
import { ChatState, IAIPersona } from '../types';
import { glassPanelSx } from '../utils';

interface ChatHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  chats: ChatState[];
  chatState?: ChatState;
  getPersona?: (personaId: string) => IAIPersona | null;
  onChatSelect: (chat: ChatState) => void;
  onDeleteChat: (chatId: string) => void;
  onSearch?: (query: string) => void;
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
  onSearch,
  Material,
  il8n
}) => {
  const theme = Material.MaterialCore.useTheme();
  const mode = theme?.palette?.mode ?? 'dark';
  const {
    Paper,
    Box,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Chip,
    TextField,
  } = Material.MaterialCore;

  const [expandedSegments, setExpandedSegments] = React.useState<{ [key: string]: boolean }>({});
  const [clickMoreCounts, setClickMoreCounts] = React.useState<{ [key: string]: number }>({});
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  const totalClickMoreCount = Object.values(clickMoreCounts).reduce((sum, count) => sum + count, 0);
  const showSearch = totalClickMoreCount >= 2 || searchQuery !== '';

  const activePersonaId = chatState?.personaId || chatState?.persona?.id;

  // Group chats by persona
  const groupedChats = React.useMemo(() => {
    if (!chats || chats.length === 0) return [];

    const groups: { [key: string]: ChatState[] } = {};
    chats.forEach((chat) => {
      const pId = chat.personaId || 'unknown';
      if (!groups[pId]) {
        groups[pId] = [];
      }
      groups[pId].push(chat);
    });

    // Sort chats within each group by created date (most recent first)
    Object.keys(groups).forEach((pId) => {
      groups[pId].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    });

    // Convert to array of groups
    const groupArray = Object.keys(groups).map((pId) => {
      const groupPersona = getPersona ? getPersona(pId) : null;
      const groupChats = groups[pId];
      const latestChatDate = groupChats[0]?.created ? new Date(groupChats[0].created).getTime() : 0;
      return {
        personaId: pId,
        persona: groupPersona,
        chats: groupChats,
        latestChatDate,
      };
    });

    // Sort groups: active persona group first, then others by latest chat date
    groupArray.sort((a, b) => {
      if (a.personaId === activePersonaId) return -1;
      if (b.personaId === activePersonaId) return 1;
      return b.latestChatDate - a.latestChatDate;
    });

    return groupArray;
  }, [chats, activePersonaId, getPersona]);

  return (
    <Paper
      elevation={3}
      sx={{
        ...glassPanelSx(mode),
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
      }}
    >
      {/* Header */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        p: 2,
        borderBottom: 1,
        borderColor: 'divider',
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
          {showSearch && (
            <TextField
              size="small"
              fullWidth
              placeholder={il8n?.t('reactor.client.chat.history.searchPlaceholder', { defaultValue: 'Search conversations...' })}
              value={searchQuery}
              onChange={(e: any) => {
                const val = e.target.value;
                setSearchQuery(val);
                onSearch?.(val);
              }}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <IconButton disabled size="small" sx={{ p: 0, mr: 1 }}>
                    <Material.MaterialIcons.Search sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                  </IconButton>
                ),
                endAdornment: searchQuery ? (
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSearchQuery('');
                      onSearch?.('');
                    }}
                  >
                    <Material.MaterialIcons.Clear sx={{ fontSize: '1rem' }} />
                  </IconButton>
                ) : null,
              }}
            />
          )}
          {groupedChats && groupedChats.length > 0 ? (
            <List sx={{ p: 0 }}>
              {groupedChats.map((group, groupIndex) => {
                const groupPersona = group.persona;
                const isGroupActive = group.personaId === activePersonaId;
                const sortedChats = group.chats;
                const isExpanded = !!expandedSegments[group.personaId];
                const visibleChats = isExpanded ? sortedChats : sortedChats.slice(0, 5);
                const hasMore = sortedChats.length > 5;

                return (
                  <Box key={group.personaId} sx={{ mb: 2 }}>
                    {/* Persona Header */}
                    <Box sx={{ 
                      px: 1.5, 
                      py: 0.75, 
                      bgcolor: isGroupActive ? 'primary.light' : 'action.selected', 
                      borderRadius: 1, 
                      mb: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderLeft: 3,
                      borderColor: isGroupActive ? 'primary.main' : 'text.secondary',
                      opacity: isGroupActive ? 1 : 0.9,
                    }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: isGroupActive ? 'primary.contrastText' : 'text.primary' }}>
                        {groupPersona?.name || 'Unknown Agent'}
                      </Typography>
                      {isGroupActive && (
                        <Chip 
                          label="Active Persona" 
                          size="small" 
                          color="primary" 
                          variant="filled" 
                          sx={{ height: 16, fontSize: '0.6rem', fontWeight: 'bold' }} 
                        />
                      )}
                    </Box>

                    {/* Chats inside this group */}
                    {visibleChats.map((chat) => {
                      const label = chat.title
                        || il8n?.t('reactor.client.chat.history.emptyChat', { defaultValue: 'Empty Chat' });

                      return (
                        <ListItem
                          key={chat.id || `chat-${chat.created}`}
                          sx={{
                            cursor: 'pointer',
                            borderRadius: 1,
                            mb: 0.5,
                            pl: 2, // indent chats slightly under header
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
                                <Typography variant="body2" sx={{ fontWeight: chatState?.id === chat.id ? 'bold' : 'normal' }}>
                                  {label.substring(0, 50)}{label.length > 50 ? '...' : ''}
                                </Typography>
                                {chat.active && (
                                  <Box
                                    sx={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      bgcolor: 'success.main',
                                      boxShadow: '0 0 6px #2e7d32',
                                    }}
                                    title="Active session"
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

                    {/* more + link */}
                    {hasMore && !isExpanded && (
                      <Box 
                        onClick={() => {
                          setExpandedSegments((prev) => ({ ...prev, [group.personaId]: true }));
                          setClickMoreCounts((prev) => ({
                            ...prev,
                            [group.personaId]: (prev[group.personaId] || 0) + 1,
                          }));
                        }}
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          py: 0.5, 
                          cursor: 'pointer',
                          color: 'primary.main',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        {il8n?.t('reactor.client.chat.history.more', { defaultValue: 'more +' })}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </List>
                        </ListItem>
                      );
                    })}
                  </Box>
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
                {chatState.history.slice(-5).map((message, index) => {
                  const rawContent = message.content as unknown;
                  const messagePreview = typeof rawContent === 'string'
                    ? rawContent.substring(0, 100)
                    : Array.isArray(rawContent)
                      ? ((rawContent as any[]).find((p) => p.type === 'text')?.text?.substring(0, 100) ?? '[Image message]')
                      : 'Message content not available';
                  const truncatedPreview = messagePreview.length > 100
                    ? messagePreview + '...'
                    : messagePreview;

                  return (
                    <Box key={`message-${index}-${message.role}`} sx={{ mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        {message.role === 'user' ? 'You' : 'Assistant'}
                      </Typography>
                      <Typography variant="body2">
                        {truncatedPreview}
                      </Typography>
                    </Box>
                  );
                })}
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
