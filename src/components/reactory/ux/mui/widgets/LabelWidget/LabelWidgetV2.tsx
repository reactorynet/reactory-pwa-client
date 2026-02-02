/**
 * LabelWidget
 * 
 * A versatile label/display widget for ReactoryForm that supports:
 * - Template-based text formatting using lodash templates
 * - GraphQL data lookups
 * - Boolean value display with custom labels and icons
 * - Copy to clipboard functionality
 * - Custom icon rendering (Material icons and theme extensions)
 * - Dynamic component mounting via componentFqn
 * - HTML rendering
 * - Full backward compatibility with legacy styling props
 * - Modern sx prop support for fine-grained styling
 * 
 * @example
 * // Basic usage
 * {
 *   "ui:widget": "LabelWidget",
 *   "ui:options": {
 *     "variant": "h6",
 *     "format": "Hello, ${formData.name}!"
 *   }
 * }
 * 
 * @example
 * // With icon and copy button
 * {
 *   "ui:widget": "LabelWidget",
 *   "ui:options": {
 *     "icon": "email",
 *     "iconPosition": "left",
 *     "copyToClipboard": true,
 *     "containerSx": { "p": 2, "bgcolor": "grey.100" }
 *   }
 * }
 */
import React, { useMemo, useEffect } from 'react';
import { Box, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { template } from 'lodash';
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import { useLabelFormat, useLabelLookup } from './hooks';
import { 
  LabelIcon, 
  LabelValue, 
  CopyButton, 
  BooleanIndicator, 
  LoadingIndicator,
  mergeStyles,
} from './components';
import { DynamicWidget } from '../DynamicWidget';
import type { LabelWidgetProps, LabelWidgetOptions, ExtendedTheme } from './types';

/**
 * Default container styles
 */
const DEFAULT_CONTAINER_STYLES = {
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'center',
  position: 'relative' as const,
  minHeight: '24px',
};

/**
 * CSS class names used by the widget
 */
const CLASSES = {
  container: 'reactory-label-widget-container',
  labelText: 'reactory-label-text',
  copyIcon: 'reactory-copy-icon',
  inlineDiv: 'reactory-label-inline',
};

/**
 * Extracts options from uiSchema with defaults
 */
function getOptions(uiSchema?: LabelWidgetProps['uiSchema']): LabelWidgetOptions {
  return (uiSchema?.['ui:options'] || {}) as LabelWidgetOptions;
}

/**
 * Processes a template string icon name
 */
function processIconName(icon: string | undefined, props: Record<string, any>): string {
  if (typeof icon !== 'string') return '';
  
  if (icon.includes('${')) {
    try {
      return template(icon)(props);
    } catch {
      return icon;
    }
  }
  
  return icon;
}

/**
 * LabelWidget Component
 * 
 * A multipurpose display widget for showing formatted text, values,
 * icons, and dynamic content in ReactoryForm.
 */
export const LabelWidget: React.FC<LabelWidgetProps> = (props) => {
  const {
    formData,
    value,
    schema,
    uiSchema,
    idSchema,
    formContext,
    className,
    style,
  } = props;

  const theme = useTheme<ExtendedTheme>();
  const reactory = useReactory();
  
  const options = getOptions(uiSchema);
  const graphql = uiSchema?.['ui:graphql'];
  
  // Destructure options with defaults
  const {
    // Text formatting
    format,
    $format,
    // title - currently unused, reserved for future label title support
    emptyText = 'No data available',
    renderHtml = false,
    
    // Boolean display
    yesLabel = 'Yes',
    noLabel = 'No',
    yesIcon,
    noIcon,
    yesIconOptions,
    noIconOptions,
    
    // Icon configuration
    icon,
    iconType,
    iconPosition = 'right',
    iconProps = {},
    $iconProps,
    
    // Typography
    variant = 'body1',
    
    // Dynamic component
    componentFqn,
    componentProps,
    componentPropsMap,
    
    // Features
    copyToClipboard = false,
    forceShrinkLabel = false,
    
    // Legacy style props - titleProps reserved for future use
    bodyProps = {},
    containerProps = {},
    
    // Modern sx props
    containerSx,
    labelSx,
    valueSx,
    iconSx,
    copyButtonSx,
    loadingSx,
  } = options;

  // Check if this is a lookup-based label
  const isLookup = graphql !== null && graphql !== undefined && format === '$LOOKUP$';

  // Use format hook for text processing
  const {
    labelText: formattedText,
    // hasError - available for future error display enhancements
    isEmpty,
  } = useLabelFormat({
    formData,
    value,
    schema,
    props,
    reactory,
    options: {
      format: isLookup ? undefined : format,
      $format,
      emptyText,
      yesLabel,
      noLabel,
    },
  });

  // Use lookup hook for GraphQL data fetching
  const {
    lookupValue,
    isLoading: isLookupLoading,
    error: lookupError,
    isLookupActive,
  } = useLabelLookup({
    props,
    reactory,
    options: {
      graphql,
      enabled: isLookup,
    },
    formContext,
    idSchema,
  });

  // Determine the final label text
  const labelText = useMemo(() => {
    if (isLookupActive && lookupValue !== null) {
      return lookupValue;
    }
    return formattedText;
  }, [isLookupActive, lookupValue, formattedText]);

  // Handle label shrinking for MUI form controls (legacy behavior)
  useEffect(() => {
    if (!forceShrinkLabel) return;
    
    try {
      if (idSchema?.$id) {
        const parentEl = document.getElementById(idSchema.$id)?.closest('.MuiFormControl-root');
        if (parentEl) {
          parentEl.classList.add('reactory-label-widget');
          const inputLabel = parentEl.querySelector('.MuiInputLabel-root');
          if (inputLabel) {
            inputLabel.classList.add('MuiInputLabel-shrink');
          }
        }
      }
    } catch {
      // Ignore DOM manipulation errors
    }
  }, [idSchema?.$id, forceShrinkLabel]);

  // === If componentFqn is specified, delegate to DynamicWidget ===
  if (componentFqn) {
    return (
      <DynamicWidget
        {...props}
        uiSchema={{
          ...uiSchema,
          'ui:options': {
            componentFqn,
            componentProps,
            componentPropsMap,
            containerSx: mergeStyles(containerProps?.style || style, containerSx),
            passFormContext: true,
          },
        }}
      />
    );
  }

  // === Build the container styles ===
  const containerStyles = mergeStyles(
    { ...DEFAULT_CONTAINER_STYLES, ...(containerProps?.style || style) },
    containerSx
  );

  // === Build the icon element ===
  let iconElement: React.ReactNode = null;
  
  if (icon) {
    // Process dynamic icon props
    let finalIconProps = { ...iconProps };
    
    if ($iconProps && typeof (reactory as any)?.$func?.[$iconProps] === 'function') {
      try {
        const patchedProps = (reactory as any).$func[$iconProps]({
          label: labelText,
          widget: {},
          iconProps: finalIconProps,
          formData,
          formContext,
        });
        finalIconProps = { ...finalIconProps, ...patchedProps };
      } catch {
        // Ignore icon props errors
      }
    }

    // Process icon name (may be a template)
    const iconName = processIconName(finalIconProps.icon || icon, props);

    // Get custom icon component from theme extensions
    const CustomIconComponent = iconType && theme.extensions?.[iconType]?.icons?.[iconName]
      ? theme.extensions[iconType].icons[iconName]
      : null;

    iconElement = (
      <LabelIcon
        icon={iconName}
        CustomIconComponent={CustomIconComponent}
        iconProps={finalIconProps}
        position={iconPosition}
        sx={iconSx}
        style={iconProps?.style}
      />
    );
  }

  // === Handle boolean icons (when no explicit icon is set) ===
  const isBooleanField = typeof formData === 'boolean' || schema?.type === 'boolean';
  
  if (!icon && isBooleanField && (yesIcon || noIcon)) {
    return (
      <Box
        id={idSchema?.$id}
        className={`${CLASSES.container} ${className || ''}`}
        sx={containerStyles}
        role="text"
        aria-label={labelText}
      >
        {iconPosition === 'left' && iconElement}
        <Box sx={mergeStyles(bodyProps?.style, [{ p: 1 }, valueSx])} {...bodyProps}>
          <BooleanIndicator
            value={Boolean(formData)}
            yesLabel={yesLabel}
            noLabel={noLabel}
            yesIcon={yesIcon}
            noIcon={noIcon}
            yesIconOptions={yesIconOptions}
            noIconOptions={noIconOptions}
            variant={variant}
            iconPosition={iconPosition}
          />
        </Box>
        {iconPosition === 'right' && iconElement}
        {copyToClipboard && (
          <CopyButton
            textToCopy={labelText}
            sx={copyButtonSx}
            onCopy={(success) => {
              if (success) {
                reactory.createNotification?.('Copied To Clipboard!', {
                  body: `'${labelText}' successfully copied to your clipboard.`,
                  showInAppNotification: true,
                  type: 'success',
                });
              }
            }}
          />
        )}
      </Box>
    );
  }

  // === Handle loading state ===
  if (isLookupLoading) {
    return (
      <Box
        id={idSchema?.$id}
        className={`${CLASSES.container} ${className || ''}`}
        sx={containerStyles}
      >
        <LoadingIndicator sx={loadingSx} />
      </Box>
    );
  }

  // === Handle lookup error ===
  if (lookupError) {
    return (
      <Box
        id={idSchema?.$id}
        className={`${CLASSES.container} ${className || ''}`}
        sx={containerStyles}
      >
        <Alert severity="error" sx={{ py: 0, px: 1 }}>
          {lookupError.message}
        </Alert>
      </Box>
    );
  }

  // === Build the label body ===
  let labelBody: React.ReactNode;

  if (iconPosition === 'inline' && iconElement) {
    labelBody = (
      <LabelValue
        text={labelText}
        variant={variant}
        renderHtml={renderHtml}
        inlineIcon={iconElement}
        sx={mergeStyles(labelSx, valueSx)}
        className={CLASSES.labelText}
      />
    );
    // Clear iconElement since it's rendered inline
    iconElement = null;
  } else {
    labelBody = (
      <LabelValue
        text={labelText}
        variant={variant}
        renderHtml={renderHtml}
        sx={mergeStyles(labelSx, valueSx)}
        className={CLASSES.labelText}
      />
    );
  }

  // === Render the complete widget ===
  return (
    <Box
      id={idSchema?.$id}
      className={`${CLASSES.container} ${className || ''}`}
      sx={containerStyles}
      role="text"
      aria-label={labelText}
      data-has-value={!isEmpty}
    >
      {iconPosition === 'left' && iconElement}
      <Box 
        sx={mergeStyles(bodyProps?.style, [{ p: 1 }, valueSx])} 
        {...bodyProps}
        data-has-value={!isEmpty}
      >
        {labelBody}
      </Box>
      {iconPosition === 'right' && iconElement}
      {copyToClipboard && (
        <CopyButton
          textToCopy={labelText}
          sx={copyButtonSx}
          onCopy={(success) => {
            if (success) {
              reactory.createNotification?.('Copied To Clipboard!', {
                body: `'${labelText}' successfully copied to your clipboard.`,
                showInAppNotification: true,
                type: 'success',
              });
            }
          }}
        />
      )}
    </Box>
  );
};

// Component display name
LabelWidget.displayName = 'LabelWidget';

// Reactory component metadata
// @ts-ignore - Reactory component metadata
LabelWidget.meta = {
  nameSpace: 'core',
  name: 'LabelWidget',
  version: '2.0.0',
  component: LabelWidget,
  description: 'A versatile label/display widget with formatting, icons, and copy support',
};

export default LabelWidget;
