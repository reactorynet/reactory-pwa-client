import React, { useMemo } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import { Chip, Icon, Tooltip } from '@mui/material';
import { compose } from 'redux';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { template } from 'lodash';
import Reactory from '@reactory/reactory-core';

const PREFIX = 'StatusBadge';

const classes = {
  root: `${PREFIX}-root`,
  chip: `${PREFIX}-chip`,
};

const StyledChip = styled(Chip)(({ theme }) => ({
  [`&.${classes.root}`]: {
    fontWeight: 500,
    textTransform: 'uppercase',
    fontSize: '0.75rem',
  },
}));

interface StatusBadgeOptions {
  /**
   * Color mapping for status values
   * @example { 'open': '#2196f3', 'closed': '#757575' }
   */
  colorMap?: { [key: string]: string };
  
  /**
   * Icon mapping for status values
   * @example { 'open': 'folder_open', 'closed': 'check_circle' }
   */
  iconMap?: { [key: string]: string };
  
  /**
   * Chip variant
   * @default 'filled'
   */
  variant?: 'filled' | 'outlined';
  
  /**
   * Chip size
   * @default 'small'
   */
  size?: 'small' | 'medium';
  
  /**
   * Enable inline editing
   * @default false
   */
  editable?: boolean;
  
  /**
   * Available options for inline editing
   */
  options?: string[];
  
  /**
   * Label format template
   * @example '${value.toUpperCase()}'
   */
  labelFormat?: string;
  
  /**
   * Show icon
   * @default true
   */
  showIcon?: boolean;
  
  /**
   * Show tooltip
   * @default true
   */
  showTooltip?: boolean;
  
  /**
   * Tooltip format template
   * @example 'Status: ${value}'
   */
  tooltipFormat?: string;
  
  /**
   * Custom styles
   */
  style?: React.CSSProperties;
  
  /**
   * Click handler
   */
  onClick?: (value: string) => void;
  
  /**
   * Change handler (for editable mode)
   */
  onChange?: (newValue: string) => void;
}

interface StatusBadgeProps {
  value?: string;
  formData?: string;
  uiSchema?: {
    'ui:options'?: StatusBadgeOptions;
  };
  onChange?: (newValue: string) => void;
  reactory?: Reactory.Client.IReactoryApi;
  [key: string]: any;
}

/**
 * StatusBadge Widget
 * 
 * A highly configurable badge/chip component for displaying status values
 * with color coding, icons, and optional inline editing.
 * 
 * Features:
 * - Color mapping for different status values
 * - Icon support with conditional icons per status
 * - Inline editing capability
 * - Tooltip support
 * - Template-based label formatting
 * - Responsive sizing
 * 
 * @example
 * // Basic usage
 * {
 *   'ui:widget': 'StatusBadge',
 *   'ui:options': {
 *     colorMap: {
 *       'open': '#2196f3',
 *       'closed': '#757575'
 *     }
 *   }
 * }
 * 
 * @example
 * // With icons and editing
 * {
 *   'ui:widget': 'StatusBadge',
 *   'ui:options': {
 *     colorMap: { 'new': '#9c27b0', 'open': '#2196f3' },
 *     iconMap: { 'new': 'fiber_new', 'open': 'folder_open' },
 *     editable: true,
 *     options: ['new', 'open', 'closed']
 *   }
 * }
 */
