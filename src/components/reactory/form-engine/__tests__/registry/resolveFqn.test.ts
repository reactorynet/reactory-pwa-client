import { resolveFqn, parseFqn } from '../../registry/resolveFqn';
import { createMockReactorySDK } from '../../testing/mockReactorySDK';

describe('parseFqn', () => {
  it('flags a simple FQN as such', () => {
    const p = parseFqn('core.MyField');
    expect(p).toEqual({
      input: 'core.MyField',
      isFqn: true,
      resolvable: 'core.MyField',
      hadGlobalPrefix: false,
      version: undefined,
    });
  });

  it('flags a non-FQN name (no dot) as such', () => {
    expect(parseFqn('TextWidget').isFqn).toBe(false);
  });

  it('strips a $GLOBAL$ prefix', () => {
    const p = parseFqn('$GLOBAL$core.MyField');
    expect(p.hadGlobalPrefix).toBe(true);
    expect(p.resolvable).toBe('core.MyField');
    expect(p.isFqn).toBe(true);
  });

  it('strips a version suffix', () => {
    const p = parseFqn('core.MyField@1.0.0');
    expect(p.version).toBe('1.0.0');
    expect(p.resolvable).toBe('core.MyField');
  });

  it('handles both prefix and version', () => {
    const p = parseFqn('$GLOBAL$core.MyField@2.3.4-rc.1');
    expect(p.hadGlobalPrefix).toBe(true);
    expect(p.version).toBe('2.3.4-rc.1');
    expect(p.resolvable).toBe('core.MyField');
  });

  it('does not consume an empty version segment', () => {
    // "core.MyField@" with nothing after the @ is treated as having no version.
    const p = parseFqn('core.MyField@');
    expect(p.version).toBeUndefined();
    expect(p.resolvable).toBe('core.MyField@');
  });

  it('handles multi-segment namespaces', () => {
    const p = parseFqn('material.ui.MaterialCore');
    expect(p.isFqn).toBe(true);
    expect(p.resolvable).toBe('material.ui.MaterialCore');
  });

  it('returns the input unchanged in the input field', () => {
    const input = '$GLOBAL$core.MyField@1.0';
    expect(parseFqn(input).input).toBe(input);
  });
});

