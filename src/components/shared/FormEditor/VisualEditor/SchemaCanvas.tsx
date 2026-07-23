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
import { flattenSchema, navigateToField, FlatRow } from './schemaTree';

interface SchemaCanvasProps {
  schema: any;
  onChange: (newSchema: any) => void;
  onEditField: (fieldName: string, fieldSchema: any) => void;
  onDeleteField: (fieldName: string) => void;
}

const typeColor = (type: string): 'primary' | 'secondary' | 'default' =>
  type === 'object' ? 'primary' : type === 'array' ? 'secondary' : 'default';

/**
 * SchemaCanvas renders the schema as a single flat, depth-indented list inside
 * ONE Droppable. Nesting is performed with react-beautiful-dnd's `combine`
 * (drop a field directly ONTO a container card) rather than nested Droppables,
 * which rbd cannot resolve reliably. See ./schemaTree.ts for the rationale.
 */
const SchemaCanvas: React.FC<SchemaCanvasProps> = ({
  schema,
  onEditField,
  onDeleteField
}) => {
  const rows = flattenSchema(schema || {});

  const isRequired = (row: FlatRow): boolean => {
    if (row.isArrayItem) return false;
    const parent = navigateToField(schema, row.parentPath);
    return Array.isArray(parent?.required) && parent.required.includes(row.displayKey);
  };

  // Does this container row already have any child rows rendered beneath it?
  const hasChildren = (row: FlatRow): boolean =>
    rows.some((r) => r.parentPath === row.path);

  return (
    <Droppable droppableId="SCHEMA_CANVAS" isCombineEnabled>
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

          {rows.length === 0 ? (
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
            <Stack spacing={1}>
              {rows.map((row, index) => (
                <Draggable key={row.path} draggableId={`FIELD_${row.path}`} index={index}>
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      style={{
                        ...dragProvided.draggableProps.style,
                        marginLeft: row.depth * 24
                      }}
                    >
                      <Card
                        variant="outlined"
                        sx={{
                          bgcolor: 'background.paper',
                          boxShadow: dragSnapshot.isDragging ? 3 : 0,
                          // Highlight when a dragged field can nest into this
                          // container card (react-beautiful-dnd "combine").
                          borderColor: dragSnapshot.combineTargetFor
                            ? 'primary.main'
                            : row.isContainer
                              ? 'primary.light'
                              : 'divider',
                          borderStyle: dragSnapshot.combineTargetFor ? 'dashed' : 'solid',
                          borderWidth: dragSnapshot.combineTargetFor ? 2 : 1
                        }}
                      >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Box sx={{ cursor: 'grab', color: 'text.disabled', display: 'flex' }}>
                              <DragIndicator fontSize="small" />
                            </Box>

                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                <Typography variant="body2" fontWeight="bold" noWrap>
                                  {row.field?.title || row.displayKey}
                                </Typography>
                                <Chip
                                  label={row.field?.type || 'unknown'}
                                  size="small"
                                  color={typeColor(row.field?.type) as any}
                                  variant="outlined"
                                  sx={{ height: 20, textTransform: 'capitalize' }}
                                />
                                {row.isArrayItem && (
                                  <Chip label="items" size="small" variant="outlined" sx={{ height: 20 }} />
                                )}
                                {isRequired(row) && (
                                  <Chip label="Required" size="small" color="error" variant="outlined" sx={{ height: 20 }} />
                                )}
                                {row.isContainer && !hasChildren(row) && (
                                  <Typography variant="caption" color="text.secondary">
                                    — drop a field here to nest
                                  </Typography>
                                )}
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                Key: {row.path}
                              </Typography>
                            </Box>

                            <Stack direction="row">
                              <IconButton size="small" onClick={() => onEditField(row.path, row.field)}>
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => onDeleteField(row.path)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Stack>
          )}
        </Paper>
      )}
    </Droppable>
  );
};

export default SchemaCanvas;
