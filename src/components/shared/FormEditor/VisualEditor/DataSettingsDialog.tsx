import React, { useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { ReactoryForm } from '../../../reactory';
import { getQueryEditorSchema, getMutationEditorSchema, getDataEditorUISchema } from './data-field-editors';

interface DataSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  type: 'query' | 'mutation';
  initialData?: any;
  title?: string;
}

export const DataSettingsDialog: React.FC<DataSettingsDialogProps> = ({
  open,
  onClose,
  onSave,
  type,
  initialData = {},
  title
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Prepare form data: flatten objects to strings for editing
  const formData = useMemo(() => {
    const data = { ...initialData };
    ['resultMap', 'variables'].forEach(key => {
      if (data[key] && typeof data[key] === 'object') {
        data[key] = JSON.stringify(data[key], null, 2);
      }
    });
    return data;
  }, [initialData]);

  const [localData, setLocalData] = React.useState(formData);

  const handleSave = useCallback(() => {
    const dataToSave = { ...localData };
    
    // Parse strings back to objects
    ['resultMap', 'variables'].forEach(key => {
      if (dataToSave[key]) {
        try {
          dataToSave[key] = JSON.parse(dataToSave[key]);
        } catch (e) {
          console.warn(`Invalid JSON in ${key}, ignoring`, e);
          // Keep as string if parsing fails or handle error?
          // For now, let's assume valid JSON is required and maybe clear it if invalid
          // delete dataToSave[key]; 
        }
      }
    });

    onSave(dataToSave);
    onClose();
  }, [localData, onSave, onClose]);

  const formDef = useMemo(() => ({
    id: `data-${type}-settings`,
    name: `Data${type}Settings`,
    nameSpace: 'editor',
    version: '1.0.0',
    schema: type === 'query' ? getQueryEditorSchema() : getMutationEditorSchema(),
    uiSchema: getDataEditorUISchema(),
    uiFramework: 'material',
    mode: 'edit'
  }), [type]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {title || `${type === 'query' ? 'Query' : 'Mutation'} Settings`}
      </DialogTitle>
      <DialogContent dividers>
        <ReactoryForm
          formDef={formDef}
          formData={localData}
          onChange={(newData) => setLocalData(newData)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
