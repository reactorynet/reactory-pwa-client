/**
 * DynamicWidget - A utility widget for dynamically mounting Reactory components
 * 
 * This widget allows forms to render any registered Reactory component by its FQN,
 * with support for prop mapping from form data.
 * 
 * @example
 * // In uiSchema:
 * {
 *   "ui:widget": "DynamicWidget",
 *   "ui:options": {
 *     "componentFqn": "core.MyCustomDisplay@1.0.0",
 *     "componentProps": { "variant": "outlined" },
 *     "componentPropsMap": {
 *       "formData": "value",
 *       "formContext.user.firstName": "userName"
 *     }
 *   }
 * }
 */
import React, { useMemo } from 'react';
import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import { useDynamicComponent } from './useDynamicComponent';
import type { DynamicWidgetProps, DynamicWidgetOptions } from './types';

/**
 * Default options for the DynamicWidget
 */
const DEFAULT_OPTIONS: Partial<DynamicWidgetOptions> = {
  showLoading: true,
  showError: true,
  loadTimeout: 10000,
  loadingText: 'Loading component...',
  errorTemplate: 'Failed to load component: ${error}',
  passFormContext: false,
  passWidgetProps: false,
};

/**
 * Merges legacy style props with modern sx props
 */
function mergeStyles(
  legacyStyle?: React.CSSProperties,
  sx?: SxProps<Theme>
): SxProps<Theme> {
  if (!legacyStyle && !sx) return {};
  if (!legacyStyle) return sx || {};
  if (!sx) return legacyStyle as SxProps<Theme>;
  
  // sx takes precedence over legacy styles
  return [legacyStyle, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>;
}

/**
 * Loading indicator component
 */
const LoadingIndicator: React.FC<{
  text?: string;
  sx?: SxProps<Theme>;
}> = ({ text = 'Loading...', sx }) => (
  <Box
    sx={[
      {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
    role="status"
    aria-live="polite"
  >
    <CircularProgress size={16} />
    <Typography variant="body2" color="text.secondary">
      {text}
    </Typography>
  </Box>
);

/**
 * Error display component
 */
const ErrorDisplay: React.FC<{
  error: string;
  template?: string;
  onRetry?: () => void;
  sx?: SxProps<Theme>;
}> = ({ error, template, onRetry, sx }) => {
  const message = template 
    ? template.replace('${error}', error)
    : error;
    
  return (
    <Alert 
      severity="error" 
      sx={sx}
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        )
      }
    >
      {message}
    </Alert>
  );
};

/**
 * DynamicWidget Component
 * 
 * Dynamically mounts a Reactory component specified by componentFqn in ui:options.
 * Supports prop mapping, loading states, and error handling.
 */
export const DynamicWidget: React.FC<DynamicWidgetProps> = (props) => {
  const {
    formData,
    onChange,
    schema,
    uiSchema,
    idSchema,
    formContext,
    readonly,
    disabled,
    errorSchema,
    className,
    style,
  } = props;

  const reactory = useReactory();
  
  // Extract options with defaults
  const rawOptions = uiSchema?.['ui:options'] || {};
  const options: DynamicWidgetOptions = {
    ...DEFAULT_OPTIONS,
    ...rawOptions,
  } as DynamicWidgetOptions;

  const {
    componentFqn,
    componentProps = {},
    componentPropsMap,
    fallbackFqn,
    showLoading,
    loadingText,
    showError,
    errorTemplate,
    loadTimeout,
    containerSx,
    loadingSx,
    errorSx,
    containerStyle,
    passFormContext,
    passWidgetProps,
  } = options;

  // Load the component
  const { component: LoadedComponent, isLoading, error, retry } = useDynamicComponent(
    reactory,
    componentFqn,
    { timeout: loadTimeout }
  );

  // Load fallback component if primary fails
  const { component: FallbackComponent } = useDynamicComponent(
    reactory,
    error && fallbackFqn ? fallbackFqn : null,
    { timeout: loadTimeout }
  );

  // Map props using objectMapper if configured
  const mappedProps = useMemo(() => {
    if (!componentPropsMap || !reactory?.utils?.objectMapper) {
      return {};
    }
    
    try {
      const sourceData = {
        formData,
        formContext,
        schema,
        uiSchema,
        idSchema,
        props,
      };
      return reactory.utils.objectMapper(sourceData, componentPropsMap) || {};
    } catch (err) {
      reactory?.log?.('DynamicWidget: Error mapping props', { err, componentPropsMap });
      return {};
    }
  }, [formData, formContext, schema, uiSchema, idSchema, props, componentPropsMap, reactory]);

  // Build final props for the component
  const finalComponentProps = useMemo(() => {
    const baseProps: Record<string, any> = {
      ...componentProps,
      ...mappedProps,
    };

    // Optionally pass form context
    if (passFormContext && formContext) {
      baseProps.formContext = formContext;
    }

    // Optionally pass all widget props
    if (passWidgetProps) {
      baseProps.widgetProps = {
        formData,
        onChange,
        schema,
        uiSchema,
        idSchema,
        readonly,
        disabled,
        errorSchema,
      };
    }

    // Always pass these standard handlers if not already mapped
    if (onChange && !baseProps.onChange) {
      baseProps.onChange = onChange;
    }
    if (formData !== undefined && !('value' in baseProps) && !('formData' in baseProps)) {
      baseProps.value = formData;
    }

    return baseProps;
  }, [
    componentProps,
    mappedProps,
    passFormContext,
    formContext,
    passWidgetProps,
    formData,
    onChange,
    schema,
    uiSchema,
    idSchema,
    readonly,
    disabled,
    errorSchema,
  ]);

  // Merge container styles
  const containerStyles = mergeStyles(containerStyle || style, containerSx);

  // Render loading state
  if (isLoading && showLoading) {
    return (
      <Box
        id={idSchema?.$id}
        className={className}
        sx={containerStyles}
      >
        <LoadingIndicator text={loadingText} sx={loadingSx} />
      </Box>
    );
  }

  // Render error state
  if (error && !FallbackComponent) {
    if (!showError) {
      return null;
    }
    
    return (
      <Box
        id={idSchema?.$id}
        className={className}
        sx={containerStyles}
      >
        <ErrorDisplay 
          error={error} 
          template={errorTemplate}
          onRetry={retry}
          sx={errorSx}
        />
      </Box>
    );
  }

  // Determine which component to render
  const ComponentToRender = LoadedComponent || FallbackComponent;

  if (!ComponentToRender) {
    // No component FQN specified - render nothing or a placeholder
    if (!componentFqn) {
      return (
        <Box
          id={idSchema?.$id}
          className={className}
          sx={containerStyles}
        >
          <Typography variant="body2" color="text.secondary">
            No component specified
          </Typography>
        </Box>
      );
    }
    return null;
  }

  // Render the loaded component
  return (
    <Box
      id={idSchema?.$id}
      className={className}
      sx={containerStyles}
    >
      <ComponentToRender {...finalComponentProps} />
    </Box>
  );
};

// Component metadata for Reactory registration
DynamicWidget.displayName = 'DynamicWidget';

// @ts-ignore - Reactory component metadata
DynamicWidget.meta = {
  nameSpace: 'core',
  name: 'DynamicWidget',
  version: '1.0.0',
  component: DynamicWidget,
  description: 'A utility widget for dynamically mounting Reactory components by FQN',
};

export default DynamicWidget;
