import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import ListItemText from '@material-ui/core/ListItemText';
import ListItem from '@material-ui/core/ListItem';
import List from '@material-ui/core/List';
import Divider from '@material-ui/core/Divider';
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

function Transition(props) {
  return <Slide direction="up" {...props} />;
}

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
    const { classes, title, containerProps = {} } = this.props;

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
