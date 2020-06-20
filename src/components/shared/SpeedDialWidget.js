import classNames from 'classnames';
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { isFunction } from 'lodash';
import capitalize from '@material-ui/core/utils/capitalize';
import SpeedDial from '@material-ui/lab/SpeedDial';
import SpeedDialIcon from '@material-ui/lab/SpeedDialIcon';
import SpeedDialAction from '@material-ui/lab/SpeedDialAction';
import FileCopyIcon from '@material-ui/icons/FileCopyOutlined';
import SaveIcon from '@material-ui/icons/Save';
import PrintIcon from '@material-ui/icons/Print';
import ShareIcon from '@material-ui/icons/Share';
import DeleteIcon from '@material-ui/icons/Delete';

const styles = theme => ({
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
    margin: `${theme.spacing(1)}px 0`,
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

class SpeedDials extends React.Component {
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
    const { classes, icon, actions } = this.props;
    const { direction, hidden, open } = this.state;

    const speedDialClassName = classNames(
      classes.speedDial,
      classes[`direction${capitalize(direction)}`],
    );

    return (
      <Fragment>        
        <div className={classes.exampleWrapper}>
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
            direction={direction}
          >
            {actions.map(action => (
              <SpeedDialAction
                key={action.key}
                icon={action.icon}
                tooltipTitle={action.title}
                onClick={ action.clickHandler || this.handleClick }
              />
            ))}
          </SpeedDial>
        </div>
      </Fragment>
    );
  }
}

SpeedDials.propTypes = {
  classes: PropTypes.object.isRequired,
  actions: PropTypes.array,
  icon: PropTypes.object,
  onClick: PropTypes.func
};

SpeedDials.defaultProps = {
  actions,
  icon: SpeedDialIcon,
  onClick: evt => { return false; }
};

export default withStyles(styles)(SpeedDials);
