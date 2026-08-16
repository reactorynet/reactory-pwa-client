import {
  buildReactoryTag,
  coerceTagValue,
  hasReactoryTags,
  parseReactoryTag,
  splitReactoryTags,
} from '../reactoryTags';

describe('reactory tag parsing', () => {
  describe('parseReactoryTag', () => {
    it('reads the component name from a self-closing tag', () => {
      const tag = parseReactoryTag('<reactory reactory-component="core.Label@1.0.0" />');
      expect(tag?.fqn).toBe('core.Label@1.0.0');
    });

    it('reads props off reactory-props- attributes', () => {
      const tag = parseReactoryTag(
        '<reactory reactory-component="core.Label@1.0.0" reactory-props-text="Hello" />'
      );
      expect(tag?.props).toEqual({ text: 'Hello' });
    });

    it('accepts the short component attribute as well', () => {
      expect(parseReactoryTag('<reactory component="core.Label@1.0.0" />')?.fqn).toBe(
        'core.Label@1.0.0'
      );
    });

    it('passes the body of a paired tag through as children', () => {
      const tag = parseReactoryTag(
        '<reactory reactory-component="core.Panel@1.0.0">inner text</reactory>'
      );
      expect(tag?.props.children).toBe('inner text');
    });

    it('returns null when no component is named', () => {
      expect(parseReactoryTag('<reactory reactory-props-text="orphan" />')).toBeNull();
    });

    it('handles single quoted and unquoted attribute values', () => {
      expect(parseReactoryTag("<reactory reactory-component='core.A@1.0.0' />")?.fqn).toBe(
        'core.A@1.0.0'
      );
      expect(parseReactoryTag('<reactory reactory-component=core.B@1.0.0 />')?.fqn).toBe(
        'core.B@1.0.0'
      );
    });

    it('survives a tag that is not well-formed XML', () => {
      // An XML parser would reject this outright and drop the component.
      const tag = parseReactoryTag(
        '<reactory reactory-component="core.Label@1.0.0" reactory-props-text="a & b" />'
      );
      expect(tag?.fqn).toBe('core.Label@1.0.0');
      expect(tag?.props.text).toBe('a & b');
    });

    it('decodes entity-escaped attribute values', () => {
      const tag = parseReactoryTag(
        '<reactory reactory-component="core.Label@1.0.0" reactory-props-text="&quot;quoted&quot;" />'
      );
      expect(tag?.props.text).toBe('"quoted"');
    });
  });

  describe('coerceTagValue', () => {
    it('coerces typed prefixes', () => {
      expect(coerceTagValue('bool:true')).toBe(true);
      expect(coerceTagValue('bool:false')).toBe(false);
      expect(coerceTagValue('int:42')).toBe(42);
      expect(coerceTagValue('float:1.5')).toBe(1.5);
      expect(coerceTagValue('object:{"a":1}')).toEqual({ a: 1 });
    });

    it('treats an unprefixed value as a string', () => {
      expect(coerceTagValue('plain text')).toBe('plain text');
      expect(coerceTagValue('42')).toBe('42');
    });

    it('produces a date for date and moment prefixes', () => {
      expect(coerceTagValue('date:2026-01-01')).toBeInstanceOf(Date);
      expect(coerceTagValue('moment:2026-01-01')).toBeTruthy();
    });

    it('drops a malformed object rather than throwing', () => {
      expect(coerceTagValue('object:{not json}')).toBeUndefined();
    });

    it('falls back to zero for unparseable numbers', () => {
      expect(coerceTagValue('int:abc')).toBe(0);
      expect(coerceTagValue('float:abc')).toBe(0);
    });
  });

  describe('splitReactoryTags', () => {
    it('returns a single markup segment when there are no tags', () => {
      expect(splitReactoryTags('# Just markdown')).toEqual([
        { kind: 'markup', value: '# Just markdown' },
      ]);
    });

    it('splits markup around a tag, preserving order', () => {
      const segments = splitReactoryTags(
        'before\n<reactory reactory-component="core.Label@1.0.0" />\nafter'
      );
      expect(segments.map((s) => s.kind)).toEqual(['markup', 'component', 'markup']);
      expect((segments[0] as any).value).toContain('before');
      expect((segments[1] as any).tag.fqn).toBe('core.Label@1.0.0');
      expect((segments[2] as any).value).toContain('after');
    });

    it('handles several tags in one document', () => {
      const segments = splitReactoryTags(
        '<reactory reactory-component="core.A@1.0.0" />mid<reactory reactory-component="core.B@1.0.0" />'
      );
      const components = segments.filter((s) => s.kind === 'component') as any[];
      expect(components.map((c) => c.tag.fqn)).toEqual(['core.A@1.0.0', 'core.B@1.0.0']);
    });

    it('keeps an unparseable tag visible as markup instead of swallowing it', () => {
      const segments = splitReactoryTags('a <reactory reactory-props-text="no fqn" /> b');
      expect(segments.every((s) => s.kind === 'markup')).toBe(true);
      expect(segments.map((s: any) => s.value).join('')).toContain('reactory-props-text');
    });

    it('returns nothing for empty content', () => {
      expect(splitReactoryTags('')).toEqual([]);
    });
  });

  describe('hasReactoryTags', () => {
    it('detects presence', () => {
      expect(hasReactoryTags('x <reactory reactory-component="a" /> y')).toBe(true);
      expect(hasReactoryTags('# no components here')).toBe(false);
      expect(hasReactoryTags('')).toBe(false);
    });
  });

  describe('buildReactoryTag', () => {
    it('round-trips through the parser', () => {
      const built = buildReactoryTag('core.Label@1.0.0', {
        text: 'Hello',
        count: 3,
        ratio: 1.5,
        active: true,
        config: { a: 1 },
      });

      const parsed = parseReactoryTag(built);
      expect(parsed?.fqn).toBe('core.Label@1.0.0');
      expect(parsed?.props).toEqual({
        text: 'Hello',
        count: 3,
        ratio: 1.5,
        active: true,
        config: { a: 1 },
      });
    });

    it('omits null and undefined props', () => {
      const built = buildReactoryTag('core.A@1.0.0', { a: undefined, b: null, c: 'keep' });
      expect(built).not.toContain('reactory-props-a');
      expect(built).not.toContain('reactory-props-b');
      expect(built).toContain('reactory-props-c="keep"');
    });
  });
});