const StatusBadge: React.FC<StatusBadgeProps> = (props) => {
  const theme = useTheme();
  const {
    value,
    formData,
    uiSchema,
    onChange,
    reactory,
  } = props;

  // Get the actual status value
  const statusValue = useMemo(() => {
    return value || formData || '';
  }, [value, formData]);

  // Get options from uiSchema
  const options = useMemo((): StatusBadgeOptions => {
    const defaultOptions: StatusBadgeOptions = {
      variant: 'filled',
      size: 'small',
      editable: false,
      showIcon: true,
      showTooltip: true,
      labelFormat: '${value}',
      tooltipFormat: 'Status: ${value}',
      colorMap: {},
      iconMap: {},
      style: {},
    };

    if (uiSchema?.['ui:options']) {
      return { ...defaultOptions, ...uiSchema['ui:options'] };
    }

    return defaultOptions;
  }, [uiSchema]);

  // Get color for current status
  const chipColor = useMemo(() => {
    if (options.colorMap && options.colorMap[statusValue]) {
      return options.colorMap[statusValue];
    }
    // Default colors based on common status patterns
    const defaultColors: { [key: string]: string } = {
      new: '#9c27b0',
      open: '#2196f3',
      'in-progress': '#ff9800',
      pending: '#fbc02d',
      resolved: '#4caf50',
      closed: '#757575',
      cancelled: '#f44336',
      'on-hold': '#fbc02d',
    };
    return defaultColors[`${statusValue}`?.toLowerCase() || ''] || theme.palette.primary.main;
  }, [statusValue, options.colorMap, theme]);

  // Get icon for current status
  const chipIcon = useMemo(() => {
    if (!options.showIcon) return null;
    
    if (options.iconMap && options.iconMap[statusValue]) {
      return options.iconMap[statusValue];
    }
    
    // Default icons based on common status patterns
    const defaultIcons: { [key: string]: string } = {
      new: 'fiber_new',
      open: 'folder_open',
      'in-progress': 'pending',
      pending: 'schedule',
      resolved: 'check_circle',
      closed: 'check_circle_outline',
      cancelled: 'cancel',
      'on-hold': 'pause_circle',
    };
    
    return defaultIcons[`${statusValue}`?.toLowerCase() || ''] || null;
  }, [statusValue, options.iconMap, options.showIcon]);

  // Format label
  const label = useMemo(() => {
    if (!statusValue) return '';
    
    try {
      if (options.labelFormat && options.labelFormat.includes('${')) {
        return template(options.labelFormat)({ value: statusValue, ...props });
      }
      return statusValue?.toUpperCase();
    } catch (err) {
      reactory?.log('StatusBadge: Label format error', { err, format: options.labelFormat }, 'warn');
      return statusValue;
    }
  }, [statusValue, options.labelFormat, props, reactory]);

  // Format tooltip
  const tooltipText = useMemo(() => {
    if (!options.showTooltip) return '';
    
    try {
      if (options.tooltipFormat && options.tooltipFormat.includes('${')) {
        return template(options.tooltipFormat)({ value: statusValue, ...props });
      }
      return `Status: ${statusValue}`;
    } catch (err) {
      reactory?.log('StatusBadge: Tooltip format error', { err, format: options.tooltipFormat }, 'warn');
      return `Status: ${statusValue}`;
    }
  }, [statusValue, options.tooltipFormat, options.showTooltip, props, reactory]);

  // Handle click
  const handleClick = () => {
    if (options.onClick) {
      options.onClick(statusValue);
    }
  };

  // Handle delete (for editable mode)
  const handleDelete = options.editable ? () => {
    if (onChange) {
      onChange('');
    }
  } : undefined;

  // Build chip component
  const chipElement = useMemo(() => {
    const chipProps: any = {
      label,
      variant: options.variant,
      size: options.size,
      className: classes.root,
      onClick: options.onClick ? handleClick : undefined,
      onDelete: handleDelete,
      style: {
        backgroundColor: options.variant === 'filled' ? chipColor : 'transparent',
        borderColor: chipColor,
        color: options.variant === 'filled' ? '#fff' : chipColor,
        ...options.style,
      },
    };

    // Add icon if specified
    if (chipIcon) {
      chipProps.icon = (
        <Icon 
          style={{ 
            color: options.variant === 'filled' ? '#fff' : chipColor,
            fontSize: options.size === 'small' ? '1rem' : '1.25rem',
          }}
        >
          {chipIcon}
        </Icon>
      );
    }

    return <StyledChip {...chipProps} />;
  }, [label, chipColor, chipIcon, options, handleClick, handleDelete]);

  // Wrap with tooltip if enabled
  if (options.showTooltip && tooltipText) {
    return (
      <Tooltip title={tooltipText} placement="top">
        <span>{chipElement}</span>
      </Tooltip>
    );
  }

  return chipElement;
};

StatusBadge.defaultProps = {
  value: '',
  formData: '',
};

export default compose(withReactory)(StatusBadge);
