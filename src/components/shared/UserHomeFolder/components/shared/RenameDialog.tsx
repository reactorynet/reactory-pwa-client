import React from 'react';
import { RenameDialogProps } from '../../types';

// Update the interface to include reactory
interface ExtendedRenameDialogProps extends RenameDialogProps {
  reactory: Reactory.Client.ReactorySDK;
}

const RenameDialog: React.FC<ExtendedRenameDialogProps> = ({
  open,
  currentName,
  newName,
  onClose,
  onConfirm,
  onNameChange,
  il8n,
  reactory
}) => {
  const {
    Material
  } = reactory.getComponents<{
    Material: Reactory.Client.Web.IMaterialModule
  }>(["material-ui.Material"]);

  const {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button
  } = Material.MaterialCore;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onConfirm();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {il8n?.t('reactor.client.files.rename', { defaultValue: 'Rename File' })}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="File Name"
          type="text"
          fullWidth
          variant="outlined"
          value={newName}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyPress={handleKeyPress}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {il8n?.t('reactor.client.files.cancel', { defaultValue: 'Cancel' })}
        </Button>
        <Button 
          onClick={onConfirm} 
          variant="contained"
          disabled={!newName.trim() || newName === currentName}
        >
          {il8n?.t('reactor.client.files.rename', { defaultValue: 'Rename' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RenameDialog;
