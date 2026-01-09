import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button,
  IconButton,
  Typography,
  Box
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { ReactoryForm } from '../../../reactory';
import { getEditorSchema, getEditorUISchema } from './field-editors';

interface FieldSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  field: {
    name: string;
    schema: any;
    required?: boolean;
  } | null;
}

const FieldSettingsDialog: React.FC<FieldSettingsDialogProps> = ({ 
  open, 
  onClose, 
  onSave, 
  field 
}) => {
  if (!field) return null;

  const type = field.schema.type;
  const editorSchema = getEditorSchema(type);
  const editorUISchema = getEditorUISchema(type);

  // Prepare initial data
  const formData = {
    ...field.schema,
    key: field.name,
    required: field.required || false
  };

  const handleSubmit = (data: any) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Edit Field: {field.schema.title || field.name}</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <ReactoryForm
          formDef={{
            id: 'field-editor-form',
            name: 'FieldEditorForm',
            nameSpace: 'editor',
            version: '1.0.0',
            schema: editorSchema,
            uiSchema: editorUISchema,
            uiFramework: 'material'
          }}
          formData={formData}
          onSubmit={handleSubmit}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FieldSettingsDialog;