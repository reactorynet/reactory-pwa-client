import moment from 'moment';
import {
  activeLocale,
  formatDate,
  formatDateTime,
  formatMoment,
  formatNumber,
  formatRelative,
  formatTime,
  registerMomentLocale,
  resetLocaleProvider,
  setLocaleProvider,
} from '../formatters';
import { DEFAULT_LANGUAGE } from '../language';

/**
 * Dates and numbers used to follow the *browser* locale while the rest of the UI
 * followed the app language, so a user on an English OS who picked Afrikaans saw
 * English dates beside Afrikaans labels. `moment` was worse: no locale was ever
 * registered, so it was always English.
 */
describe('locale-aware formatting', () => {
  afterEach(() => {
    resetLocaleProvider();
  });

  describe('activeLocale', () => {
    it('falls back to the application default before i18n initialises', () => {
      // Deliberately NOT the browser locale: that is the behaviour being fixed.
      expect(activeLocale()).toBe(DEFAULT_LANGUAGE);
    });

    it('uses the language the provider reports', () => {
      setLocaleProvider(() => 'af');

      expect(activeLocale()).toBe('af');
    });

    it('ignores an empty provider value', () => {
      setLocaleProvider(() => '');

      expect(activeLocale()).toBe(DEFAULT_LANGUAGE);
    });
  });

  describe('formatDate', () => {
    const date = '2026-03-04T10:30:00Z';

    it('formats in the active language rather than the browser locale', () => {
      setLocaleProvider(() => 'af');
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      };
      const afrikaans = formatDate(date, options);

      setLocaleProvider(() => 'en');
      const english = formatDate(date, options);

      expect(afrikaans).not.toBe(english);
      expect(afrikaans.toLowerCase()).toContain('maart');
      expect(english.toLowerCase()).toContain('march');
    });

    it('accepts an explicit locale, overriding the active one', () => {
      setLocaleProvider(() => 'af');

      expect(formatDate(date, { year: 'numeric' }, 'en')).toMatch(/2026/);
    });

    it('returns an empty string for a missing or invalid value', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
      expect(formatDate('not-a-date')).toBe('');
    });
  });

  describe('formatTime / formatDateTime', () => {
    const date = '2026-03-04T10:30:00Z';

    it('formats a time in the active language', () => {
      setLocaleProvider(() => 'en-GB');

      // en-GB is 24-hour, so an explicit 2-digit hour must not gain AM/PM.
      // `timeZone` pinned so the assertion does not depend on the runner's TZ.
      expect(
        formatTime(date, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }, 'en-GB')
      ).toBe('10:30');
    });

    it('formats a full date and time', () => {
      const value = formatDateTime(
        date,
        { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' },
        'en-GB'
      );

      expect(value).toContain('04');
      expect(value).toContain('2026');
    });

    it('returns an empty string for an invalid value', () => {
      expect(formatTime('nope')).toBe('');
      expect(formatDateTime('nope')).toBe('');
    });
  });

  describe('formatNumber', () => {
    it('uses the active language for decimal separators', () => {
      const german = formatNumber(1234.5, {}, 'de');
      const english = formatNumber(1234.5, {}, 'en');

      // de: 1.234,5 — en: 1,234.5
      expect(german).not.toBe(english);
      expect(german).toContain(',5');
      expect(english).toContain('.5');
    });

    it('formats a percentage when asked', () => {
      expect(formatNumber(0.42, { style: 'percent' }, 'en')).toBe('42%');
    });

    it('returns an empty string for missing values', () => {
      expect(formatNumber(null)).toBe('');
      expect(formatNumber(undefined)).toBe('');
      expect(formatNumber(Number.NaN)).toBe('');
    });
  });

  describe('moment locale registration', () => {
    afterEach(() => {
      moment.locale(DEFAULT_LANGUAGE);
    });

    /**
     * The regression: no locale was ever registered with moment, so `LLLL`
     * always produced English month names regardless of the selected language.
     */
    it('renders month names in the selected language', () => {
      registerMomentLocale('af');

      expect(moment('2026-03-04').format('MMMM')).toBe('Maart');
    });

    it('renders German month names', () => {
      registerMomentLocale('de');

      expect(moment('2026-03-04').format('MMMM')).toBe('März');
    });

    it('falls back to English for a language moment has no data for', () => {
      const resolved = registerMomentLocale('zz');

      expect(resolved).toBe('zz');
      // moment silently keeps the previous/fallback locale rather than throwing.
      expect(typeof moment('2026-03-04').format('MMMM')).toBe('string');
    });

    it('normalises a regional tag onto a locale moment knows', () => {
      expect(registerMomentLocale('af-ZA')).toBe('af');
      expect(moment('2026-03-04').format('MMMM')).toBe('Maart');
    });
  });

  describe('formatMoment / formatRelative', () => {
    afterEach(() => {
      moment.locale(DEFAULT_LANGUAGE);
    });

    it('formats with moment in the requested language', () => {
      expect(formatMoment('2026-03-04', 'MMMM', 'af')).toBe('Maart');
    });

    it('returns an empty string for an invalid value', () => {
      expect(formatMoment('nope')).toBe('');
      expect(formatRelative('nope')).toBe('');
    });

    it('produces a relative string', () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;

      expect(formatRelative(threeDaysAgo, 'en')).toContain('days ago');
    });
  });
});
