import { Macro, MacroComponentDefinition, SidePanelAction, UXChatMessage } from "../../types";

/**
 * Attempts to parse a value as JSON if it's a string.
 * This handles cases where models send serialized JSON strings for objects/arrays.
 */
const tryParseJSON = (val: unknown): unknown => {
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
};

export interface ImageItemPayload {
  id?: string;
  src: string;
  alt?: string;
  title?: string;
  caption?: string;
  selected?: boolean;
  meta?: Record<string, any>;
}

/**
 * Helper to resolve safe CDN URL from relative or disk paths
 */
const resolveImageUrl = (rawSrc: string, reactory: any): string => {
  if (!rawSrc) return '';
  let resolvedSrc = rawSrc;
  if (!resolvedSrc.startsWith('http://') && !resolvedSrc.startsWith('https://') && !resolvedSrc.startsWith('data:')) {
    if (resolvedSrc.includes('reactory-data/')) {
      resolvedSrc = resolvedSrc.substring(resolvedSrc.indexOf('reactory-data/') + 'reactory-data/'.length);
    } else if (resolvedSrc.includes('${APP_DATA_ROOT}/')) {
      resolvedSrc = resolvedSrc.substring(resolvedSrc.indexOf('${APP_DATA_ROOT}/') + '${APP_DATA_ROOT}/'.length);
    }

    if (resolvedSrc.startsWith('/cdn/')) {
      resolvedSrc = resolvedSrc.substring(4); // leaves '/...'
    } else if (resolvedSrc.startsWith('cdn/')) {
      resolvedSrc = resolvedSrc.substring(3); // leaves '/...'
    }

    if (!resolvedSrc.startsWith('/')) {
      resolvedSrc = `/${resolvedSrc}`;
    }

    // @ts-ignore
    resolvedSrc = reactory?.utils?.safeCDNUrl ? reactory.utils.safeCDNUrl(resolvedSrc) : `http://localhost:4000/cdn${resolvedSrc}`;
  }
  return resolvedSrc;
};

/**
 * Image Macro for ReactorChat
 * Displays images inline and/or in the persistent side panel using core.ImageComponent@1.0.0
 * Supporting single image display and auto-resizing responsive image grids with interactive AMQ event bridges.
 */
