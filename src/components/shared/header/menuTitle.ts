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
    language?: string;
    t?: (key: string, options?: { ns?: string; [key: string]: unknown }) => string;
    /** Namespace-strict lookup, used to detect namespace fallthrough. */
    getResource?: (lng: string, ns: string, key: string) => unknown;
    /** Loaded namespaces, used to tell a real prefix from a literal colon. */
    options?: { ns?: string[] };
  };
  warning?: (message: string, params?: unknown) => void;
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
 *
 * Deliberately permissive: any `prefix:suffix` splits, so a literal title that
 * happens to contain a colon (`Support: FAQ`, a URL) also parses as a key. The
 * caller decides whether the prefix is actually a namespace; see
 * {@link isLoadedNamespace}.
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
 * Whether `namespace` is one the app actually loaded.
 *
 * Returns `null` when the loaded set cannot be determined, which callers treat
 * as "assume yes" so a missing `options.ns` degrades to the permissive
 * behaviour rather than breaking key resolution.
 */
export const isLoadedNamespace = (
  i18n: MenuTitleReactory['i18n'],
  namespace: string
): boolean | null => {
  const loaded = i18n?.options?.ns;
  if (!Array.isArray(loaded) || loaded.length === 0) return null;
  return loaded.indexOf(namespace) >= 0;
};

/**
 * A namespaced lookup can still resolve when the key is absent from the
 * requested namespace, because `fallbackNS` is configured to all loaded
 * namespaces. The value shown is then correct-but-borrowed, and the real
 * problem — an incomplete locale file — stays invisible. Report it once per
 * key so the gap is discoverable without being noisy.
 *
 * Only fires when the i18n instance exposes a namespace-strict lookup.
 */
const reportNamespaceFallthrough = (
  reactory: MenuTitleReactory | null | undefined,
  parsed: ParsedMenuTitle
): void => {
  const i18n = reactory?.i18n;
  if (!parsed.namespace || !i18n || typeof i18n.getResource !== 'function') return;

  try {
    const language = i18n.language || 'en';
    // Namespace-strict: unlike `t`, this does not consult fallback namespaces.
    if (i18n.getResource(language, parsed.namespace, parsed.key) !== undefined) return;

    const message =
      `Menu title "${parsed.key}" is missing from the "${parsed.namespace}" bundle for ` +
      `"${language}"; it resolved from a fallback namespace. The translation data for ` +
      `that namespace is incomplete.`;

    if (typeof reactory?.warning === 'function') {
      reactory.warning(message, { namespace: parsed.namespace, key: parsed.key, language });
    }
  } catch (diagnosticError) {
    // Diagnostics must never affect rendering.
  }
};

/**
 * Resolves a stored menu title into display text for the active language.
 *
 * Plain text passes through unchanged: i18next returns the key itself when no
 * translation exists, which is how a literal is distinguished from a key.
 *
 * A colon-bearing literal is treated as plain text, not as namespace + key. The
 * prefix only counts as a namespace when the app loaded it; otherwise the whole
 * title is returned untouched. Probing an unknown prefix would be worse than
 * useless — `fallbackNS` would let the *suffix* resolve against some other
 * bundle (`Support: FAQ` rendering a translation for `FAQ`), and it would emit a
 * misleading "incomplete namespace" diagnostic.
 *
 * When nothing resolves, the readable fallback map is consulted and then the
 * **whole** stored title is returned — never the parsed remainder.
 */
export const translateMenuTitle = (
  reactory: MenuTitleReactory | null | undefined,
  rawTitle?: string
): string => {
  const parsed = parseMenuTitle(rawTitle);
  if (!parsed) return '';

  const raw = rawTitle.trim();
  const i18n = reactory?.i18n;
  const translate = i18n?.t;

  // A prefix that is known *not* to be a namespace means the title is a literal.
  const literalWithColon =
    parsed.namespace !== null && isLoadedNamespace(i18n, parsed.namespace) === false;

  if (literalWithColon) {
    // No key probe at all: the suffix is not a key. The fallback map cannot
    // apply either — its keys carry no colon, and this title does.
    return raw;
  }

  if (typeof translate === 'function') {
    try {
      if (parsed.namespace) {
        const namespaced = translate(parsed.key, { ns: parsed.namespace });
        if (namespaced && namespaced !== parsed.key) {
          reportNamespaceFallthrough(reactory, parsed);
          return namespaced;
        }
      }

      const translated = translate(parsed.key);
      if (translated && translated !== parsed.key) return translated;
    } catch (translationError) {
      // A malformed key must not take the whole menu down.
    }
  }

  return FALLBACK_TITLES[parsed.key] || raw;
};

export default translateMenuTitle;
