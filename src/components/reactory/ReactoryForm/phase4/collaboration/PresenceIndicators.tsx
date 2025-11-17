/**
 * Phase 4.1: Presence Indicators Component
 * Shows online users, cursors, and selections for real-time collaboration
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Avatar,
  Tooltip,
  Chip,
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import {
  Group as GroupIcon,
  Person as PersonIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  FiberManualRecord as OnlineIcon,
  Schedule as OfflineIcon,
} from '@mui/icons-material';
import { CollaborationUser, CursorPosition, Selection } from './useRealTimeCollaboration';

// ============================================================================
// TYPES
// ============================================================================

export interface PresenceIndicatorsProps {
  /** Online users */
  users: CollaborationUser[];
  /** Current user */
  currentUser: CollaborationUser | null;
  /** Whether to show presence indicators */
  showPresence?: boolean;
  /** Whether to show cursors */
  showCursors?: boolean;
  /** Whether to show selections */
  showSelections?: boolean;
  /** Custom styles */
  sx?: any;
  /** Position of the indicators */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Maximum number of users to show */
  maxUsers?: number;
  /** Whether to show user details on hover */
  showUserDetails?: boolean;
  /** Custom user colors */
  userColors?: Record<string, string>;
  /** Animation duration */
  animationDuration?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PresenceIndicators: React.FC<PresenceIndicatorsProps> = ({
  users,
  currentUser,
  showPresence = true,
  showCursors = true,
  showSelections = true,
  sx = {},
  position = 'top-right',
  maxUsers = 5,
  showUserDetails = true,
  userColors = {},
  animationDuration = 0.3,
}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [showDetails, setShowDetails] = useState(false);
  const [cursorPositions, setCursorPositions] = useState<Record<string, CursorPosition>>({});
  const [selections, setSelections] = useState<Record<string, Selection[]>>({});

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Update cursor positions
  useEffect(() => {
    const positions: Record<string, CursorPosition> = {};
    users.forEach(user => {
      if (user.cursorPosition) {
        positions[user.id] = user.cursorPosition;
      }
    });
    setCursorPositions(positions);
  }, [users]);

  // Update selections
  useEffect(() => {
    const userSelections: Record<string, Selection[]> = {};
    users.forEach(user => {
      if (user.selections && user.selections.length > 0) {
        userSelections[user.id] = user.selections;
      }
    });
    setSelections(userSelections);
  }, [users]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getOnlineUsers = () => {
    return users.filter(user => user.isOnline && user.id !== currentUser?.id).slice(0, maxUsers);
  };

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 1,
      p: 1,
    };

    switch (position) {
      case 'top-left':
        return { ...baseStyles, top: 16, left: 16 };
      case 'top-right':
        return { ...baseStyles, top: 16, right: 16 };
      case 'bottom-left':
        return { ...baseStyles, bottom: 16, left: 16 };
      case 'bottom-right':
        return { ...baseStyles, bottom: 16, right: 16 };
      default:
        return { ...baseStyles, top: 16, right: 16 };
    }
  };

  const renderUserAvatar = (user: CollaborationUser, index: number) => {
    const color = userColors[user.id] || user.color || '#4ECDC4';
    const isOnline = user.isOnline;

    return (
      <motion.div
        key={user.id}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: animationDuration }}
        style={{ zIndex: 1000 - index }}
      >
        <Tooltip
          title={showUserDetails ? `${user.name}${isOnline ? ' (Online)' : ' (Offline)'}` : ''}
          placement="left"
        >
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: isOnline ? 'success.main' : 'grey.500',
                  border: '2px solid white',
                }}
              />
            }
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: color,
                fontSize: '0.875rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'scale(1.1)',
                  transition: 'transform 0.2s',
                },
              }}
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </Avatar>
          </Badge>
        </Tooltip>
      </motion.div>
    );
  };

  const renderUserDetails = () => {
    const onlineUsers = getOnlineUsers();
    const offlineUsers = users.filter(user => !user.isOnline && user.id !== currentUser?.id);

    return (
      <Popover
        open={showDetails}
        anchorEl={document.body}
        anchorOrigin={{
          vertical: position.includes('top') ? 'bottom' : 'top',
          horizontal: position.includes('right') ? 'right' : 'left',
        }}
        transformOrigin={{
          vertical: position.includes('top') ? 'top' : 'bottom',
          horizontal: position.includes('right') ? 'right' : 'left',
        }}
        onClose={() => setShowDetails(false)}
        PaperProps={{
          sx: {
            minWidth: 250,
            maxHeight: 400,
            overflow: 'auto',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Collaboration Users
          </Typography>
          
          {onlineUsers.length > 0 && (
            <>
              <Typography variant="subtitle2" color="success.main" gutterBottom>
                Online ({onlineUsers.length})
              </Typography>
              <List dense>
                {onlineUsers.map(user => (
                  <ListItem key={user.id} sx={{ py: 0.5 }}>
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          width: 24,
                          height: 24,
                          bgcolor: userColors[user.id] || user.color,
                          fontSize: '0.75rem',
                        }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={user.name}
                      secondary={user.email}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <OnlineIcon color="success" sx={{ fontSize: 16 }} />
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {offlineUsers.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Offline ({offlineUsers.length})
              </Typography>
              <List dense>
                {offlineUsers.slice(0, 3).map(user => (
                  <ListItem key={user.id} sx={{ py: 0.5 }}>
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          width: 24,
                          height: 24,
                          bgcolor: userColors[user.id] || user.color,
                          fontSize: '0.75rem',
                          opacity: 0.6,
                        }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={user.name}
                      secondary={`Last seen: ${user.lastSeen.toLocaleTimeString()}`}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <OfflineIcon color="disabled" sx={{ fontSize: 16 }} />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Box>
      </Popover>
    );
  };

  const renderCursor = (userId: string, cursor: CursorPosition) => {
    const user = users.find(u => u.id === userId);
    if (!user || !showCursors) return null;

    const color = userColors[userId] || user.color || '#4ECDC4';

    return (
      <motion.div
        key={`cursor-${userId}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'absolute',
          left: cursor.x,
          top: cursor.y,
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <Box
            sx={{
              width: 2,
              height: 20,
              bgcolor: color,
              borderRadius: 1,
            }}
          />
          <Chip
            label={user.name}
            size="small"
            sx={{
              bgcolor: color,
              color: 'white',
              fontSize: '0.75rem',
              height: 20,
              '& .MuiChip-label': {
                px: 1,
              },
            }}
          />
        </Box>
      </motion.div>
    );
  };

  const renderSelection = (userId: string, selection: Selection) => {
    const user = users.find(u => u.id === userId);
    if (!user || !showSelections) return null;

    const color = userColors[userId] || user.color || '#4ECDC4';

    return (
      <motion.div
        key={`selection-${userId}-${selection.timestamp.getTime()}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'absolute',
          left: 0, // This would need to be calculated based on field position
          top: 0, // This would need to be calculated based on field position
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 999,
        }}
      >
        <Box
          sx={{
            bgcolor: color,
            opacity: 0.2,
            borderRadius: 1,
            border: `2px solid ${color}`,
          }}
        />
      </motion.div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!showPresence) return null;

  const onlineUsers = getOnlineUsers();
  const totalUsers = users.length;

  return (
    <>
      {/* Presence Indicators */}
      <Box sx={{ ...getPositionStyles(), ...sx }}>
        <AnimatePresence>
          {onlineUsers.map((user, index) => renderUserAvatar(user, index))}
        </AnimatePresence>

        {/* User Count Badge */}
        {totalUsers > maxUsers && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: animationDuration }}
          >
            <Chip
              icon={<GroupIcon />}
              label={`+${totalUsers - maxUsers}`}
              size="small"
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                fontSize: '0.75rem',
                height: 24,
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          </motion.div>
        )}

        {/* Details Toggle */}
        <IconButton
          size="small"
          onClick={() => setShowDetails(!showDetails)}
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          {showDetails ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </IconButton>
      </Box>

      {/* User Details Popover */}
      {renderUserDetails()}

      {/* Cursors */}
      <AnimatePresence>
        {Object.entries(cursorPositions).map(([userId, cursor]) =>
          renderCursor(userId, cursor)
        )}
      </AnimatePresence>

      {/* Selections */}
      <AnimatePresence>
        {Object.entries(selections).map(([userId, userSelections]) =>
          userSelections.map(selection => renderSelection(userId, selection))
        )}
      </AnimatePresence>
    </>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default PresenceIndicators; 