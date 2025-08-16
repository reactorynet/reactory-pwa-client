import React from 'react';
import { CreateFolderDialogProps } from '../../types';

const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
  open,
  folderName,
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

  const { CreateNewFolder } = Material.MaterialIcons;

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
        {il8n?.t('reactor.client.folders.create', { defaultValue: 'Create New Folder' })}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Folder Name"
          type="text"
          fullWidth
          variant="outlined"
          value={folderName}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyPress={handleKeyPress}
          sx={{ mt: 2 }}
          placeholder="Enter folder name..."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {il8n?.t('reactor.client.folders.cancel', { defaultValue: 'Cancel' })}
        </Button>
        <Button 
          onClick={onConfirm} 
          variant="contained"
          disabled={!folderName.trim()}
          startIcon={<CreateNewFolder />}
        >
          {il8n?.t('reactor.client.folders.create', { defaultValue: 'Create' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateFolderDialog;
