import React from 'react';
import { Box, BoxProps } from '@mui/material';

export interface TimelineProps extends Omit<BoxProps, 'position'> {
  children?: React.ReactNode;
  position?: 'left' | 'right' | 'alternate';
}

/**
 * Timeline Component
 * 
 * A container for timeline items. Provides the basic structure for
 * displaying a vertical timeline of events.
 * 
 * @example
 * <Timeline position="right">
 *   <TimelineItem>...</TimelineItem>
 * </Timeline>
 */
export const Timeline: React.FC<TimelineProps> = ({ 
  children, 
  position = 'right',
  sx,
  ...props 
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        padding: 2,
        position: 'relative',
        ...sx
      }}
      {...props}
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            position,
            isLast: index === React.Children.count(children) - 1
          });
        }
        return child;
      })}
    </Box>
  );
};

export default Timeline;
