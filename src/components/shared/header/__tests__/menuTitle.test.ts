/**
 * Menu titles are stored as translation keys (optionally namespaced, e.g.
 * `booktutor:reactory.menu.home`) or as literal text. These tests pin the
 * resolution order so menus follow the active language instead of a locale
 * chosen by the server.
 */
import { parseMenuTitle, translateMenuTitle } from '../menuTitle';

/** Minimal i18next stand-in: resolves from a per-namespace dictionary. */
const createI18n = (bundles: { [ns: string]: { [key: string]: string } }, defaultNs = 'reactory') => ({
  t: (key: string, options?: { ns?: string }) => {
    const namespace = options?.ns || defaultNs;
    const bundle = bundles[namespace] || {};
    return bundle[key] !== undefined ? bundle[key] : key;
  },
});

const EN = {
  reactory: { 'reactory.menu.myapplications': 'My Applications' },
  booktutor: { 'reactory.menu.home': 'Book Tutor' },
};

const AF = {
  reactory: { 'reactory.menu.myapplications': 'My Toepe' },
  booktutor: { 'reactory.menu.home': 'Boek Tutor' },
};

describe('parseMenuTitle', () => {
  it('splits a namespace prefix off the key', () => {
    expect(parseMenuTitle('booktutor:reactory.menu.home')).toEqual({
      namespace: 'booktutor',
      key: 'reactory.menu.home',
    });
  });

  it('leaves an unprefixed key without a namespace', () => {
    expect(parseMenuTitle('reactory.menu.about-reactory')).toEqual({
      namespace: null,
      key: 'reactory.menu.about-reactory',
    });
  });

  it('treats plain text as a key so it round-trips unchanged', () => {
    expect(parseMenuTitle('Chat')).toEqual({ namespace: null, key: 'Chat' });
  });

  it('trims surrounding whitespace', () => {
    expect(parseMenuTitle('  reactory:reactory.menu.home  ')).toEqual({
      namespace: 'reactory',
      key: 'reactory.menu.home',
    });
  });

  it('returns null for empty input', () => {
    expect(parseMenuTitle(undefined)).toBeNull();
    expect(parseMenuTitle('')).toBeNull();
    expect(parseMenuTitle('   ')).toBeNull();
  });
});

describe('translateMenuTitle', () => {
  it('resolves a namespaced key against that namespace', () => {
    expect(translateMenuTitle({ i18n: createI18n(AF) }, 'booktutor:reactory.menu.home')).toBe('Boek Tutor');
  });

  it('resolves an unprefixed key against the default namespace', () => {
    expect(translateMenuTitle({ i18n: createI18n(AF) }, 'reactory.menu.myapplications')).toBe('My Toepe');
    expect(translateMenuTitle({ i18n: createI18n(EN) }, 'reactory.menu.myapplications')).toBe('My Applications');
  });

  it('passes literal titles through unchanged', () => {
    expect(translateMenuTitle({ i18n: createI18n(AF) }, 'Chat')).toBe('Chat');
  });

  it('falls back to readable English when the bundle lacks the key', () => {
    // `reactory.menu.library` is not in the dictionary above.
    expect(translateMenuTitle({ i18n: createI18n(EN) }, 'reactory.menu.library')).toBe('Library');
  });

  it('returns the key when there is no translation and no fallback', () => {
    expect(translateMenuTitle({ i18n: createI18n(EN) }, 'reactory.menu.unknown-thing')).toBe(
      'reactory.menu.unknown-thing'
    );
  });

  it('returns the parsed key when the api has no translator', () => {
    expect(translateMenuTitle(undefined, 'reactory.menu.home')).toBe('Home');
    expect(translateMenuTitle({}, 'reactory.menu.home')).toBe('Home');
  });

  it('returns an empty string for an empty title', () => {
    expect(translateMenuTitle({ i18n: createI18n(EN) }, '')).toBe('');
    expect(translateMenuTitle({ i18n: createI18n(EN) }, undefined)).toBe('');
  });

  it('does not let a throwing translator break the menu', () => {
    const throwing = {
      i18n: {
        t: () => {
          throw new Error('boom');
        },
      },
    };
    expect(translateMenuTitle(throwing, 'reactory.menu.home')).toBe('Home');
  });

  it('re-resolves when the active language changes', () => {
    const i18n: any = createI18n(EN);
    expect(translateMenuTitle({ i18n }, 'reactory.menu.myapplications')).toBe('My Applications');

    // Swap the bundle as a language switch would.
    i18n.t = createI18n(AF).t;
    expect(translateMenuTitle({ i18n }, 'reactory.menu.myapplications')).toBe('My Toepe');
  });
});
