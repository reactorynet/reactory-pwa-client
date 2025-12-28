import React from 'react';
import { Box, BoxProps } from '@mui/material';

export interface TimelineOppositeContentProps extends Omit<BoxProps, 'position'> {
  children?: React.ReactNode;
  position?: 'left' | 'right' | 'alternate';
}

/**
 * TimelineOppositeContent Component
 * 
 * Optional content displayed on the opposite side of the timeline separator.
 * Typically used for timestamps or secondary information.
 * 
 * @example
 * <TimelineOppositeContent color="text.secondary">
 *   <Typography variant="caption">9:30 am</Typography>
 * </TimelineOppositeContent>
 */
export const TimelineOppositeContent: React.FC<TimelineOppositeContentProps> = ({ 
  children,
  position = 'right',
  sx,
  ...props 
}) => {
  return (
    <Box
      sx={{
        flex: 0.2,
        padding: 1,
        paddingTop: 0.5,
        textAlign: 'right',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        ...sx
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

export default TimelineOppositeContent;
