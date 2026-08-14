import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import TranslateIcon from '@mui/icons-material/Translate';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  COMMON_LANGUAGES,
  ContentTranslation,
  EditTarget,
  languageLabel,
} from '../types';

export interface TranslationsPanelProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  /** The source language of the record. */
  sourceLocale: string;
  translations: ContentTranslation[];
  /** What the inline editor is currently pointed at. */
  editTarget: EditTarget;
  /** Points the inline editor at a language. */
  onEditTarget: (target: EditTarget) => void;
  /** Creates an empty translation and starts editing it inline. */
  onAddLanguage: (lang: string) => void;
  onDeleteTranslation: (lang: string) => void;
  /** Opens AI assistance pre-loaded with a translation request. */
  onTranslateWithAI: (lang: string) => void;
  /** Blocks language changes while the current edit is unsaved. */
  hasUnsavedChanges: boolean;
}

/**
 * Manages the languages a piece of content exists in.
 *
 * Choosing a language does not open a separate editor — it re-points the
 * inline editor at that translation, so translating happens on the same
 * surface as authoring.
 */
export const TranslationsPanel: React.FC<TranslationsPanelProps> = ({
  open,
  anchorEl,
  onClose,
  sourceLocale,
  translations,
  editTarget,
  onEditTarget,
  onAddLanguage,
  onDeleteTranslation,
  onTranslateWithAI,
  hasUnsavedChanges,
}) => {
  const [adding, setAdding] = useState(false);
  const [newLang, setNewLang] = useState<string | null>(null);

  const existing = useMemo(
    () => new Set([sourceLocale, ...translations.map((t) => t.lang)]),
    [sourceLocale, translations]
  );

  const available = useMemo(
    () => COMMON_LANGUAGES.filter((l) => !existing.has(l.code)),
    [existing]
  );

  const staleCount = translations.filter((t) => t.stale).length;

  const handleAdd = useCallback(() => {
    if (!newLang) return;
    onAddLanguage(newLang);
    setNewLang(null);
    setAdding(false);
  }, [newLang, onAddLanguage]);

  const select = useCallback(
    (target: EditTarget) => {
      if (hasUnsavedChanges) return;
      onEditTarget(target);
    },
    [hasUnsavedChanges, onEditTarget]
  );

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: { width: 440, maxWidth: '95vw', p: 2 } } }}
    >
      <Stack spacing={1.5}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TranslateIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" fontWeight={600}>
            Languages
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.secondary">
            {translations.length + 1} total
          </Typography>
        </Box>

        {hasUnsavedChanges && (
          <Alert severity="info" sx={{ py: 0 }}>
            Save or discard your current changes before switching language.
          </Alert>
        )}

        {staleCount > 0 && (
          <Alert severity="warning" icon={<WarningAmberIcon fontSize="inherit" />} sx={{ py: 0 }}>
            {staleCount} translation{staleCount === 1 ? '' : 's'} may be out of date because the
            source content changed.
          </Alert>
        )}

        <Divider />

        <List dense disablePadding>
          {/* The source language always leads the list. */}
          <ListItemButton
            selected={editTarget.kind === 'source'}
            disabled={hasUnsavedChanges && editTarget.kind !== 'source'}
            onClick={() => select({ kind: 'source', lang: sourceLocale })}
            sx={{ borderRadius: 1 }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {languageLabel(sourceLocale)}
                  </Typography>
                  <Chip label="Source" size="small" color="primary" variant="outlined" />
                </Box>
              }
              secondary={sourceLocale}
            />
            <EditIcon fontSize="small" color="action" />
          </ListItemButton>

          {translations.map((translation) => {
            const isActive =
              editTarget.kind === 'translation' && editTarget.lang === translation.lang;

            return (
              <ListItemButton
                key={translation.lang}
                selected={isActive}
                disabled={hasUnsavedChanges && !isActive}
                onClick={() => select({ kind: 'translation', lang: translation.lang })}
                sx={{ borderRadius: 1 }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      <Typography variant="body2" fontWeight={600}>
                        {languageLabel(translation.lang)}
                      </Typography>
                      {translation.stale && (
                        <Chip label="Out of date" size="small" color="warning" variant="outlined" />
                      )}
                      {translation.machineTranslated && (
                        <Chip label="AI" size="small" variant="outlined" />
                      )}
                      {!translation.content && (
                        <Chip label="Empty" size="small" variant="outlined" />
                      )}
                    </Box>
                  }
                  secondary={translation.lang}
                />
                <Stack direction="row" spacing={0.25}>
                  <Tooltip title="Translate with AI">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTranslateWithAI(translation.lang);
                      }}
                    >
                      <AutoAwesomeIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove this language">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTranslation(translation.lang);
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </ListItemButton>
            );
          })}
        </List>

        <Divider />

        {adding ? (
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Autocomplete
              size="small"
              sx={{ flexGrow: 1 }}
              options={available.map((l) => l.code)}
              getOptionLabel={(code) => `${languageLabel(code)} (${code})`}
              value={newLang}
              onChange={(_, value) => setNewLang(value)}
              renderInput={(params) => (
                <TextField {...params} label="Language" autoFocus placeholder="Search languages" />
              )}
            />
            <Button variant="contained" size="small" disabled={!newLang} onClick={handleAdd}>
              Add
            </Button>
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                setAdding(false);
                setNewLang(null);
              }}
            >
              Cancel
            </Button>
          </Stack>
        ) : (
          <Button
            startIcon={<AddIcon />}
            size="small"
            onClick={() => setAdding(true)}
            disabled={hasUnsavedChanges || available.length === 0}
          >
            Add a language
          </Button>
        )}
      </Stack>
    </Popover>
  );
};

export default TranslationsPanel;
