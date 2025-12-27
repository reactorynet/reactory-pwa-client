import React, { useMemo } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import { Badge, Icon, Typography, Box, Tooltip } from '@mui/material';
import { compose } from 'redux';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import Reactory from '@reactory/reactory-core';

const PREFIX = 'CountBadge';

const classes = {
  root: `${PREFIX}-root`,
  badge: `${PREFIX}-badge`,
  icon: `${PREFIX}-icon`,
};

const StyledBox = styled(Box)(({ theme }) => ({
  [`&.${classes.root}`]: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  [`& .${classes.icon}`]: {
    display: 'flex',
    alignItems: 'center',
  },
}));

interface CountBadgeOptions {
  /**
   * Icon to display
   * @example 'comment', 'attach_file', 'notifications'
   */
  icon: string;
  
  /**
   * Show badge when count is 0
   * @default false
   */
  showZero?: boolean;
  
  /**
   * Maximum count to display (shows max+ when exceeded)
   * @example 99 shows "99+" for values over 99
   * @default undefined (no maximum)
   */
  max?: number;
  
  /**
   * Badge color
   * @default 'default'
   */
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  
  /**
   * Icon color
   */
  iconColor?: string;
  
  /**
   * Icon size
   * @default 20
   */
  iconSize?: number;
  
  /**
   * Show count as text next to icon (instead of badge)
   * @default false
   */
  showAsText?: boolean;
  
  /**
   * Text variant when showAsText is true
   * @default 'body2'
   */
  textVariant?: 'body1' | 'body2' | 'caption' | 'subtitle1' | 'subtitle2';
  
  /**
   * Show tooltip
   * @default true
   */
  showTooltip?: boolean;
  
  /**
   * Tooltip text template
   * @example '${count} comments'
   */
  tooltipTemplate?: string;
  
  /**
   * Singular label for tooltip (when count === 1)
   * @example 'comment'
   */
  singularLabel?: string;
  
  /**
   * Plural label for tooltip (when count !== 1)
   * @example 'comments'
   */
  pluralLabel?: string;
  
  /**
   * Custom styles
   */
  style?: React.CSSProperties;
  
  /**
   * Click handler
   */
  onClick?: (count: number) => void;
}

interface CountBadgeProps {
  count?: number;
  formData?: number | any[] | null;
  value?: number;
  uiSchema?: {
    'ui:options'?: CountBadgeOptions;
  };
  reactory?: Reactory.Client.IReactoryApi;
  [key: string]: any;
}

/**
 * CountBadge Widget
 * 
 * A flexible component for displaying count indicators with icons,
 * commonly used for comments, attachments, notifications, etc.
 * 
 * Features:
 * - Icon with badge overlay
 * - Optional text display mode
 * - Maximum count display (99+)
 * - Show/hide zero counts
 * - Color customization
 * - Tooltip with automatic singular/plural
 * - Click handling
 * 
 * @example
 * // Basic comment count
 * {
 *   'ui:widget': 'CountBadge',
 *   'ui:options': {
 *     icon: 'comment',
 *     showZero: true,
 *     singularLabel: 'comment',
 *     pluralLabel: 'comments'
 *   }
 * }
 * 
 * @example
 * // Attachment count with max
 * {
 *   'ui:widget': 'CountBadge',
 *   'ui:options': {
 *     icon: 'attach_file',
 *     max: 99,
 *     color: 'primary',
 *     showZero: false
 *   }
 * }
 */
const CountBadge: React.FC<CountBadgeProps> = (props) => {
  const theme = useTheme();
  const {
    count: countProp,
    formData,
    value,
    uiSchema,
    reactory,
  } = props;

  // Get options from uiSchema
  const options = useMemo((): CountBadgeOptions => {
    const defaultOptions: CountBadgeOptions = {
      icon: 'notifications',
      showZero: false,
      color: 'default',
      iconSize: 20,
      showAsText: false,
      textVariant: 'body2',
      showTooltip: true,
      style: {},
    };

    if (uiSchema?.['ui:options']) {
      return { ...defaultOptions, ...uiSchema['ui:options'] };
    }

    return defaultOptions;
  }, [uiSchema]);

  // Get count value
  const count = useMemo((): number => {
    // If formData is an array, use its length
    if (Array.isArray(formData)) {
      return formData.length;
    }
    
    // Otherwise use count prop, value, or formData as number
    if (typeof countProp === 'number') return countProp;
    if (typeof value === 'number') return value;
    if (typeof formData === 'number') return formData;
    
    return 0;
  }, [countProp, value, formData]);

  // Format display count
  const displayCount = useMemo(() => {
    if (options.max && count > options.max) {
      return `${options.max}+`;
    }
    return count.toString();
  }, [count, options.max]);

  // Should show the badge/count
  const shouldShow = useMemo(() => {
    return options.showZero || count > 0;
  }, [options.showZero, count]);

  // Format tooltip
  const tooltipText = useMemo(() => {
    if (!options.showTooltip) return '';

    // Use custom template if provided
    if (options.tooltipTemplate) {
      try {
        const template = require('lodash').template;
        return template(options.tooltipTemplate)({ count, ...props });
      } catch (err) {
        reactory?.log('CountBadge: Tooltip template error', { err }, 'warn');
      }
    }

    // Use singular/plural labels
    if (options.singularLabel && options.pluralLabel) {
      const label = count === 1 ? options.singularLabel : options.pluralLabel;
      return `${count} ${label}`;
    }

    // Default tooltip
    return `${count} items`;
  }, [count, options.showTooltip, options.tooltipTemplate, options.singularLabel, options.pluralLabel, props, reactory]);

  // Handle click
  const handleClick = () => {
    if (options.onClick) {
      options.onClick(count);
    }
  };

  // Don't render if count is 0 and showZero is false
  if (!shouldShow) {
    return null;
  }

  // Icon element
  const iconElement = (
    <Icon
      className={classes.icon}
      style={{
        fontSize: options.iconSize,
        color: options.iconColor || theme.palette.text.secondary,
      }}
    >
      {options.icon}
    </Icon>
  );

  // Render as text mode
  if (options.showAsText) {
    const content = (
      <StyledBox
        className={classes.root}
        onClick={options.onClick ? handleClick : undefined}
        style={{
          ...options.style,
          cursor: options.onClick ? 'pointer' : 'default',
        }}
      >
        {iconElement}
        <Typography variant={options.textVariant}>
          {displayCount}
        </Typography>
      </StyledBox>
    );

    if (options.showTooltip && tooltipText) {
      return (
        <Tooltip title={tooltipText} placement="top">
          {content}
        </Tooltip>
      );
    }

    return content;
  }

  // Render as badge mode
  const badgeElement = (
    <Box
      onClick={options.onClick ? handleClick : undefined}
      style={{
        ...options.style,
        cursor: options.onClick ? 'pointer' : 'default',
        display: 'inline-flex',
      }}
    >
      <Badge
        badgeContent={displayCount}
        color={options.color}
        max={options.max}
        showZero={options.showZero}
      >
        {iconElement}
      </Badge>
    </Box>
  );

  if (options.showTooltip && tooltipText) {
    return (
      <Tooltip title={tooltipText} placement="top">
        {badgeElement}
      </Tooltip>
    );
  }

  return badgeElement;
};

CountBadge.defaultProps = {
  count: 0,
  formData: 0,
  value: 0,
};

export default compose(withReactory)(CountBadge);
