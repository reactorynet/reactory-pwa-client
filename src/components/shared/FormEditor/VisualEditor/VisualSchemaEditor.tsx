import React, { useCallback, useState } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { Box, Grid } from '@mui/material';
import FieldPalette from './FieldPalette';
import SchemaCanvas from './SchemaCanvas';
import FieldSettingsDialog from './FieldSettingsDialog';

interface VisualSchemaEditorProps {
  schema: any;
  onChange: (newSchema: any) => void;
}

interface EditingField {
  name: string;
  schema: any;
}

const VisualSchemaEditor: React.FC<VisualSchemaEditorProps> = ({ schema, onChange }) => {
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  
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
    if (source.droppableId === destination.droppableId) {
      if (source.index === destination.index) {
        return;
      }

      const newSchema = JSON.parse(JSON.stringify(schema)); // Deep clone
      let currentLevel = newSchema;

      if (source.droppableId !== 'SCHEMA_CANVAS') {
        const path = source.droppableId.replace('SCHEMA_CANVAS.', '');
        const pathParts = path.split('.');
        
        for (const part of pathParts) {
          if (currentLevel.properties && currentLevel.properties[part]) {
            currentLevel = currentLevel.properties[part];
          } else if (currentLevel.items && part === 'items') {
            currentLevel = currentLevel.items;
          }
        }
      }

      const currentLevelProperties = currentLevel.properties || {};
      const currentLevelKeys = Object.keys(currentLevelProperties);

      const newKeys = Array.from(currentLevelKeys);
      const [removed] = newKeys.splice(source.index, 1);
      newKeys.splice(destination.index, 0, removed);

      const newProperties: any = {};
      newKeys.forEach(key => {
        newProperties[key] = currentLevelProperties[key];
      });

      currentLevel.properties = newProperties;
      onChange(newSchema);
      return;
    }

    // Adding new field from palette
    if (source.droppableId === 'FIELD_PALETTE') {
      const type = draggableId.split('_')[1];
      const timestamp = new Date().getTime();
      const newFieldName = `field_${timestamp}`;
      const newFieldLabel = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
      
      const newFieldSchema = {
        type: type,
        title: newFieldLabel,
        properties: type === 'object' ? {} : undefined
      };

      if (destination.droppableId === 'SCHEMA_CANVAS') {
        // Dropping into root
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
      } else if (destination.droppableId.startsWith('SCHEMA_CANVAS.') && destination.droppableId.endsWith('.$itemsDef')) {
        // Dropping into array items
        const path = destination.droppableId.replace('SCHEMA_CANVAS.', '').replace('.$itemsDef', '');
        const newSchema = JSON.parse(JSON.stringify(schema)); // Deep clone
        
        let currentLevel = newSchema;
        const pathParts = path.split('.');
        
        // Navigate to the array field
        for (const part of pathParts) {
          if (currentLevel.properties && currentLevel.properties[part]) {
            currentLevel = currentLevel.properties[part];
          } else if (currentLevel.items && part === 'items') {
            currentLevel = currentLevel.items;
          }
        }

        // Set the items property
        if (currentLevel.type === 'array') {
          currentLevel.items = newFieldSchema;
          onChange(newSchema);
        }
        return;
      } else if (destination.droppableId.startsWith('SCHEMA_CANVAS.')) {
        // Dropping into nested object
        const path = destination.droppableId.replace('SCHEMA_CANVAS.', '');
        const newSchema = JSON.parse(JSON.stringify(schema)); // Deep clone
        
        // Navigate to the target object's properties
        let currentLevel = newSchema;
        const pathParts = path.split('.');
        
        for (const part of pathParts) {
          if (currentLevel.properties && currentLevel.properties[part]) {
            currentLevel = currentLevel.properties[part];
          } else if (currentLevel.items && part === 'items') {
            currentLevel = currentLevel.items;
          }
        }

        if (!currentLevel.properties) {
          currentLevel.properties = {};
        }

        // Add the new field
        const targetKeys = Object.keys(currentLevel.properties);
        const newTargetKeys = Array.from(targetKeys);
        newTargetKeys.splice(destination.index, 0, newFieldName);

        const newTargetProperties: any = {};
        newTargetKeys.forEach(key => {
          if (key === newFieldName) {
            newTargetProperties[key] = newFieldSchema;
          } else {
            newTargetProperties[key] = currentLevel.properties[key];
          }
        });

        currentLevel.properties = newTargetProperties;
        onChange(newSchema);
      }
      return;
    }
  }, [schema, onChange]);

  const handleEditField = (fieldName: string, fieldSchema: any) => {
    // If it's a nested field (contains dots), we pass the full path as the name
    // The dialog will handle the key editing appropriately
    setEditingField({
      name: fieldName,
      schema: fieldSchema
    });
  };

  const handleSaveField = (formData: any) => {
    if (!editingField) return;

    const { key, required, ...updatedSchema } = formData;
    const newSchema = JSON.parse(JSON.stringify(schema)); // Deep clone
    
    // Determine if we're editing a nested field
    const pathParts = editingField.name.split('.');
    const isNested = pathParts.length > 1;
    const originalKey = pathParts[pathParts.length - 1];
    
    // Navigate to parent object
    let parentObject = newSchema;
    let parentPath = '';
    
    if (isNested) {
      // Navigate down to the parent of the field being edited
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (parentObject.properties && parentObject.properties[part]) {
          parentObject = parentObject.properties[part];
          parentPath = parentPath ? `${parentPath}.${part}` : part;
        }
      }
    }

    // Handle special case for array items
    if (pathParts[pathParts.length - 1] === 'items') {
      const arrayPathParts = pathParts.slice(0, -1);
      const arrayFieldKey = arrayPathParts[arrayPathParts.length - 1];
      
      // Navigate to array parent
      for (let i = 0; i < arrayPathParts.length - 1; i++) {
        const part = arrayPathParts[i];
        if (parentObject.properties && parentObject.properties[part]) {
          parentObject = parentObject.properties[part];
        }
      }
      
      if (parentObject.properties && parentObject.properties[arrayFieldKey]) {
        parentObject.properties[arrayFieldKey].items = updatedSchema;
        onChange(newSchema);
        setEditingField(null);
        return;
      }
    }

    const currentRequired = parentObject.required || [];
    let newRequired = [...currentRequired];

    if (required && !newRequired.includes(key)) {
      newRequired.push(key);
    } else if (!required && newRequired.includes(key)) {
      newRequired = newRequired.filter((k: string) => k !== key);
    }

    // Handle key rename
    if (key !== originalKey) {
      const newProperties: any = {};
      Object.keys(parentObject.properties).forEach(k => {
        if (k === originalKey) {
          newProperties[key] = updatedSchema;
        } else {
          newProperties[k] = parentObject.properties[k];
        }
      });
      parentObject.properties = newProperties;
      
      // Update required array if key changed
      if (newRequired.includes(originalKey)) {
        newRequired = newRequired.map((k: string) => k === originalKey ? key : k);
      }
    } else {
      parentObject.properties[key] = updatedSchema;
    }
    
    parentObject.required = newRequired;
    onChange(newSchema);
    setEditingField(null);
  };

  const handleDeleteField = (fieldName: string) => {
    if (confirm(`Are you sure you want to delete ${fieldName}?`)) {
      const newSchema = JSON.parse(JSON.stringify(schema)); // Deep clone
      const pathParts = fieldName.split('.');
      const isNested = pathParts.length > 1;
      const targetKey = pathParts[pathParts.length - 1];
      
      // Navigate to parent object
      let parentObject = newSchema;
      
      if (isNested) {
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          if (parentObject.properties && parentObject.properties[part]) {
            parentObject = parentObject.properties[part];
          }
        }
      }

      // Handle deleting array items
      if (targetKey === 'items') {
        const arrayPathParts = pathParts.slice(0, -1);
        const arrayFieldKey = arrayPathParts[arrayPathParts.length - 1];
        
        // Navigate to array parent
        for (let i = 0; i < arrayPathParts.length - 1; i++) {
          const part = arrayPathParts[i];
          if (parentObject.properties && parentObject.properties[part]) {
            parentObject = parentObject.properties[part];
          }
        }
        
        if (parentObject.properties && parentObject.properties[arrayFieldKey]) {
          delete parentObject.properties[arrayFieldKey].items;
          onChange(newSchema);
          return;
        }
      }

      // Delete property
      delete parentObject.properties[targetKey];
      
      // Remove from required array
      if (parentObject.required) {
        parentObject.required = parentObject.required.filter((k: string) => k !== targetKey);
      }

      onChange(newSchema);
    }
  };

  return (
    <>
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
      
      <FieldSettingsDialog
        open={!!editingField}
        onClose={() => setEditingField(null)}
        onSave={handleSaveField}
        field={editingField ? {
          name: editingField.name.split('.').pop() || editingField.name, // Display simple name in dialog
          schema: editingField.schema,
          required: (() => {
            // Determine requirement status from parent object
            const pathParts = editingField.name.split('.');
            let parentObject = schema;
            for (let i = 0; i < pathParts.length - 1; i++) {
              const part = pathParts[i];
              if (parentObject.properties && parentObject.properties[part]) {
                parentObject = parentObject.properties[part];
              }
            }
            const fieldKey = pathParts[pathParts.length - 1];
            
            // Special handling for array items which don't have a required status in parent
            if (fieldKey === 'items') return false;
            
            return (parentObject.required || []).includes(fieldKey);
          })()
        } : null}
      />
    </>
  );
};

export default VisualSchemaEditor;