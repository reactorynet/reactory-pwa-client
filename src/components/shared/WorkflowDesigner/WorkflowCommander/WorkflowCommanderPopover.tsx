import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Tooltip,
  Badge,
  alpha,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { CommanderAction, CommanderPosition } from './types';
import { glassmorphismStyle } from './styles';

const SLOTS_PER_PAGE = 8;
const GRID_COLUMNS = 4;
const GRID_ROWS = 2;
const SLOT_SIZE = 64;

export interface WorkflowCommanderPopoverProps {
  actions: CommanderAction[];
  mode?: string;
  dock?: CommanderPosition;
  onActionClick: (action: CommanderAction, event: React.MouseEvent<HTMLElement>) => void;
  className?: string;
}

export const WorkflowCommanderPopover: React.FC<WorkflowCommanderPopoverProps> = ({
  actions,
  mode = 'dark',
  dock = 'top-right',
  onActionClick,
  className,
}) => {
  const [currentPage, setCurrentPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(actions.length / SLOTS_PER_PAGE));
  const safePage = Math.min(currentPage, pageCount - 1);
  const pageActions = actions.slice(safePage * SLOTS_PER_PAGE, (safePage + 1) * SLOTS_PER_PAGE);

  useEffect(() => {
    if (currentPage > pageCount - 1) setCurrentPage(0);
  }, [pageCount, currentPage]);

  const popoverVertical = dock.includes('bottom')
    ? { bottom: '100%', mb: 1.5 }
    : { top: '100%', mt: 1.5 };
  const popoverHorizontal = dock.includes('right') ? { right: 0 } : { left: 0 };
  const transformOrigin = dock.includes('bottom')
    ? dock.includes('right') ? 'bottom right' : 'bottom left'
    : dock.includes('right') ? 'top right' : 'top left';

  const gridWidth = GRID_COLUMNS * SLOT_SIZE + (GRID_COLUMNS - 1) * 6;

  return (
    <Paper
      elevation={8}
      data-commander-popover="true"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className={className}
      sx={{
        position: 'absolute',
        ...popoverVertical,
        ...popoverHorizontal,
        p: 1,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        ...glassmorphismStyle(mode),
        '@keyframes commanderPopoverRise': {
          '0%': { opacity: 0, transform: 'translateY(6px) scale(0.96)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        animation: 'commanderPopoverRise 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        transformOrigin,
        zIndex: 1450,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {pageCount > 1 && (
          <IconButton
            size="small"
            disabled={safePage === 0}
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            sx={{ p: 0.25, color: 'text.secondary' }}
            aria-label="Previous actions"
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLUMNS}, ${SLOT_SIZE}px)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, ${SLOT_SIZE}px)`,
            gap: 0.75,
            width: gridWidth,
          }}
        >
          {Array.from({ length: SLOTS_PER_PAGE }).map((_, slotIdx) => {
            const action = pageActions[slotIdx];
            if (!action) {
              return (
                <Box
                  key={`empty-${slotIdx}`}
                  sx={{ width: SLOT_SIZE, height: SLOT_SIZE, opacity: 0 }}
                />
              );
            }

            const buttonContent = (
              <Box
                component="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onActionClick(action, e);
                }}
                disabled={action.disabled}
                sx={{
                  width: SLOT_SIZE,
                  height: SLOT_SIZE,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.4,
                  p: 0.5,
                  border: '1px solid',
                  borderColor: 'transparent',
                  borderRadius: 1.5,
                  bgcolor: 'transparent',
                  color: 'text.primary',
                  cursor: action.disabled ? 'not-allowed' : 'pointer',
                  opacity: action.disabled ? 0.4 : 1,
                  transition: 'all 0.15s ease',
                  fontFamily: 'inherit',
                  '&:hover': {
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.14),
                    borderColor: (t) => alpha(t.palette.primary.main, 0.45),
                    transform: 'translateY(-2px)',
                  },
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 1,
                  },
                }}
              >
                <Badge
                  badgeContent={action.badge}
                  color={(action.badgeColor as any) || 'error'}
                  invisible={!action.badge || action.badge === 0}
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      height: 18,
                      minWidth: 18,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {action.icon}
                  </Box>
                </Badge>

                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.62rem',
                    lineHeight: 1.15,
                    maxWidth: SLOT_SIZE - 4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textAlign: 'center',
                    color: 'text.secondary',
                    userSelect: 'none',
                    fontWeight: 500,
                  }}
                >
                  {action.label}
                </Typography>
              </Box>
            );

            return (
              <Tooltip
                key={action.id || `action-${slotIdx}`}
                title={action.tooltip || action.label}
                placement="top"
                {...(action.tooltipProps || {})}
              >
                {buttonContent}
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
            aria-label="Next actions"
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Pagination Dots */}
      {pageCount > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.75, py: 0.25 }}>
          {Array.from({ length: pageCount }).map((_, i) => (
            <Box
              key={i}
              onClick={() => setCurrentPage(i)}
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                cursor: 'pointer',
                bgcolor: i === safePage ? 'primary.main' : 'action.disabled',
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  bgcolor: i === safePage ? 'primary.main' : 'text.secondary',
                },
              }}
            />
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default WorkflowCommanderPopover;
