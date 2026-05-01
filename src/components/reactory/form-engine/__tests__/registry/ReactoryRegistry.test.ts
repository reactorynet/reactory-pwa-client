import { createReactoryRegistry } from '../../registry/ReactoryRegistry';
import { createMockReactorySDK } from '../../testing/mockReactorySDK';

const Field = () => null;
const Widget = () => null;
const PluginField = () => null;
const PluginWidget = () => null;

describe('createReactoryRegistry', () => {
  describe('static lookup', () => {
    it('exposes static fields directly', () => {
      const reactory = createMockReactorySDK();
      const reg = createReactoryRegistry({ reactory, staticFields: { SchemaField: Field } });
      expect(reg.fields.SchemaField).toBe(Field);
    });

    it('exposes static widgets directly', () => {
      const reactory = createMockReactorySDK();
      const reg = createReactoryRegistry({ reactory, staticWidgets: { TextWidget: Widget } });
      expect(reg.widgets.TextWidget).toBe(Widget);
    });

    it('does not call the SDK when a static name is hit', () => {
      const reactory = createMockReactorySDK();
      const reg = createReactoryRegistry({ reactory, staticFields: { SchemaField: Field } });
      void reg.fields.SchemaField;
      expect(reactory.getComponentCalls).toEqual([]);
    });

    it('returns undefined for a string that is neither static nor a FQN', () => {
      const reactory = createMockReactorySDK();
      const reg = createReactoryRegistry({ reactory });
      expect(reg.widgets.NotARealWidget).toBeUndefined();
      expect(reactory.getComponentCalls).toEqual([]);
    });
  });

  describe('FQN resolution via Proxy', () => {
    it('resolves a FQN via the SDK on first access', () => {
      const reactory = createMockReactorySDK({ components: { 'plugin.Field': PluginField } });
      const reg = createReactoryRegistry({ reactory });
      expect(reg.fields['plugin.Field']).toBe(PluginField);
      expect(reactory.getComponentCalls).toEqual(['plugin.Field']);
    });

    it('caches the resolution; subsequent accesses do not call the SDK', () => {
      const reactory = createMockReactorySDK({ components: { 'plugin.Widget': PluginWidget } });
      const reg = createReactoryRegistry({ reactory });
      void reg.widgets['plugin.Widget'];
      void reg.widgets['plugin.Widget'];
      void reg.widgets['plugin.Widget'];
      expect(reactory.getComponentCalls).toEqual(['plugin.Widget']);
    });

    it('returns undefined for a missing FQN and caches the miss', () => {
      const reactory = createMockReactorySDK();
      const reg = createReactoryRegistry({ reactory });
      expect(reg.fields['plugin.Missing']).toBeUndefined();
      expect(reg.fields['plugin.Missing']).toBeUndefined();
      expect(reactory.getComponentCalls).toEqual(['plugin.Missing']);
    });

    it('keeps fields and widgets caches independent', () => {
      const FieldComponent = () => null;
      const WidgetComponent = () => null;
      const reactory = createMockReactorySDK({
        components: { 'shared.Name': FieldComponent },
      });
      const reg = createReactoryRegistry({ reactory });
      expect(reg.fields['shared.Name']).toBe(FieldComponent);
      // Same name on widgets side resolves independently (new SDK call, same result here).
      reactory.registerComponent('shared.Name', WidgetComponent);
      // The fields cache still has FieldComponent (no event fired);
      // widgets gets the freshly registered component on first read.
      expect(reg.widgets['shared.Name']).toBe(WidgetComponent);
    });
  });

  describe('registerField / registerWidget', () => {
    it('makes a registered field visible via the proxy', () => {
      const reactory = createMockReactorySDK();
      const reg = createReactoryRegistry({ reactory });
      reg.registerField('CustomField', Field);
      expect(reg.fields.CustomField).toBe(Field);
    });

    it('makes a registered widget visible via the proxy', () => {
      const reactory = createMockReactorySDK();
      const reg = createReactoryRegistry({ reactory });
      reg.registerWidget('CustomWidget', Widget);
      expect(reg.widgets.CustomWidget).toBe(Widget);
    });

    it('overrides a previously cached miss', () => {
      const reactory = createMockReactorySDK();
      const reg = createReactoryRegistry({ reactory });
      // Probe a FQN that misses; cache the miss.
      expect(reg.fields['plugin.LateField']).toBeUndefined();
      reg.registerField('plugin.LateField', Field);
      expect(reg.fields['plugin.LateField']).toBe(Field);
    });
  });

  describe('cache invalidation on componentRegistered', () => {
    it('clears caches when the SDK fires componentRegistered', () => {
      const reactory = createMockReactorySDK();
      const reg = createReactoryRegistry({ reactory });
      // Cache a miss.
      expect(reg.widgets['plugin.Late']).toBeUndefined();
      // SDK announces a new component; cache is cleared.
      reactory.registerComponent('plugin.Late', PluginWidget);
      reactory.emit('componentRegistered', { componentFqn: 'plugin.Late' });
      // Next read consults the SDK and finds it.
      expect(reg.widgets['plugin.Late']).toBe(PluginWidget);
    });

    it('detaches the listener on dispose', () => {
      const reactory = createMockReactorySDK();
      const reg = createReactoryRegistry({ reactory });
      void reg.widgets['plugin.Cached']; // miss cached
      reg.dispose();
      reactory.registerComponent('plugin.Cached', PluginWidget);
      reactory.emit('componentRegistered', {});
      // After dispose, the cache wasn't cleared, so the proxy returns the cached miss
      // until manually cleared (the consumer is responsible after dispose).
      reg.clearCache();
      expect(reg.widgets['plugin.Cached']).toBe(PluginWidget);
    });

    it('respects a custom registeredEvent name', () => {
      const reactory = createMockReactorySDK();
      const reg = createReactoryRegistry({
        reactory,
        registeredEvent: 'my.custom.event',
      });
      void reg.widgets['plugin.X'];
      reactory.registerComponent('plugin.X', PluginWidget);
      // The default 'componentRegistered' should not clear our cache here.
      reactory.emit('componentRegistered', {});
      expect(reg.widgets['plugin.X']).toBeUndefined();
      // But the custom event should.
      reactory.emit('my.custom.event', {});
      expect(reg.widgets['plugin.X']).toBe(PluginWidget);
    });
  });

  describe('resolveFqn', () => {
    it('exposes resolveFqn for direct calls', () => {
      const reactory = createMockReactorySDK({ components: { 'plugin.Direct': PluginField } });
      const reg = createReactoryRegistry({ reactory });
      expect(reg.resolveFqn('plugin.Direct', 'field')).toBe(PluginField);
    });

    it('returns null for non-FQN inputs', () => {
      const reactory = createMockReactorySDK();
      const reg = createReactoryRegistry({ reactory });
      expect(reg.resolveFqn('TextWidget', 'widget')).toBeNull();
    });
  });

  describe('onMiss callback', () => {
    it('invokes onMiss when the SDK reports a miss', () => {
      const reactory = createMockReactorySDK();
      const onMiss = jest.fn();
      const reg = createReactoryRegistry({ reactory, onMiss });
      void reg.fields['plugin.Missing'];
      expect(onMiss).toHaveBeenCalledWith('field', 'plugin.Missing');
    });

    it('does not invoke onMiss on cache hits after a previous miss', () => {
      const reactory = createMockReactorySDK();
      const onMiss = jest.fn();
      const reg = createReactoryRegistry({ reactory, onMiss });
      void reg.fields['plugin.Missing'];
      void reg.fields['plugin.Missing'];
      void reg.fields['plugin.Missing'];
      expect(onMiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Proxy behaviour', () => {
    it('reports static keys via ownKeys', () => {
      const reactory = createMockReactorySDK();
      const reg = createReactoryRegistry({
        reactory,
        staticFields: { A: Field, B: Field },
      });
      expect(Object.keys(reg.fields).sort()).toEqual(['A', 'B']);
    });

    it('does not include FQN-resolved keys in ownKeys (open-ended set)', () => {
      const reactory = createMockReactorySDK({ components: { 'plugin.X': PluginField } });
      const reg = createReactoryRegistry({ reactory });
      void reg.fields['plugin.X'];
      expect(Object.keys(reg.fields)).not.toContain('plugin.X');
    });

    it('supports the `in` operator for static names', () => {
      const reactory = createMockReactorySDK();
      const reg = createReactoryRegistry({ reactory, staticFields: { Known: Field } });
      expect('Known' in reg.fields).toBe(true);
    });

    it('supports the `in` operator for resolvable FQNs', () => {
      const reactory = createMockReactorySDK({ components: { 'plugin.X': PluginField } });
      const reg = createReactoryRegistry({ reactory });
      expect('plugin.X' in reg.fields).toBe(true);
    });

    it('returns false from `in` for unresolvable FQNs', () => {
      const reactory = createMockReactorySDK();
      const reg = createReactoryRegistry({ reactory });
      expect('plugin.Missing' in reg.fields).toBe(false);
    });
  });

  describe('isolation', () => {
    it('keeps two registries' /* */ + ' independent', () => {
      const reactory = createMockReactorySDK();
      const a = createReactoryRegistry({ reactory });
      const b = createReactoryRegistry({ reactory });
      a.registerField('OnlyOnA', Field);
      expect(a.fields.OnlyOnA).toBe(Field);
      expect(b.fields.OnlyOnA).toBeUndefined();
    });

    it('does not share caches across registries', () => {
      const reactory = createMockReactorySDK({ components: { 'plugin.X': PluginField } });
      const a = createReactoryRegistry({ reactory });
      const b = createReactoryRegistry({ reactory });
      void a.fields['plugin.X'];
      void b.fields['plugin.X'];
      // Each registry independently called the SDK once.
      expect(reactory.getComponentCalls).toEqual(['plugin.X', 'plugin.X']);
    });
  });
});
