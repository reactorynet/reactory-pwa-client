import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Fab,
  Tooltip,
  TooltipProps,
  Box,
  IconButton,
  Typography,
  Paper,
  alpha,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { glassOverlayStyle } from '../utils';

export interface ToolWindowAction {
  icon: React.ReactNode;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  disabled?: boolean;
  tooltipProps?: Partial<TooltipProps>;
}

export interface AgentToolWindowBarProps {
  actions: ToolWindowAction[];
  mainIcon: React.ReactNode;
  mainLabel?: string;
  mainColor?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  mainSize?: 'small' | 'medium' | 'large';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  spacing?: number;
  /** Page size for the grid. Default 8 (4 columns x 2 rows). */
  pageSize?: number;
  columns?: number;
  rows?: number;
  openDelay?: number;
  disabled?: boolean;
  className?: string;
  sx?: any;
  mainSx?: any;
  onMainClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  mainClickLabel?: string;
  mode?: 'dark' | 'light' | string;
}

const SLOTS_PER_PAGE = 8;
const GRID_COLUMNS = 4;
const GRID_ROWS = 2;
const SLOT_SIZE = 60;

/**
 * Agent toolwindow shortcut bar.
 *
 * Replaces the radial fan-out FAB with a compact 4x2 grid popover that
 * paginates when there are more than `pageSize` actions. Designed to host
 * panel toggles, plugin buttons, and MCP connectors as the agent ecosystem
 * grows — pagination keeps the popover footprint stable.
 *
 * Trigger behaviour matches the previous RadialFab: hover-to-open on desktop,
 * long-press on mobile, click-outside to dismiss. Clicking the main FAB
 * triggers `onMainClick` (e.g., open the persona panel) and dismisses the grid.
 */
