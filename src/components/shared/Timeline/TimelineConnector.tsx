import React from 'react';
import { Box, BoxProps } from '@mui/material';

export interface TimelineConnectorProps extends BoxProps {
  isLast?: boolean;
}

/**
 * TimelineConnector Component
 * 
 * The vertical line connecting timeline dots.
 * Automatically hidden for the last item.
 * 
 * @example
 * <TimelineSeparator>
 *   <TimelineDot />
 *   <TimelineConnector />
 * </TimelineSeparator>
 */
export const TimelineConnector: React.FC<TimelineConnectorProps> = ({ 
  isLast = false,
  sx,
  ...props 
}) => {
  if (isLast) {
    return null;
  }

  return (
    <Box
      sx={{
        width: 2,
        flexGrow: 1,
        backgroundColor: 'divider',
        minHeight: 24,
        ...sx
      }}
      {...props}
    />
  );
};

export default TimelineConnector;
