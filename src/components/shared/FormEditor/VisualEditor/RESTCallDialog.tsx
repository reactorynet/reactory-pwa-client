import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { RESTCallEditor } from './RESTCallEditor';
import { cleanRestCall } from './restConfig';

interface RESTCallDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (call: any) => void;
  title: string;
  initialData?: any;
}

export const RESTCallDialog: React.FC<RESTCallDialogProps> = ({
  open,
  onClose,
  onSave,
  title,
  initialData = {},
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [call, setCall] = useState<any>(initialData);

  useEffect(() => {
    setCall(initialData || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = () => {
    onSave(cleanRestCall(call));
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <RESTCallEditor value={call} onChange={setCall} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary" disabled={!call?.url}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RESTCallDialog;
