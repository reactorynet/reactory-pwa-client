import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  Box, 
  Paper, 
  Typography, 
  Card, 
  CardContent, 
  IconButton, 
  Chip,
  Stack
} from '@mui/material';
import { Delete, Edit, DragIndicator } from '@mui/icons-material';

interface SchemaCanvasProps {
  schema: any;
  onChange: (newSchema: any) => void;
  onEditField: (fieldName: string, fieldSchema: any) => void;
  onDeleteField: (fieldName: string) => void;
}

const SchemaCanvas: React.FC<SchemaCanvasProps> = ({ 
  schema, 
  onChange,
  onEditField,
  onDeleteField 
}) => {
  // Convert properties object to array for display
  // We filter out any non-property keys if any
  const properties = schema?.properties || {};
  const propertyKeys = Object.keys(properties);

  return (
    <Droppable droppableId="SCHEMA_CANVAS">
      {(provided, snapshot) => (
        <Paper
          elevation={1}
          ref={provided.innerRef}
          {...provided.droppableProps}
          sx={{ 
            p: 3, 
            height: '100%', 
            minHeight: 400, 
            bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.default',
            transition: 'background-color 0.2s'
          }}
        >
          <Typography variant="h6" gutterBottom>
            Form Schema Canvas
          </Typography>
          
          {propertyKeys.length === 0 ? (
            <Box 
              sx={{ 
                height: 200, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                color: 'text.secondary'
              }}
            >
              <Typography>Drag fields here to start building</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {propertyKeys.map((key, index) => {
                const field = properties[key];
                return (
                  <Draggable key={key} draggableId={`FIELD_${key}`} index={index}>
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        variant="outlined"
                        sx={{
                          bgcolor: 'background.paper',
                          boxShadow: snapshot.isDragging ? 3 : 0,
                          ...provided.draggableProps.style
                        }}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Box {...provided.dragHandleProps} sx={{ cursor: 'grab', color: 'text.disabled', display: 'flex' }}>
                              <DragIndicator />
                            </Box>
                            
                            <Box sx={{ flexGrow: 1 }}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                  {field.title || key}
                                </Typography>
                                <Chip 
                                  label={field.type} 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined" 
                                  sx={{ textTransform: 'capitalize' }}
                                />
                                {schema.required?.includes(key) && (
                                  <Chip label="Required" size="small" color="error" variant="outlined" />
                                )}
                              </Stack>
                              <Typography variant="body2" color="text.secondary">
                                Key: {key}
                              </Typography>
                            </Box>

                            <Stack direction="row">
                              <IconButton size="small" onClick={() => onEditField(key, field)}>
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => onDeleteField(key)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </Stack>
          )}
        </Paper>
      )}
    </Droppable>
  );
};

export default SchemaCanvas;