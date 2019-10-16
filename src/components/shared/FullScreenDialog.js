import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Dialog from '@material-ui/core/Dialog';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CloseIcon from '@material-ui/icons/Close';
import Slide from '@material-ui/core/Slide';

const styles = {
  appBar: {
    position: 'relative',
  },
  flex: {
    flex: 1,
  },
};


const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});


class FullScreenDialog extends Component {

  constructor(props, context) {
    super(props, context);
    this.state = {
      open: props.open || false,
    };

    this.handleClose = this.handleClose.bind(this);
  }

  handleClose = () => {
    if (this.props.onClose) this.props.onClose()
    else this.setState({ open: false });
  };

  render() {
    const { classes, title, containerProps = {}, slide='up' } = this.props;

    return (
      <Fragment>
        <Dialog
          fullScreen
          open={this.props.open}
          onClose={this.handleClose}
          TransitionComponent={Transition}
          {...containerProps}          
        >
          <AppBar className={classes.appBar}>
            <Toolbar>              
              <IconButton color="inherit" onClick={this.handleClose} aria-label="Close">
                <CloseIcon />
              </IconButton>
              { title ? <Typography variant="h6" color="inherit">{title}</Typography> : null }
            </Toolbar>
          </AppBar>
          {this.props.children}
        </Dialog>
      </Fragment>
    );
  }
}

FullScreenDialog.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(FullScreenDialog);
