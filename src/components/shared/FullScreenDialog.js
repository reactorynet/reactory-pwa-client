import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { isEqual } from 'lodash';
import { withStyles, withTheme } from '@material-ui/core/styles';
import Dialog from '@material-ui/core/Dialog';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CloseIcon from '@material-ui/icons/Close';
import Slide from '@material-ui/core/Slide';
import { withApi } from '@reactory/client-core/api/ApiProvider';
import { deepEquals } from '../reactory/form/utils';
import {
  useMediaQuery
} from '@material-ui/core';

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
    if (this.props.onClose) {
      this.props.onClose()
    } else {
      this.setState({ open: false });
    }
  };

  componentDidMount(){
    const { closeOnEvents = [], api } = this.props;

    closeOnEvents.map((eventName) => api.on(eventName, this.handleClose))
  }

  componentWillUnmount(){
    const { closeOnEvents = [], api } = this.props;

    closeOnEvents.map((eventName) => api.removeListener(eventName, this.handleClose))
  }

  shouldComponentUpdate(nextProps, nextState){
    const _nextProps = { open: nextProps.open, title: nextProps.title };
    const _props = { open: this.props.open, title: this.props.title }; 
        
    const shouldUpdate =  deepEquals(nextState, this.state) === false || deepEquals(_nextProps, _props) === false;
    return shouldUpdate;
  }

  render() {
    const { open,
      classes, 
      title, 
      containerProps = {}, 
      slide = 'up', 
      fullScreen = true, 
      fullWidth = true, 
      maxWidth = false, 
      theme, 
      breakpoint = 'sm', 
      api
      
    } = this.props;

    const DialogueHOC = (props, context) => {
      const shouldBreak = useMediaQuery(theme.breakpoints.down(breakpoint));
      let dialogProps = {
        fullScreen: fullScreen === true ? 'fullScreen' : shouldBreak === true,
        fullWidth,
        maxWidth,
        open,        
        onClose: this.handleClose,
        TransitionComponent: Transition,      
        ...containerProps
      };




      return (
        <Fragment>
          <Dialog
            {...dialogProps}
          >
            <AppBar className={classes.appBar}>
              <Toolbar>
                <IconButton color="inherit" onClick={this.handleClose} aria-label="Close">
                  <CloseIcon />
                </IconButton>
                {title ? <Typography variant="h6" color="inherit">{title}</Typography> : null}
              </Toolbar>
            </AppBar>
            {this.props.children}
          </Dialog>
        </Fragment>
      );
    }

    return (<DialogueHOC />)
    
  }
}

FullScreenDialog.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default compose(withApi, withTheme, withStyles(styles))(FullScreenDialog);
