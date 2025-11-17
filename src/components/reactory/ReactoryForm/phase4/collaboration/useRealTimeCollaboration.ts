/**
 * Phase 4.1: Real-time Collaboration Hook
 * Comprehensive real-time collaboration system for ReactoryForm
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

export interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  isOnline: boolean;
  lastSeen: Date;
  cursorPosition?: CursorPosition;
  selections?: Selection[];
}

export interface CursorPosition {
  x: number;
  y: number;
  fieldId: string;
  timestamp: Date;
}

export interface Selection {
  start: number;
  end: number;
  fieldId: string;
  text: string;
  timestamp: Date;
}

export interface CollaborationChange {
  id: string;
  userId: string;
  type: 'insert' | 'delete' | 'update' | 'move';
  fieldId: string;
  value: any;
  timestamp: Date;
  version: number;
  metadata?: Record<string, any>;
}

export interface ConflictResolution {
  id: string;
  changeId: string;
  resolvedBy: string;
  resolution: 'accept' | 'reject' | 'merge';
  timestamp: Date;
  comment?: string;
}

export interface CollaborationState {
  users: CollaborationUser[];
  changes: CollaborationChange[];
  conflicts: ConflictResolution[];
  isConnected: boolean;
  isCollaborating: boolean;
  currentUser: CollaborationUser | null;
  undoStack: CollaborationChange[];
  redoStack: CollaborationChange[];
}

export interface CollaborationConfig {
  /** Whether to enable real-time collaboration */
  enabled?: boolean;
  /** WebSocket connection URL */
  wsUrl?: string;
  /** Room/Form ID for collaboration */
  roomId?: string;
  /** User information */
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  /** Conflict resolution strategy */
  conflictResolution?: 'last-write-wins' | 'manual' | 'merge';
  /** Auto-save interval in milliseconds */
  autoSaveInterval?: number;
  /** Maximum undo/redo stack size */
  maxUndoStack?: number;
  /** Whether to show presence indicators */
  showPresence?: boolean;
  /** Whether to show cursors */
  showCursors?: boolean;
  /** Whether to show selections */
  showSelections?: boolean;
  /** Whether to enable undo/redo */
  enableUndoRedo?: boolean;
  /** Whether to enable conflict resolution */
  enableConflictResolution?: boolean;
  /** Custom event handlers */
  onUserJoin?: (user: CollaborationUser) => void;
  onUserLeave?: (user: CollaborationUser) => void;
  onChange?: (change: CollaborationChange) => void;
  onConflict?: (conflict: ConflictResolution) => void;
  onConnectionChange?: (connected: boolean) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export const useRealTimeCollaboration = (config: CollaborationConfig = {}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [state, setState] = useState<CollaborationState>({
    users: [],
    changes: [],
    conflicts: [],
    isConnected: false,
    isCollaborating: false,
    currentUser: null,
    undoStack: [],
    redoStack: [],
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const changeBufferRef = useRef<CollaborationChange[]>([]);

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const {
    enabled = true,
    wsUrl = 'ws://localhost:8080/collaboration',
    roomId = 'default-room',
    user,
    conflictResolution = 'last-write-wins',
    autoSaveInterval = 5000,
    maxUndoStack = 50,
    showPresence = true,
    showCursors = true,
    showSelections = true,
    enableUndoRedo = true,
    enableConflictResolution = true,
    onUserJoin,
    onUserLeave,
    onChange,
    onConflict,
    onConnectionChange,
  } = config;

  // ============================================================================
  // WEBSOCKET CONNECTION
  // ============================================================================

  const connect = useCallback(() => {
    if (!enabled || !wsUrl) return;

    try {
      wsRef.current = new WebSocket(`${wsUrl}?roomId=${roomId}&userId=${user?.id || 'anonymous'}`);

      wsRef.current.onopen = () => {
        setState(prev => ({ ...prev, isConnected: true }));
        onConnectionChange?.(true);
        
        // Send user join message
        if (user) {
          const joinMessage = {
            type: 'user-join',
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
              color: generateUserColor(user.id),
              isOnline: true,
              lastSeen: new Date(),
            },
          };
          wsRef.current?.send(JSON.stringify(joinMessage));
        }
      };

      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleIncomingMessage(message);
      };

      wsRef.current.onclose = () => {
        setState(prev => ({ ...prev, isConnected: false }));
        onConnectionChange?.(false);
        
        // Attempt to reconnect
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect to collaboration server:', error);
    }
  }, [enabled, wsUrl, roomId, user, onConnectionChange]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  const handleIncomingMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'user-join':
        handleUserJoin(message.user);
        break;
      case 'user-leave':
        handleUserLeave(message.userId);
        break;
      case 'cursor-update':
        handleCursorUpdate(message.userId, message.cursor);
        break;
      case 'selection-update':
        handleSelectionUpdate(message.userId, message.selection);
        break;
      case 'change':
        handleChange(message.change);
        break;
      case 'conflict':
        handleConflict(message.conflict);
        break;
      case 'sync':
        handleSync(message.state);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }, []);

  const handleUserJoin = useCallback((user: CollaborationUser) => {
    setState(prev => ({
      ...prev,
      users: [...prev.users.filter(u => u.id !== user.id), user],
    }));
    onUserJoin?.(user);
  }, [onUserJoin]);

  const handleUserLeave = useCallback((userId: string) => {
    setState(prev => {
      const updatedUsers = prev.users.map(user => 
        user.id === userId 
          ? { ...user, isOnline: false, lastSeen: new Date() }
          : user
      );
      const leavingUser = prev.users.find(u => u.id === userId);
      if (leavingUser) {
        onUserLeave?.(leavingUser);
      }
      return {
        ...prev,
        users: updatedUsers,
      };
    });
  }, [onUserLeave]);

  const handleCursorUpdate = useCallback((userId: string, cursor: CursorPosition) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(user => 
        user.id === userId 
          ? { ...user, cursorPosition: cursor }
          : user
      ),
    }));
  }, []);

  const handleSelectionUpdate = useCallback((userId: string, selection: Selection) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(user => 
        user.id === userId 
          ? { ...user, selections: [...(user.selections || []), selection] }
          : user
      ),
    }));
  }, []);

  const handleChange = useCallback((change: CollaborationChange) => {
    setState(prev => ({
      ...prev,
      changes: [...prev.changes, change],
    }));
    onChange?.(change);
  }, [onChange]);

  const handleConflict = useCallback((conflict: ConflictResolution) => {
    setState(prev => ({
      ...prev,
      conflicts: [...prev.conflicts, conflict],
    }));
    onConflict?.(conflict);
  }, [onConflict]);

  const handleSync = useCallback((syncState: Partial<CollaborationState>) => {
    setState(prev => ({ ...prev, ...syncState }));
  }, []);

  // ============================================================================
  // COLLABORATION ACTIONS
  // ============================================================================

  const sendChange = useCallback((change: Omit<CollaborationChange, 'id' | 'timestamp' | 'version'>) => {
    if (!wsRef.current || !state.isConnected) return;

    const fullChange: CollaborationChange = {
      ...change,
      id: uuidv4(),
      timestamp: new Date(),
      version: state.changes.length + 1,
    };

    // Add to local state
    setState(prev => ({
      ...prev,
      changes: [...prev.changes, fullChange],
    }));

    // Send to server
    const message = {
      type: 'change',
      change: fullChange,
    };
    wsRef.current.send(JSON.stringify(message));

    // Add to undo stack
    if (enableUndoRedo) {
      setState(prev => ({
        ...prev,
        undoStack: [...prev.undoStack.slice(-maxUndoStack + 1), fullChange],
        redoStack: [], // Clear redo stack when new change is made
      }));
    }
  }, [state.isConnected, state.changes.length, enableUndoRedo, maxUndoStack]);

  const updateCursor = useCallback((cursor: CursorPosition) => {
    if (!wsRef.current || !state.isConnected || !showCursors) return;

    const message = {
      type: 'cursor-update',
      cursor,
    };
    wsRef.current.send(JSON.stringify(message));
  }, [state.isConnected, showCursors]);

  const updateSelection = useCallback((selection: Selection) => {
    if (!wsRef.current || !state.isConnected || !showSelections) return;

    const message = {
      type: 'selection-update',
      selection,
    };
    wsRef.current.send(JSON.stringify(message));
  }, [state.isConnected, showSelections]);

  // ============================================================================
  // UNDO/REDO
  // ============================================================================

  const undo = useCallback(() => {
    if (!enableUndoRedo || state.undoStack.length === 0) return;

    const lastChange = state.undoStack[state.undoStack.length - 1];
    
    setState(prev => ({
      ...prev,
      undoStack: prev.undoStack.slice(0, -1),
      redoStack: [...prev.redoStack, lastChange],
    }));

    // Send undo message
    if (wsRef.current && state.isConnected) {
      const message = {
        type: 'undo',
        changeId: lastChange.id,
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, [enableUndoRedo, state.undoStack, state.isConnected]);

  const redo = useCallback(() => {
    if (!enableUndoRedo || state.redoStack.length === 0) return;

    const nextChange = state.redoStack[state.redoStack.length - 1];
    
    setState(prev => ({
      ...prev,
      redoStack: prev.redoStack.slice(0, -1),
      undoStack: [...prev.undoStack, nextChange],
    }));

    // Send redo message
    if (wsRef.current && state.isConnected) {
      const message = {
        type: 'redo',
        changeId: nextChange.id,
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, [enableUndoRedo, state.redoStack, state.isConnected]);

  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================

  const resolveConflict = useCallback((conflictId: string, resolution: 'accept' | 'reject' | 'merge') => {
    if (!enableConflictResolution) return;

    const conflict = state.conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    const resolutionData: ConflictResolution = {
      id: uuidv4(),
      changeId: conflict.changeId,
      resolvedBy: state.currentUser?.id || 'unknown',
      resolution,
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      conflicts: prev.conflicts.filter(c => c.id !== conflictId),
    }));

    // Send resolution to server
    if (wsRef.current && state.isConnected) {
      const message = {
        type: 'conflict-resolution',
        resolution: resolutionData,
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, [enableConflictResolution, state.conflicts, state.currentUser, state.isConnected]);

  // ============================================================================
  // UTILITIES
  // ============================================================================

  const generateUserColor = useCallback((userId: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    ];
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  }, []);

  const getOnlineUsers = useCallback(() => {
    return state.users.filter(user => user.isOnline);
  }, [state.users]);

  const getCurrentUser = useCallback(() => {
    return state.currentUser;
  }, [state.currentUser]);

  const canUndo = useCallback(() => {
    return enableUndoRedo && state.undoStack.length > 0;
  }, [enableUndoRedo, state.undoStack.length]);

  const canRedo = useCallback(() => {
    return enableUndoRedo && state.redoStack.length > 0;
  }, [enableUndoRedo, state.redoStack.length]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Connect on mount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Auto-save changes
  useEffect(() => {
    if (autoSaveInterval > 0) {
      autoSaveIntervalRef.current = setInterval(() => {
        if (changeBufferRef.current.length > 0) {
          // Send buffered changes
          changeBufferRef.current.forEach(change => {
            sendChange(change);
          });
          changeBufferRef.current = [];
        }
      }, autoSaveInterval);

      return () => {
        if (autoSaveIntervalRef.current) {
          clearInterval(autoSaveIntervalRef.current);
        }
      };
    }
  }, [autoSaveInterval, sendChange]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    state,
    
    // Connection
    connect,
    disconnect,
    isConnected: state.isConnected,
    
    // Collaboration
    sendChange,
    updateCursor,
    updateSelection,
    
    // Undo/Redo
    undo,
    redo,
    canUndo: canUndo(),
    canRedo: canRedo(),
    
    // Conflict Resolution
    resolveConflict,
    
    // Utilities
    getOnlineUsers,
    getCurrentUser,
    generateUserColor,
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export default useRealTimeCollaboration; 