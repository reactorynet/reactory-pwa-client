import React, { useState, useEffect, useMemo } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import { Typography, Tooltip } from '@mui/material';
import { compose } from 'redux';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { template } from 'lodash';
import moment from 'moment';
import Reactory from '@reactory/reactory-core';

const PREFIX = 'RelativeTime';

const StyledTypography = styled(Typography)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  cursor: 'default',
}));

interface RelativeTimeOptions {
  /**
   * Display format
   * - relative: "2 hours ago"
   * - absolute: "2024-12-23 14:30"
   * - custom: Use customFormat string
   * @default 'relative'
   */
  format?: 'relative' | 'absolute' | 'custom';
  
  /**
   * Custom format string (moment.js format)
   * @example 'YYYY-MM-DD HH:mm:ss'
   */
  customFormat?: string;
  
  /**
   * Show tooltip with detailed time
   * @default true
   */
  tooltip?: boolean;
  
  /**
   * Tooltip format string (moment.js format)
   * @default 'YYYY-MM-DD HH:mm:ss'
   */
  tooltipFormat?: string;
  
  /**
   * Tooltip template (overrides tooltipFormat)
   * @example 'Created: ${absoluteTime}'
   */
  tooltipTemplate?: string;
  
  /**
   * Auto-refresh the relative time
   * @default false
   */
  autoRefresh?: boolean;
  
  /**
   * Refresh interval in milliseconds
   * @default 60000 (1 minute)
   */
  refreshInterval?: number;
  
  /**
   * Typography variant
   * @default 'body2'
   */
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2' | 'caption' | 'subtitle1' | 'subtitle2';
  
  /**
   * Text to show when date is null/invalid
   * @default 'N/A'
   */
  emptyText?: string;
  
  /**
   * Custom styles
   */
  style?: React.CSSProperties;
  
  /**
   * Show icon before time
   */
  icon?: string;
  
  /**
   * Click handler
   */
  onClick?: (date: Date | null) => void;
}

interface RelativeTimeProps {
  date?: string | Date | null;
  formData?: string | Date | null;
  value?: string | Date | null;
  uiSchema?: {
    'ui:options'?: RelativeTimeOptions;
  };
  reactory?: Reactory.Client.IReactoryApi;
  [key: string]: any;
}

/**
 * RelativeTime Widget
 * 
 * A flexible component for displaying dates and times in various formats,
 * with support for relative time display ("2 hours ago") and auto-refresh.
 * 
 * Features:
 * - Relative time display (e.g., "2 hours ago")
 * - Absolute time display (formatted date/time)
 * - Custom formatting with moment.js
 * - Tooltip with detailed time
 * - Auto-refresh for live updates
 * - Template-based formatting
 * - Icon support
 * 
 * @example
 * // Basic relative time
 * {
 *   'ui:widget': 'RelativeTime',
 *   'ui:options': {
 *     format: 'relative',
 *     tooltip: true
 *   }
 * }
 * 
 * @example
 * // Custom format with auto-refresh
 * {
 *   'ui:widget': 'RelativeTime',
 *   'ui:options': {
 *     format: 'custom',
 *     customFormat: 'MMM D, YYYY [at] h:mm A',
 *     autoRefresh: true,
 *     refreshInterval: 30000
 *   }
 * }
 */
const RelativeTime: React.FC<RelativeTimeProps> = (props) => {
  const theme = useTheme();
  const {
    date: dateProp,
    formData,
    value,
    uiSchema,
    reactory,
  } = props;

  // Get options from uiSchema
  const options = useMemo((): RelativeTimeOptions => {
    const defaultOptions: RelativeTimeOptions = {
      format: 'relative',
      customFormat: 'YYYY-MM-DD HH:mm:ss',
      tooltip: true,
      tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
      autoRefresh: false,
      refreshInterval: 60000,
      variant: 'body2',
      emptyText: 'N/A',
      style: {},
    };

    if (uiSchema?.['ui:options']) {
      return { ...defaultOptions, ...uiSchema['ui:options'] };
    }

    return defaultOptions;
  }, [uiSchema]);

  // Get date value
  const dateValue = useMemo((): Date | null => {
    const rawDate = dateProp || value || formData;
    if (!rawDate) return null;

    const momentDate = moment(rawDate);
    return momentDate.isValid() ? momentDate.toDate() : null;
  }, [dateProp, value, formData]);

  // State for auto-refresh
  const [refreshKey, setRefreshKey] = useState(0);

  // Setup auto-refresh
  useEffect(() => {
    if (!options.autoRefresh || !dateValue) return;

    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, options.refreshInterval);

    return () => clearInterval(interval);
  }, [options.autoRefresh, options.refreshInterval, dateValue]);

  // Format the display time
  const displayTime = useMemo(() => {
    if (!dateValue) return options.emptyText;

    const m = moment(dateValue);

    switch (options.format) {
      case 'relative':
        return m.fromNow();

      case 'absolute':
        return m.format(options.customFormat);

      case 'custom':
        return m.format(options.customFormat);

      default:
        return m.fromNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateValue, options.format, options.customFormat, options.emptyText, refreshKey]);

  // Format tooltip
  const tooltipText = useMemo(() => {
    if (!options.tooltip || !dateValue) return '';

    const m = moment(dateValue);
    const absoluteTime = m.format(options.tooltipFormat);

    try {
      if (options.tooltipTemplate && options.tooltipTemplate.includes('${')) {
        return template(options.tooltipTemplate)({
          date: dateValue,
          absoluteTime,
          relativeTime: m.fromNow(),
          ...props,
        });
      }

      return absoluteTime;
    } catch (err) {
      reactory?.log('RelativeTime: Tooltip format error', { err, template: options.tooltipTemplate }, 'warn');
      return absoluteTime;
    }
  }, [dateValue, options.tooltip, options.tooltipFormat, options.tooltipTemplate, props, reactory]);

  // Handle click
  const handleClick = () => {
    if (options.onClick) {
      options.onClick(dateValue);
    }
  };

  // Build time display
  const timeElement = (
    <StyledTypography
      variant={options.variant}
      onClick={options.onClick ? handleClick : undefined}
      style={{
        ...options.style,
        cursor: options.onClick ? 'pointer' : 'default',
      }}
    >
      {options.icon && (
        <span 
          className="material-icons" 
          style={{ 
            fontSize: 'inherit', 
            marginRight: theme.spacing(0.5),
          }}
        >
          {options.icon}
        </span>
      )}
      {displayTime}
    </StyledTypography>
  );

  // Wrap with tooltip if enabled
  if (options.tooltip && tooltipText && dateValue) {
    return (
      <Tooltip title={tooltipText} placement="top">
        {timeElement}
      </Tooltip>
    );
  }

  return timeElement;
};

RelativeTime.defaultProps = {
  date: null,
  formData: null,
  value: null,
};

export default compose(withReactory)(RelativeTime);
