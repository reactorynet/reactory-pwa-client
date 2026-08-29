import React from 'react';
import {
  Box,
  Fab,
  Avatar,
  Badge,
  Tooltip,
  Typography,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';
import { TrackedSession } from '../hooks/useSessionStreamHub';

export interface ActiveSessionsAvatarStackProps {
  sessions: TrackedSession[];
  onSelectSession: (sessionId: string, personaId?: string) => void;
  mode?: 'dark' | 'light' | string;
  maxVisible?: number;
  bottomOffset?: number;
  rightOffset?: number;
}

/**
 * ActiveSessionsAvatarStack
 *
 * Renders a vertical stack of smaller FABs above the active agent button.
 * Each FAB displays an active background session / agent, complete with:
 * - Live status glow/pulse animations (thinking / tool execution / streaming)
 * - Notification badges for completed actions / unread responses
 * - Rich tooltips with status and message previews
 * - Instant one-click switching to make that session active
 */
export const ActiveSessionsAvatarStack: React.FC<ActiveSessionsAvatarStackProps> = ({
  sessions,
  onSelectSession,
  mode = 'dark',
  maxVisible = 4,
  bottomOffset = 96,
  rightOffset = 10,
}) => {
  const theme = useTheme();
  const isDark = mode === 'dark' || theme.palette.mode === 'dark';

  if (!sessions || sessions.length === 0) {
    return null;
  }

  const visibleSessions = sessions.slice(0, maxVisible);
  const overflowCount = sessions.length - maxVisible;

  const getStatusText = (session: TrackedSession): string => {
    switch (session.status) {
      case 'thinking':
        return 'Thinking...';
      case 'streaming':
        return 'Generating response...';
      case 'executing_tools':
        return session.lastToolName ? `Running: ${session.lastToolName}` : 'Executing actions...';
      case 'waiting_focus':
        return 'Waiting for chat focus...';
      case 'completed':
        return 'Response ready';
      case 'error':
        return 'Encountered error';
      default:
        return 'Idle';
    }
  };

  const getStatusColor = (session: TrackedSession): string => {
    switch (session.status) {
      case 'thinking':
        return '#00e5ff'; // Cyan
      case 'streaming':
        return '#2979ff'; // Blue
      case 'executing_tools':
        return '#ff9100'; // Amber/Orange
      case 'waiting_focus':
        return '#ff9800'; // Amber/Orange Warning
      case 'completed':
        return '#00e676'; // Green
      case 'error':
        return '#f44336'; // Red
      default:
        return isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
    }
  };

  const isSessionBusy = (session: TrackedSession): boolean => {
    return session.status === 'thinking' || session.status === 'streaming' || session.status === 'executing_tools';
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: bottomOffset,
        right: rightOffset,
        display: 'flex',
        flexDirection: 'column-reverse',
        alignItems: 'center',
        gap: 1.25,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      {overflowCount > 0 && (
        <Box
          sx={{
            pointerEvents: 'auto',
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: isDark ? 'rgba(30, 30, 45, 0.85)' : 'rgba(230, 230, 245, 0.85)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'text.secondary',
            backdropFilter: 'blur(8px)',
            boxShadow: theme.shadows[2],
          }}
        >
          +{overflowCount}
        </Box>
      )}

      {visibleSessions.map((session, index) => {
        const busy = isSessionBusy(session);
        const statusColor = getStatusColor(session);
        const persona = session.persona;
        const initial = (persona?.name || session.title || 'A').trim().charAt(0).toUpperCase();
        const isWaitingFocus = session.status === 'waiting_focus' || !!session.hasWaitingToolCalls;
        const showBadge = session.unread || isWaitingFocus;
        const badgeContent = showBadge ? '!' : undefined;
        const badgeColor = isWaitingFocus ? 'warning' : (session.unread ? 'success' : 'primary');

        return (
          <Tooltip
            key={session.sessionId}
            placement="left"
            arrow
            title={
              <Paper
                elevation={0}
                sx={{
                  p: 0.75,
                  bgcolor: 'transparent',
                  color: 'inherit',
                  maxWidth: 240,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {persona?.name || 'Agent'}
                  </Typography>
                  {session.isSubAgent && (
                    <Box
                      component="span"
                      sx={{
                        fontSize: '0.62rem',
                        px: 0.5,
                        py: 0.1,
                        borderRadius: 0.5,
                        bgcolor: alpha(theme.palette.secondary.main, 0.2),
                        color: theme.palette.secondary.main,
                        fontWeight: 600,
                      }}
                    >
                      Sub-agent
                    </Box>
                  )}
                </Box>

                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: statusColor,
                    fontWeight: 600,
                    mb: 0.25,
                  }}
                >
                  ● {getStatusText(session)}
                </Typography>

                {session.lastMessage && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: 'text.secondary',
                      fontSize: '0.72rem',
                      lineHeight: 1.25,
                    }}
                  >
                    {session.lastMessage}
                  </Typography>
                )}

                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.5,
                    fontSize: '0.65rem',
                    color: 'primary.light',
                    fontWeight: 600,
                  }}
                >
                  Click to switch to this chat
                </Typography>
              </Paper>
            }
          >
            <Box
              sx={{
                pointerEvents: 'auto',
                position: 'relative',
                animation: 'activeSessionFabRise 240ms ease-out',
                '@keyframes activeSessionFabRise': {
                  '0%': { opacity: 0, transform: 'translateY(12px) scale(0.8)' },
                  '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
                },
              }}
            >
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                variant={showBadge ? 'standard' : 'dot'}
                badgeContent={badgeContent}
                invisible={!showBadge && !busy}
                color={badgeColor}
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.65rem',
                    height: showBadge ? 18 : 10,
                    minWidth: showBadge ? 18 : 10,
                    padding: showBadge ? '0 4px' : 0,
                    fontWeight: 800,
                    boxShadow: `0 0 6px ${isWaitingFocus ? '#ff9800' : (session.unread ? '#00e676' : statusColor)}`,
                    ...(busy && {
                      animation: 'activeBadgePulse 1.4s infinite ease-in-out',
                      '@keyframes activeBadgePulse': {
                        '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                        '50%': { transform: 'scale(1.3)', opacity: 0.7 },
                      },
                    }),
                  },
                }}
              >
                <Fab
                  size="small"
                  onClick={() => onSelectSession(session.sessionId, session.personaId)}
                  aria-label={persona?.name || 'Session'}
                  sx={{
                    width: 36,
                    height: 36,
                    minHeight: 36,
                    bgcolor: isDark ? 'rgba(25, 25, 38, 0.85)' : 'rgba(245, 245, 255, 0.85)',
                    backdropFilter: 'blur(10px) saturate(130%)',
                    WebkitBackdropFilter: 'blur(10px) saturate(130%)',
                    border: `2px solid ${statusColor}`,
                    boxShadow: busy
                      ? `0 0 12px ${alpha(statusColor, 0.6)}, ${theme.shadows[4]}`
                      : theme.shadows[3],
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'scale(1.15)',
                      boxShadow: `0 0 16px ${alpha(statusColor, 0.8)}, ${theme.shadows[8]}`,
                    },
                    ...(busy && {
                      animation: 'activeHaloGlow 1.8s infinite ease-in-out',
                      '@keyframes activeHaloGlow': {
                        '0%, 100%': {
                          borderColor: statusColor,
                          boxShadow: `0 0 8px ${alpha(statusColor, 0.5)}`,
                        },
                        '50%': {
                          borderColor: alpha(statusColor, 0.5),
                          boxShadow: `0 0 18px ${alpha(statusColor, 0.9)}`,
                        },
                      },
                    }),
                  }}
                >
                  <Avatar
                    src={persona?.avatar}
                    alt={persona?.name || 'Agent'}
                    sx={{
                      width: 28,
                      height: 28,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      bgcolor: isDark ? 'rgba(50, 50, 75, 0.9)' : 'rgba(210, 210, 230, 0.9)',
                      color: 'text.primary',
                    }}
                  >
                    {initial}
                  </Avatar>
                </Fab>
              </Badge>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
};

export default ActiveSessionsAvatarStack;
