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


class SpeedDials extends React.Component<any, any> {

  static propTypes = {
    classes: PropTypes.object.isRequired,
    actions: PropTypes.array,
    icon: PropTypes.object,
    onClick: PropTypes.func
  }

  static defaultProps = {
    actions,
    icon: SpeedDialIcon,
    onClick: evt => { return false; }
  }
  
  

  state = {
    direction: 'up',
    open: false,
    hidden: false,
  };

  handleClick = (evt) => {
    const that = this;
    if(isFunction(evt.persist)) evt.persist();    
    this.setState(state => ({
      open: !state.open,
    }), () => {
      if(isFunction(that.props.onClick) === true) that.props.onClick(evt);
    });
  };

  handleDirectionChange = (event, value) => {
    this.setState({
      direction: value,
    });
  };

  handleHiddenChange = (event, hidden) => {
    this.setState(state => ({
      hidden,
      // hidden implies !open
      open: hidden ? false : state.open,
    }));
  };

  handleClose = () => {
    this.setState({ open: false });
  };

  handleOpen = () => {
    this.setState({ open: true });
  };

  render() {
    const { classes, icon, actions, style = {}, buttonStyle = {} } = this.props;
    const { direction, hidden, open } = this.state;

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
            onBlur={this.handleClose}
            onClick={this.handleClick}
            onClose={this.handleClose}
            onFocus={this.handleOpen}
            onMouseEnter={this.handleOpen}
            onMouseLeave={this.handleClose}
            open={open}
            direction={direction as TDirection}
            style={buttonStyle}
          >
            {actions.map(action => (
              <SpeedDialAction
                key={action.key}
                icon={action.icon}
                title={action.title}                
                onClick={ action.clickHandler || this.handleClick }
              />
            ))}
          </SpeedDial>
        </div>
      </Fragment>
    );
  }
}



export default compose(withStyles(styles))(SpeedDials);
