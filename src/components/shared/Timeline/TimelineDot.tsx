import React from 'react';
import { Box, BoxProps } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';

export type TimelineDotColor = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'grey';

export interface TimelineDotProps extends Omit<BoxProps, 'color'> {
  children?: React.ReactNode;
  color?: TimelineDotColor;
  variant?: 'filled' | 'outlined';
}

/**
 * TimelineDot Component
 * 
 * The circular indicator on the timeline separator.
 * Can contain an icon or be empty.
 * 
 * @example
 * <TimelineDot color="primary">
 *   <Icon>check</Icon>
 * </TimelineDot>
 */
export const TimelineDot: React.FC<TimelineDotProps> = ({ 
  children,
  color = 'grey',
  variant = 'filled',
  sx,
  ...props 
}) => {
  const getColor = (color: TimelineDotColor): string => {
    const colors: Record<TimelineDotColor, string> = {
      primary: '#1976d2',
      secondary: '#9c27b0',
      success: '#2e7d32',
      error: '#d32f2f',
      warning: '#ed6c02',
      info: '#0288d1',
      grey: '#757575'
    };
    return colors[color] || colors.grey;
  };

  const dotColor = getColor(color);

  const dotStyles: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: variant === 'filled' ? dotColor : 'transparent',
    border: variant === 'outlined' ? `2px solid ${dotColor}` : 'none',
    color: variant === 'filled' ? '#fff' : dotColor,
    fontSize: '1.25rem',
    fontWeight: 500,
    flexShrink: 0,
    zIndex: 1,
    boxShadow: variant === 'filled' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
    ...sx
  };

  return (
    <Box sx={dotStyles} {...props}>
      {children}
    </Box>
  );
};

export default TimelineDot;
