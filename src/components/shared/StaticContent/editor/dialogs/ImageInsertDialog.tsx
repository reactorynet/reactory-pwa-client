import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { ImageAttributes } from '../blots/imageBlot';

export interface ImageInsertDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (attributes: ImageAttributes) => void;
  initialAttributes?: Partial<ImageAttributes>;
}

export const ImageInsertDialog: React.FC<ImageInsertDialogProps> = ({
  open,
  onClose,
  onInsert,
  initialAttributes,
}) => {
  const [tab, setTab] = useState(0);
  const [src, setSrc] = useState(initialAttributes?.src || '');
  const [alt, setAlt] = useState(initialAttributes?.alt || '');
  const [title, setTitle] = useState(initialAttributes?.title || '');
  const [sizePreset, setSizePreset] = useState<string>('100%');
  const [alignment, setAlignment] = useState<string>('center');
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPEG, WebP, SVG, GIF).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image is larger than 2MB. Consider optimizing before embedding.');
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const computeStyle = (): string => {
    const parts: string[] = [];

    // Alignment
    if (alignment === 'center') {
      parts.push('display: block; margin: 16px auto;');
    } else if (alignment === 'left') {
      parts.push('float: left; margin: 0 16px 16px 0;');
    } else if (alignment === 'right') {
      parts.push('float: right; margin: 0 0 16px 16px;');
    } else {
      parts.push('display: inline-block; margin: 4px;');
    }

    // Size
    if (sizePreset !== 'auto') {
      parts.push(`width: ${sizePreset}; max-width: 100%; height: auto;`);
    } else {
      parts.push('max-width: 100%; height: auto;');
    }

    return parts.join(' ');
  };

  const handleConfirm = () => {
    if (!src.trim()) {
      setError('Please provide an image URL or upload a file.');
      return;
    }

    onInsert({
      src: src.trim(),
      alt: alt.trim() || undefined,
      title: title.trim() || undefined,
      style: computeStyle(),
    });

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ImageIcon color="primary" fontSize="small" />
        Insert HTML Image
      </DialogTitle>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Web URL" />
        <Tab label="Upload Local" />
      </Tabs>

      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          {tab === 0 ? (
            <TextField
              label="Image URL"
              size="small"
              placeholder="https://example.com/photo.png"
              value={src}
              onChange={(e) => setSrc(e.target.value)}
              fullWidth
              autoFocus
            />
          ) : (
            <Box
              sx={{
                p: 3,
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                textAlign: 'center',
                backgroundColor: 'action.hover',
              }}
            >
              <input
                type="file"
                accept="image/*"
                id="static-content-image-upload"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <label htmlFor="static-content-image-upload">
                <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />} size="small">
                  Choose Image File
                </Button>
              </label>
              {src.startsWith('data:') && (
                <Typography variant="caption" display="block" color="success.main" sx={{ mt: 1 }}>
                  Image loaded successfully!
                </Typography>
              )}
            </Box>
          )}

          {error && (
            <Typography variant="caption" color="error">
              {error}
            </Typography>
          )}

          {src && (
            <Box sx={{ textAlign: 'center', maxHeight: 160, overflow: 'hidden', border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}>
              <img src={src} alt="Preview" style={{ maxHeight: 140, maxWidth: '100%', objectFit: 'contain' }} />
            </Box>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Alt Text (accessibility)"
              size="small"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              fullWidth
            />
            <TextField
              label="Title / Tooltip"
              size="small"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Size Preset</InputLabel>
              <Select value={sizePreset} label="Size Preset" onChange={(e) => setSizePreset(e.target.value)}>
                <MenuItem value="auto">Auto / Original</MenuItem>
                <MenuItem value="25%">Small (25%)</MenuItem>
                <MenuItem value="50%">Medium (50%)</MenuItem>
                <MenuItem value="75%">Large (75%)</MenuItem>
                <MenuItem value="100%">Full Width (100%)</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel>Alignment</InputLabel>
              <Select value={alignment} label="Alignment" onChange={(e) => setAlignment(e.target.value)}>
                <MenuItem value="center">Center Block</MenuItem>
                <MenuItem value="left">Float Left (wrap text)</MenuItem>
                <MenuItem value="right">Float Right (wrap text)</MenuItem>
                <MenuItem value="inline">Inline</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit" size="small">
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained" size="small">
          Insert Image
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageInsertDialog;
