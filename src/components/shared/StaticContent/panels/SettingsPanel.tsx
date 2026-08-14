import React, { useCallback, useState } from 'react';
import {
  Autocomplete,
  Box,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { ContentDraft, COMMON_LANGUAGES, languageLabel } from '../types';

export interface SettingsPanelProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  draft: ContentDraft;
  onChange: (patch: Partial<ContentDraft>) => void;
  /** Locked once the record exists, since the slug is its identity. */
  slugLocked: boolean;
  /** Roles offered in the visibility picker. */
  availableRoles?: string[];
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="overline"
    color="text.secondary"
    sx={{ display: 'block', letterSpacing: 0.8, mb: 1 }}
  >
    {children}
  </Typography>
);

/**
 * Metadata and publishing options for the content being edited.
 *
 * Presented as a popover anchored to its trigger rather than a modal, so the
 * content stays on screen while its settings are changed — the author can see
 * the effect of toggling publish or switching source language immediately.
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  open,
  anchorEl,
  onClose,
  draft,
  onChange,
  slugLocked,
  availableRoles = ['USER', 'ANON', 'ADMIN', 'DEVELOPER', 'CONTENT-EDITOR'],
}) => {
  const [topicInput, setTopicInput] = useState('');

  const addTopic = useCallback(() => {
    const value = topicInput.trim();
    if (!value || draft.topics.includes(value)) {
      setTopicInput('');
      return;
    }
    onChange({ topics: [...draft.topics, value] });
    setTopicInput('');
  }, [topicInput, draft.topics, onChange]);

  const removeTopic = useCallback(
    (topic: string) => onChange({ topics: draft.topics.filter((t) => t !== topic) }),
    [draft.topics, onChange]
  );

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: { width: 460, maxWidth: '95vw', p: 2.5 } } }}
    >
      <Stack spacing={2.5}>
        <Box>
          <SectionLabel>Details</SectionLabel>
          <Stack spacing={1.5}>
            <TextField
              label="Title"
              value={draft.title}
              onChange={(e) => onChange({ title: e.target.value })}
              size="small"
              fullWidth
              required
              error={!draft.title?.trim()}
              helperText={!draft.title?.trim() ? 'A title is required to save.' : ' '}
            />
            <TextField
              label="Slug"
              value={draft.slug}
              onChange={(e) => onChange({ slug: e.target.value })}
              size="small"
              fullWidth
              disabled={slugLocked}
              helperText={
                slugLocked
                  ? 'The slug identifies this content and cannot be changed after creation.'
                  : 'Unique identifier used to look this content up.'
              }
            />
            <TextField
              label="Description"
              value={draft.description}
              onChange={(e) => onChange({ description: e.target.value })}
              size="small"
              fullWidth
              multiline
              minRows={2}
              helperText="Short summary used for search results and previews."
            />
          </Stack>
        </Box>

        <Divider />

        <Box>
          <SectionLabel>Topics</SectionLabel>
          {draft.topics.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
              {draft.topics.map((topic) => (
                <Chip
                  key={topic}
                  label={topic}
                  size="small"
                  variant="outlined"
                  onDelete={() => removeTopic(topic)}
                />
              ))}
            </Box>
          )}
          <TextField
            label="Add a topic"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTopic();
              }
            }}
            onBlur={addTopic}
            size="small"
            fullWidth
            helperText="Press Enter to add."
          />
        </Box>

        <Divider />

        <Box>
          <SectionLabel>Publishing</SectionLabel>
          <Stack spacing={1.5}>
            <FormControlLabel
              control={
                <Switch
                  checked={draft.published}
                  onChange={(e) => onChange({ published: e.target.checked })}
                />
              }
              label={draft.published ? 'Published' : 'Draft — not visible to readers'}
            />

            <FormControl size="small" fullWidth>
              <InputLabel id="content-source-language">Source language</InputLabel>
              <Select
                labelId="content-source-language"
                label="Source language"
                value={draft.locale}
                onChange={(e) => onChange({ locale: e.target.value })}
              >
                {COMMON_LANGUAGES.map((language) => (
                  <MenuItem key={language.code} value={language.code}>
                    {language.label} ({language.code})
                  </MenuItem>
                ))}
                {/* A record may already carry a language outside the working set. */}
                {!COMMON_LANGUAGES.some((l) => l.code === draft.locale) && (
                  <MenuItem value={draft.locale}>
                    {languageLabel(draft.locale)} ({draft.locale})
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            <Autocomplete
              multiple
              size="small"
              options={availableRoles}
              value={draft.roles}
              freeSolo
              onChange={(_, value) => onChange({ roles: value as string[] })}
              renderTags={(value, getTagProps) =>
                value.map((role, index) => (
                  <Chip size="small" label={role} {...getTagProps({ index })} key={role} />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Visible to roles"
                  helperText="Leave empty to make this visible to everyone."
                />
              )}
            />

            <TextField
              label="Version"
              value={draft.version}
              onChange={(e) => onChange({ version: e.target.value })}
              size="small"
              fullWidth
            />
          </Stack>
        </Box>

        <Divider />

        <Box>
          <SectionLabel>Advanced</SectionLabel>
          <Stack spacing={1.5}>
            <FormControlLabel
              control={
                <Switch
                  checked={draft.template}
                  onChange={(e) => onChange({ template: e.target.checked })}
                />
              }
              label="Treat body as a template"
            />

            <FormControl size="small" fullWidth disabled={!draft.template}>
              <InputLabel id="content-engine">Template engine</InputLabel>
              <Select
                labelId="content-engine"
                label="Template engine"
                value={draft.engine || 'none'}
                onChange={(e) => onChange({ engine: e.target.value })}
              >
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="lodash">Lodash</MenuItem>
                <MenuItem value="handlebars">Handlebars</MenuItem>
                <MenuItem value="ejs">EJS</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Preview input form"
              value={draft.previewInputForm}
              onChange={(e) => onChange({ previewInputForm: e.target.value })}
              size="small"
              fullWidth
              placeholder="core.ContentPreviewForm@1.0.0"
              helperText="Form used to supply template values when previewing."
            />

            <TextField
              label="Help topic"
              value={draft.helpTopic}
              onChange={(e) => onChange({ helpTopic: e.target.value })}
              size="small"
              fullWidth
              placeholder="USER_ONBOARDING_HELP"
            />
          </Stack>
        </Box>
      </Stack>
    </Popover>
  );
};

export default SettingsPanel;
