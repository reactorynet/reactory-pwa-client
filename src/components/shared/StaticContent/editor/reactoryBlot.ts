import { Quill } from 'react-quill';
import { buildReactoryTag, parseReactoryTag } from '@reactory/client-core/components/shared/hooks/reactoryTags';

/**
 * A Quill embed for `<reactory />` component tags.
 *
 * Quill only keeps markup it has a blot for. Without this, pasting a component
 * tag into the rich text surface produced no error and no tag — Quill's
 * clipboard matched the unknown element, found no blot, and dropped it, so
 * "Insert Reactory Component" appeared to work while silently discarding the
 * component.
 *
 * The embed stores the component name and its encoded props on data
 * attributes, and renders a compact chip so the author can see and select the
 * component while editing. On the way out, `toContentHtml` converts the embeds
 * back to `<reactory />` tags, which is what gets persisted and what the
 * renderer understands.
 */

export const REACTORY_EMBED_CLASS = 'reactory-embed';
const EMBED_BLOT_NAME = 'reactory-embed';

export interface ReactoryEmbedValue {
  fqn: string;
  /** The original tag source, kept verbatim so nothing is lost in translation. */
  tag: string;
}

let registered = false;

/**
 * Registers the embed with Quill. Safe to call repeatedly; only the first call
 * does anything, since Quill throws when a blot name is registered twice.
 */
export const registerReactoryBlot = (): void => {
  if (registered || !Quill) return;

  try {
    const BlockEmbed: any = Quill.import('blots/block/embed');

    class ReactoryEmbed extends BlockEmbed {
      static blotName = EMBED_BLOT_NAME;

      // A block level embed keeps the component a sibling of the paragraphs
      // around it rather than nested inside one, which is what lets the
      // content be split back apart cleanly on save.
      static tagName = 'DIV';

      static className = REACTORY_EMBED_CLASS;

      static create(value: ReactoryEmbedValue) {
        const node: HTMLElement = super.create(value);
        node.setAttribute('data-reactory-fqn', value?.fqn || '');
        node.setAttribute('data-reactory-tag', value?.tag || '');
        node.setAttribute('contenteditable', 'false');
        // Presented as a chip rather than the live component: rendering real
        // components inside the editor would let their event handlers fight
        // with Quill's selection handling.
        node.textContent = `⚛ ${value?.fqn || 'component'}`;
        return node;
      }

      static value(node: HTMLElement): ReactoryEmbedValue {
        return {
          fqn: node.getAttribute('data-reactory-fqn') || '',
          tag: node.getAttribute('data-reactory-tag') || '',
        };
      }
    }

    Quill.register(ReactoryEmbed, true);
    registered = true;
  } catch (e) {
    // A registration failure must not stop the editor loading; component
    // insertion falls back to the source surfaces.
    registered = false;
  }
};

/**
 * Converts `<reactory />` tags in stored content into the embed markup Quill
 * understands, so existing content opens with its components intact.
 */
export const toEditorHtml = (html: string): string => {
  if (!html || html.indexOf('<reactory') < 0) return html || '';

  return html.replace(/<reactory\b[^>]*?(?:\/>|>[\s\S]*?<\/reactory>)/gi, (match) => {
    const tag = parseReactoryTag(match);
    if (!tag) return match;
    const encoded = match.replace(/"/g, '&quot;');
    return (
      `<div class="${REACTORY_EMBED_CLASS}" data-reactory-fqn="${tag.fqn}" ` +
      `data-reactory-tag="${encoded}" contenteditable="false">⚛ ${tag.fqn}</div>`
    );
  });
};

/**
 * Converts embeds in the editor's HTML back into `<reactory />` tags for
 * storage. Anything that is not an embed passes through untouched.
 */
export const toContentHtml = (html: string): string => {
  if (!html || html.indexOf(REACTORY_EMBED_CLASS) < 0) return html || '';

  if (typeof document === 'undefined') return html;

  const container = document.createElement('div');
  container.innerHTML = html;

  container.querySelectorAll(`.${REACTORY_EMBED_CLASS}`).forEach((node) => {
    const stored = node.getAttribute('data-reactory-tag');
    const fqn = node.getAttribute('data-reactory-fqn') || '';
    // Prefer the tag exactly as authored; fall back to rebuilding it from the
    // component name so an embed missing its source still round-trips.
    const tag = stored || buildReactoryTag(fqn);
    node.replaceWith(document.createTextNode(tag));
  });

  // The tags were inserted as text nodes so the DOM would not re-parse them;
  // decode them back into markup for storage.
  return container.innerHTML
    .replace(/&lt;reactory/gi, '<reactory')
    .replace(/\/&gt;/g, '/>')
    .replace(/&lt;\/reactory&gt;/gi, '</reactory>');
};
