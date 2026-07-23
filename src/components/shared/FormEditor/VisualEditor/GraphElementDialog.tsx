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
import { GraphElementEditor } from './GraphElementEditor';
import { cleanGraphElement } from './graphConfig';

interface GraphElementDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (element: any) => void;
  kind: 'query' | 'mutation';
  title: string;
  initialData?: any;
}

export const GraphElementDialog: React.FC<GraphElementDialogProps> = ({
  open,
  onClose,
  onSave,
  kind,
  title,
  initialData = {},
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [element, setElement] = useState<any>(initialData);

  useEffect(() => {
    setElement(initialData || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = () => {
    onSave(cleanGraphElement(element));
    onClose();
  };

  const canSave = !!element?.name && !!element?.text;

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <GraphElementEditor kind={kind} value={element} onChange={setElement} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary" disabled={!canSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GraphElementDialog;