describe('resolveFqn', () => {
  it('returns null for a non-FQN string (no dot)', () => {
    const reactory = createMockReactorySDK();
    expect(resolveFqn({ reactory }, 'TextWidget', 'widget')).toBeNull();
    expect(reactory.getComponentCalls).toEqual([]);
  });

  it('returns null for an empty string', () => {
    const reactory = createMockReactorySDK();
    expect(resolveFqn({ reactory }, '', 'widget')).toBeNull();
  });

  it('returns null for a non-string input', () => {
    const reactory = createMockReactorySDK();
    // The runtime guard against non-string inputs is defensive — types should
    // prevent this, but plugin-supplied strings can sneak through `any`.
    expect(resolveFqn({ reactory }, undefined as unknown as string, 'widget')).toBeNull();
  });

  it('resolves a registered FQN via the SDK', () => {
    const Marker = () => null;
    const reactory = createMockReactorySDK({ components: { 'core.Marker': Marker } });
    expect(resolveFqn({ reactory }, 'core.Marker', 'field')).toBe(Marker);
    expect(reactory.getComponentCalls).toEqual(['core.Marker']);
  });

  it('returns null when the SDK reports a miss', () => {
    const reactory = createMockReactorySDK();
    const onMiss = jest.fn();
    expect(resolveFqn({ reactory, onMiss }, 'core.Missing', 'field')).toBeNull();
    expect(onMiss).toHaveBeenCalledWith('field', 'core.Missing');
  });

  it('strips $GLOBAL$ prefix and resolves the remainder', () => {
    const Marker = () => null;
    const reactory = createMockReactorySDK({ components: { 'core.Marker': Marker } });
    expect(resolveFqn({ reactory }, '$GLOBAL$core.Marker', 'widget')).toBe(Marker);
    expect(reactory.getComponentCalls).toEqual(['core.Marker']);
  });

  it('logs a debug message when stripping $GLOBAL$', () => {
    const reactory = createMockReactorySDK({ components: { 'a.B': () => null } });
    resolveFqn({ reactory }, '$GLOBAL$a.B', 'widget');
    expect(reactory.logCalls.some((l) => l.level === 'debug' && l.message.includes('$GLOBAL$'))).toBe(true);
  });

  it('strips @version suffix and resolves the bare name', () => {
    const Marker = () => null;
    const reactory = createMockReactorySDK({ components: { 'core.Marker': Marker } });
    expect(resolveFqn({ reactory }, 'core.Marker@1.0.0', 'field')).toBe(Marker);
    expect(reactory.getComponentCalls).toEqual(['core.Marker']);
  });

  it('logs a debug message when ignoring a version suffix', () => {
    const reactory = createMockReactorySDK({ components: { 'a.B': () => null } });
    resolveFqn({ reactory }, 'a.B@1.2.3', 'field');
    expect(reactory.logCalls.some((l) => l.level === 'debug' && l.message.includes('@version'))).toBe(true);
  });

  it('handles both prefix and version together', () => {
    const Marker = () => null;
    const reactory = createMockReactorySDK({ components: { 'core.Marker': Marker } });
    expect(resolveFqn({ reactory }, '$GLOBAL$core.Marker@1.0.0', 'widget')).toBe(Marker);
    expect(reactory.getComponentCalls).toEqual(['core.Marker']);
  });

  it('returns null and logs error when the SDK throws', () => {
    const reactory = createMockReactorySDK();
    const orig = reactory.getComponent;
    reactory.getComponent = ((fqn: string) => {
      reactory.getComponentCalls.push(fqn);
      throw new Error('SDK exploded');
    }) as typeof reactory.getComponent;
    const onMiss = jest.fn();
    try {
      expect(resolveFqn({ reactory, onMiss }, 'core.Boom', 'field')).toBeNull();
      expect(onMiss).toHaveBeenCalledWith('field', 'core.Boom');
      expect(reactory.logCalls.some((l) => l.level === 'error')).toBe(true);
    } finally {
      reactory.getComponent = orig;
    }
  });

  it('returns null and logs error when the SDK returns a non-component value', () => {
    const reactory = createMockReactorySDK({ components: { 'a.B': 42 as unknown as React.ComponentType<unknown> } });
    expect(resolveFqn({ reactory }, 'a.B', 'field')).toBeNull();
    expect(reactory.logCalls.some((l) => l.level === 'error' && l.message.includes('non-component'))).toBe(true);
  });

  it('accepts a class-component-shaped value (typeof object via prototype)', () => {
    class ClassWidget {
      render() {
        return null;
      }
    }
    const reactory = createMockReactorySDK({ components: { 'a.B': ClassWidget } });
    // Class declarations are typeof "function" in JS. Ensure resolution accepts them.
    expect(resolveFqn({ reactory }, 'a.B', 'widget')).toBe(ClassWidget);
  });

  it('passes the kind through to onMiss', () => {
    const reactory = createMockReactorySDK();
    const misses: Array<{ kind: string; name: string }> = [];
    resolveFqn({ reactory, onMiss: (kind, name) => misses.push({ kind, name }) }, 'a.B', 'widget');
    resolveFqn({ reactory, onMiss: (kind, name) => misses.push({ kind, name }) }, 'a.B', 'field');
    expect(misses).toEqual([
      { kind: 'widget', name: 'a.B' },
      { kind: 'field', name: 'a.B' },
    ]);
  });

  it('does not call onMiss on successful resolution', () => {
    const reactory = createMockReactorySDK({ components: { 'a.B': () => null } });
    const onMiss = jest.fn();
    resolveFqn({ reactory, onMiss }, 'a.B', 'widget');
    expect(onMiss).not.toHaveBeenCalled();
  });

  it('treats a multi-dot FQN as a single resolvable name', () => {
    const Marker = () => null;
    const reactory = createMockReactorySDK({ components: { 'a.b.C': Marker } });
    expect(resolveFqn({ reactory }, 'a.b.C', 'field')).toBe(Marker);
  });
});
