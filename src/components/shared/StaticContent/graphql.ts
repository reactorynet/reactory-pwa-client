/**
 * GraphQL documents used by the static content editor.
 *
 * Kept in one place so the field selection stays consistent between the read
 * that hydrates the editor and the writes that persist it — a mismatch there
 * is the usual cause of the editor showing stale values after a save.
 */

/**
 * The field selection shared by every content read and write.
 */
const CONTENT_FIELDS = `
  id
  slug
  title
  description
  content
  format
  topics
  published
  version
  locale
  resolvedLocale
  template
  engine
  roles
  metadata
  enableComments
  commentLayout
  commentsProps
  container
  containerProps
  style
  previewInputForm
  helpTopic
  createdBy {
    id
    fullName
  }
  createdAt
  updatedAt
`;

/**
 * Translations are only returned to callers who can author content, so this
 * fragment is appended conditionally by the caller.
 */
const TRANSLATION_FIELDS = `
  translations {
    lang
    title
    description
    content
    tags
    machineTranslated
    stale
    updatedAt
  }
`;

/**
 * Builds the read query. Translations add meaningful weight to the payload, so
 * they are only requested when the viewer can actually edit.
 */
export const buildGetContentQuery = (includeTranslations: boolean): string => `
  query ReactoryGetContentBySlug($slug: String!, $options: ReactoryGetContentOptionsInput) {
    ReactoryGetContentBySlug(slug: $slug, options: $options) {
      ${CONTENT_FIELDS}
      ${includeTranslations ? TRANSLATION_FIELDS : ''}
    }
  }
`;

export const CREATE_CONTENT_MUTATION = `
  mutation ReactoryCreateContent($createInput: CreateContentInput!) {
    ReactoryCreateContent(createInput: $createInput) {
      ${CONTENT_FIELDS}
      ${TRANSLATION_FIELDS}
    }
  }
`;

export const SAVE_TRANSLATION_MUTATION = `
  mutation ReactorySaveContentTranslation($slug: String!, $translation: ReactoryContentTranslationInput!) {
    ReactorySaveContentTranslation(slug: $slug, translation: $translation) {
      ${CONTENT_FIELDS}
      ${TRANSLATION_FIELDS}
    }
  }
`;

export const DELETE_TRANSLATION_MUTATION = `
  mutation ReactoryDeleteContentTranslation($slug: String!, $lang: String!) {
    ReactoryDeleteContentTranslation(slug: $slug, lang: $lang) {
      ${CONTENT_FIELDS}
      ${TRANSLATION_FIELDS}
    }
  }
`;