//@ts-ignore
const ImageMacro: Macro<UXChatMessage> = async (args, chatState, reactory) => {
  const parsed = (args && typeof args === 'object' && !Array.isArray(args))
    ? (args as Record<string, any>)
    : {};

  const action: SidePanelAction | 'inline' = parsed.action || 'add';
  const referenceId: string | undefined = parsed.referenceId;
  const panelTitle: string = parsed.title || 'Image Gallery';

  // ── REMOVE from Side Panel ──
  if (action === 'remove') {
    if (!referenceId) {
      return {
        __typename: "ReactorChatMessage",
        role: "assistant",
        content: 'Cannot remove image gallery: `referenceId` is required for the remove action.',
        id: reactory.utils.uuid(),
        rating: 0,
        timestamp: new Date(),
        tool_calls: [],
      };
    }
    if (chatState.sidePanel) {
      chatState.sidePanel.removeItem(referenceId);
    }
    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content: `Removed image gallery "${referenceId}" from the side panel.`,
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: [],
    };
  }

  // Extract raw fields with parsing support
  const rawImages = tryParseJSON(parsed.images);
  const rawSrc = parsed.src || (Array.isArray(args) ? args[0] : "") || "";
  const alt: string = parsed.alt || "Image";
  const title: string = parsed.title || "";
  const caption: string = parsed.caption || "";
  const rawOptions = tryParseJSON(parsed.options) || {};
  const options: Record<string, any> = typeof rawOptions === 'object' && rawOptions !== null
    ? rawOptions
    : {};

  let normalizedImages: ImageItemPayload[] = [];

  if (Array.isArray(rawImages) && rawImages.length > 0) {
    normalizedImages = rawImages.map((img: any, idx: number) => {
      if (typeof img === 'string') {
        const resolved = resolveImageUrl(img, reactory);
        return {
          id: `img-${idx}`,
          src: resolved,
          alt: `${alt} ${idx + 1}`,
        };
      }
      return {
        ...img,
        id: img.id || `img-${idx}`,
        src: resolveImageUrl(img.src, reactory),
        alt: img.alt || img.title || `${alt} ${idx + 1}`,
        title: img.title,
        caption: img.caption,
        selected: !!img.selected,
        meta: img.meta,
      };
    });
  } else if (Array.isArray(rawSrc) && rawSrc.length > 0) {
    normalizedImages = rawSrc.map((item: any, idx: number) => {
      if (typeof item === 'string') {
        return {
          id: `img-${idx}`,
          src: resolveImageUrl(item, reactory),
          alt: `${alt} ${idx + 1}`,
        };
      }
      return {
        ...item,
        id: item.id || `img-${idx}`,
        src: resolveImageUrl(item.src, reactory),
        alt: item.alt || item.title || `${alt} ${idx + 1}`,
        title: item.title,
        caption: item.caption,
        selected: !!item.selected,
        meta: item.meta,
      };
    });
  } else if (typeof rawSrc === 'string' && rawSrc.trim().length > 0) {
    normalizedImages = [{
      id: 'img-single',
      src: resolveImageUrl(rawSrc.trim(), reactory),
      alt,
      title,
      caption,
    }];
  }

  // Validate that we have at least one image source
  if (normalizedImages.length === 0 || !normalizedImages[0].src) {
    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content: "An image source URL, data URI, or an array of images is required to display an image.",
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: [],
    };
  }

  const isMulti = normalizedImages.length > 1 || options.variant === 'grid' || options.variant === 'gallery';

  // Format resilient markdown fallback content
  let markdownContent = '';
  if (isMulti) {
    markdownContent = normalizedImages.map((img) => {
      const displayCap = img.caption || img.title || '';
      return displayCap
        ? `![${img.alt || 'Image'}](${img.src})\n\n*${displayCap}*`
        : `![${img.alt || 'Image'}](${img.src})`;
    }).join('\n\n');
  } else {
    const single = normalizedImages[0];
    const displayCap = single.caption || caption;
    markdownContent = displayCap
      ? `![${single.alt || alt}](${single.src})\n\n*${displayCap}*`
      : `![${single.alt || alt}](${single.src})`;
  }

  const variant = options.variant || (isMulti ? 'grid' : 'img');

  const style: React.CSSProperties = {
    ...(options.width !== undefined && { width: options.width }),
    ...(options.height !== undefined && { height: options.height }),
    ...(options.maxWidth !== undefined && { maxWidth: options.maxWidth }),
    ...(options.maxHeight !== undefined && { maxHeight: options.maxHeight }),
    ...(options.style || {}),
  };

  const singleSrc = normalizedImages[0].src;

  const imageProps = {
    value: isMulti ? normalizedImages.map(i => i.src) : singleSrc,
    src: singleSrc,
    images: normalizedImages,
    alt,
    title,
    caption,
    variant,
    avatarVariant: options.avatarVariant || 'rounded',
    size: options.size,
    style: Object.keys(style).length > 0 ? style : undefined,
    className: options.className,
    editable: false,
    disabled: false,
    options: {
      ...options,
      eventChannel: options.eventChannel || 'reactor',
      eventId: options.eventId || 'image.selected',
      chatSessionId: chatState?.id,
    },
    chatSessionId: chatState?.id,
  };

  // ── UPDATE in Side Panel ──
  if (action === 'update' && referenceId && chatState?.sidePanel) {
    chatState.sidePanel.updateItem(referenceId, {
      props: imageProps,
      title: panelTitle,
    });
  }

  // ── ADD to Side Panel (default when side panel is available and action !== 'inline') ──
  const itemId = referenceId || reactory.utils.uuid();
  if (action === 'add' && chatState?.sidePanel) {
    chatState.sidePanel.addItem({
      id: itemId,
      componentFqn: 'core.ImageComponent@1.0.0',
      props: imageProps,
      title: panelTitle,
      addedAt: new Date(),
      type: 'component',
    });
  }

  return {
    __typename: "ReactorChatMessage",
    role: "assistant",
    content: markdownContent,
    component: 'core.ImageComponent@1.0.0',
    props: imageProps,
    id: reactory.utils.uuid(),
    rating: 0,
    timestamp: new Date(),
    tool_calls: [],
  };
};

