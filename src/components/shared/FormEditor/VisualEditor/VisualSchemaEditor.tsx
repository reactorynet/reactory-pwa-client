import React, { useCallback, useState } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { Grid } from '@mui/material';
import FieldPalette from './FieldPalette';
import SchemaCanvas from './SchemaCanvas';
import FieldSettingsDialog from './FieldSettingsDialog';
import {
  createFieldSchema,
  navigateToField,
  addChildField,
  insertSibling,
  detachField,
  flattenSchema,
  isContainerNode,
} from './schemaTree';

interface VisualSchemaEditorProps {
  schema: any;
  onChange: (newSchema: any) => void;
}

interface EditingField {
  name: string;
  schema: any;
}

const clone = (value: any) => JSON.parse(JSON.stringify(value));

const VisualSchemaEditor: React.FC<VisualSchemaEditorProps> = ({ schema, onChange }) => {
  const [editingField, setEditingField] = useState<EditingField | null>(null);

  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination, combine, draggableId } = result;

    // ── Nesting via combine ────────────────────────────────────────────────
    // A "combine" happens when a field is dropped directly ONTO a container
    // card. This is the only reliable way to nest with react-beautiful-dnd (it
    // cannot resolve nested Droppables). combine results have no `destination`,
    // so this must run before the `!destination` guard.
    if (combine) {
      const targetPath = combine.draggableId.replace(/^FIELD_/, '');
      const newSchema = clone(schema);
      const target = navigateToField(newSchema, targetPath);
      if (!target) return;

      if (source.droppableId === 'FIELD_PALETTE') {
        // New field from the palette.
        const newField = createFieldSchema(draggableId.split('_')[1]);
        if (isContainerNode(target)) {
          // Nest inside the container (object property / array items).
          if (addChildField(target, newField)) onChange(newSchema);
        } else if (insertSibling(newSchema, targetPath, newField)) {
          // Dropped onto a scalar card → add as a sibling right after it.
          onChange(newSchema);
        }
      } else if (source.droppableId === 'SCHEMA_CANVAS') {
        // Move an existing field into the container.
        if (!isContainerNode(target)) return;
        const sourcePath = draggableId.replace(/^FIELD_/, '');
        // Cannot move a node into itself or one of its own descendants.
        if (targetPath === sourcePath || targetPath.startsWith(`${sourcePath}.`)) return;
        const detached = detachField(newSchema, sourcePath);
        if (detached && addChildField(target, detached.field, detached.key)) {
          onChange(newSchema);
        }
      }
      return;
    }

    // Dropped outside any list, or back onto the palette.
    if (!destination || destination.droppableId === 'FIELD_PALETTE') {
      return;
    }

    const rows = flattenSchema(schema);

    // ── Add a new field from the palette into the open canvas (root level) ──
    // Dropping ONTO a container nests (handled by combine above); dropping into
    // the open list adds at the root.
    if (source.droppableId === 'FIELD_PALETTE') {
      const type = draggableId.split('_')[1];
      const newSchema = clone(schema);
      newSchema.properties = newSchema.properties || {};

      const rootKeys = Object.keys(newSchema.properties);
      // Insert near the drop point: use the root ancestor of the row at the
      // destination position, otherwise append.
      let insertAt = rootKeys.length;
      const targetRow = rows[destination.index];
      if (targetRow) {
        const rootAncestor = targetRow.path.split('.')[0];
        const idx = rootKeys.indexOf(rootAncestor);
        if (idx >= 0) insertAt = idx;
      }

      const newKey = `field_${new Date().getTime()}`;
      const rebuilt: Record<string, any> = {};
      const orderedKeys = [...rootKeys];
      orderedKeys.splice(insertAt, 0, newKey);
      orderedKeys.forEach((k) => {
        rebuilt[k] = k === newKey ? createFieldSchema(type) : newSchema.properties[k];
      });
      newSchema.properties = rebuilt;
      onChange(newSchema);
      return;
    }

    // ── Reorder an existing field within the same parent ────────────────────
    // Moving a field into a different container is done via combine (drop onto
    // the container). Here we only reorder among siblings of the same parent.
    if (source.droppableId === 'SCHEMA_CANVAS') {
      const sourceRow = rows[source.index];
      const targetRow = rows[destination.index];
      if (!sourceRow || !targetRow) return;
      if (sourceRow.isArrayItem) return; // array items are a single slot
      if (targetRow.parentPath !== sourceRow.parentPath) return; // different parent → use combine
      if (targetRow.path === sourceRow.path) return;
      if (targetRow.path.startsWith(`${sourceRow.path}.`)) return; // target is own descendant

      const newSchema = clone(schema);
      const parent = navigateToField(newSchema, sourceRow.parentPath);
      if (!parent?.properties) return;

      const keys = Object.keys(parent.properties);
      const from = keys.indexOf(sourceRow.displayKey);
      const to = keys.indexOf(targetRow.displayKey);
      if (from < 0 || to < 0) return;

      keys.splice(to, 0, keys.splice(from, 1)[0]);
      const rebuilt: Record<string, any> = {};
      keys.forEach((k) => { rebuilt[k] = parent.properties[k]; });
      parent.properties = rebuilt;
      onChange(newSchema);
    }
  }, [schema, onChange]);

  const handleEditField = (fieldName: string, fieldSchema: any) => {
    // fieldName is the full dot path; the dialog shows the simple key.
    setEditingField({ name: fieldName, schema: fieldSchema });
  };

  const handleSaveField = (formData: any) => {
    if (!editingField) return;

    const { key, required, ...updatedSchema } = formData;
    const newSchema = clone(schema);

    const parts = editingField.name.split('.');
    const originalKey = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('.');
    const parent = navigateToField(newSchema, parentPath);

    if (!parent) {
      setEditingField(null);
      return;
    }

    // Array items are the array's single `items` schema — no key/required.
    if (originalKey === 'items') {
      parent.items = updatedSchema;
      onChange(newSchema);
      setEditingField(null);
      return;
    }

    if (!parent.properties) parent.properties = {};

    const finalKey = key || originalKey;

    // Rebuild properties preserving order, applying any rename.
    const rebuilt: Record<string, any> = {};
    Object.keys(parent.properties).forEach((k) => {
      if (k === originalKey) {
        rebuilt[finalKey] = updatedSchema;
      } else {
        rebuilt[k] = parent.properties[k];
      }
    });
    // If the field somehow wasn't present (edge case), add it.
    if (rebuilt[finalKey] === undefined) rebuilt[finalKey] = updatedSchema;
    parent.properties = rebuilt;

    // Update the required list (drop old/new key first, then add if required).
    let newRequired = Array.isArray(parent.required) ? [...parent.required] : [];
    newRequired = newRequired.filter((k: string) => k !== originalKey && k !== finalKey);
    if (required) newRequired.push(finalKey);
    parent.required = newRequired;

    onChange(newSchema);
    setEditingField(null);
  };

  const handleDeleteField = (fieldName: string) => {
    if (!confirm(`Are you sure you want to delete ${fieldName}?`)) return;
    const newSchema = clone(schema);
    if (detachField(newSchema, fieldName)) {
      onChange(newSchema);
    }
  };

  // Determine the current required status for the field being edited.
  const editingRequired = (() => {
    if (!editingField) return false;
    const parts = editingField.name.split('.');
    const fieldKey = parts[parts.length - 1];
    if (fieldKey === 'items') return false;
    const parent = navigateToField(schema, parts.slice(0, -1).join('.'));
    return Array.isArray(parent?.required) && parent.required.includes(fieldKey);
  })();

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
          name: editingField.name.split('.').pop() || editingField.name,
          schema: editingField.schema,
          required: editingRequired,
        } : null}
      />
    </>
  );
};

export default VisualSchemaEditor;