const AgentToolWindowBar: React.FC<AgentToolWindowBarProps> = ({
  actions,
  mainIcon,
  mainLabel = 'Open menu',
  mainColor = 'primary',
  mainSize = 'small',
  position = 'bottom-right',
  spacing = 16,
  pageSize = SLOTS_PER_PAGE,
  columns = GRID_COLUMNS,
  rows = GRID_ROWS,
  openDelay = 0,
  disabled = false,
  className,
  sx,
  mainSx,
  onMainClick,
  mode = 'dark',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [isHoverDisabled, setIsHoverDisabled] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useRef(false);

  const pageCount = Math.max(1, Math.ceil(actions.length / pageSize));
  const safePage = Math.min(currentPage, pageCount - 1);
  const pageActions = actions.slice(safePage * pageSize, (safePage + 1) * pageSize);

  useEffect(() => {
    const checkMobile = () => {
      isMobile.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (currentPage > pageCount - 1) setCurrentPage(0);
  }, [pageCount, currentPage]);

  const handleMouseEnter = useCallback(() => {
    if (disabled || isMobile.current || isHoverDisabled) return;
    if (openDelay > 0) {
      setTimeout(() => setIsOpen(true), openDelay);
    } else {
      setIsOpen(true);
    }
  }, [disabled, openDelay, isHoverDisabled]);

  const handleMouseLeave = useCallback(() => {
    if (isMobile.current) return;
  }, []);

  const handleTouchStart = useCallback((evt: React.TouchEvent) => {
    if (disabled || !isMobile.current) return;
    evt.preventDefault();
    longPressTimeout.current = setTimeout(() => {
      setIsLongPressed(true);
      setIsOpen(true);
    }, 500);
  }, [disabled]);

  const handleTouchEnd = useCallback(() => {
    if (disabled || !isMobile.current) return;
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    setIsLongPressed(false);
  }, [disabled]);

  const handleTouchMove = useCallback(() => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    setIsLongPressed(false);
  }, []);

  const handleMainClick = useCallback((evt: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    setIsOpen(false);
    setIsLongPressed(false);
    setIsHoverDisabled(true);
    setTimeout(() => setIsHoverDisabled(false), 1000);
    if (onMainClick) onMainClick(evt);
  }, [disabled, onMainClick]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;
      const target = event.target as Element;
      const container = document.querySelector(
        `[data-tool-window-bar="${className || 'agent-tool-window-bar'}"]`,
      );
      if (container && !container.contains(target)) {
        setIsOpen(false);
        setIsLongPressed(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, className]);

  const handleActionClick = useCallback(
    (action: ToolWindowAction) => (event: React.MouseEvent<HTMLButtonElement>) => {
      action.onClick(event);
      setIsOpen(false);
    },
    [],
  );

  const containerStyles = useMemo(() => {
    const base = { position: 'fixed' as const, zIndex: 1000 };
    switch (position) {
      case 'bottom-left':
        return { ...base, bottom: spacing, left: spacing };
      case 'top-right':
        return { ...base, top: spacing, right: spacing };
      case 'top-left':
        return { ...base, top: spacing, left: spacing };
      case 'bottom-right':
      default:
        return { ...base, bottom: spacing, right: spacing };
    }
  }, [position, spacing]);

  const popoverVertical = position.includes('bottom')
    ? { bottom: '100%', mb: 1 }
    : { top: '100%', mt: 1 };
  const popoverHorizontal = position.includes('right') ? { right: 0 } : { left: 0 };
  const transformOrigin = position.includes('bottom')
    ? position.includes('right') ? 'bottom right' : 'bottom left'
    : position.includes('right') ? 'top right' : 'top left';

  const gridWidth = columns * SLOT_SIZE + (columns - 1) * 4;

  return (
    <Box
      className={className}
      data-tool-window-bar={className || 'agent-tool-window-bar'}
      sx={{ ...containerStyles, ...sx }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {isOpen && (
        <Paper
          elevation={4}
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: 'absolute',
            ...popoverVertical,
            ...popoverHorizontal,
            p: 0.75,
            borderRadius: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            ...glassOverlayStyle(mode),
            boxShadow: (t) => t.shadows[8],
            '@keyframes agentToolWindowBarRise': {
              '0%': { opacity: 0, transform: 'translateY(6px) scale(0.96)' },
              '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
            },
            animation: 'agentToolWindowBarRise 180ms ease-out',
            transformOrigin,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {pageCount > 1 && (
              <IconButton
                size="small"
                disabled={safePage === 0}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                sx={{ p: 0.25, color: 'text.secondary' }}
                aria-label="Previous page"
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, ${SLOT_SIZE}px)`,
                gridTemplateRows: `repeat(${rows}, ${SLOT_SIZE}px)`,
                gap: 0.5,
                width: gridWidth,
              }}
            >
              {Array.from({ length: pageSize }).map((_, slotIdx) => {
                const action = pageActions[slotIdx];
                if (!action) {
                  return (
                    <Box
                      key={`empty-${slotIdx}`}
                      sx={{ width: SLOT_SIZE, height: SLOT_SIZE, opacity: 0 }}
                    />
                  );
                }
                return (
                  <Tooltip
                    key={`action-${slotIdx}`}
                    title={action.label}
                    placement="top"
                    {...action.tooltipProps}
                  >
                    <Box
                      component="button"
                      onClick={handleActionClick(action)}
                      disabled={action.disabled || disabled}
                      sx={{
                        width: SLOT_SIZE,
                        height: SLOT_SIZE,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.25,
                        p: 0.5,
                        border: '1px solid',
                        borderColor: 'transparent',
                        borderRadius: 1,
                        bgcolor: 'transparent',
                        color: 'text.primary',
                        cursor: action.disabled ? 'not-allowed' : 'pointer',
                        opacity: action.disabled ? 0.4 : 1,
                        transition: 'all 0.15s ease',
                        fontFamily: 'inherit',
                        '&:hover': {
                          bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                          borderColor: (t) => alpha(t.palette.primary.main, 0.4),
                        },
                        '&:focus-visible': {
                          outline: '2px solid',
                          outlineColor: 'primary.main',
                          outlineOffset: 1,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {action.icon}
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.62rem',
                          lineHeight: 1.1,
                          maxWidth: SLOT_SIZE - 4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          textAlign: 'center',
                          color: 'text.secondary',
                          userSelect: 'none',
                        }}
                      >
                        {action.label}
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>

            {pageCount > 1 && (
              <IconButton
                size="small"
                disabled={safePage >= pageCount - 1}
                onClick={() => setCurrentPage((p) => Math.min(pageCount - 1, p + 1))}
                sx={{ p: 0.25, color: 'text.secondary' }}
                aria-label="Next page"
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {pageCount > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, py: 0.25 }}>
              {Array.from({ length: pageCount }).map((_, i) => (
                <Box
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  sx={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    bgcolor: i === safePage ? 'primary.main' : 'action.disabled',
                    '&:hover': {
                      bgcolor: i === safePage ? 'primary.main' : 'text.secondary',
                    },
                  }}
                />
              ))}
            </Box>
          )}
        </Paper>
      )}

      <Fab
        color={mainColor}
        size={mainSize}
        onClick={handleMainClick}
        disabled={disabled}
        aria-label={mainLabel}
        sx={{
          position: 'relative',
          zIndex: 1001,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: (t) => t.shadows[8],
          },
          ...mainSx,
        }}
      >
        {mainIcon}
      </Fab>
    </Box>
  );
};

export default AgentToolWindowBar;