const TOOL_DESCRIPTION = `Display an image or a collection of images inline and/or in the persistent side panel with auto-resizing responsive grid layout, metadata (titles/captions), and interactive selection events.

ACTIONS:
- "add" (default): Mount images in the persistent side panel and display inline.
- "update": Update an existing image gallery in the side panel. Requires "referenceId".
- "remove": Remove an image gallery from the side panel. Requires "referenceId".
- "inline": Display image inline only without mounting in side panel.

SRC & IMAGE FORMATS:
- Single image: "src": "https://example.com/photo.png" or "/images/logo.png" or "data:image/png;base64,..."
- Multiple images: "images": [
    { "src": "https://example.com/1.png", "title": "Dashboard View", "caption": "Monthly metrics", "id": "dash-1" },
    { "src": "https://example.com/2.png", "title": "User Analytics", "caption": "Active cohorts", "id": "user-2" }
  ]

OPTIONS REFERENCE:
- "variant": 'img' (default for 1 image), 'grid' (default for multi-image), 'gallery', 'avatar', 'card-media', 'div'
- "columns": 'auto' (auto-fill responsive grid, default) or numeric column count (e.g. 2, 3, 4)
- "aspectRatio": CSS aspect ratio, e.g. '16/9', '4/3' (default), '1/1'
- "selectable": true to enable click-selection with AMQ event dispatching to the AI agent
- "multiSelect": true to permit selecting multiple images simultaneously
- "showTitles": boolean (default true in grid)
- "showCaptions": boolean (default true in grid)
- "eventChannel": AMQ channel name (default 'reactor')
- "eventId": AMQ eventId published on selection (default 'image.selected')

EVENT BRIDGE:
When a user selects an image, an event is published via Reactory AMQ with payload:
{
  "selected": { "id": "...", "src": "...", "title": "...", "caption": "...", "meta": {...} },
  "selectedImages": [...],
  "index": 0,
  "chatSessionId": "...",
  "timestamp": "..."
}

EXAMPLES:

1) Single image with caption:
   { "src": "https://example.com/arch.png", "alt": "System Architecture", "caption": "Microservices topology" }

2) Multi-image responsive grid with interactive selection:
   {
     "title": "Module Selection",
     "images": [
       { "id": "opt-1", "src": "/images/variantA.png", "title": "Modern Theme", "caption": "Dark mode styling" },
       { "id": "opt-2", "src": "/images/variantB.png", "title": "Classic Theme", "caption": "Light mode styling" }
     ],
     "options": { "variant": "grid", "selectable": true, "columns": "auto" }
   }`;

const ImageMacroDefinition: MacroComponentDefinition<typeof ImageMacro> = {
  name: "ImageMacro",
  description: "Display images or responsive image galleries inline in the conversation and persistent side panel with auto-resizing grid layout and event bridge support.",
  component: ImageMacro,
  version: "1.0.0",
  nameSpace: "reactor-macros",
  roles: ['USER'],
  alias: 'image',
  icon: "image",
  runat: 'client',
  tools: [
    {
      type: "function",
      safeForAutoExecution: true,
      runat: "client",
      function: {
        name: "image",
        icon: "image",
        description: TOOL_DESCRIPTION,
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description: "The operation to perform: 'add' (default, side panel + inline), 'update', 'remove', or 'inline'.",
              enum: ["add", "update", "remove", "inline"],
            },
            referenceId: {
              type: "string",
              description: "Unique reference ID for side panel item tracking (required for 'update' and 'remove').",
            },
            src: {
              type: "string",
              description: "URL, CDN path, or base64 data URI of a single image.",
            },
            images: {
              type: "array",
              description: "Array of image objects with metadata [{ src, alt, title, caption, id, meta }] or image URL strings.",
              items: {
                type: "object",
                properties: {
                  src: { type: "string", description: "Image URL, CDN path, or base64 data URI." },
                  alt: { type: "string", description: "Accessible description." },
                  title: { type: "string", description: "Image title displayed in card/overlay." },
                  caption: { type: "string", description: "Subtitle or description text." },
                  id: { type: "string", description: "Unique identifier for this image item." },
                  meta: { type: "object", description: "Custom metadata passed back on selection events." },
                },
                required: ["src"],
              },
            },
            alt: {
              type: "string",
              description: "Accessible description of the image. Always provide this.",
            },
            title: {
              type: "string",
              description: "Title displayed in the side panel tab and above the image gallery.",
            },
            caption: {
              type: "string",
              description: "Optional caption text displayed below the image.",
            },
            options: {
              type: "object",
              description: "Display options: variant ('img'|'grid'|'gallery'|'avatar'|'card-media'), columns ('auto'|number), selectable (boolean), multiSelect (boolean), aspectRatio (string), eventChannel (string), eventId (string).",
            },
          },
        },
      },
    },
  ],
};

export default ImageMacroDefinition;
