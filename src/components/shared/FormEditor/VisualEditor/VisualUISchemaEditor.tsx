import React, { useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Collapse,
  Chip,
  Tooltip,
  Grid
} from '@mui/material';
import {
  Edit as EditIcon,
  ExpandMore,
  ExpandLess,
  ShortText,
  Numbers,
  CheckBox,
  DataArray,
  DataObject,
  VisibilityOff,
  DragIndicator
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { UIFieldSettingsDialog } from './UIFieldSettingsDialog';

interface VisualUISchemaEditorProps {
  schema: any;
  uiSchema: any;
  onChange: (uiSchema: any) => void;
}

const getIconForType = (type: string) => {
  switch (type) {
    case 'string': return <ShortText fontSize="small" />;
    case 'number':
    case 'integer': return <Numbers fontSize="small" />;
    case 'boolean': return <CheckBox fontSize="small" />;
    case 'array': return <DataArray fontSize="small" />;
    case 'object': return <DataObject fontSize="small" />;
    default: return <ShortText fontSize="small" />;
  }
};

const getOrderedKeys = (schema: any, uiSchema: any) => {
  if (!schema || !schema.properties) return [];
  const properties = Object.keys(schema.properties);
  const uiOrder = uiSchema?.['ui:order'] || [];
  
  // Filter out any uiOrder keys that don't exist in properties (cleanup)
  const validOrder = uiOrder.filter((key: string) => properties.includes(key));
  
  // Get remaining properties not in order
  const remaining = properties.filter((key: string) => !validOrder.includes(key));
  
  return [...validOrder, ...remaining];
};

interface UISchemaNodeProps {
  name: string;
  schema: any;
  uiSchema: any; // The UI schema specific to this node
  path: string;
  onEdit: (path: string, fieldType: string, currentUISchema: any) => void;
  level?: number;
  index: number;
}

const UISchemaNode: React.FC<UISchemaNodeProps> = ({
  name,
  schema,
  uiSchema = {},
  path,
  onEdit,
  level = 0,
  index
}) => {
  const [expanded, setExpanded] = useState(true);
  
  if (!schema) return null;

  const type = schema.type || 'string';
  const isContainer = type === 'object' || type === 'array';
  
  // Extract summary of UI config
  const widget = uiSchema['ui:widget'];
  const title = uiSchema['ui:title'];
  const hidden = widget === 'hidden' || uiSchema['ui:hidden'];
  
  const hasConfig = Object.keys(uiSchema).some(k => k.startsWith('ui:'));

  // Calculate ordered keys for children if object
  const childKeys = type === 'object' ? getOrderedKeys(schema, uiSchema) : [];

  return (
    <Draggable draggableId={`UI_FIELD/${path}`} index={index}>
      {(provided) => (
        <Box 
          ref={provided.innerRef}
          {...provided.draggableProps}
          sx={{ ml: level * 2, mb: 1 }}
        >
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 1, 
              display: 'flex', 
              alignItems: 'center', 
              backgroundColor: level % 2 === 0 ? 'action.hover' : 'background.paper',
              borderLeft: hasConfig ? '4px solid #1976d2' : undefined
            }}
          >
            <Box {...provided.dragHandleProps} sx={{ mr: 1, cursor: 'grab', display: 'flex', alignItems: 'center' }}>
              <DragIndicator fontSize="small" color="disabled" />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              {isContainer && (
                <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ mr: 1 }}>
                  {expanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              )}
              
              <Box sx={{ mr: 1, color: 'text.secondary', display: 'flex' }}>
                {getIconForType(type)}
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mr: 2 }}>
                {name}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {widget && <Chip label={`Widget: ${widget}`} size="small" variant="outlined" color="primary" />}
                {title && <Chip label={`Title: ${title}`} size="small" variant="outlined" />}
                {hidden && <Chip icon={<VisibilityOff />} label="Hidden" size="small" color="default" />}
              </Box>
            </Box>

            <Tooltip title="Edit UI Settings">
              <IconButton size="small" onClick={() => onEdit(path, type, uiSchema)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Paper>

          <Collapse in={expanded}>
            <Box sx={{ mt: 1 }}>
              {type === 'object' && (
                <Droppable droppableId={`UI_SCHEMA/${path}`} type={`UI_LEVEL_${level + 1}`}>
                  {(provided) => (
                    <Box ref={provided.innerRef} {...provided.droppableProps}>
                      {childKeys.map((key, idx) => (
                        <UISchemaNode
                          key={key}
                          name={key}
                          schema={schema.properties[key]}
                          uiSchema={uiSchema[key]}
                          path={`${path}.${key}`}
                          onEdit={onEdit}
                          level={level + 1}
                          index={idx}
                        />
                      ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              )}

              {type === 'array' && schema.items && (
                 <UISchemaNode
                    name="$items"
                    schema={schema.items}
                    uiSchema={uiSchema.items}
                    path={`${path}.items`}
                    onEdit={onEdit}
                    level={level + 1}
                    index={0}
                  />
              )}
            </Box>
          </Collapse>
        </Box>
      )}
    </Draggable>
  );
};

export const VisualUISchemaEditor: React.FC<VisualUISchemaEditorProps> = ({
  schema,
  uiSchema,
  onChange
}) => {
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    path: string;
    type: string;
    data: any;
  }>({ open: false, path: '', type: 'string', data: {} });

  const handleEdit = useCallback((path: string, type: string, currentData: any) => {
    setEditDialog({
      open: true,
      path,
      type,
      data: currentData
    });
  }, []);

  const handleSave = useCallback((path: string, newData: any) => {
    // Deep clone current UI schema
    const newUISchema = JSON.parse(JSON.stringify(uiSchema || {}));
    
    // Check if updating root
    if (path === 'ROOT') {
       // Merge newData into the root of newUISchema
       // But we need to be careful not to overwrite existing keys that were not in the form
       // Actually newData contains ONLY the keys from the form (which are mapped from ui: keys)
       // Wait, the UIFieldSettingsDialog returns data with 'ui:' prefixes already restored.
       
       // So newData has keys like 'ui:field', 'ui:options', etc.
       // We should merge these into newUISchema.
       
       Object.keys(newData).forEach(key => {
         newUISchema[key] = newData[key];
       });
       
       // Note: We are not deleting keys that were removed from the form because our form
       // handles a specific set of known keys. If the user clears a field in the form, 
       // it comes back as undefined or empty string?
       // The UIFieldSettingsDialog logic:
       // "dataToSave[uiKey] = value;"
       // It reconstructs dataToSave from localData.
       // It seems it only includes keys present in localData.
       
       onChange(newUISchema);
       return;
    }

    // Update the value at path
    const pathParts = path.split('.');
    let current = newUISchema;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) current[part] = {};
      current = current[part];
    }
    
    const lastPart = pathParts[pathParts.length - 1];
    
    // Filter out empty properties to keep schema clean
    const cleanData = Object.entries(newData).reduce((acc: any, [key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {});

    if (Object.keys(cleanData).length > 0) {
      current[lastPart] = cleanData;
    } else {
      delete current[lastPart];
    }

    onChange(newUISchema);
  }, [uiSchema, onChange]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    
    // If dropped in same position, do nothing
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;

    // Determine target container path
    const containerPath = destination.droppableId.replace('UI_SCHEMA/', '');
    const isRoot = destination.droppableId === 'ROOT';
    
    // Get schema at container level to find available properties
    let schemaContext = schema;
    let uiSchemaContext = JSON.parse(JSON.stringify(uiSchema || {})); // Deep clone
    
    if (!isRoot) {
      const pathParts = containerPath.split('.');
      let currentSchema = schema;
      let currentUI = uiSchemaContext;
      
      // Navigate to the container
      for (const part of pathParts) {
        if (currentSchema.properties) currentSchema = currentSchema.properties[part];
        else if (currentSchema.items && part === 'items') currentSchema = currentSchema.items;
        
        if (!currentUI[part]) currentUI[part] = {};
        currentUI = currentUI[part];
      }
      schemaContext = currentSchema;
      uiSchemaContext = currentUI;
    }

    // Determine current order
    const orderedKeys = getOrderedKeys(schemaContext, uiSchemaContext);
    
    // Move item
    const [removed] = orderedKeys.splice(source.index, 1);
    orderedKeys.splice(destination.index, 0, removed);
    
    // Update ui:order on the context
    uiSchemaContext['ui:order'] = orderedKeys;
    
    // If not root, we modified a nested object in the cloned uiSchema
    // Need to put it back into the full structure? 
    // Actually uiSchemaContext IS the reference to the nested object inside the clone because of how JS objects work
    // So modifying uiSchemaContext modifies the clone.
    
    // However, if isRoot, uiSchemaContext IS the newUISchema.
    // If !isRoot, we traversed down.
    // Let's verify traversal logic.
    
    const newFullUISchema = JSON.parse(JSON.stringify(uiSchema || {}));
    let targetContainer = newFullUISchema;
    
    if (!isRoot) {
      const pathParts = containerPath.split('.');
      for (const part of pathParts) {
        if (!targetContainer[part]) targetContainer[part] = {};
        targetContainer = targetContainer[part];
      }
    }
    
    targetContainer['ui:order'] = orderedKeys;
    
    onChange(newFullUISchema);

  }, [schema, uiSchema, onChange]);

  if (!schema || !schema.properties) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        <Typography>No schema properties defined. Define your data schema first.</Typography>
      </Box>
    );
  }

  const rootOrderedKeys = getOrderedKeys(schema, uiSchema);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Paper 
        variant="outlined" 
        sx={{ 
          p: 2, 
          mb: 2, 
          display: 'flex', 
          alignItems: 'center',
          backgroundColor: 'background.default',
          borderLeft: '4px solid #ed6c02' // Orange accent for Root
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <Typography variant="h6" sx={{ mr: 2 }}>
            Form Root Settings
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {uiSchema['ui:field'] && <Chip label={`Layout: ${uiSchema['ui:field']}`} size="small" color="secondary" />}
            {uiSchema['ui:title'] && <Chip label={`Title: ${uiSchema['ui:title']}`} size="small" variant="outlined" />}
          </Box>
        </Box>
        <Tooltip title="Edit Form Root Settings">
          <IconButton onClick={() => handleEdit('ROOT', 'root', uiSchema)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
      </Paper>

      <Droppable droppableId="ROOT" type="UI_LEVEL_0">
        {(provided) => (
          <Box ref={provided.innerRef} {...provided.droppableProps}>
            {rootOrderedKeys.map((key: string, idx: number) => (
              <UISchemaNode
                key={key}
                name={key}
                schema={schema.properties[key]}
                uiSchema={uiSchema[key]}
                path={key}
                onEdit={handleEdit}
                index={idx}
              />
            ))}
            {provided.placeholder}
          </Box>
        )}
      </Droppable>
      
      {editDialog.open && (
        <UIFieldSettingsDialog
          open={editDialog.open}
          onClose={() => setEditDialog({ ...editDialog, open: false })}
          onSave={handleSave}
          fieldKey={editDialog.path}
          fieldType={editDialog.type}
          currentUISchema={editDialog.data}
        />
      )}
    </DragDropContext>
  );
};

