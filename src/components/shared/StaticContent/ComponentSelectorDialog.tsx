import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Chip,
  Paper,
  Stack,
  Divider,
  Grid,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExtensionIcon from '@mui/icons-material/Extension';
import CodeIcon from '@mui/icons-material/Code';

export interface PropItem {
  key: string;
  type: 'string' | 'bool' | 'int' | 'float' | 'object';
  value: string;
}

export interface ComponentSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (tagHtml: string) => void;
  reactory: Reactory.Client.ReactorySDK;
}

export const ComponentSelectorDialog: React.FC<ComponentSelectorDialogProps> = ({
  open,
  onClose,
  onInsert,
  reactory,
}) => {
  const [selectedComponent, setSelectedComponent] = useState<string>('core.Label@1.0.0');
  const [customFqn, setCustomFqn] = useState<string>('');
  const [propsList, setPropsItem] = useState<PropItem[]>([
    { key: 'text', type: 'string', value: 'Hello Reactory' },
  ]);

  // Discover available components from Reactory SDK if available
  const componentOptions = useMemo(() => {
    const defaultList = [
      'core.Label@1.0.0',
      'core.StaticContent@1.0.0',
      'core.UserProfile@1.0.0',
      'core.Chart@1.0.0',
      'core.AlertDialog@1.0.0',
      'core.FullScreenModal@1.0.0',
    ];
    try {
      if (reactory && typeof reactory.getComponents === 'function') {
        const discovered = reactory.getComponents<any>([]);
        if (discovered && typeof discovered === 'object') {
          const keys = Object.keys(discovered);
          if (keys.length > 0) {
            return Array.from(new Set([...keys, ...defaultList]));
          }
        }
      }
    } catch (e) {
      // Ignore
    }
    return defaultList;
  }, [reactory]);

  const handleAddProp = useCallback(() => {
    setPropsItem((prev) => [...prev, { key: '', type: 'string', value: '' }]);
  }, []);

  const handleRemoveProp = useCallback((index: number) => {
    setPropsItem((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePropChange = useCallback((index: number, field: keyof PropItem, val: string) => {
    setPropsItem((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  }, []);

  // Format the generated `<reactory />` tag
  const generatedTag = useMemo(() => {
    const fqn = customFqn.trim() || selectedComponent || 'core.Component';
    let attributes = `component="${fqn}"`;

    propsList.forEach((item) => {
      const k = item.key.trim();
      if (!k) return;

      let typedVal = item.value;
      if (item.type === 'bool') typedVal = `bool:${item.value === 'true'}`;
      else if (item.type === 'int') typedVal = `int:${parseInt(item.value || '0', 10)}`;
      else if (item.type === 'float') typedVal = `float:${parseFloat(item.value || '0')}`;
      else if (item.type === 'object') typedVal = `object:${item.value || '{}'}`;

      attributes += ` reactory-props-${k}="${typedVal}"`;
    });

    return `<reactory ${attributes} />`;
  }, [selectedComponent, customFqn, propsList]);

  const handleInsert = useCallback(() => {
    if (generatedTag) {
      onInsert(generatedTag);
      onClose();
    }
  }, [generatedTag, onInsert, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ExtensionIcon color="primary" />
        <Typography variant="h6" fontWeight="bold">
          Inject Reactory Component Tag
        </Typography>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Component Selection */}
          <Autocomplete
            freeSolo
            options={componentOptions}
            value={selectedComponent}
            onChange={(_, newValue) => {
              if (newValue) setSelectedComponent(newValue);
            }}
            onInputChange={(_, newInputValue) => {
              setCustomFqn(newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Component FQN / FQN Alias"
                placeholder="e.g. core.Label@1.0.0"
                size="small"
                fullWidth
                helperText="Select or type a registered component fully-qualified name"
              />
            )}
          />

          {/* Component Props Configuration */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              Component Properties (Props)
            </Typography>
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={handleAddProp}>
              Add Prop
            </Button>
          </Box>

          {propsList.length === 0 ? (
            <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>
              No properties configured. The component will render with default props.
            </Typography>
          ) : (
            propsList.map((prop, idx) => (
              <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                <Grid container spacing={1} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Prop Name"
                      placeholder="e.g. text"
                      value={prop.key}
                      onChange={(e) => handlePropChange(idx, 'key', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={prop.type}
                        label="Type"
                        onChange={(e) => handlePropChange(idx, 'type', e.target.value as any)}
                      >
                        <MenuItem value="string">String</MenuItem>
                        <MenuItem value="bool">Boolean</MenuItem>
                        <MenuItem value="int">Integer</MenuItem>
                        <MenuItem value="float">Float</MenuItem>
                        <MenuItem value="object">JSON Object</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={10} sm={4}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Prop Value"
                      placeholder={prop.type === 'bool' ? 'true/false' : 'Value'}
                      value={prop.value}
                      onChange={(e) => handlePropChange(idx, 'value', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={2} sm={1}>
                    <IconButton size="small" color="error" onClick={() => handleRemoveProp(idx)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Grid>
                </Grid>
              </Paper>
            ))
          )}

          {/* Preview Tag */}
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block' }}>
              Generated Tag Code
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100'),
                fontFamily: 'monospace',
                fontSize: '0.825rem',
                wordBreak: 'break-all',
              }}
            >
              {generatedTag}
            </Paper>
          </Box>
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleInsert} variant="contained" color="primary" startIcon={<CodeIcon />}>
          Insert Component Tag
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ComponentSelectorDialog;
