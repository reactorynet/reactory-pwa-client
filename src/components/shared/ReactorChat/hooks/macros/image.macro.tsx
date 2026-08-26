import { Macro, MacroComponentDefinition, UXChatMessage } from "../../types";

/**
 * Attempts to parse a value as JSON if it's a string.
 * This handles cases where models send serialized JSON strings for objects.
 */
const tryParseJSON = (val: unknown): unknown => {
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
};

/**
 * Image Macro for ReactorChat
 * Displays images using the core ImageComponent (core.ImageComponent@1.0.0)
 * and provides markdown fallback for history/streaming contexts.
 */
//@ts-ignore
const ImageMacro: Macro<UXChatMessage> = async (args, chatState, reactory) => {
  const parsed = (args && typeof args === 'object' && !Array.isArray(args))
    ? (args as Record<string, any>)
    : {};

  // Extract raw fields with parsing support
  const src: string = parsed.src || (Array.isArray(args) ? args[0] : "") || "";
  const alt: string = parsed.alt || "Image";
  const caption: string = parsed.caption || "";
  const rawOptions = tryParseJSON(parsed.options) || {};
  const options: Record<string, any> = typeof rawOptions === 'object' && rawOptions !== null
    ? rawOptions
    : {};

  // Validate that we have an image source
  if (!src) {
    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content: "An image source URL or data URI is required to display an image.",
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: [],
    };
  }

  // Resolve safe CDN URL if relative path or local disk path
  let resolvedSrc = src;
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
    resolvedSrc = reactory.utils?.safeCDNUrl ? reactory.utils.safeCDNUrl(resolvedSrc) : `http://localhost:4000/cdn${resolvedSrc}`;
  }

  // Format resilient markdown fallback content
  const markdownContent = caption
    ? `![${alt}](${resolvedSrc})\n\n*${caption}*`
    : `![${alt}](${resolvedSrc})`;

  const variant = options.variant === 'avatar' || options.variant === 'div'
    ? options.variant
    : 'img';

  const style: React.CSSProperties = {
    ...(options.width !== undefined && { width: options.width }),
    ...(options.height !== undefined && { height: options.height }),
    ...(options.maxWidth !== undefined && { maxWidth: options.maxWidth }),
    ...(options.style || {}),
  };

  return {
    __typename: "ReactorChatMessage",
    role: "assistant",
    content: markdownContent,
    component: 'core.ImageComponent@1.0.0',
    props: {
      value: resolvedSrc,
      src: resolvedSrc,
      alt,
      caption,
      variant,
      avatarVariant: options.avatarVariant || 'rounded',
      size: options.size,
      style: Object.keys(style).length > 0 ? style : undefined,
      className: options.className,
      editable: false,
      disabled: false,
    },
    id: reactory.utils.uuid(),
    rating: 0,
    timestamp: new Date(),
    tool_calls: [],
  };
};

const TOOL_DESCRIPTION = `Display an image inline in the conversation from a URL, CDN path, or base64 data URI.

SRC FORMATS:
- Absolute URL: "https://example.com/photo.png"
- CDN relative path (resolved via reactory CDN root): "/images/logo.png"
- Base64 data URI: "data:image/png;base64,iVBOR..."

VARIANT OPTIONS (passed inside "options"):
- "img" (default): A standard <img> element — use for general images, screenshots, diagrams.
- "avatar": Renders as a circular avatar. Best for profile pictures.
- "card-media": Renders as a Material UI CardMedia — use when embedding an image inside a card-like layout.

SIZING:
- width: CSS value string or pixel number (default "auto")
- height: CSS value string or pixel number (default "auto")
- maxWidth: CSS value (default "100%" — prevents overflow)

ACCESSIBILITY:
- Always provide a descriptive "alt" string. Screen readers read this when the image cannot be seen.

EXAMPLES:

1) Display a screenshot from a URL:
   { "src": "https://example.com/screenshot.png", "alt": "Application screenshot showing the dashboard", "caption": "Dashboard overview" }

2) Show a profile avatar:
   { "src": "https://example.com/user/avatar.jpg", "alt": "Jane Doe", "options": { "variant": "avatar", "width": 64, "height": 64 } }

3) Constrained-width diagram:
   { "src": "https://example.com/architecture.png", "alt": "System architecture diagram", "options": { "maxWidth": "80%" } }`;

const ImageMacroDefinition: MacroComponentDefinition<typeof ImageMacro> = {
  name: "ImageMacro",
  description: "Display an image inline in the conversation from a URL, CDN path, or base64 data URI.",
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
            src: {
              type: "string",
              description: "URL, CDN path, or base64 data URI of the image. Required.",
            },
            alt: {
              type: "string",
              description: "Accessible description of the image. Always provide this.",
            },
            caption: {
              type: "string",
              description: "Optional caption text displayed below the image.",
            },
            options: {
              type: "object",
              description: "Display options: variant ('img'|'avatar'|'card-media'), width, height, maxWidth.",
            },
          },
          required: ["src"],
        },
      },
    },
  ],
};

export default ImageMacroDefinition;
