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

const ImageMacroDefinition: MacroComponentDefinition<typeof ImageMacro> = {
  name: "ImageMacro",
  description: "A macro that renders images using the ImageWidget component.",
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
        description: "Display an image in the chat from a given URL or data URI.",
        parameters: {
          type: "object",
          properties: {
            src: {
              type: "string",
              description: "The URL or data URI of the image to display"
            },
            alt: {
              type: "string",
              description: "Alternative text for the image (for accessibility)"
            },
            caption: {
              type: "string",
              description: "Caption text to display below the image"
            },
            options: {
              type: "object",
              description: "Additional configuration options for the image display"
            }
          },
          required: ["src"]
        }
      }
    }
  ],
};

export default ImageMacroDefinition;
