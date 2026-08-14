import { marked } from 'marked';
import TurndownService from 'turndown';

/**
 * The authoring formats a content body can be written in.
 */
export type ContentFormat = 'markdown' | 'html' | 'text';

export const CONTENT_FORMATS: ContentFormat[] = ['markdown', 'html', 'text'];

/**
 * Content saved before the `format` field existed came out of a WYSIWYG
 * editor, so it is HTML unless the record says otherwise.
 */
export const DEFAULT_CONTENT_FORMAT: ContentFormat = 'html';

export const FORMAT_LABELS: Record<ContentFormat, string> = {
  markdown: 'Markdown',
  html: 'HTML',
  text: 'Plain text',
};

/**
 * Reactory component tags are not valid markdown or HTML to a converter, and
 * both marked and turndown will happily mangle them. Every conversion runs
 * with the tags swapped out for inert placeholders and restored afterwards.
 */
const REACTORY_TAG_PATTERN = /<reactory\b[^>]*?(?:\/>|>[\s\S]*?<\/reactory>)/gi;
const PLACEHOLDER_PREFIX = 'RXTAG';

interface Shielded {
  text: string;
  tags: string[];
}

/**
 * Replaces `<reactory />` tags with placeholders that survive a round trip
 * through a markdown or HTML converter.
 */
const shieldReactoryTags = (input: string): Shielded => {
  const tags: string[] = [];
  const text = (input || '').replace(REACTORY_TAG_PATTERN, (match) => {
    tags.push(match);
    // Wrapped in a fenced-looking token so neither converter treats it as prose
    // to be escaped or wrapped in a paragraph.
    return `${PLACEHOLDER_PREFIX}${tags.length - 1}ENDRXTAG`;
  });
  return { text, tags };
};

/**
 * Restores placeholders produced by {@link shieldReactoryTags}.
 */
const unshieldReactoryTags = ({ text, tags }: Shielded): string => {
  let restored = text || '';
  tags.forEach((tag, index) => {
    // The converters may wrap a bare placeholder in a paragraph; strip that too
    // so the component tag lands as a block level element.
    const wrapped = new RegExp(`<p>\\s*${PLACEHOLDER_PREFIX}${index}ENDRXTAG\\s*</p>`, 'gi');
    const bare = new RegExp(`${PLACEHOLDER_PREFIX}${index}ENDRXTAG`, 'g');
    restored = restored.replace(wrapped, tag).replace(bare, tag);
  });
  return restored;
};

let turndown: TurndownService | null = null;

/**
 * Lazily builds the turndown instance. Configured to emit the ATX headings,
 * fenced code blocks and `-` bullets that the rest of Reactory's markdown
 * tooling expects.
 */
const getTurndown = (): TurndownService => {
  if (turndown) return turndown;

  turndown = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
  });

  // turndown drops unknown elements' tags but keeps their text; for tables we
  // want real markdown tables instead of a run-on paragraph.
  turndown.addRule('tables', {
    filter: 'table',
    replacement: (_content, node) => {
      const table = node as HTMLTableElement;
      const rows = Array.from(table.querySelectorAll('tr'));
      if (rows.length === 0) return '';

      const toCells = (row: HTMLTableRowElement) =>
        Array.from(row.querySelectorAll('th,td')).map((cell) =>
          (cell.textContent || '').trim().replace(/\|/g, '\\|').replace(/\n+/g, ' ')
        );

      const header = toCells(rows[0] as HTMLTableRowElement);
      const body = rows.slice(1).map((row) => toCells(row as HTMLTableRowElement));
      const columnCount = Math.max(header.length, ...body.map((r) => r.length), 1);
      const pad = (cells: string[]) => {
        const padded = [...cells];
        while (padded.length < columnCount) padded.push('');
        return `| ${padded.join(' | ')} |`;
      };

      return [
        pad(header),
        `| ${Array(columnCount).fill('---').join(' | ')} |`,
        ...body.map(pad),
      ].join('\n');
    },
  });

  return turndown;
};

/**
 * Strips tags from an HTML fragment, preserving block level line breaks.
 */
