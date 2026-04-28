import { createMockReactorySDK } from '../../testing/mockReactorySDK';

describe('createMockReactorySDK', () => {
  describe('getComponent', () => {
    it('returns undefined for an unregistered FQN', () => {
      const sdk = createMockReactorySDK();
      expect(sdk.getComponent('core.Missing')).toBeUndefined();
    });

    it('returns a registered component', () => {
      const Marker = () => null;
      const sdk = createMockReactorySDK({ components: { 'core.Marker': Marker } });
      expect(sdk.getComponent('core.Marker')).toBe(Marker);
    });

    it('records every getComponent call for inspection', () => {
      const sdk = createMockReactorySDK();
      sdk.getComponent('a.B');
      sdk.getComponent('c.D');
      expect(sdk.getComponentCalls).toEqual(['a.B', 'c.D']);
    });

    it('reflects components added via registerComponent post-construction', () => {
      const sdk = createMockReactorySDK();
      const Late = () => null;
      sdk.registerComponent('plugin.Late', Late);
      expect(sdk.getComponent('plugin.Late')).toBe(Late);
    });
  });

  describe('i18n', () => {
    it('returns the defaultValue when no translate function is supplied', () => {
      const sdk = createMockReactorySDK();
      expect(sdk.i18n.t('reactory.validation.required', { defaultValue: 'Required' })).toBe('Required');
    });

    it('returns the key when no defaultValue is supplied', () => {
      const sdk = createMockReactorySDK();
      expect(sdk.i18n.t('some.key')).toBe('some.key');
    });

    it('routes through a custom translate function', () => {
      const sdk = createMockReactorySDK({
        translate: (key, opts) => `[${(opts?.defaultValue as string) ?? key}!]`,
      });
      expect(sdk.i18n.t('a', { defaultValue: 'Hello' })).toBe('[Hello!]');
    });

    it('reports the configured locale', () => {
      const sdk = createMockReactorySDK({ locale: 'af' });
      expect(sdk.i18n.language).toBe('af');
    });

    it('updates language via changeLanguage', async () => {
      const sdk = createMockReactorySDK();
      await sdk.i18n.changeLanguage('fr');
      expect(sdk.i18n.language).toBe('fr');
    });
  });

  describe('featureFlags', () => {
    it('returns undefined for unset keys', () => {
      const sdk = createMockReactorySDK();
      expect(sdk.featureFlags.get('forms.useV5Engine')).toBeUndefined();
    });

    it('returns set values', () => {
      const sdk = createMockReactorySDK({ featureFlags: { 'forms.useV5Engine': true } });
      expect(sdk.featureFlags.get('forms.useV5Engine')).toBe(true);
    });

    it('distinguishes a set-to-false key from a missing key', () => {
      const sdk = createMockReactorySDK({ featureFlags: { explicit: false } });
      expect(sdk.featureFlags.get('explicit')).toBe(false);
      expect(sdk.featureFlags.get('missing')).toBeUndefined();
    });

    it('honours setFeatureFlag mutations', () => {
      const sdk = createMockReactorySDK();
      sdk.setFeatureFlag('forms.useV5Engine', true);
      expect(sdk.featureFlags.get('forms.useV5Engine')).toBe(true);
    });
  });

  describe('telemetry', () => {
    it('records emitted events with their payload', () => {
      const sdk = createMockReactorySDK();
      sdk.telemetry.emit('form.mount', { formInstanceId: 'x' });
      expect(sdk.telemetryCalls).toEqual([{ name: 'form.mount', payload: { formInstanceId: 'x' } }]);
    });
  });

  describe('logging', () => {
    it.each(['log', 'debug', 'info', 'warning', 'error'] as const)('records %s calls', (level) => {
      const sdk = createMockReactorySDK();
      sdk[level]('message', { detail: 1 });
      expect(sdk.logCalls).toEqual([{ level, message: 'message', params: { detail: 1 } }]);
    });
  });

  describe('event emitter', () => {
    it('delivers events to listeners', () => {
      const sdk = createMockReactorySDK();
      const listener = jest.fn();
      sdk.on('componentRegistered', listener);
      sdk.emit('componentRegistered', { componentFqn: 'core.X' });
      expect(listener).toHaveBeenCalledWith({ componentFqn: 'core.X' });
    });

    it('removes listeners via off', () => {
      const sdk = createMockReactorySDK();
      const listener = jest.fn();
      sdk.on('e', listener);
      sdk.off('e', listener);
      sdk.emit('e');
      expect(listener).not.toHaveBeenCalled();
    });

    it('records every emitted event for inspection', () => {
      const sdk = createMockReactorySDK();
      sdk.emit('one', 1);
      sdk.emit('two', 'a', 'b');
      expect(sdk.emittedEvents).toEqual([
        { event: 'one', args: [1] },
        { event: 'two', args: ['a', 'b'] },
      ]);
    });

    it('returns false from emit when no listeners are registered', () => {
      const sdk = createMockReactorySDK();
      expect(sdk.emit('nothing')).toBe(false);
    });

    it('returns true from emit when listeners exist', () => {
      const sdk = createMockReactorySDK();
      sdk.on('e', () => {});
      expect(sdk.emit('e')).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears recorded interactions and listeners', () => {
      const sdk = createMockReactorySDK();
      sdk.getComponent('a.B');
      sdk.log('hi');
      sdk.telemetry.emit('e');
      const listener = jest.fn();
      sdk.on('x', listener);

      sdk.reset();

      expect(sdk.getComponentCalls).toEqual([]);
      expect(sdk.logCalls).toEqual([]);
      expect(sdk.telemetryCalls).toEqual([]);
      sdk.emit('x');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('marker fields', () => {
    it('marks itself as a Reactory API for any code that probes', () => {
      const sdk = createMockReactorySDK();
      expect(sdk.__REACTORYAPI).toBe(true);
    });
  });

  describe('isolation', () => {
    it('produces independent instances', () => {
      const a = createMockReactorySDK();
      const b = createMockReactorySDK();
      a.registerComponent('shared.Name', () => null);
      expect(a.getComponent('shared.Name')).toBeDefined();
      expect(b.getComponent('shared.Name')).toBeUndefined();
    });
  });
});
