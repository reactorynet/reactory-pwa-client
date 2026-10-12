/**
 * Language selection helpers.
 *
 * The application resolves its active language in a fixed order:
 *
 *   1. the user's explicit choice (persisted in localStorage)
 *   2. the browser's preferred languages (`navigator.languages`)
 *   3. the application default (English)
 *
 * i18next ships a browser detector, but detection alone cannot honour an
 * in-app override (an explicit `lng` passed to `init` wins over detection).
 * The order above is therefore owned here, and the resolved value is handed to
 * i18next at start-up and again on every change.
 */

export interface SupportedLanguage {
  /** ISO 639-1 primary subtag, e.g. `en`. */
  code: string;
  /** English label shown in the selector. */
  label: string;
}

/** Language used when neither a preference nor a browser match is available. */
export const DEFAULT_LANGUAGE = 'en';

/**
 * Languages the application ships translations for.
 *
 * Keep in sync with the locale folders under `reactory-data/i18n` and the
 * server's i18n `preload` list. Adding an entry here makes it selectable and
 * preloaded; no other change is required.
 */
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', label: 'English' },
  { code: 'af', label: 'Afrikaans' },
];

export const SUPPORTED_LANGUAGE_CODES: string[] = SUPPORTED_LANGUAGES.map(
  (language) => language.code
);

/** localStorage key holding the user's explicit language choice. */
export const LANGUAGE_STORAGE_KEY = '$reactory$language';

/**
 * Reduces a BCP-47 tag to its lowercase primary subtag (`af-ZA` -> `af`),
 * matching how the server keys content translations and locale folders.
 */
export const normaliseLanguage = (language?: string): string =>
  (language || '').toLowerCase().split(/[-_]/)[0];

export const isSupportedLanguage = (language?: string): boolean =>
  SUPPORTED_LANGUAGE_CODES.indexOf(normaliseLanguage(language)) >= 0;

/** Human-readable label for a language code, falling back to the code itself. */
export const languageLabel = (language?: string): string => {
  const normalised = normaliseLanguage(language);
  const found = SUPPORTED_LANGUAGES.find((candidate) => candidate.code === normalised);
  return found ? found.label : language || '';
};

const safeLocalStorage = (): Storage | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch (error) {
    // Access can throw in private browsing modes and sandboxed frames.
    return null;
  }
};

/** The persisted language choice, or `null` when there is none/unsupported. */
export const getStoredLanguage = (): string | null => {
  const store = safeLocalStorage();
  if (!store) return null;
  try {
    const stored = store.getItem(LANGUAGE_STORAGE_KEY);
    return stored && isSupportedLanguage(stored) ? normaliseLanguage(stored) : null;
  } catch (error) {
    return null;
  }
};

/** Persists the language choice so it survives reloads. */
export const setStoredLanguage = (language?: string): void => {
  const store = safeLocalStorage();
  if (!store || !language) return;
  try {
    store.setItem(LANGUAGE_STORAGE_KEY, normaliseLanguage(language));
  } catch (error) {
    // Storage may be full or blocked; the in-memory choice still applies.
  }
};

/** Removes the persisted choice, reverting to browser detection. */
export const clearStoredLanguage = (): void => {
  const store = safeLocalStorage();
  if (!store) return;
  try {
    store.removeItem(LANGUAGE_STORAGE_KEY);
  } catch (error) {
    // Nothing actionable; ignore.
  }
};

/** `navigator.languages`, falling back to `navigator.language`. */
export const getBrowserLanguages = (): string[] => {
  if (typeof navigator === 'undefined') return [];
  const languages =
    navigator.languages && navigator.languages.length
      ? Array.from(navigator.languages)
      : [navigator.language];
  return languages.filter(
    (language): language is string => typeof language === 'string' && language.length > 0
  );
};

/**
 * Resolves the language the application should start in: an explicit choice
 * wins, then the first browser language we support, then the default.
 */
export const resolvePreferredLanguage = (
  fallback: string = DEFAULT_LANGUAGE
): string => {
  const stored = getStoredLanguage();
  if (stored) return stored;

  const browserLanguages = getBrowserLanguages();
  for (let index = 0; index < browserLanguages.length; index += 1) {
    const candidate = normaliseLanguage(browserLanguages[index]);
    if (isSupportedLanguage(candidate)) return candidate;
  }

  const normalisedFallback = normaliseLanguage(fallback);
  return isSupportedLanguage(normalisedFallback) ? normalisedFallback : DEFAULT_LANGUAGE;
};

/**
 * Languages to preload at start-up: the active language first, then the
 * remaining supported languages, then the default. De-duplicated and ordered.
 */
export const languageCandidates = (primary: string): string[] => {
  const ordered = [normaliseLanguage(primary), ...SUPPORTED_LANGUAGE_CODES, DEFAULT_LANGUAGE];
  const seen: { [code: string]: boolean } = {};
  const candidates: string[] = [];
  ordered.forEach((code) => {
    if (code && seen[code] !== true) {
      seen[code] = true;
      candidates.push(code);
    }
  });
  return candidates;
};
