import React from 'react';
import { ChatDataInput, ChatState } from '../types';

/**
 * Status presets the editor offers. Kept in sync with the agent tool's palette
 * (see `updateChatData.ts` on the server) so manual and AI edits agree.
 */
export const CHAT_STATUS_PRESETS: {
  key: string;
  label: string;
  icon: string;
  color: string;
}[] = [
  { key: 'in_progress', label: 'In progress', icon: 'pending', color: '#f9a825' },
  { key: 'complete', label: 'Complete', icon: 'check_circle', color: '#2e7d32' },
  { key: 'blocked', label: 'Blocked', icon: 'error', color: '#c62828' },
  { key: 'investigating', label: 'Investigating', icon: 'search', color: '#1565c0' },
  { key: 'planning', label: 'Planning', icon: 'lightbulb', color: '#6a1b9a' },
];

/**
 * Parse the free-text tags field into a normalised array: split on commas,
 * trim, drop blanks and de-duplicate.
 */
export const parseTags = (value: string): string[] => {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    ),
  );
};

export interface ChatDataEditorDialogProps {
  open: boolean;
  /** The conversation being edited. */
  chat: ChatState | null;
  onClose: () => void;
  /** Persist the change. May throw — the dialog surfaces the error inline. */
  onSave: (data: ChatDataInput) => Promise<void> | void;
  Material: any;
  il8n?: any;
}

const ChatDataEditorDialog: React.FC<ChatDataEditorDialogProps> = ({
  open,
  chat,
  onClose,
  onSave,
  Material,
  il8n,
}) => {
  const {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    TextField,
    Chip,
    Icon,
    Alert,
    CircularProgress,
  } = Material.MaterialCore;

  const [title, setTitle] = React.useState('');
  const [summary, setSummary] = React.useState('');
  const [tagsText, setTagsText] = React.useState('');
  const [icon, setIcon] = React.useState('');
  const [color, setColor] = React.useState('#f9a825');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const chatId = (chat as any)?.id;

  // Seed the form from the conversation whenever it opens or the target changes.
  React.useEffect(() => {
    if (!open) return;
    setTitle(chat?.title || '');
    setSummary(chat?.summary || '');
    setTagsText(Array.isArray(chat?.tags) ? chat.tags.join(', ') : '');
    setIcon(chat?.icon || '');
    setColor(chat?.color || '#f9a825');
    setSaving(false);
    setError('');
  }, [open, chatId]); // eslint-disable-line react-hooks/exhaustive-deps

  const parsedTags = React.useMemo(() => parseTags(tagsText), [tagsText]);

  const activePresetKey = React.useMemo(() => {
    const match = CHAT_STATUS_PRESETS.find(
      (preset) => preset.icon === icon && preset.color.toLowerCase() === color.toLowerCase(),
    );
    return match?.key;
  }, [icon, color]);

  const handlePresetClick = (preset: typeof CHAT_STATUS_PRESETS[number]) => {
    if (icon === preset.icon && color.toLowerCase() === preset.color.toLowerCase()) {
      // Clicking the active preset clears the status.
      setIcon('');
      setColor('');
      return;
    }
    setIcon(preset.icon);
    setColor(preset.color);
  };

  const handleSave = async () => {
    if (!chatId || saving) return;
    setSaving(true);
    setError('');
    try {
      const data: ChatDataInput = {};
      const trimmedTitle = title.trim();
      if (trimmedTitle) data.title = trimmedTitle;
      const trimmedSummary = summary.trim();
      if (trimmedSummary) data.summary = trimmedSummary;

      // Always send tags so the list can be cleared from the UI.
      data.tags = parsedTags;

      const trimmedIcon = icon.trim();
      if (trimmedIcon) data.icon = trimmedIcon;
      const trimmedColor = color.trim();
      if (trimmedColor) data.color = trimmedColor;

      await onSave(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to save conversation details');
    } finally {
      setSaving(false);
    }
  };

  if (!chat) return null;

  const statusPreview = icon ? (
    <Box
      component={Icon}
      sx={{ color: color || 'text.secondary', fontSize: 20, verticalAlign: 'middle' }}
    >
      {icon}
    </Box>
  ) : null;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {il8n?.t('reactor.client.chat.history.editDetails', {
          defaultValue: 'Edit conversation details',
        }) ?? 'Edit conversation details'}
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <TextField
          label="Title"
          value={title}
          onChange={(e: any) => setTitle(e.target.value)}
          fullWidth
          size="small"
          margin="dense"
          placeholder="Short, specific title"
          inputProps={{ maxLength: 120 }}
          helperText="Overrides the auto-generated title."
        />

        <TextField
          label="Summary"
          value={summary}
          onChange={(e: any) => setSummary(e.target.value)}
          fullWidth
          size="small"
          margin="dense"
          multiline
          minRows={2}
          maxRows={5}
          placeholder="A sentence or two describing the conversation"
        />

        <TextField
          label="Tags"
          value={tagsText}
          onChange={(e: any) => setTagsText(e.target.value)}
          fullWidth
          size="small"
          margin="dense"
          placeholder="comma, separated, tags"
          helperText="Comma separated. Saved as lower-case kebab-case tags."
        />

        {parsedTags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            {parsedTags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        )}

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5, fontWeight: 'bold' }}>
          Status
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {CHAT_STATUS_PRESETS.map((preset) => {
            const active = activePresetKey === preset.key;
            return (
              <Chip
                key={preset.key}
                label={preset.label}
                size="small"
                clickable
                onClick={() => handlePresetClick(preset)}
                variant={active ? 'filled' : 'outlined'}
                icon={
                  <Box
                    component={Icon}
                    sx={{
                      fontSize: '16px !important',
                      color: active ? undefined : preset.color,
                    }}
                  >
                    {preset.icon}
                  </Box>
                }
                sx={
                  active
                    ? { bgcolor: preset.color, color: '#fff', '& .MuiChip-icon': { color: '#fff !important' } }
                    : undefined
                }
              />
            );
          })}
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
          <TextField
            label="Status icon"
            value={icon}
            onChange={(e: any) => setIcon(e.target.value)}
            size="small"
            margin="dense"
            placeholder="e.g. check_circle"
            sx={{ flex: 1 }}
            InputProps={{
              endAdornment: statusPreview,
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <input
              type="color"
              value={color || '#000000'}
              onChange={(e: any) => setColor(e.target.value)}
              aria-label="Status colour"
              style={{
                width: 40,
                height: 40,
                padding: 0,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
              }}
            />
            <TextField
              label="Colour"
              value={color}
              onChange={(e: any) => setColor(e.target.value)}
              size="small"
              margin="dense"
              placeholder="#2e7d32"
              sx={{ width: 130 }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChatDataEditorDialog;
