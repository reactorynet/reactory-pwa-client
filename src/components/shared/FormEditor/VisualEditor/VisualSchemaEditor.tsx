import React, { useCallback } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { Box, Grid } from '@mui/material';
import FieldPalette from './FieldPalette';
import SchemaCanvas from './SchemaCanvas';

interface VisualSchemaEditorProps {
  schema: any;
  onChange: (newSchema: any) => void;
}

const VisualSchemaEditor: React.FC<VisualSchemaEditorProps> = ({ schema, onChange }) => {
  
  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside the list
    if (!destination) {
      return;
    }

    // Dropped in the palette (invalid)
    if (destination.droppableId === 'FIELD_PALETTE') {
      return;
    }

    const currentProperties = schema.properties || {};
    const propertyKeys = Object.keys(currentProperties);

    // Reordering existing field
    if (source.droppableId === 'SCHEMA_CANVAS' && destination.droppableId === 'SCHEMA_CANVAS') {
      if (source.index === destination.index) {
        return;
      }

      const newPropertyKeys = Array.from(propertyKeys);
      const [removed] = newPropertyKeys.splice(source.index, 1);
      newPropertyKeys.splice(destination.index, 0, removed);

      const newProperties: any = {};
      newPropertyKeys.forEach(key => {
        newProperties[key] = currentProperties[key];
      });

      onChange({
        ...schema,
        properties: newProperties
      });
      return;
    }

    // Adding new field from palette
    if (source.droppableId === 'FIELD_PALETTE' && destination.droppableId === 'SCHEMA_CANVAS') {
      // Extract type from draggableId: PALETTE_{type}_{index}
      const type = draggableId.split('_')[1];
      
      const timestamp = new Date().getTime();
      const newFieldName = `field_${timestamp}`;
      const newFieldLabel = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
      
      const newFieldSchema = {
        type: type,
        title: newFieldLabel
      };

      const newPropertyKeys = Array.from(propertyKeys);
      newPropertyKeys.splice(destination.index, 0, newFieldName);

      const newProperties: any = {};
      newPropertyKeys.forEach(key => {
        if (key === newFieldName) {
          newProperties[key] = newFieldSchema;
        } else {
          newProperties[key] = currentProperties[key];
        }
      });

      onChange({
        ...schema,
        properties: newProperties
      });
    }
  }, [schema, onChange]);

  const handleEditField = (fieldName: string, fieldSchema: any) => {
    // TODO: Open property editor dialog
    console.log('Edit field', fieldName, fieldSchema);
    const newTitle = prompt("Enter new title for " + fieldName, fieldSchema.title);
    if (newTitle) {
      onChange({
        ...schema,
        properties: {
          ...schema.properties,
          [fieldName]: {
            ...fieldSchema,
            title: newTitle
          }
        }
      });
    }
  };

  const handleDeleteField = (fieldName: string) => {
    if (confirm(`Are you sure you want to delete ${fieldName}?`)) {
      const newProperties = { ...schema.properties };
      delete newProperties[fieldName];
      
      onChange({
        ...schema,
        properties: newProperties
      });
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        <Grid item xs={12} md={3}>
          <FieldPalette />
        </Grid>
        <Grid item xs={12} md={9}>
          <SchemaCanvas 
            schema={schema} 
            onChange={onChange}
            onEditField={handleEditField}
            onDeleteField={handleDeleteField}
          />
        </Grid>
      </Grid>
    </DragDropContext>
  );
};

export default VisualSchemaEditor;