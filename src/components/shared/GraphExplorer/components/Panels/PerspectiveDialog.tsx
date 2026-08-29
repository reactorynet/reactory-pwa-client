import React, { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Icon from '@mui/material/Icon';
import { GraphPerspective } from '../../types';

// ============================================================================
// Save / Save as
// ============================================================================

export interface SavePerspectiveDialogProps {
  open: boolean;
  defaultName: string;
  /** When set the dialog updates this perspective's metadata (rename). */
  existing?: GraphPerspective | null;
  onConfirm(input: { name: string; share: boolean; isDefault: boolean }): void;
  onCancel(): void;
}

export function SavePerspectiveDialog(props: SavePerspectiveDialogProps) {
  const { open, defaultName, existing, onConfirm, onCancel } = props;
  const [name, setName] = useState(defaultName);
  const [share, setShare] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (open) {
      setName(existing?.name ?? defaultName);
      setShare(existing?.share ?? false);
      setIsDefault(existing?.isDefault ?? false);
    }
  }, [open, defaultName, existing]);

  const submit = () => {
    if (name.trim()) onConfirm({ name: name.trim(), share, isDefault });
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{existing ? 'Edit perspective' : 'Save perspective'}</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ mt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
          <FormControlLabel
            control={<Checkbox size="small" checked={share} onChange={(e) => setShare(e.target.checked)} />}
            label="Share with other users"
          />
          <FormControlLabel
            control={<Checkbox size="small" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />}
            label="Open this perspective by default for this project"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" disabled={!name.trim()} onClick={submit}>
          {existing ? 'Update' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================================
// Manager (list / load / rename / duplicate / share / default / delete)
// ============================================================================

export interface PerspectiveManagerDialogProps {
  open: boolean;
  loading: boolean;
  perspectives: GraphPerspective[];
  currentId?: string;
  readOnly?: boolean;
  onLoad(perspective: GraphPerspective): void;
  onRename(perspective: GraphPerspective, name: string): void;
  onDuplicate(perspective: GraphPerspective, name: string): void;
  onToggleShare(perspective: GraphPerspective): void;
  onToggleDefault(perspective: GraphPerspective): void;
  onDelete(perspective: GraphPerspective): void;
  onCancel(): void;
}

export function PerspectiveManagerDialog(props: PerspectiveManagerDialogProps) {
  const {
    open,
    loading,
    perspectives,
    currentId,
    readOnly,
    onLoad,
    onRename,
    onDuplicate,
    onToggleShare,
    onToggleDefault,
    onDelete,
    onCancel,
  } = props;
  const [menu, setMenu] = useState<{ anchor: HTMLElement; perspective: GraphPerspective } | null>(null);
  const [editing, setEditing] = useState<{ mode: 'rename' | 'duplicate'; perspective: GraphPerspective; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<GraphPerspective | null>(null);

  useEffect(() => {
    if (!open) {
      setMenu(null);
      setEditing(null);
      setConfirmDelete(null);
    }
  }, [open]);

  const submitEdit = () => {
    if (!editing || !editing.name.trim()) return;
    if (editing.mode === 'rename') onRename(editing.perspective, editing.name.trim());
    else onDuplicate(editing.perspective, editing.name.trim());
    setEditing(null);
  };

  const describe = (p: GraphPerspective) =>
    [
      `${p.positions.length} node(s)`,
      p.viewMode.toUpperCase(),
      p.layout,
      p.hiddenNodeIds.length ? `${p.hiddenNodeIds.length} hidden` : null,
      p.filters.nodeTypes || p.filters.linkTypes ? 'filtered' : null,
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Perspectives</DialogTitle>
      <DialogContent sx={{ minHeight: 160 }}>
        {loading && <CircularProgress size={22} sx={{ display: 'block', mx: 'auto', my: 2 }} />}
        {!loading && perspectives.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No saved perspectives for this project yet. Arrange the graph and use Save.
          </Typography>
        )}
        <List dense disablePadding>
          {perspectives.map((perspective) => {
            const editingThis = editing?.perspective.id === perspective.id;
            return (
              <ListItem
                key={perspective.id ?? perspective.name}
                disablePadding
                secondaryAction={
                  <IconButton
                    size="small"
                    edge="end"
                    aria-label="Perspective actions"
                    onClick={(e) => setMenu({ anchor: e.currentTarget, perspective })}
                  >
                    <Icon fontSize="small">more_vert</Icon>
                  </IconButton>
                }
              >
                <ListItemButton selected={perspective.id === currentId} onClick={() => onLoad(perspective)}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Icon fontSize="small">{perspective.isDefault ? 'star' : perspective.share ? 'group' : 'bookmark'}</Icon>
                  </ListItemIcon>
                  {editingThis ? (
                    <TextField
                      autoFocus
                      size="small"
                      fullWidth
                      value={editing!.name}
                      label={editing!.mode === 'rename' ? 'Rename' : 'Duplicate as'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setEditing({ ...editing!, name: e.target.value })}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') submitEdit();
                        if (e.key === 'Escape') setEditing(null);
                      }}
                      onBlur={submitEdit}
                    />
                  ) : (
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <span>{perspective.name}</span>
                          {perspective.isDefault && <Chip size="small" label="default" />}
                          {perspective.share && <Chip size="small" variant="outlined" label={perspective.isOwner ? 'shared' : 'shared with you'} />}
                        </Stack>
                      }
                      secondary={describe(perspective)}
                      primaryTypographyProps={{ variant: 'body2', component: 'div' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        <Menu anchorEl={menu?.anchor ?? null} open={Boolean(menu)} onClose={() => setMenu(null)}>
          {menu && (
            <>
              <MenuItem
                onClick={() => {
                  onLoad(menu.perspective);
                  setMenu(null);
                }}
              >
                <ListItemIcon><Icon fontSize="small">open_in_new</Icon></ListItemIcon>
                <ListItemText>Load</ListItemText>
              </MenuItem>
              <MenuItem
                disabled={readOnly}
                onClick={() => {
                  setEditing({ mode: 'duplicate', perspective: menu.perspective, name: `${menu.perspective.name} copy` });
                  setMenu(null);
                }}
              >
                <ListItemIcon><Icon fontSize="small">content_copy</Icon></ListItemIcon>
                <ListItemText>Duplicate</ListItemText>
              </MenuItem>
              <MenuItem
                disabled={readOnly || !menu.perspective.isOwner}
                onClick={() => {
                  setEditing({ mode: 'rename', perspective: menu.perspective, name: menu.perspective.name });
                  setMenu(null);
                }}
              >
                <ListItemIcon><Icon fontSize="small">edit</Icon></ListItemIcon>
                <ListItemText>Rename</ListItemText>
              </MenuItem>
              <MenuItem
                disabled={readOnly || !menu.perspective.isOwner}
                onClick={() => {
                  onToggleShare(menu.perspective);
                  setMenu(null);
                }}
              >
                <ListItemIcon><Icon fontSize="small">{menu.perspective.share ? 'group_off' : 'group'}</Icon></ListItemIcon>
                <ListItemText>{menu.perspective.share ? 'Stop sharing' : 'Share with others'}</ListItemText>
              </MenuItem>
              <MenuItem
                disabled={readOnly || !menu.perspective.isOwner}
                onClick={() => {
                  onToggleDefault(menu.perspective);
                  setMenu(null);
                }}
              >
                <ListItemIcon><Icon fontSize="small">{menu.perspective.isDefault ? 'star_border' : 'star'}</Icon></ListItemIcon>
                <ListItemText>{menu.perspective.isDefault ? 'Clear default' : 'Set as default'}</ListItemText>
              </MenuItem>
              <MenuItem
                disabled={readOnly || !menu.perspective.isOwner}
                onClick={() => {
                  setConfirmDelete(menu.perspective);
                  setMenu(null);
                }}
              >
                <ListItemIcon><Icon fontSize="small">delete</Icon></ListItemIcon>
                <ListItemText>Delete</ListItemText>
              </MenuItem>
            </>
          )}
        </Menu>

        <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs">
          <DialogTitle>Delete perspective?</DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              "{confirmDelete?.name}" will be removed for everyone it is shared with. This cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => {
                if (confirmDelete) onDelete(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </DialogContent>
      <DialogActions>
        <Tooltip title="Perspectives store node positions, expansion, hidden nodes, filters, layout, view mode and camera.">
          <Icon fontSize="small" sx={{ color: 'text.disabled', mr: 'auto', ml: 1 }}>info</Icon>
        </Tooltip>
        <Button onClick={onCancel}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
