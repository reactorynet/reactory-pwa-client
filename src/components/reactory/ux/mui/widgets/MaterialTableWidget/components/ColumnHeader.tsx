/**
 * ColumnHeader Component
 * 
 * A configurable column header renderer for MaterialTableWidget that supports:
 * - Custom header component via FQN
 * - i18n translation via reactory.i18n.t
 * - Icons (left/right positioned)
 * - Color customization
 * - Sort indicators and actions
 * - Filter indicators and actions
 * - Tooltips
 * - Custom styling
 */

import React from 'react';
import {
  Box,
  Typography,
  Icon,
  IconButton,
  Tooltip,
  SxProps,
  Theme,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';

/**
 * Configuration options for column header rendering
 */
export interface ColumnHeaderConfig {
  /**
   * Custom header renderer component FQN (e.g., 'custom.MyColumnHeader@1.0.0')
   * When provided, this component will be used instead of the default renderer
   */
  headerComponent?: string;

  /**
   * Props to pass to the custom header component
   */
  headerComponentProps?: Record<string, unknown>;

  /**
   * Props map for dynamic prop resolution (uses reactory.utils.objectMapper)
   */
  headerComponentPropsMap?: Record<string, unknown>;

  /**
   * i18n key for the column title. If provided, will be translated using reactory.i18n.t
   * Falls back to the 'title' property if translation is not found
   */
  titleKey?: string;

  /**
   * Icon to display in the header
   */
  icon?: string;

  /**
   * Position of the icon relative to the title
   */
  iconPosition?: 'left' | 'right';

  /**
   * Icon color (can be a theme color key or CSS color)
   */
  iconColor?: string;

  /**
   * Header text color
   */
  color?: string;

  /**
   * Header background color
   */
  backgroundColor?: string;

  /**
   * Enable sorting for this column
   */
  sortable?: boolean;

  /**
   * Enable filtering for this column
   */
  filterable?: boolean;

  /**
   * Custom filter component FQN for the column filter popup
   */
  filterComponent?: string;

  /**
   * Tooltip text or i18n key for header tooltip
   */
  tooltip?: string;

  /**
   * Whether tooltip uses i18n key
   */
  tooltipKey?: string;

  /**
   * Header text alignment
   */
  align?: 'left' | 'center' | 'right';

  /**
   * Custom header cell styles (SxProps)
   */
  headerSx?: SxProps<Theme>;

  /**
   * CSS class name for the header cell
   */
  headerClassName?: string;

  /**
   * Minimum width for the column header
   */
  minWidth?: number | string;

  /**
   * Maximum width for the column header
   */
  maxWidth?: number | string;

  /**
   * Whether to allow text wrapping in header
   */
  noWrap?: boolean;

  /**
   * Typography variant for the title
   */
  variant?: 'h6' | 'subtitle1' | 'subtitle2' | 'body1' | 'body2' | 'caption';
}

/**
 * Props for the ColumnHeader component
 */
export interface ColumnHeaderProps {
  /**
   * Column field name
   */
  field: string;

  /**
   * Column title (default text if no i18n key)
   */
  title: string;

  /**
   * Column index
   */
  columnIndex: number;

  /**
   * Header configuration options
   */
  header?: ColumnHeaderConfig;

  /**
   * Current sort direction for this column
   */
  sortDirection?: 'asc' | 'desc' | null;

  /**
   * Whether this column is currently filtered
   */
  isFiltered?: boolean;

  /**
   * Reactory API instance
   */
  reactory: any;

  /**
   * Theme object
   */
  theme: Theme;

  /**
   * Callback when sort is requested
   */
  onSort?: (field: string, direction: 'asc' | 'desc') => void;

  /**
   * Callback when filter is requested
   */
  onFilter?: (field: string) => void;

  /**
   * All row data (for custom renderers that need data context)
   */
  data?: any[];

  /**
   * Row state for all rows
   */
  rowsState?: Record<number, any>;

  /**
   * Form context from the parent form
   */
  formContext?: any;

  /**
   * Table reference
   */
  tableRef?: React.RefObject<any>;
}

/**
 * Styled container for header content
 */
const HeaderContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  width: '100%',
}));

/**
 * Styled container for action buttons
 */
const HeaderActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginLeft: 'auto',
  opacity: 0.7,
  transition: 'opacity 0.2s',
  '&:hover': {
    opacity: 1,
  },
}));

/**
 * Default column header renderer with full feature support
 */
