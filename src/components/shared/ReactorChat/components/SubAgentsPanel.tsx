import React from 'react';
import { ChatState, IAIPersona, SubAgentSummary } from '../types';
import { glassPanelSx } from '../utils';

interface SubAgentsPanelProps {
  open: boolean;
  onClose: () => void;
  chatState?: ChatState;
  getPersona?: (personaId: string) => IAIPersona | null;
  onSelectChild: (child: SubAgentSummary) => void;
  Material: any;
  il8n: any;
}

const SubAgentsPanel: React.FC<SubAgentsPanelProps> = ({
  open,
  onClose,
  chatState,
  getPersona,
  onSelectChild,
  Material,
  il8n,
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
    ListItemAvatar,
    Avatar,
    Chip,
    Tooltip,
  } = Material.MaterialCore;

  const {
    ArrowBack,
    AccountTree,
    ChevronRight,
  } = Material.MaterialIcons;

  const children = React.useMemo<SubAgentSummary[]>(() => {
    return (chatState?.chats ?? [])
      .slice()
      .sort((a, b) => {
        const at = a.updated ? new Date(a.updated).getTime() : 0;
        const bt = b.updated ? new Date(b.updated).getTime() : 0;
        return bt - at;
      });
  }, [chatState?.chats]);

  const resolvePersona = React.useCallback((personaId: string): IAIPersona | null => {
    if (!getPersona) return null;
    try {
      return getPersona(personaId);
    } catch {
      return null;
    }
  }, [getPersona]);

  const personaInitial = (persona: IAIPersona | null, fallback: string) =>
    (persona?.name?.trim()?.[0] || fallback).toUpperCase();

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
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        p: 2,
        borderBottom: 1,
        borderColor: 'divider',
      }}>
        <IconButton onClick={onClose} sx={{ mr: 2 }} aria-label="Close sub-agents panel">
          <ArrowBack />
        </IconButton>
        <AccountTree sx={{ mr: 1, opacity: 0.7 }} />
        <Typography variant="h6" sx={{ fontWeight: 'bold', flex: 1 }}>
          {il8n?.t('reactor.client.chat.subagents.title', { defaultValue: 'Sub-agent Conversations' })}
        </Typography>
        <Chip
          label={il8n?.t('reactor.client.chat.subagents.count', {
            defaultValue: '{{count}}',
            count: children.length,
          })}
          size="small"
          variant="outlined"
        />
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          {il8n?.t('reactor.client.chat.subagents.help', {
            defaultValue: 'Sessions spawned by the current agent. Select one to open its conversation.',
          })}
        </Typography>

        {children.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, opacity: 0.6 }}>
            <AccountTree sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
            <Typography variant="body2">
              {il8n?.t('reactor.client.chat.subagents.empty', {
                defaultValue: 'No sub-agent conversations for this session.',
              })}
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {children.map((child) => {
              const persona = resolvePersona(child.personaId);
              const label = child.title
                || il8n?.t('reactor.client.chat.subagents.untitled', { defaultValue: 'Untitled sub-agent' });
              const updated = child.updated ? new Date(child.updated) : null;

              return (
                <ListItem
                  key={child.id}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 1,
                    mb: 1,
                    border: 1,
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => onSelectChild(child)}
                  secondaryAction={
                    <Tooltip title={il8n?.t('reactor.client.chat.subagents.open', { defaultValue: 'Open conversation' })}>
                      <IconButton edge="end" size="small" aria-label="Open sub-agent conversation">
                        <ChevronRight />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemAvatar>
                    <Avatar
                      src={persona?.avatar}
                      sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}
                    >
                      {personaInitial(persona, 'S')}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }} noWrap>
                          {label.length > 60 ? `${label.substring(0, 60)}…` : label}
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
                        {updated ? updated.toLocaleString() : ''}
                      </Typography>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    </Paper>
  );
};

export default SubAgentsPanel;
