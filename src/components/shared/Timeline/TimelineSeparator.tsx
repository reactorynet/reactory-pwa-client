import React from 'react';
import { Box, BoxProps } from '@mui/material';

export interface TimelineSeparatorProps extends BoxProps {
  children?: React.ReactNode;
  isLast?: boolean;
}

/**
 * TimelineSeparator Component
 * 
 * The vertical line with dot that separates opposite content from main content.
 * Should contain TimelineDot and optionally TimelineConnector.
 * 
 * @example
 * <TimelineSeparator>
 *   <TimelineDot color="primary" />
 *   <TimelineConnector />
 * </TimelineSeparator>
 */
export const TimelineSeparator: React.FC<TimelineSeparatorProps> = ({ 
  children,
  isLast = false,
  sx,
  ...props 
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginRight: 2,
        marginLeft: 2,
        flex: '0 0 auto',
        ...sx
      }}
      {...props}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            isLast
          });
        }
        return child;
      })}
    </Box>
  );
};

export default TimelineSeparator;
