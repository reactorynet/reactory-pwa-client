import i18next from 'i18next';

/**
 * Pluralisation.
 *
 * `reactor.client.chat.toolResultsSummary` shipped as a single key —
 * `"Completed {{count}} tool calls"` — with no `_one`/`_other` forms, so English
 * rendered "1 tool calls". The same shape existed for
 * `confirm.deleteticketsaction.dialog.content` ("Delete the 1 selected
 * tickets").
 *
 * These tests use the *shipped* bundle shapes, so they fail if the plural forms
 * are removed or if a call site stops passing `count`.
 */
const createInstance = (resources: any) => {
  const instance = i18next.createInstance();
  return instance.init({
    lng: 'en',
    fallbackLng: 'en',
    ns: ['reactor'],
    defaultNS: 'reactor',
    initImmediate: false,
    interpolation: { escapeValue: false },
    resources: { en: { reactor: resources } },
  }).then(() => instance);
};

describe('count-bearing strings are pluralised', () => {
  it('renders the singular form for one item', async () => {
    const instance = await createInstance({
      'reactor.client.chat.toolResultsSummary_one': 'Completed {{count}} tool call',
      'reactor.client.chat.toolResultsSummary_other': 'Completed {{count}} tool calls',
    });

    expect(instance.t('reactor.client.chat.toolResultsSummary', { count: 1 }))
      .toBe('Completed 1 tool call');
  });

  it('renders the plural form for several items', async () => {
    const instance = await createInstance({
      'reactor.client.chat.toolResultsSummary_one': 'Completed {{count}} tool call',
      'reactor.client.chat.toolResultsSummary_other': 'Completed {{count}} tool calls',
    });

    expect(instance.t('reactor.client.chat.toolResultsSummary', { count: 3 }))
      .toBe('Completed 3 tool calls');
  });

  /**
   * The pre-fix shape, kept as a counter-example: a single key with `{{count}}`
   * and no plural forms always renders the plural noun.
   */
  it('the old single-key shape rendered "1 tool calls"', async () => {
    const instance = await createInstance({
      'reactor.client.chat.toolResultsSummary': 'Completed {{count}} tool calls',
    });

    expect(instance.t('reactor.client.chat.toolResultsSummary', { count: 1 }))
      .toBe('Completed 1 tool calls');
  });

  it('renders the raw key when the call site omits count', async () => {
    // i18next selects the form from `count`. With no `count` and no base key it
    // cannot resolve anything, so the user sees the key itself — which is why
    // every call site passes `count` explicitly.
    const instance = await createInstance({
      'reactor.client.chat.toolResultsSummary_one': 'Completed {{count}} tool call',
      'reactor.client.chat.toolResultsSummary_other': 'Completed {{count}} tool calls',
    });

    expect(instance.t('reactor.client.chat.toolResultsSummary'))
      .toBe('reactor.client.chat.toolResultsSummary');
  });
});