export const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  field,
  title,
  columnIndex,
  header = {},
  sortDirection,
  isFiltered,
  reactory,
  theme,
  onSort,
  onFilter,
  data,
  rowsState,
  formContext,
  tableRef,
}) => {
  const {
    headerComponent,
    headerComponentProps,
    headerComponentPropsMap,
    titleKey,
    icon,
    iconPosition = 'left',
    iconColor,
    color,
    backgroundColor,
    sortable = false,
    filterable = false,
    tooltip,
    tooltipKey,
    align = 'left',
    headerSx,
    headerClassName,
    minWidth,
    maxWidth,
    noWrap = true,
    variant = 'subtitle2',
  } = header;

  // Check if a custom header component is specified
  if (headerComponent) {
    const CustomHeaderComponent = reactory.getComponent(headerComponent) as React.FC<any> | null;
    
    if (CustomHeaderComponent) {
      // Build props for the custom component
      let customProps = {
        field,
        title,
        columnIndex,
        header,
        sortDirection,
        isFiltered,
        reactory,
        theme,
        onSort,
        onFilter,
        data,
        rowsState,
        formContext,
        tableRef,
        ...headerComponentProps,
      };

      // Apply props mapping if provided
      if (headerComponentPropsMap) {
        const mappedProps = reactory.utils.objectMapper(
          {
            field,
            title,
            columnIndex,
            header,
            sortDirection,
            isFiltered,
            data,
            rowsState,
            formContext,
            reactory,
            theme,
            props: customProps,
          },
          headerComponentPropsMap
        );
        customProps = { ...customProps, ...mappedProps };
      }

      return <CustomHeaderComponent {...customProps} />;
    }

    // If component not found, fall through to default renderer
    reactory.log(`Custom header component ${headerComponent} not found, using default renderer`);
  }

  // Translate title using i18n if titleKey is provided
  const translatedTitle = titleKey
    ? reactory.i18n.t(titleKey, title)
    : title;

  // Translate tooltip if tooltipKey is provided
  const translatedTooltip = tooltipKey
    ? reactory.i18n.t(tooltipKey, tooltip)
    : tooltip;

  // Handle sort click
  const handleSortClick = () => {
    if (sortable && onSort) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(field, newDirection);
    }
  };

  // Handle filter click
  const handleFilterClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (filterable && onFilter) {
      onFilter(field);
    }
  };

  // Build styles
  const containerSx: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
    cursor: sortable ? 'pointer' : 'default',
    userSelect: 'none',
    minWidth,
    maxWidth,
    backgroundColor: backgroundColor || 'transparent',
    ...headerSx,
  };

  // Render icon
  const renderIcon = () => {
    if (!icon) return null;
    return (
      <Icon
        sx={{
          fontSize: '1rem',
          color: iconColor || 'inherit',
        }}
      >
        {icon}
      </Icon>
    );
  };

  // Render sort indicator
  const renderSortIndicator = () => {
    if (!sortable) return null;

    return (
      <IconButton
        size="small"
        onClick={handleSortClick}
        sx={{ 
          p: 0.25,
          opacity: sortDirection ? 1 : 0.3,
        }}
      >
        <Icon sx={{ fontSize: '1rem' }}>
          {sortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward'}
        </Icon>
      </IconButton>
    );
  };

  // Render filter indicator
  const renderFilterIndicator = () => {
    if (!filterable) return null;

    return (
      <IconButton
        size="small"
        onClick={handleFilterClick}
        sx={{ 
          p: 0.25,
          color: isFiltered ? theme.palette.primary.main : 'inherit',
        }}
      >
        <Icon sx={{ fontSize: '1rem' }}>
          {isFiltered ? 'filter_alt' : 'filter_list'}
        </Icon>
      </IconButton>
    );
  };

  // Build the header content
  const headerContent = (
    <HeaderContent
      onClick={sortable ? handleSortClick : undefined}
      className={headerClassName}
      sx={containerSx}
    >
      {iconPosition === 'left' && renderIcon()}
      
      <Typography
        variant={variant}
        component="span"
        sx={{
          fontWeight: 600,
          color: color || 'inherit',
          whiteSpace: noWrap ? 'nowrap' : 'normal',
          overflow: noWrap ? 'hidden' : 'visible',
          textOverflow: noWrap ? 'ellipsis' : 'clip',
        }}
      >
        {translatedTitle}
      </Typography>
      
      {iconPosition === 'right' && renderIcon()}

      <HeaderActions>
        {renderSortIndicator()}
        {renderFilterIndicator()}
      </HeaderActions>
    </HeaderContent>
  );

  // Wrap with tooltip if provided
  if (translatedTooltip) {
    return (
      <Tooltip title={translatedTooltip} arrow>
        {headerContent}
      </Tooltip>
    );
  }

  return headerContent;
};

/**
 * Props for the default header cell wrapper
 */
export interface ColumnHeaderCellProps extends ColumnHeaderProps {
  /**
   * Width of the column (percentage or pixel value)
   */
  width?: string | number;
}

export default ColumnHeader;
