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
import { getProviderEditorSchema, getProviderEditorUISchema } from './data-field-editors';

interface ProviderSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  title?: string;
}

export const ProviderSettingsDialog: React.FC<ProviderSettingsDialogProps> = ({
  open,
  onClose,
  onSave,
  initialData = {},
  title
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Prepare form data: flatten objects to strings for editing
  const formData = useMemo(() => {
    const data = { ...initialData };
    // Assuming options might be an object, stringify it
    if (data.options && typeof data.options === 'object') {
      data.options = JSON.stringify(data.options, null, 2);
    }
    return data;
  }, [initialData]);

  const [localData, setLocalData] = React.useState(formData);

  const handleSave = useCallback(() => {
    const dataToSave = { ...localData };
    
    // Parse options string back to object
    if (dataToSave.options) {
      try {
        dataToSave.options = JSON.parse(dataToSave.options);
      } catch (e) {
        console.warn(`Invalid JSON in options, ignoring`, e);
      }
    }

    onSave(dataToSave);
    onClose();
  }, [localData, onSave, onClose]);

  const formDef = useMemo(() => ({
    id: 'provider-settings',
    name: 'ProviderSettings',
    nameSpace: 'editor',
    version: '1.0.0',
    schema: getProviderEditorSchema(),
    uiSchema: getProviderEditorUISchema(),
    uiFramework: 'material',
    mode: 'edit'
  }), []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {title || 'Provider Settings'}
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
