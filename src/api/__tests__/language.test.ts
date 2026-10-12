/**
 * Unit tests for the language preference helpers.
 *
 * These cover the resolution order that drives i18next start-up:
 * persisted choice -> browser preference -> application default.
 */
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  clearStoredLanguage,
  getBrowserLanguages,
  getStoredLanguage,
  isSupportedLanguage,
  languageCandidates,
  languageLabel,
  normaliseLanguage,
  resolvePreferredLanguage,
  setStoredLanguage,
} from '../language';

const setBrowserLanguages = (languages: string[]) => {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    get: () => languages,
  });
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    get: () => (languages.length ? languages[0] : undefined),
  });
};

describe('language helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setBrowserLanguages([]);
  });

  describe('normaliseLanguage', () => {
    it('reduces a regional tag to its lowercase primary subtag', () => {
      expect(normaliseLanguage('af-ZA')).toBe('af');
      expect(normaliseLanguage('EN_us')).toBe('en');
      expect(normaliseLanguage('af')).toBe('af');
    });

    it('returns an empty string for missing input', () => {
      expect(normaliseLanguage(undefined)).toBe('');
      expect(normaliseLanguage('')).toBe('');
    });
  });

  describe('isSupportedLanguage', () => {
    it('accepts supported subtags and regional variants', () => {
      expect(isSupportedLanguage('en')).toBe(true);
      expect(isSupportedLanguage('af')).toBe(true);
      expect(isSupportedLanguage('af-ZA')).toBe(true);
    });

    it('rejects languages the application does not ship', () => {
      expect(isSupportedLanguage('fr')).toBe(false);
      expect(isSupportedLanguage(undefined)).toBe(false);
    });
  });

  it('exposes a label for supported languages', () => {
    expect(SUPPORTED_LANGUAGES.map((language) => language.code)).toContain('af');
    expect(languageLabel('af-ZA')).toBe('Afrikaans');
  });

  describe('persisted choice', () => {
    it('round-trips a supported language (normalised)', () => {
      setStoredLanguage('af-ZA');
      expect(getStoredLanguage()).toBe('af');
      expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('af');
    });

    it('ignores an unsupported stored value', () => {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr');
      expect(getStoredLanguage()).toBeNull();
    });

    it('clears the stored choice', () => {
      setStoredLanguage('af');
      clearStoredLanguage();
      expect(getStoredLanguage()).toBeNull();
    });
  });

  describe('getBrowserLanguages', () => {
    it('returns navigator.languages when present', () => {
      setBrowserLanguages(['af-ZA', 'en']);
      expect(getBrowserLanguages()).toEqual(['af-ZA', 'en']);
    });

    it('falls back to navigator.language', () => {
      Object.defineProperty(window.navigator, 'languages', {
        configurable: true,
        get: () => undefined,
      });
      Object.defineProperty(window.navigator, 'language', {
        configurable: true,
        get: () => 'af',
      });
      expect(getBrowserLanguages()).toEqual(['af']);
    });
  });

  describe('resolvePreferredLanguage', () => {
    it('prefers the persisted choice over the browser preference', () => {
      setBrowserLanguages(['af-ZA', 'en']);
      setStoredLanguage('en');
      expect(resolvePreferredLanguage()).toBe('en');
    });

    it('honours an Afrikaans-first browser preference', () => {
      setBrowserLanguages(['af-ZA', 'en-ZA', 'en']);
      expect(resolvePreferredLanguage()).toBe('af');
    });

    it('skips unsupported browser languages', () => {
      setBrowserLanguages(['fr-FR', 'de', 'af']);
      expect(resolvePreferredLanguage()).toBe('af');
    });

    it('falls back to the default when nothing matches', () => {
      setBrowserLanguages(['fr-FR', 'de-DE']);
      expect(resolvePreferredLanguage()).toBe(DEFAULT_LANGUAGE);
    });

    it('falls back when the browser reports nothing', () => {
      expect(resolvePreferredLanguage()).toBe(DEFAULT_LANGUAGE);
    });
  });

  describe('languageCandidates', () => {
    it('puts the active language first and de-duplicates', () => {
      expect(languageCandidates('af')).toEqual(['af', 'en']);
    });

    it('keeps every supported language when the active one is the default', () => {
      expect(languageCandidates('en')).toEqual(['en', 'af']);
    });
  });
});
