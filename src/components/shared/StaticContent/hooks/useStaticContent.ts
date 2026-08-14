import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildGetContentQuery,
  CREATE_CONTENT_MUTATION,
  DELETE_TRANSLATION_MUTATION,
  SAVE_TRANSLATION_MUTATION,
} from '../graphql';
import { coerceFormat } from '../format';
import {
  ContentDraft,
  ContentTranslation,
  ReactoryStaticContent,
} from '../types';

export type LoadState = 'loading' | 'found' | 'missing' | 'error';

export interface UseStaticContentArgs {
  reactory: Reactory.Client.ReactorySDK;
  slug: string;
  basePath?: string;
  /** Locale to resolve for viewing. Defaults to the active i18n language. */
  locale?: string;
  /** When true the full translations collection is requested. */
  canEdit: boolean;
  /** Title used for the placeholder record when the slug does not exist yet. */
  fallbackTitle?: string;
  /** Body used for the placeholder record when the slug does not exist yet. */
  fallbackContent?: string;
}

/**
 * Normalises a language tag to its primary subtag, matching how the server
 * keys translations.
 */
export const normaliseLang = (lang?: string): string =>
  (lang || 'en').toLowerCase().split(/[-_]/)[0];

/**
 * Projects a fetched record into the editable draft shape.
 */
export const toDraft = (
  record: ReactoryStaticContent,
  fallbackSlug: string,
  defaultLocale: string
): ContentDraft => ({
  id: record?.id,
  slug: record?.slug || fallbackSlug,
  title: record?.title || '',
  description: record?.description || '',
  content: record?.content || '',
  format: coerceFormat(record?.format, record?.content),
  locale: normaliseLang(record?.locale || defaultLocale),
  topics: record?.topics || [],
  published: record?.published !== undefined ? record.published : true,
  version: record?.version || '1.0.0',
  template: record?.template ?? false,
  engine: record?.engine || 'none',
  roles: record?.roles || [],
  previewInputForm: record?.previewInputForm || '',
  helpTopic: record?.helpTopic || '',
  metadata: (record?.metadata as Record<string, unknown>) || {},
});

/**
 * Owns the lifecycle of a single content record: reading it for a locale,
 * saving the source, and managing its translations.
 *
 * The hook deliberately keeps the server record and the in-flight draft
 * separate, so the rendered view never flickers to a half-edited state and a
 * failed save leaves the user's work intact.
 */
