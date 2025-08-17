import classNames from 'classnames';
import React, { Fragment } from 'react';
import { withStyles } from '@mui/styles';
import { isFunction } from 'lodash';
import capitalize from '@mui/utils/capitalize';
import SpeedDial from '@mui/lab/SpeedDial';
import SpeedDialIcon from '@mui/lab/SpeedDialIcon';
import SpeedDialAction from '@mui/lab/SpeedDialAction';
import { Theme } from '@mui/material';
import { SxProps } from '@mui/system';
import { compose } from 'redux';


const styles = (theme: Theme): any => ({
  root: {
    width: '100%',
  },
  controls: {
    margin: theme.spacing(1)
  },
  exampleWrapper: {
    position: 'relative',
    height: 80,
  },
  radioGroup: {
    margin: `${theme.spacing(1)} 0`,
  },
  speedDial: {
    // Remove hardcoded positioning to allow dynamic positioning to work
    // '&$directionUp, &$directionLeft': {
    //   bottom: theme.spacing(2),
    //   right: theme.spacing(2),
    // },
    // '&$directionDown, &$directionRight': {
    //   top: theme.spacing(2),
    //   left: theme.spacing(3),
    // },
    '& .MuiFab-root': {
      transition: theme.transitions.create(['transform', 'box-shadow'], {
        duration: theme.transitions.duration.short,
      }),
      '&:hover': {
        transform: 'scale(1.05)',
        boxShadow: theme.shadows[8],
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
          animation: '$ripple 0.6s linear',
          pointerEvents: 'none',
        },
      },
      '&:active': {
        transform: 'scale(0.95)',
      },
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(0)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(1)',
      opacity: 0,
    },
  },
  '@keyframes radialGlow': {
    '0%, 100%': {
      opacity: 0.3,
      transform: 'scale(1)',
    },
    '50%': {
      opacity: 0.6,
      transform: 'scale(1.1)',
    },
  },
  directionUp: {},
  directionRight: {},
  directionDown: {},
  directionLeft: {},
});

