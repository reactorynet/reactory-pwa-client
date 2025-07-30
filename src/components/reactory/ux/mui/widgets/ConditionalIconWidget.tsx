import React, { memo, useMemo, useRef } from 'react';
import { useReactory } from "@reactory/client-core/api";
import ConditionalIconComponent from "@reactory/client-core/components/shared/ConditionalIconComponent";

const default_options = {
  variant: 'icon',
  className: '',
  styles: {},
  jss: {},
  conditions: [],
  label: '',
  showLabel: false
};

interface Condition {
  key: string;
  icon: string;
  iconType?: string;
  style?: React.CSSProperties;
  tooltip?: string;
}

interface ConditionalIconWidgetProps {
  formData: string | number;
  uiSchema: {
    'ui:options'?: {
      variant?: string;
      className?: string;
      styles?: React.CSSProperties;
      jss?: any;
      conditions?: Condition[];
      label?: string;
      showLabel?: boolean;
    };
  };
  idSchema: {
    $id: string;
  };
  schema: {
    description?: string;
    title?: string;
  };
  formContext: any;
}

const ConditionalIconWidget: React.FC<ConditionalIconWidgetProps> = memo(({ 
  formData, 
  uiSchema, 
  idSchema, 
  schema, 
  formContext 
}) => {
  const reactory = useReactory();
  const renderCount = useRef(0);
  
  // Simple render counter for debugging
  renderCount.current += 1;
  if (process.env.NODE_ENV === 'development') {
    console.log(`ConditionalIconWidget render #${renderCount.current}:`, {
      formData,
      variant: uiSchema['ui:options']?.variant,
      conditionsCount: uiSchema['ui:options']?.conditions?.length || 0
    });
  }

  // Memoize the options to prevent unnecessary re-renders
  const options = useMemo(() => {
    return { ...default_options, ...uiSchema['ui:options'] };
  }, [uiSchema['ui:options']]);

  const {
    variant,
    className,
    styles = {},
    jss = {},
    conditions = [],
    label,
    showLabel = false
  } = options;

  // Memoize the React and Material components
  const { React } = useMemo(() => 
    reactory.getComponents<{ React: any }>(['react.React']), 
    [reactory]
  );

  const { Material } = useMemo(() => 
    reactory.getComponents<{ Material: Reactory.Client.Web.IMaterialModule }>(['material-ui.Material']), 
    [reactory]
  );

  const { MaterialStyles, MaterialCore } = Material;
  
  // Simplified JSS styles - only create if jss is not empty
  const jssStyles = useMemo(() => {
    if (!jss || Object.keys(jss).length === 0) {
      return {};
    }
    
    try {
      return MaterialStyles.makeStyles((theme) => jss)({
        formData, 
        idSchema: idSchema?.$id, 
        schema: schema?.title, 
        uiSchema: uiSchema?.['ui:options'], 
        formContext: formContext ? 'present' : 'absent' // Only pass a simple value
      });
    } catch (error) {
      console.warn('Error creating JSS styles:', error);
      return {};
    }
  }, [MaterialStyles, jss, formData, idSchema?.$id, schema?.title]);

  // Memoize the display label
  const displayLabel = useMemo(() => {
    if (showLabel && schema.title) {
      return schema.title;
    }
    return label;
  }, [showLabel, schema?.title, label]);

  // Memoize merged styles
  const mergedStyles = useMemo(() => {
    return {
      ...styles,
      ...jssStyles
    };
  }, [styles, jssStyles]);

  // Memoize common props for ConditionalIconComponent
  const iconProps = useMemo(() => {
    return {
      value: formData,
      conditions: conditions,
      style: mergedStyles,
      label: displayLabel
    };
  }, [formData, conditions, mergedStyles, displayLabel]);

  // Memoize the key to prevent unnecessary re-renders
  const componentKey = useMemo(() => {
    return idSchema?.$id || 'conditional-icon-widget';
  }, [idSchema?.$id]);

  // Render different variants
  const IconComponent = useMemo(() => {
    switch (variant) {
      case 'button': {
        // Render as an icon button
        return (
          <MaterialCore.IconButton
            key={componentKey}
            className={className}
            style={mergedStyles}
          >
            <ConditionalIconComponent {...iconProps} />
          </MaterialCore.IconButton>
        );
      }
      case 'tooltip': {
        // Always render with tooltip variant
        return (
          <ConditionalIconComponent 
            key={componentKey} 
            {...iconProps} 
          />
        );
      }
      case 'icon':
      default: {
        // Render as simple icon
        return (
          <ConditionalIconComponent 
            key={componentKey} 
            {...iconProps} 
          />
        );
      }
    }
  }, [variant, componentKey, className, mergedStyles, iconProps]);

  return IconComponent;
});

// Add displayName for better debugging
ConditionalIconWidget.displayName = 'ConditionalIconWidget';

export default ConditionalIconWidget; 