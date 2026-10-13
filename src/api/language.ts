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
 * Header carrying the user's language choice to the server.
 *
 * Server-authored strings (form titles, schemas, default data) are rendered with
 * the request's language, so the choice has to travel with every request.
 */
export const LANGUAGE_HEADER = 'x-reactory-language';

/**
 * Reduces a BCP-47 tag to its lowercase primary subtag (`af-ZA` -> `af`),
 * matching how the server keys content translations and locale folders.
 */
export const normaliseLanguage = (language?: string): string =>
  (language || '').trim().toLowerCase().split(/[-_]/)[0];

/**
 * Codes selectable right now: the built-in defaults plus every language the
 * server has reported.
 *
 * This has to be mutable. The server derives its list from the configured
 * locale folders, so a locale the client does not hardcode (say `fr`) would
 * otherwise be offered by the selector and then refused by setLanguage, and
 * never persisted — the opposite of "adding a locale folder is enough".
 */
let registeredLanguageCodes: string[] = [...SUPPORTED_LANGUAGE_CODES];

export const isSupportedLanguage = (language?: string): boolean => {
  const normalised = normaliseLanguage(language);
  return normalised.length > 0 && registeredLanguageCodes.indexOf(normalised) >= 0;
};

/**
 * Records languages the server reports so they become selectable, persistable
 * and eligible for browser-preference matching.
 */
export const registerSupportedLanguages = (codes: string[] = []): string[] => {
  const merged = [...SUPPORTED_LANGUAGE_CODES];
  codes.forEach((code) => {
    const normalised = normaliseLanguage(code);
    if (normalised && merged.indexOf(normalised) < 0) merged.push(normalised);
  });
  registeredLanguageCodes = merged;
  return registeredLanguageCodes;
};

/** Restores the built-in list. Intended for tests. */
export const resetRegisteredLanguages = (): void => {
  registeredLanguageCodes = [...SUPPORTED_LANGUAGE_CODES];
};

/**
 * Display labels for languages we know about. Anything the server reports that
 * is absent here still becomes selectable; it just shows its code.
 */
const KNOWN_LABELS: { [code: string]: string } = {
  en: 'English',
  'en-US': 'English (US)',
  af: 'Afrikaans',
};

/** Human-readable label for a language code, falling back to the code itself. */
export const languageLabel = (language?: string): string => {
  if (!language) return '';
  const normalised = normaliseLanguage(language);
  const found = SUPPORTED_LANGUAGES.find((candidate) => candidate.code === normalised);
  if (found) return found.label;
  return KNOWN_LABELS[language] || KNOWN_LABELS[normalised] || language;
};

/**
 * Builds the selectable list from the languages the server reports.
 *
 * The server derives these from the configured locale folders, so adding a
 * locale no longer requires editing anything on the client. Codes that differ
 * only by region are collapsed onto their primary subtag.
 */
export const buildSupportedLanguages = (codes: string[] = []): SupportedLanguage[] => {
  const seen: { [code: string]: boolean } = {};
  const languages: SupportedLanguage[] = [];

  codes.forEach((code) => {
    const normalised = normaliseLanguage(code);
    if (!normalised || seen[normalised]) return;
    seen[normalised] = true;
    languages.push({ code: normalised, label: languageLabel(normalised) });
  });

  if (languages.length === 0) return [...SUPPORTED_LANGUAGES];

  // Register before returning so the same codes are accepted by
  // setLanguage, persisted, and honoured by browser-preference matching.
  registerSupportedLanguages(languages.map((language) => language.code));

  return languages;
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
 * Languages to load at start-up: the active one, then the default so a missing
 * key still falls back to readable English.
 *
 * Deliberately not every supported language: preloading them all added a
 * request per locale to first paint for translations most users never see. The
 * rest load on demand from setLanguage.
 */
export const languageCandidates = (primary: string): string[] => {
  const ordered = [normaliseLanguage(primary), DEFAULT_LANGUAGE];
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
