import React from 'react';
import { Card, CardHeader, CardContent, CardMedia, Typography, CardActions, Button, Icon, Box } from '@mui/material';
import { useReactory } from '@reactory/client-core/api';


export type CardWidgetUiSchema = {
  'ui:widget': 'CardWidget';
  'ui:options'?: {
    mapping?: Record<string, string>;
    displayValue?: boolean; // If true, displays the value in the card
    cardActions?: {
      icon: string; // Icon name from Material Icons
      label: string; // Label for the action
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => void | Reactory.FQN;  // Click handler
      disabled?: boolean; // Optional, if true, disables the action button
      style?: React.CSSProperties; // Optional, custom styles for the action button
    }[]
  },
}

/**
 * CardWidget - A simple property visualizer for dynamic forms.
 * Renders a Material UI Card with title, optional image, and value.
 */
const CardWidget = (props: any) => {
  const { formData, schema, idSchema, uiSchema } = props;
  const reactory = useReactory();
  
  const uiOptions = uiSchema['ui:options'] || {
    mapping: {},
    displayValue: true,
    actions: [],
    headerOptions: {
      title: schema?.title || idSchema?.$id || 'No Title',
      description: schema?.description || 'No Description',
      sx: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }
    },
    imageOptions: {
      height: 180, // Default height for the image
      width: 180, // Default width for the image
      altText: schema?.title || idSchema?.$id || 'No Title', // Default alt text for the image
      defaultImage: `${process.env.CDN_ROOT}profiles/default/default.png`, // Default image if none provided
    }
  };
  const cardActions = uiOptions.actions || [];
  const imageOptions = uiOptions.imageOptions || {
    height: 180, // Default height for the image
    width: 180, // Default width for the image
    altText: schema?.title || idSchema?.$id || 'No Title', // Default alt text for the image
    defaultImage: `${process.env.CDN_ROOT}profiles/default/default.png`, // Default image if none provided
  };
  const mapping = uiOptions.mapping;

  let cardData = {
    title: uiOptions?.title || schema?.title || idSchema?.$id || 'No Title',
    description: uiOptions?.description || schema?.description || 'No Description',
    image: formData?.image || formData?.logo || formData?.avatar || null,
    value: typeof formData === 'object' ? formData?.value || formData?.title || JSON.stringify(formData) : formData,    
  }

  if (mapping && Object.keys(mapping).length > 0) {
    let mappedData = reactory.utils.objectMapper(props, mapping);
    cardData = {
      ...cardData,
      ...mappedData,
    }
  }

  if (cardData?.title?.indexOf('${') > -1) {
    cardData.title = reactory.utils.template(cardData.title)(props);
  }

  if (cardData?.description?.indexOf('${') > -1) {
    cardData.description = reactory.utils.template(cardData.description)(props);
  }

  if (cardData?.value?.indexOf('${') > -1) {
    cardData.value = reactory.utils.template(cardData.value)(props);
  }

  // Process template strings for actions and filter by visibility
  const processedActions = (cardActions || []).map(action => {
    const processedAction = { ...action };
    
    // Process label template string
    if (typeof action.label === 'string' && action.label.indexOf('${') > -1) {
      try {
        processedAction.label = reactory.utils.template(action.label)(props);
      } catch (error) {
        console.warn('Failed to process action label template:', action.label, error);
        processedAction.label = action.label; // Fallback to original
      }
    }
    
    // Process subtitle template string if present
    if (typeof action.subtitle === 'string' && action.subtitle.indexOf('${') > -1) {
      try {
        processedAction.subtitle = reactory.utils.template(action.subtitle)(props);
      } catch (error) {
        console.warn('Failed to process action subtitle template:', action.subtitle, error);
        processedAction.subtitle = action.subtitle; // Fallback to original
      }
    }
    
    return processedAction;
  });

  // Filter actions by visibility
  const visibleActions = processedActions.filter(action => {
    if (typeof action.visible === 'string') {
      try {
        // Evaluate the expression in the context of props
        return reactory.utils.template(action.visible)(props);
      } catch (error) {
        console.warn('Failed to evaluate action visibility:', action.visible, error);
        return true; // If evaluation fails, default to visible
      }
    }
    // If visible is undefined or not a string, default to true
    return action.visible === undefined ? true : !!action.visible;
  });

  // Handler for action click
  const handleActionClick = (action) => (event) => {
    if (action.clickHandler && typeof action.clickHandler === 'object' && action.clickHandler.type === 'link') {
      // If type is link, navigate to the formatted URL
      const url = reactory.utils.template(action.clickHandler.options.format)(props);
      if (action.clickHandler.options.openInNewWindow) {
        window.open(url, '_blank');
      } else {
        window.location.assign(url);
      }
    } else if (typeof action.onClick === 'string') {
      // Handle string-based onClick events
      if (action.onClick.startsWith('event:')) {
        // Dispatch reactory event
        const eventName = action.onClick.replace('event:', '');
        reactory.emit(eventName, { 
          formData, 
          schema, 
          idSchema, 
          uiSchema, 
          action,
          event 
        });
      } else if (action.onClick.startsWith('mutation:')) {
        // Handle GraphQL mutation by emitting a mutation event
        const mutationName = action.onClick.replace('mutation:', '');
        reactory.emit('mutation', { 
          mutationName,
          variables: formData,
          formData, 
          schema, 
          idSchema, 
          uiSchema, 
          action,
          event 
        });
      } else {
        // Generic event emission for other string patterns
        reactory.emit(action.onClick, { 
          formData, 
          schema, 
          idSchema, 
          uiSchema, 
          action,
          event 
        });
      }
    } else if (typeof action.onClick === 'function') {
      action.onClick(event);
    }
  };

  return (
    <Card 
      id={`card_widget_${idSchema?.$id || ''}`.replace(/\./g, '_')}
      sx={uiOptions.sx}
      >
      <CardHeader 
        title={cardData?.title} 
        subheader={cardData?.description} 
        sx={uiOptions?.headerOptions?.sx}
        />
      {cardData?.image && (
        <Box sx={{
          display: imageOptions.display || 'flex',
          alignItems: 'center',
          flexDirection: 'column',
          justifyContent: 'center',}}>
          <CardMedia
          component="img"
          height={imageOptions.height}
          width={imageOptions.width}
          image={cardData?.image || imageOptions.defaultImage}
          style={imageOptions.style || {}}
          sx={imageOptions.sx || {}}
          alt={cardData?.title || imageOptions.altText} // Use altText from imageOptions if title is not available
        />
        </Box>
      )}
      {uiOptions.displayValue && <CardContent>
        <Typography variant="body1">
          {cardData?.value}
        </Typography>
      </CardContent>}
      {visibleActions.length > 0 && (
        <CardActions>
          {visibleActions.map((action, idx) => (
            <Button
              key={idx}
              startIcon={action.icon ? <Icon>{action.icon}</Icon> : null}
              onClick={handleActionClick(action)}
              disabled={action.disabled}
              sx={action.sx || {}}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Typography variant="button" component="span">
                  {action.label}
                </Typography>
                {action.subtitle && (
                  <Typography variant="caption" component="span" sx={{ textTransform: 'none', opacity: 0.7 }}>
                    {action.subtitle}
                  </Typography>
                )}
              </Box>
            </Button>
          ))}
        </CardActions>
      )}
    </Card>
  );
};

export default CardWidget;
