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

// Component to render array items
interface ArrayFieldProps {
  fieldKey: string;
  field: any;
  schema: any;
  onEditField: (fieldName: string, fieldSchema: any) => void;
  onDeleteField: (fieldName: string) => void;
  isNested?: boolean;
}

const ArrayField: React.FC<ArrayFieldProps> = ({ 
  fieldKey, 
  field, 
  schema, 
  onEditField, 
  onDeleteField,
  isNested = false
}) => {
  const items = field.items;
  const hasItems = items && (Object.keys(items).length > 0);

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        bgcolor: 'background.paper',
        mb: 2
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Box className="drag-handle" sx={{ cursor: 'grab', color: 'text.disabled', display: 'flex' }}>
            <DragIndicator />
          </Box>
          
          <Box sx={{ flexGrow: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle1" fontWeight="bold">
                {field.title || fieldKey}
              </Typography>
              <Chip 
                label="Array" 
                size="small" 
                color="secondary" 
                variant="outlined" 
                sx={{ textTransform: 'capitalize' }}
              />
              {schema.required?.includes(fieldKey) && (
                <Chip label="Required" size="small" color="error" variant="outlined" />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Key: {fieldKey}
            </Typography>
          </Box>

          <Stack direction="row">
            <IconButton size="small" onClick={() => onEditField(fieldKey, field)}>
              <Edit fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => onDeleteField(fieldKey)}>
              <Delete fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        <Droppable droppableId={`SCHEMA_CANVAS.${fieldKey}.$itemsDef`} isDropDisabled={hasItems}>
          {(provided, snapshot) => (
            <Box
              ref={provided.innerRef}
              {...provided.droppableProps}
              sx={{
                minHeight: 80,
                bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.default',
                border: '1px dashed',
                borderColor: hasItems ? 'transparent' : 'divider',
                borderRadius: 1,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              {!hasItems ? (
                <Typography variant="body2" color="text.secondary" align="center">
                  Drag items schema here (single item allowed)
                </Typography>
              ) : (
                <Draggable key={`${fieldKey}_items`} draggableId={`FIELD_${fieldKey}.items`} index={0} isDragDisabled={true}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      {items.type === 'object' ? (
                        <ObjectField 
                          fieldKey={`${fieldKey}.items`}
                          field={items}
                          schema={field}
                          onEditField={onEditField}
                          onDeleteField={onDeleteField}
                          isNested={true}
                        />
                      ) : items.type === 'array' ? (
                        <ArrayField
                          fieldKey={`${fieldKey}.items`}
                          field={items}
                          schema={field}
                          onEditField={onEditField}
                          onDeleteField={onDeleteField}
                          isNested={true}
                        />
                      ) : (
                        <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                          <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <Box sx={{ flexGrow: 1 }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <Typography variant="body2" fontWeight="bold">
                                    Items Schema: {items.title || 'Untitled'}
                                  </Typography>
                                  <Chip label={items.type} size="small" variant="outlined" sx={{ height: 20 }} />
                                </Stack>
                              </Box>
                              <Stack direction="row">
                                <IconButton size="small" onClick={() => onEditField(`${fieldKey}.items`, items)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => onDeleteField(`${fieldKey}.items`)}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </Draggable>
              )}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );
};

// Recursive component to render object properties
interface ObjectFieldProps {
  fieldKey: string;
  field: any;
  schema: any;
  onEditField: (fieldName: string, fieldSchema: any) => void;
  onDeleteField: (fieldName: string) => void;
  isNested?: boolean;
}

const ObjectField: React.FC<ObjectFieldProps> = ({ 
  fieldKey, 
  field, 
  schema, 
  onEditField, 
  onDeleteField,
  isNested = false
}) => {
  const properties = field.properties || {};
  const propertyKeys = Object.keys(properties);

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        bgcolor: 'background.paper',
        mb: 2
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Box className="drag-handle" sx={{ cursor: 'grab', color: 'text.disabled', display: 'flex' }}>
            <DragIndicator />
          </Box>
          
          <Box sx={{ flexGrow: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle1" fontWeight="bold">
                {field.title || fieldKey}
              </Typography>
              <Chip 
                label={field.type} 
                size="small" 
                color="primary" 
                variant="outlined" 
                sx={{ textTransform: 'capitalize' }}
              />
              {schema.required?.includes(fieldKey) && (
                <Chip label="Required" size="small" color="error" variant="outlined" />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Key: {fieldKey}
            </Typography>
          </Box>

          <Stack direction="row">
            <IconButton size="small" onClick={() => onEditField(fieldKey, field)}>
              <Edit fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => onDeleteField(fieldKey)}>
              <Delete fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        <Droppable droppableId={`SCHEMA_CANVAS.${fieldKey}`}>
          {(provided, snapshot) => (
            <Box
              ref={provided.innerRef}
              {...provided.droppableProps}
              sx={{
                minHeight: 100,
                bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.default',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                p: 2
              }}
            >
              {propertyKeys.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center">
                  Drag fields here
                </Typography>
              ) : (
                propertyKeys.map((key, index) => {
                  const nestedField = properties[key];
                  return (
                    <Draggable key={key} draggableId={`FIELD_${fieldKey}.${key}`} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{ ...provided.draggableProps.style, marginBottom: 8 }}
                        >
                          {nestedField.type === 'object' ? (
                            <ObjectField 
                              fieldKey={`${fieldKey}.${key}`}
                              field={nestedField}
                              schema={field}
                              onEditField={onEditField}
                              onDeleteField={onDeleteField}
                              isNested={true}
                            />
                          ) : nestedField.type === 'array' ? (
                            <ArrayField
                              fieldKey={`${fieldKey}.${key}`}
                              field={nestedField}
                              schema={field}
                              onEditField={onEditField}
                              onDeleteField={onDeleteField}
                              isNested={true}
                            />
                          ) : (
                            <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                              <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                <Stack direction="row" alignItems="center" spacing={2}>
                                  <Box sx={{ cursor: 'grab', color: 'text.disabled', display: 'flex' }}>
                                    <DragIndicator />
                                  </Box>
                                  <Box sx={{ flexGrow: 1 }}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                      <Typography variant="body2" fontWeight="bold">
                                        {nestedField.title || key}
                                      </Typography>
                                      <Chip label={nestedField.type} size="small" variant="outlined" sx={{ height: 20 }} />
                                    </Stack>
                                  </Box>
                                  <Stack direction="row">
                                    <IconButton size="small" onClick={() => onEditField(`${fieldKey}.${key}`, nestedField)}>
                                      <Edit fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" color="error" onClick={() => onDeleteField(`${fieldKey}.${key}`)}>
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Stack>
                                </Stack>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })
              )}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );
};

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
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        {field.type === 'object' ? (
                          <ObjectField 
                            fieldKey={key}
                            field={field}
                            schema={schema}
                            onEditField={onEditField}
                            onDeleteField={onDeleteField}
                          />
                        ) : field.type === 'array' ? (
                          <ArrayField
                            fieldKey={key}
                            field={field}
                            schema={schema}
                            onEditField={onEditField}
                            onDeleteField={onDeleteField}
                          />
                        ) : (
                          <Card
                            variant="outlined"
                            sx={{
                              bgcolor: 'background.paper',
                              boxShadow: snapshot.isDragging ? 3 : 0,
                              ...provided.draggableProps.style
                            }}
                          >
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                              <Stack direction="row" alignItems="center" spacing={2}>
                                <Box sx={{ cursor: 'grab', color: 'text.disabled', display: 'flex' }}>
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
                      </div>
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