export const useStaticContent = ({
  reactory,
  slug,
  basePath = 'content/static-content',
  locale,
  canEdit,
  fallbackTitle,
  fallbackContent = '',
}: UseStaticContentArgs) => {
  const activeLocale = normaliseLang(locale || reactory?.i18n?.language);

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [record, setRecord] = useState<ReactoryStaticContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow response for a previous slug overwriting the state
  // of the slug we actually care about now.
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    if (!slug) {
      setLoadState('missing');
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoadState('loading');
    setError(null);

    try {
      const result: any = await reactory.graphqlQuery(
        buildGetContentQuery(canEdit),
        {
          slug,
          options: {
            basePath,
            locale: activeLocale,
            includeTranslations: canEdit,
            // Editors always want the source record; applying a translation
            // overlay would make them edit a translation by accident.
            raw: canEdit,
          },
        },
        { fetchPolicy: 'network-only' }
      );

      if (requestRef.current !== requestId) return;

      const found = result?.data?.ReactoryGetContentBySlug;
      if (found) {
        setRecord(found);
        setLoadState('found');
      } else {
        setRecord(null);
        setLoadState('missing');
      }
    } catch (err: any) {
      if (requestRef.current !== requestId) return;
      setError(err?.message || 'Could not load content.');
      setLoadState('error');
    }
  }, [reactory, slug, basePath, activeLocale, canEdit]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * The record used to seed the editor. When the slug has no record yet this
   * is a blank placeholder so the author can create it in place.
   */
  const draftSeed: ContentDraft = useMemo(() => {
    if (record) return toDraft(record, slug, activeLocale);
    return toDraft(
      {
        title: fallbackTitle || '',
        content: fallbackContent,
        locale: activeLocale,
        published: true,
      } as ReactoryStaticContent,
      slug,
      activeLocale
    );
  }, [record, slug, activeLocale, fallbackTitle, fallbackContent]);

  const translations: ContentTranslation[] = useMemo(
    () => record?.translations || [],
    [record]
  );

  /**
   * Persists the source record. Translations are intentionally omitted from the
   * payload so an ordinary save can never clobber them.
   */
  const saveContent = useCallback(
    async (draft: ContentDraft): Promise<ReactoryStaticContent> => {
      if (!draft.title?.trim()) throw new Error('A title is required.');
      if (!draft.slug?.trim()) throw new Error('A slug is required.');

      const createInput = {
        slug: draft.slug,
        title: draft.title,
        description: draft.description,
        content: draft.content,
        format: draft.format,
        published: draft.published,
        topics: draft.topics,
        version: draft.version,
        locale: draft.locale,
        template: draft.template,
        engine: draft.engine,
        roles: draft.roles,
        metadata: draft.metadata,
        previewInputForm: draft.previewInputForm,
        helpTopic: draft.helpTopic,
      };

      const result: any = await reactory.graphqlMutation(CREATE_CONTENT_MUTATION, { createInput });
      const saved = result?.data?.ReactoryCreateContent;
      if (!saved) {
        throw new Error(result?.errors?.[0]?.message || 'The server did not return the saved content.');
      }

      setRecord(saved);
      setLoadState('found');
      return saved;
    },
    [reactory]
  );

  /**
   * Creates or replaces a single translation, leaving the source untouched.
   */
  const saveTranslation = useCallback(
    async (translation: ContentTranslation): Promise<ReactoryStaticContent> => {
      const lang = normaliseLang(translation.lang);
      const result: any = await reactory.graphqlMutation(SAVE_TRANSLATION_MUTATION, {
        slug,
        translation: {
          lang,
          title: translation.title || '',
          description: translation.description || '',
          content: translation.content || '',
          tags: translation.tags || [],
          machineTranslated: translation.machineTranslated === true,
        },
      });

      const saved = result?.data?.ReactorySaveContentTranslation;
      if (!saved) {
        throw new Error(result?.errors?.[0]?.message || 'Could not save the translation.');
      }

      setRecord(saved);
      return saved;
    },
    [reactory, slug]
  );

  const deleteTranslation = useCallback(
    async (lang: string): Promise<ReactoryStaticContent> => {
      const result: any = await reactory.graphqlMutation(DELETE_TRANSLATION_MUTATION, {
        slug,
        lang: normaliseLang(lang),
      });

      const saved = result?.data?.ReactoryDeleteContentTranslation;
      if (!saved) {
        throw new Error(result?.errors?.[0]?.message || 'Could not remove the translation.');
      }

      setRecord(saved);
      return saved;
    },
    [reactory, slug]
  );

  /**
   * The body to render for viewers, with the active locale's translation
   * applied. Editors read the raw record, so the overlay happens here rather
   * than on the server for them.
   */
  const viewContent = useMemo((): ReactoryStaticContent | null => {
    if (!record) return null;
    const sourceLang = normaliseLang(record.locale);
    if (!canEdit || activeLocale === sourceLang) return record;

    const translation = translations.find((t) => normaliseLang(t.lang) === activeLocale);
    if (!translation) return record;

    return {
      ...record,
      title: translation.title || record.title,
      description: translation.description || record.description,
      content: translation.content || record.content,
      resolvedLocale: activeLocale,
    };
  }, [record, translations, activeLocale, canEdit]);

  return {
    loadState,
    error,
    record,
    viewContent,
    draftSeed,
    translations,
    activeLocale,
    reload: load,
    saveContent,
    saveTranslation,
    deleteTranslation,
  };
};

export default useStaticContent;
