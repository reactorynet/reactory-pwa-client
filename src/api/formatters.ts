/**
 * Locale-aware date and number formatting.
 *
 * Two problems this fixes, both from the roadmap:
 *
 *   1. **`moment` had no locale registration.** Nothing imported
 *      `moment/locale/*` and nothing called `moment.locale()`, so a date
 *      rendered by moment was English regardless of the selected language.
 *   2. **`toLocaleDateString()` / `Intl.NumberFormat` used the *browser*
 *      locale.** A user who chose Afrikaans in the app but runs an English OS
 *      got English dates next to Afrikaans labels — the interface disagreed
 *      with itself.
 *
 * Every helper here takes the locale explicitly, defaulting to the active
 * application language (registered by `ReactoryApi` when i18n initialises and
 * again on each switch). Formatting is therefore a function of the language the
 * user chose, never of the operating system.
 */
import moment from 'moment';
// Registered up front rather than lazily: a dynamic import would make the first
// date render after a language switch asynchronous, so the first paint after the
// switch would still be English.
import 'moment/locale/af';
import 'moment/locale/de';
import 'moment/locale/es';
import 'moment/locale/fr';
import 'moment/locale/it';
import 'moment/locale/nl';

import { DEFAULT_LANGUAGE, normaliseLanguage } from './language';

/**
 * The application language, or `undefined` before i18n has initialised.
 *
 * A provider rather than an import keeps this module free of a cycle:
 * `ReactoryApi` owns the i18n instance and calls `setLocaleProvider`.
 */
let localeProvider: () => string | undefined = () => undefined;

/**
 * Teaching this module where the active language comes from.
 *
 * Called by `ReactoryApi` once i18n is ready. The returned language is expected
 * to be a BCP-47 tag (`af`, `af-ZA`); it is passed to `Intl` as-is so a regional
 * variant can drive region-specific number and date conventions.
 */
export const setLocaleProvider = (provider: () => string | undefined): void => {
  localeProvider = provider;
};

/** Restores the default provider. Intended for tests. */
export const resetLocaleProvider = (): void => {
  localeProvider = () => undefined;
};

/**
 * The locale formatters should use right now.
 *
 * Falls back to the application default rather than to the browser locale: an
 * uninitialised i18n must not silently reintroduce the OS-locale behaviour this
 * module exists to remove.
 */
export const activeLocale = (): string => {
  const language = localeProvider();
  return language && language.length > 0 ? language : DEFAULT_LANGUAGE;
};

/** The language moment should render in (a primary subtag; moment has no regions). */
const momentLocale = (locale: string): string => normaliseLanguage(locale) || DEFAULT_LANGUAGE;

/**
 * Points moment at the language, loading its locale data if it is bundled.
 *
 * Safe to call on every language switch: `moment.locale` is idempotent and an
 * unregistered language simply falls back to English rather than throwing.
 */
export const registerMomentLocale = (language?: string): string => {
  const locale = momentLocale(language || activeLocale());
  try {
    moment.locale(locale);
  } catch (error) {
    moment.locale(DEFAULT_LANGUAGE);
    return DEFAULT_LANGUAGE;
  }
  return locale;
};

const toDate = (value: Date | number | string): Date | null => {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Formats a date in the application language.
 *
 * Returns an empty string for a missing or unparseable value: rendering
 * "Invalid Date" in the UI is worse than rendering nothing.
 */
export const formatDate = (
  value: Date | number | string | null | undefined,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: '2-digit' },
  locale: string = activeLocale()
): string => {
  const date = toDate(value as any);
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch (error) {
    return date.toISOString();
  }
};

/** Formats a time in the application language. */
export const formatTime = (
  value: Date | number | string | null | undefined,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
  locale: string = activeLocale()
): string => formatDate(value, options, locale);

/** Formats a date and time in the application language. */
export const formatDateTime = (
  value: Date | number | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  },
  locale: string = activeLocale()
): string => formatDate(value, options, locale);

/** Formats a number in the application language. */
export const formatNumber = (
  value: number | null | undefined,
  options: Intl.NumberFormatOptions = {},
  locale: string = activeLocale()
): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch (error) {
    return String(value);
  }
};

/**
 * Formats a date with moment, in the application language.
 *
 * Kept for the call sites that need moment's relative or custom formats; new
 * code should prefer `Intl` through `formatDate`, which needs no locale data.
 */
export const formatMoment = (
  value: Date | number | string | null | undefined,
  pattern: string = 'L',
  locale: string = activeLocale()
): string => {
  const date = toDate(value as any);
  if (!date) return '';
  const instance = moment(date);
  const language = momentLocale(locale);
  if (moment.locales().indexOf(language) >= 0) instance.locale(language);
  return instance.format(pattern);
};

/** Relative time ("3 days ago") in the application language. */
export const formatRelative = (
  value: Date | number | string | null | undefined,
  locale: string = activeLocale()
): string => {
  const date = toDate(value as any);
  if (!date) return '';
  const language = momentLocale(locale);
  const instance = moment(date);
  if (moment.locales().indexOf(language) >= 0) instance.locale(language);
  return instance.fromNow();
};
