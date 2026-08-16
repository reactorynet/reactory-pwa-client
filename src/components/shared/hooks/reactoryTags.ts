import moment from 'moment';

/**
 * Parsing for the `<reactory />` tags that let managed content embed live
 * components.
 *
 * Content can be authored as markdown, HTML or plain text, and each of those
 * is rendered through a different pipeline. Rather than teach every pipeline
 * about component tags, the tags are lifted out of the source first and the
 * remaining markup is handed on unchanged. That is what lets a component mount
 * inside a markdown document, where raw HTML is escaped and a placeholder
 * element would never reach the DOM.
 *
 * Tag shape:
 *   <reactory reactory-component="core.Label@1.0.0" reactory-props-text="Hi" />
 *   <reactory reactory-component="core.Panel@1.0.0">children</reactory>
 */

export interface ReactoryTag {
  /** Fully qualified component name, e.g. core.Label@1.0.0 */
  fqn: string;
  props: Record<string, unknown>;
  /** The original source text, so a caller can put it back verbatim. */
  raw: string;
}

export type ContentSegment =
  | { kind: 'markup'; value: string }
  | { kind: 'component'; tag: ReactoryTag };

/**
 * Source for the tag pattern, matching a self-closing or paired reactory tag.
 *
 * Deliberately not parsed with DOMParser in XML mode: authors routinely write
 * tags that are not well-formed XML (unquoted values, stray ampersands), and
 * an XML parse error would silently drop the component.
 *
 * Exposed as a source string, and every consumer builds its own RegExp. A
 * shared /g regex carries `lastIndex` between calls, so one function iterating
 * a document while another matched a single tag would rewind the outer scan
 * and loop forever.
 */
const REACTORY_TAG_SOURCE = String.raw`<reactory\b([^>]*?)(?:\/>|>([\s\S]*?)<\/reactory>)`;

/** A fresh matcher, so no `lastIndex` state is shared between callers. */
export const reactoryTagPattern = (): RegExp => new RegExp(REACTORY_TAG_SOURCE, 'gi');

/** Matches `name="value"` / `name='value'` / `name=value` attribute pairs. */
const attributePattern = (): RegExp =>
  /([a-zA-Z0-9_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

/**
 * Coerces an attribute value using the `type:` prefix convention.
 *
 * Values arrive as strings from markup, so the prefix is how an author says
 * "this is a number" rather than "this is the text 42".
 */
export const coerceTagValue = (raw: string): unknown => {
  const value = `${raw ?? ''}`.trim();

  if (value.startsWith('bool:')) return value.slice(5).trim() === 'true';
  if (value.startsWith('int:')) {
    const parsed = parseInt(value.slice(4).trim(), 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value.startsWith('float:')) {
    const parsed = parseFloat(value.slice(6).trim());
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value.startsWith('object:')) {
    try {
      return JSON.parse(value.slice(7));
    } catch (e) {
      // A malformed object must not take down the whole document; the
      // component simply does not receive that prop.
      return undefined;
    }
  }
  if (value.startsWith('moment:')) return moment(value.slice(7));
  if (value.startsWith('date:')) return new Date(value.slice(5));

  return value;
};

/**
 * Decodes the entity escaping that a markup pipeline may have applied to an
 * attribute value before we see it.
 */
const decodeEntities = (value: string): string =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/**
 * Parses a single reactory tag into its component name and props.
 * Returns null when the tag names no component, since mounting "undefined"
 * helps nobody.
 */
export const parseReactoryTag = (raw: string): ReactoryTag | null => {
  const match = reactoryTagPattern().exec(raw);
  if (!match) return null;

  const attributeSource = match[1] || '';
  const children = match[2];

  let fqn = '';
  const props: Record<string, unknown> = {};

  const attributes = attributePattern();
  let attribute: RegExpExecArray | null;
  while ((attribute = attributes.exec(attributeSource)) !== null) {
    const name = attribute[1];
    const value = decodeEntities(attribute[2] ?? attribute[3] ?? attribute[4] ?? '');

    if (name === 'reactory-component' || name === 'component') {
      fqn = value.trim();
      continue;
    }

    if (name.startsWith('reactory-props-')) {
      const propName = name.slice('reactory-props-'.length);
      const coerced = coerceTagValue(value);
      if (coerced !== undefined) props[propName] = coerced;
    }
  }

  if (!fqn) return null;

  // A paired tag passes its inner text through as children, which is the
  // natural way to write a component that wraps content.
  if (children && children.trim()) props.children = children;

  return { fqn, props, raw: match[0] };
};

/**
 * Splits content into an ordered list of markup and component segments.
 *
 * Markup segments are passed through to whichever renderer suits the content
 * format; component segments are rendered as real React elements. Nothing is
 * substituted into the markup, so no pipeline has to preserve a placeholder.
 */
export const splitReactoryTags = (content: string): ContentSegment[] => {
  if (!content) return [];
  if (content.indexOf('<reactory') < 0) return [{ kind: 'markup', value: content }];

  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Local matcher: parseReactoryTag below runs its own scan, and a shared
  // pattern would have its lastIndex reset underneath this loop.
  const matcher = reactoryTagPattern();
  while ((match = matcher.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'markup', value: content.slice(lastIndex, match.index) });
    }

    const tag = parseReactoryTag(match[0]);
    if (tag) {
      segments.push({ kind: 'component', tag });
    } else {
      // Keep an unparseable tag visible rather than swallowing it, so the
      // author can see that something is wrong with what they wrote.
      segments.push({ kind: 'markup', value: match[0] });
    }

    lastIndex = match.index + match[0].length;
    // A pattern that can match empty would never advance; guard regardless.
    if (match[0].length === 0) matcher.lastIndex += 1;
  }

  if (lastIndex < content.length) {
    segments.push({ kind: 'markup', value: content.slice(lastIndex) });
  }

  return segments;
};

/**
 * True when the content embeds at least one component tag.
 */
export const hasReactoryTags = (content: string): boolean =>
  Boolean(content) && content.indexOf('<reactory') >= 0;

/**
 * Builds a reactory tag from a component name and props. Used by the editor
 * when inserting a component, and by the rich text surface when converting its
 * embed back to source.
 */
export const buildReactoryTag = (fqn: string, props: Record<string, unknown> = {}): string => {
  const attributes = Object.entries(props)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      let encoded: string;
      if (typeof value === 'boolean') encoded = `bool:${value}`;
      else if (typeof value === 'number') {
        encoded = Number.isInteger(value) ? `int:${value}` : `float:${value}`;
      } else if (typeof value === 'object') encoded = `object:${JSON.stringify(value)}`;
      else encoded = `${value}`;

      return ` reactory-props-${key}="${encoded.replace(/"/g, '&quot;')}"`;
    })
    .join('');

  return `<reactory reactory-component="${fqn}"${attributes} />`;
};
