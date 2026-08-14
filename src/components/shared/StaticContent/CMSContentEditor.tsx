import React, { useCallback, useMemo } from 'react';
import { compose } from 'redux';
import { Box, Paper } from '@mui/material';
import { withReactory } from '@reactory/client-core/api/ApiProvider';

import InlineContentEditor from './editor/InlineContentEditor';
import useStaticContent, { normaliseLang, toDraft } from './hooks/useStaticContent';
import { useContentRender } from '@reactory/client-core/components/shared/hooks/useContentRender';
import { coerceFormat, markdownToHtml } from './format';
import { ContentDraft, ContentTranslation, ReactoryStaticContent } from './types';

/**
 * The data contract this editor has always accepted. Retained verbatim so
 * existing callers of `core.CMSContentEditor` keep working.
 */
export interface CMSContentData {
  id?: string;
  slug: string;
  title: string;
  description?: string;
  content: string;
  topics?: string[];
  published?: boolean;
  version?: string;
  locale?: string;
  template?: boolean;
  engine?: string;
  previewInputForm?: string;
  helpTopic?: string;
  format?: string;
}

export interface CMSContentEditorProps {
  initialData: CMSContentData;
  onSave?: (savedContent: CMSContentData) => Promise<void> | void;
  onCancel?: () => void;
  displayMode?: 'inline' | 'drawer' | 'modal' | 'sidepanel' | 'splitPreview';
  reactory: Reactory.Client.ReactorySDK;
}

/**
 * Standalone content editor.
 *
 * This is an adapter rather than a second implementation: it loads the record
 * for a slug and hands it to the same inline editor used when editing content
 * on the page, so there is exactly one editing experience to maintain.
 */
const CMSContentEditorComponent: React.FC<CMSContentEditorProps> = ({
  initialData,
  onSave,
  onCancel,
  displayMode = 'inline',
  reactory,
}) => {
  const { renderContent } = useContentRender(reactory);

  const {
    draftSeed,
    record,
    translations,
    saveContent,
    saveTranslation,
    deleteTranslation,
  } = useStaticContent({
    reactory,
    slug: initialData.slug,
    canEdit: true,
    fallbackTitle: initialData.title,
    fallbackContent: initialData.content,
    locale: initialData.locale,
  });

  /**
   * Values supplied by the caller win until the record loads, so opening the
   * editor from a host that already knows the title shows it immediately.
   */
  const seed: ContentDraft = useMemo(() => {
    if (record) return draftSeed;
    return toDraft(
      {
        id: initialData.id,
        slug: initialData.slug,
        title: initialData.title,
        description: initialData.description,
        content: initialData.content,
        format: coerceFormat(initialData.format, initialData.content),
        topics: initialData.topics,
        published: initialData.published,
        version: initialData.version,
        locale: initialData.locale,
        template: initialData.template,
        engine: initialData.engine,
        previewInputForm: initialData.previewInputForm,
        helpTopic: initialData.helpTopic,
      } as ReactoryStaticContent,
      initialData.slug,
      normaliseLang(initialData.locale || reactory?.i18n?.language)
    );
  }, [record, draftSeed, initialData, reactory]);

  const renderPreview = useCallback(
    (body: string) => {
      const format = coerceFormat(seed.format, body);
      return renderContent(format === 'markdown' ? markdownToHtml(body) : body);
    },
    [seed.format, renderContent]
  );

  const handleSaveSource = useCallback(
    async (draft: ContentDraft) => {
      const saved = await saveContent(draft);
      await onSave?.(saved as CMSContentData);
      return saved;
    },
    [saveContent, onSave]
  );

  const handleSaveTranslation = useCallback(
    async (translation: ContentTranslation) => saveTranslation(translation),
    [saveTranslation]
  );

  const editor = (
    <InlineContentEditor
      reactory={reactory}
      seed={seed}
      translations={translations}
      slugLocked={Boolean(record?.id || initialData.id)}
      renderPreview={renderPreview}
      onSaveSource={handleSaveSource}
      onSaveTranslation={handleSaveTranslation}
      onDeleteTranslation={deleteTranslation}
      onCancel={onCancel || (() => undefined)}
    />
  );

  // Hosted inside a drawer or modal the caller already supplies the surface, so
  // adding another Paper would double the elevation.
  if (displayMode === 'drawer' || displayMode === 'modal' || displayMode === 'sidepanel') {
    return <Box sx={{ p: 1 }}>{editor}</Box>;
  }

  return (
    <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
      {editor}
    </Paper>
  );
};

export const CMSContentEditor: any = compose(withReactory)(CMSContentEditorComponent);
export default CMSContentEditor;
