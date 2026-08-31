import { Moment } from 'moment';
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
}

/**
 * A language offered in the translation picker. Restricted to a working set
 * rather than the full ISO 639-1 list, which is unusable as a dropdown.
 */
export interface LanguageOption {
  code: string;
  label: string;
}

export const COMMON_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'af', label: 'Afrikaans' },
  { code: 'ar', label: 'Arabic' },
  { code: 'bn', label: 'Bengali' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'hi', label: 'Hindi' },
  { code: 'id', label: 'Indonesian' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'sw', label: 'Swahili' },
  { code: 'th', label: 'Thai' },
  { code: 'tr', label: 'Turkish' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'ur', label: 'Urdu' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'xh', label: 'Xhosa' },
  { code: 'zh', label: 'Chinese' },
  { code: 'zu', label: 'Zulu' },
];

/**
 * Resolves a language code to a display label, falling back to the code itself
 * for languages outside the working set.
 */
export const languageLabel = (code: string): string => {
  if (!code) return '';
  const known = COMMON_LANGUAGES.find((l) => l.code === code.toLowerCase());
  if (known) return known.label;

  // Intl knows far more languages than the picker offers; use it when present.
  try {
    const display = new Intl.DisplayNames([code], { type: 'language' });
    return display.of(code) || code;
  } catch (e) {
    return code;
  }
};
