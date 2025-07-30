import { useReactory } from "@reactory/client-core/api";

export const ReactorChatButtonWidget = (props: any) => {
  const { idSchema, uiSchema, schema, formData } = props;
  const reactory = useReactory();

  const ReactorChatButton = reactory.getComponent('core.ReactorChatButton@1.0.0') as any;

  // Default options for the widget
  const DefaultOptions: any = {
    fab: false,
    position: 'right',
    width: 400,
    buttonText: 'Chat',
    icon: 'chat',
    variant: 'contained',
    color: 'primary',
    size: 'medium',
    className: '',
    style: {},
    chatProps: {}
  };

  // Merge uiSchema options with defaults
  const options = uiSchema && uiSchema['ui:options'] 
    ? { ...DefaultOptions, ...uiSchema['ui:options'] } 
    : DefaultOptions;

  // Get values from formData if they exist, otherwise use options
  const getValue = (key: string, defaultValue: any) => {
    if (formData && formData[key] !== undefined) {
      return formData[key];
    }
    return options[key] !== undefined ? options[key] : defaultValue;
  };

  // Build chatProps from formData and options
  const buildChatProps = () => {
    const chatProps = { ...options.chatProps };
    
    // If formData has specific chat-related properties, merge them
    if (formData) {
      // Common chat props that might be in formData
      const chatDataKeys = ['userId', 'context', 'sessionId', 'personaId', 'metadata'];
      chatDataKeys.forEach(key => {
        if (formData[key] !== undefined) {
          chatProps[key] = formData[key];
        }
      });
      
      // If formData itself should be passed as formData to ReactorChat
      if (options.passFormDataAsChatProps !== false) {
        chatProps.formData = formData;
      }
    }

    return chatProps;
  };

  // Build style object from options and formData
  const buildStyle = () => {
    const style = { ...options.style };
    
    // Merge any style properties from formData
    if (formData && formData.style) {
      Object.assign(style, formData.style);
    }

    return style;
  };

  // Determine if the widget should be visible based on conditions
  const shouldRender = () => {
    if (options.visible === false) return false;
    
    // Check conditional visibility
    if (options.showIf) {
      try {
        const condition = reactory.utils.template(options.showIf);
        return condition({ ...props, reactory, formData });
      } catch (error) {
        reactory.log('Error evaluating showIf condition', { error, condition: options.showIf });
        return true; // Default to visible if condition evaluation fails
      }
    }

    return true;
  };

  if (!shouldRender()) {
    return null;
  }

  return (
    <ReactorChatButton
      fab={getValue('fab', DefaultOptions.fab)}
      position={getValue('position', DefaultOptions.position)}
      width={getValue('width', DefaultOptions.width)}
      buttonText={getValue('buttonText', DefaultOptions.buttonText)}
      icon={getValue('icon', DefaultOptions.icon)}
      variant={getValue('variant', DefaultOptions.variant)}
      color={getValue('color', DefaultOptions.color)}
      size={getValue('size', DefaultOptions.size)}
      className={getValue('className', DefaultOptions.className)}
      style={buildStyle()}
      chatProps={buildChatProps()}
    />
  );
};

export default {
  name: 'ReactorChatButtonWidget',
  nameSpace: 'reactory',
  version: '1.0.0',
  component: ReactorChatButtonWidget,
  roles: ['USER'],
  tags: ['chat', 'ai', 'widget', 'button'],
  schema: {
    type: 'object',
    properties: {
      fab: {
        type: 'boolean',
        title: 'Floating Action Button',
        description: 'Whether to render as a Floating Action Button (FAB) or standard button',
        default: false
      },
      position: {
        type: 'string',
        title: 'Slide-out Position',
        description: 'Position of the slide-out panel',
        enum: ['left', 'right'],
        default: 'right'
      },
      width: {
        type: 'number',
        title: 'Panel Width',
        description: 'Width of the slide-out panel in pixels',
        default: 400
      },
      buttonText: {
        type: 'string',
        title: 'Button Text',
        description: 'Text to display on the button (only used when fab is false)',
        default: 'Chat'
      },
      icon: {
        type: 'string',
        title: 'Button Icon',
        description: 'Material-UI icon name for the button',
        default: 'chat'
      },
      variant: {
        type: 'string',
        title: 'Button Variant',
        description: 'Button variant style',
        enum: ['text', 'outlined', 'contained'],
        default: 'contained'
      },
      color: {
        type: 'string',
        title: 'Button Color',
        description: 'Button color theme',
        enum: ['primary', 'secondary', 'error', 'info', 'success', 'warning'],
        default: 'primary'
      },
      size: {
        type: 'string',
        title: 'Button Size',
        description: 'Button size',
        enum: ['small', 'medium', 'large'],
        default: 'medium'
      },
      className: {
        type: 'string',
        title: 'CSS Classes',
        description: 'Additional CSS classes for the button'
      },
      style: {
        type: 'object',
        title: 'Custom Styles',
        description: 'Additional CSS styles for the button'
      },
      chatProps: {
        type: 'object',
        title: 'Chat Properties',
        description: 'Properties to pass to the ReactorChat component'
      },
      visible: {
        type: 'boolean',
        title: 'Visible',
        description: 'Whether the widget should be visible',
        default: true
      },
      showIf: {
        type: 'string',
        title: 'Show Condition',
        description: 'Template condition to determine if widget should be shown'
      },
      passFormDataAsChatProps: {
        type: 'boolean',
        title: 'Pass Form Data',
        description: 'Whether to pass formData as chatProps to ReactorChat',
        default: true
      }
    }
  }
}; 