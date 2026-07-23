import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Stack,
  Typography,
  TextField,
  MenuItem,
  IconButton,
  FormControlLabel,
  Switch,
  Divider,
  Paper,
  Chip,
  Icon,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add,
  Delete,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import {
  LAYOUT_FIELD_OPTIONS,
  getLayoutFamily,
  parseTabConfig,
  parseGridConfig,
  buildLayoutPatch,
  TabLayoutConfig,
  GridLayoutConfig,
  LayoutPatch,
  GridSize,
} from './layoutConfig';

interface LayoutDesignerDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (path: string, patch: LayoutPatch) => void;
  /** Node path ('ROOT' for the form root). */
  path: string;
  /** The schema node whose properties are the layoutable fields. */
  schema: any;
  /** The uiSchema for this node. */
  uiSchema: any;
}

const BREAKPOINTS: (keyof GridSize)[] = ['xs', 'sm', 'md', 'lg', 'xl'];

const moveItem = <T,>(arr: T[], index: number, dir: -1 | 1): T[] => {
  const next = [...arr];
  const target = index + dir;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export const LayoutDesignerDialog: React.FC<LayoutDesignerDialogProps> = ({
  open,
  onClose,
  onSave,
  path,
  schema,
  uiSchema,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const fieldKeys = useMemo(
    () => Object.keys(schema?.properties || {}),
    [schema],
  );

  const [uiField, setUiField] = useState<string>(uiSchema?.['ui:field'] || 'ObjectField');
  const [tab, setTab] = useState<TabLayoutConfig>(() => parseTabConfig(uiSchema));
  const [grid, setGrid] = useState<GridLayoutConfig>(() => parseGridConfig(uiSchema));

  // Re-hydrate when the target node changes.
  useEffect(() => {
    setUiField(uiSchema?.['ui:field'] || 'ObjectField');
    setTab(parseTabConfig(uiSchema));
    setGrid(parseGridConfig(uiSchema));
  }, [uiSchema, open]);

  const family = getLayoutFamily(uiField);

  const assignedTabFields = new Set(tab.tabs.map((t) => t.field).filter(Boolean));
  const assignedGridFields = new Set(
    grid.rows.flatMap((r) => r.cells.map((c) => c.field)).filter(Boolean),
  );

  const handleSave = () => {
    const patch = buildLayoutPatch(uiField, family, uiSchema?.['ui:options'] || {}, tab, grid);
    onSave(path, patch);
    onClose();
  };

  // ── Tab editor helpers ──────────────────────────────────────────────────
  const updateTab = (index: number, patch: Partial<{ field: string; icon: string; title: string }>) =>
    setTab((prev) => ({
      ...prev,
      tabs: prev.tabs.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }));

  const addTab = () =>
    setTab((prev) => {
      const nextField = fieldKeys.find((k) => !assignedTabFields.has(k)) || '';
      return { ...prev, tabs: [...prev.tabs, { field: nextField, icon: '', title: '' }] };
    });

  const removeTab = (index: number) =>
    setTab((prev) => ({ ...prev, tabs: prev.tabs.filter((_, i) => i !== index) }));

  const moveTab = (index: number, dir: -1 | 1) =>
    setTab((prev) => ({ ...prev, tabs: moveItem(prev.tabs, index, dir) }));

  // ── Grid editor helpers ─────────────────────────────────────────────────
  const addRow = () => setGrid((prev) => ({ ...prev, rows: [...prev.rows, { cells: [] }] }));

  const removeRow = (rowIndex: number) =>
    setGrid((prev) => ({ ...prev, rows: prev.rows.filter((_, i) => i !== rowIndex) }));

  const moveRow = (rowIndex: number, dir: -1 | 1) =>
    setGrid((prev) => ({ ...prev, rows: moveItem(prev.rows, rowIndex, dir) }));

  const addCell = (rowIndex: number) =>
    setGrid((prev) => {
      const nextField = fieldKeys.find((k) => !assignedGridFields.has(k)) || fieldKeys[0] || '';
      return {
        ...prev,
        rows: prev.rows.map((row, i) =>
          i === rowIndex
            ? { cells: [...row.cells, { field: nextField, size: { xs: 12 } }] }
            : row,
        ),
      };
    });

  const updateCellField = (rowIndex: number, cellIndex: number, field: string) =>
    setGrid((prev) => ({
      ...prev,
      rows: prev.rows.map((row, i) =>
        i === rowIndex
          ? { cells: row.cells.map((c, j) => (j === cellIndex ? { ...c, field } : c)) }
          : row,
      ),
    }));

  const updateCellSize = (rowIndex: number, cellIndex: number, bp: keyof GridSize, value: string) =>
    setGrid((prev) => ({
      ...prev,
      rows: prev.rows.map((row, i) =>
        i === rowIndex
          ? {
              cells: row.cells.map((c, j) => {
                if (j !== cellIndex) return c;
                const size = { ...c.size };
                const num = parseInt(value, 10);
                if (Number.isNaN(num)) delete size[bp];
                else size[bp] = Math.max(1, Math.min(12, num));
                return { ...c, size };
              }),
            }
          : row,
      ),
    }));

  const removeCell = (rowIndex: number, cellIndex: number) =>
    setGrid((prev) => ({
      ...prev,
      rows: prev.rows.map((row, i) =>
        i === rowIndex ? { cells: row.cells.filter((_, j) => j !== cellIndex) } : row,
      ),
    }));

  const fieldSelect = (value: string, onSelect: (v: string) => void, label = 'Field') => (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(e) => onSelect(e.target.value)}
      sx={{ minWidth: 160 }}
    >
      {/* Keep an out-of-schema value selectable so nothing is silently lost. */}
      {value && !fieldKeys.includes(value) && (
        <MenuItem value={value}>{value} (not in schema)</MenuItem>
      )}
      {fieldKeys.length === 0 && <MenuItem value="">No properties defined</MenuItem>}
      {fieldKeys.map((k) => (
        <MenuItem key={k} value={k}>{k}</MenuItem>
      ))}
    </TextField>
  );

  const unassignedTab = fieldKeys.filter((k) => !assignedTabFields.has(k));
  const unassignedGrid = fieldKeys.filter((k) => !assignedGridFields.has(k));

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="md" fullWidth>
      <DialogTitle>Configure Layout — {path === 'ROOT' ? 'Form Root' : path}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            select
            label="Layout (ui:field)"
            value={uiField}
            onChange={(e) => setUiField(e.target.value)}
            helperText="The component used to lay out this node's child fields"
            sx={{ maxWidth: 320 }}
          >
            {LAYOUT_FIELD_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
            {/* Preserve a custom/unknown ui:field. */}
            {uiField && !LAYOUT_FIELD_OPTIONS.includes(uiField) && (
              <MenuItem value={uiField}>{uiField} (custom)</MenuItem>
            )}
          </TextField>

          {family === 'object' && (
            <Typography variant="body2" color="text.secondary">
              This node uses the default object layout — fields render in schema order.
              Choose a Tabbed or Grid layout above to configure a custom arrangement.
            </Typography>
          )}

          {/* ── Tabbed layout editor ─────────────────────────────────────── */}
          {family === 'tabbed' && (
            <>
              <Divider textAlign="left"><Chip label="Tabs" size="small" /></Divider>
              {tab.tabs.length === 0 && (
                <Typography variant="body2" color="text.secondary">No tabs yet. Add one below.</Typography>
              )}
              <Stack spacing={1}>
                {tab.tabs.map((t, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      {fieldSelect(t.field, (v) => updateTab(index, { field: v }))}
                      <TextField
                        size="small"
                        label="Icon"
                        value={t.icon || ''}
                        onChange={(e) => updateTab(index, { icon: e.target.value })}
                        sx={{ width: 120 }}
                        InputProps={{
                          endAdornment: t.icon ? <Icon fontSize="small">{t.icon}</Icon> : null,
                        }}
                      />
                      <TextField
                        size="small"
                        label="Title"
                        value={t.title || ''}
                        onChange={(e) => updateTab(index, { title: e.target.value })}
                        sx={{ flexGrow: 1, minWidth: 140 }}
                      />
                      <Tooltip title="Move up"><span><IconButton size="small" disabled={index === 0} onClick={() => moveTab(index, -1)}><ArrowUpward fontSize="small" /></IconButton></span></Tooltip>
                      <Tooltip title="Move down"><span><IconButton size="small" disabled={index === tab.tabs.length - 1} onClick={() => moveTab(index, 1)}><ArrowDownward fontSize="small" /></IconButton></span></Tooltip>
                      <Tooltip title="Remove tab"><IconButton size="small" color="error" onClick={() => removeTab(index)}><Delete fontSize="small" /></IconButton></Tooltip>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
              <Box>
                <Button startIcon={<Add />} onClick={addTab} size="small" variant="outlined">Add tab</Button>
                {unassignedTab.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                    Unassigned fields: {unassignedTab.join(', ')}
                  </Typography>
                )}
              </Box>

              <Divider textAlign="left"><Chip label="Tab options" size="small" /></Divider>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <FormControlLabel
                  control={<Switch checked={tab.useRouter} onChange={(e) => setTab((p) => ({ ...p, useRouter: e.target.checked }))} />}
                  label="Use router (change URL on tab change)"
                />
                <TextField
                  size="small"
                  label="Router path template"
                  value={tab.path}
                  onChange={(e) => setTab((p) => ({ ...p, path: e.target.value }))}
                  disabled={!tab.useRouter}
                  placeholder="/thing/${formContext.props.id}?tab=${tab_id}"
                  sx={{ flexGrow: 1, minWidth: 240 }}
                />
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <TextField
                  select size="small" label="Active tab source" value={tab.activeTab}
                  onChange={(e) => setTab((p) => ({ ...p, activeTab: e.target.value }))}
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="">Component state</MenuItem>
                  <MenuItem value="query">URL query</MenuItem>
                  <MenuItem value="params">Route params</MenuItem>
                </TextField>
                <TextField
                  size="small" label="Active tab key" value={tab.activeTabKey}
                  onChange={(e) => setTab((p) => ({ ...p, activeTabKey: e.target.value }))}
                  disabled={!tab.activeTab}
                  placeholder="tab"
                  sx={{ minWidth: 160 }}
                />
              </Stack>
            </>
          )}

          {/* ── Grid layout editor ───────────────────────────────────────── */}
          {family === 'grid' && (
            <>
              <Divider textAlign="left"><Chip label="Rows" size="small" /></Divider>
              {grid.rows.length === 0 && (
                <Typography variant="body2" color="text.secondary">No rows yet. Add one below.</Typography>
              )}
              <Stack spacing={1}>
                {grid.rows.map((row, rowIndex) => (
                  <Paper key={rowIndex} variant="outlined" sx={{ p: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>Row {rowIndex + 1}</Typography>
                      <Tooltip title="Move up"><span><IconButton size="small" disabled={rowIndex === 0} onClick={() => moveRow(rowIndex, -1)}><ArrowUpward fontSize="small" /></IconButton></span></Tooltip>
                      <Tooltip title="Move down"><span><IconButton size="small" disabled={rowIndex === grid.rows.length - 1} onClick={() => moveRow(rowIndex, 1)}><ArrowDownward fontSize="small" /></IconButton></span></Tooltip>
                      <Tooltip title="Remove row"><IconButton size="small" color="error" onClick={() => removeRow(rowIndex)}><Delete fontSize="small" /></IconButton></Tooltip>
                    </Stack>
                    <Stack spacing={1}>
                      {row.cells.map((cell, cellIndex) => (
                        <Stack key={cellIndex} direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          {fieldSelect(cell.field, (v) => updateCellField(rowIndex, cellIndex, v))}
                          {BREAKPOINTS.map((bp) => (
                            <TextField
                              key={bp}
                              size="small"
                              label={bp}
                              type="number"
                              value={cell.size[bp] ?? ''}
                              onChange={(e) => updateCellSize(rowIndex, cellIndex, bp, e.target.value)}
                              inputProps={{ min: 1, max: 12 }}
                              sx={{ width: 64 }}
                            />
                          ))}
                          <Tooltip title="Remove field"><IconButton size="small" color="error" onClick={() => removeCell(rowIndex, cellIndex)}><Delete fontSize="small" /></IconButton></Tooltip>
                        </Stack>
                      ))}
                      <Box>
                        <Button startIcon={<Add />} size="small" onClick={() => addCell(rowIndex)} disabled={fieldKeys.length === 0}>Add field to row</Button>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
              <Box>
                <Button startIcon={<Add />} onClick={addRow} size="small" variant="outlined">Add row</Button>
                {unassignedGrid.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                    Unassigned fields: {unassignedGrid.join(', ')}
                  </Typography>
                )}
              </Box>

              <Divider textAlign="left"><Chip label="Grid options" size="small" /></Divider>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <TextField
                  size="small" label="Spacing" type="number" value={grid.spacing}
                  onChange={(e) => setGrid((p) => ({ ...p, spacing: parseInt(e.target.value, 10) || 0 }))}
                  inputProps={{ min: 0, max: 10 }} sx={{ width: 100 }}
                />
                <TextField
                  select size="small" label="Container" value={grid.container}
                  onChange={(e) => setGrid((p) => ({ ...p, container: e.target.value }))}
                  sx={{ width: 140 }}
                >
                  <MenuItem value="Paper">Paper</MenuItem>
                  <MenuItem value="div">div</MenuItem>
                </TextField>
                <TextField
                  size="small" label="Elevation" type="number" value={grid.elevation}
                  onChange={(e) => setGrid((p) => ({ ...p, elevation: parseInt(e.target.value, 10) || 0 }))}
                  inputProps={{ min: 0, max: 24 }} sx={{ width: 100 }}
                  disabled={grid.container !== 'Paper'}
                />
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">Save Layout</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LayoutDesignerDialog;
