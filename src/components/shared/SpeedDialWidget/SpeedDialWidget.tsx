import classNames from 'classnames';
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@mui/styles';
import { isFunction } from 'lodash';
import capitalize from '@mui/utils/capitalize';
import SpeedDial from '@mui/lab/SpeedDial';
import SpeedDialIcon from '@mui/lab/SpeedDialIcon';
import SpeedDialAction from '@mui/lab/SpeedDialAction';
import FileCopyIcon from '@mui/icons-material/FileCopyOutlined';
import SaveIcon from '@mui/icons-material/Save';
import PrintIcon from '@mui/icons-material/Print';
import ShareIcon from '@mui/icons-material/Share';
import DeleteIcon from '@mui/icons-material/Delete';
import { Theme } from '@mui/material';
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

const actions = [
  { icon: <FileCopyIcon />, name: 'Copy' },
  { icon: <SaveIcon />, name: 'Save' },
  { icon: <PrintIcon />, name: 'Print' },
  { icon: <ShareIcon />, name: 'Share' },
  { icon: <DeleteIcon />, name: 'Delete' },
];

type TDirection = "up" | "down" | "left" | "right";


const SpeedDials = (props: any) => {
  const { classes, icon, actions, style = {}, buttonStyle = {} } = props;
  const [direction, setDirection] = React.useState<TDirection>('up');
  const [hidden, setHidden] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const handleClick = (evt: React.MouseEvent) => {
    if(isFunction(evt.persist)) evt.persist();    
    setOpen(!open);
    if(isFunction(props.onClick) === true) props.onClick(evt);
  };

  const handleDirectionChange = (event: React.ChangeEvent<{}>, value: TDirection) => {
    setDirection(value);
  };

  const handleHiddenChange = (event: React.ChangeEvent<{}>, hidden: boolean) => {
    setHidden(hidden);
    // hidden implies !open
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
    <Fragment>        
      <div className={classes.exampleWrapper} style={style}>
        <SpeedDial
          ariaLabel="QuickPick"
          className={speedDialClassName}
          hidden={hidden}
          icon={ icon || <SpeedDialIcon />}
          onBlur={handleClose}
          onClick={handleClick}
          onClose={handleClose}
          onFocus={handleOpen}
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
          open={open}
          direction={direction as TDirection}
          style={buttonStyle}
        >
          {actions.map(action => (
            <SpeedDialAction
              key={action.key}
              icon={action.icon}
              title={action.title}                
              onClick={ action.clickHandler || handleClick }
            />
          ))}
        </SpeedDial>
      </div>
    </Fragment>
  );
}



export default compose(withStyles(styles))(SpeedDials);
