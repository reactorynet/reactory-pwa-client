import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Drawer, 
  IconButton, 
  Toolbar, 
  Typography, 
  Box, 
  List, 
  ListItem, 
  Checkbox, 
  Divider, 
  Button, 
  Icon,
  Tooltip,
  Chip,
  Collapse,
  ListItemButton,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { CheckBoxOutlined, CheckBoxOutlineBlank } from '@mui/icons-material';
import HistoryIcon from '@mui/icons-material/History';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChatHistoryItem from './ChatHistoryItem';
import { withReactory } from '@reactory/client-core/api/ApiProvider';

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
  reactory,
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeSessionId = searchParams.get('sessionId');
  
  const [showEmptyChats, setShowEmptyChats] = React.useState(true);
  const [expandedGroups, setExpandedGroups] = React.useState({});
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [showDeleteForChat, setShowDeleteForChat] = React.useState(null);
  const allSelected = chats.length > 0 && selectedChats.length === chats.length;

  // Force clear selectedChats on component mount and when drawer opens
  React.useEffect(() => {
    console.log('ChatHistoryDrawer: Mount/Open effect', { open, selectedChats: selectedChats.length });
    if (open && selectedChats.length > 0) {
      console.log('ChatHistoryDrawer: Clearing selectedChats on open');
      setSelectedChats([]);
      setSelectionMode(false);
    }
  }, [open]);

  // Debug logging for selection state
  React.useEffect(() => {
    console.log('ChatHistoryDrawer: Selection state changed', {
      selectionMode,
      selectedChats: selectedChats.length,
      selectedChatIds: selectedChats,
      totalChats: chats.length
    });
  }, [selectionMode, selectedChats, chats.length]);

  const visibleChats = showEmptyChats
    ? chats
    : chats.filter((chat) => {
        const firstUserMsg = Array.isArray(chat.history)
          ? chat.history.find((item) => item.role === 'user')
          : null;
        return !!firstUserMsg;
      });

  // Group chats by time periods and sort each group with latest first
  const groupChatsByTime = (chats) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const groups = {
      today: [],
      yesterday: [],
      earlierThisWeek: [],
      lastWeek: [],
      thisMonth: [],
      older: []
    };

    chats.forEach(chat => {
      const chatDate = new Date(chat.created);

      if (chatDate >= today) {
        groups.today.push(chat);
      } else if (chatDate >= yesterday) {
        groups.yesterday.push(chat);
      } else if (chatDate >= weekStart) {
        groups.earlierThisWeek.push(chat);
      } else if (chatDate >= lastWeekStart) {
        groups.lastWeek.push(chat);
      } else if (chatDate >= monthStart) {
        groups.thisMonth.push(chat);
      } else {
        groups.older.push(chat);
      }
    });

    // Sort each group with latest chats first (descending order by created date)
    Object.keys(groups).forEach(groupKey => {
      groups[groupKey].sort((a, b) => {
        const dateA = new Date(a.created).getTime();
        const dateB = new Date(b.created).getTime();
        return dateB - dateA; // Descending order (latest first)
      });
    });

    return groups;
  };

  const groupedChats = groupChatsByTime(visibleChats);

  const handleSelectAll = () => {
    // Only select chats that have valid IDs (not null)
    setSelectedChats(chats.filter(chat => chat.id !== null).map((chat) => chat.id));
  };

  const handleSelectNone = () => {
    setSelectedChats([]);
  };

  const handleToggleChat = (chatId) => {
    if (!selectionMode || chatId === null) return; // Don't allow selection of null ID chats
    
    if (selectedChats.includes(chatId)) {
      setSelectedChats(selectedChats.filter((id) => id !== chatId));
    } else {
      setSelectedChats([...selectedChats, chatId]);
    }
  };

  const handleToggleSelectionMode = () => {
    console.log('ChatHistoryDrawer: Toggling selection mode from', selectionMode, 'to', !selectionMode);
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      console.log('ChatHistoryDrawer: Clearing selectedChats:', selectedChats);
      setSelectedChats([]); // Clear selection when exiting selection mode
    }
  };

  const handleChatDoubleClick = (chatId) => {
    console.log('Double-click detected for chat:', chatId);
    setShowDeleteForChat(showDeleteForChat === chatId ? null : chatId);
  };

  const handleChatClick = (chat) => {
    console.log('ChatHistoryDrawer: Chat clicked', { selectionMode, chatId: chat.id });
    if (selectionMode) {
      handleToggleChat(chat.id);
    } else {
      onSelectChat(chat);
    }
  };

  const handleToggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const getGroupTitle = (groupKey) => {
    switch (groupKey) {
      case 'today': return reactory.i18n.t('reactor:chat.history.group.today', { defaultValue: 'Today' });
      case 'yesterday': return reactory.i18n.t('reactor:chat.history.group.yesterday', { defaultValue: 'Yesterday' });
      case 'earlierThisWeek': return reactory.i18n.t('reactor:chat.history.group.earlierThisWeek', { defaultValue: 'Earlier this week' });
      case 'lastWeek': return reactory.i18n.t('reactor:chat.history.group.lastWeek', { defaultValue: 'Last week' });
      case 'thisMonth': return reactory.i18n.t('reactor:chat.history.group.thisMonth', { defaultValue: 'This month' });
      case 'older': return reactory.i18n.t('reactor:chat.history.group.older', { defaultValue: 'Older' });
      default: return groupKey;
    }
  };

    const renderGroupHeader = (groupKey, chats) => {
    if (chats.length === 0) return null;
    
    const isExpanded = expandedGroups[groupKey] !== false; // Default to expanded
    const groupSelected = chats.every(chat => selectedChats.includes(chat.id));
    const someGroupSelected = chats.some(chat => selectedChats.includes(chat.id));

    return (
      <ListItem key={`group-${groupKey}`} disableGutters sx={{ py: 0 }}>
        <ListItemButton
          onClick={() => handleToggleGroup(groupKey)}
          sx={{
            py: 1,
            px: 2,
            backgroundColor: 'action.hover',
            borderRadius: 1,
            mb: 1,
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            {selectionMode && (
              <Checkbox
                checked={groupSelected}
                indeterminate={someGroupSelected && !groupSelected}
                onChange={() => {
                  if (groupSelected) {
                    setSelectedChats(prev => prev.filter(id => !chats.find(chat => chat.id === id)));
                  } else {
                    // Only select chats with valid IDs (not null)
                    const validChatIds = chats
                      .filter(chat => chat.id !== null)
                      .map(chat => chat.id);
                    const newIds = validChatIds.filter(id => !selectedChats.includes(id));
                    setSelectedChats(prev => [...prev, ...newIds]);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                size="small"
              />
            )}
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {getGroupTitle(groupKey)}
                </Typography>
                <Chip
                  label={chats.length}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              </Box>
            }
          />
          {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </ListItemButton>
      </ListItem>
    );
  };

  function onNewChat() {
    const personaId = searchParams.get('personaId');
    const chatUrl = personaId ? `/reactor/chat?personaId=${personaId}` : '/reactor/chat';
    navigate(chatUrl);
    handleDrawerClose(); // Use enhanced close handler
  }

  // Enhanced close handler to ensure state cleanup
  const handleDrawerClose = () => {
    console.log('ChatHistoryDrawer: Closing drawer, clearing state');
    setSelectedChats([]);
    setSelectionMode(false);
    setShowDeleteForChat(null);
    onClose();
  };

  return (
    <Drawer anchor="left" open={open} onClose={handleDrawerClose}>
      <Box sx={{ width: 380, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          backgroundColor: 'background.paper'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {reactory.i18n.t('reactor:chat.history.title', { defaultValue: 'Reactor Chat History' })}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {reactory.i18n.t('reactor:chat.history.conversationCount', { 
              defaultValue: '{{count}} conversation',
              count: visibleChats.length 
            })}
            {visibleChats.length !== 1 && 's'}
          </Typography>
        </Box>
        
        <Toolbar sx={{ justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 0.5, minHeight: 48 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={reactory.i18n.t('reactor:chat.history.tooltip.selectionMode', { 
              defaultValue: selectionMode ? "Exit selection mode" : "Enter selection mode" 
            })} placement="bottom">
              <IconButton 
                size="small" 
                color={selectionMode ? "secondary" : "primary"}
                onClick={handleToggleSelectionMode}
                sx={{ p: 0.75 }}
              >
                <CheckBoxOutlineBlank sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            
            {selectionMode && (
              <>
                <Tooltip title={reactory.i18n.t('reactor:chat.history.tooltip.selectAll', { 
                  defaultValue: allSelected ? "Deselect all" : "Select all" 
                })} placement="bottom">
                  <IconButton 
                    size="small" 
                    color="primary" 
                    onClick={allSelected ? handleSelectNone : handleSelectAll}
                    sx={{ p: 0.75 }}
                  >
                    {allSelected ? <CheckBoxOutlined sx={{ fontSize: 18 }} /> : <CheckBoxOutlineBlank sx={{ fontSize: 18 }} />}
                  </IconButton>
                </Tooltip>
                
                <Tooltip title={reactory.i18n.t('reactor:chat.history.tooltip.deleteSelected', { 
                  defaultValue: "Delete selected chats" 
                })} placement="bottom">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      if (selectedChats.length === 0) return;
                      if (selectedChats.length === chats.length) {
                        onDeleteChat?.('*');
                      } else {
                        onDeleteChat?.(selectedChats);
                      }
                    }}
                    disabled={selectedChats.length === 0}
                    sx={{ p: 0.75 }}
                  >
                    <Icon sx={{ fontSize: 18 }}>delete_sweep</Icon>
                  </IconButton>
                </Tooltip>
              </>
            )}

            <Tooltip title={reactory.i18n.t('reactor:chat.history.tooltip.toggleEmptyChats', { 
              defaultValue: showEmptyChats ? "Hide empty chats" : "Show empty chats" 
            })} placement="bottom">
              <IconButton
                size="small"
                color={showEmptyChats ? "primary" : "default"}
                onClick={() => setShowEmptyChats((v) => !v)}
                sx={{ p: 0.75 }}
              >
                <HistoryIcon
                  sx={{
                    fontSize: 18,
                    color: showEmptyChats ? 'primary.main' : 'grey.400',
                  }}
                />
              </IconButton>
            </Tooltip>



            <Tooltip title={reactory.i18n.t('reactor:chat.history.tooltip.newChat', { 
              defaultValue: "New chat" 
            })} placement="bottom">
              <IconButton size="small" color="primary" onClick={() => {
                onNewChat();
              }} sx={{ p: 0.75 }}>
                <Icon sx={{ fontSize: 18 }}>add</Icon>
              </IconButton>
            </Tooltip>
          </Box>

          <Tooltip title={reactory.i18n.t('reactor:chat.history.tooltip.close', { 
            defaultValue: "Close chat history" 
          })} placement="bottom">
            <IconButton onClick={handleDrawerClose} size="small" sx={{ p: 0.75 }}>
              <ArrowBackIosNewIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Toolbar>

        <Divider />

        <Box sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
          {visibleChats && visibleChats.length > 0 ? (
            <List>
              {Object.entries(groupedChats).map(([groupKey, groupChats]) => {
                if (groupChats.length === 0) return null;

                const isExpanded = expandedGroups[groupKey] !== false;

                return (
                  <Box key={groupKey}>
                    {renderGroupHeader(groupKey, groupChats)}
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <List sx={{ pl: 0 }}>
                                                 {groupChats.map((chat, index) => {
                           const firstUserMsg = Array.isArray(chat.history)
                             ? chat.history.find((item) => item.role === 'user')
                             : null;
                           const persona = getPersona ? getPersona(chat.personaId) : null;
                           const label = firstUserMsg?.content ?? reactory.i18n.t('reactor:chat.history.emptyChat', { defaultValue: 'Empty Chat' });
                           
                           // Generate a unique key for items with null IDs
                           const uniqueKey = chat.id || `chat-${groupKey}-${index}`;
                           const hasValidId = chat.id !== null;
                           
                           const isSelected = selectionMode && hasValidId && selectedChats.includes(chat.id);
                           console.log('ChatHistoryDrawer: Rendering chat', { 
                             chatId: chat.id, 
                             uniqueKey,
                             hasValidId,
                             isSelected, 
                             selectionMode, 
                             selectedChatsCount: selectedChats.length 
                           });
                           
                           return (
                             <ListItem key={uniqueKey} disableGutters sx={{ py: 0 }}>
                               {selectionMode && (
                                 <Checkbox
                                   edge="start"
                                   checked={isSelected}
                                   disabled={!hasValidId}
                                   onChange={() => handleToggleChat(chat.id)}
                                   sx={{ mr: 1 }}
                                 />
                               )}
                               <Box sx={{ 
                                 flex: 1,
                                 backgroundColor: (isSelected && hasValidId) ? 'warning.light' : 'transparent',
                                 borderRadius: 1,
                                 border: (isSelected && hasValidId) ? 1 : 0,
                                 borderColor: 'warning.main'
                               }}>
                                 <ChatHistoryItem
                                   label={label}
                                   chat={chat}
                                   onSelect={handleChatClick}
                                   onDelete={onDeleteChat}
                                   persona={persona}
                                   reactory={reactory}
                                   showDelete={showDeleteForChat === chat.id}
                                   onDoubleClick={() => handleChatDoubleClick(chat.id)}
                                   isActive={activeSessionId === chat.id}
                                 />
                               </Box>
                             </ListItem>
                           );
                         })}
                      </List>
                    </Collapse>
                  </Box>
                );
              })}
            </List>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {reactory.i18n.t('reactor:chat.history.empty', { defaultValue: 'No chats found' })}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

export default withReactory(ChatHistoryDrawer);
