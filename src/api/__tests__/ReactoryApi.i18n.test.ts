/**
 * Integration tests for the language plumbing in ReactoryApi.
 *
 * ReactoryApi.test.ts mocks i18next wholesale, so it can never prove that a
 * browser preference actually resolves. These tests exercise the real i18next
 * instance against a stubbed GraphQL layer, covering the path the language
 * selector and static content depend on:
 *   browser preference -> bundles loaded -> t() resolves -> setLanguage switches.
 */

// ── Mocks (must be declared before imports) ──────────────────────────────

const mockApolloQuery = jest.fn();

const mockApolloClient: any = {
  query: mockApolloQuery,
  mutate: jest.fn(),
  resetStore: jest.fn(),
  addResolvers: jest.fn(),
};

jest.mock('../ReactoryApolloClient', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    client: mockApolloClient,
    ws_link: {},
    clearCache: jest.fn(),
  }),
}));

jest.mock('../RestApi', () => ({
  login: jest.fn().mockResolvedValue({ user: { token: 'mock-anon-token' } }),
  companyWithId: jest.fn(),
  register: jest.fn(),
  reset: jest.fn(),
  forgot: jest.fn(),
  getRemoteJson: jest.fn(),
  postRemoteJson: jest.fn(),
  getContent: jest.fn(),
}));

jest.mock('@reactory/client-core/api/graphql', () => ({
  __esModule: true,
  default: { queries: {}, mutations: { Users: {}, System: {} } },
}));

jest.mock('@reactory/client-core/amq', () => ({
  __esModule: true,
  default: {
    $chan: jest.fn(),
    $sub: { pluginLoaded: jest.fn() },
    $pub: {},
    onFormCommandEvent: jest.fn(),
    raiseFormCommand: jest.fn(),
    onReactoryPluginEvent: jest.fn(),
  },
}));

jest.mock('@reactory/client-core/components/util', () => ({
  attachComponent: jest.fn(),
  getAvatar: jest.fn(),
  getOrganizationLogo: jest.fn(),
  getUserFullName: jest.fn(),
  ThemeResource: jest.fn(),
  injectResources: jest.fn(),
  omitDeep: jest.fn((obj: any) => obj),
  makeSlug: jest.fn((str: string) => str),
  deepEquals: jest.fn((a: any, b: any) => JSON.stringify(a) === JSON.stringify(b)),
  CDNResource: jest.fn(),
  isEmail: jest.fn(),
  isValidPassword: jest.fn(),
  nil: jest.fn(),
  nilStr: jest.fn(),
  safeCDNUrl: jest.fn((url: string) => url),
}));

jest.mock('../ReactoryResourceLoader', () => ({ ReactoryResourceLoader: jest.fn() }));
jest.mock('../ReactoryPluginLoader', () => ({ ReactoryPluginLoader: jest.fn() }));
jest.mock('../graphql/graph/queries/ApiStatus', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue('query status { apiStatus { id status } }'),
}));
jest.mock('schema-inspector', () => ({ __esModule: true, default: {} }));
jest.mock('../objectMapper/parseObjectMapper', () => ({
  parseObjectMapperFunction: jest.fn().mockReturnValue({}),
}));

import ReactoryApi from '../ReactoryApi';
import { ReactoryApiEventNames } from '../ApiEventNames';
import { LANGUAGE_STORAGE_KEY } from '../language';

const setBrowserLanguages = (languages: string[]) => {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    get: () => languages,
  });
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    get: () => (languages.length ? languages[0] : 'en'),
  });
};

const BUNDLES: any = {
  af: {
    id: 'af',
    i18n: [
      { id: 'af.reactory', ns: 'reactory', translations: { 'reactory.about.title': 'Oor Reactory' } },
      { id: 'af.common', ns: 'common', translations: { 'common.search': 'Soek' } },
    ],
  },
  en: {
    id: 'en',
    i18n: [
      {
        id: 'en.reactory',
        ns: 'reactory',
        translations: {
          'reactory.about.title': 'About Reactory',
          'reactory.only.en': 'English only string',
        },
      },
      { id: 'en.common', ns: 'common', translations: { 'common.search': 'Search' } },
    ],
  },
};

/**
 * Builds an api whose stubbed GraphQL layer answers by requested language.
 * `resolve` overrides the default per-language lookup (used to simulate a
 * server that ignores the `lang` argument).
 */
const makeApi = (resolve?: (lang: string) => any) => {
  const api = new ReactoryApi({} as any);
  api.client = mockApolloClient;
  (api as any).isDevelopmentMode = () => false;

  mockApolloQuery.mockImplementation(async ({ variables }: any) => ({
    data: {
      ReactoryTranslation: resolve ? resolve(variables?.lang) : BUNDLES[variables?.lang] || null,
    },
    errors: [],
  }));

  return api;
};

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  setBrowserLanguages(['af-ZA', 'en']);
});

describe('ReactoryApi language handling', () => {
  it('resolves the browser preference on init and renders the translated string', async () => {
    const api = makeApi();

    await api.initi18n();

    expect(api.i18n.language).toBe('af');
    expect(api.i18n.t('reactory.about.title')).toBe('Oor Reactory');
  });

  it('requests a bundle for the preferred language and the fallback', async () => {
    const api = makeApi();

    await api.initi18n();

    const requested = mockApolloQuery.mock.calls.map((call: any[]) => call[0].variables?.lang);
    expect(requested).toEqual(['af', 'en']);
  });

  it('falls back to English for keys the preferred language lacks', async () => {
    const api = makeApi();

    await api.initi18n();

    expect(api.i18n.t('reactory.only.en')).toBe('English only string');
  });

  it('prefers a stored choice over the browser preference', async () => {
    setBrowserLanguages(['af-ZA', 'en']);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    const api = makeApi();

    await api.initi18n();

    expect(api.i18n.language).toBe('en');
  });

  it('switches language, persists the choice and emits onLanguageChanged', async () => {
    const api = makeApi();
    await api.initi18n();

    const events: string[] = [];
    api.on(ReactoryApiEventNames.onLanguageChanged, (language: string) => events.push(language));

    const result = await api.setLanguage('en');

    expect(result).toBe('en');
    expect(api.i18n.t('reactory.about.title')).toBe('About Reactory');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(events).toEqual(['en']);
  });

  it('ignores an unsupported language', async () => {
    const api = makeApi();
    await api.initi18n();

    const before = api.i18n.language;
    const result = await api.setLanguage('fr');

    expect(result).toBe(before);
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });

  it('never advertises a language the server cannot actually resolve', async () => {
    // The server ignores `lang` and always answers with the English bundle, so
    // the echoed locale does not match the request and the bundle is rejected.
    const api = makeApi(() => BUNDLES.en);

    await api.initi18n();

    expect(api.i18n.language).toBe('en');
    expect(api.i18n.t('reactory.about.title')).toBe('About Reactory');
  });

  it('keeps the newest choice when switches overlap', async () => {
    const api = makeApi();
    await api.initi18n();

    const first = api.setLanguage('af');
    const second = api.setLanguage('en');
    await Promise.all([first, second]);

    expect(api.i18n.language).toBe('en');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });
});
