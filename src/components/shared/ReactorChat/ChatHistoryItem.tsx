import React from 'react';
import { IconButton, ListItem, ListItemText, Avatar, ListItemAvatar } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const ChatHistoryItem = ({ label, onSelect, onDelete, chat, persona }) => (
  <ListItem alignItems='flex-start'        
    onClick={() => onSelect(chat)}
    secondaryAction={
      <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); onDelete(chat.id); }}>
        <DeleteIcon />
      </IconButton>
    }
    sx={{ pr: 6 }}
  > 
    <ListItemAvatar>
      <Avatar
        sizes='small' 
        src={persona?.avatar}
        alt={persona?.name}
      />
    </ListItemAvatar>
    <ListItemText 
      primary={persona.name}  
      secondary={label}
      />
  </ListItem>
);

export default ChatHistoryItem;
