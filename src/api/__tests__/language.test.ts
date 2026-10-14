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
  buildSupportedLanguages,
  getBrowserLanguages,
  registerSupportedLanguages,
  resetRegisteredLanguages,
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

    it('tolerates surrounding whitespace', () => {
      expect(normaliseLanguage('  af-ZA  ')).toBe('af');
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

  it('labels every locale the server can report', () => {
    // The server derives the selectable set from the locale folders on disk, so
    // a folder added there has to render a name here, not a bare code.
    expect(languageLabel('nl')).toBe('Nederlands');
    expect(languageLabel('de')).toBe('Deutsch');
    expect(languageLabel('es')).toBe('Español');
    expect(languageLabel('it')).toBe('Italiano');
    expect(languageLabel('fr')).toBe('Français');
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

    it('normalises and trims a stored value', () => {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, '  af-ZA  ');
      expect(getStoredLanguage()).toBe('af');
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
    it('loads the active language plus the default fallback', () => {
      expect(languageCandidates('af')).toEqual(['af', 'en']);
    });

    it('loads a single language when the active one is already the default', () => {
      // Preloading every supported locale added a request per language to first
      // paint; the rest load on demand.
      expect(languageCandidates('en')).toEqual(['en']);
    });
  });

  describe('buildSupportedLanguages', () => {
    it('builds the selectable list from the languages the server reports', () => {
      expect(buildSupportedLanguages(['en', 'af'])).toEqual([
        { code: 'en', label: 'English' },
        { code: 'af', label: 'Afrikaans' },
      ]);
    });

    it('makes an unknown locale selectable with its code as the label', () => {
      // `zz` is deliberately a code we never label; using a shipped locale here
      // left the test stale the moment that locale gained a label.
      expect(buildSupportedLanguages(['zz'])).toEqual([{ code: 'zz', label: 'zz' }]);
    });

    it('collapses regional duplicates onto the primary subtag', () => {
      expect(buildSupportedLanguages(['en-US', 'en'])).toEqual([{ code: 'en', label: 'English' }]);
    });

    it('falls back to the built-in list when the server reports nothing', () => {
      expect(buildSupportedLanguages([])).toEqual(SUPPORTED_LANGUAGES);
    });
  });
});


describe('server-reported languages become selectable (MF-2)', () => {
  const otherLanguage = 'zz';

  afterEach(() => {
    resetRegisteredLanguages();
  });

  it('refuses a language before the server reports it', () => {
    expect(isSupportedLanguage(otherLanguage)).toBe(false);
  });

  it('accepts, persists and restores a language the server reported', () => {
    buildSupportedLanguages(['en', otherLanguage]);

    // Selectable: setLanguage guards on isSupportedLanguage.
    expect(isSupportedLanguage(otherLanguage)).toBe(true);

    // Persistable: getStoredLanguage refuses anything unsupported.
    setStoredLanguage(otherLanguage);
    expect(getStoredLanguage()).toBe(otherLanguage);
  });

  it('honours a server-reported language as a browser preference', () => {
    buildSupportedLanguages(['en', otherLanguage]);
    setBrowserLanguages([otherLanguage, 'en']);

    expect(resolvePreferredLanguage()).toBe(otherLanguage);
  });

  it('resets back to the built-in list', () => {
    buildSupportedLanguages(['en', otherLanguage]);
    expect(isSupportedLanguage(otherLanguage)).toBe(true);

    resetRegisteredLanguages();

    expect(isSupportedLanguage(otherLanguage)).toBe(false);
    expect(isSupportedLanguage('af')).toBe(true);
  });
});

describe('header language parsing (server contract)', () => {
  it('strips a quality value so a bare tag still matches', () => {
    // `af;q=0.9` is how a browser may express a single preferred language.
    const parsed = `af;q=0.9`.split(',')[0].split(';')[0].trim();

    expect(parsed).toBe('af');
    expect(isSupportedLanguage(parsed)).toBe(true);
  });
});
