/**
 * LabelWidget Sub-Components
 * 
 * Reusable sub-components for the LabelWidget.
 */
import React, { useCallback } from 'react';
import { 
  Typography, 
  Icon, 
  Tooltip, 
  IconButton,
  CircularProgress,
  Box,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { 
  LabelIconProps, 
  LabelValueProps, 
  CopyButtonProps, 
  BooleanIndicatorProps,
  IconPosition,
} from './types';

/**
 * Merges legacy style props with modern sx props.
 * sx takes precedence when both are provided.
 * Returns a flat style object for maximum component compatibility.
 */
export function mergeStyles(
  ...styles: Array<React.CSSProperties | SxProps<Theme> | Array<SxProps<Theme> | undefined> | undefined>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const style of styles) {
    if (!style) continue;
    
    if (Array.isArray(style)) {
      // Handle array of styles
      style.forEach((item) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          Object.assign(result, item);
        }
      });
    } else if (typeof style === 'object') {
      // Handle single style object
      Object.assign(result, style);
    }
  }
  
  return result;
}

/**
 * Gets margin styles based on icon position
 */
function getIconMarginStyles(position: IconPosition, spacing: number = 1): Record<string, number | string> {
  switch (position) {
    case 'left':
      return { mr: spacing };
    case 'right':
      return { ml: spacing };
    case 'inline':
    default:
      return {};
  }
}

/**
 * LabelIcon Component
 * 
 * Renders an icon for the label widget, supporting both Material icons
 * and custom icons from theme extensions.
 */
export const LabelIcon: React.FC<LabelIconProps> = ({
  icon,
  CustomIconComponent,
  iconProps = {},
  position,
  sx,
  style,
}) => {
  if (!icon && !CustomIconComponent) return null;

  const marginStyles = getIconMarginStyles(position);
  // Merge all styles into a single object for compatibility
  const combinedSx = mergeStyles(style, [marginStyles, sx]);

  // Render custom icon from theme extensions
  if (CustomIconComponent) {
    return (
      <CustomIconComponent 
        {...iconProps} 
        sx={combinedSx}
      />
    );
  }

  // Render Material icon
  return (
    <Icon 
      {...iconProps}
      sx={combinedSx}
    >
      {icon}
    </Icon>
  );
};

LabelIcon.displayName = 'LabelIcon';

/**
 * LabelValue Component
 * 
 * Renders the label text with support for HTML rendering and inline icons.
 */
export const LabelValue: React.FC<LabelValueProps> = ({
  text,
  variant = 'body1',
  renderHtml = false,
  inlineIcon,
  sx,
  style,
  className,
}) => {
  const combinedSx = mergeStyles(style, sx);

  // Render HTML content
  if (renderHtml) {
    return (
      <Typography 
        variant={variant}
        sx={combinedSx}
        className={className}
        dangerouslySetInnerHTML={{ __html: text }}
        component="span"
      />
    );
  }

  // Render inline icon with text
  if (inlineIcon) {
    const inlineSx = {
      display: 'flex', 
      alignItems: 'center',
      gap: 0.5,
      ...combinedSx,
    };
    return (
      <Box 
        sx={inlineSx}
        className={className}
        component="span"
      >
        {inlineIcon}
        <Typography variant={variant} component="span">
          {text}
        </Typography>
      </Box>
    );
  }

  // Render plain text
  return (
    <Typography 
      variant={variant}
      sx={combinedSx}
      className={className}
      component="span"
    >
      {text}
    </Typography>
  );
};

LabelValue.displayName = 'LabelValue';

/**
 * CopyButton Component
 * 
 * Button to copy text to clipboard using the modern Async Clipboard API.
 */
export const CopyButton: React.FC<CopyButtonProps> = ({
  textToCopy,
  onCopy,
  sx,
  style,
  tooltip = 'Copy to clipboard',
}) => {
  const handleCopy = useCallback(async () => {
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        onCopy?.(true);
        return;
      }
      
      // Fallback for older browsers using Selection API
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      // execCommand is deprecated but needed for fallback
      // eslint-disable-next-line deprecation/deprecation
      const success = document.execCommand('copy');
      textArea.remove();
      
      onCopy?.(success);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      onCopy?.(false);
    }
  }, [textToCopy, onCopy]);

  const combinedSx = mergeStyles(style, [
    { 
      ml: 1,
      p: 0.5,
    },
    sx,
  ]);

  return (
    <Tooltip title={tooltip} placement="right">
      <IconButton
        onClick={handleCopy}
        sx={combinedSx}
        size="small"
        color="primary"
        aria-label={tooltip}
      >
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

CopyButton.displayName = 'CopyButton';

/**
 * BooleanIndicator Component
 * 
 * Displays a boolean value with customizable labels and icons.
 */
export const BooleanIndicator: React.FC<BooleanIndicatorProps> = ({
  value,
  yesLabel = 'Yes',
  noLabel = 'No',
  yesIcon,
  noIcon,
  yesIconOptions = {},
  noIconOptions = {},
  variant = 'body1',
  iconPosition = 'right',
  sx,
}) => {
  const label = value ? yesLabel : noLabel;
  const iconName = value ? yesIcon : noIcon;
  const iconOptions = value ? yesIconOptions : noIconOptions;

  const iconSx = {
    ...getIconMarginStyles(iconPosition),
    color: iconOptions.color,
    fontSize: iconOptions.fontSize,
    ...(iconOptions.sx && typeof iconOptions.sx === 'object' && !Array.isArray(iconOptions.sx) ? iconOptions.sx : {}),
  };

  const iconElement = iconName ? (
    <Icon sx={iconSx}>
      {iconName}
    </Icon>
  ) : null;

  const containerSx = {
    display: 'flex',
    alignItems: 'center',
    ...(sx && typeof sx === 'object' && !Array.isArray(sx) ? sx : {}),
  };

  return (
    <Box
      sx={containerSx}
      component="span"
      role="text"
      aria-label={label}
    >
      {iconPosition === 'left' && iconElement}
      <Typography variant={variant} component="span">
        {label}
      </Typography>
      {iconPosition === 'right' && iconElement}
    </Box>
  );
};

BooleanIndicator.displayName = 'BooleanIndicator';

/**
 * LoadingIndicator Component
 * 
 * Displays a loading state for label lookups.
 */
export const LoadingIndicator: React.FC<{
  text?: string;
  sx?: SxProps<Theme>;
}> = ({ text, sx }) => (
  <Box
    sx={[
      {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
    role="status"
    aria-live="polite"
    aria-label="Loading"
  >
    <CircularProgress size={14} />
    {text && (
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    )}
  </Box>
);

LoadingIndicator.displayName = 'LoadingIndicator';
