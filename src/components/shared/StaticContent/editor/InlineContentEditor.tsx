import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CodeIcon from '@mui/icons-material/Code';
import ExtensionIcon from '@mui/icons-material/Extension';
import NotesIcon from '@mui/icons-material/Notes';
import SettingsIcon from '@mui/icons-material/Settings';
import SubjectIcon from '@mui/icons-material/Subject';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import TranslateIcon from '@mui/icons-material/Translate';
import VisibilityIcon from '@mui/icons-material/Visibility';

import ComponentSelectorDialog from '../ComponentSelectorDialog';
import RichTextSurface, { RichTextSurfaceHandle } from './RichTextSurface';
import SourceSurface, { SourceSurfaceHandle } from './SourceSurface';
import surfaceMinHeight from './sizing';
import SettingsPanel from '../panels/SettingsPanel';
import TranslationsPanel from '../panels/TranslationsPanel';
import AIAssistPanel, { AIAssistIntent } from '../panels/AIAssistPanel';
import { HostEditableField } from '@reactory/client-core/components/shared/ReactorChat/types';
import useContentDraft from '../hooks/useContentDraft';
import {
  ContentFormat,
  contentStats,
  convertContent,
  FORMAT_LABELS,
  isLossyConversion,
} from '../format';
import {
  ContentDraft,
  ContentTranslation,
  EditorPanel,
  EditTarget,
  languageLabel,
  SaveState,
} from '../types';

export interface InlineContentEditorProps {
  reactory: Reactory.Client.ReactorySDK;
  /** The persisted state of the record, used as the baseline for dirty checks. */
  seed: ContentDraft;
  translations: ContentTranslation[];
  slugLocked: boolean;
  aipersona?: Reactory.Schema.UIAIOptions;
  /** Renders a body for the preview pane. */
  renderPreview: (content: string) => React.ReactNode;
  /**
   * Height of the rendered content this editor replaced. Used as the floor for
   * the writing surface so entering edit mode does not shrink the page.
   */
  minBodyHeight?: number;
  onSaveSource: (draft: ContentDraft) => Promise<unknown>;
  onSaveTranslation: (translation: ContentTranslation) => Promise<unknown>;
  onDeleteTranslation: (lang: string) => Promise<unknown>;
  onCancel: () => void;
}

/**
 * The editable projection of whichever language is currently selected.
 */
interface ActiveBody {
  title: string;
  description: string;
  content: string;
}

const FORMAT_OPTIONS: { value: ContentFormat; icon: React.ReactNode; label: string }[] = [
  { value: 'html', icon: <TextFieldsIcon fontSize="small" />, label: 'Rich text' },
  { value: 'markdown', icon: <NotesIcon fontSize="small" />, label: 'Markdown' },
  { value: 'text', icon: <SubjectIcon fontSize="small" />, label: 'Plain text' },
];

/**
 * Edits content in place on the surface it already occupies.
 *
 * Everything that is not the body itself — metadata, publishing, languages, AI
 * — opens in a surface anchored beside the content rather than over it, so the
 * author never loses sight of what they are changing.
 */
