import React, { useCallback, useMemo } from 'react';
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
import { getUIEditorSchema, getUIEditorUISchema } from './ui-field-editors';

interface UIFieldSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (fieldKey: string, uiSchema: any) => void;
  fieldKey: string; // The path/key of the field being edited
  fieldType: string; // The type from the schema (string, number, etc.)
  currentUISchema: any; // The current uiSchema for this field
}

export const UIFieldSettingsDialog: React.FC<UIFieldSettingsDialogProps> = ({
  open,
  onClose,
  onSave,
  fieldKey,
  fieldType,
  currentUISchema
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Prepare form data: map ui: properties to non-ui properties for editing
  const formData = useMemo(() => {
    const data: any = {};
    Object.keys(currentUISchema).forEach(key => {
      // Strip 'ui:' prefix if present
      const cleanKey = key.startsWith('ui:') ? key.substring(3) : key;
      let value = currentUISchema[key];
      
      // Special handling for options
      if ((cleanKey === 'options' || cleanKey === 'form') && typeof value === 'object') {
        value = JSON.stringify(value, null, 2);
      }
      
      data[cleanKey] = value;
    });
    return data;
  }, [currentUISchema]);

  const [localData, setLocalData] = React.useState(formData);

  // Update local data when props change
  React.useEffect(() => {
    setLocalData(formData);
  }, [formData]);

  const handleSave = useCallback(() => {
    const dataToSave: any = {};
    
    // Map non-ui properties back to ui: properties
    Object.keys(localData).forEach(key => {
      // Add 'ui:' prefix back
      const uiKey = `ui:${key}`;
      let value = localData[key];

      // Parse options back to object
      if (key === 'options' || key === 'form') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          console.warn(`Invalid JSON in ${key}, saving as is or ignoring`, e);
          return; // Skip if invalid
        }
      }

      dataToSave[uiKey] = value;
    });

    // Handle hidden shortcut logic (mapped from 'hidden' to 'ui:widget' = 'hidden')
    if (dataToSave['ui:hidden']) {
      dataToSave['ui:widget'] = 'hidden';
      delete dataToSave['ui:hidden'];
    }

    onSave(fieldKey, dataToSave);
    onClose();
  }, [localData, onSave, fieldKey, onClose]);

  const formDef = useMemo(() => ({
    id: 'ui-field-settings',
    name: 'UIFieldSettings',
    nameSpace: 'editor',
    version: '1.0.0',
    schema: getUIEditorSchema(fieldType),
    uiSchema: getUIEditorUISchema(),
    uiFramework: 'material',
    mode: 'edit'
  } as any), [fieldType]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        UI Settings: {fieldKey}
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
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};
