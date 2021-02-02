import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { isEqual } from 'lodash';
import { withStyles, withTheme } from '@material-ui/core/styles';
import Dialog from '@material-ui/core/Dialog';
import AppBar from '@material-ui/core/AppBar';
import {
  Grid,
  Icon,
  Button
} from '@material-ui/core';
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

const styles = (theme) => {
  return {
    dialog_root: {
      overflowX: 'hidden',
    },
    appBar: {
      position: 'relative',
    },
    flex: {
      flex: 1,
    },
    backNavContainer: {
      display: 'flex',
      margin: '32px 32px 6px',
    },
    backButtonText: {
      fontWeight: 600,
      lineHeight: '1.8'
    },
    linkContainer: {
      display: 'flex',
      paddingLeft: theme.spacing(4),
    },
    linkText: {
      lineHeight: '1.8',
      fontWeight: 400,
    },
    linkTextLast: {
      lineHeight: '1.8',
      fontWeight: 400,
      color: theme.palette.primary.main,
      paddingLeft: '5px'
    },
    backNavComponent: {
      flex: 1,
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      paddingRight: '5px'
    }
  }
};


const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction={props.direction || "up"} ref={ref} {...props} />;
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

  componentDidMount() {
    const { closeOnEvents = [], api } = this.props;
    closeOnEvents.map((eventName) => api.on(eventName, this.handleClose))
  }

  componentWillUnmount() {
    const { closeOnEvents = [], api } = this.props;
    closeOnEvents.map((eventName) => api.removeListener(eventName, this.handleClose))
  }

  render() {
    const { open,
      classes,
      title,
      showAppBar = true,
      containerProps = {},
      slide = 'up',
      fullScreen = true,
      fullWidth = true,
      backNavigationItems = [],
      backNavComponent = null,
      maxWidth = false,
      theme,
      breakpoint = 'sm',
      api

    } = this.props;

    let BackNavigation = null;

    // NOTE - THIS NEEDS TO BE RESTRUCTURED TO USE A GRID LAYOUT - MOBILE FRIENDLY
    if (backNavigationItems && backNavigationItems.length > 0) {
      BackNavigation = (props) => {
        return (
          <div className={classes.backNavContainer} style={containerProps.navContainerStyle ? { ...containerProps.navContainerStyle } : {}} key={'back-nav'}>
            <div style={{ display: 'flex', cursor: 'pointer' }} onClick={this.handleClose} key={'chevron'}>
              <Icon style={{ fontSize: 30 }}>chevron_left</Icon>
              <Typography variant="h6" classes={{ root: classes.backButtonText }}>Back</Typography>
            </div>
            <div className={classes.linkContainer} key={'container'}>
              {
                backNavigationItems.map((navItem, ind) => {
                  if ((ind + 1) < backNavigationItems.length)
                    return <Typography variant="h6" classes={{ root: classes.linkText }} key={ind}>{navItem} /</Typography>

                  return <Typography variant="h6" classes={{ root: classes.linkTextLast }} key={ind}>{navItem}</Typography>
                })
              }
            </div>
            {
              backNavComponent && <div className={classes.backNavComponent} key={'component'}>
                {backNavComponent}
              </div>
            }
          </div>
        )
      };
    }

    const DialogueHOC = (props, context) => {
      const shouldBreak = useMediaQuery(theme.breakpoints.down(breakpoint));
      let dialogProps = {
        fullScreen: fullScreen === true ? true : shouldBreak === true,
        fullWidth,
        maxWidth,
        open,
        onClose: this.handleClose,
        TransitionComponent: Transition,
        ...containerProps,
        style: {
          overflowX: 'hidden'
        }
      }

      return (
        <Fragment>
          <Dialog className={classes.dialog_root} {...dialogProps} >
            {
              showAppBar && <AppBar className={classes.appBar} color={"transparent"}>
                <Toolbar>
                  <IconButton color="inherit" onClick={this.handleClose} aria-label="Close">
                    <CloseIcon />
                  </IconButton>
                  {title ? <Typography variant="h6" color="inherit">{title}</Typography> : null}
                </Toolbar>
              </AppBar>
            }

            {
              backNavigationItems && backNavigationItems.length > 0 && <BackNavigation />
            }
            {this.props.children}
          </Dialog>
        </Fragment >
      );
    }

    return (<DialogueHOC />)
  }
}

FullScreenDialog.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default compose(withApi, withTheme, withStyles(styles))(FullScreenDialog);
