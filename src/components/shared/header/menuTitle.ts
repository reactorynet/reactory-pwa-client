/**
 * Menu title resolution.
 *
 * Menu items are stored with a title that is either a translation key or plain
 * text. Keys may be namespaced, e.g. `booktutor:reactory.menu.home`, and the
 * unprefixed form (`reactory.menu.about-reactory`) resolves against the default
 * namespace.
 *
 * Translation belongs here rather than on the server. The server's i18n is a
 * process-wide singleton whose language is not the request's, so translating
 * there pinned menus to an arbitrary locale and discarded the key the client
 * needs to re-resolve them. Resolving on the client means menus follow the
 * user's active language, and update the moment it changes.
 */

export interface MenuTitleReactory {
  i18n?: {
    t?: (key: string, options?: { ns?: string; [key: string]: unknown }) => string;
  };
}

export interface ParsedMenuTitle {
  /** Namespace prefix, or `null` when the title is unprefixed. */
  namespace: string | null;
  /** The translation key, or the literal title when it is not a key. */
  key: string;
}

/**
 * Titles the loaded bundles do not cover. A safety net for keys whose locale
 * file is missing or incomplete, so a menu degrades to readable English instead
 * of rendering a raw key.
 */
const FALLBACK_TITLES: Record<string, string> = {
  'reactory.menu.my-owned-courses': 'Courses Owned',
  'reactory.menu.classes': 'Classes & Cohorts',
  'reactory.menu.create-course': 'Create Course',
  'reactory.menu.create-assignment': 'Create Assignment',
  'reactory.menu.course-enroll': 'Course Enrollment',
  'reactory.menu.my-schedule': 'Schedule',
  'reactory.menu.my-courses': 'My Courses',
  'reactory.menu.my-tutors': 'My Tutors',
  'reactory.menu.my-students': 'My Students',
  'reactory.menu.assignments': 'Assignments',
  'reactory.menu.home': 'Home',
  'reactory.menu.library': 'Library',
  'reactory.menu.courses': 'Courses',
  'reactory.menu.my-profile': 'Profile',
  'reactory.menu.markbook': 'Classroom Markbook',
};

/**
 * Splits an optional `namespace:` prefix off a stored menu title.
 * Returns `null` for empty input so callers can render nothing.
 */
export const parseMenuTitle = (rawTitle?: string): ParsedMenuTitle | null => {
  if (typeof rawTitle !== 'string') return null;

  const trimmed = rawTitle.trim();
  if (trimmed.length === 0) return null;

  const separator = trimmed.indexOf(':');
  if (separator > 0) {
    const namespace = trimmed.slice(0, separator).trim();
    const key = trimmed.slice(separator + 1).trim();
    if (namespace.length > 0 && key.length > 0) {
      return { namespace, key };
    }
  }

  return { namespace: null, key: trimmed };
};

/**
 * Resolves a stored menu title into display text for the active language.
 *
 * Plain text passes through unchanged: i18next returns the key itself when no
 * translation exists, which is how a literal is distinguished from a key.
 */
export const translateMenuTitle = (
  reactory: MenuTitleReactory | null | undefined,
  rawTitle?: string
): string => {
  const parsed = parseMenuTitle(rawTitle);
  if (!parsed) return '';

  const translate = reactory?.i18n?.t;
  if (typeof translate === 'function') {
    try {
      if (parsed.namespace) {
        const namespaced = translate(parsed.key, { ns: parsed.namespace });
        if (namespaced && namespaced !== parsed.key) return namespaced;
      }

      const translated = translate(parsed.key);
      if (translated && translated !== parsed.key) return translated;
    } catch (translationError) {
      // A malformed key must not take the whole menu down.
    }
  }

  return FALLBACK_TITLES[parsed.key] || parsed.key;
};

export default translateMenuTitle;
