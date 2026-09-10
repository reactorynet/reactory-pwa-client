import React, { useState, useEffect } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';

export interface LinkConfig {
  url: string;
  text?: string;
  targetBlank?: boolean;
  title?: string;
}

export interface LinkInsertDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (config: LinkConfig) => void;
  onUnlink?: () => void;
  initialUrl?: string;
  initialText?: string;
  initialTargetBlank?: boolean;
  initialTitle?: string;
  isEdit?: boolean;
}

export const LinkInsertDialog: React.FC<LinkInsertDialogProps> = ({
  open,
  onClose,
  onInsert,
  onUnlink,
  initialUrl = '',
  initialText = '',
  initialTargetBlank = true,
  initialTitle = '',
  isEdit = false,
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const [targetBlank, setTargetBlank] = useState(initialTargetBlank);
  const [title, setTitle] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUrl(initialUrl || '');
      setText(initialText || '');
      setTargetBlank(initialTargetBlank !== undefined ? initialTargetBlank : true);
      setTitle(initialTitle || '');
      setError(null);
    }
  }, [open, initialUrl, initialText, initialTargetBlank, initialTitle]);

  const handleConfirm = () => {
    let cleanUrl = url.trim();
    if (!cleanUrl) {
      setError('Please provide a URL.');
      return;
    }

    // Auto-prepend https:// if protocol is missing (excluding mailto: and tel:)
    if (!/^[a-zA-Z]+:\/\//.test(cleanUrl) && !cleanUrl.startsWith('mailto:') && !cleanUrl.startsWith('tel:') && !cleanUrl.startsWith('#') && !cleanUrl.startsWith('/')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    onInsert({
      url: cleanUrl,
      text: text.trim() || undefined,
      targetBlank,
      title: title.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LinkIcon color="primary" fontSize="small" />
        {isEdit ? 'Edit Link' : 'Insert Link'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="URL"
            size="small"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            error={Boolean(error)}
            helperText={error}
            fullWidth
            autoFocus
          />

          <TextField
            label="Display Text"
            size="small"
            placeholder="Link text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            fullWidth
          />

          <TextField
            label="Title / Tooltip (optional)"
            size="small"
            placeholder="Hover description"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={targetBlank}
                onChange={(e) => setTargetBlank(e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="body2">Open link in a new tab</Typography>}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        {isEdit && onUnlink ? (
          <Button
            onClick={() => {
              onUnlink();
              onClose();
            }}
            color="error"
            size="small"
            startIcon={<LinkOffIcon fontSize="small" />}
          >
            Remove Link
          </Button>
        ) : (
          <div />
        )}
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} color="inherit" size="small">
            Cancel
          </Button>
          <Button onClick={handleConfirm} variant="contained" size="small">
            {isEdit ? 'Update' : 'Insert'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default LinkInsertDialog;
