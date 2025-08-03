/**
 * Phase 4.1: Collaboration Toolbar Component
 * Provides undo/redo, conflict resolution, and collaboration controls
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Toolbar,
  IconButton,
  Tooltip,
  Badge,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  Divider,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Undo as UndoIcon,
  Redo as RedoIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  CheckCircle as AcceptIcon,
  Cancel as RejectIcon,
  Merge as MergeIcon,
  Sync as SyncIcon,
  Wifi as ConnectedIcon,
  WifiOff as DisconnectedIcon,
  Visibility as ShowCursorsIcon,
  VisibilityOff as HideCursorsIcon,
  History as HistoryIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { CollaborationState, ConflictResolution } from './useRealTimeCollaboration';

// ============================================================================
// TYPES
// ============================================================================

export interface CollaborationToolbarProps {
  /** Collaboration state */
  state: CollaborationState;
  /** Whether to show the toolbar */
  showToolbar?: boolean;
  /** Whether to enable undo/redo */
  enableUndoRedo?: boolean;
  /** Whether to enable conflict resolution */
  enableConflictResolution?: boolean;
  /** Whether to show cursors */
  showCursors?: boolean;
  /** Whether to show presence */
  showPresence?: boolean;
  /** Custom styles */
  sx?: any;
  /** Position of the toolbar */
  position?: 'top' | 'bottom';
  /** Event handlers */
  onUndo?: () => void;
  onRedo?: () => void;
  onResolveConflict?: (conflictId: string, resolution: 'accept' | 'reject' | 'merge') => void;
  onToggleCursors?: () => void;
  onTogglePresence?: () => void;
  onShowSettings?: () => void;
  onShowHistory?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CollaborationToolbar: React.FC<CollaborationToolbarProps> = ({
  state,
  showToolbar = true,
  enableUndoRedo = true,
  enableConflictResolution = true,
  showCursors = true,
  showPresence = true,
  sx = {},
  position = 'top',
  onUndo,
  onRedo,
  onResolveConflict,
  onToggleCursors,
  onTogglePresence,
  onShowSettings,
  onShowHistory,
}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [showConflicts, setShowConflicts] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 1001,
      left: 0,
      right: 0,
      bgcolor: 'background.paper',
      borderBottom: position === 'top' ? '1px solid' : 'none',
      borderTop: position === 'bottom' ? '1px solid' : 'none',
      borderColor: 'divider',
      boxShadow: 1,
    };

    return position === 'top' 
      ? { ...baseStyles, top: 0 }
      : { ...baseStyles, bottom: 0 };
  };

  const renderConnectionStatus = () => {
    const isConnected = state.isConnected;
    const onlineUsers = state.users.filter(user => user.isOnline).length;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={isConnected ? 'Connected' : 'Disconnected'}>
          <IconButton size="small" disabled>
            {isConnected ? <ConnectedIcon color="success" /> : <DisconnectedIcon color="error" />}
          </IconButton>
        </Tooltip>
        
        <Chip
          icon={<GroupIcon />}
          label={`${onlineUsers} online`}
          size="small"
          color={isConnected ? 'success' : 'default'}
          variant={isConnected ? 'filled' : 'outlined'}
        />
      </Box>
    );
  };

  const renderUndoRedo = () => {
    if (!enableUndoRedo) return null;

    const canUndo = state.undoStack.length > 0;
    const canRedo = state.redoStack.length > 0;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Tooltip title="Undo">
          <span>
            <IconButton
              size="small"
              disabled={!canUndo}
              onClick={onUndo}
              sx={{ opacity: canUndo ? 1 : 0.5 }}
            >
              <UndoIcon />
            </IconButton>
          </span>
        </Tooltip>
        
        <Tooltip title="Redo">
          <span>
            <IconButton
              size="small"
              disabled={!canRedo}
              onClick={onRedo}
              sx={{ opacity: canRedo ? 1 : 0.5 }}
            >
              <RedoIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    );
  };

  const renderConflictIndicator = () => {
    if (!enableConflictResolution) return null;

    const activeConflicts = state.conflicts.length;

    return (
      <Tooltip title={`${activeConflicts} conflict${activeConflicts !== 1 ? 's' : ''} to resolve`}>
        <Badge badgeContent={activeConflicts} color="error">
          <IconButton
            size="small"
            onClick={() => setShowConflicts(true)}
            disabled={activeConflicts === 0}
          >
            <WarningIcon color={activeConflicts > 0 ? 'error' : 'disabled'} />
          </IconButton>
        </Badge>
      </Tooltip>
    );
  };

  const renderVisibilityControls = () => {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Tooltip title={showCursors ? 'Hide cursors' : 'Show cursors'}>
          <IconButton size="small" onClick={onToggleCursors}>
            {showCursors ? <HideCursorsIcon /> : <ShowCursorsIcon />}
          </IconButton>
        </Tooltip>
        
        <Tooltip title={showPresence ? 'Hide presence' : 'Show presence'}>
          <IconButton size="small" onClick={onTogglePresence}>
            {showPresence ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

  const renderActions = () => {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Tooltip title="Show history">
          <IconButton size="small" onClick={() => setShowHistory(true)}>
            <HistoryIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Collaboration settings">
          <IconButton size="small" onClick={onShowSettings}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

  const renderConflictDialog = () => {
    return (
      <Dialog
        open={showConflicts}
        onClose={() => setShowConflicts(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="error" />
            <Typography variant="h6">
              Conflict Resolution ({state.conflicts.length})
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {state.conflicts.length === 0 ? (
            <Alert severity="success">
              No conflicts to resolve
            </Alert>
          ) : (
            <List>
              {state.conflicts.map((conflict, index) => (
                <React.Fragment key={conflict.id}>
                  <ListItem>
                    <ListItemText
                      primary={`Conflict #${index + 1}`}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Change ID: {conflict.changeId}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Resolved by: {conflict.resolvedBy}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Time: {conflict.timestamp.toLocaleString()}
                          </Typography>
                          {conflict.comment && (
                            <Typography variant="body2" color="text.secondary">
                              Comment: {conflict.comment}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Accept">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => {
                              onResolveConflict?.(conflict.id, 'accept');
                              setShowConflicts(false);
                            }}
                          >
                            <AcceptIcon />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Reject">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              onResolveConflict?.(conflict.id, 'reject');
                              setShowConflicts(false);
                            }}
                          >
                            <RejectIcon />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Merge">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              onResolveConflict?.(conflict.id, 'merge');
                              setShowConflicts(false);
                            }}
                          >
                            <MergeIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < state.conflicts.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setShowConflicts(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderHistoryDialog = () => {
    return (
      <Dialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon />
              <Typography variant="h6">
                Collaboration History
              </Typography>
            </Box>
            <IconButton onClick={() => setShowHistory(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Recent Changes ({state.changes.length})
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={Math.min((state.changes.length / 100) * 100, 100)} 
              sx={{ mb: 1 }}
            />
          </Box>
          
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {state.changes.slice(-20).reverse().map((change, index) => (
              <ListItem key={change.id}>
                <ListItemText
                  primary={`${change.type} - ${change.fieldId}`}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        User: {change.userId}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Time: {change.timestamp.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Version: {change.version}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setShowHistory(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!showToolbar) return null;

  return (
    <>
      <motion.div
        initial={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Toolbar sx={{ ...getPositionStyles(), ...sx }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            {/* Connection Status */}
            {renderConnectionStatus()}
            
            <Divider orientation="vertical" flexItem />
            
            {/* Undo/Redo */}
            {renderUndoRedo()}
            
            <Divider orientation="vertical" flexItem />
            
            {/* Conflict Indicator */}
            {renderConflictIndicator()}
            
            <Divider orientation="vertical" flexItem />
            
            {/* Visibility Controls */}
            {renderVisibilityControls()}
            
            <Box sx={{ flex: 1 }} />
            
            {/* Actions */}
            {renderActions()}
          </Box>
        </Toolbar>
      </motion.div>

      {/* Dialogs */}
      {renderConflictDialog()}
      {renderHistoryDialog()}
    </>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default CollaborationToolbar; 