import classNames from 'classnames';
import React, { Fragment, useState } from 'react';
import { withStyles } from '@mui/styles';
import { isFunction } from 'lodash';
import capitalize from '@mui/utils/capitalize';
import SpeedDial from '@mui/lab/SpeedDial';
import SpeedDialIcon from '@mui/lab/SpeedDialIcon';
import SpeedDialAction from '@mui/lab/SpeedDialAction';
import { Theme, Fade, Box } from '@mui/material';
import { SxProps } from '@mui/system';
import { compose } from 'redux';


const styles = (theme:Theme): any => ({
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
}


const SpeedDials = (props: any) => {
  const { classes, icon, actions, style = {}, buttonStyle = {} } = props;
  const [direction, setDirection] = React.useState<TDirection>('up');
  const [hidden, setHidden] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const longPressTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = React.useRef(false);

  // Mouse click handler (desktop)
  const handleClick = (evt: React.MouseEvent) => {
    if (isFunction(evt.persist)) evt.persist();
    setOpen(!open);
    if (isFunction(props.onClick) === true) props.onClick(evt);
  };

  // Touch start handler (mobile)
  const handleTouchStart = (evt: React.TouchEvent) => {
    longPressTriggered.current = false;
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    longPressTimeout.current = setTimeout(() => {
      setOpen(true);
      longPressTriggered.current = true;
    }, 500); // 500ms for long press
  };

  // Touch end handler (mobile)
  const handleTouchEnd = (evt: React.TouchEvent) => {
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    if (!longPressTriggered.current) {
      setOpen((prev) => !prev);
    }
  };

  // Touch move/cancel handler (mobile)
  const handleTouchMove = () => {
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
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
        ariaLabel="QuickPick"
        className={speedDialClassName}
        hidden={hidden}
        icon={icon || <SpeedDialIcon />}
        onBlur={handleClose}
        onClick={handleClick}
        onClose={handleClose}
        onFocus={handleOpen}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchCancel={handleTouchMove}
        open={open}
        direction={direction}        
        sx={props.sx || {}}
      >
        {actions.map(action => (
          <SpeedDialAction
            key={action.key}
            icon={action.icon}
            title={action.title}
            onClick={action.clickHandler || handleClick}
          />
        ))}
      </SpeedDial>
  );
}



export default compose(withStyles(styles))(SpeedDials);
