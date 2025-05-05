import React from 'react';
import { IconButton, ListItem, ListItemText } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const ChatHistoryItem = ({ label, onSelect, onDelete, chat }) => (
  <ListItem
    button
    onClick={() => onSelect(chat)}
    secondaryAction={
      <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); onDelete(chat.id); }}>
        <DeleteIcon />
      </IconButton>
    }
    sx={{ pr: 6 }}
  >
    <ListItemText primary={label} />
  </ListItem>
);

export default ChatHistoryItem;
