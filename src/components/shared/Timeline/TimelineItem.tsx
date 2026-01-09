import React from 'react';
import { Box, BoxProps } from '@mui/material';

export interface TimelineItemProps extends Omit<BoxProps, 'position'> {
  children?: React.ReactNode;
  position?: 'left' | 'right' | 'alternate';
  isLast?: boolean;
}

/**
 * TimelineItem Component
 * 
 * Represents a single item in the timeline. Should contain
 * TimelineSeparator and TimelineContent as children.
 * 
 * @example
 * <TimelineItem>
 *   <TimelineOppositeContent>9:30 am</TimelineOppositeContent>
 *   <TimelineSeparator>
 *     <TimelineDot />
 *     <TimelineConnector />
 *   </TimelineSeparator>
 *   <TimelineContent>Event happened</TimelineContent>
 * </TimelineItem>
 */
export const TimelineItem: React.FC<TimelineItemProps> = ({ 
  children, 
  position = 'right',
  isLast = false,
  sx,
  ...props 
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        position: 'relative',
        minHeight: 70,
        ...sx
      }}
      {...props}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            position,
            isLast
          });
        }
        return child;
      })}
    </Box>
  );
};

export default TimelineItem;
