import React from 'react';
import { Box, BoxProps } from '@mui/material';

export interface TimelineContentProps extends Omit<BoxProps, 'position'> {
  children?: React.ReactNode;
  position?: 'left' | 'right' | 'alternate';
}

/**
 * TimelineContent Component
 * 
 * The main content area for a timeline item.
 * Contains the primary information for the event.
 * 
 * @example
 * <TimelineContent>
 *   <Typography variant="h6">Event Title</Typography>
 *   <Typography>Event description...</Typography>
 * </TimelineContent>
 */
export const TimelineContent: React.FC<TimelineContentProps> = ({ 
  children,
  position = 'right',
  sx,
  ...props 
}) => {
  return (
    <Box
      sx={{
        flex: 1,
        padding: 1,
        paddingTop: 0.5,
        paddingBottom: 2,
        ...sx
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

export default TimelineContent;
