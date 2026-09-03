import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Fab, Badge, Box, Tooltip, alpha } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { CommanderPosition, CommanderCoordinates } from './types';
import { getDockPositionStyle } from './styles';

export interface WorkflowCommanderFABProps {
  dock: CommanderPosition;
  customPosition?: CommanderCoordinates;
  onPositionChange: (dock: CommanderPosition, coords?: CommanderCoordinates) => void;
  badgeCount?: number;
  badgeColor?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  isBusy?: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  disabled?: boolean;
  mode?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const WorkflowCommanderFAB: React.FC<WorkflowCommanderFABProps> = ({
  dock,
  customPosition,
  onPositionChange,
  badgeCount = 0,
  badgeColor = 'error',
  isBusy = false,
  isOpen,
  onToggleOpen,
  onMouseEnter,
  onMouseLeave,
  disabled = false,
  mode = 'dark',
  className,
  style,
  children,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startLeft: number; startTop: number } | null>(null);
  const fabRef = useRef<HTMLDivElement | null>(null);
  const movedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    if (e.button !== 0) return; // Left click only

    // Don't initiate drag if clicking inside the popover or an interactive child
    const target = e.target as HTMLElement;
    if (target.closest('[data-commander-popover]')) {
      return;
    }

    const rect = fabRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startLeft: rect.left,
      startTop: rect.top,
    };
    movedRef.current = false;
    setIsDragging(true);

    if (fabRef.current) {
      fabRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      movedRef.current = true;
    }

    const newX = Math.max(10, Math.min(window.innerWidth - 65, dragStartRef.current.startLeft + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - 65, dragStartRef.current.startTop + dy));

    onPositionChange('custom', { x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    if (fabRef.current) {
      try {
        fabRef.current.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Safe ignore
      }
    }

    if (!movedRef.current) {
      onToggleOpen();
    } else {
      // Snap to nearest corner
      const rect = fabRef.current?.getBoundingClientRect();
      if (rect) {
        const midX = window.innerWidth / 2;
        const midY = window.innerHeight / 2;
        const isLeft = rect.left < midX;
        const isTop = rect.top < midY;

        let snapDock: CommanderPosition = 'top-right';
        if (isTop && isLeft) snapDock = 'top-left';
        else if (isTop && !isLeft) snapDock = 'top-right';
        else if (!isTop && isLeft) snapDock = 'bottom-left';
        else snapDock = 'bottom-right';

        onPositionChange(snapDock, undefined);
      }
    }

    dragStartRef.current = null;
  };

  const positionStyles = getDockPositionStyle(dock, customPosition);

  return (
    <Box
      ref={fabRef}
      className={className}
      data-workflow-commander-fab={className || 'workflow-commander-fab'}
      style={{ ...positionStyles, ...style }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{
        cursor: isDragging ? 'grabbing' : 'pointer',
        touchAction: 'none',
        userSelect: 'none',
        position: 'fixed',
        zIndex: 1400,
      }}
    >
      {/* Popover rendered inside this positioned root */}
      {isOpen && children}

      <Badge
        badgeContent={badgeCount}
        color={badgeColor as any}
        invisible={!badgeCount || badgeCount === 0}
        overlap="circular"
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          zIndex: 1401,
          '& .MuiBadge-badge': {
            fontSize: '0.72rem',
            fontWeight: 800,
            height: 20,
            minWidth: 20,
            padding: '0 4px',
            boxShadow: (t) => t.shadows[4],
          },
        }}
      >
        <Tooltip title="Workflow Commander (Click or hover to open, drag to move)" placement="left">
          <Fab
            color="primary"
            size="medium"
            disabled={disabled}
            aria-label="Workflow Commander"
            sx={{
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              bgcolor: mode === 'dark' ? '#00e5ff' : '#0288d1',
              color: '#0a0e1a',
              '&:hover': {
                transform: 'scale(1.1)',
                bgcolor: mode === 'dark' ? '#33ebff' : '#039be5',
                boxShadow: (t) =>
                  mode === 'dark'
                    ? '0 0 20px rgba(0, 229, 255, 0.6)'
                    : t.shadows[8],
              },
              ...(isBusy && {
                animation: 'activeCommanderPulse 1.6s infinite ease-in-out',
                border: '2px solid #00e5ff',
                boxShadow: '0 0 16px rgba(0, 229, 255, 0.75)',
                '@keyframes activeCommanderPulse': {
                  '0%, 100%': {
                    boxShadow: '0 0 8px rgba(0, 229, 255, 0.5)',
                    transform: 'scale(1)',
                  },
                  '50%': {
                    boxShadow: '0 0 22px rgba(0, 229, 255, 0.95)',
                    transform: 'scale(1.06)',
                  },
                },
              }),
            }}
          >
            <SpeedIcon sx={{ fontSize: 28 }} />
          </Fab>
        </Tooltip>
      </Badge>
    </Box>
  );
};

export default WorkflowCommanderFAB;
