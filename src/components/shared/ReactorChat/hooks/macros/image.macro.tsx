import { Macro, MacroComponentDefinition, UXChatMessage } from "../../types";

/**
 * Image Macro for ReactorChat
 * Renders images using the ImageWidget
 */
//@ts-ignore
const ImageMacro: Macro<UXChatMessage> = async (args, chatState, reactory) => {
  // Default image configuration
  const defaultConfig = {
    alt: "Image",
    src: "", // Empty by default, will need to be provided
    caption: "",
    options: {
      width: "auto",
      height: "auto",
      maxWidth: "100%",
      variant: "img"
    }
  };

  // Merge provided args with defaults
  const imageConfig = (args && typeof args === 'object' && !Array.isArray(args))
    ? { ...defaultConfig, ...(args as any) }
    : defaultConfig;

  // Validate that we have an image source
  if (!imageConfig.src) {
    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content: "An image source URL is required to display an image.",
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: []
    };
  }

  return {
    __typename: "ReactorChatMessage",
    role: "assistant",
    content: imageConfig.caption || 'Displaying image...',
    component: 'widgets.ImageWidget',
    props: {
      src: imageConfig.src,
      alt: imageConfig.alt,
      caption: imageConfig.caption,
      ...imageConfig.options,
    },
    id: reactory.utils.uuid(),
    rating: 0,
    timestamp: new Date(),
    tool_calls: []
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
