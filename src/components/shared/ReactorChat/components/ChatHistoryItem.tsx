import React from 'react';
import { 
  IconButton, 
  ListItem, 
  ListItemText, 
  Avatar, 
  ListItemAvatar,
  Typography,
  Box,
  Tooltip,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { withReactory } from '@reactory/client-core/api/ApiProvider';

const ChatHistoryItem = ({ label, onSelect, onDelete, chat, persona, reactory, showDelete = false, onDoubleClick, isActive = false }) => {
  const clickTimeoutRef = React.useRef(null);
  const isDoubleClickRef = React.useRef(false);
  const [isHovered, setIsHovered] = React.useState(false);

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(chat.id);
  };

  const handleSelect = () => {
    if (isDoubleClickRef.current) {
      isDoubleClickRef.current = false;
      return;
    }
    onSelect(chat);
  };

  const handleClick = (e) => {
    if (clickTimeoutRef.current) {
      // This is a double-click
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      isDoubleClickRef.current = true;
      handleDoubleClick(e);
    } else {
      // This might be a single-click, wait to see if it becomes a double-click
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        if (!isDoubleClickRef.current) {
          handleSelect();
        }
      }, 300); // 300ms delay to detect double-click
    }
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    console.log('ChatHistoryItem double-click event triggered');
    if (onDoubleClick) {
      onDoubleClick();
    }
  };

  // Get relative time using humanDate
  const getRelativeTime = (date) => {
    if (!date) return '';
    try {
      return reactory?.utils?.humanDate?.relativeTime?.(new Date(date)) || '';
    } catch (error) {
      return '';
    }
  };

  // Truncate long labels
  const truncateLabel = (text, maxLength = 50) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const relativeTime = getRelativeTime(chat.created);
  const truncatedLabel = truncateLabel(label);

  return (
    <ListItem
      alignItems="flex-start"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        cursor: 'pointer',
        borderRadius: 1,
        mb: 0.5,
        transition: 'all 0.2s ease-in-out',
        backgroundColor: isActive ? 'primary.light' : 'transparent',
        border: isActive ? 1 : 0,
        borderColor: 'primary.main',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        '&:hover': {
          backgroundColor: isActive ? 'primary.light' : 'action.hover',
          transform: 'translateX(2px)',
        },
        '&:active': {
          transform: 'translateX(1px)',
        },
        pl: 1,
        pr: (isHovered || showDelete) ? 6 : 1, // Always leave space for delete button on hover
        py: 1,
      }}
    >
      <ListItemAvatar sx={{ minWidth: 40, mr: 1 }}>
        <Avatar
          src={persona?.avatar}
          alt={persona?.name}
          sx={{
            width: 36,
            height: 36,
            border: '2px solid',
            borderColor: isActive ? 'primary.main' : 'divider',
            borderWidth: isActive ? 3 : 2,
          }}
        >
          {persona?.name?.charAt(0) || 'G'}
        </Avatar>
      </ListItemAvatar>
      
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: isActive ? 'primary.main' : 'text.primary',
                lineHeight: 1.2,
              }}
            >
              {persona?.name || 'Assistant'}
            </Typography>
            {relativeTime && (
              <Chip
                label={relativeTime}
                size="small"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  '& .MuiChip-label': {
                    px: 1,
                  },
                }}
              />
            )}
          </Box>
        }
        secondary={
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {truncatedLabel}
          </Typography>
        }
      />
      
      {(isHovered || showDelete) && (
        <Tooltip title="Delete chat" placement="top">
          <IconButton
            edge="end"
            aria-label="delete"
            onClick={handleDelete}
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: isHovered ? 1 : 0.7,
              transition: 'opacity 0.2s ease-in-out',
              '&:hover': {
                opacity: 1,
                backgroundColor: 'error.light',
                color: 'error.contrastText',
              },
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </ListItem>
  );
};

export default withReactory(ChatHistoryItem);