export interface SpeedDialAction {
  key: string;
  icon: React.ReactNode;
  title: string;
  clickHandler?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

type TDirection = "up" | "down" | "left" | "right";
type TPosition = 'absolute' | 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center' | 'center-left' | 'center-right' | 'center';

export type SpeedDialWidgetProps = {
  classes: any;
  icon?: React.ReactNode;
  actions: SpeedDialAction[];
  style?: React.CSSProperties;
  buttonStyle?: React.CSSProperties;
  sx?: SxProps<Theme>;  
  onClick?: (event: React.SyntheticEvent) => void;
  onActionClick?: (action: SpeedDialAction, event: React.MouseEvent<HTMLDivElement>) => void;
  size?: 'small' | 'medium' | 'large';
  elevation?: number;
  color?: 'default' | 'primary' | 'secondary';
  disabled?: boolean;
  ariaLabel?: string;
  position?: TPosition;
  offsetLeft?: number;
  offsetRight?: number;
  offsetTop?: number;
  offsetBottom?: number;
  // Custom direction override for radial layouts
  direction?: TDirection;
  // Enable radial fan layout
  radialFan?: boolean;
  // Legacy props for backward compatibility
  left?: number | string;
  right?: number | string;
  top?: number | string;
  bottom?: number | string;
}


const SpeedDials = (props: SpeedDialWidgetProps) => {
  const { 
    classes, 
    icon, 
    actions, 
    style = {}, 
    buttonStyle = {},
    size = 'medium',
    elevation = 6,
    color = 'primary',
    disabled = false,
    ariaLabel = 'SpeedDial actions',
    sx = {},
    onClick,
    onActionClick,
    position = 'bottom-right',
    offsetLeft = 16,
    offsetRight = 16,
    offsetTop = 16,
    offsetBottom = 16,
    // Custom direction override
    direction: customDirection,
    // Enable radial fan layout
    radialFan = false,
    // Legacy props for backward compatibility
    left,
    right,
    top,
    bottom,
  } = props;
  const [direction, setDirection] = React.useState<TDirection>('up');
  const [hidden, setHidden] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const longPressTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = React.useRef(false);

  // Size mapping
  const sizeMap = {
    small: { width: 40, height: 40 },
    medium: { width: 56, height: 56 },
    large: { width: 72, height: 72 },
  };

  // Generate positioning styles based on position prop
  const getPositionStyles = React.useMemo(() => {
    // If legacy props are used, fall back to old behavior
    if (left !== undefined || right !== undefined || top !== undefined || bottom !== undefined) {
      const positionStyle: React.CSSProperties = {
        position: 'absolute',
      };
      if (left !== undefined) positionStyle.left = typeof left === 'number' ? `${left}px` : left;
      if (right !== undefined) positionStyle.right = typeof right === 'number' ? `${right}px` : right;
      if (top !== undefined) positionStyle.top = typeof top === 'number' ? `${top}px` : top;
      if (bottom !== undefined) positionStyle.bottom = typeof bottom === 'number' ? `${bottom}px` : bottom;
      return positionStyle;
    }

    // New position-based logic
    const positionStyle: React.CSSProperties = {
      position: position === 'absolute' ? 'absolute' : 'fixed',
    };

    switch (position) {
      case 'top-left':
        positionStyle.top = `${offsetTop}px`;
        positionStyle.left = `${offsetLeft}px`;
        break;
      case 'top-right':
        positionStyle.top = `${offsetTop}px`;
        positionStyle.right = `${offsetRight}px`;
        break;
      case 'top-center':
        positionStyle.top = `${offsetTop}px`;
        positionStyle.left = '50%';
        positionStyle.transform = 'translateX(-50%)';
        break;
      case 'bottom-left':
        positionStyle.bottom = `${offsetBottom}px`;
        positionStyle.left = `${offsetLeft}px`;
        break;
      case 'bottom-right':
        positionStyle.bottom = `${offsetBottom}px`;
        positionStyle.right = `${offsetRight}px`;
        break;
      case 'bottom-center':
        positionStyle.bottom = `${offsetBottom}px`;
        positionStyle.left = '50%';
        positionStyle.transform = 'translateX(-50%)';
        break;
      case 'center-left':
        positionStyle.top = '50%';
        positionStyle.left = `${offsetLeft}px`;
        positionStyle.transform = 'translateY(-50%)';
        break;
      case 'center-right':
        positionStyle.top = '50%';
        positionStyle.right = `${offsetRight}px`;
        positionStyle.transform = 'translateY(-50%)';
        break;
      case 'center':
        positionStyle.top = '50%';
        positionStyle.left = '50%';
        positionStyle.transform = 'translate(-50%, -50%)';
        break;
      case 'absolute':
      default:
        // Default to bottom-right if position is 'absolute' without other props
        positionStyle.bottom = `${offsetBottom}px`;
        positionStyle.right = `${offsetRight}px`;
        break;
    }

    // Debug logging for positioning
    console.log('SpeedDialWidget positioning:', {
      position,
      positionStyle,
      offsetBottom,
      offsetRight
    });
    
    return positionStyle;
  }, [position, offsetLeft, offsetRight, offsetTop, offsetBottom, left, right, top, bottom]);

  // Auto-determine direction based on position, or use custom direction if provided
  React.useEffect(() => {
    if (customDirection) {
      setDirection(customDirection);
    } else if (position?.includes('bottom')) {
      setDirection('up');
    } else if (position?.includes('top')) {
      setDirection('down');
    } else if (position?.includes('right')) {
      setDirection('left');
    } else if (position?.includes('left')) {
      setDirection('right');
    } else {
      setDirection('up'); // Default
    }
  }, [position, customDirection]);

  // Dynamic styles based on props
  const dynamicSx = React.useMemo(() => ({
    // Force positioning styles with higher specificity to override className styles
    ...getPositionStyles,
    // Ensure positioning is not overridden by other styles
    '&&': {
      ...getPositionStyles,
    },
    // Additional positioning enforcement
    position: getPositionStyles.position,
    bottom: getPositionStyles.bottom,
    right: getPositionStyles.right,
    top: getPositionStyles.top,
    left: getPositionStyles.left,
    transform: getPositionStyles.transform,
    '& .MuiFab-root': {
      width: sizeMap[size].width,
      height: sizeMap[size].height,
      boxShadow: isHovered ? `0px ${elevation + 2}px ${(elevation + 2) * 2}px rgba(0,0,0,0.2)` : `0px ${elevation}px ${elevation * 2}px rgba(0,0,0,0.1)`,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: `${getPositionStyles.transform || ''} scale(1.05)`.trim(),
        boxShadow: `0px ${elevation + 4}px ${(elevation + 4) * 2}px rgba(0,0,0,0.25)`,
      },
      '&:active': {
        transform: `${getPositionStyles.transform || ''} scale(0.95)`.trim(),
      },
      ...(disabled && {
        opacity: 0.6,
        pointerEvents: 'none',
      }),
    },
    '& .MuiSpeedDialAction-fab': {
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: 'scale(1.1)',
        boxShadow: `0px 4px 12px rgba(0,0,0,0.2)`,
      },
    },
    // Custom radial fan layout styles
    '& .MuiSpeedDial-actions': {
      // Create a circular layout for the actions
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      // Add some spacing between actions for better visual separation
      gap: '8px',
    },
    
    // Target SpeedDialAction components directly for radial fan layout
    '&.radial-fan .MuiSpeedDialAction-root': {
      position: 'absolute !important',
      transformOrigin: 'center !important',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important',
      // Reset any MUI transforms
      transform: 'none !important',
      // Hover effects for each action
      '&:hover': {
        transform: 'scale(1.15) !important',
        zIndex: 10,
      },
    },   
    '&.radial-fan .MuiSpeedDialAction-root:nth-of-type(1)': {
      transform: 'translateY(-80px) rotate(-15deg) !important',
    },
    '&.radial-fan .MuiSpeedDialAction-root:nth-of-type(2)': {
      transform: 'translateY(-60px) translateX(-40px) rotate(-10deg) !important',
    },
    '&.radial-fan .MuiSpeedDialAction-root:nth-of-type(3)': {
      transform: 'translateY(-40px) translateX(-60px) rotate(-5deg) !important',
    },
    '&.radial-fan .MuiSpeedDialAction-root:nth-of-type(4)': {
      transform: 'translateY(-20px) translateX(-70px) !important',
    },
    '&.radial-fan .MuiSpeedDialAction-root:nth-of-type(5)': {
      transform: 'translateY(-40px) translateX(-60px) rotate(5deg) !important',
    },
    '&.radial-fan .MuiSpeedDialAction-root:nth-of-type(6)': {
      transform: 'translateY(-60px) translateX(-40px) rotate(10deg) !important',
    },
    '&.radial-fan .MuiSpeedDialAction-root:nth-of-type(7)': {
      transform: 'translateY(-80px) rotate(15deg) !important',
    },
    ...sx,
  }), [getPositionStyles, size, elevation, isHovered, disabled, sx]);

  // Mouse click handler (desktop)
  const handleClick = (evt: React.MouseEvent) => {
    if (disabled) return;
    if (isFunction(evt.persist)) evt.persist();
    setOpen(!open);
    if (isFunction(onClick) === true) onClick(evt);
  };

  // Mouse enter handler for hover effects
  const handleMouseEnter = (evt: React.MouseEvent) => {
    if (disabled) return;
    setIsHovered(true);
    setOpen(true);
  };

  // Mouse leave handler
  const handleMouseLeave = (evt: React.MouseEvent) => {
    setIsHovered(false);
    setOpen(false);
  };

  // Touch start handler (mobile)
  const handleTouchStart = (evt: React.TouchEvent) => {
    if (disabled) return;
    longPressTriggered.current = false;
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    longPressTimeout.current = setTimeout(() => {
      setOpen(true);
      longPressTriggered.current = true;
    }, 500); // 500ms for long press
  };

  // Touch end handler (mobile)
  const handleTouchEnd = (evt: React.TouchEvent) => {
    if (disabled) return;
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    if (!longPressTriggered.current) {
      setOpen((prev) => !prev);
      if (isFunction(onClick)) onClick(evt);
    }
  };

  // Touch move/cancel handler (mobile)
  const handleTouchMove = () => {
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
  };

  // Action click handler
  const handleActionClick = (action: SpeedDialAction) => (evt: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (isFunction(action.clickHandler)) {
      action.clickHandler(evt);
    }
    if (isFunction(onActionClick)) {
      onActionClick(action, evt);
    }
    setOpen(false); // Close after action
  };

  const handleDirectionChange = (event: React.ChangeEvent<{}>, value: TDirection) => {
    setDirection(value);
  };

  const handleHiddenChange = (event: React.ChangeEvent<{}>, hidden: boolean) => {
    setHidden(hidden);
    setOpen(hidden ? false : open);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const speedDialClassName = classNames(
    classes.speedDial,
    classes[`direction${capitalize(direction)}`],
    {
      'radial-fan': radialFan,
    }
  );

  // Debug logging for radial fan
  console.log('SpeedDialWidget className:', {
    speedDialClassName,
    radialFan,
    direction,
    classes: classes.speedDial
  });

  // Determine the correct size for FabProps
  const fabSize: 'small' | 'medium' | 'large' = size === 'large' ? 'large' : size === 'small' ? 'small' : 'medium';

  return (
      <SpeedDial        
        ariaLabel={ariaLabel}
        className={speedDialClassName}
        hidden={hidden || disabled}
        icon={icon || <SpeedDialIcon />}
        onBlur={handleClose}
        onClick={handleClick}
        onClose={handleClose}
        onFocus={handleOpen}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchCancel={handleTouchMove}
        open={open}
        direction={direction}        
        sx={dynamicSx}
        style={{
          // Fallback inline styles to ensure positioning
          position: getPositionStyles.position,
          bottom: getPositionStyles.bottom,
          right: getPositionStyles.right,
          top: getPositionStyles.top,
          left: getPositionStyles.left,
          transform: getPositionStyles.transform,
        }}
        FabProps={{
          color: color,
          size: fabSize,
          style: {
            ...buttonStyle,
          },
        }}
      >
        {actions.map(action => (
          <SpeedDialAction
            key={action.key}
            icon={action.icon}
            title={action.title}
            onClick={handleActionClick(action)}           
          />
        ))}
      </SpeedDial>
  );
}



export default compose(withStyles(styles))(SpeedDials);
