import React, { useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';

export interface TableConfig {
  rows: number;
  cols: number;
  includeHeader: boolean;
  bordered: boolean;
}

export interface TableInsertDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (config: TableConfig) => void;
}

export const TableInsertDialog: React.FC<TableInsertDialogProps> = ({
  open,
  onClose,
  onInsert,
}) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [bordered, setBordered] = useState(true);

  const handleConfirm = () => {
    onInsert({
      rows: Math.max(1, Math.min(rows, 30)),
      cols: Math.max(1, Math.min(cols, 15)),
      includeHeader,
      bordered,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TableChartIcon color="primary" fontSize="small" />
        Insert HTML Table
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Rows"
                type="number"
                size="small"
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value, 10) || 1)}
                inputProps={{ min: 1, max: 30 }}
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Columns"
                type="number"
                size="small"
                value={cols}
                onChange={(e) => setCols(parseInt(e.target.value, 10) || 1)}
                inputProps={{ min: 1, max: 15 }}
                fullWidth
              />
            </Grid>
          </Grid>

          <Stack direction="column" spacing={0.5}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeHeader}
                  onChange={(e) => setIncludeHeader(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Include table header row (&lt;th&gt;)</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={bordered}
                  onChange={(e) => setBordered(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Bordered styling</Typography>}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" size="small">
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained" size="small">
          Insert Table
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TableInsertDialog;
