/**
 * The language sent with every GraphQL request.
 *
 * Server-authored strings (form titles, schemas, default data) render in the
 * request's language, so the user's choice has to travel with each request.
 * Before this the server had no way to know it and rendered whatever locale its
 * shared translation instance happened to hold.
 */
import { LANGUAGE_STORAGE_KEY } from '../language';
import { requestLanguage } from '../ReactoryApolloClient';

const setBrowserLanguage = (language: string | undefined) => {
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    get: () => language,
  });
};

describe('requestLanguage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setBrowserLanguage('en-GB');
  });

  it("prefers the user's stored choice", () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'af');

    expect(requestLanguage()).toBe('af');
  });

  it('falls back to the browser preference', () => {
    expect(requestLanguage()).toBe('en-GB');
  });

  it('handles storage being unavailable', () => {
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });

    try {
      expect(requestLanguage()).toBe('en-GB');
    } finally {
      Object.defineProperty(window, 'localStorage', { configurable: true, value: original });
    }
  });

  it('returns undefined when neither source is available', () => {
    setBrowserLanguage(undefined);

    expect(requestLanguage()).toBeUndefined();
  });
});