export const htmlToText = (html: string): string => {
  if (!html) return '';
  const normalised = (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ');

  if (typeof document === 'undefined') {
    return normalised.replace(/<[^>]+>/g, '').trim();
  }

  const container = document.createElement('div');
  container.innerHTML = normalised;
  return (container.textContent || '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Converts markdown to an HTML fragment.
 */
export const markdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  const shielded = shieldReactoryTags(markdown);
  const html = marked.parse(shielded.text, { async: false, gfm: true, breaks: false }) as string;
  return unshieldReactoryTags({ text: html, tags: shielded.tags });
};

/**
 * Converts an HTML fragment to markdown.
 */
export const htmlToMarkdown = (html: string): string => {
  if (!html) return '';
  const shielded = shieldReactoryTags(html);
  const markdown = getTurndown().turndown(shielded.text);
  return unshieldReactoryTags({ text: markdown, tags: shielded.tags });
};

/**
 * Escapes plain text into an HTML fragment, preserving paragraph breaks.
 */
export const textToHtml = (text: string): string => {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
    .join('\n');
};

/**
 * Converts a body between authoring formats.
 *
 * Conversion is inherently lossy in one direction (rich HTML has constructs
 * markdown cannot express, and both lose everything when reduced to text), so
 * callers should confirm with the user before applying the result.
 */
export const convertContent = (
  content: string,
  from: ContentFormat,
  to: ContentFormat
): string => {
  if (!content || from === to) return content || '';

  if (from === 'markdown' && to === 'html') return markdownToHtml(content);
  if (from === 'html' && to === 'markdown') return htmlToMarkdown(content);
  if (from === 'text' && to === 'html') return textToHtml(content);
  if (from === 'html' && to === 'text') return htmlToText(content);
  // Markdown is valid plain text, so downgrading keeps the source verbatim and
  // upgrading treats the text as markdown that simply uses no syntax.
  if (from === 'markdown' && to === 'text') return content;
  if (from === 'text' && to === 'markdown') return content;

  return content;
};

/**
 * True when switching between these formats can lose information.
 */
export const isLossyConversion = (from: ContentFormat, to: ContentFormat): boolean => {
  if (from === to) return false;
  if (from === 'text' && to === 'markdown') return false;
  if (from === 'markdown' && to === 'text') return false;
  return true;
};

/**
 * Best effort detection of how a body was authored, used to pick a sensible
 * editing surface for legacy content that has no stored format.
 */
export const detectFormat = (content: string): ContentFormat => {
  if (!content || !content.trim()) return DEFAULT_CONTENT_FORMAT;

  const withoutReactoryTags = content.replace(REACTORY_TAG_PATTERN, '');

  // A body that opens with real HTML block markup is HTML.
  if (/<(p|div|h[1-6]|ul|ol|table|section|article|blockquote|img|figure)\b/i.test(withoutReactoryTags)) {
    return 'html';
  }

  const markdownSignals = [
    /^#{1,6}\s+\S/m,
    /^\s*[-*+]\s+\S/m,
    /^\s*\d+\.\s+\S/m,
    /^>\s+\S/m,
    /```/,
    /\[[^\]]+\]\([^)]+\)/,
    /!\[[^\]]*\]\([^)]+\)/,
    /\*\*[^*]+\*\*/,
    /^\|.+\|\s*$/m,
  ];

  if (markdownSignals.some((pattern) => pattern.test(withoutReactoryTags))) {
    return 'markdown';
  }

  if (/<[a-z][^>]*>/i.test(withoutReactoryTags)) return 'html';

  return 'text';
};

/**
 * Normalises a value that may be a stored format string into a known format.
 */
export const coerceFormat = (
  value: string | null | undefined,
  content?: string
): ContentFormat => {
  const candidate = (value || '').toLowerCase();
  if ((CONTENT_FORMATS as string[]).includes(candidate)) return candidate as ContentFormat;
  // Legacy records predate the format field; infer from the body instead of
  // forcing everything into HTML.
  return content !== undefined ? detectFormat(content) : DEFAULT_CONTENT_FORMAT;
};

/**
 * A short, human readable summary of a body, used for editor status lines.
 */
export const contentStats = (content: string, format: ContentFormat) => {
  const plain = format === 'html' ? htmlToText(content) : content || '';
  const words = plain.trim() ? plain.trim().split(/\s+/).length : 0;
  return {
    words,
    characters: plain.length,
    // 200 wpm is the usual reading-time benchmark for web copy.
    readingMinutes: Math.max(1, Math.round(words / 200)),
  };
};
