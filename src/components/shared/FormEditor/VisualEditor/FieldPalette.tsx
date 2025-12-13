import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { Box, Paper, Typography, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import {
  TextFields,
  Numbers,
  CheckBox,
  CalendarToday,
  DataObject,
  DataArray
} from '@mui/icons-material';

const FIELD_TYPES = [
  { type: 'string', label: 'Text Field', icon: <TextFields /> },
  { type: 'number', label: 'Number', icon: <Numbers /> },
  { type: 'boolean', label: 'Boolean', icon: <CheckBox /> },
  { type: 'string', format: 'date', label: 'Date', icon: <CalendarToday /> },
  { type: 'object', label: 'Object', icon: <DataObject /> },
  { type: 'array', label: 'Array', icon: <DataArray /> },
];

const FieldPalette = () => {
  return (
    <Droppable droppableId="FIELD_PALETTE" isDropDisabled={true}>
      {(provided, snapshot) => (
        <Paper 
          elevation={1} 
          sx={{ p: 2, height: '100%', minHeight: 400, bgcolor: 'background.paper' }}
          ref={provided.innerRef}
          {...provided.droppableProps}
        >
          <Typography variant="h6" gutterBottom>
            Field Types
          </Typography>
          <Typography variant="caption" display="block" sx={{ mb: 2, color: 'text.secondary' }}>
            Drag fields to the canvas
          </Typography>
          
          <List>
            {FIELD_TYPES.map((field, index) => (
              <Draggable key={field.label} draggableId={`PALETTE_${field.type}_${index}`} index={index}>
                {(provided, snapshot) => (
                  <ListItem
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    sx={{
                      mb: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.default',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        cursor: 'grab'
                      },
                      ...provided.draggableProps.style
                    }}
                  >
                    <ListItemIcon>
                      {field.icon}
                    </ListItemIcon>
                    <ListItemText primary={field.label} />
                  </ListItem>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </List>
        </Paper>
      )}
    </Droppable>
  );
};

export default FieldPalette;