/**
 * svgAttribute — safe rendering of parser-emitted SVG attribute payloads.
 *
 * Analyzers attach file-icon attributes shaped `{ type: 'svg', svg: '<svg…>' }`
 * (sometimes as a JSON string, sometimes as raw markup). The inspector renders
 * these inline, so the markup is strictly sanitized first: only an <svg> root,
 * no scripting elements, no event handlers, no external/javascript URLs.
 */

const BLOCKED_ELEMENTS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'audio',
  'video',
  'animate',
  'set',
  'animatemotion',
  'animatetransform',
]);

const URL_ATTRIBUTES = new Set(['href', 'xlink:href', 'src']);

/**
 * Pulls SVG markup out of an attribute value in any of the shapes the
 * parsers emit. Returns null when the value is not an SVG payload.
 */
export const extractSvgMarkup = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('<svg')) return trimmed;
    if (trimmed.startsWith('{')) {
      try {
        return extractSvgMarkup(JSON.parse(trimmed));
      } catch {
        return null;
      }
    }
    return null;
  }
  if (typeof value === 'object') {
    const record = value as { type?: unknown; svg?: unknown };
    if (record.type === 'svg' && typeof record.svg === 'string') {
      return extractSvgMarkup(record.svg);
    }
  }
  return null;
};

/**
 * Parses and sanitizes SVG markup. Returns safe markup, or null when the
 * input does not parse to a plain <svg> document.
 */
export const sanitizeSvg = (markup: string): string | null => {
  if (typeof DOMParser === 'undefined') return null;
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  } catch {
    return null;
  }
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) {
    return null;
  }

  const elements = [root, ...Array.from(root.querySelectorAll('*'))];
  for (const el of elements) {
    if (BLOCKED_ELEMENTS.has(el.nodeName.toLowerCase())) {
      el.remove();
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
      } else if (URL_ATTRIBUTES.has(name) && !value.startsWith('#') && !value.startsWith('data:image/')) {
        // Only internal references and inline images may be linked.
        el.removeAttribute(attr.name);
      } else if (value.includes('javascript:')) {
        el.removeAttribute(attr.name);
      }
    }
  }
  return root.outerHTML;
};

/** extract + sanitize in one step. */
export const toSafeSvg = (value: unknown): string | null => {
  const markup = extractSvgMarkup(value);
  return markup ? sanitizeSvg(markup) : null;
};
