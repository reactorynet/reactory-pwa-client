import { applyIntegrity } from '../subresourceIntegrity';
import { ReactoryPluginLoader } from '../ReactoryPluginLoader/ReactoryPluginLoader';
import { createMockReactorySDK } from '@reactory/client-core/components/reactory/form-engine/testing/mockReactorySDK';

// The shared SDK mock, plus the two utils the loader reads.
const sdk = () => ({
  ...createMockReactorySDK(),
  utils: {
    nil: (value: unknown) => value === null || value === undefined,
    nilStr: (value: unknown) => typeof value !== 'string' || value.length === 0,
  },
});

const load = (plugin: Record<string, unknown>) =>
  ReactoryPluginLoader({ plugin, reactory: sdk() } as unknown as Reactory.Platform.IPluginLoaderOptions);

describe('applyIntegrity (WP-C4)', () => {
  it('sets integrity and a CORS fetch when a hash is supplied', () => {
    const script = document.createElement('script');
    applyIntegrity(script, { integrity: 'sha384-abc' });
    expect(script.getAttribute('integrity')).toBe('sha384-abc');
    expect(script.crossOrigin).toBe('anonymous');
  });

  it('leaves the tag alone without a hash', () => {
    const script = document.createElement('script');
    applyIntegrity(script, { integrity: null });
    applyIntegrity(script, undefined);
    expect(script.hasAttribute('integrity')).toBe(false);
    expect(script.hasAttribute('crossorigin')).toBe(false);
  });
});

describe('ReactoryPluginLoader', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  const plugin = (extra: Record<string, unknown> = {}) => ({
    id: 'core-plugin',
    name: 'core',
    nameSpace: 'core',
    version: '1.0.0',
    uri: 'http://localhost:4000/cdn/plugins/core.js',
    mimeType: 'application/javascript',
    ...extra,
  });

  it('injects the plugin script with the integrity the server supplied', async () => {
    await load(plugin({ integrity: 'sha384-xyz' }));
    const script = document.getElementById('core-plugin') as HTMLScriptElement;
    expect(script.src).toBe('http://localhost:4000/cdn/plugins/core.js');
    expect(script.getAttribute('integrity')).toBe('sha384-xyz');
    expect(script.crossOrigin).toBe('anonymous');
  });

  it('still loads a plugin that has no integrity', async () => {
    await load(plugin());
    const script = document.getElementById('core-plugin') as HTMLScriptElement;
    expect(script.hasAttribute('integrity')).toBe(false);
  });
});
