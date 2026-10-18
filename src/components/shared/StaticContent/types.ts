import { Moment } from 'moment';
import { languageLabel } from '@reactory/client-core/api/language';
import { ContentFormat } from './format';

/**
 * How the editor surfaces itself relative to the content.
 *
 * `inline` edits the content on the surface it already occupies and is the
 * default. The remaining modes are retained so existing forms that request a
 * drawer or modal keep working.
 */
export type EditDisplayMode = 'inline' | 'drawer' | 'modal' | 'sidepanel' | 'splitPreview' | 'link';

export type CMSSchemaKey = 'inline' | 'full' | 'cms' | 'splitPreview' | 'minimal';

/**
 * Which secondary surface is currently open alongside the inline editor.
 * Only one may be open at a time; none of them cover the content being edited.
 */
export type EditorPanel = 'none' | 'settings' | 'translations' | 'ai' | 'components';

/**
 * A translation of a content item into a single language.
 */
export interface ContentTranslation {
  lang: string;
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  /** True when produced by an AI persona rather than a human. */
  machineTranslated?: boolean;
  /** True when the source content changed after this translation was saved. */
  stale?: boolean;
  updatedAt?: string | Moment;
  updatedBy?: {
    id?: string;
    fullName?: string;
  };
}

/**
 * The content record as the editor works with it.
 */
export interface ReactoryStaticContent {
  id?: string;
  slug?: string;
  title: string;
  content: string;
  description?: string;
  createdBy?: {
    id: string;
    fullName: string;
  };
  createdAt?: Moment | string;
  updatedAt?: Moment | string;
  topics?: string[];
  published?: boolean;
  version?: string;
  /** The source language of `content`. */
  locale?: string;
  /** The language the body was actually resolved into. */
  resolvedLocale?: string;
  format?: ContentFormat;
  roles?: string[];
  metadata?: Record<string, unknown>;
  translations?: ContentTranslation[];
  template?: boolean;
  engine?: string;
  enableComments?: boolean;
  commentLayout?: 'bottom' | 'accordion' | 'drawer' | 'card';
  commentsProps?: Record<string, any>;
  container?: string;
  containerProps?: Record<string, any>;
  style?: Record<string, any>;
  previewInputForm?: string;
  helpTopic?: string;
}

/**
 * The editable projection of a content record, which is what the editor holds
 * in state and what gets persisted on save.
 */
export interface ContentDraft {
  id?: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  format: ContentFormat;
  locale: string;
  topics: string[];
  published: boolean;
  version: string;
  template: boolean;
  engine: string;
  enableComments: boolean;
  commentLayout: 'bottom' | 'accordion' | 'drawer' | 'card';
  commentsProps?: Record<string, any>;
  container: string;
  containerProps: Record<string, any>;
  style: Record<string, any>;
  roles: string[];
  previewInputForm: string;
  helpTopic: string;
  metadata: Record<string, unknown>;
}

/**
 * Identifies what the inline editor is currently editing: either the source
 * record, or one of its translations.
 */
export interface EditTarget {
  kind: 'source' | 'translation';
  /** Language code. For `source` this is the record's own locale. */
  lang: string;
}

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

/**
 * A component discovered in the body and mounted into a portal.
 */
export interface ComponentMountInfo {
  id: string;
  component: string;
  props: any;
  content: string;
}

export interface ReactoryStaticContentProps {
  id: string;
  reactory?: Reactory.Client.ReactorySDK;
  classes?: any;
  showTitle?: boolean;
  title?: string;
  published?: boolean;
  slug: string;
  slugSource?: string;
  slugSourceProps?: {
    paramId: string;
    slugPrefix?: string;
    basePath?: string;
  };
  defaultSlug?: string;
  defaultValue?: any;
  placeHolder?: string;
  propertyBag?: any;
  viewMode?: CMSSchemaKey;
  editDisplayMode?: EditDisplayMode;
  formFqn?: string;
  mode?: string | 'edit' | 'view';
  templateEngine?: 'lodash' | 'handlebars' | 'none';
  match?: any;
  location?: any;
  history?: any;
  editAction?: string | 'inline' | 'link';
  editLink?: string;
  editRoles?: string[];
  viewRoles?: string[];
  autoSaveDrafts?: boolean;
  helpTopics?: string[];
  helpTitle?: string;
  throttle?: number;
  showEditIcon?: boolean;
  isEditing?: boolean;
  useExpanded?: boolean;
  expanded?: boolean;
  container?: string | 'Box' | 'Paper' | React.ComponentType<any>;
  containerProps?: {
    sx?: any;
    className?: string;
    [key: string]: any;
  };
  style?: Record<string, any>;
  /**
   * Flag enabling the commenting experience on this static content item.
   * Uses the resolved slug or record ID as contextId.
   */
  enableComments?: boolean;
  commentLayout?: 'bottom' | 'accordion' | 'drawer' | 'card';
  commentsProps?: Record<string, any>;
  aipersona?: Reactory.Schema.UIAIOptions;
  /**
   * Locale to render. Defaults to the active i18n language.
   */
  locale?: string;
  /**
   * Called after a successful save, with the persisted record.
   */
  onSaved?: (content: ReactoryStaticContent) => void;
  /**
   * Called when editing is cancelled.
   */
  onCancel?: () => void;
}

/**
 * A language offered in the translation picker. Restricted to a working set
 * rather than the full ISO 639-1 list, which is unusable as a dropdown.
 */
export interface LanguageOption {
  code: string;
  label: string;
}

/**
 * Codes offered by the content-authoring language picker.
 *
 * Only the codes live here; labels come from `api/language.ts` so this list
 * cannot disagree with the language selector about what a language is called.
 */
export const COMMON_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: languageLabel('en') },
  { code: 'af', label: languageLabel('af') },
  { code: 'ar', label: languageLabel('ar') },
  { code: 'bn', label: languageLabel('bn') },
  { code: 'de', label: languageLabel('de') },
  { code: 'es', label: languageLabel('es') },
  { code: 'fr', label: languageLabel('fr') },
  { code: 'hi', label: languageLabel('hi') },
  { code: 'id', label: languageLabel('id') },
  { code: 'it', label: languageLabel('it') },
  { code: 'ja', label: languageLabel('ja') },
  { code: 'ko', label: languageLabel('ko') },
  { code: 'nl', label: languageLabel('nl') },
  { code: 'pl', label: languageLabel('pl') },
  { code: 'pt', label: languageLabel('pt') },
  { code: 'ru', label: languageLabel('ru') },
  { code: 'sw', label: languageLabel('sw') },
  { code: 'th', label: languageLabel('th') },
  { code: 'tr', label: languageLabel('tr') },
  { code: 'uk', label: languageLabel('uk') },
  { code: 'ur', label: languageLabel('ur') },
  { code: 'vi', label: languageLabel('vi') },
  { code: 'xh', label: languageLabel('xh') },
  { code: 'zh', label: languageLabel('zh') },
  { code: 'zu', label: languageLabel('zu') },
];

/**
 * Language display names have exactly one implementation.
 *
 * This module used to carry its own (`COMMON_LANGUAGES` + `Intl.DisplayNames`),
 * which drifted from `api/language.ts` on casing — the panels rendered
 * "español" where the language selector rendered "Español". Re-exporting keeps
 * the two in step by construction; `COMMON_LANGUAGES` is only the list of codes
 * the picker offers, and takes its labels from the same helper.
 *
 * Re-exported rather than imported-and-wrapped so existing
 * `import { languageLabel } from '../types'` call sites keep working.
 */
export { languageLabel } from '@reactory/client-core/api/language';