export const InlineContentEditor: React.FC<InlineContentEditorProps> = ({
  reactory,
  seed,
  translations,
  slugLocked,
  aipersona,
  renderPreview,
  minBodyHeight,
  onSaveSource,
  onSaveTranslation,
  onDeleteTranslation,
  onCancel,
}) => {
  const [draft, setDraft] = useState<ContentDraft>(seed);
  const [editTarget, setEditTarget] = useState<EditTarget>({ kind: 'source', lang: seed.locale });
  const [translationBodies, setTranslationBodies] = useState<Record<string, ActiveBody>>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [panel, setPanel] = useState<EditorPanel>('none');
  /**
   * The body and metadata as they were when assistance was requested.
   *
   * Held as a snapshot rather than read live: the assistant's component tree is
   * large, and feeding it the current body would re-render all of it on every
   * keystroke. It also matches what the author expects — the request describes
   * the content at the moment they asked for help.
   */
  const [aiRequest, setAiRequest] = useState<{
    intent: AIAssistIntent;
    content: string;
    format: ContentFormat;
    title: string;
    currentLang: string;
    targetLang?: string;
  } | null>(null);
  const [pendingFormat, setPendingFormat] = useState<ContentFormat | null>(null);

  const settingsAnchor = useRef<HTMLButtonElement>(null);
  const translationsAnchor = useRef<HTMLButtonElement>(null);
  const richTextRef = useRef<RichTextSurfaceHandle>(null);
  const sourceRef = useRef<SourceSurfaceHandle>(null);

  // Re-seed when the underlying record changes identity (a different slug, or a
  // save that returned new server values).
  useEffect(() => {
    setDraft(seed);
    setEditTarget((prev) => (prev.kind === 'source' ? { kind: 'source', lang: seed.locale } : prev));
  }, [seed]);

  // Seed the per-language bodies from the server's translations, without
  // discarding anything the author has already typed for that language.
  useEffect(() => {
    setTranslationBodies((prev) => {
      const next = { ...prev };
      translations.forEach((translation) => {
        if (next[translation.lang]) return;
        next[translation.lang] = {
          title: translation.title || '',
          description: translation.description || '',
          content: translation.content || '',
        };
      });
      return next;
    });
  }, [translations]);

  const isTranslating = editTarget.kind === 'translation';

  /**
   * The body currently under the cursor, whichever language that is.
   */
  const activeBody: ActiveBody = useMemo(() => {
    if (!isTranslating) {
      return { title: draft.title, description: draft.description, content: draft.content };
    }
    return (
      translationBodies[editTarget.lang] || { title: '', description: '', content: '' }
    );
  }, [isTranslating, draft, translationBodies, editTarget.lang]);

  const setActiveBody = useCallback(
    (patch: Partial<ActiveBody>) => {
      setSaveState('dirty');
      if (!isTranslating) {
        setDraft((prev) => ({ ...prev, ...patch }));
        return;
      }
      setTranslationBodies((prev) => ({
        ...prev,
        [editTarget.lang]: { ...(prev[editTarget.lang] || { title: '', description: '', content: '' }), ...patch },
      }));
    },
    [isTranslating, editTarget.lang]
  );

  const patchDraft = useCallback((patch: Partial<ContentDraft>) => {
    setSaveState('dirty');
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  // Local recovery copy, keyed per language so a half-written translation is
  // not confused with the source body.
  const draftKey = `${seed.slug || 'new'}.${editTarget.kind}.${editTarget.lang}`;
  const { recovered, clear: clearRecovery, dismiss: dismissRecovery } = useContentDraft(
    draftKey,
    activeBody,
    true
  );

  const hasRecovery = useMemo(() => {
    if (!recovered) return false;
    // Only offer recovery when it actually differs from what is on screen.
    return recovered.content !== activeBody.content || recovered.title !== activeBody.title;
  }, [recovered, activeBody]);

  const isDirty = useMemo(() => {
    if (isTranslating) {
      const stored = translations.find((t) => t.lang === editTarget.lang);
      const body = translationBodies[editTarget.lang];
      if (!body) return false;
      return (
        body.content !== (stored?.content || '') ||
        body.title !== (stored?.title || '') ||
        body.description !== (stored?.description || '')
      );
    }

    return (
      draft.title !== seed.title ||
      draft.description !== seed.description ||
      draft.content !== seed.content ||
      draft.format !== seed.format ||
      draft.locale !== seed.locale ||
      draft.published !== seed.published ||
      draft.version !== seed.version ||
      draft.template !== seed.template ||
      draft.engine !== seed.engine ||
      draft.slug !== seed.slug ||
      draft.helpTopic !== seed.helpTopic ||
      draft.previewInputForm !== seed.previewInputForm ||
      draft.enableComments !== seed.enableComments ||
      draft.commentLayout !== seed.commentLayout ||
      draft.container !== seed.container ||
      JSON.stringify(draft.containerProps) !== JSON.stringify(seed.containerProps) ||
      JSON.stringify(draft.style) !== JSON.stringify(seed.style) ||
      JSON.stringify(draft.commentsProps) !== JSON.stringify(seed.commentsProps) ||
      JSON.stringify(draft.topics) !== JSON.stringify(seed.topics) ||
      JSON.stringify(draft.roles) !== JSON.stringify(seed.roles)
    );
  }, [isTranslating, draft, seed, translations, translationBodies, editTarget.lang]);

  const stats = useMemo(
    () => contentStats(activeBody.content, draft.format),
    [activeBody.content, draft.format]
  );

  const minHeight = useMemo(
    () =>
      surfaceMinHeight({
        format: draft.format,
        measuredHeight: minBodyHeight,
        isTranslating,
      }),
    [draft.format, minBodyHeight, isTranslating]
  );

  /**
   * Switching format converts the body. Conversions that can lose information
   * ask first, because the result overwrites what the author has written.
   */
  const requestFormatChange = useCallback(
    (next: ContentFormat | null) => {
      if (!next || next === draft.format) return;
      if (activeBody.content.trim() && isLossyConversion(draft.format, next)) {
        setPendingFormat(next);
        return;
      }
      setActiveBody({ content: convertContent(activeBody.content, draft.format, next) });
      patchDraft({ format: next });
    },
    [draft.format, activeBody.content, setActiveBody, patchDraft]
  );

  const confirmFormatChange = useCallback(() => {
    if (!pendingFormat) return;
    setActiveBody({ content: convertContent(activeBody.content, draft.format, pendingFormat) });
    patchDraft({ format: pendingFormat });
    setPendingFormat(null);
  }, [pendingFormat, activeBody.content, draft.format, setActiveBody, patchDraft]);

  const insertComponentTag = useCallback(
    (tag: string) => {
      if (draft.format === 'html') {
        richTextRef.current?.insertHtml(tag);
      } else {
        sourceRef.current?.insertText(tag);
      }
      setSaveState('dirty');
    },
    [draft.format]
  );

  const handleSave = useCallback(async () => {
    setSaveState('saving');
    setError(null);

    try {
      if (isTranslating) {
        const body = translationBodies[editTarget.lang];
        const stored = translations.find((t) => t.lang === editTarget.lang);
        await onSaveTranslation({
          lang: editTarget.lang,
          title: body?.title || '',
          description: body?.description || '',
          content: body?.content || '',
          tags: stored?.tags || [],
          // Once a human has edited it, it is no longer purely machine output.
          machineTranslated: false,
        });
      } else {
        await onSaveSource(draft);
      }

      clearRecovery();
      setSaveState('saved');
    } catch (err: any) {
      setError(err?.message || 'Could not save the content.');
      setSaveState('error');
    }
  }, [
    isTranslating,
    translationBodies,
    editTarget.lang,
    translations,
    onSaveTranslation,
    onSaveSource,
    draft,
    clearRecovery,
  ]);

  /**
   * Cmd/Ctrl+S saves without leaving the surface, and Escape leaves the editor
   * when there is nothing to lose.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (isDirty) handleSave();
        return;
      }
      if (event.key === 'Escape' && !isDirty && panel === 'none') {
        onCancel();
      }
    },
    [isDirty, handleSave, panel, onCancel]
  );

  const openAI = useCallback(
    (intent: AIAssistIntent, lang?: string) => {
      setAiRequest({
        intent,
        // Translation works from the source body; every other intent works on
        // whichever language is currently being edited.
        content: intent === 'translate' ? draft.content : activeBody.content,
        format: draft.format,
        title: draft.title,
        currentLang: draft.locale,
        targetLang: lang,
      });
      setPanel('ai');
    },
    [draft.content, draft.format, draft.title, draft.locale, activeBody.content]
  );

  // Stable identities so the memoised assistant is not re-rendered by a new
  // closure on every keystroke.
  const closePanel = useCallback(() => setPanel('none'), []);
  const applyAIResult = useCallback(
    (content: string) => setActiveBody({ content }),
    [setActiveBody]
  );

  /**
   * Latest editor values, so the accessor below can keep a stable identity
   * while still reporting what is on screen right now.
   *
   * A live array would change on every keystroke, and it is passed through the
   * memoised assistant panel — which would re-render the whole chat tree on
   * each character, the exact cost that memo exists to avoid.
   */
  const fieldSourceRef = useRef({ activeBody, draft, isTranslating, editTarget });
  fieldSourceRef.current = { activeBody, draft, isTranslating, editTarget };

  /**
   * The fields the assistant may write to, described for the agent rather than
   * for a developer — the description is the only thing it has to go on.
   *
   * Read at call time so `value` reflects the current text, which lets the
   * agent revise what is there instead of replacing it blind.
   */
  const getEditableFields = useCallback((): HostEditableField[] => {
    const {
      activeBody: body,
      draft: current,
      isTranslating: translating,
      editTarget: target,
    } = fieldSourceRef.current;

    const language = translating ? languageLabel(target.lang) : languageLabel(current.locale);
    const formatName = FORMAT_LABELS[current.format];

    return [
      {
        key: 'content',
        description:
          `The body of the document, written in ${formatName}, in ${language}. ` +
          'Return the complete body, not a fragment. Preserve any <reactory ... /> ' +
          'tags exactly — they mount live components.',
        type: 'string',
        value: body.content,
      },
      {
        key: 'title',
        description: `The document title, in ${language}. A short heading, not a sentence.`,
        type: 'string',
        value: body.title,
      },
      {
        key: 'description',
        description:
          `A one or two sentence summary of the document, in ${language}. ` +
          'Used for search results and previews, so it should read on its own.',
        type: 'string',
        value: body.description,
      },
    ];
  }, []);

  /**
   * Applies a write from the assistant to whichever field it named.
   *
   * Routed through setActiveBody so an agent edit lands on the language
   * currently being edited and is marked unsaved, exactly as a keystroke would
   * be. Nothing is persisted — the author still decides whether to keep it.
   */
  const handleAgentFieldChange = useCallback(
    (key: string, data: unknown) => {
      const value = typeof data === 'string' ? data : String(data ?? '');

      switch (key) {
        case 'content':
          setActiveBody({ content: value });
          break;
        case 'title':
          setActiveBody({ title: value });
          break;
        case 'description':
          setActiveBody({ description: value });
          break;
        default:
          // The macro and the host binding both validate the key, so reaching
          // here means the field list and this switch have drifted apart.
          reactory.log(`Assistant wrote to unmapped content field "${key}"`, {}, 'warning');
      }
    },
    [setActiveBody, reactory]
  );

  const addLanguage = useCallback(
    (lang: string) => {
      setTranslationBodies((prev) => ({
        ...prev,
        [lang]: prev[lang] || { title: '', description: '', content: '' },
      }));
      setEditTarget({ kind: 'translation', lang });
      setPanel('none');
    },
    []
  );

  const removeLanguage = useCallback(
    async (lang: string) => {
      try {
        await onDeleteTranslation(lang);
        setTranslationBodies((prev) => {
          const next = { ...prev };
          delete next[lang];
          return next;
        });
        if (editTarget.kind === 'translation' && editTarget.lang === lang) {
          setEditTarget({ kind: 'source', lang: draft.locale });
        }
      } catch (err: any) {
        setError(err?.message || 'Could not remove the translation.');
      }
    },
    [onDeleteTranslation, editTarget, draft.locale]
  );

  const statusLabel = (() => {
    switch (saveState) {
      case 'saving':
        return 'Saving…';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Not saved';
      case 'dirty':
        return 'Unsaved changes';
      default:
        return 'No changes';
    }
  })();

  return (
    <Box
      onKeyDown={handleKeyDown}
      sx={{
        position: 'relative',
        borderRadius: 1,
        outline: (theme) => `2px solid ${theme.palette.primary.main}`,
        outlineOffset: 4,
      }}
    >
      {/* Action bar. Sticky so it stays reachable while editing a long page. */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          px: 1,
          py: 0.75,
          mb: 1.5,
          borderRadius: 1,
          backgroundColor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          boxShadow: 1,
        }}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={draft.format}
          onChange={(_, value) => requestFormatChange(value)}
          aria-label="Authoring format"
        >
          {FORMAT_OPTIONS.map((option) => (
            <ToggleButton key={option.value} value={option.value} sx={{ px: 1 }}>
              <Tooltip title={option.label}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {option.icon}
                  <Box component="span" sx={{ display: { xs: 'none', md: 'inline' }, fontSize: 12 }}>
                    {option.label}
                  </Box>
                </Box>
              </Tooltip>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem />

        <Tooltip title="Insert a Reactory component">
          <IconButton size="small" onClick={() => setPanel('components')}>
            <ExtensionIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={showPreview ? 'Hide preview' : 'Show preview'}>
          <IconButton
            size="small"
            color={showPreview ? 'primary' : 'default'}
            onClick={() => setShowPreview((v) => !v)}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="AI assistance">
          <IconButton size="small" onClick={() => openAI('improve')}>
            <AutoAwesomeIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Languages">
          <IconButton
            size="small"
            ref={translationsAnchor}
            color={panel === 'translations' ? 'primary' : 'default'}
            onClick={() => setPanel(panel === 'translations' ? 'none' : 'translations')}
          >
            <TranslateIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Settings and publishing">
          <IconButton
            size="small"
            ref={settingsAnchor}
            color={panel === 'settings' ? 'primary' : 'default'}
            onClick={() => setPanel(panel === 'settings' ? 'none' : 'settings')}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Box sx={{ flexGrow: 1 }} />

        {isTranslating && (
          <Chip
            size="small"
            color="primary"
            icon={<TranslateIcon />}
            label={`Editing ${languageLabel(editTarget.lang)}`}
            onDelete={() => setEditTarget({ kind: 'source', lang: draft.locale })}
            deleteIcon={
              <Tooltip title="Back to source language">
                <span style={{ fontSize: 11, paddingRight: 6 }}>source</span>
              </Tooltip>
            }
          />
        )}

        {!draft.published && <Chip size="small" color="warning" variant="outlined" label="Draft" />}

        <Button size="small" color="inherit" onClick={onCancel} disabled={saveState === 'saving'}>
          {isDirty ? 'Discard' : 'Done'}
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleSave}
          disabled={!isDirty || saveState === 'saving'}
          startIcon={
            saveState === 'saving' ? (
              <CircularProgress size={14} color="inherit" />
            ) : saveState === 'saved' ? (
              <CheckCircleIcon fontSize="small" />
            ) : undefined
          }
        >
          {saveState === 'saving' ? 'Saving' : 'Save'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {hasRecovery && (
        <Alert
          severity="info"
          sx={{ mb: 1.5 }}
          action={
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                onClick={() => {
                  setActiveBody(recovered as ActiveBody);
                  dismissRecovery();
                }}
              >
                Restore
              </Button>
              <Button size="small" color="inherit" onClick={clearRecovery}>
                Discard
              </Button>
            </Stack>
          }
        >
          Unsaved work from a previous session was recovered.
        </Alert>
      )}

      {isTranslating && (
        <Box sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Translating from {languageLabel(draft.locale)} into {languageLabel(editTarget.lang)}
            </Typography>
            <Button
              size="small"
              startIcon={<AutoAwesomeIcon fontSize="small" />}
              onClick={() => openAI('translate', editTarget.lang)}
            >
              Translate with AI
            </Button>
          </Stack>
          <Box
            component="input"
            value={activeBody.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setActiveBody({ title: e.target.value })
            }
            placeholder={`Title in ${languageLabel(editTarget.lang)}`}
            sx={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'text.primary',
              font: 'inherit',
              fontSize: '1.25rem',
              fontWeight: 600,
              mb: 1,
              '&::placeholder': { color: 'text.disabled' },
            }}
          />
        </Box>
      )}

      {/* The writing surface, and optionally a live preview beside it. */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: showPreview ? { xs: '1fr', md: '1fr 1fr' } : '1fr',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {draft.format === 'html' ? (
            <RichTextSurface
              ref={richTextRef}
              value={activeBody.content}
              minHeight={minHeight}
              onChange={(html) => setActiveBody({ content: html })}
            />
          ) : (
            <SourceSurface
              ref={sourceRef}
              value={activeBody.content}
              format={draft.format}
              minHeight={minHeight}
              onChange={(value) => setActiveBody({ content: value })}
            />
          )}
        </Box>

        {showPreview && (
          <Box
            sx={{
              minWidth: 0,
              borderLeft: { md: 1 },
              borderColor: { md: 'divider' },
              pl: { md: 2 },
            }}
          >
            <Typography variant="overline" color="text.secondary">
              Preview
            </Typography>
            <Box sx={{ mt: 1 }}>{renderPreview(activeBody.content)}</Box>
          </Box>
        )}
      </Box>

      {/* Status line. */}
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ mt: 1.5, pt: 1, borderTop: 1, borderColor: 'divider', flexWrap: 'wrap' }}
      >
        <Typography
          variant="caption"
          color={saveState === 'error' ? 'error.main' : 'text.secondary'}
        >
          {statusLabel}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {stats.words} words
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {FORMAT_LABELS[draft.format]}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {isTranslating ? languageLabel(editTarget.lang) : `${languageLabel(draft.locale)} (source)`}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          {seed.slug}
        </Typography>
      </Stack>

      <SettingsPanel
        open={panel === 'settings'}
        anchorEl={settingsAnchor.current}
        onClose={() => setPanel('none')}
        draft={draft}
        onChange={patchDraft}
        slugLocked={slugLocked}
      />

      <TranslationsPanel
        open={panel === 'translations'}
        anchorEl={translationsAnchor.current}
        onClose={() => setPanel('none')}
        sourceLocale={draft.locale}
        translations={translations}
        editTarget={editTarget}
        onEditTarget={(target) => {
          setEditTarget(target);
          setPanel('none');
        }}
        onAddLanguage={addLanguage}
        onDeleteTranslation={removeLanguage}
        onTranslateWithAI={(lang) => {
          setEditTarget({ kind: 'translation', lang });
          openAI('translate', lang);
        }}
        hasUnsavedChanges={isDirty}
      />

      {/*
        Only rendered once assistance has actually been asked for. The panel
        hosts a very large component tree, so leaving it out of the tree until
        it is wanted keeps it entirely off the keystroke path.
      */}
      {aiRequest && (
        <AIAssistPanel
          open={panel === 'ai'}
          onClose={closePanel}
          reactory={reactory}
          aipersona={aipersona}
          content={aiRequest.content}
          format={aiRequest.format}
          title={aiRequest.title}
          currentLang={aiRequest.currentLang}
          targetLang={aiRequest.targetLang}
          intent={aiRequest.intent}
          onApply={applyAIResult}
          editableFields={getEditableFields}
          onFieldChange={handleAgentFieldChange}
          contentSlug={seed.slug}
        />
      )}

      <ComponentSelectorDialog
        open={panel === 'components'}
        onClose={() => setPanel('none')}
        onInsert={insertComponentTag}
        reactory={reactory}
      />

      <Dialog open={Boolean(pendingFormat)} onClose={() => setPendingFormat(null)}>
        <DialogTitle>Change format to {pendingFormat ? FORMAT_LABELS[pendingFormat] : ''}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Converting from {FORMAT_LABELS[draft.format]} to{' '}
            {pendingFormat ? FORMAT_LABELS[pendingFormat] : ''} rewrites the body and may lose
            formatting that the new format cannot express. Your content is not saved until you
            choose Save, so you can still discard the result.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setPendingFormat(null)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={confirmFormatChange}>
            Convert
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InlineContentEditor;
