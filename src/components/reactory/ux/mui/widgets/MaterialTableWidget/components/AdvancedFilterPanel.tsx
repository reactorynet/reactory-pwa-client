import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Button,
  IconButton,
  Chip,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Icon,
  OutlinedInput,
  ListItemText,
} from '@mui/material';
import { useAdvancedFilters, AdvancedFilterField } from '../hooks/useAdvancedFilters';

export interface AdvancedFilterPanelProps {
  open: boolean;
  onClose: () => void;
  fields: AdvancedFilterField[];
  onFilterChange: (filters: any[]) => void;
  showPresets?: boolean;
}

/**
 * AdvancedFilterPanel Component
 * 
 * Drawer panel for advanced multi-field filtering with preset management
 * 
 * @example
 * <AdvancedFilterPanel
 *   open={panelOpen}
 *   onClose={() => setPanelOpen(false)}
 *   fields={advancedFilterFields}
 *   onFilterChange={(filters) => console.log(filters)}
 *   showPresets
 * />
 */
export const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  open,
  onClose,
  fields,
  onFilterChange,
  showPresets = false,
}) => {
  const {
    filters,
    setFilter,
    removeFilter,
    clearFilters,
    activeFilterCount,
    presets,
    savePreset,
    loadPreset,
    deletePreset,
  } = useAdvancedFilters({
    fields,
    onFilterChange,
  });

  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleSavePreset = () => {
    if (presetName.trim()) {
      savePreset(presetName.trim());
      setPresetName('');
      setPresetDialogOpen(false);
    }
  };

  const getFilterValue = (field: string) => {
    const filter = filters.find((f) => f.field === field);
    return filter?.value ?? '';
  };

  const renderFilterField = (field: AdvancedFilterField) => {
    const value = getFilterValue(field.field);

    switch (field.type) {
      case 'select':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value}
              label={field.label}
              onChange={(e) => setFilter(field.field, e.target.value, 'eq')}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'multi-select':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{field.label}</InputLabel>
            <Select
              multiple
              value={Array.isArray(value) ? value : []}
              label={field.label}
              onChange={(e) => setFilter(field.field, e.target.value, 'in')}
              input={<OutlinedInput label={field.label} />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((val) => {
                    const option = field.options?.find((o) => o.value === val);
                    return <Chip key={val} label={option?.label || val} size="small" />;
                  })}
                </Box>
              )}
            >
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Checkbox checked={(Array.isArray(value) ? value : []).includes(option.value)} />
                  <ListItemText primary={option.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'text':
        return (
          <TextField
            fullWidth
            size="small"
            label={field.label}
            value={value}
            onChange={(e) => setFilter(field.field, e.target.value, 'contains')}
            placeholder={field.placeholder}
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            size="small"
            type="number"
            label={field.label}
            value={value}
            onChange={(e) => setFilter(field.field, parseFloat(e.target.value) || 0, 'eq')}
            placeholder={field.placeholder}
          />
        );

      case 'date-range':
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              type="date"
              label={`${field.label} From`}
              value={Array.isArray(value) ? value[0] || '' : ''}
              onChange={(e) => {
                const newValue = Array.isArray(value) ? [...value] : ['', ''];
                newValue[0] = e.target.value;
                setFilter(field.field, newValue, 'between');
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              type="date"
              label={`${field.label} To`}
              value={Array.isArray(value) ? value[1] || '' : ''}
              onChange={(e) => {
                const newValue = Array.isArray(value) ? [...value] : ['', ''];
                newValue[1] = e.target.value;
                setFilter(field.field, newValue, 'between');
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
          </Box>
        );

      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={!!value}
                onChange={(e) => setFilter(field.field, e.target.checked, 'eq')}
              />
            }
            label={field.label}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose}>
        <Box sx={{ width: 400, p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Advanced Filters</Typography>
            <IconButton onClick={onClose} size="small">
              <Icon>close</Icon>
            </IconButton>
          </Box>

          {/* Active Filters Summary */}
          {activeFilterCount > 0 && (
            <Box sx={{ mb: 2 }}>
              <Chip
                label={`${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`}
                color="primary"
                size="small"
                onDelete={clearFilters}
                deleteIcon={<Icon>clear</Icon>}
              />
            </Box>
          )}

          <Divider sx={{ mb: 3 }} />

          {/* Filter Fields */}
          <Stack spacing={2.5}>
            {fields.map((field) => (
              <Box key={field.id}>
                {renderFilterField(field)}
                {getFilterValue(field.field) && (
                  <Button
                    size="small"
                    startIcon={<Icon>clear</Icon>}
                    onClick={() => removeFilter(field.field)}
                    sx={{ mt: 0.5 }}
                  >
                    Clear
                  </Button>
                )}
              </Box>
            ))}
          </Stack>

          {/* Actions */}
          <Box sx={{ mt: 4, display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Icon>clear_all</Icon>}
              onClick={clearFilters}
              disabled={activeFilterCount === 0}
            >
              Clear All
            </Button>
            <Button variant="contained" fullWidth onClick={onClose}>
              Apply
            </Button>
          </Box>

          {/* Presets */}
          {showPresets && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Filter Presets
              </Typography>

              <Button
                variant="outlined"
                fullWidth
                startIcon={<Icon>save</Icon>}
                onClick={() => setPresetDialogOpen(true)}
                disabled={activeFilterCount === 0}
                sx={{ mb: 2 }}
              >
                Save Current Filters
              </Button>

              <Stack spacing={1}>
                {presets.map((preset) => (
                  <Box
                    key={preset.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2">{preset.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {preset.filters.length} filter{preset.filters.length > 1 ? 's' : ''}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => loadPreset(preset.id)}>
                      <Icon fontSize="small">download</Icon>
                    </IconButton>
                    <IconButton size="small" onClick={() => deletePreset(preset.id)}>
                      <Icon fontSize="small">delete</Icon>
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            </>
          )}
        </Box>
      </Drawer>

      {/* Save Preset Dialog */}
      <Dialog open={presetDialogOpen} onClose={() => setPresetDialogOpen(false)}>
        <DialogTitle>Save Filter Preset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Preset Name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPresetDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSavePreset} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
