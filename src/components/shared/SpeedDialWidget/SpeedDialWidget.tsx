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


const styles = (theme: Theme, props: SpeedDialWidgetProps): any => ({
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
    position: 'absolute',
    '&$directionUp, &$directionLeft': {
      bottom: theme.spacing(2),
      right: theme.spacing(2),
    },
    '&$directionDown, &$directionRight': {
      top: theme.spacing(2),
      left: theme.spacing(3),
    },
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
    ...props.sx,
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
  directionUp: {},
  directionRight: {},
  directionDown: {},
  directionLeft: {},
});

export interface SpeedDialAction {
  key: string;
  icon: React.ReactNode;
  title: string;
  clickHandler?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

type TDirection = "up" | "down" | "left" | "right";

export type SpeedDialWidgetProps = {
  classes: any;
  icon?: React.ReactNode;
  actions: SpeedDialAction[];
  style?: React.CSSProperties;
  buttonStyle?: React.CSSProperties;
  sx?: SxProps<Theme>;  
  onClick?: (event: React.SyntheticEvent) => void;
  onActionClick?: (action: SpeedDialAction, event: React.SyntheticEvent) => void;
  size?: 'small' | 'medium' | 'large';
  elevation?: number;
  color?: 'default' | 'primary' | 'secondary';
  disabled?: boolean;
  ariaLabel?: string;
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

  // Dynamic styles based on props
  const dynamicSx = React.useMemo(() => ({
    '& .MuiFab-root': {
      width: sizeMap[size].width,
      height: sizeMap[size].height,
      boxShadow: isHovered ? `0px ${elevation + 2}px ${(elevation + 2) * 2}px rgba(0,0,0,0.2)` : `0px ${elevation}px ${elevation * 2}px rgba(0,0,0,0.1)`,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: 'scale(1.05)',
        boxShadow: `0px ${elevation + 4}px ${(elevation + 4) * 2}px rgba(0,0,0,0.25)`,
      },
      '&:active': {
        transform: 'scale(0.95)',
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
    ...sx,
  }), [size, elevation, isHovered, disabled, sx]);

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
  const handleActionClick = (action: SpeedDialAction) => (evt: React.MouseEvent<HTMLButtonElement>) => {
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
  );

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
        FabProps={{
          color: color,
          size: size === 'large' ? 'large' : size === 'small' ? 'small' : 'medium',
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
            onClick={() => handleActionClick(action)}           
          />
        ))}
      </SpeedDial>
  );
}



export default compose(withStyles(styles))(SpeedDials);
